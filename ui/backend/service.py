"""Visual Assets dashboard service: a thin layer over projects/NN/visual-assets.json.

No second database: every call reads the project's JSON from disk, changes only the asked asset,
and saves through pipeline.visual (atomic write). Media work reuses pipeline.visual.process
(crop / background removal / aspect framing / video trim); originals are never changed.

- Missing asset: Upload -> stored in assets/generated/<ID>_<time>.<ext> -> processed + validated.
- Found asset: Replace -> the new file is a *candidate* (assets/generated/pending/) with a processed
  preview (assets/processed/pending/); the current file stays until Confirm passes validation.
- Media settings (aspect, fill/fit, crop focus, zoom, video trim) re-process from the original
  upload into a new processed file. Every change is appended to the asset's `history`.
"""
import os
import shutil
import sys
import threading
import urllib.parse
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from pipeline import visual  # noqa: E402
from pipeline.contracts import Resolved, ScenePlan, Transcript  # noqa: E402

PROJECTS = ROOT / "projects"
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}
VIDEO_EXT = {".mp4", ".mov", ".webm"}
MAX_IMAGE = 50 * 2**20     # 50 MB
MAX_VIDEO = 1024 * 2**20   # 1 GB
PENDING_UP = visual.GENERATED + "/pending"
PENDING_OUT = visual.PROCESSED + "/pending"
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


def _inside(p: Path, rel: str) -> bool:
    return bool(rel) and (p / rel).exists() and (p / rel).resolve().is_relative_to(p.resolve())


def _found(a, p: Path) -> bool:
    if a.method == "template":
        return True
    return bool(a.file) and (p / a.file).exists() and a.status in visual.FOUND


def _scenes(p: Path) -> dict:
    f = p / "work" / "scenes.json"
    if not f.exists():
        return {}
    return {s.id: s for s in ScenePlan.model_validate_json(f.read_text("utf-8")).scenes}


def reference(a, p: Path, chars: dict) -> dict | None:
    """The photo / sheet to attach when generating this asset (its character's reference)."""
    c = chars.get(a.character)
    if not c:
        return None
    rel = c.reference_image
    if rel.startswith("_brand/presenter/") and (ROOT / rel).is_file():
        src = "/brand/presenter/" + urllib.parse.quote(Path(rel).name)
    elif rel and _inside(p, rel):
        src = f"/files/{p.name}/{urllib.parse.quote(rel)}"
    elif (r := next((x for x in chars.get('_assets', []) if x.id == c.reference_asset), None)) and _inside(p, r.file):
        rel, src = r.file, f"/files/{p.name}/{urllib.parse.quote(r.file)}"
    else:
        rel, src = rel, ""
    return {"character": c.name, "name": Path(rel).name if rel else "", "path": rel, "src": src, "outfit": c.outfit}


def view(a, p: Path, scenes: dict | None = None, chars: dict | None = None) -> dict:
    d = a.model_dump()
    d["found"] = _found(a, p)
    d["preview"] = next((r for r in (a.file, a.source_file) if _inside(p, r)), "")
    d["original"] = a.source_file if _inside(p, a.source_file) else ""
    d["kind"] = "video" if Path(d["preview"] or d["original"] or a.pending_file).suffix.lower() in VIDEO_EXT \
        else ("image" if (d["preview"] or a.pending_file) else "")
    if a.category == "video_broll" and not d["kind"]:
        d["kind"] = "video"
    sc = scenes if scenes is not None else _scenes(p)
    d["scene_info"] = [{"id": i, "start": sc[i].start, "end": sc[i].end, "narration": sc[i].narration,
                        "on_screen_text": sc[i].on_screen_text, "visual_type": sc[i].visual_type}
                       for i in a.scenes if i in sc]
    d["out_size"] = list(visual.out_size(a))
    if a.character:
        if chars is None:
            va = visual.load(p)
            chars = {c.id: c for c in (va.characters if va else [])} | {"_assets": va.assets if va else []}
        d["reference"] = reference(a, p, chars)
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


def _get(va, aid: str):
    a = next((x for x in va.assets if x.id == aid), None)
    if a is None:
        raise NotFound(aid)
    return a


def _log(a, action: str, **kw) -> None:
    a.history.append({"time": datetime.now().isoformat(timespec="seconds"), "action": action, **kw})


def project_assets(pid: str) -> dict:
    p, va = _load(pid)
    sc = _scenes(p)
    return {"project": {**va.project, "id": p.name.split("_")[0], "name": p.name}, "counts": counts(va, p),
            "summary": va.summary, "characters": [c.model_dump() for c in va.characters],
            "assets": [view(a, p, sc, {c.id: c for c in va.characters} | {"_assets": va.assets}) for a in va.assets]}


