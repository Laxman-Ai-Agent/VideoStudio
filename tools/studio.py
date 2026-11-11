"""VideoStudio command line.

    studio doctor                 check tools, disk, caches
    studio new "AI Agents"        create projects/NN_AI_Agents with all sub-folders
    studio status 01              show which stages are done / failed
    studio run 01                 ingest -> transcribe -> align -> plan -> index -> resolve
                                  -> visual assets -> storyboard -> render -> assemble (resumes)
    studio run 01 --final         full resolution instead of the 480p preview
    studio run 01 --workers 1     parallel scene renders (default 4; ~0.5 GB RAM each)
    studio run 01 --format 9:16   aspect to render (default 16:9 only; all = every format in brand.json)
"""
import argparse
import json
import shutil
import sys

from pathlib import Path

from pipeline import doctor, pending
from pipeline import assets
from pipeline.config import BRAND, LIBRARY, ROOT, setup_env
from pipeline.contracts import Brand, RenderReport, Resolved, ScenePlan, Transcript
from pipeline.ingest import AmbiguousInput, ingest, ingest_shared
from pipeline.plan import RULES, validate, write_brief
from pipeline.project import (atomic_write, ensure_layout, find_project, is_variation, load_state, new_project, run_stage,
                              variations)

from pipeline.transcribe import MODEL as WHISPER_MODEL  # light import; faster-whisper loads lazily

NEEDS_USER = 2  # exit code: stopped at a point where the user or Claude must act


def _one(folder: Path, stem: str) -> Path | None:
    found = sorted(folder.glob(f"{stem}.*"))
    if len(found) > 1:
        raise AmbiguousInput(f"more than one {stem} in {folder}: {[f.name for f in found]}")
    return found[0] if found else None


