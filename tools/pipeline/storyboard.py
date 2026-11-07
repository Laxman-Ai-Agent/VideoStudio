"""storyboard stage: scenes.json -> work/storyboard.html + work/storyboard.png (approval gate).

With work/resolved.json each card shows the chosen asset's thumbnail, or a MISSING / TEMPLATE tile.
Drawn as HTML and screenshotted by the system Chrome, because Pillow on Windows has no raqm and
breaks Telugu conjuncts.
"""
import html
import json
from pathlib import Path

from .chrome import screenshot
from .config import BRAND, ROOT
from .contracts import Resolved, ScenePlan

COLS, CARD_H, HEAD_H, WIDTH, THUMB_H = 3, 330, 110, 1920, 300


def _tile(r, root: Path, e) -> str:
    if r is None:
        return ""
    if r.thumb:
        return f'<div class="th"><img src="{(root / r.thumb).resolve().as_uri()}"><em>{e(r.status)}</em></div>'
    label = {"missing": "MISSING", "template": "TEMPLATE"}.get(r.status, r.status.upper())
    return f'<div class="th {r.status}"><span>{label}</span><em>{e(r.asset or "")}</em></div>'


def build_html(plan: ScenePlan, title: str, brand: dict, resolved: Resolved | None = None,
               root: Path = ROOT) -> str:
    c = brand.get("colors", {})
    bg, accent, fg = c.get("background", "#111"), c.get("accent", "#FFC400"), c.get("text", "#FFF")
    f = brand.get("fonts", {})
    font = f"'{f.get('latin', 'Inter')}', '{f.get('telugu', 'Noto Sans Telugu')}', 'Nirmala UI', sans-serif"
    e = html.escape
    res = {r.id: r for r in resolved.scenes} if resolved else {}
    card_h = CARD_H + (THUMB_H if resolved else 0)
    cards = "".join(f"""
<div class="card">{_tile(res.get(s.id), root, e)}<div class="top"><b>#{s.id}</b><span>{s.start:.1f}–{s.end:.1f}s ·
 {s.end - s.start:.1f}s</span><i>{e(s.visual_type)}</i></div>
<div class="ost">{e(s.on_screen_text) or '&nbsp;'}</div>
<div class="q">{e(s.query)}{' · <u>' + e(s.asset) + '</u>' if s.asset else ''}</div>
<div class="n">{e(s.narration)}</div></div>""" for s in plan.scenes)
    return f"""<!doctype html><meta charset="utf-8"><style>
body{{margin:0;padding:24px;background:{bg};color:{fg};font-family:{font};width:{WIDTH - 48}px}}
h1{{margin:0 0 20px;font-size:40px}} h1 span{{color:{accent};font-size:24px;margin-left:16px}}
.grid{{display:grid;grid-template-columns:repeat({COLS},1fr);gap:20px}}
.card{{height:{card_h - 50}px;border:2px solid #333;border-radius:12px;padding:16px;overflow:hidden;box-sizing:border-box}}
.top{{display:flex;gap:14px;font-size:20px;align-items:baseline}} .top b{{color:{accent};font-size:28px}}
.top i{{margin-left:auto;background:{accent};color:{bg};padding:2px 10px;border-radius:6px;font-style:normal}}
.ost{{font-size:38px;font-weight:700;margin:12px 0;color:{accent}}}
.q{{font-size:18px;opacity:.85}}
.th{{height:{THUMB_H - 20}px;margin:-16px -16px 12px;background:#000;position:relative;display:flex;align-items:center;justify-content:center}}
.th img{{width:100%;height:100%;object-fit:contain}} .th span{{font-size:44px;font-weight:800;letter-spacing:4px}}
.th em{{position:absolute;left:8px;bottom:6px;font-size:16px;background:#0009;padding:2px 8px;border-radius:4px}}
.missing{{background:repeating-linear-gradient(45deg,#3a0d0d,#3a0d0d 20px,#2a0808 20px,#2a0808 40px);color:#ff6b6b}}
.template{{background:#1b1b22;color:{accent}}} .n{{font-size:20px;margin-top:10px;opacity:.7}}
</style><h1>{e(title)}<span>{len(plan.scenes)} scenes · {plan.scenes[-1].end:.1f}s</span></h1>
<div class="grid">{cards}</div>"""


def render(plan: ScenePlan, title: str, html_out: Path, png_out: Path,
           resolved: Resolved | None = None) -> None:
    brand_file = BRAND / "brand.json"
    brand = json.loads(brand_file.read_text("utf-8")) if brand_file.exists() else {}
    html_out.write_text(build_html(plan, title, brand, resolved), encoding="utf-8")
    rows = -(-len(plan.scenes) // COLS)
    screenshot(html_out, png_out, WIDTH, HEAD_H + rows * (CARD_H + (THUMB_H if resolved else 0)))
