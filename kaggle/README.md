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

## GPU quota rules
- Test new code on a CPU session first; GPU only for proven code.
- Models and wheels come from private Kaggle datasets (no download time on GPU).
- One batch run for many audio files; skip files already done (content hash); save per file.