def run_project(p: Path, final: bool = False, workers: int = 4, review: bool = False, only: str | None = None) -> int:
    """Run every stage in order. Finished stages with unchanged inputs are skipped (run_stage)."""
    w = p / "work"
    if vs := variations(p):
        print(f"  STOP: {p.name} has variations; run one of: {', '.join(f'{p.name}/{v.name}' for v in vs)}")
        return NEEDS_USER
    ensure_layout(p)  # a folder the user made by hand has no drop/, work/ ...
    if is_variation(p):
        for src, dest in ingest_shared(p.parent):
            print(f"  ingest (shared drop): {src.name} -> {dest.relative_to(p.parent).as_posix()}")
    drop = [f for f in (p / "drop").iterdir() if f.is_file()] if (p / "drop").is_dir() else []
    try:
        if drop:
            run_stage(p, "ingest", drop, [], lambda: print(f"  ingest: moved {len(ingest(p))} file(s)"), force=True)
        audio, script = _one(p / "input", "audio"), _one(p / "input", "script")
    except AmbiguousInput as e:
        print(f"  STOP: {e}")
        return NEEDS_USER
    if not audio:
        print("  STOP: no narration audio. Put it in drop/ and run again.")
        return NEEDS_USER

    whisper_json, transcript_json = w / "whisper.json", w / "transcript.json"

    def transcribe():
        from pipeline.transcribe import transcribe_checked  # faster-whisper loads lazily
        # coverage-checked before writing, so a result with lost speech is never cached as "done"
        atomic_write(whisper_json, transcribe_checked(audio, WHISPER_MODEL).model_dump_json(indent=2))

    def align():
        t = Transcript.model_validate_json(whisper_json.read_text("utf-8"))
        if script:
            from pipeline.align import align as align_script, script_text
            t = align_script(t, script_text(script))
        atomic_write(transcript_json, t.model_dump_json(indent=2))

    for name, inputs, outputs, fn in (
        ("transcribe", [audio], [whisper_json], transcribe),
        ("align", [whisper_json] + ([script] if script else []), [transcript_json], align),
    ):
        extra = WHISPER_MODEL if name == "transcribe" else ""  # a model change re-transcribes
        print(f"  {name}: {'done' if run_stage(p, name, inputs, outputs, fn, extra=extra) else 'up to date'}")

    transcript = Transcript.model_validate_json(transcript_json.read_text("utf-8"))
    from pipeline.script_out import write_script
    write_script(p)  # output/script.txt: the final spoken words
    scenes_json, brief = w / "scenes.json", w / "plan_brief.md"
    if not scenes_json.exists():
        write_brief(p, transcript, brief)
        print(f"  STOP: plan needs Claude. Brief: {brief}\n        Write {scenes_json}, then run again.")
        return NEEDS_USER
    plan_inputs = [transcript_json, scenes_json] + [f for f in (BRAND / "brand.json", RULES) if f.exists()]
    run_stage(p, "plan", plan_inputs, [], lambda: validate(scenes_json, transcript))
    print("  plan: scenes.json valid")

    # Per-video visual theme (typography, palette, backgrounds) -> work/theme.json, reused on resume
    theme = make_theme(p)
    print(f"  theme: {theme.name} ({theme.source})" + (f", {len(theme.issues)} fallback(s)" if theme.issues else ""))

    # Visual assets: Claude lists every visual of the video with ready-to-paste prompts (one JSON)
    from pipeline import visual
    plan = ScenePlan.model_validate_json(scenes_json.read_text("utf-8"))
    if not visual.path(p).exists():
        abrief = w / "assets_brief.md"
        idx = assets.load(assets.index_path(p / "assets"))
        local = [f"assets/{e.file} - {e.description}" for e in idx.assets.values() if e.description]
        formats = json.loads((BRAND / "brand.json").read_text("utf-8")).get("formats", {})
        visual.brief(p, plan, " ".join(x.text for x in transcript.words), formats,
                     theme.model_dump(include={"name", "category", "colors"}), local, abrief)
        print(f"  STOP: visual assets need Claude. Brief: {abrief}\n"
              f"        Write {visual.path(p)}, then run again.")
        return NEEDS_USER

    # Phase 5: screenshot scenes with params.url -> assets/scene_NNN.png (headless Chrome)
    from pipeline.capture import capture
    captures = w / "captures.json"
    urls = {s.id: s.params.get("url") for s in ScenePlan.model_validate_json(scenes_json.read_text("utf-8")).scenes
            if s.visual_type == "screenshot" and s.params.get("url")}
    if urls:
        ran = run_stage(p, "capture", [scenes_json], [captures], extra=json.dumps(urls),
                        fn=lambda: capture(ScenePlan.model_validate_json(scenes_json.read_text("utf-8")), p, captures))
        print(f"  capture: {'done' if ran else 'up to date'} ({len(urls)} url(s))")

    # Phase 5: long videos (assets/originals/raw_footage) -> shots in assets/shots, indexed like any clip
    from pipeline import shots
    for raw in shots.raw_files(p / "assets"):
        first = p / "assets" / "shots" / f"{raw.stem}_001.mp4"
        ran = run_stage(p, f"shots_{raw.stem}", [raw], [first],
                        lambda r=raw: print(f"    {r.name}: {len(shots.cut(r, p / 'assets' / 'shots'))} shot(s)"))
        print(f"  shots {raw.name}: {'done' if ran else 'up to date'}")

    # Phase 2: index assets (described once, by hash) -> visual assets -> resolve
    LIBRARY.mkdir(exist_ok=True)
    todo = []
    for name, base in (("index", p / "assets"), ("library_index", LIBRARY)):
        idx_file = assets.index_path(base)
        files = assets.media_files(base)
        listing = "\n".join(f"{f.relative_to(base).as_posix()}:{f.stat().st_size}:{f.stat().st_mtime_ns}"
                             for f in files)  # cheap change check; no full read of big media
        ran = run_stage(p, name, [idx_file] if idx_file.exists() else [], [idx_file],
                        lambda b=base, f=idx_file: assets.update(b, f), extra=listing)
        undone = assets.undescribed(assets.load(idx_file))
        print(f"  {name}: {len(files)} file(s), {'done' if ran else 'up to date'}")
        if undone:
            todo.append((idx_file, assets.contact_sheet(base, undone[:assets.SHEET_MAX], f"{p.name} {name}"),
                         len(undone)))
    if todo:
        for idx_file, sheet, n in todo:
            more = f" (this sheet shows {assets.SHEET_MAX}, the rest come next run)" if n > assets.SHEET_MAX else ""
            print(f"  STOP: {n} asset(s) need a description{more}. Look at {sheet}\n"
                  f"        and fill `description` (English keywords) in {idx_file}, then run again.")
        return NEEDS_USER

    resolved_json, credits_txt = w / "resolved.json", p / "output" / "credits.txt"
    lib_idx, proj_idx = LIBRARY / "index.json", assets.index_path(p / "assets")

    # visual assets, pass 1: uploads by id, processing, exact-name logos / people (same providers as resolve)
    from pipeline.resolve import fetch_asset
    remover = visual.rembg_remover()
    va = visual.sync(visual.load(p), p, plan, ROOT, None, fetch=lambda a: fetch_asset(a, LIBRARY, ROOT),
                     remove_bg=remover, words=transcript.words)
    visual.save(p, va)
    mains = visual.main_files(va, p)  # validated main visuals win over any search in resolve

    def resolve():
        from pipeline.resolve import credits, resolve as pick
        res = pick(ScenePlan.model_validate_json(scenes_json.read_text("utf-8")), p, LIBRARY, ROOT, main_assets=mains)
        atomic_write(resolved_json, res.model_dump_json(indent=2))
        atomic_write(credits_txt, credits(res))

    # a chosen file was deleted -> pick again (the index hash alone can round-trip to an old value)
    gone = resolved_json.exists() and any(
        r.asset and not (ROOT / r.asset).exists()
        for r in Resolved.model_validate_json(resolved_json.read_text("utf-8")).scenes)
    ran = run_stage(p, "resolve", [scenes_json, proj_idx] + ([lib_idx] if lib_idx.exists() else []),
                    [resolved_json, credits_txt], resolve, force=gone,
                    extra=str([(k, v.name, v.stat().st_mtime_ns) for k, v in sorted(mains.items())]))
    resolved = Resolved.model_validate_json(resolved_json.read_text("utf-8"))
    from pipeline.resolve import credits
    atomic_write(credits_txt, credits(resolved, va))  # cheap: also picks up credits of newly collected online assets
    counts = {}
    for r in resolved.scenes:
        counts[r.status] = counts.get(r.status, 0) + 1
    print(f"  resolve: {'done' if ran else 'up to date'} {counts}")

    # visual assets, pass 2: link what resolve found, add uncovered missing scenes, summary
    va = visual.sync(va, p, plan, ROOT, resolved, remove_bg=remover, words=transcript.words)
    visual.save(p, va)
    print_assets(va, p)

    brand_in = [f for f in (BRAND / "brand.json",) if f.exists()]

    html_out, png_out = w / "storyboard.html", w / "storyboard.png"

    def storyboard():
        from pipeline.storyboard import render
        render(ScenePlan.model_validate_json(scenes_json.read_text("utf-8")), p.name, html_out, png_out, resolved)

    sb_inputs = [scenes_json, resolved_json] + brand_in
    print(f"  storyboard: {'done' if run_stage(p, 'storyboard', sb_inputs, [html_out, png_out], storyboard) else 'up to date'}")
    if review:  # stop before render: check work/storyboard.html (scene timings + chosen assets)
        print(f"  review: open {html_out}")
        return 0

    # Phase 4: cut-out layers for scenes that opt into parallax (failures fall back to a plain photo)
    from pipeline.contracts import Prepared
    prep_json = w / "prepared" / "prepared.json"

    def prepare():
        from pipeline.prepare import prepare as cut
        res = cut(ScenePlan.model_validate_json(scenes_json.read_text("utf-8")), resolved, ROOT, w / "prepared")
        atomic_write(prep_json, res.model_dump_json(indent=2))
        for c in res.scenes:
            print(f"    scene {c.id}: {'cut-out ok' if c.fg else 'plain photo (' + c.error[:100] + ')'}")

    from pipeline.prepare import MODEL as REMBG_MODEL, wanted
    srcs = [f for _, f in wanted(ScenePlan.model_validate_json(scenes_json.read_text("utf-8")), resolved, ROOT)]
    ran = run_stage(p, "prepare", [scenes_json, resolved_json] + srcs, [prep_json], prepare, extra=REMBG_MODEL)
    prepared = Prepared.model_validate_json(prep_json.read_text("utf-8"))
    print(f"  prepare: {'done' if ran else 'up to date'} ({len(prepared.scenes)} parallax scene(s))")

    # Phase 3: render each scene per format (per-scene cache), then assemble with the narration
    from pipeline import edits
    from pipeline import render as rnd
    from pipeline.assemble import assemble, pick_music, sfx_cues
    brand = Brand.model_validate_json((BRAND / "brand.json").read_text("utf-8"))
    plan = ScenePlan.model_validate_json(scenes_json.read_text("utf-8"))
    mode = "final" if final else "preview"
    failed, assembled = 0, []
    for fmt in ("16:9", "9:16"):
        if fmt not in brand.formats or (only and fmt != only):  # --format: one aspect only, cache untouched
            continue
        d = rnd.fmt_dir(fmt, final)
        jobs = rnd.plan_jobs(plan, resolved, brand, fmt, ROOT, w / "scenes" / d, final, transcript.words,
                             prepared, theme, visual.overlays(va, p, fmt), edits.layers(p, fmt))
        clips = [j.out for j in jobs]
        keys = ",".join(j.key for j in jobs)  # per-scene cache keys; any change re-runs the stage
        report_json = w / "scenes" / d / "report.json"

        def render(jobs=jobs, fmt=fmt):
            rep = rnd.render_format(jobs, fmt, final, workers)
            n = sum(s.status == "failed" for s in rep.scenes)
            if n:
                print(f"    {n} scene(s) failed -> placeholder tile. Details: {report_json}")

        retry = any(not rnd.is_cached(j) for j in jobs)  # e.g. a scene that failed last time
        ran = run_stage(p, f"render_{d}", [], clips + [report_json], render, extra=keys, force=retry)
        failed += sum(s.status == "failed" for s in
                      RenderReport.model_validate_json(report_json.read_text("utf-8")).scenes)
        print(f"  render {fmt}: {'done' if ran else 'up to date'} ({len(jobs)} scenes, {jobs[0].w}x{jobs[0].h})")

        out = w / "assembled" / f"{mode}_{d.removesuffix('_final')}.mp4"  # exported to output/ after QA
        out.parent.mkdir(exist_ok=True)
        total = round(plan.scenes[-1].end * brand.fps)
        music = pick_music(LIBRARY, brand.music_mood)  # missing folder/file = no music
        cues = sfx_cues([(j.scene.id, j.scene.start, j.template, {**j.scene.params, "transition": j.trans[0]})
                         for j in jobs], LIBRARY)
        ran = run_stage(p, f"assemble_{d}", clips + [audio] + ([music] if music else []) + [f for _, f in cues],
                        [out], lambda c=clips, o=out, m=music, q=cues: assemble(c, audio, o, brand.fps, total, m, q),
                        extra=f"{total}|{[(round(t, 3), f.name) for t, f in cues]}")
        print(f"  assemble {fmt}: {'done' if ran else 'up to date'}"
              f" (music: {music.name if music else 'none'}, sfx: {len(cues)})")
        rep = RenderReport.model_validate_json(report_json.read_text("utf-8"))
        holes = sorted({s.id for s in rep.scenes if s.status == "failed"} |
                       {r.id for r in resolved.scenes if r.status == "missing"})
        assembled.append((out, clips, holes))

    # QA on every assembled file -> work/qa.json; previews are always exported, finals only on pass
    from pipeline.contracts import QAReport
    from pipeline.qa import check
    from pipeline import identity
    qa_json = w / "qa.json"
    looks = (identity.identity_check(p, theme, brand.transitions, final),
             identity.variety_check(plan, rnd.transitions(plan, brand, theme), final))

    def qa():
        files = [check(o, audio, c, h, final, p, looks) for o, c, h in assembled]
        atomic_write(qa_json, QAReport(mode=mode, files=files).model_dump_json(indent=2))

    run_stage(p, "qa", [o for o, _, _ in assembled] + [audio], [qa_json], qa,
              extra=mode + "|" + "|".join(x.model_dump_json() for x in looks))
    report = QAReport.model_validate_json(qa_json.read_text("utf-8"))
    qa_failed = False
    for f in report.files:
        src = p / f.file
        dest = p / "output" / src.name
        bad = [f"{c.name}: {c.detail}" for c in f.checks if c.status != "ok"]
        if f.passed or not final:
            if not dest.exists() or dest.stat().st_mtime_ns < src.stat().st_mtime_ns:
                dest.parent.mkdir(exist_ok=True)
                shutil.copy2(src, dest)
        qa_failed |= not f.passed
        print(f"  qa {src.name}: {'PASS' if f.passed else 'FAIL'}" + (f" ({'; '.join(bad)})" if bad else "")
              + ("" if f.passed or not final else " -> NOT exported"))
        print(f"    -> {dest}" if dest.exists() and (f.passed or not final) else "", end="")
        print()
    print(f"  credits: {credits_txt}")
    if failed:
        print(f"  NOTE: {failed} scene clip(s) are placeholders (see work/scenes/*/report.json)")
    return 1 if final and qa_failed else 0


