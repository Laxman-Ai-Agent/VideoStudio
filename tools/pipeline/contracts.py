"""Module contracts: the ONLY shapes modules exchange through files.

Rules (docs/ARCHITECTURE.md, "Contracts"):
- Adding an optional field is safe.
- Removing/renaming a field or changing its meaning -> bump SCHEMA_VERSION and add a converter.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

SCHEMA_VERSION = 1


class StageRecord(BaseModel):
    status: Literal["done", "failed"]
    inputs_hash: str
    finished_at: datetime
    seconds: float
    error: str | None = None


class ProjectState(BaseModel):
    """work/state.json - checkpoint of every stage, used for resume."""
    schema_version: int = SCHEMA_VERSION
    stages: dict[str, StageRecord] = Field(default_factory=dict)


class Word(BaseModel):
    text: str
    start: float  # seconds from audio start
    end: float
    probability: float | None = None
    matched: bool | None = None  # script alignment: True = Whisper timing, False = interpolated


class Transcript(BaseModel):
    """work/transcript.json - written by the transcribe stage."""
    schema_version: int = SCHEMA_VERSION
    language: str
    duration: float
    source: Literal["whisper", "script_aligned"]
    model: str
    words: list[Word]


GAP = 0.05  # seconds of slack allowed between back-to-back scenes

VisualType = Literal["photo", "footage", "screenshot", "logo", "chart", "map",
                     "motion_graphic", "diagram", "text"]


class Scene(BaseModel):
    id: int                       # 1..n, in order
    start: float                  # seconds; scenes are back to back
    end: float
    narration: str                # what is said during this scene
    visual_type: VisualType
    query: str                    # what to find or generate ("Sam Altman on stage, 2024")
    on_screen_text: str = ""      # 1-4 words, empty for none
    asset: str | None = None      # project-relative path when a known asset fits
    notes: str = ""               # animation / framing hints for the render step
    params: dict = Field(default_factory=dict)  # template parameters (e.g. chart bars), see template.json

    @model_validator(mode="after")
    def _check(self):
        if self.end <= self.start:
            raise ValueError(f"scene {self.id}: end must be after start")
        if len(self.on_screen_text.split()) > 4:
            raise ValueError(f"scene {self.id}: on_screen_text is more than 4 words")
        return self


class ScenePlan(BaseModel):
    """work/scenes.json - written by Claude in-session from work/plan_brief.md, validated here."""
    schema_version: int = SCHEMA_VERSION
    scenes: list[Scene] = Field(min_length=1)

    @model_validator(mode="after")
    def _check(self):
        s = self.scenes
        if [x.id for x in s] != list(range(1, len(s) + 1)):
            raise ValueError("scene ids must be 1..n in order")
        if abs(s[0].start) > GAP:
            raise ValueError("first scene must start at 0")
        for a, b in zip(s, s[1:]):
            if abs(b.start - a.end) > GAP:
                raise ValueError(f"scene {b.id} must start where scene {a.id} ends ({a.end})")
        for a, b, c in zip(s, s[1:], s[2:]):
            if a.visual_type == b.visual_type == c.visual_type:
                raise ValueError(f"scenes {a.id}-{c.id}: same visual type 3 times in a row")
        return self


class OutputFormat(BaseModel):
    width: int
    height: int


class Brand(BaseModel):
    """_brand/brand.json - channel look. One scene plan is rendered once per format
    (per-format layout/safe areas live in the templates, not in scenes.json)."""
    schema_version: int = SCHEMA_VERSION
    formats: dict[Literal["16:9", "9:16", "1:1", "4:5"], OutputFormat] = Field(min_length=1)
    fps: int = 30
    colors: dict[str, str]
    fonts: dict[str, str]
    captions: bool = False        # word-by-word captions from work/transcript.json (bottom third)
    theme: str = "dark"           # key of `themes`: its colours override `colors` (e.g. "paper")
    themes: dict[str, dict[str, str]] = Field(default_factory=dict)
    transitions: list[str] = Field(default_factory=list)  # cycled per cut: blur|wipe|zoom|circle|cut; empty = hard cuts
    music_mood: str = ""          # _library/music/<mood>/ ; empty or missing folder = no music


# ---- Phase 2: assets -------------------------------------------------------

class AssetEntry(BaseModel):
    file: str                     # posix path, relative to the folder holding index.json
    kind: Literal["image", "video"]
    size: int
    mtime_ns: int                 # with size: skips re-hashing unchanged files
    duration: float = 0.0
    width: int = 0
    height: int = 0
    thumb: str = ""               # cached jpg, relative like `file`
    description: str = ""         # English keywords; Claude writes it from the contact sheet
    source_url: str = ""          # downloads only: where it came from (credits)
    license: str = ""
    author: str = ""
    query: str = ""               # downloads only: the scene query it answered


class AssetIndex(BaseModel):
    """assets/index.json and _library/index.json. Key = file content hash, so a renamed file
    keeps its description and a changed file gets a new one."""
    schema_version: int = SCHEMA_VERSION
    assets: dict[str, AssetEntry] = Field(default_factory=dict)


class ResolvedScene(BaseModel):
    id: int
    status: Literal["project", "library", "downloaded", "template", "missing"]
    asset: str | None = None      # posix, relative to the VideoStudio root
    asset_9x16: str | None = None  # optional vertical variant (scene_NNN_v.*)
    thumb: str | None = None      # relative to the root
    score: float = 0.0
    source_url: str = ""
    license: str = ""
    author: str = ""


class Resolved(BaseModel):
    """work/resolved.json - one asset (or missing/template) per scene, same order as scenes.json."""
    schema_version: int = SCHEMA_VERSION
    scenes: list[ResolvedScene]


# ---- Phase 3: render --------------------------------------------------------

class TemplateSpec(BaseModel):
    """tools/templates/<name>/template.json. Bump `version` when the look changes on purpose."""
    name: str
    version: int
    engine: Literal["hyperframes", "remotion"]
    visual_types: list[VisualType]
    params: dict[str, str] = Field(default_factory=dict)  # param name -> what it does
    description: str = ""


class SceneRender(BaseModel):
    id: int
    template: str
    status: Literal["rendered", "cached", "failed"]  # failed = placeholder clip was used
    key: str                      # cache key: scene + asset hash + template + brand + size
    seconds: float = 0.0
    error: str = ""


class RenderReport(BaseModel):
    """work/scenes/<format>/report.json - one clip per scene, same order as scenes.json."""
    schema_version: int = SCHEMA_VERSION
    format: str                   # "16:9"
    width: int
    height: int
    fps: int
    scenes: list[SceneRender]


# ---- Phase 4: prepare -------------------------------------------------------

class PreparedScene(BaseModel):
    id: int
    fg: str = ""                  # cut-out subject PNG with alpha, posix relative to the root
    bg: str = ""                  # photo with the subject area blurred out
    cut: str = ""                 # subject only, cropped tight to its outline (cutout_title template)
    error: str = ""               # set when the cut-out failed -> scene renders as a plain photo


class Prepared(BaseModel):
    """work/prepared/prepared.json - parallax layers for scenes with `params.parallax: true`."""
    schema_version: int = SCHEMA_VERSION
    scenes: list[PreparedScene] = Field(default_factory=list)


# ---- Phase 4: qa ------------------------------------------------------------

class QACheck(BaseModel):
    name: str                     # loudness | true_peak | black | freeze | duration | clips | placeholders
    status: Literal["ok", "warn", "fail"]
    detail: str = ""


class QAFile(BaseModel):
    file: str                     # assembled file, posix relative to the project
    passed: bool                  # no check failed
    checks: list[QACheck]


class QAReport(BaseModel):
    """work/qa.json - checks on the assembled videos of the last run. `--final` exports only
    files that passed; previews are always exported (QA result printed)."""
    schema_version: int = SCHEMA_VERSION
    mode: Literal["preview", "final"]
    files: list[QAFile]


# ---- per-video visual theme -------------------------------------------------

class ThemeSpec(BaseModel):
    """work/theme.json - one visual identity per video (theme stage, tools/pipeline/theme.py): text
    colours, fonts, text panels, background colour/gradient/pattern/texture, outline/shadow.
    Scene layouts, motion and transitions are NOT part of it."""
    schema_version: int = SCHEMA_VERSION
    name: str                     # preset it came from (tools/themes/<name>.json)
    category: str = ""
    source: str = "auto"          # auto (keywords) | manual (project theme.json) | brand (brand.json fallback)
    scores: dict[str, float] = Field(default_factory=dict)  # keyword hits per preset (auto)
    colors: dict[str, str]        # background text text2 accent highlight warning panel capbg
    fonts: dict[str, str]         # heading body script (folder names in _brand/fonts, or installed fonts)
    background: dict = Field(default_factory=dict)  # type colors angle pattern pattern_opacity texture texture_opacity
    text: dict = Field(default_factory=dict)        # heading_weight body_weight shadow tracking scale
    issues: list[str] = Field(default_factory=list)  # validation fallbacks that were applied


# ---- visual asset requirements (projects/NN/visual-assets.json) -----------------

AssetCategory = Literal["meme", "logo", "ai_image", "video_broll", "character_expression", "transparent_png",
                        "illustration", "infographic", "map", "reaction", "sticker", "photo", "screenshot", "other"]
AssetStatus = Literal["needed", "found_online", "found_local", "prompt_ready", "uploaded", "processed",
                      "validated", "failed"]


class AssetPrompt(BaseModel):
    text: str = ""                # ready to paste into ChatGPT / an image or video tool
    negative: str = ""            # what must NOT appear
    tool: str = ""                # e.g. "ChatGPT image", "any text-to-video"
    aspect_ratio: str = "16:9"
    resolution: str = "1920x1080"
    transparent: bool = False     # ask the tool for a transparent / plain background to cut out
    text_in_image: str = ""       # exact text to render inside the image, "" = no text at all
    style: str = ""               # one style line shared by the whole video (consistency)
    settings: dict = Field(default_factory=dict)  # recommended tool settings (quality, seed, duration ...)


class AssetOutput(BaseModel):
    format: Literal["png", "jpg", "webp", "mp4", "webm", "svg", "json"] = "png"
    width: int = 1920
    height: int = 1080
    transparent: bool = False
    min_width: int = 0            # smaller uploads are resized up but flagged low resolution


class AssetProcessing(BaseModel):
    remove_background: bool = False
    crop: list[float] | None = None          # [x, y, w, h] as fractions of the source image
    extract_from: str = ""                   # asset id of a composite image to cut this one out of (with `crop`)
    resize: bool = True                      # fit into output width x height (aspect kept)
    upscale_if_small: bool = True            # Lanczos (Pillow); no AI upscaler
    convert_to: str = ""                     # target format if different from the upload
    status: Literal["pending", "done", "failed", "not_needed"] = "pending"
    log: list[str] = Field(default_factory=list)


class AssetPlacement(BaseModel):
    """Overlays only: where the asset sits on top of its scene (fractions of the safe area)."""
    position: str = "center"      # center | left | right | top | bottom | top-left | top-right | bottom-left | bottom-right
    size: float = 0.4             # height as a fraction of the safe-area height
    at: float = 0.3               # seconds after the scene start
    until: float | None = None    # seconds after the scene start, None = to the end
    animation: str = "pop"        # pop | slide | float | fade | none


class VisualAsset(BaseModel):
    id: str                       # A001, A002 ... (stable; uploads are matched by this id)
    name: str
    description: str = ""
    category: AssetCategory
    subcategory: str = ""
    scenes: list[int] = Field(default_factory=list)
    timestamps: list[dict] = Field(default_factory=list)  # [{scene, start, end}] filled from scenes.json
    role: Literal["main", "overlay", "reference"] = "main"  # reference = character sheet, not shown itself
    placement: AssetPlacement = Field(default_factory=AssetPlacement)
    method: Literal["online", "real_logo", "ai_generate", "capture", "template", "local"] = "ai_generate"
    source_hint: str = ""         # entity name / search query / url for online, real_logo and capture
    character: str = ""           # id in `characters` (consistency across prompts)
    prompt: AssetPrompt = Field(default_factory=AssetPrompt)
    output: AssetOutput = Field(default_factory=AssetOutput)
    processing: AssetProcessing = Field(default_factory=AssetProcessing)
    status: AssetStatus = "needed"
    source_file: str = ""         # what was found / uploaded, posix relative to the project
    file: str = ""                # final processed file, posix relative to the project
    credits: dict = Field(default_factory=dict)  # source_url, license, author (online assets)
    validation: dict = Field(default_factory=lambda: {"status": "pending", "checks": []})
    notes: str = ""
    narration: str = ""           # exact narration words this visual belongs to (filled from the transcript)
    context: str = ""             # why the visual is there and what it tells the viewer
    prompt_original: str = ""     # the first prompt, kept when the prompt is edited
    media: "AssetMedia" = Field(default_factory=lambda: AssetMedia())
    pending_file: str = ""        # uploaded replacement waiting for confirmation (original upload)
    pending_preview: str = ""     # that replacement processed with the current media settings
    history: list[dict] = Field(default_factory=list)  # [{time, action, ...}] versions and edits


class AssetMedia(BaseModel):
    """User framing / trim of the uploaded media; the original upload is never changed."""
    aspect: str = ""              # "" = the output size; or "16:9" | "9:16" | "4:5" | "1:1"
    fit: Literal["fill", "fit"] = "fill"   # fill = crop to the aspect, fit = whole picture with padding
    crop_x: float = 0.5           # focus point of the crop, 0..1 of the source width (fill)
    crop_y: float = 0.5
    zoom: float = 1.0             # 1..3 (fill)
    trim_start: float = 0.0       # video: seconds into the upload
    trim_end: float | None = None  # video: None = to the end
    duration_required: float = 0.0  # the scene length (filled by sync)
    duration_source: float = 0.0  # length of the uploaded video
    source_w: int = 0
    source_h: int = 0
    out_w: int = 0
    out_h: int = 0


VisualAsset.model_rebuild()


class Character(BaseModel):
    id: str                       # C1, C2 ...
    name: str
    description: str              # fixed appearance text, repeated in every prompt that uses the character
    reference_asset: str = ""     # asset id of the reference sheet, if any


class VisualAssets(BaseModel):
    """projects/NN/visual-assets.json - every visual the video needs, one file per project.
    Claude writes assets + prompts in-session from work/assets_brief.md; pipeline/visual.py keeps
    timestamps, statuses, files, processing, validation and the summary up to date."""
    schema_version: int = SCHEMA_VERSION
    project: dict = Field(default_factory=dict)   # name, title, duration, formats, theme, updated
    summary: dict = Field(default_factory=dict)   # total, by_category, by_status, found, missing (computed)
    style: str = ""                               # one look line for all generated images (consistency)
    characters: list[Character] = Field(default_factory=list)
    assets: list[VisualAsset] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check(self):
        ids = [a.id for a in self.assets]
        dup = {i for i in ids if ids.count(i) > 1}
        if dup:
            raise ValueError(f"duplicate asset ids: {sorted(dup)}")
        known = {c.id for c in self.characters}
        for a in self.assets:
            if a.character and a.character not in known:
                raise ValueError(f"{a.id}: unknown character {a.character!r}")
        return self
