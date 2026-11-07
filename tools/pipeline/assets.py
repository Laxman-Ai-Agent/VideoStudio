"""Asset index: every project / library image or video is described ONCE, cached by content hash.

`assets/index.json` (project) and `_library/index.json`. A new or changed file gets a thumbnail
(first frame for videos) and an empty description. All undescribed files go on ONE contact sheet;
Claude reads that single image and fills `description` in the index (run exits 2 until done).
Files named `scene_NNN*` were generated for a scene and need no description.
"""
import hashlib
import html
import json
import re
import subprocess
from collections.abc import Callable
from pathlib import Path

from .chrome import screenshot
from .contracts import AssetEntry, AssetIndex
from .ingest import IMAGE, VIDEO
from .project import atomic_write

THUMBS = ".thumbs"
SCENE_FILE = re.compile(r"scene_(\d{3})(_v)?$", re.I)  # scene_004.png, scene_004_v.png (9:16)
COLS, TILE_W = 5, 340
SHEET_MAX = 20  # tiles per contact sheet; more files = one more sheet per run


def media_files(base: Path) -> list[Path]:
    # raw_footage originals are indexed as their cut shots (assets/shots, shots stage) instead;
    # generated/processed belong to visual-assets.json, which already describes them
    return sorted(p for p in base.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE | VIDEO
                  and not {THUMBS, "raw_footage", "generated", "processed"} & set(p.relative_to(base).parts[:-1]))


def file_hash(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        while chunk := f.read(1 << 20):
            h.update(chunk)
    return h.hexdigest()[:16]


def probe(p: Path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                          "-show_entries", "stream=width,height:format=duration", "-of", "json", str(p)],
                         capture_output=True, text=True).stdout
    try:
        j = json.loads(out)
    except json.JSONDecodeError:
        return {}
    s = (j.get("streams") or [{}])[0]
    return {"width": s.get("width", 0), "height": s.get("height", 0),
            "duration": float(j.get("format", {}).get("duration", 0) or 0)}


def make_thumb(src: Path, dest: Path) -> bool:
    """First frame, 360 px wide. False if ffmpeg can't read it (e.g. some SVGs)."""
    if dest.exists():
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-frames:v", "1",
                        "-vf", "scale=360:-2", str(dest)], capture_output=True)
    return r.returncode == 0 and dest.exists()


def load(index_path: Path) -> AssetIndex:
    return (AssetIndex.model_validate_json(index_path.read_text("utf-8"))
            if index_path.exists() else AssetIndex())


def save(index_path: Path, idx: AssetIndex) -> None:
    atomic_write(index_path, idx.model_dump_json(indent=2))


def update(base: Path, index_path: Path, probe: Callable[[Path], dict] = probe,
           thumb: Callable[[Path, Path], bool] = make_thumb) -> AssetIndex:
    """Sync the index with the files under base. Unchanged files (same path, size, mtime) are not
    re-read; renamed or touched files keep their description (same hash); deleted ones drop out."""
    idx = load(index_path)
    by_path = {e.file: (h, e) for h, e in idx.assets.items()}
    fresh: dict[str, AssetEntry] = {}
    for p in media_files(base):
        rel, st = p.relative_to(base).as_posix(), p.stat()
        old = by_path.get(rel)
        if old and old[1].size == st.st_size and old[1].mtime_ns == st.st_mtime_ns:
            fresh[old[0]] = old[1]
            continue
        h = file_hash(p)  # ponytail: identical copies share one entry (last path wins); harmless, same picture
        if h in idx.assets:
            fresh[h] = idx.assets[h].model_copy(update={"file": rel, "size": st.st_size,
                                                        "mtime_ns": st.st_mtime_ns})
            continue
        t = base / THUMBS / f"{h}.jpg"
        m = SCENE_FILE.match(p.stem)
        fresh[h] = AssetEntry(file=rel, kind="video" if p.suffix.lower() in VIDEO else "image",
                              size=st.st_size, mtime_ns=st.st_mtime_ns, **probe(p),
                              thumb=t.relative_to(base).as_posix() if thumb(p, t) else "",
                              description=f"generated for scene {int(m[1])}" if m else "")
    idx.assets = fresh
    save(index_path, idx)
    return idx


def undescribed(idx: AssetIndex) -> list[AssetEntry]:
    return [e for e in idx.assets.values() if not e.description.strip()]


def contact_sheet(base: Path, entries: list[AssetEntry], title: str) -> Path:
    """ONE image with every undescribed file (thumbnail + filename), for a single Claude read."""
    e = html.escape
    tiles = "".join(
        f'<div class="t"><img src="{(base / x.thumb).resolve().as_uri() if x.thumb else ""}">'
        f'<p>{e(x.file)} · {x.kind}{f" {x.duration:.0f}s" if x.kind == "video" else ""}</p></div>'
        for x in entries)
    page = f"""<!doctype html><meta charset="utf-8"><style>
body{{margin:0;padding:16px;background:#111;color:#fff;font:18px sans-serif}}
.g{{display:grid;grid-template-columns:repeat({COLS},{TILE_W}px);gap:12px}}
img{{width:{TILE_W}px;height:{TILE_W * 9 // 16}px;object-fit:contain;background:#000}}
p{{margin:4px 0 0;font-weight:700;overflow:hidden;white-space:nowrap}}</style>
<h2 style="margin:0 0 12px">{e(title)}: {len(entries)} file(s) to describe</h2><div class="g">{tiles}</div>"""
    out = base / THUMBS / "contact_sheet.html"
    atomic_write(out, page)
    rows = -(-len(entries) // COLS)
    png = out.with_suffix(".png")
    screenshot(out, png, 32 + COLS * (TILE_W + 12), 70 + rows * (TILE_W * 9 // 16 + 46))
    return png
