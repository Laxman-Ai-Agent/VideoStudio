"""clean: thin out a big drop/ locally (no Claude tokens) before anyone looks at it.

Rejects exact duplicates, near-identical pictures (a Whisk "animate" video and its source still, the same
image saved twice), unreadable files, tiny / blurry / blank pictures and very short videos. In every group of
look-alikes ONE file is kept (a video first, then the biggest sharpest picture). Rejects are MOVED to
drop/_unused/ (same sub-path), never deleted: the user's media. `studio.cmd clean NN` = report, `--apply` moves.
"""
import hashlib
import io
import subprocess
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from .ingest import IMAGE, VIDEO

UNUSED = "_unused"
SIMILAR = 10          # dHash bits (of 64) that may differ for "the same picture"
MIN_SIDE = 480        # shorter side in px below this = too small for 1080p (pictures)
MIN_VIDEO_SIDE = 360  # AI clips are 832x464 natively; the video template scales them
MIN_VIDEO_S = 1.0
BLUR_RATIO = 0.2      # sharpness below 20% of the median of all files = blurry
BLANK_STD = 6         # grey-level spread below this = an empty / black frame


@dataclass
class Item:
    path: Path
    kind: str
    w: int = 0
    h: int = 0
    seconds: float = 0.0
    sharp: float = 0.0
    std: float = 0.0
    dhash: int = 0
    sha: str = ""
    reasons: list[str] = field(default_factory=list)


def video_frame(path: Path) -> tuple[bytes, float]:
    """PNG of a frame 0.1 s in (the still a Whisk animation starts from) + duration."""
    d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True).stdout.strip()
    png = subprocess.run(["ffmpeg", "-v", "error", "-ss", "0.1", "-i", str(path), "-frames:v", "1", "-f", "image2pipe",
                          "-vcodec", "png", "-"], capture_output=True).stdout
    try:
        return png, float(d)
    except ValueError:
        return png, 0.0


def _dhash(img) -> int:
    g = img.convert("L").resize((9, 8))
    px = list(g.getdata())
    return sum(1 << i for i in range(64) if px[(i // 8) * 9 + i % 8] > px[(i // 8) * 9 + i % 8 + 1])


def measure(path: Path, frame: Callable[[Path], tuple[bytes, float]] = video_frame) -> Item:
    from PIL import Image, ImageFilter, ImageStat
    kind = "video" if path.suffix.lower() in VIDEO else "image"
    it = Item(path, kind, sha=hashlib.sha256(path.read_bytes()).hexdigest())
    try:
        if kind == "video":
            png, it.seconds = frame(path)
            img = Image.open(io.BytesIO(png))
        else:
            img = Image.open(path)
        img.load()
    except Exception:  # noqa: BLE001 - broken or unsupported file
        it.reasons.append("unreadable")
        return it
    it.w, it.h = img.size
    small = img.convert("L").resize((256, max(1, round(256 * it.h / max(it.w, 1)))))
    it.sharp = ImageStat.Stat(small.filter(ImageFilter.FIND_EDGES)).var[0]
    it.std = ImageStat.Stat(small).stddev[0]
    it.dhash = _dhash(img)
    return it


def _score(it: Item) -> tuple:
    return (it.kind == "video", it.w * it.h, it.sharp)  # motion first, then size, then sharpness


def judge(items: list[Item]) -> list[Item]:
    """Fill `reasons` (empty = keep). Pure, so it is tested without real media."""
    ok = [i for i in items if not i.reasons]
    sharp = sorted(i.sharp for i in ok if i.kind == "image")
    median = sharp[len(sharp) // 2] if sharp else 0
    for i in ok:
        if min(i.w, i.h) < (MIN_VIDEO_SIDE if i.kind == "video" else MIN_SIDE):
            i.reasons.append(f"small {i.w}x{i.h}")
        if i.std < BLANK_STD:
            i.reasons.append("blank")
        if i.kind == "video" and i.seconds < MIN_VIDEO_S:
            i.reasons.append(f"short {i.seconds:.1f}s")
        if i.kind == "image" and median and i.sharp < BLUR_RATIO * median:
            i.reasons.append("blurry")
    left = [i for i in ok if not i.reasons]
    for i in sorted(left, key=_score, reverse=True):  # the best of every look-alike group comes first and stays
        if i.reasons:
            continue
        for j in left:
            if j is not i and not j.reasons and (j.sha == i.sha or bin(i.dhash ^ j.dhash).count("1") <= SIMILAR):
                j.reasons.append(("same file as " if j.sha == i.sha else "looks like ") + i.path.name)
    return items


def files(drop: Path) -> list[Path]:
    return sorted(p for p in drop.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE | VIDEO
                  and UNUSED not in p.relative_to(drop).parts)


def clean(drop: Path, apply: bool = False, frame=video_frame, log=print) -> list[Item]:
    items = judge([measure(p, frame) for p in files(drop)])
    gone = [i for i in items if i.reasons]
    for i in gone:
        log(f"  {'moved' if apply else 'would move'}: {i.path.relative_to(drop).as_posix()} ({'; '.join(i.reasons)})")
    log(f"  {len(items) - len(gone)} kept, {len(gone)} {'moved to' if apply else 'for'} drop/{UNUSED}/ "
        f"(of {len(items)} images / videos)")
    if apply and gone:
        for i in gone:
            dest = drop / UNUSED / i.path.relative_to(drop)
            dest.parent.mkdir(parents=True, exist_ok=True)
            i.path.replace(dest)
        md = drop.parent / "project.md"
        with open(md, "a", encoding="utf-8") as f:
            f.write(f"- {datetime.now():%Y-%m-%d %H:%M} clean: {len(gone)} look-alike / poor file(s) moved to drop/{UNUSED}/\n")
    return items
