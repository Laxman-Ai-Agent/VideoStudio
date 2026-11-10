"""Project folders, atomic writes and stage checkpoints (resume without repeating work)."""
import hashlib
import os
import re
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


def next_number(projects_dir: Path = PROJECTS) -> int:
    nums = [int(m.group(1)) for p in projects_dir.glob("*")
            if p.is_dir() and (m := re.match(r"(\d+)_", p.name))]
    return max(nums, default=0) + 1


def ensure_layout(project: Path) -> None:
    for d in PROJECT_DIRS:
        (project / d).mkdir(parents=True, exist_ok=True)


def new_project(name: str, projects_dir: Path = PROJECTS) -> Path:
    project = projects_dir / f"{next_number(projects_dir):02d}_{slug(name)}"
    ensure_layout(project)
    atomic_write(project / "project.md",
                 f"# {project.name}\n\nCreated: {datetime.now():%Y-%m-%d %H:%M}\n\n## Log\n")
    return project


def find_project(ref: str, projects_dir: Path = PROJECTS) -> Path:
    """Accepts '01', '1', '01_AI_Agents' or a full path."""
    p = Path(ref)
    if p.is_dir():
        return p
    for d in sorted(projects_dir.glob("*")):
        m = re.match(r"(\d+)_", d.name)
        if d.is_dir() and (d.name == ref or (m and ref.isdigit() and int(m.group(1)) == int(ref))):
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
