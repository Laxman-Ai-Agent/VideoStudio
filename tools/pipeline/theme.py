"""theme stage: one visual identity per video -> work/theme.json (reused on every run and resume).

Text colours, fonts, text panels, background colour/gradient/pattern/texture, text outline/shadow,
and the motion language (`motion`: text animation, transition set, camera move). Layouts are per scene.
Creative direction (2026-11-10): for a new video Claude writes the project theme.json (preset + overrides
+ `motion` + `direction`) so every video gets its own look; identity.py compares it with earlier videos.

Selection, first hit wins:
1. project `theme.json` with `"preset": "<name>"` (manual), plus optional overrides
   (`colors`, `fonts`, `background`, `text`), e.g. {"preset": "history", "colors": {"accent": "#C00000"}}
2. auto: keyword hits of the script + transcript + scene queries against each preset's keywords
   (English and Telugu); too few hits -> the `documentary` preset. Overrides still apply.
Presets live in tools/themes/<name>.json (add a file = add a theme).
Validation fills missing values, fixes bad colours, raises text/accent contrast, swaps unavailable
fonts for safe ones, and records every fallback in `issues`.
"""
import json
import os
import re
from collections import Counter
from pathlib import Path

from .config import BRAND, TOOLS
from .contracts import Brand, ThemeSpec

PRESETS = TOOLS / "themes"
FONTS = BRAND / "fonts"
DEFAULT_PRESET = "documentary"
MIN_HITS = 2             # fewer keyword hits than this -> DEFAULT_PRESET
SAFE_FONT = "Noto Sans Telugu"
HEX = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
CSS_COLOR = re.compile(r"^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgba?\([\d.\s,%]+\))$")
DEFAULT_COLORS = {"background": "#14161B", "text": "#F4F1EA", "text2": "#B8B3A8", "accent": "#E8B04B",
                  "highlight": "#E8B04B", "warning": "#E5484D", "panel": "rgba(20,22,27,0.84)", "capbg": "rgba(0,0,0,0.6)"}
DEFAULT_BG = {"type": "solid", "colors": [], "angle": 180, "pattern": "none", "pattern_opacity": 0.0,
              "texture": "none", "texture_opacity": 0.0}
DEFAULT_TEXT = {"heading_weight": 800, "body_weight": 600, "shadow": "none", "tracking": 0.0, "scale": 1.0,
                "outline": 0.0}  # outline: stroke width in % of the short side (0 = none), in the background colour
BG_TYPES = {"solid", "linear", "radial", "multi"}
PATTERNS = {"none", "grid", "dots", "lines"}
TEXTURES = {"none", "grain", "paper", "smoke", "particles", "stars"}
SHADOWS = {"none", "soft", "hard", "glow"}
# motion: studio.js / photo template implement each value; {} on a theme = the look before 2026-11-10
TEXT_IN = {"pop", "rise", "blur", "slide", "mask", "type", "fade"}
CAMERA = {"drift", "push", "pull", "tilt", "still"}
TRANSITIONS = {"blur", "wipe", "zoom", "circle", "slide", "dip", "flash", "cut"}
TITLE_STYLES = {"plain", "split", "italic", "shadow", "outline", "caps"}  # big titles, like type-specimen cards
CAPTION_STYLES = {"box", "marker", "underline", "pop"}  # spoken-word look; no card behind captions (2026-11-10)
CAPTION_DEFAULT = {"style": "box", "font": "body"}
MOTION_DEFAULT = {"text_in": "pop", "camera": "drift", "transitions": []}  # [] = brand.json list
SYSTEM_FONT_DIRS = [Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts",
                    Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "Windows" / "Fonts"]


def presets(folder: Path = PRESETS) -> dict[str, dict]:
    return {p.stem: json.loads(p.read_text("utf-8")) for p in sorted(folder.glob("*.json"))}


def classify(text: str, table: dict[str, dict]) -> tuple[str, dict[str, float]]:
    """Keyword hits per preset (each keyword counts at most 3 times). English keywords match whole
    words; Telugu keywords match as substrings (suffixes like -లో, -ని stay attached)."""
    low = text.lower()
    words = Counter(re.findall(r"[a-z0-9]+", low))
    scores = {}
    for name, p in table.items():
        hits = 0
        for k in (k.lower() for k in p.get("keywords", [])):
            hits += min(3, words[k] if k.isascii() else low.count(k))
        scores[name] = float(hits)
    best = max(scores, key=lambda n: scores[n], default=DEFAULT_PRESET)
    return (best if scores.get(best, 0) >= MIN_HITS else DEFAULT_PRESET), scores


def _merge(a: dict, b: dict) -> dict:
    out = dict(a)
    for k, v in b.items():
        out[k] = _merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


# ---- colour maths (WCAG relative luminance / contrast) ----

