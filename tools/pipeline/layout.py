"""Layout check of a built scene: `hyperframes inspect` (headless Chrome, ~8 s a scene) samples the
timeline and reports text hidden under an image / overlay, text clipped by its box or the frame.
Results are cached next to the build (.layout.json, by the render key): only changed scenes run again."""
import json
import subprocess
from pathlib import Path

from .render import HF_BIN

SAMPLES = 4
WHAT = {"text_occluded": "text hidden under an image", "text_overflow": "text clipped by its box",
        "container_overflow": "content spills out of its box", "offscreen": "text outside the frame"}
# text_box_overflow compares the font's line box, not the glyph ink: Telugu fonts (Hind Guntur ~1.9 em)
# always "overflow" captions and labels by ~0.3 em. Ink centring is done by studio.js centreInk instead.
IGNORE = {"text_box_overflow"}


def summarize(report: dict) -> list[str]:
    """inspect --json report -> one short line per problem (info-level notes dropped, repeats merged)."""
    out = []
    for i in report.get("issues", []):
        if i.get("severity") == "info" or i.get("code") in IGNORE:
            continue
        what = WHAT.get(i.get("code", ""), str(i.get("code", "layout issue")).replace("_", " "))
        text = " ".join(str(i.get("text", "")).split())[:30]
        out.append(f"layout: {what}" + (f" '{text}'" if text else "") + f" at {float(i.get('time', 0)):.1f} s")
    return list(dict.fromkeys(out))


def check(scene_dir: Path, key: str) -> list[str]:
    cache = scene_dir / ".layout.json"
    if cache.exists():
        c = json.loads(cache.read_text("utf-8"))
        if c.get("key") == key:
            return c["warnings"]
    p = subprocess.run(["node", str(HF_BIN), "inspect", str(scene_dir), "--json", "--samples", str(SAMPLES)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180)
    try:
        report = json.loads(p.stdout[p.stdout.index("{"):])
    except ValueError:  # not cached: the next preview tries again
        return [f"layout check failed: {(p.stderr or p.stdout).strip()[-200:]}"]
    warnings = summarize(report)
    cache.write_text(json.dumps({"key": key, "warnings": warnings}, ensure_ascii=False), "utf-8")
    return warnings
