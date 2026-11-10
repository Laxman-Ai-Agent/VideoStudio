"""Where a big title fits on a picture: the calmest part of the frame (user 2026-11-10: "big bold words
in the empty place of the image"). Scores fixed candidate zones inside the safe area, above the caption
band, by edge detail + brightness spread of the picture as it is shown (cover crop, or contained on its
blurred copy), and returns the calmest one plus its tone so the text colour can contrast.
"""
from pathlib import Path

from PIL import Image, ImageFilter, ImageStat

GRID = 64  # analysis width in px; the frame is analysed at GRID x (GRID * h / w)
# (x, y, w, h) fractions of the frame; landscape safe area 6%/8%, captions band at the bottom
ZONES = {"landscape": {"top-left": (.06, .08, .5, .36), "top-right": (.44, .08, .5, .36), "top": (.12, .08, .76, .30),
                       "left": (.06, .14, .42, .62), "right": (.52, .14, .42, .62),
                       "top-left-narrow": (.06, .08, .34, .34), "top-right-narrow": (.60, .08, .34, .34),
                       "bottom-left": (.06, .48, .5, .32), "bottom-right": (.44, .48, .5, .32)},
         "portrait": {"top": (.07, .14, .86, .24), "upper-middle": (.07, .30, .86, .22), "lower": (.07, .52, .86, .2)}}


def shown(img: Image.Image, w: int, h: int, fit: str) -> Image.Image:
    """The picture as the template shows it, small: cover crop, or contain over its blurred cover copy."""
    gw, gh = GRID, max(8, round(GRID * h / w))
    s = max(gw / img.width, gh / img.height)
    cover = img.resize((max(gw, round(img.width * s)), max(gh, round(img.height * s))), Image.BILINEAR)
    cover = cover.crop(((cover.width - gw) // 2, (cover.height - gh) // 2, (cover.width - gw) // 2 + gw,
                        (cover.height - gh) // 2 + gh))
    if fit != "blur":
        return cover
    base = cover.filter(ImageFilter.GaussianBlur(4))
    k = min(gw / img.width, gh / img.height)
    inner = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.BILINEAR)
    base.paste(inner, ((gw - inner.width) // 2, (gh - inner.height) // 2))
    return base


def pick(asset: Path, w: int, h: int, fit: str = "cover") -> dict | None:
    """{"name", "x", "y", "w", "h" (fractions), "tone": "dark"|"light"} of the calmest zone; None if unreadable."""
    try:
        img = shown(Image.open(asset).convert("L"), w, h, fit)
    except OSError:
        return None
    edges = img.filter(ImageFilter.FIND_EDGES)
    best = None
    for name, (x, y, zw, zh) in ZONES["portrait" if h > w else "landscape"].items():
        box = (round(x * img.width), round(y * img.height), round((x + zw) * img.width), round((y + zh) * img.height))
        crop = edges.crop(box)
        # a small busy spot (a head poking into the sky) must count: mean + the busiest 4x4 block
        cells = crop.resize((max(1, crop.width // 4), max(1, crop.height // 4)), Image.BOX)
        lum = ImageStat.Stat(img.crop(box))
        score = ImageStat.Stat(crop).mean[0] + 0.5 * max(cells.getdata()) + 0.35 * lum.stddev[0]
        if best is None or score < best[0]:
            best = (score, name, (x, y, zw, zh), lum.mean[0])
    _, name, (x, y, zw, zh), mean = best
    return {"name": name, "x": x, "y": y, "w": zw, "h": zh, "tone": "light" if mean > 150 else "dark"}
