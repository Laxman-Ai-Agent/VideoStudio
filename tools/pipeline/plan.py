"""plan stage: transcript -> work/scenes.json.

Claude writes scenes.json in-session (DECISIONS #5). This module only
1. writes work/plan_brief.md (everything Claude needs, in one small file), and
2. validates the scenes.json Claude wrote against the ScenePlan contract + the audio length.
"""
import json
from pathlib import Path

from .config import BRAND, ROOT
from .contracts import ScenePlan, Transcript

RULES = ROOT / ".claude" / "skills" / "my-editor" / "rules.md"
END_SLACK = 1.0  # last scene must end within this many seconds of the audio end

EXAMPLE = {"schema_version": 1, "scenes": [
    {"id": 1, "start": 0.0, "end": 3.2, "narration": "<words spoken in this scene>",
     "visual_type": "photo", "query": "ChatGPT app open on a phone", "on_screen_text": "ChatGPT",
     "asset": None, "notes": "slow zoom in"}]}


def timed_lines(t: Transcript, max_words: int = 12, pause: float = 0.6) -> list[tuple[float, float, str]]:
    """Group words into short lines, breaking at pauses, sentence ends or max_words."""
    lines, cur = [], []
    for i, w in enumerate(t.words):
        cur.append(w)
        nxt = t.words[i + 1] if i + 1 < len(t.words) else None
        if (nxt is None or nxt.start - w.end >= pause or len(cur) >= max_words
                or w.text.endswith((".", "?", "!", "।", ","))):
            lines.append((cur[0].start, cur[-1].end, " ".join(x.text for x in cur)))
            cur = []
    return lines


def write_brief(project: Path, transcript: Transcript, out: Path) -> None:
    assets = sorted(p.relative_to(project).as_posix() for p in (project / "assets").rglob("*") if p.is_file())
    lines = "\n".join(f"[{a:6.2f} - {b:6.2f}] {txt}" for a, b, txt in timed_lines(transcript))
    brand = (BRAND / "brand.json").read_text("utf-8") if (BRAND / "brand.json").exists() else "{}"
    out.write_text(f"""# Plan brief: {project.name}

Write `work/scenes.json` for this narration, then run `studio.cmd run {project.name[:2]}` again.

## Contract (tools/pipeline/contracts.py: ScenePlan, validated on the next run)
- Scenes back to back: first starts at 0, each starts where the previous ends, last ends at {transcript.duration:.2f}.
- ids 1..n. visual_type one of: photo, footage, screenshot, logo, chart, map, motion_graphic, diagram, text.
- on_screen_text: 0-4 words. `query`: concrete, searchable description of the visual (English).
- `asset`: a path from "Assets" below when one fits, else null.
- Cut at phrase boundaries. Aim for 2-4 s per scene.

Example:
```json
{json.dumps(EXAMPLE, ensure_ascii=False, indent=1)}
```

## Editing rules
{RULES.read_text("utf-8") if RULES.exists() else "(none)"}

## Brand
```json
{brand}
```

## Assets
{chr(10).join("- " + a for a in assets) or "(none yet)"}

## Narration ({transcript.source}, {transcript.duration:.2f} s)
{lines}
""", encoding="utf-8")


def validate(scenes_path: Path, transcript: Transcript) -> ScenePlan:
    plan = ScenePlan.model_validate_json(scenes_path.read_text("utf-8"))
    last = plan.scenes[-1].end
    if abs(last - transcript.duration) > END_SLACK:
        raise ValueError(f"last scene ends at {last}, audio is {transcript.duration} s long")
    return plan
