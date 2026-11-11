"""ingest stage: sort drop/ into input/ and assets/. Files are MOVED (never edited or deleted) and logged.

- audio  -> input/audio.<ext>     (2+ audio files -> AmbiguousInput, ask the user)
- script -> input/script.<ext>    (.txt/.md, or a Gemini transcript *gemini*.json; 2+ -> AmbiguousInput)
- images and videos (also A012.png, the upload for visual-assets.json id A012) -> assets/originals
  (the user's own files, never deleted; the processed A012.png is written to assets/)
- videos longer than 2 min -> assets/originals/raw_footage (cut into shots by the shots stage)
- anything else -> drop/_unknown
"""
import re
import shutil
import subprocess
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

AUDIO = {".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg"}
SCRIPT = {".txt", ".md"}
IMAGE = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"}
VIDEO = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"}
RAW_FOOTAGE_SECONDS = 120
ORIGINALS = "assets/originals"  # files the user gave by hand; never deleted
ASSET_ID = re.compile(r"^a\d{3,4}(?:[_\-. ].*)?$")  # A012.png, A012_v2.png -> visual-assets.json upload


class AmbiguousInput(Exception):
    """More than one audio file or script. The user must pick one; nothing was moved."""


def probe_duration(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True).stdout
    try:
        return float(out.strip())
    except ValueError:
        return 0.0


def role(path: Path) -> str | None:
    """'audio', 'script' or None. A *gemini*.json is a script: only its words are used, never its timings."""
    ext = path.suffix.lower()
    if ext in AUDIO:
        return "audio"
    if ext in SCRIPT or (ext == ".json" and "gemini" in path.name.lower()):
        return "script"
    return None


def classify(path: Path, duration: Callable[[Path], float] = probe_duration) -> str:
    """Destination folder relative to the project, or 'drop/_unknown'."""
    ext, name = path.suffix.lower(), path.stem.lower()
    if role(path):
        return "input"
    if ext in IMAGE or (ext in VIDEO and ASSET_ID.match(name)) or (ASSET_ID.match(name) and ext == ".json"):
        return ORIGINALS
    if ext in VIDEO:
        return ORIGINALS + "/raw_footage" if duration(path) > RAW_FOOTAGE_SECONDS else ORIGINALS
    return "drop/_unknown"


def _free_name(dest: Path) -> Path:
    stem, n = dest.stem, 1
    while dest.exists():
        dest = dest.with_name(f"{stem}__{n}{dest.suffix}")
        n += 1
    return dest


def ingest(project: Path, duration: Callable[[Path], float] = probe_duration) -> list[tuple[Path, Path]]:
    """Returns (source, destination) for every moved file."""
    # ponytail: top-level files only; walk sub-folders if the user starts dropping folders
    files = sorted(p for p in (project / "drop").iterdir() if p.is_file())
    for kind in ("audio", "script"):
        new = [p for p in files if role(p) == kind]
        old = list((project / "input").glob(f"{kind}.*")) if new else []
        if len(new) + len(old) > 1:
            names = ", ".join(p.relative_to(project).as_posix() for p in old + new)
            raise AmbiguousInput(f"more than one {kind}: {names}. Keep only one, move the rest out.")

    moves = []
    for src in files:
        kind = role(src)
        name = kind + src.suffix.lower() if kind else src.name
        folder = classify(src, duration)
        dest = _free_name(project / folder / name)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(src, dest)
        moves.append((src, dest))

    if moves:
        stamp = f"{datetime.now():%Y-%m-%d %H:%M}"
        with open(project / "project.md", "a", encoding="utf-8") as f:
            f.writelines(f"- {stamp} ingest: `{s.relative_to(project).as_posix()}` -> "
                         f"`{d.relative_to(project).as_posix()}`\n" for s, d in moves)
    return moves
