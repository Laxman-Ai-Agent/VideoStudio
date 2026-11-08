"""visual assets: projects/NN/visual-assets.json, the one file listing every visual the video needs.

Flow (docs/ARCHITECTURE.md, "Visual assets"):
1. `brief()` -> work/assets_brief.md. Claude reads the whole script in-session and writes
   visual-assets.json: assets by category, scenes, role (main / overlay / reference), method
   (online, real_logo, ai_generate, capture, template, local), exact ready-to-paste prompts,
   output size/format/transparency and processing needs. The run stops (exit 2) until it exists.
2. `sync()` keeps it current on every run (no network or model work for finished assets):
   timestamps from scenes.json, fixed rules (logos are never AI-generated), uploads matched by
   asset id (assets/generated/A012*.png, dropped as drop/A012.png), online collection through the
   resolve stage's own providers, processing (crop, extract from a composite, background removal,
   Lanczos resize, format), validation (size, transparency, aspect, video length), summary.
3. render uses `main_files()` (one main visual per scene, fed into resolve) and `overlays()`.
"""
import json
import re
from collections import Counter
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from .contracts import Resolved, ScenePlan, VisualAsset, VisualAssets
from .ingest import IMAGE
from .config import ROOT
from .project import atomic_write
from .visual_media import (ASPECTS, PROCESSED, _frame, _video, _video_seconds, check,  # noqa: F401
                           crop_window, is_transparent, out_size, process)

FILE = "visual-assets.json"
GENERATED = "assets/generated"     # uploads (drop/A012.png is moved here by ingest)
ID_FILE = re.compile(r"^(a\d{3,4})(?:[_\-. ].*)?$", re.I)
DONE = {"validated"}
FOUND = {"found_online", "found_local", "uploaded", "processed", "validated"}

# fallback prompts for a missing scene that the asset list does not cover (Claude normally covers all)
STYLE = {
    "photo": "Photorealistic documentary photograph: {q}. Natural light, realistic colors, 35 mm lens, "
             "shallow depth of field. No text, no logos, no watermark.",
    "footage": "Realistic cinematic stock video clip: {q}. One continuous shot, slow steady camera move, "
               "natural light, no cuts, no text, no watermark.",
    "screenshot": "Clean, realistic app/web screenshot: {q}. Crisp readable text, no personal data.",
}
GENERIC = "{q}. Clean, high quality, no watermark."


# ---- file io ----------------------------------------------------------------

def path(project: Path) -> Path:
    return project / FILE


def load(project: Path) -> VisualAssets | None:
    f = path(project)
    return VisualAssets.model_validate_json(f.read_text("utf-8")) if f.exists() else None


def save(project: Path, va: VisualAssets) -> None:
    atomic_write(path(project), va.model_dump_json(indent=2))


# ---- 1. brief for Claude --------------------------------------------------------

def presenter_rules(root: Path) -> str:
    """Brief lines for C1 = the user, with the photo in _brand/presenter/ when there is one."""
    photos = sorted(f for f in (root / "_brand" / "presenter").glob("*") if f.suffix.lower() in IMAGE)
    ref = f"_brand/presenter/{photos[0].name}" if photos else ""
    return (f'C1: name "Presenter (you)", reference_image "{ref or "(none yet: ask the user to put a photo in _brand/presenter/)"}", '
            'description = face, hair, beard, build only (from the photo), outfit = clothes for THIS video '
            '(new outfit per video, same in every shot of it). Every C1 prompt starts with: "Attach reference image: '
            f'{Path(ref).name or "<photo>"}. Keep this exact person\'s face, hair and beard." then the outfit word for word, '
            'the expression and pose (shock = hands on head, mouth open; pointing = arm out to one side; ...), '
            'half body (waist up) or full body, plain light grey background, transparent PNG. See docs/STYLE.md.')

