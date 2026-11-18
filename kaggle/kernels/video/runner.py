"""Runs on Kaggle GPU (T4 x2). kaggle/video.py fills JOBS. LTX-Video 2B 0.9.8 distilled image-to-video (8 steps):
one photo -> one 5 s clip. Transformer + VAE from the single-file checkpoint, T5 text encoder / tokenizer /
scheduler / configs from the 0.9.5 diffusers repo (same 2B architecture). T5 runs in bf16 on the second T4
(fp16 T5 gives NaN); the transformer tries fp16 first and falls back to bf16 (slow on T4) if the clip is NaN.
Writes out/<id>.mp4 + report.json (seconds per clip, GPU memory)."""
import base64
import io
import json
import subprocess
import sys
import time
from pathlib import Path

JOBS = []  # [{"id": "A01", "prompt": "...", "image_b64": "...", "width": 832, "height": 480, "frames": 121}]
DIFFUSERS = "0.42.1"
BASE, BASE_REV = "Lightricks/LTX-Video-0.9.5", "e58e28c39631af4d1468ee57a853764e11c1d37e"
CKPT, CKPT_REV = "Lightricks/LTX-Video", "8984fa25007f376c1a299016d0957a37a2f797bb"
CKPT_FILE = "ltxv-2b-0.9.8-distilled.safetensors"
TIMESTEPS = [1000, 993, 987, 981, 975, 909, 725, 0.03]  # LTX distilled schedule
FPS, SEED = 24, 42

t0 = time.time()
if not JOBS:
    sys.exit("no jobs")
subprocess.run([sys.executable, "-m", "pip", "install", "-q", f"diffusers=={DIFFUSERS}", "huggingface_hub",
                "imageio", "imageio-ffmpeg"], check=True)
subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv"])
import numpy as np  # noqa: E402
import torch  # noqa: E402
from huggingface_hub import hf_hub_download, snapshot_download  # noqa: E402
from PIL import Image  # noqa: E402

out = Path("/kaggle/working/out")
out.mkdir(exist_ok=True)
GPUS = torch.cuda.device_count()
TE_DEV = "cuda:1" if GPUS > 1 else "cuda:0"
report = {"gpus": GPUS, "diffusers": DIFFUSERS, "model": CKPT_FILE, "clips": {}}


def step(msg):
    print(f"[{time.time() - t0:6.0f}s] {msg}", flush=True)


step("download")
base = snapshot_download(BASE, revision=BASE_REV, local_dir="/tmp/ltx_base", allow_patterns=[
    "model_index.json", "scheduler/*", "tokenizer/*", "text_encoder/*", "transformer/config.json", "vae/config.json"])
ckpt = hf_hub_download(CKPT, CKPT_FILE, revision=CKPT_REV, local_dir="/tmp/ltx_ckpt")
report["download_s"] = round(time.time() - t0, 1)
step(f"downloaded {report['download_s']} s")


@torch.no_grad()
def encode(prompts: list) -> list:
    from transformers import T5EncoderModel, T5Tokenizer
    tok = T5Tokenizer.from_pretrained(base, subfolder="tokenizer")
    te = T5EncoderModel.from_pretrained(base, subfolder="text_encoder", torch_dtype=torch.bfloat16).to(TE_DEV).eval()
    res = []
    for p in prompts:
        t = tok(p, padding="max_length", max_length=256, truncation=True, add_special_tokens=True, return_tensors="pt")
        e = te(t.input_ids.to(TE_DEV), attention_mask=t.attention_mask.to(TE_DEV))[0]
        res.append((e.float().cpu(), t.attention_mask.cpu()))
    del te
    torch.cuda.empty_cache()
    return res


def load(dtype):
    from diffusers import AutoencoderKLLTXVideo, FlowMatchEulerDiscreteScheduler, LTXConditionPipeline
    from diffusers import LTXVideoTransformer3DModel
    from transformers import T5Tokenizer
    tr = LTXVideoTransformer3DModel.from_single_file(ckpt, config=base, subfolder="transformer", torch_dtype=dtype)
    vae = AutoencoderKLLTXVideo.from_single_file(ckpt, config=base, subfolder="vae", torch_dtype=dtype)
    pipe = LTXConditionPipeline(scheduler=FlowMatchEulerDiscreteScheduler.from_pretrained(base, subfolder="scheduler"),
                                vae=vae, text_encoder=None, transformer=tr,
                                tokenizer=T5Tokenizer.from_pretrained(base, subfolder="tokenizer")).to("cuda:0")
    pipe.vae.enable_tiling()
    return pipe


@torch.no_grad()
def clip(pipe, j, emb, dtype):
    from diffusers.pipelines.ltx.pipeline_ltx_condition import LTXVideoCondition
    img = Image.open(io.BytesIO(base64.b64decode(j["image_b64"]))).convert("RGB")
    e, m = emb
    return pipe(conditions=[LTXVideoCondition(image=img, frame_index=0)],
                prompt_embeds=e.to("cuda:0", dtype), prompt_attention_mask=m.to("cuda:0"),
                width=j["width"], height=j["height"], num_frames=j["frames"], frame_rate=FPS,
                timesteps=TIMESTEPS, decode_timestep=0.05, decode_noise_scale=0.025, image_cond_noise_scale=0.0,
                guidance_scale=1.0, guidance_rescale=0.7, output_type="np",
                generator=torch.Generator("cuda:0").manual_seed(SEED)).frames[0]


try:
    from diffusers.utils import export_to_video
    step("encode prompts")
    embeds = encode([j["prompt"] for j in JOBS])
    report["encode_s"] = round(time.time() - t0 - report["download_s"], 1)
    for dtype in (torch.float16, torch.bfloat16):
        step(f"load {dtype}")
        pipe = load(dtype)
        bad = False
        for j, emb in zip(JOBS, embeds):
            t = time.time()
            torch.cuda.reset_peak_memory_stats("cuda:0")
            frames = clip(pipe, j, emb, dtype)
            ok = bool(np.isfinite(frames).all() and frames.max() > 0.02)
            report["clips"][j["id"]] = {"s": round(time.time() - t, 1), "dtype": str(dtype), "ok": ok,
                                        "frames": len(frames), "w": j["width"], "h": j["height"],
                                        "peak_gpu_gb": round(torch.cuda.max_memory_allocated("cuda:0") / 1e9, 1)}
            step(f"{j['id']} {report['clips'][j['id']]}")
            if not ok:
                bad = True
                break
            export_to_video(list(frames), str(out / f"{j['id']}.mp4"), fps=FPS)
        del pipe
        torch.cuda.empty_cache()
        if not bad:
            break
except Exception as e:  # report.json must exist even on failure, so the local side can show the reason
    import traceback
    traceback.print_exc()
    report["error"] = f"{type(e).__name__}: {e}"[:500]
report["total_s"] = round(time.time() - t0, 1)
(out / "report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report, indent=1))
