"""Paths and environment. Every cache points at E: so the nearly-full C: drive never fills up."""
import os
from pathlib import Path

TOOLS = Path(__file__).resolve().parent.parent
ROOT = TOOLS.parent
PROJECTS = ROOT / "projects"
LIBRARY = ROOT / "_library"
BRAND = ROOT / "_brand"
CACHE = TOOLS / ".cache"
MODELS = TOOLS / "models"
ENGINES = TOOLS / "engines"
FIXTURE = TOOLS / "tests" / "fixtures" / "sample_30s"

# Sub-folders every project gets (see docs/ARCHITECTURE.md, "Project layout").
# Only the folders the user touches by hand; everything else is created when a file is written.
PROJECT_DIRS = ["input", "drop", "work"]  # work/ is written everywhere; assets/ and output/ appear with their first file

# Tools that would otherwise write big caches to C:. Child processes inherit these.
CACHE_ENV = {
    "HF_HOME": MODELS / "huggingface",               # Whisper and other Hugging Face models
    "TORCH_HOME": MODELS / "torch",                  # MMS forced-aligner model (align_mms)
    "UV_CACHE_DIR": CACHE / "uv",
    "PIP_CACHE_DIR": CACHE / "pip",
    "npm_config_cache": CACHE / "npm",
    "HYPERFRAMES_CACHE_DIR": CACHE / "hyperframes",
    "HYPERFRAMES_EXTRACT_CACHE_DIR": CACHE / "hyperframes-extract",  # render frame cache
    "HYPERFRAMES_FONT_CACHE_DIR": CACHE / "hyperframes-fonts",
    "TEMP": CACHE / "tmp",
    "TMP": CACHE / "tmp",
}


def setup_env() -> None:
    for key, path in CACHE_ENV.items():
        path.mkdir(parents=True, exist_ok=True)
        os.environ[key] = str(path)