def brief(project: Path, plan: ScenePlan, transcript_text: str, formats: dict, theme: dict | None,
          local_assets: list[str], out: Path) -> None:
    rows = "\n".join(f"| {s.id} | {s.start:.2f}-{s.end:.2f} | {s.visual_type} | {s.on_screen_text} | {s.query} | {s.narration} |"
                     for s in plan.scenes)
    sizes = ", ".join(f"{k} = {v['width']}x{v['height']}" for k, v in formats.items())
    th = f"{theme.get('name')} ({theme.get('category', '')}), colours {theme.get('colors', {})}" if theme else "default"
    have = "\n".join(f"- {a}" for a in local_assets) or "- (none)"
    presenter = presenter_rules(ROOT)
    example = {
        "project": {"name": project.name, "title": "..."}, "style": "one shared look line for every generated image",
        "characters": [{"id": "C1", "name": "Ravi", "description": "28-year-old Telugu man, short black hair, light "
                        "stubble, navy hoodie over white t-shirt, slim build, warm brown skin; same face in every image"}],
        "assets": [
            {"id": "A001", "name": "OpenAI logo", "category": "logo", "scenes": [3], "role": "overlay", "method": "real_logo",
             "source_hint": "OpenAI", "placement": {"position": "top-right", "size": 0.25, "at": 0.4, "animation": "pop"},
             "output": {"format": "png", "width": 800, "height": 800, "transparent": True}},
            {"id": "A002", "name": "Ravi shocked", "category": "character_expression", "scenes": [7], "role": "overlay",
             "method": "ai_generate", "character": "C1",
             "placement": {"position": "bottom-left", "size": 0.55, "at": 0.2, "animation": "slide"},
             "prompt": {"text": "Full prompt here: subject + C1 appearance repeated word for word + expression + pose + "
                                "camera + lighting + style + aspect + 'no text'. Transparent background (PNG with "
                                "alpha channel): only the subject. Avoid: text, watermark, extra fingers, second person.",
                        "tool": "ChatGPT image",
                        "aspect_ratio": "1:1", "resolution": "1024x1024", "transparent": True, "text_in_image": ""},
             "output": {"format": "png", "width": 1024, "height": 1024, "transparent": True},
             "processing": {"remove_background": True}},
        ]}
    out.write_text(f"""# Visual assets brief: {project.name}

Write `{FILE}` in the project folder (`projects/{project.name}/{FILE}`), then run `studio.cmd run {project.name[:2]}`.
Contract: tools/pipeline/contracts.py `VisualAssets` (validated on the next run). One file for the whole video.

## What to list
Read the whole script below and list EVERY visual that makes the video rich: as many as the content needs,
no fixed number, no forced categories. Each scene has exactly one `main` visual (role "main", or method
"template" when a text/chart/map/kinetic/cards template draws it) and any number of `overlay` assets
(stickers, logos, reactions, memes, character expressions, transparent PNGs) with a `placement`.
Character sheets that only keep faces consistent use role "reference".
Categories: meme, logo, ai_image, video_broll, character_expression, transparent_png, illustration,
infographic, map, reaction, sticker, photo, screenshot, other.

## Method per asset
- real_logo: company/product logos. ALWAYS the authentic logo (source_hint = exact name). Never ai_generate a logo.
- online: real people, real places, real events, stock photos/footage (source_hint = search words, or
  "entity:Exact Name" for a named person/brand). Give a prompt too when an AI version is an acceptable fallback.
- ai_generate: script-specific visuals that do not exist online. The prompt is what the user pastes.
- capture: a real web page (source_hint = url). template: drawn by a template, no file. local: a file in
  the project already (source_hint = its path from the list below).

## Prompt rules (ai_generate, and fallbacks)
Every prompt must be usable as-is, without rewriting:
1. main subject and what is happening; 2. facial expression and body pose; 3. character appearance: repeat
the `characters[].description` WORD FOR WORD when a character appears; 4. composition and camera angle,
framing, where the empty space for on-screen text is; 5. background (plain light grey / solid colour when
it will be cut out); 6. lighting and the shared `style` line; 7. aspect ratio and resolution; 8. when
`output.transparent` is true, say "transparent background (PNG with alpha channel)" in the prompt itself;
9. text inside the image: exact words or "no text"; 10. end with "Avoid: ..." listing what must not appear.
All of it goes in `prompt.text`, one copy-ready prompt; leave `prompt.negative` empty.
Video prompts (tools make at most 10 s) give: main subject, exact action, environment, camera movement,
subject movement, lighting, style, duration (scene length + 1 s, max 10 s; it is trimmed later), aspect,
composition, how the shot STARTS and how it ENDS, and that it is one continuous shot.
Memes / reactions: only where the narration has a matching moment; give the situation, subject, facial
expression, and the caption text with its placement and style, or "no text" when the image says it alone.
Every asset also gets `context`: one or two sentences on what situation it shows, why the scene needs it and
what the viewer should understand. (`narration` is filled from the transcript automatically.)
Keep 16:9 main visuals centred (they are centre-cropped for 9:16). Overlays: square or portrait, subject
fills the frame, transparent or plain background, `processing.remove_background: true`.
Cut-out treatments (placement, optional; docs/STYLE.md): `outline` \"white\" | \"accent\" (sticker edge), `bw` true
(black-and-white subject), `backdrop` \"glow\" | \"rings\" | \"rays\" (accent-colour shape behind the subject). Use them
on the hero cut-out of a scene (a person, an object); at most one treatment set per scene, same set across the video.
Presenter: the user appears in every video as character C1 (memes, reactions, pointing, explaining).
{presenter}
Several characters drawn in one image: list each as its own asset with `processing.extract_from` (the
composite's id) and `processing.crop` [x, y, w, h] fractions.

## Video
- Formats: {sizes}. Theme: {th}.
- Duration: {plan.scenes[-1].end:.2f} s, {len(plan.scenes)} scenes.

## Files already in the project (method "local")
{have}

## Scenes
| Scene | Time (s) | Visual type | On-screen text | Planned visual | Narration |
|---|---|---|---|---|---|
{rows}

## Full narration
{transcript_text}

## Example (shape only)
```json
{json.dumps(example, ensure_ascii=False, indent=1)}
```
""", "utf-8")


