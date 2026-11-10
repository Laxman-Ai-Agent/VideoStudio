"""Creative direction (2026-11-10): motion in the theme, style memory, distinct look, variety, small captions."""
import re

from pipeline import identity as idt
from pipeline import render as rnd
from pipeline import theme as th
from pipeline.config import TOOLS
from pipeline.contracts import Brand, ScenePlan, ThemeSpec

A = ThemeSpec(name="tech", colors={"background": "#0B1426", "accent": "#22D3EE"},
              fonts={"heading": "Anek Telugu", "body": "Hind Guntur"},
              background={"type": "linear", "pattern": "grid", "texture": "particles"}, text={"shadow": "soft"})
B = ThemeSpec(name="paper", colors={"background": "#F2EEE6", "accent": "#E03A2F"},
              fonts={"heading": "DM Serif Display", "body": "Mandali", "hero": "Bebas Neue"},
              background={"type": "solid", "pattern": "none", "texture": "paper"}, text={"shadow": "none"},
              motion={"text_in": "mask", "camera": "push", "transitions": ["dip", "slide"]})
BT = ["blur", "wipe", "zoom"]
BRAND = Brand(formats={"16:9": {"width": 1920, "height": 1080}}, colors={}, fonts={})


def _plan(types, trans=None):
    return ScenePlan(scenes=[{"id": i + 1, "start": i, "end": i + 1, "narration": "x", "visual_type": t, "query": "q",
                              "on_screen_text": "", "params": {"transition": trans[i]} if trans and i else {}}
                             for i, t in enumerate(types)])


def test_same_look_scores_high_and_a_new_direction_scores_low():
    assert idt.similarity(A, A, BT)[0] == 1.0
    score, shared = idt.similarity(A, B, BT)
    assert score <= idt.MAX_SIMILAR and "heading font" not in shared


def test_previous_videos_are_the_style_memory(tmp_path):
    for name, t in (("01_a", A), ("02_b", B), ("03_c", None)):
        (tmp_path / name / "work").mkdir(parents=True)
        if t:
            (tmp_path / name / "work" / "theme.json").write_text(t.model_dump_json(), "utf-8")
    me = tmp_path / "03_c"
    assert [n for n, _ in idt.previous(me)] == ["02_b", "01_a"]
    assert "Mandali" in idt.memory_md(me, BT)
    assert idt.identity_check(me, A, BT).status == "warn"           # same as 01_a
    assert idt.identity_check(me, A, BT, final=True).status == "fail"
    new = B.model_copy(update={"fonts": {"heading": "Oswald", "body": "Mallanna"}, "colors": {"background": "#2A0E0E",
                       "accent": "#9BE15D"}, "motion": {"text_in": "rise", "camera": "tilt", "transitions": ["circle"]}})
    assert idt.identity_check(me, new, BT).status == "ok"


def test_variety_flags_three_in_a_row():
    ok = _plan(["photo", "photo", "chart", "photo"])
    assert idt.variety_check(ok, rnd.transitions(ok, BRAND.model_copy(update={"transitions": ["dip", "blur"]}))).status == "ok"
    brand = BRAND.model_copy(update={"transitions": ["dip"]})
    bad = idt.variety_check(ok, rnd.transitions(ok, brand), final=True)
    assert bad.status == "fail" and "transition 'dip'" in bad.detail


def test_theme_motion_is_validated_and_drives_transitions(tmp_path):
    (tmp_path / "Hind Guntur").mkdir()
    (tmp_path / "Hind Guntur" / "x.ttf").write_bytes(b"x")
    t = th.build("x", {"preset": "p", "motion": {"text_in": "wobble", "camera": "push", "transitions": ["slide", "spin"]},
                       "direction": {"tone": "calm"}}, {"p": {"colors": {}, "fonts": {"body": "Hind Guntur"}}}, tmp_path)
    assert t.motion == {"text_in": "pop", "camera": "push", "transitions": ["slide"]} and t.direction["tone"] == "calm"
    assert len(t.issues) == 2
    plan = _plan(["photo", "chart", "map"], [None, None, "flash"])
    assert rnd.transitions(plan, BRAND.model_copy(update={"transitions": ["blur"]}), t) == {1: ("", "slide"), 2: ("slide", "flash"),
                                                                                3: ("flash", "")}


def test_captions_are_small():
    css = (TOOLS / "templates" / "_shared" / "studio.css").read_text("utf-8")
    land = float(re.search(r"\.cap-page \{[^}]*?font-size: calc\(var\(--u\) \* ([\d.]+)", css).group(1))
    port = float(re.search(r"\.portrait \.cap-page \{ font-size: calc\(var\(--u\) \* ([\d.]+)", css).group(1))
    assert land <= 3.0 and port <= 3.7  # was 5.2 / 6.4 (user 2026-11-10: half the size)
