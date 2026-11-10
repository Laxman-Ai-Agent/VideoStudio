r"""voice: the user's approved studio chain for narration audio (2026-11-10, "ai doctor").

    voice.cmd "C:/Users/me/Downloads/audio.mp3"                 -> audio_1.10x.mp3, audio_1.15x.mp3, audio_1.20x.mp3 (same folder)
    voice.cmd "C:/Users/me/Downloads/audio.mp3" --speeds 1.15   -> one file

Chain: atempo (Rubberband sounded bad), 55 Hz low cut, light FFT denoise, strong bass (+7 dB at 120 Hz),
warmth (+1.5 dB at 250 Hz), clarity (+2.5 dB at 4 kHz), de-esser, 3:1 compressor, two-pass loudnorm to
-14 LUFS / -1.5 dBTP, MP3 192k. The original is only read, never changed.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

CHAIN = ("highpass=f=55,afftdn=nr=10:nf=-30:tn=1,bass=g=7:f=120:w=0.8,equalizer=f=250:t=q:w=1.2:g=1.5,"
         "equalizer=f=4000:t=q:w=1:g=2.5,deesser=i=0.4:m=0.5:f=0.5,"
         "acompressor=threshold=-20dB:ratio=3:attack=10:release=150:makeup=2")
LOUD = "loudnorm=I=-14:TP=-1.5:LRA=11"


def chain(speed: float) -> str:
    return (f"atempo={speed}," if abs(speed - 1) > 1e-6 else "") + CHAIN


def out_name(src: Path, speed: float) -> Path:
    return src.with_name(f"{src.stem}_{speed:.2f}x.mp3")


def convert(src: Path, speed: float) -> Path:
    if not 0.5 <= speed <= 2.0:
        raise ValueError(f"speed {speed} outside atempo's single-stage range 0.5-2.0")
    af = chain(speed)
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af", f"{af},{LOUD}:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    t = p.stderr
    m = json.JSONDecoder().raw_decode(t[t.rindex("{\n"):])[0]
    meas = (f"measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
            f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    out = out_name(src, speed)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", f"{af},{LOUD}:{meas},aresample=44100",
                    "-c:a", "libmp3lame", "-b:a", "192k", str(out)], check=True)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio", type=Path)
    ap.add_argument("--speeds", type=float, nargs="+", default=[1.10, 1.15, 1.20])
    a = ap.parse_args()
    if not a.audio.is_file():
        print(f"not found: {a.audio}")
        return 1
    for s in a.speeds:
        print(f"  {s:.2f}x -> {convert(a.audio, s)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
