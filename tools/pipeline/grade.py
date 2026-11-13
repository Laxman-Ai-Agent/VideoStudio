"""Colour correction: every picture / clip a written scene shows is graded toward the video palette
(motion.md "Visual identity": brightness, contrast, saturation, temperature and tone matched to the palette,
consistent between scenes, nothing looking pasted-in). Pillow + numpy for stills, ffmpeg for clips; no new library.

Grade = exposure pulled toward one target (same for every asset of a video) + gentle S-curve + split toning
(shadows toward the palette's secondary / background hue, highlights toward the accent) + a small saturation trim.
Results are cached by source hash + palette + GRADE_VERSION in tools/.cache/graded (never next to the user's media).
"""
import hashlib
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

from .config import CACHE

GRADE_VERSION = 1
CACHE_DIR = CACHE / "graded"
VIDEO = {".mp4", ".mov", ".webm", ".mkv"}


def _rgb(hex_: str) -> np.ndarray:
    h = hex_.lstrip("#")[:6]
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


def _luma(a: np.ndarray) -> np.ndarray:
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def params(colors: dict, mean_luma: float) -> dict:
    """Grade settings for one asset from the palette roles and the asset's own mean brightness."""
    bg = _rgb(colors.get("background", "#101010"))
    dark = float(_luma(bg)) < 0.5
    target = 0.36 if dark else 0.52                      # one exposure for the whole video
    gamma = float(np.clip(np.log(np.clip(mean_luma, 0.03, 0.97)) / np.log(target), 0.75, 1.35))  # out = in ** (1 / gamma)
    gamma = 1 + (gamma - 1) * 0.6                        # pull toward the target, never flatten everything
    sh = _rgb(colors.get("secondary") or colors.get("primary") or colors.get("background", "#101010"))
    hi = _rgb(colors.get("accent", "#FFFFFF"))
    tint = lambda c: c - float(_luma(c))                 # hue only: the shift never changes brightness
    return {"gamma": gamma, "shadow": tint(sh) * 0.22, "high": tint(hi) * 0.10, "sat": 0.9 if dark else 0.95}


def grade_array(a: np.ndarray, p: dict) -> np.ndarray:
    """a: float RGB 0-1 (H, W, 3) -> graded copy."""
    a = np.clip(a, 0, 1) ** (1 / p["gamma"])
    a = a + (a - a * a) * (a - 0.5) * 0.35                               # gentle S-curve (contrast)
    l = _luma(a)[..., None]
    a = a + ((1 - l) ** 2) * p["shadow"] + (l ** 2) * p["high"]          # split toning
    l = _luma(a)[..., None]
    return np.clip(l + (a - l) * p["sat"], 0, 1)


def grade_image(src: Path, dst: Path, colors: dict) -> Path:
    im = Image.open(src)
    alpha = im.getchannel("A") if im.mode in ("RGBA", "LA") or "transparency" in im.info else None
    a = np.asarray(im.convert("RGB"), dtype=np.float32) / 255
    w = a if alpha is None else a[np.asarray(alpha) > 16]                # a cut-out: measure the subject only
    out = Image.fromarray((grade_array(a, params(colors, float(_luma(w).mean()) if w.size else 0.4)) * 255 + 0.5).astype(np.uint8))
    if alpha is not None:
        out.putalpha(alpha)
    out.save(dst, **({"quality": 92} if dst.suffix.lower() in (".jpg", ".jpeg") else {}))
    return dst


def _clip_filter(p: dict) -> str:
    s, h = p["shadow"], p["high"]
    cb = "colorbalance=" + ":".join(f"{c}{z}={v * 1.6:.3f}" for z, vec in (("s", s), ("h", h)) for c, v in zip("rgb", vec))
    return f"eq=gamma={p['gamma']:.3f}:contrast=1.06:saturation={p['sat']:.2f},{cb}"


def grade_clip(src: Path, dst: Path, colors: dict) -> Path:
    frame = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-vf", "scale=64:-2", "-frames:v", "1",
                            "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    mean = float(_luma(np.frombuffer(frame, np.uint8).reshape(-1, 3).astype(np.float32) / 255).mean()) if frame else 0.4
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-vf", _clip_filter(params(colors, mean)), "-an",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", str(dst)], check=True)
    return dst


def graded(src: Path, colors: dict) -> Path:
    """Cached graded copy of src (image or clip) for this palette. SVG (logos, drawn as masks) is returned as is."""
    if src.suffix.lower() == ".svg":
        return src
    key = hashlib.sha256(src.read_bytes() + repr(sorted(colors.items())).encode() + str(GRADE_VERSION).encode()).hexdigest()[:16]
    ext = ".mp4" if src.suffix.lower() in VIDEO else (".png" if src.suffix.lower() in (".png", ".webp") else ".jpg")
    dst = CACHE_DIR / f"{src.stem[:40]}_{key}{ext}"
    if not dst.exists():
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        tmp = dst.with_name("tmp_" + dst.name)
        (grade_clip if ext == ".mp4" else grade_image)(src, tmp, colors)
        tmp.replace(dst)
    return dst
