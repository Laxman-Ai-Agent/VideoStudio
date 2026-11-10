r"""kaggle\run.cmd NN [NN ...]: transcribe project audio on Kaggle GPU -> projects/NN/work/whisper.json.

Same checkpoint as `studio run` (stage "transcribe", inputs = audio + model name), so a finished project is
skipped here and `studio run NN` afterwards sees the stage as up to date. Several projects = one GPU run.
Runs with tools\.venv python; the Kaggle CLI goes through kg.cmd (token never printed).
"""
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOOLS = HERE.parent / "tools"
sys.path.insert(0, str(TOOLS))

from pipeline.contracts import Transcript  # noqa: E402
from pipeline.project import atomic_write, find_project, hash_inputs, load_state, run_stage  # noqa: E402
from studio import WHISPER_MODEL, _one  # noqa: E402

USER = "laxmand7221"
AUDIO_DS, KERNEL = f"{USER}/videostudio-audio", f"{USER}/videostudio-transcribe"
WORK = HERE / ".work"  # git-ignored scratch: audio upload folder, filled kernel, downloaded output
POLL = 20  # seconds between Kaggle status checks
MARKER = WORK / "last_push.json"  # job keys of the last kernel push


def kg(*args: str, check: bool = True) -> str:
    r = subprocess.run(["cmd", "/c", str(HERE / "kg.cmd"), *args], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if check and r.returncode:
        raise RuntimeError(f"kaggle {args[0]} {args[1]} failed:\n{r.stdout}{r.stderr}")
    return r.stdout + r.stderr


def wait(what: str, cmd: list[str], done: tuple[str, ...], bad: tuple[str, ...]) -> str:
    while True:
        s = kg(*cmd, check=False)
        if any(x in s for x in done):
            return s
        if any(x in s for x in bad):
            raise RuntimeError(f"{what}: {s.strip()}")
        time.sleep(POLL)


def is_done(p: Path, audio: Path) -> bool:
    rec = load_state(p).stages.get("transcribe")
    return bool(rec and rec.status == "done" and rec.inputs_hash == hash_inputs([audio], WHISPER_MODEL)
                and (p / "work" / "whisper.json").exists())


def upload_audio(jobs: dict[str, Path]) -> None:
    d = WORK / "audio"
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    for key, audio in jobs.items():  # 16 kHz mono FLAC: lossless for Whisper (it resamples to this anyway), small upload
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(audio), "-ac", "1", "-ar", "16000",
                        str(d / f"{key}.flac")], check=True)
    (d / "dataset-metadata.json").write_text(json.dumps(
        {"title": "videostudio-audio", "id": AUDIO_DS, "licenses": [{"name": "unknown"}]}), encoding="utf-8")
    exists = "ready" in kg("datasets", "status", AUDIO_DS, check=False)
    print(f"  upload {len(jobs)} audio file(s) ({sum(f.stat().st_size for f in d.glob('*.flac')) // 1024} KB)")
    if exists:
        kg("datasets", "version", "-p", str(d), "-m", "audio " + " ".join(jobs))
    else:
        kg("datasets", "create", "-p", str(d))
    time.sleep(POLL)  # the new version needs a moment before its status flips
    wait("audio dataset", ["datasets", "status", AUDIO_DS], ("ready",), ("error",))


def run_kernel(jobs: dict[str, Path]) -> Path:
    k = WORK / "kernel"
    shutil.rmtree(k, ignore_errors=True)
    k.mkdir(parents=True)
    src = {f"pipeline/{n}": (TOOLS / "pipeline" / n).read_text("utf-8") for n in ("contracts.py", "transcribe.py")}
    src["pipeline/__init__.py"] = ""
    runner = (HERE / "kernels" / "transcribe" / "runner.py").read_text("utf-8")
    (k / "runner.py").write_text(runner.replace("SOURCES = {}", "SOURCES = " + repr(src), 1), encoding="utf-8")
    shutil.copy(HERE / "kernels" / "transcribe" / "kernel-metadata.json", k)
    print("  " + kg("kernels", "push", "-p", str(k)).strip().splitlines()[-1])
    MARKER.write_text(json.dumps(sorted(jobs)), encoding="utf-8")  # lets a rerun resume this push
    return fetch()


def fetch() -> Path:
    """Wait for the pushed kernel to finish, then download its output."""
    t0 = time.monotonic()
    wait("kernel", ["kernels", "status", KERNEL], ("COMPLETE",), ("ERROR", "CANCEL"))
    print(f"  kernel finished in {time.monotonic() - t0:.0f} s (wall clock, includes queue)")
    out = WORK / "output"
    shutil.rmtree(out, ignore_errors=True)
    kg("kernels", "output", KERNEL, "-p", str(out))
    return out


def resume(jobs: dict[str, Path]) -> Path | None:
    """Same jobs as the last push (script was stopped, PC slept, network dropped)? Then reuse that Kaggle run:
    still running -> wait for it; finished -> just download. No new upload, no second GPU run."""
    if not MARKER.exists() or json.loads(MARKER.read_text("utf-8")) != sorted(jobs):
        return None
    s = kg("kernels", "status", KERNEL, check=False)
    if any(x in s for x in ("RUNNING", "QUEUED", "COMPLETE")):
        print("  resuming the previous Kaggle run of these files (no new GPU run)")
        return fetch()
    return None  # failed / cancelled / unknown: run again


def main(refs: list[str]) -> int:
    jobs, projects = {}, {}
    for ref in refs:
        p = find_project(ref)
        audio = _one(p / "input", "audio")
        if not audio:
            print(f"{p.name}: no input/audio.*, skipped")
        elif is_done(p, audio):
            print(f"{p.name}: transcribe already up to date, skipped (no GPU used)")
        else:
            key = hash_inputs([audio], WHISPER_MODEL)  # file name on Kaggle = content key
            jobs[key], projects[key] = audio, p
    if not jobs:
        return 0
    out = resume(jobs)
    if out is None:
        upload_audio(jobs)
        out = run_kernel(jobs)
    report = json.loads(next(out.rglob("report.json")).read_text("utf-8"))
    print("  report:", json.dumps(report))
    failed = 0
    for key, p in projects.items():
        got = next(out.rglob(f"{key}.json"), None)
        if not got:
            print(f"{p.name}: FAILED on Kaggle: {report.get(key)}")
            failed += 1
            continue
        t = Transcript.model_validate_json(got.read_text("utf-8"))  # contract check before it enters the pipeline
        run_stage(p, "transcribe", [jobs[key]], [p / "work" / "whisper.json"],
                  lambda: atomic_write(p / "work" / "whisper.json", t.model_dump_json(indent=2)),
                  force=True, extra=WHISPER_MODEL)
        print(f"{p.name}: whisper.json written ({len(t.words)} words, {t.duration} s audio)")
    MARKER.unlink(missing_ok=True)  # results used: a rerun of failed files must push a fresh run
    return 1 if failed else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1:]))
