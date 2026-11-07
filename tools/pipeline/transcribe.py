"""transcribe stage: narration audio -> work/transcript.json (words + timings).

faster-whisper large-v3, int8 on CPU. Slow (minutes), so tests never call it:
they reuse tools/tests/fixtures/sample_30s/transcript.json.

One-time fixture refresh:
    tools\\.venv\\Scripts\\python.exe -m pipeline.transcribe tests\\fixtures\\sample_30s\\audio.wav tests\\fixtures\\sample_30s\\transcript.json
"""
import sys
from pathlib import Path

from .contracts import Transcript, Word

MODEL = "large-v3"


def transcribe(audio: Path, language: str = "te") -> Transcript:
    from faster_whisper import WhisperModel  # heavy import, only when actually transcribing

    model = WhisperModel(MODEL, device="cpu", compute_type="int8")
    segments, info = model.transcribe(str(audio), language=language, word_timestamps=True,
                                      vad_filter=True, beam_size=5)
    words = [Word(text=w.word.strip(), start=round(w.start, 3), end=round(w.end, 3),
                  probability=round(w.probability, 3))
             for seg in segments for w in (seg.words or []) if w.word.strip()]
    return Transcript(language=info.language, duration=round(info.duration, 3),
                      source="whisper", model=f"faster-whisper {MODEL} int8", words=words)


if __name__ == "__main__":
    from .config import setup_env
    from .project import atomic_write

    setup_env()
    t = transcribe(Path(sys.argv[1]))
    atomic_write(Path(sys.argv[2]), t.model_dump_json(indent=2))
    print(f"{len(t.words)} words, {t.duration}s")
