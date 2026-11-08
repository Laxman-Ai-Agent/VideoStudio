"""Manual visual edits: clamping, persistence, apply (hidden / duplicate), cache key, built scene, JS math (node), API."""
import json
import shutil
import sys
import subprocess
from pathlib import Path

import pytest
from PIL import Image

from pipeline import edits
from pipeline import render as rnd
from pipeline.contracts import Brand, Resolved, ScenePlan

MATH = Path(__file__).resolve().parents[2] / "ui" / "frontend" / "edit_math.js"


def test_clean_clamps_and_save_replaces_one_scene(tmp_path):
    m = edits.clean({"x": 9, "y": "bad", "w": 0, "h": 0.5, "rot": 999, "opacity": 3})
    assert m["x"] == 2 and m["y"] == 0 and m["w"] == 0.01 and m["rot"] == 360 and m["opacity"] == 1
    edits.save_scene(tmp_path, "16:9", 1, {"A1": {"x": 0.1, "y": 0.2, "w": 0.3, "h": 0.4}})
    edits.save_scene(tmp_path, "9:16", 1, {"A1": {"x": 0.5, "y": 0.5, "w": 0.2, "h": 0.2}})
    edits.save_scene(tmp_path, "16:9", 2, {"A2": {"x": 0, "y": 0, "w": 1, "h": 1}})
    edits.save_scene(tmp_path, "16:9", 2, {})  # empty = reset the scene
    d = edits.load(tmp_path)
    assert d["16:9"]["1"]["A1"]["x"] == 0.1 and d["9:16"]["1"]["A1"]["x"] == 0.5 and "2" not in d["16:9"]
    with pytest.raises(ValueError):
        edits.save_scene(tmp_path, "4:3", 1, {})
    stored = edits.save_scene(tmp_path, "16:9", 3, {"null": {"x": 0}, "undefined": {"x": 0}, "A9": {"x": 0.1}})
    assert list(stored) == ["A9"]  # elements without an id are never stored


def test_apply_sets_manual_hides_and_duplicates():
    ov = [(Path("a.png"), {"id": "A1", "size": 0.3}), (Path("b.png"), {"id": "A2"})]
    items = {"A1": edits.clean({"x": 0.1, "y": 0.1, "w": 0.2, "h": 0.2}), "A2": edits.clean({"hidden": True}),
             "A1#2": edits.clean({"x": 0.5, "y": 0.5, "w": 0.2, "h": 0.2, "dup": "A1"})}
    out = edits.apply(ov, items)
    assert [(f.name, pl["id"]) for f, pl in out] == [("a.png", "A1"), ("a.png", "A1#2")]
    assert out[0][1]["manual"]["x"] == 0.1 and out[1][1]["manual"]["x"] == 0.5 and "manual" not in ov[0][1]


def _job(tmp_path, ovl):
    Image.new("RGBA", (64, 64), (255, 0, 0, 255)).save(tmp_path / "ov.png")
    brand = Brand(formats={"16:9": {"width": 1920, "height": 1080}, "9:16": {"width": 1080, "height": 1920}},
                  colors={"background": "#000000", "accent": "#FFC400", "text": "#FFFFFF"}, fonts={"telugu": "Gidugu"})
    s = lambda i: {"id": i, "start": i - 1, "end": i, "narration": "x", "visual_type": "text", "query": "q"}  # noqa: E731
    plan = ScenePlan(scenes=[s(1), s(2)])
    res = Resolved(scenes=[{"id": 1, "status": "template"}, {"id": 2, "status": "template"}])
    return lambda fmt, ov: rnd.plan_jobs(plan, res, brand, fmt, tmp_path, tmp_path / "o", False, overlays=ov)


