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

## GPU quota rules
- Fail fast: the kernel checks inputs before installing or loading anything (a failed test cost ~27 s of GPU).
- Models come from the CPU model kernel (no download on GPU time); pip installs take ~15 s.
- One batch run for many audio files; skip files already done (content hash); save per file.

## Hybrid render test (2026-11-10, not part of the pipeline)
`tools\.venv\Scripts\python.exe kaggle\hybrid_local.py 07 8` then `... kaggle\hybrid_run.py`: one photo scene, text from Chrome as RGBA PNGs,
photo motion + composite + NVENC on a T4 (`kernels/hybrid`). Results in `docs/STATUS.md` (GPU plan line); output in `kaggle/.work/hybrid/`.
