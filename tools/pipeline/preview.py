"""Live preview: the render stage's scene builds (same template HTML, assets, theme, overlays, captions)
written to work/preview/<fmt>/scene_NNN/, for the dashboard timeline to play in the browser.
No frame capture and no encode, so it is ready in seconds; only video scenes run FFmpeg (trim + fit).
A scene is rebuilt only when its render key changes (same key as the render cache). check_layout adds
the layout check (pipeline/layout.py, ~8 s per changed scene, cached) to the scene warnings."""
import shutil
import subprocess
from pathlib import Path

from . import edits, layout
from . import render as rnd
from . import visual
from .config import BRAND, ROOT
from .contracts import Brand, Prepared, Resolved, ScenePlan, ThemeSpec, Transcript


def _load(model, f: Path):
    return model.model_validate_json(f.read_text("utf-8")) if f.exists() else None


def warnings(va, resolved: Resolved) -> dict[int, list[str]]:
    """Scene id -> problems worth a look before a render: missing visuals and asset validation warnings."""
    out: dict[int, list[str]] = {}
    for r in resolved.scenes:
        if r.status == "missing":
            out.setdefault(r.id, []).append("no visual found (missing tile)")
    for a in (va.assets if va else []):
        if a.role == "reference":
            continue
        for c in a.validation.get("checks", []):
            if isinstance(c, str) and c.split(":")[0] in ("warn", "fail"):
                for i in a.scenes:
                    out.setdefault(i, []).append(f"{a.id}: {c}")
    return out


def thumb_fresh(d: Path) -> bool:
    k, t = d / ".key", d / ".thumb.key"
    return (d / "thumb.jpg").exists() and k.exists() and t.exists() and t.read_text("utf-8") == k.read_text("utf-8")


def make_thumb(d: Path) -> bool:
    """One still of a built scene (headless Chrome via `hyperframes snapshot`, ~8 s) -> d/thumb.jpg 480 px wide,
    cached by the scene's render key. Taken when the overlays have settled (~1.3 s) so the picture shows the scene."""
    if thumb_fresh(d):
        return True
    from PIL import Image
    snap = d / ".snap"
    shutil.rmtree(snap, ignore_errors=True)
    subprocess.run(["node", str(rnd.HF_BIN), "snapshot", str(d), "--at", "1.3", "--no-end", "-o", str(snap)],
                   capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120)
    pngs = sorted(snap.glob("frame-*.png"))
    if not pngs:
        return False
    with Image.open(pngs[0]) as im:
        im = im.convert("RGB")
        im.thumbnail((480, 480))
        im.save(d / "thumb.jpg", quality=80)
    (d / ".thumb.key").write_text((d / ".key").read_text("utf-8"), "utf-8")
    shutil.rmtree(snap, ignore_errors=True)
    return True


def build_preview(project: Path, fmt: str = "16:9", root: Path = ROOT, brand_dir: Path = BRAND,
                  check_layout: bool = True) -> dict:
    w = project / "work"
    plan, resolved = _load(ScenePlan, w / "scenes.json"), _load(Resolved, w / "resolved.json")
    if not plan or not resolved:
        raise FileNotFoundError("work/scenes.json or work/resolved.json missing: run the project first")
    brand = Brand.model_validate_json((brand_dir / "brand.json").read_text("utf-8"))
    if fmt not in brand.formats:
        raise ValueError(f"format {fmt} not in brand.json")
    tr = _load(Transcript, w / "transcript.json")
    out = w / "preview" / rnd.fmt_dir(fmt, False)
    va = visual.load(project)
    jobs = rnd.plan_jobs(plan, resolved, brand, fmt, root, out, False, tr.words if tr else None,
                         _load(Prepared, w / "prepared" / "prepared.json"), _load(ThemeSpec, w / "theme.json"),
                         visual.overlays(va, project, fmt), edits.layers(project, fmt))
    warn = warnings(va, resolved)
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
        caps = [[round(j.scene.start + p[0]["s"], 3), round(j.scene.start + p[-1]["e"], 3), " ".join(x["t"] for x in p)]
                for p in (j.captions or [])]
        scenes.append({"id": j.scene.id, "start": j.scene.start, "end": j.scene.end, "template": j.template,
                       "dir": d.relative_to(project).as_posix(), "status": status, "error": error,
                       "thumb": (d / "thumb.jpg").relative_to(project).as_posix() if thumb_fresh(d) else "",
                       "warnings": warn.get(j.scene.id, []) + ([f"build failed: {error}"] if error else
                                                         layout.check(d, j.key) if check_layout else []),
                       "captions": caps})
    return {"format": fmt, "width": jobs[0].w if jobs else 0, "height": jobs[0].h if jobs else 0, "scenes": scenes}
