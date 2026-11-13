"""Colour correction toward the palette (grade.py)."""
import subprocess

import numpy as np
from PIL import Image

from pipeline import grade

PAL = {"background": "#0A0E17", "secondary": "#16223A", "accent": "#FFB21A", "text": "#EAF2FF"}


def test_image_moves_toward_the_palette(tmp_path):
    src, dst = tmp_path / "a.jpg", tmp_path / "b.jpg"
    ramp = np.tile(np.linspace(0, 255, 256, dtype=np.uint8), (64, 1))
    Image.fromarray(np.stack([ramp] * 3, -1)).save(src, quality=95)       # neutral grey ramp
    grade.grade_image(src, dst, PAL)
    out = np.asarray(Image.open(dst), dtype=np.float32)
    dark, bright = out[:, 20:60].mean((0, 1)), out[:, 200:240].mean((0, 1))
    assert dark[2] > dark[0]          # shadows lean to the navy secondary
    assert bright[0] > bright[2]      # highlights lean to the amber accent
    assert Image.open(dst).size == (256, 64)


def test_exposure_is_pulled_to_one_target():
    lo, hi = grade.params(PAL, 0.1)["gamma"], grade.params(PAL, 0.8)["gamma"]
    assert lo > 1 > hi                # a dark picture is lifted, a bright one lowered


def test_cutout_keeps_alpha(tmp_path):
    src, dst = tmp_path / "c.png", tmp_path / "d.png"
    im = Image.new("RGBA", (8, 8), (200, 150, 120, 0)); im.putpixel((4, 4), (200, 150, 120, 255)); im.save(src)
    grade.grade_image(src, dst, PAL)
    assert np.array_equal(np.asarray(Image.open(dst))[..., 3], np.asarray(im)[..., 3])


def test_clip_is_graded_and_cached(tmp_path, monkeypatch):
    monkeypatch.setattr(grade, "CACHE_DIR", tmp_path / "cache")
    src = tmp_path / "c.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=64x36:rate=10:duration=0.3",
                    "-pix_fmt", "yuv420p", str(src)], check=True)
    out = grade.graded(src, PAL)
    assert out.suffix == ".mp4" and out.stat().st_size > 0
    assert grade.graded(src, PAL) == out and len(list((tmp_path / "cache").iterdir())) == 1


def test_svg_is_not_graded(tmp_path):
    """SVG logos (CSS masks in written scenes) cannot be opened by PIL: graded() returns them unchanged."""
    from pipeline import grade
    svg = tmp_path / "logo.svg"
    svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>', "utf-8")
    assert grade.graded(svg, {"primary": "#6EF0B5"}) == svg
