"""Brand fonts for scene builds: @font-face rules for _brand/fonts/<Family>/*.ttf (moved from render.py)."""
import shutil
from pathlib import Path

from .config import BRAND

FONTS = BRAND / "fonts"  # _brand/fonts/<Family>/*.ttf (Google Fonts, OFL), loaded by @font-face
WEIGHTS = {"thin": 100, "extralight": 200, "light": 300, "regular": 400, "medium": 500, "semibold": 600,
           "bold": 700, "extrabold": 800, "black": 900}


def font_css(families, dest: Path, fonts_dir: Path = FONTS) -> str:
    """@font-face rules for brand fonts saved in _brand/fonts/<Family>/*.ttf (copied into dest).
    A variable font or a single-file family covers every weight, so templates asking for 800/900
    get the real glyphs, not a synthetic bold. A family without a folder falls back to system fonts."""
    css = []
    for fam in dict.fromkeys(families):
        files = [f for f in sorted((fonts_dir / fam).glob("*.ttf")) if "italic" not in f.name.lower()] if fam else []
        for f in files:
            style = f.stem.rsplit("-", 1)[-1].lower()
            w = "100 900" if "[" in f.name or len(files) == 1 else WEIGHTS.get(style, 400)
            name = f"font{len(css)}.ttf"
            shutil.copy2(f, dest / name)
            css.append(f'@font-face {{ font-family: "{fam}"; src: url("{name}"); font-weight: {w}; }}')
    return "\n".join(css)
