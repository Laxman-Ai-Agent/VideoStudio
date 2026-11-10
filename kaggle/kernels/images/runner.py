"""Runs on Kaggle GPU (T4 x2). kaggle/images.py fills JOBS. Z-Image-Turbo (Apache-2.0) is downloaded straight
from Hugging Face inside this run (Kaggle internet is fast; mounted kernel outputs are far too slow to read).
T4 has no fast bf16: fp16 + fp16_fix (plain fp16 gives NaN/black images): ~43 s per
1344x768 image. (bf16 split over both T4s with accelerate also works but takes ~255 s per image.)
Writes out/<id>.png + report.json (seconds per image, GPU memory)."""
import gc
import json
import os
import subprocess
import sys
import threading
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


S = 256.0  # fp16 fix: activation scale-down inside each block (see fp16_fix)


def fp16_fix(tr) -> None:
    """Z-Image in fp16 overflows (>65504) inside its blocks -> NaN/black images. Every block ends its attention and
    FFN branch with an RMSNorm (attention_norm2 / ffn_norm2), which ignores the scale of its input. So the inputs
    of to_v and w3 are divided by S (attention and FFN are linear in them): the branch output shrinks S times, the
    RMSNorm eps shrinks S^2 times, and the block result is mathematically unchanged but stays inside fp16."""
    for m in tr.modules():
        if hasattr(m, "feed_forward") and hasattr(m, "ffn_norm2"):
            for lin in (m.feed_forward.w3, m.attention.to_v):
                lin.register_forward_pre_hook(lambda mod, inp: (inp[0] / S,) + tuple(inp[1:]))
            m.ffn_norm2.eps /= S * S
            m.attention_norm2.eps /= S * S


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
    fp16_fix(pipe.transformer)
    pipe.transformer.to("cuda:0")  # 12.6 GB; peak 15.1 GB at 1344x768 (T4 limit 15.6): keep images ~1 MP
    pipe.vae.to("cuda:0", dtype=torch.float32)
    pipes = [pipe]
    if GPUS > 1:  # 2nd copy on the other T4 (idle once the text encoder is gone): ~2x images per minute
        pipes.append(second_pipe(pipe, "cuda:1"))
    for p in pipes:
        p.vae.enable_tiling()
    report.update(dtype=str(dtype), load_s=round(time.time() - t, 1), copies=len(pipes))
    step(f"ready {report['load_s']} s, GPU memory {[round(torch.cuda.memory_allocated(i) / 1e9, 1) for i in range(GPUS)]} GB")
    t = time.time()
    threads = [threading.Thread(target=worker, args=(p, f"cuda:{i}", JOBS[i::len(pipes)], embeds))
               for i, p in enumerate(pipes)]
    for th in threads:
        th.start()
    for th in threads:
        th.join()
    report["generate_s"] = round(time.time() - t, 1)


def second_pipe(pipe, dev: str):
    """Copy the transformer GPU-to-GPU (an empty skeleton on the meta device, then load_state_dict), so the second
    copy never needs another 12.6 GB of CPU RAM. VAE and scheduler are small: plain copies."""
    import copy
    from diffusers import ZImagePipeline, ZImageTransformer2DModel
    tr = pipe.transformer
    with torch.device("meta"):
        tr2 = ZImageTransformer2DModel.from_config(tr.config).to(tr.dtype)
    tr2.to_empty(device=dev)
    tr2.load_state_dict(tr.state_dict())
    for n, b in tr.named_buffers():  # non-persistent buffers are not in state_dict
        tr2.get_buffer(n).copy_(b)
    tr2.eval()
    fp16_fix(tr2)
    vae = copy.deepcopy(pipe.vae).to(dev)
    return ZImagePipeline(scheduler=copy.deepcopy(pipe.scheduler), vae=vae, text_encoder=None,
                          tokenizer=pipe.tokenizer, transformer=tr2)


def worker(pipe, dev: str, jobs: list, embeds: dict) -> None:
    torch.cuda.set_device(dev)
    for j in jobs:
        t = time.time()
        try:
            img = pipe(prompt_embeds=[x.to(dev) for x in embeds[j["id"]]], num_inference_steps=9, guidance_scale=0.0,
                       width=j["width"], height=j["height"], output_type="np",
                       generator=torch.Generator(dev).manual_seed(SEED)).images[0]
            if not np.isfinite(img).all() or img.max() < 0.02:
                raise FloatingPointError("NaN/black image")
            Image.fromarray((img * 255).round().clip(0, 255).astype("uint8")).save(out / f"{j['id']}.png")
            report["images"][j["id"]] = {"s": round(time.time() - t, 1), "gpu": dev, "w": j["width"], "h": j["height"],
                                         "peak_gpu_gb": round(torch.cuda.max_memory_allocated(dev) / 1e9, 1)}
        except Exception as e:  # one bad image must not stop the others
            report["images"][j["id"]] = {"error": f"{type(e).__name__}: {e}"[:300], "gpu": dev}
        step(f"{j['id']} {report['images'][j['id']]}")

try:
    run(torch.float16)
except Exception as e:  # report.json must exist even on failure, so the local side can show the reason
    import traceback
    traceback.print_exc()
    report["error"] = f"{type(e).__name__}: {e}"[:500]
report["total_s"] = round(time.time() - t0, 1)
(out / "report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report, indent=1))
