"""Manual visual edits (Timeline "Visual Edit"): <project>/edits.json.
{"version": 1, "16:9": {"<scene id>": {"<asset id>": {x,y,w,h,rot,opacity,z,lock,hidden}, "A012#2": {..., "dup": "A012"}}}}
x,y,w,h = the element's box as fractions of the frame (top-left corner), so 16:9 and 9:16 are independent.
rot = degrees, opacity 0..1, z = layer offset (0 = default), hidden = deleted. A duplicate has its own key + "dup".
Original asset files are never touched; layout.js applies `manual` over the automatic placement."""
import json
from pathlib import Path

FILE = "edits.json"
FORMATS = ("16:9", "9:16")


def _num(v, lo, hi, default):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return default
    return round(min(hi, max(lo, v)), 5) if v == v else default


def clean(m: dict) -> dict:
    """One element's transform with every field clamped; boxes may sit partly off-frame (-1..2) but stay sane."""
    out = {"x": _num(m.get("x"), -1, 2, 0.0), "y": _num(m.get("y"), -1, 2, 0.0),
           "w": _num(m.get("w"), 0.01, 3, 0.2), "h": _num(m.get("h"), 0.01, 3, 0.2),
           "rot": _num(m.get("rot"), -360, 360, 0.0), "opacity": _num(m.get("opacity"), 0, 1, 1.0),
           "z": int(_num(m.get("z"), -50, 50, 0)), "lock": bool(m.get("lock", True)), "hidden": bool(m.get("hidden", False))}
    if m.get("dup"):
        out["dup"] = str(m["dup"])
    return out


def load(project: Path) -> dict:
    f = Path(project) / FILE
    try:
        return json.loads(f.read_text("utf-8")) if f.exists() else {}
    except json.JSONDecodeError:
        return {}


def scene_items(project: Path, fmt: str | None, scene: int) -> dict:
    return (load(project).get(fmt or "", {}) or {}).get(str(scene), {}) or {}


def save_scene(project: Path, fmt: str, scene: int, items: dict) -> dict:
    """Replace one scene's edits for one format (an empty dict removes them). Returns what was stored."""
    if fmt not in FORMATS:
        raise ValueError(f"format must be one of {FORMATS}")
    data = load(project)
    data["version"] = 1
    stored = {str(k): clean(v) for k, v in (items or {}).items() if isinstance(v, dict)}
    per = data.setdefault(fmt, {})
    if stored:
        per[str(int(scene))] = stored
    else:
        per.pop(str(int(scene)), None)
    (Path(project) / FILE).write_text(json.dumps(data, indent=1), "utf-8")
    return stored


def apply(ovls: list, items: dict) -> list:
    """[(file, placement)] of one scene + its edits -> same list: `manual` set on edited ones, deleted ones dropped,
    duplicates appended. Placement ids come from visual.overlays (placement["id"])."""
    out = []
    for f, pl in ovls:
        m = items.get(pl.get("id", ""))
        if m and m.get("hidden"):
            continue
        out.append((f, {**pl, "manual": clean(m)} if m else pl))
    base = {pl.get("id"): (f, pl) for f, pl in ovls}
    for key, m in items.items():
        if m.get("dup") in base and not m.get("hidden"):
            f, pl = base[m["dup"]]
            out.append((f, {**pl, "id": key, "manual": clean(m)}))
    return out
