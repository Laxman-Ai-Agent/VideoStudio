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