def _rgb(h: str) -> tuple[float, float, float]:
    h = h.lstrip("#")
    h = "".join(c * 2 for c in h) if len(h) == 3 else h
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def luminance(h: str) -> float:
    r, g, b = (c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in _rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def _mix(a: str, b: str, t: float) -> str:
    return "#" + "".join(f"{round((x + (y - x) * t) * 255):02X}" for x, y in zip(_rgb(a), _rgb(b)))


def readable(fg: str, bgs: list[str], min_ratio: float) -> str:
    """fg moved towards black or white just enough to reach min_ratio against every bg colour."""
    if all(contrast(fg, b) >= min_ratio for b in bgs):
        return fg
    target = "#000000" if sum(luminance(b) for b in bgs) / len(bgs) > 0.35 else "#FFFFFF"
    for i in range(1, 11):
        c = _mix(fg, target, i / 10)
        if all(contrast(c, b) >= min_ratio for b in bgs):
            return c
    return target


# ---- fonts ----

def font_available(name: str, fonts_dir: Path = FONTS) -> bool:
    if not name:
        return False
    if (fonts_dir / name).is_dir() and any((fonts_dir / name).glob("*.ttf")):
        return True
    key = re.sub(r"[^a-z0-9]", "", name.lower())
    return any(key in re.sub(r"[^a-z0-9]", "", f.stem.lower()) for d in SYSTEM_FONT_DIRS if d.is_dir() for f in d.iterdir())


def validate(spec: ThemeSpec, fonts_dir: Path = FONTS) -> ThemeSpec:
    issues: list[str] = []
    colors = {**DEFAULT_COLORS}
    for k, v in spec.colors.items():
        ok = CSS_COLOR.match(str(v)) if k in ("panel", "capbg") else HEX.match(str(v))
        if ok:
            colors[k] = v
        else:
            issues.append(f"colors.{k} {v!r} is not a valid colour -> {colors.get(k, 'dropped')}")
    bg = {**DEFAULT_BG, **spec.background}
    if bg["type"] not in BG_TYPES:
        issues.append(f"background.type {bg['type']!r} unsupported -> solid")
        bg["type"] = "solid"
    for key, allowed in (("pattern", PATTERNS), ("texture", TEXTURES)):
        if bg[key] not in allowed:
            issues.append(f"background.{key} {bg[key]!r} unsupported -> none")
            bg[key] = "none"
    bg["colors"] = [c for c in bg.get("colors", []) if HEX.match(str(c))] or [colors["background"]]
    for k in ("pattern_opacity", "texture_opacity"):
        bg[k] = min(0.8, max(0.0, float(bg.get(k) or 0)))
    bg["angle"] = int(bg.get("angle") or 180) % 360
    # readability: text on the worst background colour (gradients included)
    bgs = [colors["background"], *bg["colors"]]
    for k, ratio in (("text", 4.5), ("text2", 3.0), ("accent", 3.0)):
        fixed = readable(colors[k], bgs, ratio)
        if fixed != colors[k]:
            issues.append(f"colors.{k} {colors[k]} too low contrast on the background -> {fixed}")
            colors[k] = fixed
    text = {**DEFAULT_TEXT, **spec.text}
    for k in ("heading_weight", "body_weight"):
        text[k] = int(min(900, max(100, round(int(text[k] or 400) / 100) * 100)))
    if text["shadow"] not in SHADOWS:
        issues.append(f"text.shadow {text['shadow']!r} unsupported -> none")
        text["shadow"] = "none"
    if text.get("title_style", "plain") not in TITLE_STYLES:
        issues.append(f"text.title_style {text['title_style']!r} unsupported -> plain")
        text["title_style"] = "plain"
    text["tracking"] = min(0.2, max(-0.05, float(text["tracking"] or 0)))
    text["scale"] = min(1.5, max(0.8, float(text["scale"] or 1)))
    text["outline"] = min(0.5, max(0.0, float(text.get("outline") or 0)))
    fonts = dict(spec.fonts)
    body = fonts.get("body") if font_available(fonts.get("body", ""), fonts_dir) else SAFE_FONT
    if body != fonts.get("body"):
        issues.append(f"fonts.body {fonts.get('body')!r} not found -> {SAFE_FONT}")
    fonts["body"] = body
    for role in ("heading", "script", "hero"):  # hero = the one big word per screen (docs/STYLE.md), falls back to heading
        if not font_available(fonts.get(role, ""), fonts_dir):
            fb = fonts.get("heading", body) if role == "hero" else body
            if fonts.get(role):
                issues.append(f"fonts.{role} {fonts[role]!r} not found -> {fb}")
            fonts[role] = fb
    for role, f in fonts.items():  # every saved family is a Telugu font; others may lack Telugu glyphs
        if f != SAFE_FONT and not (fonts_dir / f).is_dir():
            issues.append(f"fonts.{role} {f!r} is not from _brand/fonts: Telugu glyphs not checked "
                          f"(Telugu text falls back to {SAFE_FONT})")
    motion = dict(spec.motion)
    for k, allowed in (("text_in", TEXT_IN), ("camera", CAMERA)):
        if k in motion and motion[k] not in allowed:
            issues.append(f"motion.{k} {motion[k]!r} unsupported -> {MOTION_DEFAULT[k]}")
            motion[k] = MOTION_DEFAULT[k]
    if "transitions" in motion:
        bad = [t for t in motion["transitions"] if t not in TRANSITIONS]
        if bad:
            issues.append(f"motion.transitions {bad} unsupported -> dropped")
        motion["transitions"] = [t for t in motion["transitions"] if t in TRANSITIONS]
    caps = {**CAPTION_DEFAULT, **spec.captions}
    for k, allowed in (("style", CAPTION_STYLES), ("font", {"body", "heading"})):
        if caps[k] not in allowed:
            issues.append(f"captions.{k} {caps[k]!r} unsupported -> {CAPTION_DEFAULT[k]}")
            caps[k] = CAPTION_DEFAULT[k]
    return spec.model_copy(update={"colors": colors, "background": bg, "text": text, "fonts": fonts, "motion": motion,
                                   "captions": caps,
                                   "issues": spec.issues + issues})


def build(text: str, override: dict | None = None, table: dict | None = None,
          fonts_dir: Path = FONTS) -> ThemeSpec:
    """Pick (or take) a preset, apply manual overrides, validate."""
    table = table if table is not None else presets()
    ov = override or {}
    if ov.get("preset") in table:
        name, source, scores = ov["preset"], "manual", {}
    else:
        name, scores = classify(text, table)
        source = "auto"
    if ov.get("preset") and ov["preset"] not in table:
        source = f"auto (unknown preset {ov['preset']!r})"
    base = table.get(name) or {"name": name}
    merged = _merge(base, {k: ov[k] for k in ("colors", "fonts", "background", "text", "category", "motion", "direction", "captions")
                              if k in ov})
    spec = ThemeSpec(name=name, category=merged.get("category", ""), source=source, scores=scores,
                     colors=merged.get("colors", {}), fonts=merged.get("fonts", {}),
                     background=merged.get("background", {}), text=merged.get("text", {}),
                     motion=merged.get("motion", {}), direction=merged.get("direction", {}),
                     captions=merged.get("captions", {}))
    return validate(spec, fonts_dir)


def from_brand(brand: Brand) -> ThemeSpec:
    """No work/theme.json (tests, old projects): the brand.json look, exactly as before themes."""
    c = {**brand.colors, **brand.themes.get(brand.theme, {})}
    c.setdefault("highlight", c.get("marker", c.get("accent", "#FFC400")))
    body = brand.fonts.get("telugu") or brand.fonts.get("latin") or SAFE_FONT
    return ThemeSpec(name=brand.theme, source="brand", colors=c,
                     fonts={"heading": body, "body": body, "script": brand.fonts.get("script", body)},
                     background={"type": "solid", "colors": [c.get("background", "#0E0E10")], "pattern": "grid",
                                 "pattern_opacity": 0.07, "texture": "grain" if brand.theme == "paper" else "none",
                                 "texture_opacity": 0.13},
                     text={"scale": 1.0})


def theme_text(project: Path) -> str:
    """Everything that tells what the video is about: script, transcript, scene plan."""
    parts = []
    for f in sorted((project / "input").glob("script.*")):
        parts.append(f.read_text("utf-8", errors="replace"))
    for f in (project / "work" / "transcript.json", project / "work" / "scenes.json"):
        if f.exists():
            d = json.loads(f.read_text("utf-8"))
            parts += [w.get("text", "") for w in d.get("words", [])]
            parts += [f"{s.get('query', '')} {s.get('narration', '')} {s.get('on_screen_text', '')}" for s in d.get("scenes", [])]
    parts.append(project.name.replace("_", " "))
    return " ".join(parts)


def transitions(plan, brand, theme: ThemeSpec | None = None) -> dict[int, tuple[str, str]]:
    """Scene id -> (in, out). Cut k (scene k -> k+1) uses scene k+1's `params.transition`, else the
    video's `motion.transitions` (else brand.json's list) cycled; both sides of a cut get the same type
    so out + in read as one move."""
    out = {s.id: ["", ""] for s in plan.scenes}
    cycle = [t for t in ((theme.motion.get("transitions") if theme else None) or brand.transitions) if t in TRANSITIONS]
    for k, (a, b) in enumerate(zip(plan.scenes, plan.scenes[1:])):
        t = str(b.params.get("transition") or (cycle[k % len(cycle)] if cycle else "cut"))
        t = "" if t not in TRANSITIONS or t == "cut" else t
        out[a.id][1] = out[b.id][0] = t
    return {k: tuple(v) for k, v in out.items()}
