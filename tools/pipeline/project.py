"""Project folders, atomic writes and stage checkpoints (resume without repeating work)."""
import hashlib
import os
import re
import shutil
import time
import traceback
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from .config import PROJECT_DIRS, PROJECTS
from .contracts import ProjectState, StageRecord

FULL_HASH_LIMIT = 50 * 1024 * 1024  # bigger files are fingerprinted by size + mtime


def atomic_write(path: Path, text: str) -> None:
    """Write via a temp file + rename, so a crash never leaves a half-written file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    for attempt in range(40):  # Windows: the target may be open for a moment (the dashboard polls it, antivirus scans it) -> WinError 5
        try:
            os.replace(tmp, path)
            return
        except PermissionError:
            if attempt == 39:
                raise
            time.sleep(0.15)


def slug(name: str) -> str:
    """Folder-safe name. Keeps Telugu/any letters; replaces spaces and Windows-forbidden chars."""
    s = re.sub(r'[\s<>:"/\\|?*]+', "_", name.strip()).strip("_.")
    if not s:
        raise ValueError("project name is empty")
    return s


MONTHS = ("JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC")
# 01__15-NOV-2026__Sugar_Walk: serial (per channel, by creation date), day-MON-year, name.
# The key used in commands and the dashboard is the folder name without the serial: "15-NOV-2026__Sugar_Walk".
PROJECT = re.compile(r"^(\d{2})__(\d{2})-([A-Za-z]{3})-(\d{4})__(.+)$")


def project_key(p: Path) -> str | None:
    m = PROJECT.match(p.name)
    return f"{m.group(2)}-{m.group(3).upper()}-{m.group(4)}__{m.group(5)}" if m else None


def project_order(p: Path) -> tuple[int, int, int, int] | None:
    """(year, month, day, serial) for sorting projects by creation date; None for a folder without this name."""
    m = PROJECT.match(p.name)
    mon = m.group(3).upper() if m else ""
    if mon not in MONTHS:
        return None
    return int(m.group(4)), MONTHS.index(mon) + 1, int(m.group(2)), int(m.group(1))


def project_dirs(projects_dir: Path = PROJECTS) -> list[Path]:
    """Project folders: projects/NN__..., projects/<channel>/NN__... and projects/<channel>/<group>/NN__...
    Skips _deleted and dot folders. Any other folder is a channel or group folder (max 2 deep)."""
    out = []

    def walk(folder: Path, depth: int) -> None:
        for d in sorted(folder.iterdir()):
            if not d.is_dir() or d.name.startswith(("_", ".")):
                continue
            if PROJECT.match(d.name):
                out.append(d)
            elif depth < 2:
                walk(d, depth + 1)

    if projects_dir.is_dir():
        walk(projects_dir, 0)
    return out


def next_project_name(projects_dir: Path, name: str, when: datetime | None = None) -> str:
    """Next serial in this folder (01, 02, ...) plus today's date: 03__16-NOV-2026__Name."""
    when = when or datetime.now()
    serial = 1 + sum(1 for p in project_dirs(projects_dir) if p.parent == projects_dir)
    return f"{serial:02d}__{when.day:02d}-{MONTHS[when.month - 1]}-{when.year}__{slug(name)}"


VARIATION = re.compile(r"^\d+x\d+$")  # projects/03_Topic/16x9: one video of a topic, the drop folder is shared


def is_variation(project: Path) -> bool:
    return bool(VARIATION.match(project.name))


def variations(project: Path) -> list[Path]:
    return sorted(d for d in project.iterdir() if d.is_dir() and is_variation(d)) if project.is_dir() else []


def ref(project: Path, projects_dir: Path = PROJECTS) -> str:
    """What `studio.cmd run` takes: '03_Topic' or '03_Topic/16x9'."""
    return f"{project.parent.name}/{project.name}" if is_variation(project) else project.name


def upload_target(project: Path, name: str) -> Path:
    """Where the user drops a file for asset `name` (A012.png): the project's drop/, or for a variation the topic's
    one drop/ with the variation in front (03_Topic/drop/16x9_A012.png), so the shared ingest knows where it goes."""
    return project.parent / "drop" / f"{project.name}_{name}" if is_variation(project) else project / "drop" / name


def ensure_layout(project: Path) -> None:
    for d in PROJECT_DIRS:
        if not (d == "drop" and is_variation(project)):  # one drop/ for the whole topic, in the parent
            (project / d).mkdir(parents=True, exist_ok=True)


def export_final(src: Path, dest: Path) -> None:
    """Move a passed final from work/assembled/ to output/, so only one copy stays on disk.
    An older file in output/ is replaced. Nothing to do if src is already gone (moved by an earlier run)."""
    if src.is_file():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dest))


def remove_previews_after_final(project: Path, final_file: str) -> list[Path]:
    """A final for one format passed QA (final_16x9.mp4): its 480p previews (preview_16x9.mp4, in output/ and
    work/assembled/) are no longer needed. Other formats and the finals stay."""
    suffix = final_file.removeprefix("final_")
    removed = []
    for p in (project / "output" / f"preview_{suffix}", project / "work" / "assembled" / f"preview_{suffix}"):
        if p.is_file():
            p.unlink()
            removed.append(p)
    return removed


