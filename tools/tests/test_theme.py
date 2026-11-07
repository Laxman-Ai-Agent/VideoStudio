"""Per-video theme: auto pick, manual preset + overrides, validation fallbacks, render wiring."""
import json

from pipeline import render as rnd
from pipeline import theme as th
from pipeline.contracts import Brand, Resolved, ResolvedScene, ScenePlan

TABLE = {
    "tech": {"keywords": ["ai", "robot", "టెక్నాలజీ"], "colors": {"background": "#0B1426", "text": "#EAF2FF", "accent": "#22D3EE"},
             "fonts": {"heading": "Anek Telugu", "body": "Hind Guntur", "script": "Akaya Telivigala"},
             "background": {"type": "linear", "colors": ["#0B1426", "#132544"], "texture": "particles", "texture_opacity": 0.3}},
    "history": {"keywords": ["king", "చరిత్ర", "రాజు"], "colors": {"background": "#EFE3C8", "text": "#3B2A1A", "accent": "#A0522D"},
                "fonts": {"heading": "Ramaraja", "body": "Noto Serif Telugu"}, "background": {"type": "radial"}},
    "documentary": {"keywords": [], "colors": {"background": "#14161B", "text": "#F4F1EA"}, "fonts": {"body": "Noto Sans Telugu"}},
}


def _fonts(tmp_path, *names):
    for n in names:
        (tmp_path / n).mkdir(parents=True)
        (tmp_path / n / "x.ttf").write_bytes(b"x")
    return tmp_path


def test_auto_pick_from_english_and_telugu_words():
    assert th.classify("AI robot AI agents", TABLE)[0] == "tech"
    assert th.classify("ఈ చరిత్రలో రాజు గారి కథ", TABLE)[0] == "history"  # Telugu suffixes still match
    assert th.classify("hello world", TABLE)[0] == "documentary"  # too few hits -> default


def test_manual_preset_overrides_and_safe_fallbacks(tmp_path):
    fonts = _fonts(tmp_path / "fonts", "Hind Guntur", "Noto Sans Telugu")
    t = th.build("AI robot", {"preset": "history", "colors": {"accent": "#C00000", "warning": "red!"},
                              "background": {"texture": "lava"}}, TABLE, fonts)
    assert t.name == "history" and t.source == "manual"
    assert t.colors["accent"] == "#C00000" and t.colors["warning"] == th.DEFAULT_COLORS["warning"]  # bad value -> default
    assert t.background["texture"] == "none" and t.background["type"] == "radial"
    assert t.fonts["body"] == "Noto Sans Telugu"  # Noto Serif Telugu is not in this fonts folder
    assert any("lava" in i for i in t.issues) and any("Noto Serif Telugu" in i for i in t.issues)


def test_low_contrast_text_is_fixed():
    spec = th.ThemeSpec(name="x", colors={"background": "#FFFFFF", "text": "#EEEEEE", "accent": "#FFFF00"}, fonts={})
    t = th.validate(spec)
    assert th.contrast(t.colors["text"], "#FFFFFF") >= 4.5 and th.contrast(t.colors["accent"], "#FFFFFF") >= 3.0
    assert any("contrast" in i for i in t.issues)


def test_render_uses_the_video_theme(tmp_path):
    brand = Brand(formats={"16:9": {"width": 1920, "height": 1080}}, colors={"background": "#000000", "accent": "#FFC400",
                  "text": "#FFFFFF"}, fonts={"telugu": "Gidugu", "latin": "Gidugu"})
    plan = ScenePlan(scenes=[{"id": 1, "start": 0, "end": 1, "narration": "x", "visual_type": "text", "query": "q",
                              "on_screen_text": "AI"}])
    res = Resolved(scenes=[ResolvedScene(id=1, status="template")])
    t = th.build("AI robot", None, TABLE, _fonts(tmp_path / "f", "Hind Guntur"))
    a = rnd.plan_jobs(plan, res, brand, "16:9", tmp_path, tmp_path / "o", False)[0]
    b = rnd.plan_jobs(plan, res, brand, "16:9", tmp_path, tmp_path / "o", False, theme=t)[0]
    assert a.key != b.key  # another theme = another clip
    rnd.build(b, tmp_path / "build", b.template)
    scene = json.loads((tmp_path / "build" / "scene.json").read_text("utf-8"))
    assert scene["theme"] == "tech" and scene["colors"]["background"] == "#0B1426"
    assert scene["style"]["background"]["texture"] == "particles" and scene["fonts"]["telugu"] == "Hind Guntur"


def test_shipped_presets_validate_cleanly():
    for name in th.presets():
        t = th.build("", {"preset": name})
        assert not [i for i in t.issues if "not found" in i or "not a valid" in i or "unsupported" in i], (name, t.issues)
