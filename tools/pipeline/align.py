"""Script alignment: when input/script.* exists, the script's words win and Whisper only gives the timing.

difflib matches normalised words. Matched words copy Whisper's timing; mismatched runs are spread
evenly over the Whisper time span they replace; script words the narrator skipped get squeezed
into the gap. Script text outside the spoken part (script longer than audio) is dropped.
"""
import re
import unicodedata
from difflib import SequenceMatcher

from .contracts import Transcript, Word

MIN_MATCH = 0.3  # below this share of Whisper words matched, the script is probably for another audio


def norm(w: str) -> str:
    """Lowercase, drop punctuation/symbols/format chars (ZWNJ). Keeps Telugu vowel signs."""
    return "".join(c for c in w.lower() if unicodedata.category(c)[0] not in "PSZC")


def script_words(text: str) -> list[str]:
    return [w for w in re.split(r"\s+", text) if norm(w)]


def _spread(words: list[str], start: float, end: float) -> list[Word]:
    step = (end - start) / len(words)
    return [Word(text=w, start=round(start + i * step, 3), end=round(start + (i + 1) * step, 3))
            for i, w in enumerate(words)]


def align(whisper: Transcript, script: str) -> Transcript:
    sw, ww = script_words(script), whisper.words
    ops = SequenceMatcher(None, [norm(w) for w in sw], [norm(w.text) for w in ww], autojunk=False).get_opcodes()
    matched = sum(j2 - j1 for tag, _, _, j1, j2 in ops if tag == "equal")
    if not ww or matched / len(ww) < MIN_MATCH:
        raise ValueError(f"script matches only {matched}/{len(ww)} spoken words; is it the right script?")

    spoken = [k for k, (tag, *_, j1, j2) in enumerate(ops) if j2 > j1]  # opcodes that touch audio
    first, last = spoken[0], spoken[-1]
    out: list[Word] = []
    for k, (tag, i1, i2, j1, j2) in enumerate(ops):
        if tag == "equal":
            out += [Word(text=sw[i1 + n], start=w.start, end=w.end, probability=w.probability)
                    for n, w in enumerate(ww[j1:j2])]
        elif tag == "replace":
            words = sw[i1:i2]
            # ponytail: edge replace may hold extra unspoken script; cap it to 2x the spoken words
            cap = 2 * (j2 - j1) + 2
            if k == last:
                words = words[:cap]
            elif k == first:
                words = words[-cap:]
            out += _spread(words, ww[j1].start, ww[j2 - 1].end)
        elif tag == "delete" and first < k < last:  # skipped by the narrator, inside the spoken part
            prev_end = out[-1].end if out else 0.0
            out += _spread(sw[i1:i2], prev_end, max(prev_end, ww[j1].start))
        # "insert" (Whisper-only words) and delete outside the spoken part are dropped
    return Transcript(language=whisper.language, duration=whisper.duration, source="script_aligned",
                      model=whisper.model, words=out)
