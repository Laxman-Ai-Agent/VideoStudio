"""align_mms helpers without the model: token cleanup and writing measured times back into the JSON."""
from pipeline.align_mms import apply, tokens, words_of

VOCAB = set("abcdefghijklmnopqrstuvwxyz'")


def test_tokens_keep_aligner_letters_and_fall_back_to_star():
    assert tokens("Mars,", str, VOCAB) == "mars"
    assert tokens("+", str, VOCAB) == "*"  # nothing alignable left
    assert tokens("2030lalo", str, VOCAB) == "lalo"  # digits are not in the MMS vocabulary


def test_apply_replaces_word_and_scene_times_keeps_text():
    doc = {"total_duration": 89.2, "scenes": [
        {"scene_id": 1, "start": 0.28, "end": 4.9, "text": "a b", "words": [{"word": "a", "start": 0.28, "end": 1}, {"word": "b", "start": 1, "end": 4.9}]},
        {"scene_id": 2, "start": 5.3, "end": 9.7, "text": "c", "words": [{"word": "c", "start": 5.3, "end": 9.7}]}]}
    apply(doc, [(0.16, 0.5), (0.6, 4.681), (5.22, 8.98)])
    assert [w["word"] for w in words_of(doc)] == ["a", "b", "c"]
    assert (doc["scenes"][0]["start"], doc["scenes"][0]["end"]) == (0.16, 4.68)
    assert (doc["scenes"][1]["start"], doc["total_duration"]) == (5.22, 8.98)
