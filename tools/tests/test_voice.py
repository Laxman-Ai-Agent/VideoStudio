"""voice.py: the approved narration chain (atempo first, strong bass, loudnorm) and file names."""
from pathlib import Path

import voice


def test_chain_and_names():
    c = voice.chain(1.15)
    assert c.startswith("atempo=1.15,") and "bass=g=7" in c and "rubberband" not in c
    assert not voice.chain(1.0).startswith("atempo")
    assert voice.out_name(Path("x/ai doctor.mp3"), 1.1).name == "ai doctor_1.10x.mp3"
