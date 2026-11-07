"""assemble stage: concat scene clips + narration, loudness to -14 LUFS (two-pass loudnorm)."""
import json
import re
import subprocess
from pathlib import Path

from .project import atomic_write

LUFS, TRUE_PEAK, LRA = -14.0, -1.5, 11.0


def measure(audio: Path) -> dict:
    """loudnorm pass 1 on the narration alone (audio only, fast)."""
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(audio), "-af",
                        f"loudnorm=I={LUFS}:TP={TRUE_PEAK}:LRA={LRA}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr)
    if not m:
        raise RuntimeError(f"loudnorm measure failed: {p.stderr[-300:]}")
    return json.loads(m.group(0))


def loudnorm_filter(m: dict) -> str:
    return (f"loudnorm=I={LUFS}:TP={TRUE_PEAK}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
            f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}"
            ":linear=true")


def assemble(clips: list[Path], audio: Path, out: Path, fps: int, frames: int) -> None:
    """Video = clips back to back (re-encoded once, so mixed sources can't break concat), length
    fixed to `frames`; audio = narration, normalised, padded with silence if shorter."""
    lst = out.with_suffix(".concat.txt")
    atomic_write(lst, "".join(f"file '{c.resolve().as_posix()}'\n" for c in clips))
    tmp = out.with_name(out.stem + ".tmp.mp4")
    af = loudnorm_filter(measure(audio)) + ",aresample=48000,apad"
    p = subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-i", str(audio),
                        "-map", "0:v:0", "-map", "1:a:0", "-af", af, "-frames:v", str(frames), "-r", str(fps),
                        "-t", f"{frames / fps:.4f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(tmp)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    lst.unlink(missing_ok=True)
    if p.returncode:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"assemble failed: {p.stderr.strip()[-400:]}")
    tmp.replace(out)