def asset(pid: str, aid: str) -> dict:
    p, va = _load(pid)
    return view(_get(va, aid), p)


def save_prompt(pid: str, aid: str, text: str, negative: str | None = None) -> dict:
    """Changes only this asset's prompt (the first version is kept in prompt_original)."""
    if not isinstance(text, str) or len(text) > 20000:
        raise Invalid("prompt must be text (max 20 000 characters)")
    with _lock:
        p, va = _load(pid)
        a = _get(va, aid)
        new, neg = text.strip(), (str(negative).strip() if negative is not None else a.prompt.negative)
        if new != a.prompt.text or neg != a.prompt.negative:
            if not a.prompt_original and a.prompt.text:
                a.prompt_original = a.prompt.text
            _log(a, "prompt_edited", chars=len(new))
            a.prompt.text, a.prompt.negative = new, neg
        if a.status in ("needed", "prompt_ready"):
            a.status = "prompt_ready" if a.prompt.text else "needed"
        visual.save(p, va)
        return view(a, p)


def _words(p: Path) -> list:
    f = p / "work" / "transcript.json"
    return Transcript.model_validate_json(f.read_text("utf-8")).words if f.exists() else []


def _sync(p: Path, va):
    plan = ScenePlan.model_validate_json((p / "work" / "scenes.json").read_text("utf-8"))
    rj = p / "work" / "resolved.json"
    resolved = Resolved.model_validate_json(rj.read_text("utf-8")) if rj.exists() else None
    return visual.sync(va, p, plan, ROOT, resolved, fetch=None, remove_bg=visual.rembg_remover(),
                       log=lambda *_: None, words=_words(p))


def _check_file(filename: str, data: bytes) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext not in IMAGE_EXT | VIDEO_EXT:
        raise Invalid(f"file type {ext or '?'} not allowed (png, jpg, jpeg, webp, mp4, mov, webm)")
    limit = MAX_VIDEO if ext in VIDEO_EXT else MAX_IMAGE
    if not data:
        raise Invalid("empty file")
    if len(data) > limit:
        raise Invalid(f"file too large ({len(data) // 2**20} MB, max {limit // 2**20} MB)")
    return ext


def _store(folder: Path, aid: str, ext: str, data: bytes) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    stamp = f"{datetime.now():%Y%m%d%H%M%S}"
    dest, n = folder / f"{aid}_{stamp}{ext}", 1
    while dest.exists():  # never overwrite, even within the same second
        dest, n = folder / f"{aid}_{stamp}_{n}{ext}", n + 1
    tmp = dest.with_name(dest.name + ".part")
    tmp.write_bytes(data)
    tmp.replace(dest)
    return dest


def _preview_candidate(a, p: Path, remove_bg=None) -> None:
    """Process the pending upload with the current settings into assets/processed/pending/."""
    out, plog = visual.process(a, p / a.pending_file, p, remove_bg or visual.rembg_remover(), dest_dir=p / PENDING_OUT)
    a.pending_preview = out.relative_to(p).as_posix()
    _log(a, "replacement_previewed", file=a.pending_preview, steps=plog)


def upload(pid: str, aid: str, filename: str, data: bytes, replace: bool = False, sync=None) -> dict:
    """Missing asset: store, process, validate (becomes the asset's file).
    Found asset (`replace`): store as a candidate with a processed preview; confirm_replace swaps it in."""
    ext = _check_file(filename, data)
    with _lock:
        p, va = _load(pid)
        a = _get(va, aid)
        if a.method == "template":
            raise Invalid(f"{aid} is drawn by a template; there is no file to upload")
        if _found(a, p):
            if not replace:
                raise Conflict(f"{aid} already has a file; use Replace to swap it")
            dest = _store(p / PENDING_UP, aid, ext, data)
            a.pending_file = dest.relative_to(p).as_posix()
            _log(a, "replacement_uploaded", file=a.pending_file, name=filename)
            try:
                _preview_candidate(a, p)
            except Exception as e:  # noqa: BLE001 - keep the candidate, report
                a.pending_preview = ""
                _log(a, "replacement_preview_failed", error=str(e))
            visual.save(p, va)
            return {"asset": view(a, p), "counts": counts(va, p)}
        dest = _store(p / visual.GENERATED, aid, ext, data)
        # the newest upload for this id wins in visual.find_upload; reset so sync processes it
        a.status, a.file, a.source_file = "needed", "", ""
        a.processing.status, a.processing.log = "pending", []
        a.validation = {"status": "pending", "checks": []}
        _log(a, "uploaded", file=dest.relative_to(p).as_posix(), name=filename)
        va = (sync or _sync)(p, va)
        a = _get(va, aid)
        _log(a, a.status, file=a.file, validation=a.validation.get("status"))
        visual.save(p, va)
        return {"asset": view(a, p), "counts": counts(va, p)}