def make_theme(p: Path, force: bool = False):
    """theme stage: work/theme.json from the project's text (+ project theme.json overrides)."""
    from pipeline import theme as th
    from pipeline.contracts import ThemeSpec
    w, manual = p / "work", p / "theme.json"
    if is_variation(p) and not manual.exists():
        manual = p.parent / "theme.json"  # one look for every variation of the topic
    out = w / "theme.json"
    inputs = [f for f in (w / "transcript.json", w / "scenes.json", manual, *sorted((p / "input").glob("script.*")),
                          *sorted(th.PRESETS.glob("*.json"))) if f.exists()]
    fonts = ",".join(sorted(d.name for d in th.FONTS.iterdir() if d.is_dir())) if th.FONTS.is_dir() else ""

    def build():
        override = json.loads(manual.read_text("utf-8")) if manual.exists() else None
        atomic_write(out, th.build(th.theme_text(p), override).model_dump_json(indent=2))

    run_stage(p, "theme", inputs, [out], build, force=force, extra=fonts)
    return ThemeSpec.model_validate_json(out.read_text("utf-8"))


def transcript_words(p: Path) -> list:
    f = p / "work" / "transcript.json"
    return Transcript.model_validate_json(f.read_text("utf-8")).words if f.exists() else []


def print_assets(va, p: Path) -> None:
    from pipeline import visual
    sm = va.summary
    print(f"  visual assets: {sm['total']} listed, {sm['found']} ready, {len(sm['to_generate'])} to generate"
          + (f", {len(sm['failed'])} failed {sm['failed']}" if sm["failed"] else "") + f" -> {visual.path(p)}")
    pending.write(va, p)