# ---- 2. sync --------------------------------------------------------------------

def _rel(p: Path, base: Path) -> str:
    return p.resolve().relative_to(base.resolve()).as_posix()


def _next_id(va: VisualAssets) -> str:
    n = max([int(m[1]) for a in va.assets if (m := re.match(r"A(\d+)$", a.id))] or [0]) + 1
    return f"A{n:03d}"


def find_upload(project: Path, aid: str) -> Path | None:
    d = project / GENERATED
    if not d.is_dir():
        return None
    hits = [f for f in sorted(d.iterdir()) if f.is_file() and (m := ID_FILE.match(f.stem)) and m[1].upper() == aid.upper()]
    return hits[-1] if hits else None  # the newest name sorts last when re-uploaded as A012_v2


def summary(va: VisualAssets) -> dict:
    st = Counter(a.status for a in va.assets)
    return {"total": len(va.assets), "by_category": dict(Counter(a.category for a in va.assets)),
            "by_status": dict(st), "by_method": dict(Counter(a.method for a in va.assets)),
            "found": sum(v for k, v in st.items() if k in FOUND),
            "missing": sum(v for k, v in st.items() if k not in FOUND),
            "to_generate": [a.id for a in va.assets if a.status == "prompt_ready"],
            "failed": [a.id for a in va.assets if a.status == "failed"]}


def narration_for(a: VisualAsset, start: float, end: float, words: list | None, scene_text: str) -> str:
    """The narration words this visual sits on: an overlay's own window (at .. until, or 2.5 s),
    a main visual's whole scene. Script words with Whisper timing; the scene text without a transcript."""
    if a.role == "overlay":
        lo = start + (a.placement.at or 0)
        hi = start + a.placement.until if a.placement.until else min(end, lo + 2.5)
    else:
        lo, hi = start, end
    picked = [w.text for w in (words or []) if lo <= (w.start + w.end) / 2 < hi]
    return " ".join(picked) if picked else scene_text


