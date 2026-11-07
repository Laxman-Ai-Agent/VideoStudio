"""VideoStudio command line.

    studio doctor                 check tools, disk, caches
    studio new "AI Agents"        create projects/NN_AI_Agents with all sub-folders
    studio status 01              show which stages are done / failed
    studio run 01                 ingest -> transcribe -> align -> plan -> index -> resolve
                                  -> prompts -> storyboard -> render -> assemble (resumes)
    studio run 01 --final         full resolution instead of the 720p preview
    studio run 01 --workers 1     parallel scene renders (default 2; ~0.5 GB RAM each)
"""
import argparse
import json
import shutil
import sys

from pathlib import Path

from pipeline import doctor
from pipeline import assets
from pipeline.config import BRAND, LIBRARY, ROOT, secret, setup_env
from pipeline.contracts import Brand, RenderReport, Resolved, ScenePlan, Transcript
from pipeline.ingest import AmbiguousInput, ingest
from pipeline.plan import RULES, validate, write_brief
from pipeline.project import atomic_write, find_project, load_state, new_project, run_stage

from pipeline.transcribe import MODEL as WHISPER_MODEL  # light import; faster-whisper loads lazily

NEEDS_USER = 2  # exit code: stopped at a point where the user or Claude must act


def _one(folder: Path, stem: str) -> Path | None:
    found = sorted(folder.glob(f"{stem}.*"))
    if len(found) > 1:
        raise AmbiguousInput(f"more than one {stem} in {folder}: {[f.name for f in found]}")
    return found[0] if found else None