FINAL_MARK = "final_done.json"  # written when a final passes QA; its mtime is the final's time
CHECKPOINT_NAMES = {"state.json", "qa.json", FINAL_MARK}


def mark_final(variation: Path) -> None:
    atomic_write(variation / "work" / FINAL_MARK, datetime.now().isoformat())


def _is_checkpoint(rel: tuple[str, ...]) -> bool:
    """Files the pipeline writes itself (outputs, caches, logs, checkpoints): not a user change."""
    if "output" in rel:
        return True
    if any(pair in {("work", "scenes"), ("work", "assembled"), ("work", "logs")} for pair in zip(rel, rel[1:])):
        return True
    return len(rel) >= 2 and rel[-2] == "work" and rel[-1] in CHECKPOINT_NAMES


def prune_scene_cache(variation: Path, hours: float = 24, now: float | None = None) -> bool:
    """Delete variation/work/scenes once its final is `hours` old and nothing changed since (no edit to the
    topic's inputs, plan, theme or assets). A later edit then re-renders every scene. Returns True if deleted.
    Finals made before this rule have no marker, so they are never pruned automatically."""
    scenes, mark = variation / "work" / "scenes", variation / "work" / FINAL_MARK
    if not scenes.is_dir() or not mark.is_file():
        return False
    since = mark.stat().st_mtime
    if (time.time() if now is None else now) - since < hours * 3600:
        return False
    root = variation.parent if is_variation(variation) else variation
    for f in root.rglob("*"):
        if f.is_file() and f.stat().st_mtime > since and not _is_checkpoint(f.relative_to(root).parts):
            return False  # a user change after the final: keep the cache
    shutil.rmtree(scenes)
    return True


def new_project(name: str, projects_dir: Path = PROJECTS) -> Path:
    project = projects_dir / next_project_name(projects_dir, name)
    ensure_layout(project)
    atomic_write(project / "project.md",
                 f"# {project.name}\n\nCreated: {datetime.now():%Y-%m-%d %H:%M}\n\n## Log\n")
    return project


def find_project(ref: str, projects_dir: Path = PROJECTS) -> Path:
    """Accepts '15_Nov_2026_01' (the date key), '15_Nov_2026_01-Sugar_Walk' (the folder name), '15_Nov_2026_01/16x9'
    (a variation) or a full path."""
    p = Path(ref)
    if p.is_dir():
        return p
    if "/" in ref.replace("\\", "/"):
        head, tail = ref.replace("\\", "/").split("/", 1)
        v = find_project(head, projects_dir) / tail
        if is_variation(v) and v.is_dir():
            return v
        raise FileNotFoundError(f"variation not found: {ref}")
    for d in project_dirs(projects_dir):
        if d.name == ref or project_key(d) == ref:
            return d
    raise FileNotFoundError(f"project not found: {ref}")


def hash_inputs(paths: list[Path], extra: str = "") -> str:
    h = hashlib.sha256(extra.encode())
    for p in sorted(paths):
        h.update(p.name.encode())
        st = p.stat()
        if st.st_size <= FULL_HASH_LIMIT:
            h.update(p.read_bytes())
        else:
            # ponytail: size+mtime for big media, full content hash if false cache hits ever bite
            h.update(f"{st.st_size}:{st.st_mtime_ns}".encode())
    return h.hexdigest()[:16]


def load_state(project: Path) -> ProjectState:
    f = project / "work" / "state.json"
    return ProjectState.model_validate_json(f.read_text("utf-8")) if f.exists() else ProjectState()


def save_state(project: Path, state: ProjectState) -> None:
    atomic_write(project / "work" / "state.json", state.model_dump_json(indent=2))


def run_stage(project: Path, name: str, inputs: list[Path], outputs: list[Path],
              fn: Callable[[], None], force: bool = False, extra: str = "") -> bool:
    """Run fn() unless it already succeeded on identical inputs and its outputs still exist.

    Returns True if it ran. On failure the error is checkpointed and logged, then re-raised.
    """
    state = load_state(project)
    key = hash_inputs(inputs, extra)
    rec = state.stages.get(name)
    if (not force and rec and rec.status == "done" and rec.inputs_hash == key
            and all(o.exists() for o in outputs)):
        return False

    t0 = time.monotonic()
    try:
        fn()
    except Exception as e:
        state.stages[name] = StageRecord(status="failed", inputs_hash=key, finished_at=datetime.now(),
                                         seconds=round(time.monotonic() - t0, 2),
                                         error=f"{type(e).__name__}: {e}")
        save_state(project, state)
        atomic_write(project / "work" / "logs" / f"{name}.log", traceback.format_exc())
        raise
    state.stages[name] = StageRecord(status="done", inputs_hash=key, finished_at=datetime.now(),
                                     seconds=round(time.monotonic() - t0, 2))
    save_state(project, state)
    return True
