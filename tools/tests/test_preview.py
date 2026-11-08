"""Live preview builds: same scene builds as render, cached by the render key, a broken scene gets the tile."""
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

    r = build_preview(proj, "16:9", root=tmp_path, brand_dir=brand)
    assert (r["width"], r["height"]) == (1280, 720)
    by = {s["id"]: s for s in r["scenes"]}
    assert [by[i]["status"] for i in (1, 2, 3)] == ["built"] * 3
    assert by[3]["template"] == "photo" and "FileNotFoundError" in by[3]["error"]
    for s in r["scenes"]:
        assert (proj / s["dir"] / "index.html").exists() and (proj / s["dir"] / "scene.js").exists()
    assert "missing" in (proj / by[3]["dir"] / "index.html").read_text("utf-8").lower()

    again = build_preview(proj, "16:9", root=tmp_path, brand_dir=brand)
    assert [s["status"] for s in again["scenes"]] == ["cached", "cached", "built"]  # the failed scene retries
