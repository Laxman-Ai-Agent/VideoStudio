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
from .project import VARIATION, ref
from .theme import TITLE_STYLES, CAPTION_STYLES, CAMERA, FONTS, PRESETS, TEXT_IN, TRANSITIONS

RULES = ROOT / ".claude" / "skills" / "my-editor" / "rules.md"
END_SLACK = 1.0  # last scene must end within this many seconds of the audio end

EXAMPLE = {"schema_version": 1, "scenes": [
    {"id": 1, "start": 0.0, "end": 14.6, "narration": "<the sentences spoken in this sequence>",
     "visual_type": "motion_graphic", "query": "my_video_s01_hook", "on_screen_text": "", "asset": None,
     "notes": "written sequence code", "params": {"code": "my_video_s01_hook", "kit": "my_video_kit", "transition": "cut",
     "images": ["projects/NN/assets/originals/phone.jpg"], "beats": {"phone": 1.2, "wire": 3.4}}}]}


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
    if VARIATION.match(project.name):  # the topic's shared pool (03_Topic/assets/originals)
        assets += sorted("../" + p.relative_to(project.parent).as_posix()
                         for p in (project.parent / "assets").rglob("*") if p.is_file())
    lines = "\n".join(f"[{a:6.2f} - {b:6.2f}] {txt}" for a, b, txt in timed_lines(transcript))
    brand = (BRAND / "brand.json").read_text("utf-8") if (BRAND / "brand.json").exists() else "{}"
    font_list = sorted(d.name for d in FONTS.iterdir() if d.is_dir()) if FONTS.is_dir() else []
    out.write_text(f"""# Plan brief: {project.name}

1. Creative direction FIRST: write `theme.json` in the project folder (see "Creative direction" below).
2. Then `work/scenes.json` for this narration, then run `studio.cmd run {ref(project)}` again.

## Contract (tools/pipeline/contracts.py: ScenePlan, validated on the next run)
- Scenes back to back: first starts at 0, each starts where the previous ends, last ends at {transcript.duration:.2f}.
- ids 1..n. visual_type one of: photo, footage, screenshot, logo, chart, map, motion_graphic, diagram, text.
- on_screen_text: 0-4 words, ENGLISH only (highlight words; user 2026-11-10), also in `lines` / `kicker`; Telugu stays in the captions.
  Optional `params.kicker`: a small tracked label above a big title (e.g. "AI TOOLS").
  Titles mostly ONE size (whole phrase big); a small line + huge word (`lines` with m + xxl) only sometimes. `query`: concrete, searchable description of the visual (English).
- `asset`: null for a written sequence (its pictures go in `params.images`).
- Build the video as 15-20 SEQUENCES of 10-25 s (one written composition each, several sentences, elements carry
  across beats), not one clip per sentence. Storyboard first, one line per sequence: words -> pictures -> motion -> transition.
- STRICT (user 2026-11-11, `.claude/skills/my-editor/motion.md`): no stock templates. Each sequence gets fresh code:
  `params.code` = a new folder `tools/templates/<video>_<sNN>_<name>/` (index.html with HTML/CSS/GSAP + template.json),
  `params.images` = every picture / clip it shows (paths from the studio root; graded to the palette automatically),
  `params.beats` = {{name: seconds from the sequence start}} from the word times below (visuals land on the spoken word),
  optional `params.kit` = this video's shared motion kit folder (tokens + helpers), `params.transition: "cut"`
  (the code makes its own transitions). Real pictures in cards of every shape, text typed on the words, heavy smooth
  motion, little drawn 2D, no 3D. The stock templates (`lines`, `rows`, `stat`, `meme`, `iso`, ...) only when the user asks.
- Real people / brands: `entity` (exact name) fetches the photo or logo; charts / numbers only from cited data.

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
 "text": {{"heading_weight", "shadow": none|soft|hard|glow, "tracking", "scale", "title_style": {"|".join(sorted(TITLE_STYLES))}
          (big titles like type-specimen cards: split = light + heavy accent last word, italic = serif italic accent,
          shadow = hard accent offset, outline = hollow last word, caps)}},
 "motion": {{"text_in": {"|".join(sorted(TEXT_IN))}, "camera": {"|".join(sorted(CAMERA))},
            "transitions": [2-3 of {"|".join(sorted(TRANSITIONS))}] (subtle ones for normal story; flash/zoom only
            where the story needs drama, set per scene with `params.transition`)}},
 "captions": {{"style": {"|".join(sorted(CAPTION_STYLES))} (spoken word: colour box / highlighter / underline / colour pop;
            no card behind captions), "font": body|heading}},
 "direction": {{"topic", "tone", "look" (one line), "elements" (which visual kinds fit THIS topic, e.g. geopolitics:
            footage/maps/data; science: diagrams/2D animation; history: archival photos/maps; mystery: atmosphere,
            dramatic light; tech: UI, diagrams, futuristic motion; never force every technique), "avoid" (what the
            earlier videos already used), "notes"}}}}.
Then vary compositions per sequence (card shapes, splits, stacks, crops, chapter moves); one design system inside the video.
Read docs/STYLE.md "Visual storytelling and motion" first: topic identity, composition per line, elements staged on
the narration, scene-to-scene continuity (built vs not built is listed there; put wanted continuity moves in `notes`).

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
