"""output/script.txt = the final spoken words (one scene per line) from the project's corrected Gemini JSON."""
import json
from pathlib import Path


def source(project: Path) -> Path | None:
    d = project / "input"
    found = sorted(d.glob("*corrected*.json")) or sorted(d.glob("*gemini*.json")) if d.is_dir() else []
    return found[0] if found else None


def write_script(project: Path) -> Path | None:
    """None when the project has no Gemini JSON. Rewritten only when the text changed."""
    src = source(project)
    if not src:
        return None
    lines = [s["text"].strip() for s in json.loads(src.read_text("utf-8")).get("scenes", []) if s.get("text", "").strip()]
    out = project / "output" / "script.txt"
    text = "\n".join(lines) + "\n"
    if not lines or (out.exists() and out.read_text("utf-8") == text):
        return out if lines else None
    out.parent.mkdir(exist_ok=True)
    out.write_text(text, "utf-8")
    return out