def _promote(a, p: Path, candidate: Path, source_rel: str, action: str) -> None:
    """Validate `candidate`; only then move it over the asset's processed file (the old one is kept
    as <file>.v<n> next to it) and point the asset at the new source."""
    scene_len = a.media.duration_required or max((t["end"] - t["start"] for t in a.timestamps), default=0)
    v = visual.check(a, candidate, scene_len)
    if v["status"] == "fail":
        raise Invalid("not applied, the new version fails validation: " + "; ".join(v["checks"]))
    final = p / visual.PROCESSED / f"{a.id}{candidate.suffix.lower()}"
    if a.file and (p / a.file).exists():
        n = sum(1 for h in a.history if h.get("action") in ("replaced", "media_changed")) + 1
        old = p / a.file
        keep = old.with_name(f"{old.stem}.v{n}{old.suffix}")
        if not keep.exists():
            shutil.copy2(old, keep)
    final.parent.mkdir(parents=True, exist_ok=True)
    os.replace(candidate, final)
    a.file, a.source_file = final.relative_to(p).as_posix(), source_rel
    a.status, a.validation = "validated", v
    a.processing.status = "done"
    _log(a, action, file=a.file, source=source_rel, validation=v["status"])


def confirm_replace(pid: str, aid: str) -> dict:
    with _lock:
        p, va = _load(pid)
        a = _get(va, aid)
        if not a.pending_file or not (p / a.pending_file).exists():
            raise Invalid(f"{aid} has no replacement waiting")
        if not a.pending_preview or not (p / a.pending_preview).exists():
            _preview_candidate(a, p)
        _promote(a, p, p / a.pending_preview, a.pending_file, "replaced")
        a.pending_file = a.pending_preview = ""
        visual.save(p, va)
        return {"asset": view(a, p), "counts": counts(va, p)}


def cancel_replace(pid: str, aid: str) -> dict:
    with _lock:
        p, va = _load(pid)
        a = _get(va, aid)
        if a.pending_file:
            _log(a, "replacement_discarded", file=a.pending_file)  # the file itself stays on disk
        a.pending_file = a.pending_preview = ""
        visual.save(p, va)
        return {"asset": view(a, p), "counts": counts(va, p)}


MEDIA_KEYS = {"aspect", "fit", "crop_x", "crop_y", "zoom", "trim_start", "trim_end"}


def save_media(pid: str, aid: str, settings: dict) -> dict:
    """Store framing / trim and re-process from the original upload. With a replacement waiting, only
    its preview is rebuilt; otherwise the new version replaces the current file after validation."""
    bad = set(settings) - MEDIA_KEYS
    if bad:
        raise Invalid(f"unknown media settings {sorted(bad)}")
    with _lock:
        p, va = _load(pid)
        a = _get(va, aid)
        m = a.media.model_copy()
        try:
            if "aspect" in settings:
                m.aspect = "" if settings["aspect"] in ("", None, "output") else str(settings["aspect"])
                if m.aspect and m.aspect not in visual.ASPECTS:
                    raise ValueError(f"aspect must be one of {sorted(visual.ASPECTS)}")
            if "fit" in settings:
                if settings["fit"] not in ("fill", "fit"):
                    raise ValueError("fit must be fill or fit")
                m.fit = settings["fit"]
            for k, lo, hi in (("crop_x", 0, 1), ("crop_y", 0, 1), ("zoom", 1, 3)):
                if k in settings:
                    setattr(m, k, min(hi, max(lo, float(settings[k]))))
            if "trim_start" in settings:
                m.trim_start = max(0.0, float(settings["trim_start"] or 0))
            if "trim_end" in settings:
                m.trim_end = None if settings["trim_end"] in (None, "") else float(settings["trim_end"])
                if m.trim_end is not None and m.trim_end <= m.trim_start:
                    raise ValueError("end must be after start")
        except (TypeError, ValueError) as e:
            raise Invalid(str(e)) from e
        a.media = m
        _log(a, "media_settings", **{k: getattr(m, k) for k in sorted(MEDIA_KEYS)})
        if a.pending_file and (p / a.pending_file).exists():
            _preview_candidate(a, p)
        elif a.source_file and (p / a.source_file).exists():
            tmp_dir = p / PENDING_OUT / "edit"
            out, plog = visual.process(a, p / a.source_file, p, visual.rembg_remover(), dest_dir=tmp_dir)
            a.processing.log = plog
            _promote(a, p, out, a.source_file, "media_changed")
        else:
            raise Invalid(f"{aid} has no uploaded file to frame or trim yet (the settings were not saved)")
        visual.save(p, va)
        return {"asset": view(a, p), "counts": counts(va, p)}


