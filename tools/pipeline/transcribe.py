"""transcribe stage: narration audio -> work/transcript.json (words + timings).

faster-whisper large-v3, int8 on CPU. Slow (minutes), so tests never call it:
they reuse tools/tests/fixtures/sample_30s/transcript.json.

One-time fixture refresh:
    tools\\.venv\\Scripts\\python.exe -m pipeline.transcribe tests\\fixtures\\sample_30s\\audio.wav tests\\fixtures\\sample_30s\\transcript.json [model]
"""
import sys
from pathlib import Path

from .contracts import Transcript, Word

MODEL = "large-v3"  # default; any faster-whisper size works (benchmark in DECISIONS.md)


def transcribe(audio: Path, language: str = "te", model_size: str = MODEL) -> Transcript:
    from faster_whisper import WhisperModel  # heavy import, only when actually transcribing

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(str(audio), language=language, word_timestamps=True,
                                      vad_filter=True, beam_size=5,
                                      # large-v3 loops on Telugu (repeated a sentence, lost 14 s of
                                      # the sample) when it conditions on its own previous text
                                      condition_on_previous_text=False,
                                      hallucination_silence_threshold=2.0)
    words = [Word(text=w.word.strip(), start=round(w.start, 3), end=round(w.end, 3),
                  probability=round(w.probability, 3))
             for seg in segments for w in (seg.words or []) if w.word.strip()]
    return Transcript(language=info.language, duration=round(info.duration, 3),
                      source="whisper", model=f"faster-whisper {model_size} int8", words=words)


if __name__ == "__main__":
    from .config import setup_env
    from .project import atomic_write

    setup_env()
    t = transcribe(Path(sys.argv[1]), model_size=sys.argv[3] if len(sys.argv) > 3 else MODEL)
    atomic_write(Path(sys.argv[2]), t.model_dump_json(indent=2))
    print(f"{len(t.words)} words, {t.duration}s")
