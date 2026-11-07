"""VideoStudio command line.

    studio doctor                 check tools, disk, caches
    studio new "AI Agents"        create projects/NN_AI_Agents with all sub-folders
    studio status 01              show which stages are done / failed
    studio run 01                 ingest -> transcribe -> align -> plan -> index -> resolve
                                  -> prompts -> storyboard (resumes)
"""
import argparse
import json
import sys

from pathlib import Path

from pipeline import doctor
from pipeline import assets
from pipeline.config import BRAND, LIBRARY, ROOT, secret, setup_env
from pipeline.contracts import Resolved, ScenePlan, Transcript
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


def run_project(p: Path) -> int:
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
            todo.append((idx_file, assets.contact_sheet(base, undone, f"{p.name} {name}"), len(undone)))
    if todo:
        for idx_file, sheet, n in todo:
            print(f"  STOP: {n} asset(s) need a description. Look at {sheet}\n"
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
    print(f"  GATE: approve {png_out} before render (Phase 3).")
    return 0


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    setup_env()
    ap = argparse.ArgumentParser(prog="studio")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor")
    sub.add_parser("new").add_argument("name")
    sub.add_parser("status").add_argument("project")
    sub.add_parser("run").add_argument("project")
    a = ap.parse_args()

    if a.cmd == "doctor":
        return doctor.run()
    if a.cmd == "new":
        print(new_project(a.name))
        return 0
    if a.cmd == "run":
        try:
            return run_project(find_project(a.project))
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
