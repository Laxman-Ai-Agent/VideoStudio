"""Module contracts: the ONLY shapes modules exchange through files.

Rules (docs/ARCHITECTURE.md, "Contracts"):
- Adding an optional field is safe.
- Removing/renaming a field or changing its meaning -> bump SCHEMA_VERSION and add a converter.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

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
