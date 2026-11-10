"""Runs on Kaggle GPU (T4 x2). kaggle/images.py fills JOBS. Z-Image-Turbo (Apache-2.0) is downloaded straight
from Hugging Face inside this run (Kaggle internet is fast; mounted kernel outputs are far too slow to read).
T4 has no fast bf16: bf16 (fp16 gives NaN/black images with Z-Image; T4 emulates bf16, slower but works).
Writes out/<id>.png + report.json (seconds per image, GPU memory)."""
import gc
import json
import os
import subprocess
import sys
import time
from pathlib import Path

JOBS = []  # [{"id": "A010", "prompt": "...", "width": 1664, "height": 928}]
DIFFUSERS = "0.42.1"
REPO = "Tongyi-MAI/Z-Image-Turbo"
REV = "f332072aa78be7aecdf3ee76d5c247082da564a6"
SEED = 42

t0 = time.time()
if not JOBS:
    sys.exit("no jobs")
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")
subprocess.run([sys.executable, "-m", "pip", "install", "-q", f"diffusers=={DIFFUSERS}", "huggingface_hub"], check=True)
subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv"])
import numpy as np  # noqa: E402
import torch  # noqa: E402
from huggingface_hub import snapshot_download  # noqa: E402
from PIL import Image  # noqa: E402

out = Path("/kaggle/working/out")
out.mkdir(exist_ok=True)
GPUS = torch.cuda.device_count()
TE_DEV = "cuda:1" if GPUS > 1 else "cuda:0"
report = {"gpus": GPUS, "diffusers": DIFFUSERS, "images": {}}


def step(msg):
    print(f"[{time.time() - t0:6.0f}s] {msg}", flush=True)


step("download")
d = snapshot_download(REPO, revision=REV, local_dir="/tmp/zimage")
report["download_s"] = round(time.time() - t0, 1)
step(f"downloaded {report['download_s']} s")


@torch.no_grad()  # encode_prompt is not wrapped by diffusers: without this the text encoder keeps autograd activations (OOM)
def run(dtype) -> None:
    from diffusers import ZImagePipeline
    t = time.time()
    pipe = ZImagePipeline.from_pretrained(d, dtype=dtype)
    # from_pretrained left the text encoder in fp32 (15 GB, OOM on a 15 GB T4): convert explicitly on CPU.
    # Text encoder in bf16 (Qwen3 activations can overflow fp16), embeddings go back to the transformer dtype.
    pipe.text_encoder.to(torch.bfloat16)
    pipe.transformer.to(dtype)
    step(f"loaded on CPU ({dtype}) {time.time() - t:.0f} s")
    pipe.text_encoder.to(TE_DEV)
    embeds = {}
    for j in JOBS:  # all prompts first, then drop the text encoder (frees VRAM for the transformer)
        e, _ = pipe.encode_prompt(j["prompt"], device=TE_DEV, do_classifier_free_guidance=False)
        embeds[j["id"]] = [x.to("cpu", dtype) for x in e]
    pipe.text_encoder = None
    gc.collect()
    torch.cuda.empty_cache()
    # bf16 on T4 has no memory-efficient attention: the math fallback needs ~2 GB per attention call, which does
    # not fit next to the 12.5 GB transformer. Split its blocks over both T4s (accelerate hooks move activations).
    from accelerate import dispatch_model
    tr = pipe.transformer
    dmap = {n: "cuda:0" for n, _ in tr.named_parameters(recurse=False)}
    dmap.update({n: "cuda:0" for n, _ in tr.named_buffers(recurse=False)})
    for n, m in tr.named_children():
        if n == "layers" and GPUS > 1:
            half = len(m) // 2
            dmap.update({f"layers.{i}": "cuda:0" if i < half else "cuda:1" for i in range(len(m))})
        else:
            dmap[n] = "cuda:0"
    dispatch_model(tr, device_map=dmap, main_device="cuda:0")
    pipe.vae.to("cuda:0", dtype=torch.float32 if dtype == torch.float16 else dtype)
    step(f"{dtype}: GPU0 {torch.cuda.memory_allocated(0) / 1e9:.1f} GB, GPU{GPUS - 1} {torch.cuda.memory_allocated(GPUS - 1) / 1e9:.1f} GB")
    pipe.vae.enable_tiling()
    report.update(dtype=str(dtype), load_s=round(time.time() - t, 1))
    step(f"ready {report['load_s']} s")
    for j in JOBS:
        t = time.time()
        img = pipe(prompt_embeds=[x.to("cuda:0") for x in embeds[j["id"]]], num_inference_steps=9, guidance_scale=0.0,
                   width=j["width"], height=j["height"], output_type="np",
                   generator=torch.Generator("cuda:0").manual_seed(SEED)).images[0]
        if not np.isfinite(img).all() or img.max() < 0.02:
            raise FloatingPointError(f"NaN/black image {j['id']} in {dtype}")
        Image.fromarray((img * 255).round().clip(0, 255).astype("uint8")).save(out / f"{j['id']}.png")
        report["images"][j["id"]] = {"s": round(time.time() - t, 1), "w": j["width"], "h": j["height"],
                                     "peak_gpu_gb": [round(torch.cuda.max_memory_allocated(i) / 1e9, 1) for i in range(GPUS)]}
        step(f"{j['id']} {report['images'][j['id']]}")


try:
    run(torch.bfloat16)  # fp16 is ~2x faster but Z-Image gives NaN/black images in fp16 (tested on T4)
except Exception as e:  # report.json must exist even on failure, so the local side can show the reason
    import traceback
    traceback.print_exc()
    report["error"] = f"{type(e).__name__}: {e}"[:500]
report["total_s"] = round(time.time() - t0, 1)
(out / "report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report, indent=1))
