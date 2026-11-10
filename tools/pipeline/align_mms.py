r"""Timing correction for a word-timed JSON (e.g. Gemini) with Meta's MMS forced aligner.

The text of the JSON is kept as it is; only `start` / `end` of every word (and of every scene) are
replaced with times measured on the audio. Words are romanised with uroman, so Telugu and English
words in one sentence both align.

    tools\.venv\Scripts\python.exe -m pipeline.align_mms audio.wav gemini.json corrected.json

Model: torchaudio MMS_FA (CC-BY-NC 4.0, non-commercial: the user's own experiments only).
Optional dependency group `align` (torch, torchaudio, uroman); the main pipeline does not need it.
"""
import json
import subprocess
import sys
from pathlib import Path

SR = 16000
CHUNK_S = 30  # seconds of audio per model pass


def words_of(doc: dict) -> list[dict]:
    """Every word dict of a Gemini-style JSON, in order ({"scenes": [{"words": [...]}]} or {"words": [...]})."""
    return [w for s in doc["scenes"] for w in s["words"]] if "scenes" in doc else list(doc["words"])


def tokens(word: str, romanize, vocab: set[str]) -> str:
    """Romanised word reduced to the aligner's letters; '*' (unknown) when nothing is left (e.g. '+')."""
    t = "".join(c for c in romanize(word).lower() if c in vocab)
    return t or "*"


def apply(doc: dict, times: list[tuple[float, float]]) -> dict:
    """Write measured (start, end) into the words, then scene start/end from their first and last word."""
    ws = words_of(doc)
    if len(ws) != len(times):
        raise ValueError(f"{len(ws)} words but {len(times)} timings")
    for w, (a, b) in zip(ws, times):
        w["start"], w["end"] = round(a, 2), round(b, 2)
    for s in doc.get("scenes", []):
        if s["words"]:
            s["start"], s["end"] = s["words"][0]["start"], s["words"][-1]["end"]
    if "scenes" in doc and doc["scenes"]:
        doc["total_duration"] = doc["scenes"][-1]["end"]
    return doc


def load_audio(path: Path):
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def chunked_emission(model, wav, step: int):
    """Model emission of wav (1, samples) computed in windows of `step` samples, joined on the time axis."""
    import torch
    return torch.cat([model(wav[:, i:i + step])[0] for i in range(0, wav.shape[1], step)], dim=1)


def align(audio: Path, texts: list[str]) -> list[tuple[float, float]]:
    """(start, end) seconds per word, measured on the audio."""
    import torch
    import torchaudio
    import uroman

    bundle = torchaudio.pipelines.MMS_FA
    model, tokenizer, aligner = bundle.get_model(), bundle.get_tokenizer(), bundle.get_aligner()
    vocab = set(bundle.get_dict()) - {"-"}
    ur = uroman.Uroman()
    toks = [tokens(t, ur.romanize_string, vocab) for t in texts]
    wav = torch.from_numpy(load_audio(audio)).unsqueeze(0)
    # attention memory grows with length squared: 266 s in one pass needed ~11 GB and crashed, so the
    # emission is computed per CHUNK_S window and joined (one forced alignment over the whole file)
    with torch.inference_mode():
        emission = chunked_emission(model, wav, CHUNK_S * SR)
    spans = aligner(emission[0], tokenizer(toks))
    sec = wav.shape[1] / emission.shape[1] / SR
    return [(sp[0].start * sec, sp[-1].end * sec) for sp in spans]


def main(audio: str, src: str, out: str) -> None:
    from .config import setup_env
    setup_env()  # TORCH_HOME on E: (model cache)
    doc = json.loads(Path(src).read_text("utf-8"))
    old = [(w["start"], w["end"]) for w in words_of(doc)]
    times = align(Path(audio), [w["word"] for w in words_of(doc)])
    apply(doc, times)
    Path(out).write_text(json.dumps(doc, ensure_ascii=False, indent=2), "utf-8")
    shift = [abs(o[0] - n[0]) for o, n in zip(old, times)]
    print(f"{len(times)} words aligned; old timings were off by {sum(shift) / len(shift):.2f} s on average, "
          f"max {max(shift):.2f} s -> {out}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
