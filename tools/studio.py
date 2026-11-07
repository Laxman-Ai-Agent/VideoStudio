"""VideoStudio command line.

    studio doctor                 check tools, disk, caches
    studio new "AI Agents"        create projects/NN_AI_Agents with all sub-folders
    studio status 01              show which stages are done / failed
    studio run 01                 ingest -> transcribe -> align -> plan -> storyboard (resumes)
"""
import argparse
import sys

from pathlib import Path

from pipeline import doctor
from pipeline.config import BRAND, setup_env
from pipeline.contracts import ScenePlan, Transcript
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
        from pipeline.transcribe import transcribe as whisper  # loads faster-whisper only when needed
        atomic_write(whisper_json, whisper(audio, model_size=WHISPER_MODEL).model_dump_json(indent=2))

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

    html_out, png_out = w / "storyboard.html", w / "storyboard.png"

    def storyboard():
        from pipeline.storyboard import render
        render(ScenePlan.model_validate_json(scenes_json.read_text("utf-8")), p.name, html_out, png_out)

    sb_inputs = [scenes_json] + [f for f in (BRAND / "brand.json",) if f.exists()]
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
