"""Runs on Kaggle GPU. kaggle/run.py fills SOURCES with tools/pipeline/{contracts,transcribe}.py, so Kaggle
runs exactly the local transcribe_checked() (same decode settings, coverage checks, hole patching).
Only the model device changes: CUDA float16 instead of CPU int8."""
import json
import subprocess
import sys
import time
from pathlib import Path

SOURCES = {}  # filled by kaggle/run.py: {"pipeline/transcribe.py": "...", ...}
FW_VERSION, AV_VERSION = "1.2.1", "15.1.0"  # same as tools/uv.lock (Kaggle's newer av breaks fw 1.2.1)

t0 = time.time()
work = Path("/kaggle/working")
for rel, text in SOURCES.items():
    (work / rel).parent.mkdir(parents=True, exist_ok=True)
    (work / rel).write_text(text, encoding="utf-8")
sys.path.insert(0, str(work))

inp = Path("/kaggle/input")
models = sorted(inp.rglob("model.bin"))
audios = sorted(p for p in inp.rglob("*.flac"))
print("model:", models, "\naudio:", audios, flush=True)
if not models or not audios:  # fail fast, before any install or model load
    sys.exit("missing model.bin or *.flac under /kaggle/input")
model_dir = str(models[0].parent)

subprocess.run([sys.executable, "-m", "pip", "install", "-q", f"faster-whisper=={FW_VERSION}", f"av=={AV_VERSION}"], check=True)

# ctranslate2 (inside faster-whisper) is built for CUDA 12 + cuDNN 9; Kaggle's image no longer ships
# libcublas.so.12. Install the pip CUDA 12 libs and preload them before ctranslate2 dlopens them.
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "nvidia-cublas-cu12", "nvidia-cudnn-cu12==9.*"], check=True)
subprocess.run(["nvidia-smi", "--query-gpu=name,driver_version,memory.total", "--format=csv"])
import ctypes  # noqa: E402
import importlib.util  # noqa: E402

libs = [p for pkg in ("nvidia.cublas", "nvidia.cudnn")
        for p in sorted(Path(importlib.util.find_spec(pkg).submodule_search_locations[0], "lib").glob("lib*.so*"))]
for _ in range(len(libs)):  # load order: retry until every lib's dependencies are already loaded
    left = []
    for p in libs:
        try:
            ctypes.CDLL(str(p), mode=ctypes.RTLD_GLOBAL)
        except OSError:
            left.append(p)
    if not left or len(left) == len(libs):
        break
    libs = left
print("CUDA libs not preloaded:", [p.name for p in left], flush=True)

import faster_whisper  # noqa: E402

_Model = faster_whisper.WhisperModel
faster_whisper.WhisperModel = lambda size, device="cpu", compute_type="int8", **kw: _Model(
    model_dir, device="cuda", compute_type="float16", **kw)

from pipeline.transcribe import transcribe_checked  # noqa: E402

out = work / "out"
out.mkdir(exist_ok=True)
report = {}
for a in audios:
    t1 = time.time()
    try:
        t = transcribe_checked(a)
        t = t.model_copy(update={"model": "faster-whisper large-v3 float16 (kaggle gpu)"})
        (out / f"{a.stem}.json").write_text(t.model_dump_json(indent=2), encoding="utf-8")
        report[a.stem] = {"ok": True, "words": len(t.words), "duration": t.duration, "seconds": round(time.time() - t1, 1)}
    except Exception as e:  # keep going: one bad file must not lose the others
        report[a.stem] = {"ok": False, "error": f"{type(e).__name__}: {e}"}
    print(a.stem, report[a.stem], flush=True)
report["_total_seconds"] = round(time.time() - t0, 1)
(out / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print("done", report["_total_seconds"], "s")
