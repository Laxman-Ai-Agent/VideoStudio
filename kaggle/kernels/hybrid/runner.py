"""Runs on a Kaggle T4. Hybrid render test of one photo scene: the photo motion (GSAP photo template: cover fit,
scale + pan, fade-in, blur-in transition) is redrawn on the GPU with torch, the Chrome-rendered RGBA text frames
are composited on top, RGB -> NV12 on the GPU, encoded with h264_nvenc. job.json comes from kaggle/hybrid_run.py."""
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

T = {}
t_all = time.time()
inp = next((p.parent for p in Path("/kaggle/input").rglob("job.json")), None)
if not inp:  # fail fast, before any GPU work
    sys.exit("job.json missing under /kaggle/input")
job = json.loads((inp / "job.json").read_text())
frames_png = sorted(inp.glob("frame_*.png"))
assert len(frames_png) == job["frames"], (len(frames_png), job["frames"])
out = Path("/kaggle/working")

t0 = time.time()
ff = "ffmpeg"
enc = subprocess.run([ff, "-hide_banner", "-encoders"], capture_output=True, text=True).stdout if shutil.which(ff) else ""
if "h264_nvenc" not in enc:  # static build with NVENC (Kaggle downloads ~100 MB in seconds)
    subprocess.run("curl -sL https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/"
                   "ffmpeg-master-latest-linux64-gpl.tar.xz | tar xJ -C /tmp", shell=True, check=True)
    ff = next(Path("/tmp").glob("ffmpeg-*/bin/ffmpeg")).as_posix()
T["ffmpeg_setup"] = round(time.time() - t0, 2)
print("ffmpeg:", ff, subprocess.run([ff, "-version"], capture_output=True, text=True).stdout.splitlines()[0], flush=True)

import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn.functional as F  # noqa: E402
from PIL import Image  # noqa: E402

dev = torch.device("cuda")
print(torch.cuda.get_device_name(0), "cpus", os.cpu_count(), flush=True)
W, H, fps, n = job["w"], job["h"], job["fps"], job["frames"]

t0 = time.time()
ovl = torch.from_numpy(np.stack([np.asarray(Image.open(p).convert("RGBA")) for p in frames_png]))  # CPU decode
T["png_decode"] = round(time.time() - t0, 2)

t0 = time.time()
src = torch.from_numpy(np.asarray(Image.open(inp / job["asset"]).convert("RGB"))).to(dev).permute(2, 0, 1)[None].float() / 255
sh, sw = src.shape[2:]
k = max(W / sw, H / sh)  # object-fit: cover, centred
cov = F.interpolate(src, size=(round(sh * k), round(sw * k)), mode="bicubic", antialias=True, align_corners=False).clamp(0, 1)
y0, x0 = (cov.shape[2] - H) // 2, (cov.shape[3] - W) // 2
cov = cov[:, :, y0:y0 + H, x0:x0 + W]
bg = torch.tensor(job["bg_rgb"], device=dev).view(1, 3, 1, 1) / 255
ovl_g = ovl.to(dev)
torch.cuda.synchronize()
T["upload_prep"] = round(time.time() - t0, 2)

# BT.709 limited range RGB -> NV12 on the GPU, so the CPU only copies bytes to the encoder
M = torch.tensor([[0.1826, 0.6142, 0.0620], [-0.1006, -0.3386, 0.4392], [0.4392, -0.3989, -0.0403]], device=dev)


def nv12(rgb):  # rgb: 3xHxW float 0..1
    yuv = torch.einsum("ij,jhw->ihw", M, rgb) + torch.tensor([16 / 255, 128 / 255, 128 / 255], device=dev).view(3, 1, 1)
    y = (yuv[0] * 255).round().clamp(0, 255).to(torch.uint8)
    uv = F.avg_pool2d(yuv[1:][None], 2)[0]
    uv = (uv * 255).round().clamp(0, 255).to(torch.uint8).permute(1, 2, 0).reshape(H // 2, W)
    return torch.cat([y, uv]).cpu().numpy().tobytes()


def ease_power2_out(x):
    return 1 - (1 - x) ** 2


def gauss_blur(img, sigma):
    if sigma < 0.3:
        return img
    r = int(sigma * 3)
    g = torch.exp(-(torch.arange(-r, r + 1, device=dev).float() ** 2) / (2 * sigma * sigma))
    g = (g / g.sum()).view(1, 1, 1, -1).repeat(3, 1, 1, 1)
    img = F.conv2d(F.pad(img, (r, r, 0, 0), mode="replicate"), g, groups=3)
    return F.conv2d(F.pad(img, (0, 0, r, r), mode="replicate"), g.transpose(2, 3), groups=3)


def frame(i):
    t = i / fps
    d = job["duration"]
    s_img = 1 + (job["zoom"] - 1) * t / d  # GSAP fromTo scale 1 -> zoom, ease none
    x_img = -job["dx"] + 2 * job["dx"] * t / d  # x: -dx -> dx
    op = min(1.0, t / 0.25)
    s_wrap, blur = 1.0, 0.0
    if job["trans_in"] == "blur" and t < 0.25:  # wrap: blur(2u) scale 1.06 -> 0, 1 (power2.out)
        e = ease_power2_out(t / 0.25)
        s_wrap, blur = 1.06 + (1 - 1.06) * e, 2 * job["u"] * (1 - e)
    s, tx = s_img * s_wrap, x_img * s_wrap  # both transforms are centred, so they compose into one
    theta = torch.tensor([[[1 / s, 0, -2 * tx / (W * s)], [0, 1 / s, 0]]], device=dev)
    grid = F.affine_grid(theta, (1, 3, H, W), align_corners=False)
    img = F.grid_sample(cov, grid, mode="bilinear", padding_mode="zeros", align_corners=False)
    inside = F.grid_sample(torch.ones_like(cov[:, :1]), grid, mode="bilinear", padding_mode="zeros", align_corners=False)
    pic = bg + (img - bg * inside) * op  # transparent outside the element -> background
    pic = gauss_blur(pic, blur)[0]
    o = ovl_g[i].permute(2, 0, 1).float() / 255
    a = o[3:]
    return pic * (1 - a) + o[:3] * a


def render(path, reps=1):
    p = subprocess.Popen([ff, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "nv12", "-s", f"{W}x{H}", "-r", str(fps),
                          "-i", "-", "-c:v", "h264_nvenc", "-preset", "p5", "-cq", "18", "-pix_fmt", "yuv420p", str(path)],
                         stdin=subprocess.PIPE)
    for _ in range(reps):
        for i in range(n):
            p.stdin.write(nv12(frame(i)))
    p.stdin.close()
    assert p.wait() == 0, "ffmpeg failed"


t0 = time.time()
render(out / "gpu.mp4")
T["compose_encode"] = round(time.time() - t0, 2)
reps = job.get("reps", 30)
t0 = time.time()
render(out / "bench.mp4", reps)  # throughput: same scene repeated ~ a full video's length
T["bench_seconds"] = round(time.time() - t0, 2)
T["bench_video_seconds"] = round(reps * n / fps, 1)
(out / "bench.mp4").unlink()
T["total_in_kernel"] = round(time.time() - t_all, 2)
print("TIMES", json.dumps(T), flush=True)
(out / "times.json").write_text(json.dumps(T))
