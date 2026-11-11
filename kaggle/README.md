# kaggle/: run heavy GPU stages on Kaggle (optional add-on)

Everything Kaggle-related lives in this folder. The main pipeline (`tools/`, `studio.cmd`) does not depend on it.
To remove: delete this folder and the `kaggle/` lines in `.gitignore`.

## Flow (audio only, no Gemini JSON)
1. Kaggle GPU: Whisper large-v3 transcribes the audio (Telugu + English).
2. Claude fixes the words (English words in English script, Telugu in Telugu, meaning fits the content) and
   writes a Gemini-style JSON (`scenes -> words`).
3. Local `pipeline.align_mms` fixes the word timings against the audio.
Without Kaggle: the user gives audio + Gemini JSON and only step 3 runs.

## Setup (done once)
- Token: Kaggle -> Settings -> API -> create token; save the token text as `kaggle/access_token` (no extension).
  Git-ignored. Never paste it in chat or code.
- CLI: `uv venv .venv --python 3.12` then `uv pip install --python .venv/Scripts/python.exe -r requirements.lock.txt`
  (kaggle 2.2.5 needs `six`, which it does not declare).
- Use: `kaggle\kg.cmd <kaggle args>`, e.g. `kaggle\kg.cmd kernels list --mine`.

## Models (no uploads from this PC: home upload is ~2 MB/s, Kaggle downloads 3 GB in seconds)
- `kernels/whisper-model/`: CPU-only private kernel `laxmand7221/videostudio-whisper-model`. It downloads
  faster-whisper large-v3 (same pinned snapshot as the local cache) into its output. GPU kernels list it in
  `kernel_sources`, so the model is mounted under `/kaggle/input/` and GPU time never downloads it.
  Re-run: `kg.cmd kernels push -p kaggle\kernels\whisper-model` (CPU, no GPU quota).

## Transcribe on Kaggle GPU
`kaggle\run.cmd 07 [08 ...]` (tools venv python): audio -> 16 kHz mono FLAC -> private dataset `videostudio-audio`
-> GPU kernel `videostudio-transcribe` (runs the local `tools/pipeline/transcribe.py` code, CUDA float16)
-> `projects/NN/work/whisper.json`, checkpointed as stage `transcribe` (same key as `studio run`, so studio
does not re-transcribe locally; finished projects are skipped here without using the GPU). Several projects = one run.
Kernel pins faster-whisper 1.2.1 + av 15.1.0 (Kaggle's newer av breaks it) and preloads pip CUDA 12 cuBLAS/cuDNN
(the Kaggle image has no libcublas.so.12). First test (07 audio, 77 s): 121 s on a T4, ~140 s GPU session,
~170 s wall clock; local CPU was ~10 min. Scratch files: `kaggle/.work/` (git-ignored).
Resume: a rerun with the same files reuses the last Kaggle run (`.work/last_push.json`): still running -> wait,
finished -> download only; no second upload or GPU run. Failed or cancelled runs are pushed again. Test: `kaggle/test_run.py`.

## Images on Kaggle GPU (Z-Image-Turbo, test 2026-11-10)
`kaggle\images.cmd 01 A010 A023 A024 --out kaggle\.work\zimage-test` (no `--out`: writes `projects/NN/work/generated/<id>.png`
for `studio.cmd assets NN`). Model: Tongyi-MAI/Z-Image-Turbo, Apache-2.0 (commercial use OK), 9 steps, guidance 0.
Kernel `kernels/images` downloads the weights from Hugging Face inside the GPU run (~155 s); never mount weights from
other kernels' outputs (reading ~20 GB from mounted outputs took 25+ min). T4 has no fast bf16, and plain fp16 gives
black/NaN images; `fp16_fix` in the runner divides the inputs of `to_v` and `w3` in every block by 256 (each branch ends
in an RMSNorm, so the result is unchanged) -> fp16 works: ~43 s per 1344x768 image, peak 15.1 GB of the T4's 15.6 GB.
(bf16 split over both T4s with accelerate also worked: ~255 s per image.) Text encoder needs `torch.no_grad()` (else OOM).
Both T4s generate in parallel (2nd transformer copied GPU-to-GPU, no extra CPU RAM): ~40 s per image per GPU,
so ~20 s per image overall. Per run: ~160 s download + ~145 s load (setup ~5 min), then ~20 s per image. Free test
prompts: `kaggle\images.cmd kaggle\.worknimals.json` ([{id, prompt, aspect_ratio}], images to `.work/animals/`). Resume key = runner code + jobs (`.work/images_last_push.json`).

## GPU quota rules
- Fail fast: the kernel checks inputs before installing or loading anything (a failed test cost ~27 s of GPU).
- Models come from the CPU model kernel (no download on GPU time); pip installs take ~15 s.
- One batch run for many audio files; skip files already done (content hash); save per file.

## Hybrid render test (2026-11-10, not part of the pipeline)
`tools\.venv\Scripts\python.exe kaggle\hybrid_local.py 07 8` then `... kaggle\hybrid_run.py`: one photo scene, text from Chrome as RGBA PNGs,
photo motion + composite + NVENC on a T4 (`kernels/hybrid`). Results in `docs/STATUS.md` (GPU plan line); output in `kaggle/.work/hybrid/`.