def assets_command(project: Path) -> int:
    """After uploading generated files (drop/A012.png): match them by id, process, validate, update
    visual-assets.json. Never renders."""
    from pipeline import visual
    from pipeline.resolve import fetch_asset
    drop = [f for f in (project / "drop").iterdir() if f.is_file()] if (project / "drop").is_dir() else []
    if drop:
        try:
            print(f"  ingest: moved {len(ingest(project))} file(s)")
        except AmbiguousInput as e:
            print(f"  STOP: {e}")
            return NEEDS_USER
    va = visual.load(project)
    scenes_json, resolved_json = project / "work" / "scenes.json", project / "work" / "resolved.json"
    if va is None or not scenes_json.exists():
        print(f"  no {visual.FILE} yet: run `studio.cmd run {project.name[:2]}` first")
        return NEEDS_USER
    plan = ScenePlan.model_validate_json(scenes_json.read_text("utf-8"))
    resolved = Resolved.model_validate_json(resolved_json.read_text("utf-8")) if resolved_json.exists() else None
    va = visual.sync(va, project, plan, ROOT, resolved, fetch=lambda a: fetch_asset(a, LIBRARY, ROOT),
                     remove_bg=visual.rembg_remover(), words=transcript_words(project))
    visual.save(project, va)
    print_assets(va, project)
    for a in va.assets:
        if a.status not in visual.FOUND:
            print(f"    {a.id}  {a.category:<20} {a.status:<12} {a.name}")
        elif a.validation.get("status") == "warn":
            print(f"    {a.id}  {a.category:<20} warn         {'; '.join(a.validation.get('checks', [])[-2:])}")
    print(f"  upload: save each file as its id (e.g. A012.png) in {project / 'drop'}, then run this again.")
    return 0