def sync(va: VisualAssets, project: Path, plan: ScenePlan, root: Path, resolved: Resolved | None = None,
         fetch: Callable | None = None, remove_bg: Callable | None = None, log=print,
         words: list | None = None) -> VisualAssets:
    """Bring every asset up to date. `fetch(asset) -> (abs_path, credits) | None` collects online assets
    (resolve's providers); `remove_bg(PIL.Image) -> PIL.Image` is rembg. Finished assets are not redone."""
    by_scene = {s.id: s for s in plan.scenes}
    res = {r.id: r for r in (resolved.scenes if resolved else [])}
    for a in va.assets:
        a.timestamps = [{"scene": i, "start": by_scene[i].start, "end": by_scene[i].end} for i in a.scenes if i in by_scene]
        if a.timestamps:
            t = a.timestamps[0]
            a.media.duration_required = round(t["end"] - t["start"], 3)
            if not a.narration:
                a.narration = narration_for(a, t["start"], t["end"], words, by_scene[t["scene"]].narration)
        if a.category == "logo" and a.method == "ai_generate":
            a.method = "real_logo"
            a.notes = (a.notes + " Logos are never AI-generated: switched to real_logo.").strip()
        unknown = [i for i in a.scenes if i not in by_scene]
        if unknown and "Unknown scene" not in a.notes:
            a.notes = (a.notes + f" Unknown scene(s) {unknown}.").strip()
    # missing scenes that no main asset covers get a fallback entry (with a template prompt)
    covered = {i for a in va.assets if a.role == "main" for i in a.scenes}
    for s in plan.scenes:
        r = res.get(s.id)
        if r and r.status == "missing" and s.id not in covered:
            video = s.visual_type == "footage"
            va.assets.append(VisualAsset(
                id=_next_id(va), name=f"Scene {s.id} main visual", description=s.query, scenes=[s.id], role="main",
                category="video_broll" if video else "ai_image", method="ai_generate",
                prompt={"text": (STYLE.get(s.visual_type, GENERIC).format(q=s.query) + (f" {va.style}" if va.style else "")
                                 + " Keep the main subject centred (it is also cropped to 9:16)."),
                        "aspect_ratio": "16:9", "resolution": "1920x1080", "tool": "any text-to-video" if video else "ChatGPT image"},
                output={"format": "mp4" if video else "png"}, notes="added automatically: the scene had no asset"))
            log(f"    added {va.assets[-1].id} for scene {s.id} (no asset covered it)")
    by_id = {a.id: a for a in va.assets}
    for a in va.assets:
        scene_len = max((t["end"] - t["start"] for t in a.timestamps), default=0)
        if a.method == "template":
            a.status, a.validation = "validated", {"status": "ok", "checks": ["drawn by a template"]}
            a.processing.status = "not_needed"
            continue
        if a.status in DONE and a.file and (project / a.file).exists():
            continue
        src, credits = None, {}
        up = find_upload(project, a.id)
        base = by_id.get(a.processing.extract_from) if a.processing.extract_from else None
        if base and (base.file or base.source_file) and (project / (base.source_file or base.file)).exists():
            src = project / (base.source_file or base.file)  # cut out of the composite's original
        elif up:
            src, a.status = up, "uploaded"
        elif a.source_file and (project / a.source_file).exists():
            src = project / a.source_file
        elif a.method == "local" and a.source_hint and (project / a.source_hint).exists():
            src, a.status = project / a.source_hint, "found_local"
        elif a.role == "main" and len(a.scenes) == 1 and (r := res.get(a.scenes[0])) and r.asset \
                and r.status in ("project", "library", "downloaded") and (root / r.asset).exists():
            src = root / r.asset  # the resolve stage already found this scene's visual
            a.status = "found_online" if r.status == "downloaded" else "found_local"
            credits = {"source_url": r.source_url, "license": r.license, "author": r.author} if r.source_url else {}
        elif a.method in ("online", "real_logo", "capture") and fetch and a.status == "needed":  # searched once
            try:
                got = fetch(a)
            except Exception as e:  # noqa: BLE001 - offline: falls back to the prompt
                got = None
                log(f"    {a.id}: online search failed ({type(e).__name__})")
            if got:
                src, credits = got
                a.status = "found_online"
        if src is None:
            a.status = "prompt_ready" if a.prompt.text else "needed"
            continue
        try:
            a.source_file = _rel(src, project)
        except ValueError:  # e.g. _library/downloads: keep it relative to the studio root
            a.source_file = "../../" + _rel(src, root)
        if credits:
            a.credits = credits
        try:
            dest, plog = process(a, src, project, remove_bg)
            a.file, a.processing.status, a.processing.log = _rel(dest, project), "done", plog
            a.status = "processed"
        except Exception as e:  # noqa: BLE001 - keep the upload, report the problem
            a.processing.status, a.processing.log = "failed", [f"{type(e).__name__}: {e}"]
            a.status, a.validation = "failed", {"status": "fail", "checks": [f"processing failed: {e}"]}
            continue
        a.validation = check(a, project / a.file, scene_len)
        a.status = "failed" if a.validation["status"] == "fail" else "validated"
    va.summary = summary(va)
    va.project = {**va.project, "name": project.name, "duration": plan.scenes[-1].end, "scenes": len(plan.scenes),
                  "updated": datetime.now().isoformat(timespec="seconds")}
    return va


# ---- 3. used by resolve / render --------------------------------------------------

def main_files(va: VisualAssets | None, project: Path) -> dict[int, Path]:
    """scene id -> validated main file (preferred by resolve over any search)."""
    out = {}
    for a in (va.assets if va else []):
        if a.role == "main" and a.status == "validated" and a.file and (project / a.file).exists():
            for i in a.scenes:
                out.setdefault(i, project / a.file)
    return out


def overlays(va: VisualAssets | None, project: Path) -> dict[int, list[tuple[Path, dict]]]:
    """scene id -> [(file, placement + kind)] for validated overlay images, in list order.
    kind = the asset category ("logo" overlays join the logo grid of a logo scene)."""
    out: dict[int, list] = {}
    for a in (va.assets if va else []):
        if a.role != "overlay" or a.status != "validated" or not a.file:
            continue
        f = project / a.file
        if f.exists() and f.suffix.lower() in IMAGE:
            for i in a.scenes:
                out.setdefault(i, []).append((f, {**a.placement.model_dump(), "kind": a.category,
                                                      **({"text": a.prompt.text_in_image} if a.subcategory == "text_sticker" and a.prompt.text_in_image else {})}))
    return out


def rembg_remover() -> Callable:
    """Background removal with the prepare stage's rembg model (loaded once, on first use)."""
    state = {}

    def remove(img):
        if "s" not in state:
            import os
            from .config import MODELS
            from .prepare import MODEL
            os.environ.setdefault("U2NET_HOME", str(MODELS / "rembg"))
            from rembg import new_session
            state["s"] = new_session(MODEL)
        from rembg import remove as rb
        return rb(img, session=state["s"])
    return remove
