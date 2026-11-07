import json

import pytest
from pydantic import ValidationError

from pipeline.contracts import ScenePlan, Transcript, Word
from pipeline.plan import timed_lines, validate, write_brief
from pipeline.project import new_project
from pipeline.storyboard import build_html


def _scene(i, start, end, vt="photo", text=""):
    return {"id": i, "start": start, "end": end, "narration": "x", "visual_type": vt, "query": "q",
            "on_screen_text": text}


def _transcript(duration=6.0):
    words = [Word(text=t, start=s, end=s + 0.4) for t, s in
             (("హాయ్...", 0.0), ("AI", 1.5), ("Agents", 2.0), ("అంటే", 2.5), ("ఏమిటి?", 3.0), ("చూద్దాం", 5.0))]
    return Transcript(language="te", duration=duration, source="whisper", model="m", words=words)


def test_valid_plan():
    plan = ScenePlan(scenes=[_scene(1, 0, 2.5), _scene(2, 2.5, 4, "chart", "10 లక్షల jobs"), _scene(3, 4, 6)])
    assert len(plan.scenes) == 3


@pytest.mark.parametrize("scenes, msg", [
    ([_scene(1, 0, 2), _scene(2, 2.5, 4, "chart")], "must start where"),
    ([_scene(1, 0, 2), _scene(3, 2, 4, "chart")], "1..n"),
    ([_scene(1, 1, 2)], "start at 0"),
    ([_scene(1, 0, 2), _scene(2, 2, 3), _scene(3, 3, 4)], "3 times in a row"),
    ([_scene(1, 0, 2, text="one two three four five")], "more than 4 words"),
    ([_scene(1, 2, 2)], "end must be after start"),
    ([_scene(1, 0, 2, vt="cartoon")], "visual_type"),
])
def test_plan_contract_rejects(scenes, msg):
    with pytest.raises(ValidationError, match=msg):
        ScenePlan(scenes=scenes)


def test_validate_checks_audio_length(tmp_path):
    f = tmp_path / "scenes.json"
    f.write_text(json.dumps({"scenes": [_scene(1, 0, 3), _scene(2, 3, 6, "chart")]}), "utf-8")
    assert validate(f, _transcript(6.0))
    with pytest.raises(ValueError, match="audio is"):
        validate(f, _transcript(20.0))


def test_timed_lines_break_on_pause_and_sentence_end():
    lines = timed_lines(_transcript())
    assert [t for *_, t in lines] == ["హాయ్...", "AI Agents అంటే ఏమిటి?", "చూద్దాం"]


def test_brief_has_narration_rules_and_contract(tmp_path):
    p = new_project("demo", tmp_path)
    (p / "assets" / "logos" / "openai.png").write_bytes(b"x")
    out = p / "work" / "plan_brief.md"
    write_brief(p, _transcript(), out)
    text = out.read_text("utf-8")
    assert "AI Agents అంటే ఏమిటి?" in text and "assets/logos/openai.png" in text
    assert "last ends at 6.00" in text and "visual_type" in text


def test_storyboard_html_escapes_and_lists_scenes():
    plan = ScenePlan(scenes=[_scene(1, 0, 2, text="<b>AI</b>"), _scene(2, 2, 4, "chart")])
    page = build_html(plan, "01_Demo", {"colors": {"accent": "#FFC400"}})
    assert "&lt;b&gt;AI&lt;/b&gt;" in page and "#2" in page and "#FFC400" in page


def test_repo_brand_json_matches_contract():
    from pipeline.config import BRAND
    from pipeline.contracts import Brand
    b = Brand.model_validate_json((BRAND / "brand.json").read_text("utf-8"))
    assert {"16:9", "9:16"} <= set(b.formats)
