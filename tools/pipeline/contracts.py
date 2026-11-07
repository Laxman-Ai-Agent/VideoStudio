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
