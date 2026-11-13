"""assemble stage: concat scene clips + narration (+ ducked music + transition SFX), two-pass
loudnorm of the final mix to -14 LUFS."""
import json
import math
import re
import subprocess
from pathlib import Path

from .project import atomic_write

LUFS, TRUE_PEAK, LRA = -14.0, -1.5, 11.0
# linear loudnorm cannot limit and AAC adds overshoot (05 final measured -0.9 dBTP vs QA max -1.0):
# a brick-wall limiter at -2 dBFS after loudnorm keeps the encoded true peak under the QA limit
PEAK_GUARD = "alimiter=limit=0.794:level=false"
MUSIC_UNDER, SFX_UNDER = 18.0, 10.0  # LU below the narration before ducking
AUDIO_EXT = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}
SFX_LEAD = 0.15  # a whoosh starts slightly before the cut
GRAPHIC = {"headline", "chart"}  # cuts into these get a whoosh unless the scene says otherwise


def _loudnorm_json(args: list[str]) -> dict:
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *args, "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr)
    if not m:
        raise RuntimeError(f"loudnorm measure failed: {p.stderr[-300:]}")
    return json.loads(m.group(0))


def _probe_json() -> str:
    return f"loudnorm=I={LUFS}:TP={TRUE_PEAK}:LRA={LRA}:print_format=json"


def measure(audio: Path) -> dict:
    """loudnorm pass 1 on one file (audio only, fast)."""
    return _loudnorm_json(["-i", str(audio), "-af", _probe_json()])


def loudness(audio: Path) -> float | None:
    """Integrated LUFS, None when too short/quiet to gate (e.g. a 0.3 s click)."""
    v = float(measure(audio)["input_i"])
    return v if math.isfinite(v) and v > -70 else None


def loudnorm_filter(m: dict) -> str:
    return (f"loudnorm=I={LUFS}:TP={TRUE_PEAK}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
            f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}"
            ":linear=true")


def pick_music(library: Path, mood: str) -> Path | None:
    """First audio file (by name) in _library/music/<mood>/. No mood/folder/file = no music."""
    d = library / "music" / mood
    if not mood or not d.is_dir():
        return None
    return next((f for f in sorted(d.iterdir()) if f.suffix.lower() in AUDIO_EXT), None)


def sfx_cues(scenes: list[tuple[int, float, str, dict]], library: Path) -> list[tuple[float, Path]]:
    """(id, start, template, params) per scene -> [(time, file)]. Cuts into a graphic scene or with a
    wipe/zoom transition (params.transition, filled in by studio) get a
    whoosh; `params.sfx` = "whoosh" | "click" | "none" overrides. Missing sfx folders = no sfx."""
    cues = []
    for sid, start, template, params in scenes[1:]:
        kind = params.get("sfx") or ("whoosh" if template in GRAPHIC or params.get("transition") in ("wipe", "zoom") else "none")
        d = library / "sfx" / kind
        files = sorted(f for f in d.iterdir() if f.suffix.lower() in AUDIO_EXT) if d.is_dir() else []
        if kind != "none" and files:
            cues.append((max(0.0, start - (SFX_LEAD if kind == "whoosh" else 0)), files[sid % len(files)]))
    return cues


def _gain(target: float, f: Path) -> float:
    lf = loudness(f)
    return round(target - lf, 2) if lf is not None else -12.0


def mix_graph(narration_lufs: float | None, length: float, music: Path | None,
              sfx: list[tuple[float, Path]]) -> tuple[list[str], str]:
    """Extra ffmpeg inputs (after 0 = video, 1 = narration) and a filter graph ending in [mix]."""
    base = narration_lufs if narration_lufs is not None else LUFS
    inputs, parts, mixin = [], [], ["[nar]"]
    parts.append("[1:a]aresample=48000,asplit=2[nar][key]" if music else "[1:a]aresample=48000[nar]")
    if music:
        inputs += ["-stream_loop", "-1", "-i", str(music)]
        fade = max(0.0, length - 2)
        parts.append(f"[2:a]aresample=48000,atrim=0:{length:.3f},volume={_gain(base - MUSIC_UNDER, music)}dB,"
                     f"afade=t=in:d=1,afade=t=out:st={fade:.3f}:d=2[m0]")
        parts.append("[m0][key]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[mus]")
        mixin.append("[mus]")
    first = 2 + (1 if music else 0)
    for i, (t, f) in enumerate(sfx):
        inputs += ["-i", str(f)]
        parts.append(f"[{first + i}:a]aresample=48000,volume={_gain(base - SFX_UNDER, f)}dB,"
                     f"adelay={int(t * 1000)}:all=1[s{i}]")
        mixin.append(f"[s{i}]")
    if len(mixin) > 1:
        parts.append("".join(mixin) + f"amix=inputs={len(mixin)}:duration=longest:normalize=0[mx]")
    else:
        parts.append("[nar]anull[mx]")
    parts.append(f"[mx]apad,atrim=0:{length:.3f}[mix]")
    return inputs, ";".join(parts)


def assemble(clips: list[Path], audio: Path, out: Path, fps: int, frames: int,
             music: Path | None = None, sfx: list[tuple[float, Path]] = ()) -> None:
    """Video = clips back to back (re-encoded once, so mixed sources can't break concat), length
    fixed to `frames`; audio = narration (+ music ducked under it + sfx), loudnorm on the mix."""
    length = frames / fps
    lst = out.with_suffix(".concat.txt")
    atomic_write(lst, "".join(f"file '{c.resolve().as_posix()}'\n" for c in clips))
    tmp = out.with_name(out.stem + ".tmp.mp4")
    extra, graph = mix_graph(loudness(audio) if (music or sfx) else None, length, music, list(sfx))
    srcs = ["-f", "concat", "-safe", "0", "-i", str(lst), "-i", str(audio), *extra]
    try:
        m = _loudnorm_json(srcs + ["-filter_complex", graph + f";[mix]{_probe_json()}[o]", "-map", "[o]"])
        p = subprocess.run(["ffmpeg", "-y", "-v", "error", *srcs, "-filter_complex",
                            graph + f";[mix]{loudnorm_filter(m)},{PEAK_GUARD},aresample=48000[a]",
                            "-map", "0:v:0", "-map", "[a]", "-frames:v", str(frames), "-r", str(fps),
                            "-t", f"{length:.4f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                            str(tmp)], capture_output=True, text=True, encoding="utf-8", errors="replace")
    finally:
        lst.unlink(missing_ok=True)
    if p.returncode:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"assemble failed: {p.stderr.strip()[-400:]}")
    tmp.replace(out)
