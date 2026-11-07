"""storyboard stage: scenes.json -> work/storyboard.html + work/storyboard.png (approval gate).

Text-only for now (Phase 2 adds asset thumbnails). Drawn as HTML and screenshotted by the
system Chrome, because Pillow on Windows has no raqm and breaks Telugu conjuncts.
"""
import html
import json
import subprocess
from pathlib import Path

from .config import BRAND, CACHE
from .contracts import ScenePlan
from .doctor import CHROME_PATHS

COLS, CARD_H, HEAD_H, WIDTH = 3, 330, 110, 1920


def build_html(plan: ScenePlan, title: str, brand: dict) -> str:
    c = brand.get("colors", {})
    bg, accent, fg = c.get("background", "#111"), c.get("accent", "#FFC400"), c.get("text", "#FFF")
    f = brand.get("fonts", {})
    font = f"'{f.get('latin', 'Inter')}', '{f.get('telugu', 'Noto Sans Telugu')}', 'Nirmala UI', sans-serif"
    e = html.escape
    cards = "".join(f"""
<div class="card"><div class="top"><b>#{s.id}</b><span>{s.start:.1f}–{s.end:.1f}s ·
 {s.end - s.start:.1f}s</span><i>{e(s.visual_type)}</i></div>
<div class="ost">{e(s.on_screen_text) or '&nbsp;'}</div>
<div class="q">{e(s.query)}{' · <u>' + e(s.asset) + '</u>' if s.asset else ''}</div>
<div class="n">{e(s.narration)}</div></div>""" for s in plan.scenes)
    return f"""<!doctype html><meta charset="utf-8"><style>
body{{margin:0;padding:24px;background:{bg};color:{fg};font-family:{font};width:{WIDTH - 48}px}}
h1{{margin:0 0 20px;font-size:40px}} h1 span{{color:{accent};font-size:24px;margin-left:16px}}
.grid{{display:grid;grid-template-columns:repeat({COLS},1fr);gap:20px}}
.card{{height:{CARD_H - 50}px;border:2px solid #333;border-radius:12px;padding:16px;overflow:hidden;box-sizing:border-box}}
.top{{display:flex;gap:14px;font-size:20px;align-items:baseline}} .top b{{color:{accent};font-size:28px}}
.top i{{margin-left:auto;background:{accent};color:{bg};padding:2px 10px;border-radius:6px;font-style:normal}}
.ost{{font-size:38px;font-weight:700;margin:12px 0;color:{accent}}}
.q{{font-size:18px;opacity:.85}} .n{{font-size:20px;margin-top:10px;opacity:.7}}
</style><h1>{e(title)}<span>{len(plan.scenes)} scenes · {plan.scenes[-1].end:.1f}s</span></h1>
<div class="grid">{cards}</div>"""


def render(plan: ScenePlan, title: str, html_out: Path, png_out: Path) -> None:
    brand_file = BRAND / "brand.json"
    brand = json.loads(brand_file.read_text("utf-8")) if brand_file.exists() else {}
    html_out.write_text(build_html(plan, title, brand), encoding="utf-8")
    chrome = next((p for p in CHROME_PATHS if p.exists()), None)
    if not chrome:
        raise FileNotFoundError("Chrome not found (studio doctor)")
    rows = -(-len(plan.scenes) // COLS)
    subprocess.run([str(chrome), "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    f"--user-data-dir={CACHE / 'chrome-storyboard'}",
                    f"--window-size={WIDTH},{HEAD_H + rows * CARD_H}",
                    f"--screenshot={png_out}", html_out.resolve().as_uri()],
                   check=True, capture_output=True, timeout=120)
    if not png_out.exists():
        raise RuntimeError("Chrome did not write the storyboard screenshot")
