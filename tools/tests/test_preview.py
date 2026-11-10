"""Live preview builds: same scene builds as render, cached by the render key, a broken scene gets the tile."""
import re

from pipeline.contracts import Resolved, ResolvedScene
from pipeline.preview import build_preview
from test_render import BRAND, _plan


def test_preview_builds_once_and_falls_back(tmp_path):
    proj, brand = tmp_path / "projects" / "07_X", tmp_path / "brand"
    (proj / "work").mkdir(parents=True)
    brand.mkdir()
    (brand / "brand.json").write_text(BRAND.model_dump_json(), "utf-8")
    (proj / "work" / "scenes.json").write_text(_plan().model_dump_json(), "utf-8")
    res = Resolved(scenes=[ResolvedScene(id=1, status="template"), ResolvedScene(id=2, status="template"),
                           ResolvedScene(id=3, status="project", asset="projects/07_X/gone.png")])  # file missing
    (proj / "work" / "resolved.json").write_text(res.model_dump_json(), "utf-8")

    r = build_preview(proj, "16:9", root=tmp_path, brand_dir=brand, check_layout=False)
    assert (r["width"], r["height"]) == (854, 480)
    by = {s["id"]: s for s in r["scenes"]}
    assert [by[i]["status"] for i in (1, 2, 3)] == ["built"] * 3
    assert by[3]["template"] == "photo" and "FileNotFoundError" in by[3]["error"]
    for s in r["scenes"]:
        assert (proj / s["dir"] / "index.html").exists() and (proj / s["dir"] / "scene.js").exists()
    assert "missing" in (proj / by[3]["dir"] / "index.html").read_text("utf-8").lower()

    again = build_preview(proj, "16:9", root=tmp_path, brand_dir=brand, check_layout=False)
    assert [s["status"] for s in again["scenes"]] == ["cached", "cached", "built"]  # the failed scene retries


def test_warnings_list_missing_and_validation_problems():
    from types import SimpleNamespace as NS
    from pipeline.preview import warnings
    va = NS(assets=[NS(id="A2", role="main", scenes=[2], validation={"checks": ["video 832x464", "warn: low resolution video"]}),
                    NS(id="R1", role="reference", scenes=[1], validation={"checks": ["warn: ignored"]})])
    res = Resolved(scenes=[ResolvedScene(id=1, status="template"), ResolvedScene(id=3, status="missing")])
    assert warnings(va, res) == {3: ["no visual found (missing tile)"], 2: ["A2: warn: low resolution video"]}


def test_layout_check_summary_and_cache(tmp_path):
    from pipeline import layout
    report = {"issues": [  # trimmed from a real `hyperframes inspect --json` of 01 scene 7
        {"code": "text_occluded", "severity": "error", "time": 1.117, "text": "cut"},
        {"code": "text_occluded", "severity": "error", "time": 1.117, "text": "cut"},
        {"code": "some_note", "severity": "info", "time": 0.5, "text": "x"},
        {"code": "text_box_overflow", "severity": "error", "time": 0.9, "text": "AI"}]}  # line box, not ink
    assert layout.summarize(report) == ["layout: text hidden under an image 'cut' at 1.1 s"]
    (tmp_path / ".layout.json").write_text('{"key": "k1", "warnings": ["cached"]}', "utf-8")
    assert layout.check(tmp_path, "k1") == ["cached"]  # same render key: no browser run


def test_caption_words_keep_a_gap():
    # 01 final: the hot caption word grew 8% over Hind Guntur's narrow space ("cutచేయడం"); words now get a margin
    from pipeline.render import SHARED
    css, js = (SHARED / "studio.css").read_text("utf-8"), (SHARED / "studio.js").read_text("utf-8")
    # 2026-11-10: margin .04em + padding .14em a side (room for the spoken-word box); pop grows 10%
    assert re.search(r"\.cap-word \{[^}]*margin: 0 \.04em; padding: 0 \.14em", css) and "scale: 1.1, duration" in js