def file_path(pid: str, rel: str) -> Path:
    """A file inside the project folder only (previews)."""
    p = project_dir(pid)
    f = (p / rel).resolve()
    if not f.is_relative_to(p.resolve()) or not f.is_file():
        raise NotFound(rel)
    return f


_preview_lock = threading.Lock()  # one build at a time: two requests must not write the same scene folder


def preview(pid: str, fmt: str, layout: bool = True) -> dict:
    """Timeline live preview: scene builds in work/preview/<fmt>/ (changed scenes only).
    layout=False skips the slow layout check (used after every manual edit)."""
    from pipeline.preview import build_preview
    with _preview_lock:
        return build_preview(project_dir(pid), fmt, check_layout=layout)


_thumb_lock = threading.Lock()  # one headless Chrome at a time (RAM)


def thumb(pid: str, fmt: str, scene: int) -> dict:
    """Timeline thumbnail of one built scene; "" when the scene is not built yet or the capture failed."""
    from pipeline import render as rnd
    from pipeline.preview import make_thumb
    p = project_dir(pid)
    d = p / "work" / "preview" / rnd.fmt_dir(fmt, False) / f"scene_{int(scene):03d}"
    if not (d / "index.html").exists():
        raise NotFound(f"scene {scene} is not built")
    with _thumb_lock:
        ok = make_thumb(d)
    return {"thumb": (d / "thumb.jpg").relative_to(p).as_posix() if ok else ""}


def get_edits(pid: str) -> dict:
    """Manual visual edits (edits.json), all formats."""
    from pipeline import edits
    return edits.load(project_dir(pid))


def save_edits(pid: str, fmt: str, scene, items: dict) -> dict:
    """Replace one scene's manual edits for one format; the next /preview rebuilds only that scene."""
    from pipeline import edits
    try:
        return {"items": edits.save_scene(project_dir(pid), fmt, int(scene), items)}
    except (ValueError, TypeError) as e:
        raise Invalid(str(e)) from e


_renders: dict[str, dict] = {}  # project folder -> {proc, final, t0, t1}


def _times(p: Path) -> Path:
    return p / "work" / "logs" / "ui_render_times.json"


def start_render(pid: str, final: bool, review: bool = False) -> dict:
    """`studio run <pid> [--final | --review]` in the background (same as the command line); one at a time per project.
    review = everything up to the storyboard, no render (the Visual Assets page runs it before opening the Timeline)."""
    import subprocess
    import time
    p = project_dir(pid)
    if (cur := _renders.get(p.name)) and cur["proc"].poll() is None:
        return render_status(pid)
    log = p / "work" / "logs" / "ui_render.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    fh = open(log, "w", encoding="utf-8")
    cmd = [sys.executable, str(ROOT / "tools" / "studio.py"), "run", p.name.split("_")[0]] + (["--review"] if review else ["--final"] if final else [])
    proc = subprocess.Popen(cmd, cwd=ROOT, stdout=fh, stderr=subprocess.STDOUT,
                            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                            env={**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUNBUFFERED": "1"})
    _renders[p.name] = {"proc": proc, "final": final, "review": review, "t0": time.time(), "t1": None}
    return render_status(pid)


def render_status(pid: str) -> dict:
    """State, elapsed seconds, the last run's duration of the same mode (a rough ETA) and the log tail."""
    import json
    import time
    p = project_dir(pid)
    cur = _renders.get(p.name)
    log = p / "work" / "logs" / "ui_render.log"
    tail = log.read_text("utf-8", errors="replace").splitlines()[-8:] if log.exists() else []
    try:
        history = json.loads(_times(p).read_text("utf-8"))
    except (OSError, ValueError):
        history = {}
    if not cur:
        return {"state": "idle", "tail": tail, "history": history}
    code = cur["proc"].poll()
    if code is not None and cur["t1"] is None:
        cur["t1"] = time.time()
        if code == 0 and not cur.get("review"):  # remember how long a finished render took
            history[("final" if cur["final"] else "preview")] = round(cur["t1"] - cur["t0"])
            _times(p).write_text(json.dumps(history), "utf-8")
    state = "running" if code is None else "done" if code == 0 else "waiting" if code == 2 else "failed"
    elapsed = round((cur["t1"] or time.time()) - cur["t0"])
    return {"state": state, "code": code, "final": cur["final"], "review": cur.get("review", False), "elapsed": elapsed, "tail": tail,
            "last": history.get("final" if cur["final"] else "preview")}