def test_edit_changes_only_its_scene_key_and_reaches_the_build(tmp_path):
    plan = _job(tmp_path, None)
    pl = {"id": "A1", "position": "top-right", "size": 0.3, "at": 0.2, "until": None, "animation": "pop"}
    ov = lambda m: {1: [(tmp_path / "ov.png", {**pl, **({"manual": m} if m else {})})], 2: [(tmp_path / "ov.png", {**pl, "id": "A2"})]}  # noqa: E731
    base = plan("16:9", ov(None))
    man = edits.clean({"x": 0.1, "y": 0.2, "w": 0.3, "h": 0.4, "rot": 12, "opacity": 0.5})
    edited = plan("16:9", ov(man))
    assert base[0].key != edited[0].key and base[1].key == edited[1].key  # only scene 1 re-renders
    # the same overlays in the preview build and the render build give the same scene.json
    rnd.build(edited[0], tmp_path / "b1", edited[0].template)
    rnd.build(plan("16:9", ov(man))[0], tmp_path / "b2", edited[0].template)
    s1, s2 = (json.loads((tmp_path / b / "scene.json").read_text("utf-8")) for b in ("b1", "b2"))
    assert s1 == s2 and s1["overlays"][0]["manual"] == man
    nine = plan("9:16", ov(None))  # fractions of the frame: 9:16 is independent of the 16:9 edit
    assert nine[0].key != base[0].key and "manual" not in json.dumps([pl for _, pl in ov(None)[1]])


def _node(js):
    return json.loads(subprocess.run(["node", "-e", f"const M=require({json.dumps(str(MATH))});console.log(JSON.stringify({js}))"],
                                     capture_output=True, text=True, check=True).stdout)


@pytest.mark.skipif(not shutil.which("node"), reason="node missing")
def test_transform_math():
    r = _node("M.resize({x:100,y:100,w:200,h:100,rot:0},'se',{x:500,y:400},false)")
    assert (r["x"], r["y"], r["w"], r["h"]) == (100, 100, 400, 300)  # opposite corner stays
    r = _node("M.resize({x:100,y:100,w:200,h:100,rot:0},'se',{x:500,y:150},true)")
    assert r["w"] / r["h"] == pytest.approx(2) and r["x"] == 100
    r = _node("M.resize({x:100,y:100,w:200,h:100,rot:90},'e',{x:150,y:400},false)")  # rotated: anchor (west edge) stays put
    c = _node("M.bounds(M.resize({x:100,y:100,w:200,h:100,rot:90},'e',{x:150,y:400},false))")
    assert r["w"] > 200 and c["t"] == pytest.approx(150 - 100 + 0, abs=60)
    assert _node("M.rotate({x:0,y:0,w:100,h:100,rot:0},{x:100,y:50},15)")["rot"] == 90
    assert _node("M.rotate({x:0,y:0,w:100,h:100,rot:0},{x:50,y:-50},0)")["rot"] == 0
    a = _node("M.align({x:300,y:300,w:100,h:50,rot:0},'right',1920,1080)")
    assert a["x"] == 1820 and a["y"] == 300
    a = _node("M.align({x:300,y:300,w:100,h:50,rot:0},'middle',1920,1080)")
    assert a["y"] == 515
    f = _node("M.fit({x:0,y:0,w:100,h:200,rot:30},1920,1080)")
    assert (f["h"], f["rot"], f["y"]) == (1080, 0, 0) and f["x"] == pytest.approx((1920 - 540) / 2)
    s = _node("M.scaleTo({x:100,y:100,w:200,h:100,rot:0},50,{w:200,h:100})")
    assert (s["w"], s["h"], s["x"], s["y"]) == (100, 50, 150, 125)
    assert _node("M.hit({x:0,y:0,w:100,h:20,rot:90},{x:50,y:60})") is True  # rotated box covers (50,60)
    assert _node("M.hit({x:0,y:0,w:100,h:20,rot:0},{x:50,y:60})") is False
    b = _node("M.toFrac({x:960,y:540,w:192,h:108,rot:5},1920,1080,{})")
    assert b == {"x": 0.5, "y": 0.5, "w": 0.1, "h": 0.1, "rot": 5}


@pytest.mark.skipif(not shutil.which("node"), reason="node missing")
def test_timeline_scripts_parse_and_load_in_order():
    ui = MATH.parent
    for f in ("timeline.js", "timeline_live.js", "timeline_edit.js", "timeline_panel.js", "edit_math.js"):
        subprocess.run(["node", "--check", str(ui / f)], check=True)
    html = (ui / "timeline.html").read_text("utf-8")
    order = [html.index(f'src="{f}"') for f in ("timeline.js", "timeline_live.js", "edit_math.js", "timeline_edit.js", "timeline_panel.js")]
    assert order == sorted(order) and 'id="assets"' in html and "timeline_edit.css" in html
    assert all(t in (ui / "timeline_panel.js").read_text("utf-8") for t in ("Scene Details", "Visual Edit", "Animation", "Effects", "Fit & Align"))