def theme_command(project: Path, preset: str | None, auto: bool) -> int:
    """Show, pin or re-pick the video's theme. Never renders."""
    from pipeline import theme as th
    manual = project / "theme.json"
    if preset or auto:
        if preset and preset not in th.presets():
            print(f"  unknown preset {preset!r}. Presets: {', '.join(th.presets())}")
            return 1
        cur = json.loads(manual.read_text("utf-8")) if manual.exists() else {}
        cur.pop("preset", None)
        if preset:
            cur["preset"] = preset
        atomic_write(manual, json.dumps(cur, ensure_ascii=False, indent=2))
    t = make_theme(project, force=True)
    print(f"{project.name}: theme {t.name!r} ({t.category}), source {t.source}")
    if t.scores:
        print("  keyword hits: " + ", ".join(f"{k} {v:.0f}" for k, v in sorted(t.scores.items(), key=lambda x: -x[1]) if v))
    print(f"  fonts: heading {t.fonts['heading']}, body {t.fonts['body']}, script {t.fonts['script']}")
    print(f"  colours: " + ", ".join(f"{k} {v}" for k, v in t.colors.items()))
    print(f"  background: {t.background['type']} {t.background['colors']}, pattern {t.background['pattern']}, "
          f"texture {t.background['texture']}")
    print(f"  motion: {t.motion or 'default (pop, drift, brand transitions)'}")
    if t.direction:
        print(f"  direction: {t.direction}")
    from pipeline import identity
    bt = Brand.model_validate_json((BRAND / "brand.json").read_text("utf-8")).transitions
    for name, prev in identity.previous(project):
        score, shared = identity.similarity(t, prev, bt)
        print(f"  vs {name}: {score:.0%} alike" + (f" (shared: {', '.join(shared)})" if shared else ""))
    print(f"  {identity.identity_check(project, t, bt).detail}")
    for i in t.issues:
        print(f"  fallback: {i}")
    print(f"  saved: {project / 'work' / 'theme.json'}  (overrides: {manual})")
    return 0


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    setup_env()
    ap = argparse.ArgumentParser(prog="studio")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor")
    sub.add_parser("new").add_argument("name")
    sub.add_parser("status").add_argument("project")
    sub.add_parser("assets", help="match uploads (A012.png) to visual-assets.json, process, validate (no render)") \
        .add_argument("project")
    uc = sub.add_parser("ui", help="Visual Assets dashboard in the browser (http://127.0.0.1:8790)")
    uc.add_argument("--port", type=int, default=8790)
    uc.add_argument("--no-browser", action="store_true")
    tc = sub.add_parser("theme", help="show / pin / re-pick the video's visual theme (no render)")
    tc.add_argument("project")
    tc.add_argument("--preset", help="pin a preset (tools/themes/<name>.json)")
    tc.add_argument("--auto", action="store_true", help="drop the pinned preset, pick from the content again")
    cc = sub.add_parser("clean", help="thin out drop/ locally (duplicates, look-alikes, blurry, tiny, blank, short clips): report, --apply moves them to drop/_unused")
    cc.add_argument("project")
    cc.add_argument("--apply", action="store_true")
    mc = sub.add_parser("match", help="keep the drop/ files that fit the scene plan (CLIP, local): report, --apply moves the rest to drop/_unused")
    mc.add_argument("project")
    mc.add_argument("--apply", action="store_true")
    run = sub.add_parser("run")
    run.add_argument("project")
    run.add_argument("--final", action="store_true", help="full resolution (default: 480p preview)")
    run.add_argument("--workers", type=int, default=4, help="parallel scene renders (default 4: measured 2 -> 4 = 25%% faster, 6 = no gain)")
    run.add_argument("--review", action="store_true", help="stop after the storyboard (no render)")
    run.add_argument("--format", choices=["16:9", "9:16", "all"], default="16:9",
                     help="aspect to render (default 16:9; all = every format in brand.json)")
    a = ap.parse_args()

    if a.cmd == "doctor":
        return doctor.run()
    if a.cmd == "new":
        print(new_project(a.name))
        return 0
    if a.cmd == "run":
        try:
            return run_project(find_project(a.project), a.final, a.workers, a.review, None if a.format == "all" else a.format)
        except Exception as e:  # run_stage already logged the traceback to work/logs/<stage>.log
            print(f"  FAILED: {type(e).__name__}: {e}")
            return 1
    if a.cmd == "match":
        from pipeline.clipmatch import match
        match(find_project(a.project), a.apply)
        return 0
    if a.cmd == "clean":
        from pipeline.cull import clean
        clean(find_project(a.project) / "drop", a.apply)
        return 0
    if a.cmd == "theme":
        return theme_command(find_project(a.project), a.preset, a.auto)
    if a.cmd == "assets":
        return assets_command(find_project(a.project))
    if a.cmd == "ui":
        sys.path.insert(0, str(ROOT / "ui" / "backend"))
        import server  # ui/backend/server.py (stdlib http.server, localhost only)
        server.serve(a.port, open_browser=not a.no_browser)
        return 0
    if a.cmd == "status":
        project = find_project(a.project)
        stages = load_state(project).stages
        print(project.name)
        for name, rec in stages.items():
            print(f"  {rec.status:<6} {name:<14} {rec.seconds:>8.1f}s  {rec.error or ''}")
        if not stages:
            print("  no stages run yet")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
