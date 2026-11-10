r"""Hybrid render test, Kaggle half: after kaggle\hybrid_local.py, upload the photo + RGBA text frames + job.json,
run kernels/hybrid on a T4, download gpu.mp4 + times.json, write a side-by-side with the local Chrome render.
Usage: tools\.venv\Scripts\python.exe kaggle\hybrid_run.py
"""
import json
import shutil
import subprocess
import time

from run import HERE, USER, kg, wait

DS, KERNEL = f"{USER}/videostudio-hybrid-in", f"{USER}/videostudio-hybrid"
H = HERE / ".work" / "hybrid"


def main() -> None:
    s = json.loads((H / "scene.json").read_text("utf-8"))
    assert s["fit"] == "cover" and s["visual_type"] == "photo", "test covers the plain photo template only"
    u = min(s["w"], s["h"]) / 100
    pan = s["params"].get("pan") or ["left", "right"][s["id"] % 2]  # same rule as templates/photo
    lt = json.loads((H / "local_times.json").read_text())
    bg = s["colors"]["background"].lstrip("#")
    job = {"w": s["w"], "h": s["h"], "fps": lt["fps"], "frames": lt["frames"], "duration": lt["frames"] / lt["fps"],
           "asset": s["asset"], "zoom": s["params"].get("zoom", 1.12), "u": u,
           "dx": 0 if pan == "none" else (-1 if pan == "left" else 1) * u * 3, "trans_in": s["trans_in"],
           "bg_rgb": [int(bg[i:i + 2], 16) for i in (0, 2, 4)], "reps": 30}
    d = H / "upload"
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir()
    for f in (H / "ovl").glob("frame_*.png"):
        shutil.copy2(f, d)
    shutil.copy2(H / s["asset"], d)
    (d / "job.json").write_text(json.dumps(job))
    (d / "dataset-metadata.json").write_text(json.dumps({"title": "videostudio-hybrid-in", "id": DS,
                                                          "licenses": [{"name": "unknown"}]}))
    T = {"upload_mb": round(sum(f.stat().st_size for f in d.iterdir()) / 1e6, 1)}
    t0 = time.monotonic()
    if "ready" in kg("datasets", "status", DS, check=False):
        kg("datasets", "version", "-p", str(d), "-m", "hybrid test")
    else:
        kg("datasets", "create", "-p", str(d))
    time.sleep(10)
    wait("dataset", ["datasets", "status", DS], ("ready",), ("error",))
    T["upload_s"] = round(time.monotonic() - t0)
    t0 = time.monotonic()
    print(kg("kernels", "push", "-p", str(HERE / "kernels" / "hybrid")).strip().splitlines()[-1])
    wait("kernel", ["kernels", "status", KERNEL], ("COMPLETE",), ("ERROR", "CANCEL"))
    T["kernel_wall_s"] = round(time.monotonic() - t0)
    out = H / "out"
    shutil.rmtree(out, ignore_errors=True)
    t0 = time.monotonic()
    kg("kernels", "output", KERNEL, "-p", str(out))
    T["download_s"] = round(time.monotonic() - t0)
    T["kernel"] = json.loads(next(out.rglob("times.json")).read_text())
    T["local"] = lt
    (H / "times_all.json").write_text(json.dumps(T, indent=1))
    print(json.dumps(T, indent=1))
    gpu = next(out.rglob("gpu.mp4"))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(H / "ref.mp4"), "-i", str(gpu), "-filter_complex",
                    "[0]drawtext=text='local Chrome':x=20:y=20:fontsize=40:fontcolor=yellow[a];"
                    "[1]drawtext=text='Kaggle GPU hybrid':x=20:y=20:fontsize=40:fontcolor=yellow[b];[a][b]hstack,scale=1920:-2",
                    "-c:v", "libx264", "-crf", "20", str(H / "side_by_side.mp4")], check=True)
    for t in ("0.1", "1.4", "2.7"):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", t, "-i", str(H / "side_by_side.mp4"), "-frames:v", "1",
                        str(H / f"side_{t}.png")], check=True)
    r = subprocess.run(["ffmpeg", "-i", str(gpu), "-i", str(H / "ref.mp4"), "-lavfi", "ssim", "-f", "null", "-"],
                       capture_output=True, text=True)
    print([x for x in r.stderr.splitlines() if "SSIM" in x][-1:])


if __name__ == "__main__":
    main()
