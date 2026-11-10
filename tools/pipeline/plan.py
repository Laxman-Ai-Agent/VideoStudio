"""plan stage: transcript -> work/scenes.json.

Claude writes scenes.json in-session (DECISIONS #5). This module only
1. writes work/plan_brief.md (everything Claude needs, in one small file), and
2. validates the scenes.json Claude wrote against the ScenePlan contract + the audio length.
"""
import json
from pathlib import Path

from .config import BRAND, ROOT
from .contracts import ScenePlan, Transcript
from .identity import memory_md
from .theme import CAPTION_STYLES, CAMERA, FONTS, PRESETS, TEXT_IN, TRANSITIONS

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
    font_list = sorted(d.name for d in FONTS.iterdir() if d.is_dir()) if FONTS.is_dir() else []
    out.write_text(f"""# Plan brief: {project.name}

1. Creative direction FIRST: write `theme.json` in the project folder (see "Creative direction" below).
2. Then `work/scenes.json` for this narration, then run `studio.cmd run {project.name[:2]}` again.

## Contract (tools/pipeline/contracts.py: ScenePlan, validated on the next run)
- Scenes back to back: first starts at 0, each starts where the previous ends, last ends at {transcript.duration:.2f}.
- ids 1..n. visual_type one of: photo, footage, screenshot, logo, chart, map, motion_graphic, diagram, text.
- on_screen_text: 0-4 words. `query`: concrete, searchable description of the visual (English).
- `asset`: a path from "Assets" below when one fits, else null.
- Cut at phrase boundaries. Aim for 2-4 s per scene.
- One plan is rendered in every format in brand.json (16:9 and 9:16): pick visuals whose subject survives a centre crop.
- Optional `params` (see tools/templates/*/template.json): chart `bars`/`number`/`source` (cited data only);
  timeline `events` [{{"date", "label"}}]; map `focus` (country/state name), `pin` {{"lat", "lon", "label"}}, `from`;
  screenshot `url` (captured automatically), `highlight` [x, y, w, h]; photo `parallax: true`; any scene `sfx`.
  Real people / brands: `entity` (exact name, e.g. "Sam Altman", "Anthropic") fetches the photo or logo for free.
  Template scenes: `lottie` (an emoji like "🚀") for an animated icon; `lines` (styles bold, plain, box, script, outline, `hero` = the one big word, optionally `italic`, `pill` = key phrase on a capsule; sizes s m l xl xxl; one hero word per screen), `items`, `rows` [{{"title", "items": [{{"icon": emoji, "label"}}]}}] (info card with icon tiles), `stat`, `quote` {{"text", "by", "role"}} (real quotes only), `meme` {{"lines": ["top caption", ...], "bg": "rays"|"plain"}} (sunburst + caption boxes; the person / meme overlays of the scene stand below, 1 or 2 side by side), `marker`, `marks` (types circle, underline, arrow, box, tag, and `callout` {{x,y,w,h,text,side}}: circle on a thing + a label beside it), `look`.

Example:
```json
{json.dumps(EXAMPLE, ensure_ascii=False, indent=1)}
```

## Creative direction (user rule 2026-11-10: every video gets its own look)
Listen to the topic, story and emotional tone, then design this video. Earlier videos are references to
stay AWAY from, never defaults: at most ~30% alike any of them (`studio.cmd theme NN` shows the score;
QA fails a final above it). Consistent inside this video, readable always, quality over effects.
`theme.json` = {{"preset": <closest of {", ".join(sorted(p.stem for p in PRESETS.glob("*.json")))}>, overrides:
 "fonts": {{"heading", "body", "hero", "script"}} (folders in _brand/fonts: {", ".join(font_list)}),
 "colors": {{"background", "text", "text2", "accent", "highlight", "panel", "capbg"}}, "background": {{"type": solid|linear|radial,
 "colors", "angle", "pattern": none|grid|dots|lines, "texture": none|grain|paper|smoke|particles|stars, ..._opacity}},
 "text": {{"heading_weight", "shadow": none|soft|hard|glow, "tracking", "scale"}},
 "motion": {{"text_in": {"|".join(sorted(TEXT_IN))}, "camera": {"|".join(sorted(CAMERA))},
            "transitions": [2-3 of {"|".join(sorted(TRANSITIONS))}] (subtle ones for normal story; flash/zoom only
            where the story needs drama, set per scene with `params.transition`)}},
 "captions": {{"style": {"|".join(sorted(CAPTION_STYLES))} (spoken word: colour box / highlighter / underline / colour pop;
            no card behind captions), "font": body|heading}},
 "direction": {{"topic", "tone", "look" (one line), "elements" (which visual kinds fit THIS topic, e.g. geopolitics:
            footage/maps/data; science: diagrams/2D animation; history: archival photos/maps; mystery: atmosphere,
            dramatic light; tech: UI, diagrams, futuristic motion; never force every technique), "avoid" (what the
            earlier videos already used), "notes"}}}}.
Then vary compositions per scene (layouts, `pan`/`zoom`, templates); no visual type 3x in a row.

### Earlier videos (style memory, newest first)
{memory_md(project, json.loads(brand).get("transitions", []))}

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
