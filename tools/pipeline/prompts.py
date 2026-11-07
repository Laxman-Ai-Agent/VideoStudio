"""prompts stage: missing scenes -> prompts/{images,videos}/scene_NNN.md + prompts/README.md.

Each prompt names an exact "save as" file. Dropped into drop/, ingest sorts it into assets/ and
resolve maps scene_NNN.* straight to scene NNN (no description needed). Old prompt files are
removed on every run, so the folder lists only what is still missing.
"""
from pathlib import Path

from .contracts import Resolved, ScenePlan
from .project import atomic_write

STYLE = {
    "photo": "Photorealistic documentary photograph: {q}. Natural light, realistic colors, "
             "35 mm lens, shallow depth of field. No text, no logos, no watermark.",
    "footage": "Realistic cinematic stock video clip: {q}. One continuous shot, slow steady camera "
               "move, natural light, no cuts, no text, no watermark.",
    "screenshot": "Clean, realistic app/web screenshot: {q}. Crisp readable text, no personal data. "
                  "Best: capture the real product; generate only if that is not possible.",
    "logo": "{q}. Use the official logo files (company press kit or Wikimedia Commons), transparent "
            "PNG. Do not AI-generate brand logos.",
}
GENERIC = "{q}. Clean, high quality, no watermark."


def _md(s, need: str, folder: str, ext: str, formats: dict, project_name: str) -> str:
    sizes = "\n".join(f"- {k}: {v['width']}x{v['height']}" for k, v in formats.items())
    dur = s.end - s.start
    extra = (f"\n- Length: at least {dur + 1:.0f} s (scene is {dur:.1f} s)" if folder == "videos" else "")
    return f"""# Scene {s.id:03d} ({s.visual_type})

- Time: {s.start:.2f}–{s.end:.2f} s ({dur:.1f} s)
- Narration: {s.narration}
- On-screen text (added later, keep the area calm): {s.on_screen_text or '(none)'}
- Need: {need}{extra}

## Prompt
{STYLE.get(s.visual_type, GENERIC).format(q=s.query)}
Keep the main subject centered: the same file is center-cropped for 9:16.{f' Notes: {s.notes}' if s.notes else ''}

## Size
{sizes}
Make the 16:9 version. Optional separate vertical version: save it as `scene_{s.id:03d}_v{ext}`.

## Save as
`scene_{s.id:03d}{ext}` -> put it in `projects/{project_name}/drop/` and run `studio.cmd run` again.
"""


def write(plan: ScenePlan, res: Resolved, project: Path, formats: dict) -> list[Path]:
    root = project / "prompts"
    for old in root.glob("*/scene_*.md"):
        old.unlink()
    missing = {r.id for r in res.scenes if r.status == "missing"}
    written, rows = [], []
    for s in plan.scenes:
        if s.id not in missing:
            continue
        folder, ext = ("videos", ".mp4") if s.visual_type == "footage" else ("images", ".png")
        f = root / folder / f"scene_{s.id:03d}.md"
        atomic_write(f, _md(s, s.query, folder, ext, formats, project.name))
        written.append(f)
        rows.append(f"| {s.id} | {s.start:.1f}–{s.end:.1f}s | {s.visual_type} | {s.query} | "
                    f"`scene_{s.id:03d}{ext}` | [{folder}/{f.name}]({folder}/{f.name}) |")
    body = ("All scenes have an asset. Nothing to generate.\n" if not rows else
            f"{len(rows)} scene(s) need a file. Generate each, save it with the exact name, drop it in "
            f"`projects/{project.name}/drop/`, then run `studio.cmd run` again.\n\n"
            "| Scene | Time | Type | Need | Save as | Prompt |\n|---|---|---|---|---|---|\n" + "\n".join(rows) + "\n")
    atomic_write(root / "README.md", f"# Missing assets\n\n{body}")
    return written
