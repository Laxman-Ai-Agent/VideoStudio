"""Visual Assets dashboard service: a thin layer over projects/NN/visual-assets.json.

No second database: every call reads the project's JSON from disk, changes only the asked asset,
and saves through pipeline.visual (atomic write). Uploads land in assets/generated/<ID>_<time>.<ext>
(never overwriting a file) and pipeline.visual.sync processes + validates them exactly as
`studio.cmd assets` does. Found/missing is computed from the files on disk on every read.
"""
import sys
import threading
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from pipeline import visual  # noqa: E402
from pipeline.contracts import Resolved, ScenePlan  # noqa: E402

PROJECTS = ROOT / "projects"
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}
VIDEO_EXT = {".mp4", ".mov", ".webm"}
MAX_IMAGE = 50 * 2**20     # 50 MB
MAX_VIDEO = 1024 * 2**20   # 1 GB
_lock = threading.Lock()   # one writer at a time (the JSON is small, writes are rare)


class NotFound(Exception):
    pass


class Invalid(Exception):
    pass


class Conflict(Exception):
    pass


def project_dir(pid: str, projects: Path | None = None) -> Path:
    """'01' or '01_AI_Agents' -> folder; never leaves projects/."""
    base = projects or PROJECTS
    if not pid or "/" in pid or "\\" in pid or ".." in pid:
        raise NotFound(pid)
    hits = [d for d in base.iterdir() if d.is_dir() and (d.name == pid or d.name.split("_")[0] == pid)] \
        if base.is_dir() else []
    if len(hits) != 1:
        raise NotFound(pid)
    return hits[0]


def _found(a, p: Path) -> bool:
    if a.method == "template":
        return True
    return bool(a.file) and (p / a.file).exists() and a.status in visual.FOUND


def _preview(a, p: Path) -> str:
    for rel in (a.file, a.source_file):
        if rel and (p / rel).exists() and (p / rel).resolve().is_relative_to(p.resolve()):
            return rel
    return ""


def view(a, p: Path) -> dict:
    d = a.model_dump()
    d["found"] = _found(a, p)
    d["preview"] = _preview(a, p)
    d["kind"] = "video" if Path(d["preview"]).suffix.lower() in VIDEO_EXT else ("image" if d["preview"] else "")
    return d


def counts(va, p: Path) -> dict:
    found = sum(_found(a, p) for a in va.assets)
    return {"total": len(va.assets), "found": found, "missing": len(va.assets) - found}


def list_projects() -> list[dict]:
    out = []
    for d in sorted(PROJECTS.iterdir()) if PROJECTS.is_dir() else []:
        if not d.is_dir():
            continue
        va = visual.load(d) if visual.path(d).exists() else None
        out.append({"id": d.name.split("_")[0], "name": d.name, "title": (va.project.get("title") if va else "") or d.name,
                    "has_assets": va is not None, **(counts(va, d) if va else {"total": 0, "found": 0, "missing": 0})})
    return out


def _load(pid: str):
    p = project_dir(pid)
    va = visual.load(p)
    if va is None:
        raise NotFound(f"{p.name} has no {visual.FILE} yet (run studio.cmd run {p.name[:2]})")
    return p, va


def project_assets(pid: str) -> dict:
    p, va = _load(pid)
    return {"project": {**va.project, "id": p.name.split("_")[0], "name": p.name}, "counts": counts(va, p),
            "summary": va.summary, "characters": [c.model_dump() for c in va.characters],
            "assets": [view(a, p) for a in va.assets]}


def asset(pid: str, aid: str) -> dict:
    p, va = _load(pid)
    for a in va.assets:
        if a.id == aid:
            return view(a, p)
    raise NotFound(aid)


def save_prompt(pid: str, aid: str, text: str, negative: str | None = None) -> dict:
    """Changes only this asset's prompt text (and negative); everything else in the file is kept."""
    if not isinstance(text, str) or len(text) > 20000:
        raise Invalid("prompt must be text (max 20 000 characters)")
    with _lock:
        p, va = _load(pid)
        a = next((x for x in va.assets if x.id == aid), None)
        if a is None:
            raise NotFound(aid)
        a.prompt.text = text.strip()
        if negative is not None:
            a.prompt.negative = str(negative).strip()
        if a.status in ("needed", "prompt_ready"):
            a.status = "prompt_ready" if a.prompt.text else "needed"
        visual.save(p, va)
        return view(a, p)


def _sync(p: Path, va):
    plan = ScenePlan.model_validate_json((p / "work" / "scenes.json").read_text("utf-8"))
    rj = p / "work" / "resolved.json"
    resolved = Resolved.model_validate_json(rj.read_text("utf-8")) if rj.exists() else None
    return visual.sync(va, p, plan, ROOT, resolved, fetch=None, remove_bg=visual.rembg_remover(), log=lambda *_: None)


def upload(pid: str, aid: str, filename: str, data: bytes, replace: bool = False, sync=None) -> dict:
    """Store an upload for one asset and run the normal processing + validation for it.
    Without `replace`, an asset that already has a file is refused (Conflict)."""
    ext = Path(filename or "").suffix.lower()
    if ext not in IMAGE_EXT | VIDEO_EXT:
        raise Invalid(f"file type {ext or '?'} not allowed (png, jpg, jpeg, webp, mp4, mov, webm)")
    limit = MAX_VIDEO if ext in VIDEO_EXT else MAX_IMAGE
    if not data:
        raise Invalid("empty file")
    if len(data) > limit:
        raise Invalid(f"file too large ({len(data) // 2**20} MB, max {limit // 2**20} MB)")
    with _lock:
        p, va = _load(pid)
        a = next((x for x in va.assets if x.id == aid), None)
        if a is None:
            raise NotFound(aid)
        if a.method == "template":
            raise Invalid(f"{aid} is drawn by a template; there is no file to upload")
        if _found(a, p) and not replace:
            raise Conflict(f"{aid} already has a file; use Replace to swap it")
        dest_dir = p / visual.GENERATED
        dest_dir.mkdir(parents=True, exist_ok=True)
        stamp = f"{datetime.now():%Y%m%d%H%M%S}"
        dest, n = dest_dir / f"{aid}_{stamp}{ext}", 1
        while dest.exists():  # never overwrite, even within the same second
            dest, n = dest_dir / f"{aid}_{stamp}_{n}{ext}", n + 1
        tmp = dest.with_name(dest.name + ".part")
        tmp.write_bytes(data)
        tmp.replace(dest)
        # the newest upload for this id wins in visual.find_upload; reset so sync processes it again
        a.status, a.file, a.source_file = "needed", "", ""
        a.processing.status, a.processing.log = "pending", []
        a.validation = {"status": "pending", "checks": []}
        va = (sync or _sync)(p, va)
        visual.save(p, va)
        a = next(x for x in va.assets if x.id == aid)
        return {"asset": view(a, p), "counts": counts(va, p)}


def file_path(pid: str, rel: str) -> Path:
    """A file inside the project folder only (previews)."""
    p = project_dir(pid)
    f = (p / rel).resolve()
    if not f.is_relative_to(p.resolve()) or not f.is_file():
        raise NotFound(rel)
    return f
