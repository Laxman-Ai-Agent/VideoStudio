r"""kaggle\video.cmd IMAGE "prompt" [--id NAME] [--out DIR]
Test: animate one photo into a 5 s clip with LTX-Video 2B distilled on Kaggle GPU -> DIR/<id>.mp4
(default kaggle/.work/video/). The photo is cover-cropped to 832x480 (16:9) or 480x832 (9:16) and sent inside the script."""
import argparse
import base64
import io
import json
import shutil
import time
from pathlib import Path

from PIL import Image

from run import USER, WORK, kg, wait

HERE = Path(__file__).resolve().parent
KERNEL = f"{USER}/videostudio-video"


def main() -> int:
    ap = argparse.ArgumentParser(usage=__doc__)
    ap.add_argument("image")
    ap.add_argument("prompt")
    ap.add_argument("--id")
    ap.add_argument("--out", default=str(WORK / "video"))
    a = ap.parse_args()
    src = Image.open(a.image).convert("RGB")
    w, h = (832, 480) if src.width >= src.height else (480, 832)
    s = max(w / src.width, h / src.height)
    img = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS)
    left, top = (img.width - w) // 2, (img.height - h) // 2
    buf = io.BytesIO()
    img.crop((left, top, left + w, top + h)).save(buf, "JPEG", quality=92)
    job = {"id": a.id or Path(a.image).stem, "prompt": a.prompt, "image_b64": base64.b64encode(buf.getvalue()).decode(),
           "width": w, "height": h, "frames": 121}
    code = (HERE / "kernels" / "video" / "runner.py").read_text("utf-8").replace("JOBS = []", "JOBS = " + repr([job]), 1)
    k = WORK / "video-kernel"
    shutil.rmtree(k, ignore_errors=True)
    k.mkdir(parents=True)
    (k / "runner.py").write_text(code, encoding="utf-8")
    shutil.copy(HERE / "kernels" / "video" / "kernel-metadata.json", k)
    print("  " + kg("kernels", "push", "-p", str(k)).strip().splitlines()[-1])
    t0 = time.monotonic()
    wait("kernel", ["kernels", "status", KERNEL], ("COMPLETE",), ("ERROR", "CANCEL"))
    print(f"  kernel finished in {time.monotonic() - t0:.0f} s (wall clock, includes queue)")
    got = WORK / "video-out"
    shutil.rmtree(got, ignore_errors=True)
    kg("kernels", "output", KERNEL, "-p", str(got))
    print("  report:", json.dumps(json.loads(next(got.rglob("report.json")).read_text("utf-8"))))
    mp4 = next(got.rglob(f"{job['id']}.mp4"), None)
    if not mp4:
        return 1
    Path(a.out).mkdir(parents=True, exist_ok=True)
    shutil.copy(mp4, Path(a.out) / mp4.name)
    print(f"  clip: {Path(a.out) / mp4.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
