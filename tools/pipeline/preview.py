"""Live preview: the render stage's scene builds (same template HTML, assets, theme, overlays, captions)
written to work/preview/<fmt>/scene_NNN/, for the dashboard timeline to play in the browser.
No frame capture and no encode, so it is ready in seconds; only video scenes run FFmpeg (trim + fit).
A scene is rebuilt only when its render key changes (same key as the render cache)."""
from pathlib import Path

from . import render as rnd
from . import visual
from .config import BRAND, ROOT
from .contracts import Brand, Prepared, Resolved, ScenePlan, ThemeSpec, Transcript


def _load(model, f: Path):
    return model.model_validate_json(f.read_text("utf-8")) if f.exists() else None


def build_preview(project: Path, fmt: str = "16:9", root: Path = ROOT, brand_dir: Path = BRAND) -> dict:
    w = project / "work"
    plan, resolved = _load(ScenePlan, w / "scenes.json"), _load(Resolved, w / "resolved.json")
    if not plan or not resolved:
        raise FileNotFoundError("work/scenes.json or work/resolved.json missing: run the project first")
    brand = Brand.model_validate_json((brand_dir / "brand.json").read_text("utf-8"))
    if fmt not in brand.formats:
        raise ValueError(f"format {fmt} not in brand.json")
    tr = _load(Transcript, w / "transcript.json")
    out = w / "preview" / rnd.fmt_dir(fmt, False)
    jobs = rnd.plan_jobs(plan, resolved, brand, fmt, root, out, False, tr.words if tr else None,
                         _load(Prepared, w / "prepared" / "prepared.json"), _load(ThemeSpec, w / "theme.json"),
                         visual.overlays(visual.load(project), project))
    scenes = []
    for j in jobs:
        d, status, error = out / f"scene_{j.scene.id:03d}", "cached", ""
        key = d / ".key"
        if not (key.exists() and key.read_text("utf-8") == j.key and (d / "index.html").exists()):
            status = "built"
            try:
                rnd.build(j, d, j.template)
                key.write_text(j.key, "utf-8")
            except Exception as e:  # noqa: BLE001 - same as render: the scene shows the missing tile
                error = f"{j.template}: {type(e).__name__}: {e}"
                rnd.build(j, d, "missing", error)
        scenes.append({"id": j.scene.id, "start": j.scene.start, "end": j.scene.end, "template": j.template,
                       "dir": d.relative_to(project).as_posix(), "status": status, "error": error})
    return {"format": fmt, "width": jobs[0].w if jobs else 0, "height": jobs[0].h if jobs else 0, "scenes": scenes}