def test_scene_thumbnail_is_cached_by_render_key(tmp_path, monkeypatch):
    from pipeline import preview
    calls = []

    def fake_run(cmd, **kw):  # stands in for `hyperframes snapshot`: writes the still it would capture
        calls.append(cmd)
        out = Path(cmd[cmd.index("-o") + 1])
        out.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (1280, 720), (10, 80, 200)).save(out / "frame-00-at-1.3s.png")

    monkeypatch.setattr(preview.subprocess, "run", fake_run)
    d = tmp_path / "scene_001"
    d.mkdir()
    (d / ".key").write_text("k1", "utf-8")
    assert preview.make_thumb(d) and preview.thumb_fresh(d) and Image.open(d / "thumb.jpg").size == (480, 270)
    assert preview.make_thumb(d) and len(calls) == 1  # cached
    (d / ".key").write_text("k2", "utf-8")  # scene rebuilt (an edit): the still is stale and taken again
    assert not preview.thumb_fresh(d) and preview.make_thumb(d) and len(calls) == 2


def test_background_and_text_layers_reach_the_build_and_the_key(tmp_path):
    edits.save_scene(tmp_path, "16:9", 1, {"L:t1": {"x": 0.1, "y": 0.2, "w": 0.5, "h": 0.1, "rot": 5}, "L:bg": {"x": 0, "y": 0, "w": 1, "h": 1, "hidden": True}})
    lay = edits.layers(tmp_path, "16:9")
    assert set(lay) == {1} and set(lay[1]) == {"L:t1", "L:bg"} and edits.layers(tmp_path, "9:16") == {}
    assert edits.apply([(Path("a.png"), {"id": "A1"})], edits.scene_items(tmp_path, "16:9", 1))[0][1].get("manual") is None  # overlays ignore L: items
    jobs = []
    for ly in (None, lay):
        jobs.append(_jobs_with_layers(tmp_path, ly))
    assert jobs[0][0].key != jobs[1][0].key and jobs[0][1].key == jobs[1][1].key  # only scene 1 changes
    rnd.build(jobs[1][0], tmp_path / "bl", jobs[1][0].template)
    sc = json.loads((tmp_path / "bl" / "scene.json").read_text("utf-8"))
    assert sc["layers"]["L:t1"]["w"] == 0.5 and sc["layers"]["L:bg"]["hidden"] is True
    assert "L:t1" in (tmp_path / "bl" / "studio.js").read_text("utf-8")  # layout.js bundled with the layer code


def _jobs_with_layers(tmp_path, layers):
    brand = Brand(formats={"16:9": {"width": 1920, "height": 1080}}, colors={"background": "#000000", "accent": "#FFC400", "text": "#FFFFFF"},
                  fonts={"telugu": "Gidugu"})
    s = lambda i: {"id": i, "start": i - 1, "end": i, "narration": "x", "visual_type": "text", "query": "q"}  # noqa: E731
    return rnd.plan_jobs(ScenePlan(scenes=[s(1), s(2)]), Resolved(scenes=[{"id": 1, "status": "template"}, {"id": 2, "status": "template"}]),
                         brand, "16:9", tmp_path, tmp_path / "o", False, manual=layers)


def test_render_key_does_not_depend_on_the_python_process(tmp_path):
    """The font families were hashed in set order: two processes (dashboard preview vs `studio run`) got different keys."""
    code = ("import sys; sys.path.insert(0, 'tools')\n"
            "from pathlib import Path\n"
            "from pipeline import render as rnd\n"
            "from pipeline.contracts import Brand, Resolved, ScenePlan\n"
            "b = Brand(formats={'16:9': {'width': 1920, 'height': 1080}}, colors={'background': '#000000', 'accent': '#FFC400', 'text': '#FFFFFF'},\n"
            "          fonts={'telugu': 'Gidugu', 'heading': 'Anton', 'script': 'Caveat'})\n"
            "s = {'id': 1, 'start': 0, 'end': 1, 'narration': 'x', 'visual_type': 'text', 'query': 'q'}\n"
            "print(rnd.plan_jobs(ScenePlan(scenes=[s]), Resolved(scenes=[{'id': 1, 'status': 'template'}]), b, '16:9', Path('.'), Path('o'), False)[0].key)\n")
    root = MATH.parents[2]
    keys = {subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, cwd=root,
                           env={**__import__("os").environ, "PYTHONHASHSEED": seed}).stdout.strip() for seed in ("1", "2", "3", "4")}
    assert len(keys) == 1 and "" not in keys
