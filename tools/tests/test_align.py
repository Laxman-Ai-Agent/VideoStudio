import pytest

from pipeline.align import align, norm
from pipeline.config import FIXTURE
from pipeline.contracts import Transcript, Word

SCRIPT_FILE = FIXTURE / "script.txt"  # opening of the user's script for the sample


def _whisper(*words):
    return Transcript(language="te", duration=10.0, source="whisper", model="m",
                      words=[Word(text=t, start=i, end=i + 0.8) for i, t in enumerate(words)])


def test_norm_keeps_telugu_vowel_signs_and_drops_punctuation_and_zwnj():
    assert norm("చూసాం.") == "చూసాం"
    assert norm("ChatGPT,") == "chatgpt"
    assert norm("ఏ‌ఐ") == "ఏఐ"


def test_script_words_win_whisper_timing_kept():
    w = _whisper("మనం", "AI", "క్వేష్యన", "అడిగితే")
    t = align(w, "మనం AI question అడిగితే. ఇంకా చాలా ఉంది తర్వాత")
    assert [x.text for x in t.words] == ["మనం", "AI", "question", "అడిగితే."]
    assert t.source == "script_aligned"
    assert (t.words[1].start, t.words[2].start, t.words[3].end) == (1, 2, 3.8)


def test_skipped_script_words_squeezed_between_neighbours():
    t = align(_whisper("ఒకటి", "రెండు", "నాలుగు", "ఐదు"), "ఒకటి రెండు మూడు నాలుగు ఐదు")
    assert [x.text for x in t.words] == ["ఒకటి", "రెండు", "మూడు", "నాలుగు", "ఐదు"]
    assert t.words[1].end <= t.words[2].start <= t.words[2].end <= t.words[3].start


def test_wrong_script_is_refused():
    with pytest.raises(ValueError, match="right script"):
        align(_whisper("ఒకటి", "రెండు", "మూడు"), "completely different text here")


@pytest.mark.skipif(not SCRIPT_FILE.exists(), reason="fixture script missing")
def test_cached_sample_aligns_to_script():
    """Uses the cached Whisper output. Never re-runs Whisper."""
    w = Transcript.model_validate_json((FIXTURE / "transcript.json").read_text("utf-8"))
    t = align(w, SCRIPT_FILE.read_text("utf-8"))
    text = " ".join(x.text for x in t.words)
    assert text.startswith("హాయ్... ఇప్పటివరకు మనం AI అంటే question")
    assert "ChatGPT," in text and "మారిపోయింది." in text
    starts = [x.start for x in t.words]
    assert starts == sorted(starts) and t.words[-1].end <= w.duration


def test_gemini_json_gives_words_only(tmp_path):
    from pipeline.align import script_text
    f = tmp_path / "script.json"
    f.write_text('{"file_name": "a.wav", "total_duration_ms": 9000, "words": ['
                 '{"word": "మనం", "start_ms": 0, "end_ms": 400}, {"word": "AI", "start_ms": 400, "end_ms": 900}]}',
                 "utf-8")
    assert script_text(f) == "మనం AI"


def test_cached_sample_aligns_gemini_text_with_whisper_timing():
    """Gemini text + cached large-v3 timing. Never re-runs Whisper."""
    w = Transcript.model_validate_json((FIXTURE / "transcript.json").read_text("utf-8"))
    gemini = (FIXTURE / "script_gemini.txt").read_text("utf-8")
    t = align(w, gemini)
    got = [x.text for x in t.words]
    assert got[:8] == "Hi ఇప్పటివరకు మనం AI అంటే question అడిగితే answer".split()
    assert "Companies" in got and "impact" in got
    companies = t.words[got.index("Companies")]
    assert 13.0 < companies.start < 14.5        # Whisper's time (13.8 s), not Gemini's 19-21 s
    starts = [x.start for x in t.words]
    assert starts == sorted(starts) and t.words[-1].end <= w.duration


def test_coverage_check_catches_dropped_speech():
    from pipeline.transcribe import check_coverage
    ok = Transcript.model_validate_json((FIXTURE / "transcript.json").read_text("utf-8"))
    check_coverage(ok)
    lost = ok.model_copy(update={"words": [w for w in ok.words if w.start < 7.5]})  # the real 7-30 s loss
    with pytest.raises(ValueError, match="no words for"):
        check_coverage(lost)


def test_interpolated_words_are_flagged_and_long_unanchored_span_fails():
    t = align(_whisper("ఒకటి", "రెండు", "నాలుగు", "ఐదు"), "ఒకటి రెండు మూడు నాలుగు ఐదు")
    assert [x.matched for x in t.words] == [True, True, False, True, True]
    far = Transcript(language="te", duration=30.0, source="whisper", model="m", words=[
        Word(text="ఒకటి", start=0, end=1), Word(text="రెండు", start=1, end=2),
        Word(text="xx", start=5, end=6), Word(text="మూడు", start=20, end=21)])
    with pytest.raises(ValueError, match="no script word matched"):
        align(far, "ఒకటి రెండు ఏదో మూడు")


def test_transcribe_checked_retries_until_coverage_ok(monkeypatch):
    import pipeline.transcribe as tr
    good = Transcript.model_validate_json((FIXTURE / "transcript.json").read_text("utf-8"))
    bad = good.model_copy(update={"words": good.words[:5]})
    results = iter([bad, good])
    monkeypatch.setattr(tr, "transcribe", lambda *a, **k: next(results))
    assert tr.transcribe_checked(FIXTURE / "audio.wav", attempts=3) is good
    monkeypatch.setattr(tr, "transcribe", lambda *a, **k: bad)
    with pytest.raises(ValueError, match="no words for"):
        tr.transcribe_checked(FIXTURE / "audio.wav", attempts=2)