def run_project(p: Path, final: bool = False, workers: int = 2) -> int:
    """Run every stage in order. Finished stages with unchanged inputs are skipped (run_stage)."""
    w = p / "work"
    drop = [f for f in (p / "drop").iterdir() if f.is_file()]
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
    scenes_json, brief = w / "scenes.json", w / "plan_brief.md"
    if not scenes_json.exists():
        write_brief(p, transcript, brief)
        print(f"  STOP: plan needs Claude. Brief: {brief}\n        Write {scenes_json}, then run again.")
        return NEEDS_USER
    plan_inputs = [transcript_json, scenes_json] + [f for f in (BRAND / "brand.json", RULES) if f.exists()]
    run_stage(p, "plan", plan_inputs, [], lambda: validate(scenes_json, transcript))
    print("  plan: scenes.json valid")

    # Phase 5: long videos (assets/raw_footage) -> shots in assets/shots, indexed like any clip
    from pipeline import shots
    for raw in shots.raw_files(p / "assets"):
        first = p / "assets" / "shots" / f"{raw.stem}_001.mp4"
        ran = run_stage(p, f"shots_{raw.stem}", [raw], [first],
                        lambda r=raw: print(f"    {r.name}: {len(shots.cut(r, p / 'assets' / 'shots'))} shot(s)"))
        print(f"  shots {raw.name}: {'done' if ran else 'up to date'}")

    # Phase 2: index assets (described once, by hash) -> resolve -> prompts for missing ones
    LIBRARY.mkdir(exist_ok=True)
    todo = []
    for name, base in (("index", p / "assets"), ("library_index", LIBRARY)):
        idx_file = base / "index.json"
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
    lib_idx, proj_idx = LIBRARY / "index.json", p / "assets" / "index.json"
    pexels_key = secret("PEXELS_API_KEY")

    def resolve():
        from pipeline.resolve import credits, resolve as pick
        res = pick(ScenePlan.model_validate_json(scenes_json.read_text("utf-8")), p, LIBRARY, ROOT, pexels_key)
        atomic_write(resolved_json, res.model_dump_json(indent=2))
        atomic_write(credits_txt, credits(res))

    # a chosen file was deleted -> pick again (the index hash alone can round-trip to an old value)
    gone = resolved_json.exists() and any(
        r.asset and not (ROOT / r.asset).exists()
        for r in Resolved.model_validate_json(resolved_json.read_text("utf-8")).scenes)
    ran = run_stage(p, "resolve", [scenes_json, proj_idx] + ([lib_idx] if lib_idx.exists() else []),
                    [resolved_json, credits_txt], resolve, force=gone, extra="pexels" if pexels_key else "")
    resolved = Resolved.model_validate_json(resolved_json.read_text("utf-8"))
    counts = {}
    for r in resolved.scenes:
        counts[r.status] = counts.get(r.status, 0) + 1
    print(f"  resolve: {'done' if ran else 'up to date'} {counts}")

    readme = p / "prompts" / "README.md"

    def prompts():
        from pipeline.prompts import write
        brand = json.loads((BRAND / "brand.json").read_text("utf-8")) if (BRAND / "brand.json").exists() else {}
        write(ScenePlan.model_validate_json(scenes_json.read_text("utf-8")), resolved, p,
              brand.get("formats", {"16:9": {"width": 1920, "height": 1080}}))

    brand_in = [f for f in (BRAND / "brand.json",) if f.exists()]
    print(f"  prompts: {'done' if run_stage(p, 'prompts', [resolved_json, scenes_json] + brand_in, [readme], prompts) else 'up to date'}"
          f" ({counts.get('missing', 0)} missing -> {readme})")

    html_out, png_out = w / "storyboard.html", w / "storyboard.png"

    def storyboard():
        from pipeline.storyboard import render
        render(ScenePlan.model_validate_json(scenes_json.read_text("utf-8")), p.name, html_out, png_out, resolved)

    sb_inputs = [scenes_json, resolved_json] + brand_in
    print(f"  storyboard: {'done' if run_stage(p, 'storyboard', sb_inputs, [html_out, png_out], storyboard) else 'up to date'}")

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
    from pipeline import render as rnd
    from pipeline.assemble import assemble, pick_music, sfx_cues
    brand = Brand.model_validate_json((BRAND / "brand.json").read_text("utf-8"))
    plan = ScenePlan.model_validate_json(scenes_json.read_text("utf-8"))
    mode = "final" if final else "preview"
    failed, assembled = 0, []
    for fmt in ("16:9", "9:16"):
        if fmt not in brand.formats:
            continue
        d = rnd.fmt_dir(fmt, final)
        jobs = rnd.plan_jobs(plan, resolved, brand, fmt, ROOT, w / "scenes" / d, final, transcript.words,
                             prepared)
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
        cues = sfx_cues([(j.scene.id, j.scene.start, j.template, j.scene.params) for j in jobs], LIBRARY)
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
    qa_json = w / "qa.json"

    def qa():
        files = [check(o, audio, c, h, final, p) for o, c, h in assembled]
        atomic_write(qa_json, QAReport(mode=mode, files=files).model_dump_json(indent=2))

    run_stage(p, "qa", [o for o, _, _ in assembled] + [audio], [qa_json], qa, extra=mode)
    report = QAReport.model_validate_json(qa_json.read_text("utf-8"))
    qa_failed = False
    for f in report.files:
        src = p / f.file
        dest = p / "output" / src.name
        bad = [f"{c.name}: {c.detail}" for c in f.checks if c.status != "ok"]
        if f.passed or not final:
            if not dest.exists() or dest.stat().st_mtime_ns < src.stat().st_mtime_ns:
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


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    setup_env()
    ap = argparse.ArgumentParser(prog="studio")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor")
    sub.add_parser("new").add_argument("name")
    sub.add_parser("status").add_argument("project")
    run = sub.add_parser("run")
    run.add_argument("project")
    run.add_argument("--final", action="store_true", help="full resolution (default: 720p preview)")
    run.add_argument("--workers", type=int, default=2, help="parallel scene renders (default 2)")
    a = ap.parse_args()

    if a.cmd == "doctor":
        return doctor.run()
    if a.cmd == "new":
        print(new_project(a.name))
        return 0
    if a.cmd == "run":
        try:
            return run_project(find_project(a.project), a.final, a.workers)
        except Exception as e:  # run_stage already logged the traceback to work/logs/<stage>.log
            print(f"  FAILED: {type(e).__name__}: {e}")
            return 1
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
