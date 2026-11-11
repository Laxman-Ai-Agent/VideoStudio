"""shots stage: long videos in assets/originals/raw_footage are cut at scene changes (FFmpeg `select=scene`)
into assets/shots/<stem>_NNN.mp4. Each shot is then indexed, described (contact sheet) and matched
like any short clip. The original file is never touched."""
import re
import subprocess
from pathlib import Path

from .assets import probe
from .ingest import VIDEO

SCENE_TH = 0.3   # FFmpeg scene score that counts as a cut
MIN_SHOT = 1.5   # shorter shots are merged into the previous one (flashes, fades)
MAX_SHOT = 20.0  # longer shots are split into equal parts, so matching stays specific


def cut_times(video: Path) -> list[float]:
    """Scene-change timestamps. The video is scaled down first, so detection stays fast on CPU."""
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video), "-an", "-vf",
                        f"scale=320:-2,select='gt(scene\\,{SCENE_TH})',showinfo", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode:
        raise RuntimeError(f"scene detect failed: {p.stderr.strip()[-300:]}")
    return [float(t) for t in re.findall(r"pts_time:([\d.]+)", p.stderr)]


def spans(cuts: list[float], duration: float) -> list[tuple[float, float]]:
    """Cut times -> (start, end) shots: short ones merged backwards, long ones split evenly."""
    out: list[list[float]] = []
    for a, b in zip([0.0] + cuts, cuts + [duration]):
        if b - a <= 0:
            continue
        if out and b - a < MIN_SHOT:
            out[-1][1] = b
        else:
            out.append([a, b])
    if len(out) > 1 and out[0][1] - out[0][0] < MIN_SHOT:  # a short first shot joins the next one
        out[1][0] = out[0][0]
        out.pop(0)
    res = []
    for a, b in out:
        n = int(max(1, -(-(b - a) // MAX_SHOT)))
        step = (b - a) / n
        res += [(round(a + i * step, 3), round(a + (i + 1) * step, 3)) for i in range(n)]
    return res


def cut(video: Path, out_dir: Path) -> list[Path]:
    """Re-encoded (frame-accurate) shots without audio; old shots of this source are replaced."""
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob(f"{video.stem}_[0-9][0-9][0-9].mp4"):
        old.unlink()
    files = []
    for i, (a, b) in enumerate(spans(cut_times(video), probe(video).get("duration", 0.0)), 1):
        dest = out_dir / f"{video.stem}_{i:03d}.mp4"
        p = subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{a}", "-i", str(video), "-t", f"{b - a:.3f}",
                            "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
                            str(dest)], capture_output=True, text=True, encoding="utf-8", errors="replace")
        if p.returncode:
            raise RuntimeError(f"cutting {video.name} shot {i} failed: {p.stderr.strip()[-300:]}")
        files.append(dest)
    return files


def raw_files(assets_dir: Path) -> list[Path]:
    d = assets_dir / "originals" / "raw_footage"
    return sorted(f for f in d.iterdir() if f.is_file() and f.suffix.lower() in VIDEO) if d.is_dir() else []
