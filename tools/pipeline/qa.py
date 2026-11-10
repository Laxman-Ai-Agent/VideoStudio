"""qa stage: loudness, true peak, black/frozen frames, length vs narration, scene clips present, plus the
look checks from identity.py (distinct from earlier videos, no repeated visual type / transition runs).
Writes work/qa.json; studio exports to output/ (final only when every check passed)."""
import re
import subprocess
from pathlib import Path

from .assemble import LUFS, measure
from .contracts import QACheck, QAFile

LUFS_TOL, PEAK_MAX, SYNC_TOL = 1.0, -1.0, 0.1
BLACK = "blackdetect=d=1.0:pix_th=0.03"   # brand background #0E0E10 must not count as black
FREEZE = "freezedetect=n=-60dB:d=5"       # 5 s without any change (captions keep moving otherwise)


def duration(f: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                         capture_output=True, text=True).stdout.strip()
    return float(out) if out else 0.0


def video_events(f: Path) -> tuple[list[str], list[str]]:
    """One decode pass -> (black spans 'start+duration', frozen spans 'from start')."""
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(f), "-an", "-vf", f"{BLACK},{FREEZE}",
                        "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    black = [f"{a}s+{b}s" for a, b in re.findall(r"black_start:([\d.]+).*?black_duration:([\d.]+)", p.stderr)]
    # a freeze that lasts to the end has no freeze_duration line, so starts are what count
    freeze = [f"from {a}s" for a in re.findall(r"freeze_start: ([\d.]+)", p.stderr)]
    return black, freeze


def check(video: Path, narration: Path, clips: list[Path], placeholders: list[int], final: bool,
          rel_to: Path, extra: tuple[QACheck, ...] = ()) -> QAFile:
    """extra: video-level checks computed once by studio (identity, variety, see identity.py)."""
    c = []
    m = measure(video)
    i, tp = float(m["input_i"]), float(m["input_tp"])
    c.append(QACheck(name="loudness", status="ok" if abs(i - LUFS) <= LUFS_TOL else "fail",
                     detail=f"{i:.1f} LUFS (target {LUFS:.0f} ±{LUFS_TOL:.0f})"))
    c.append(QACheck(name="true_peak", status="ok" if tp <= PEAK_MAX else "fail", detail=f"{tp:.1f} dBTP (max {PEAK_MAX})"))
    black, freeze = video_events(video)
    c.append(QACheck(name="black", status="fail" if black else "ok", detail=", ".join(black) or "none >= 1 s"))
    c.append(QACheck(name="freeze", status="fail" if freeze else "ok", detail=", ".join(freeze) or "none >= 5 s"))
    dv, da = duration(video), duration(narration)
    c.append(QACheck(name="duration", status="ok" if abs(dv - da) <= SYNC_TOL else "fail",
                     detail=f"video {dv:.2f} s, narration {da:.2f} s (±{SYNC_TOL})"))
    gone = [x.name for x in clips if not x.exists()]
    c.append(QACheck(name="clips", status="fail" if gone else "ok", detail=f"missing: {gone}" if gone else f"{len(clips)} present"))
    c.append(QACheck(name="placeholders", status=("fail" if final else "warn") if placeholders else "ok",
                     detail=f"scenes {placeholders} are MISSING/failed tiles" if placeholders else "none"))
    c.extend(extra)
    return QAFile(file=video.relative_to(rel_to).as_posix(), passed=all(x.status != "fail" for x in c), checks=c)
