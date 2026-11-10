"""CPU-only Kaggle kernel: fetch faster-whisper large-v3 into this kernel's output.
GPU kernels attach this kernel's output as input (kernel_sources), so GPU time never downloads models.
Same snapshot as the local cache (tools/models/huggingface), so Kaggle and local transcripts match."""
from pathlib import Path
from huggingface_hub import snapshot_download

REPO, REVISION = "Systran/faster-whisper-large-v3", "edaa852ec7e145841d8ffdb056a99866b5f0a478"
out = Path("/kaggle/working/whisper-large-v3")
snapshot_download(REPO, revision=REVISION, local_dir=out)
files = {p.name: p.stat().st_size for p in out.iterdir() if p.is_file()}
print(files)
assert files.get("model.bin", 0) > 3_000_000_000, "model.bin missing or truncated"
print("OK", out)
