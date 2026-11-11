"""Photo template compositions (params.layout) and the dim-while-title window: geometry in layouts.js (run in node),
second picture wiring in render.py."""
import json
import subprocess
from pathlib import Path

from pipeline import render as rnd
from pipeline.contracts import Resolved, ResolvedScene
from test_render import BRAND, _ffmpeg, _plan

JS = Path(rnd.TEMPLATES) / "photo" / "layouts.js"


def _js(expr: str):
    code = f"const {{photoLayout: L, textWindow: T}} = require({json.dumps(str(JS))}); console.log(JSON.stringify({expr}))"
    return json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True).stdout)


def test_layout_boxes_split_stack_and_crop():
    r = lambda b: [round(v, 3) for v in b]  # noqa: E731
    a = _js("L('split_text', 'right', 1600, 900, false)")
    assert a["img"] == [.5, 0, .5, 1] and r(a["text"]) == [.04, .08, .42, .84]
    assert _js("L('split2', 'left', 900, 1600, true)") == {"img": [0, 0, 1, .5], "img2": [0, .5, 1, .5]}  # 9:16: top / bottom
    assert "img2" not in _js("L('stack', 'left', 1600, 900, false)")  # no second picture -> split_text
    c = _js("L('crop', 'left', 1600, 900, false)")
    assert c["from"] == [0, 0, 1, 1] and abs(c["img"][2] - 900 / 1600) < 1e-9  # 1:1 square: 900 px wide
    assert c["text"][0] > c["img"][2]  # title in the free part
    assert _js("L('nonsense', 'left', 1600, 900, false)") == {"img": [0, 0, 1, 1]}


def test_dim_only_while_title_shows_then_restores():
    assert _js("T({dim: true}, 0.25, 4, true)") == {"until": 2.6, "dim": [0.25, 2.6], "level": 0.5}
    assert _js("T({dim: 0.7, text_until: 1.5}, 0.4, 4, true)") == {"until": 1.5, "dim": [0.4, 1.5], "level": 0.7}
    assert _js("T({dim: true, text_until: 3.9}, 0.25, 4, true)")["dim"] == [0.25, 0]  # until the end: stays dim
    assert _js("T({dim: true}, 0.25, 4, false)")["dim"] is None  # no title, no dim
    assert _js("T({}, 0.25, 4, true)") == {"until": 0, "dim": None, "level": 0.5}  # old scenes unchanged


def test_image2_is_copied_and_part_of_the_cache_key(tmp_path):
    for n, c in (("a.png", "red"), ("b.png", "blue")):
        _ffmpeg("-f", "lavfi", "-i", f"color=c={c}:s=32x18", "-frames:v", "1", str(tmp_path / n))
    plan = _plan()
    plan.scenes[2].on_screen_text = "Two"
    plan.scenes[2].params = {"layout": "split2", "image2": "b.png"}
    res = Resolved(scenes=RESOLVED_2 + [ResolvedScene(id=3, status="project", asset="a.png")])
    job = lambda: rnd.plan_jobs(plan, res, BRAND, "16:9", tmp_path, tmp_path / "o", False)[2]  # noqa: E731
    j = job()
    assert j.template == "photo" and j.asset2 == tmp_path / "b.png"
    rnd.build(j, tmp_path / "bd", "photo")
    scene = json.loads((tmp_path / "bd" / "scene.json").read_text("utf-8"))
    assert scene["asset2"] == "asset2.png" and (tmp_path / "bd" / "asset2.png").exists() and (tmp_path / "bd" / "layouts.js").exists()
    assert scene["zone"] is None  # the layout places the title, not textzone
    _ffmpeg("-f", "lavfi", "-i", "color=c=green:s=32x18", "-frames:v", "1", str(tmp_path / "b.png"))
    assert job().key != j.key  # a new second picture re-renders the scene


RESOLVED_2 = [ResolvedScene(id=1, status="template"), ResolvedScene(id=2, status="template")]
