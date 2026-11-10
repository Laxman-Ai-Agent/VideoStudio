r"""Hybrid render test, local half: build one scene of a project exactly like `studio run --final`, then
  (a) full Chrome render (reference time + look),
  (b) overlay-only Chrome render: photo hidden, transparent page -> RGBA PNG frames for the GPU side.
Writes kaggle/.work/hybrid/{ref.mp4, scene.json, asset.*, ovl/*.png, local_times.json}. Never touches project outputs.
Usage: tools\.venv\Scripts\python.exe kaggle\hybrid_local.py 07 8
"""
import json
import shutil
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "tools"))
from pipeline import render as rnd, visual  # noqa: E402
from pipeline.config import BRAND, ROOT  # noqa: E402
from pipeline.contracts import Brand, Prepared, Resolved, ScenePlan, ThemeSpec, Transcript  # noqa: E402
from pipeline.project import find_project  # noqa: E402

OUT = HERE / ".work" / "hybrid"
HIDE = "<style>#img,#bg{visibility:hidden!important}html,body,#root{background:transparent!important}</style></head>"


def main(ref: str, sid: int) -> None:
    p = find_project(ref)
    w = p / "work"
    rd = lambda f, m: m.model_validate_json((w / f).read_text("utf-8"))  # noqa: E731
    brand = Brand.model_validate_json((BRAND / "brand.json").read_text("utf-8"))
    jobs = rnd.plan_jobs(rd("scenes.json", ScenePlan), rd("resolved.json", Resolved), brand, "16:9", ROOT,
                         OUT / "clips", True, rd("transcript.json", Transcript).words, Prepared.model_validate_json((w / "prepared" / "prepared.json").read_text("utf-8")),
                         rd("theme.json", ThemeSpec), visual.overlays(visual.load(p), p, "16:9"))
    job = next(j for j in jobs if j.scene.id == sid)
    print("template", job.template, job.asset, job.w, job.h, job.frames, "trans", job.trans)
    shutil.rmtree(OUT, ignore_errors=True)
    OUT.mkdir(parents=True)
    times = {}
    for name, fmt in (("ref", "mp4"), ("ovl", "png-sequence")):
        b = OUT / f"build_{name}"
        rnd.build(job, b, job.template)
        if name == "ovl":
            (b / "index.html").write_text((b / "index.html").read_text("utf-8").replace("</head>", HIDE, 1), "utf-8")
        t0 = time.monotonic()
        import subprocess
        out = OUT / (name + (".mp4" if fmt == "mp4" else ""))
        r = subprocess.run(["node", str(rnd.HF_BIN), "render", str(b), "-o", str(out), "--fps", str(job.fps),
                            "--quality", "standard", "--workers", "1", "--quiet", "--format", fmt],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        times[name] = round(time.monotonic() - t0, 1)
        print(name, times[name], "s", r.returncode, (r.stderr or "")[-300:])
    shutil.copy2(OUT / "build_ref" / "scene.json", OUT / "scene.json")
    shutil.copy2(job.asset, OUT / ("asset" + job.asset.suffix.lower()))
    (OUT / "local_times.json").write_text(json.dumps({**times, "frames": job.frames, "fps": job.fps}), "utf-8")


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]))
