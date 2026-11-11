"""capture stage: screenshot scenes with `params.url` and no screenshot file get the page captured by
headless Chrome as assets/scene_NNN.png (picked up by resolve like a dropped scene file).
A file the user dropped is never overwritten; work/captures.json remembers what was captured."""
import json
from pathlib import Path

from .chrome import screenshot
from .contracts import ScenePlan
from .project import atomic_write

WIDTH, HEIGHT = 1280, 2000  # tall, so long pages can scroll in the template


def capture(plan: ScenePlan, project: Path, log_file: Path, shoot=screenshot) -> dict[str, str]:
    done = json.loads(log_file.read_text("utf-8")) if log_file.exists() else {}
    folder = project / "assets"
    for s in plan.scenes:
        url = str(s.params.get("url") or "")
        if s.visual_type != "screenshot" or not url.startswith(("http://", "https://")):
            continue
        dest = folder / f"scene_{s.id:03d}.png"
        mine = done.get(str(s.id))
        if dest.exists() and (mine is None or mine == url):
            continue  # the user's own file, or already captured from this url
        folder.mkdir(parents=True, exist_ok=True)
        try:
            shoot(url, dest, WIDTH, HEIGHT)
            done[str(s.id)] = url
            print(f"    scene {s.id}: captured {url}")
        except Exception as e:  # noqa: BLE001 - offline/blocked page: resolve falls back as usual
            print(f"    scene {s.id}: capture failed ({type(e).__name__}: {str(e)[:120]})")
    atomic_write(log_file, json.dumps(done, indent=2))
    return done
