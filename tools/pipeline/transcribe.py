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


def transcribe(audio: Path, language: str = "te", model_size: str = MODEL, **options) -> Transcript:
    """options override the decode settings below (benchmarks); prompt= biases toward the script."""
    from faster_whisper import WhisperModel  # heavy import, only when actually transcribing

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    settings = dict(language=language, word_timestamps=True, vad_filter=True, beam_size=5,
                    # large-v3 loops on Telugu (repeated a sentence, lost 14 s of
                    # the sample) when it conditions on its own previous text
                    condition_on_previous_text=False,
                    hallucination_silence_threshold=2.0)
    settings.update(options)
    segments, info = model.transcribe(str(audio), **settings)
    words = [Word(text=w.word.strip(), start=round(w.start, 3), end=round(w.end, 3),
                  probability=round(w.probability, 3))
             for seg in segments for w in (seg.words or []) if w.word.strip()]
    return Transcript(language=info.language, duration=round(info.duration, 3),
                      source="whisper", model=f"faster-whisper {model_size} int8", words=words)


MAX_GAP = 4.0  # seconds without a word that we treat as "Whisper lost speech", not a pause


def check_coverage(t: Transcript, max_gap: float = MAX_GAP) -> None:
    """Raise when Whisper silently dropped speech (seen on Telugu: 7-30 s of a 30 s clip missing)."""
    edges = [0.0] + [x for w in t.words for x in (w.start, w.end)] + [t.duration]
    holes = [(a, b) for a, b in zip(edges[::2], edges[1::2]) if b - a > max_gap]
    if not t.words or holes:
        where = ", ".join(f"{a:.1f}-{b:.1f}s" for a, b in holes) or "everything"
        raise ValueError(f"Whisper returned no words for {where}. Check the audio there "
                         f"(music/silence?) and the Whisper settings (DECISIONS.md).")


if __name__ == "__main__":
    from .config import setup_env
    from .project import atomic_write

    setup_env()
    t = transcribe(Path(sys.argv[1]), model_size=sys.argv[3] if len(sys.argv) > 3 else MODEL)
    atomic_write(Path(sys.argv[2]), t.model_dump_json(indent=2))
    print(f"{len(t.words)} words, {t.duration}s")
