from pathlib import Path

from pipeline import assets
from pipeline.contracts import Resolved, ScenePlan
from pipeline.providers import Candidate
from pipeline.resolve import credits, keywords, resolve
from pipeline.storyboard import build_html

NO_PROBE = dict(probe=lambda p: {"width": 10, "height": 10}, thumb=lambda s, d: False)


def _plan():
    s = lambda i, vt, q: {"id": i, "start": i - 1, "end": i, "narration": "x", "visual_type": vt, "query": q}  # noqa: E731
    return ScenePlan(scenes=[s(1, "footage", "Corporate office employees working at computers"),
                             s(2, "chart", "Bar chart of jobs"),
                             s(3, "photo", "Empty office chair at a desk"),
                             s(4, "logo", "ChatGPT logo"),
                             s(5, "photo", "Robot hand typing")])


def _setup(tmp_path):
    root = tmp_path
    proj, lib = root / "projects" / "01_X", root / "_library"
    (proj / "assets" / "videos").mkdir(parents=True)
    (proj / "assets" / "images").mkdir(parents=True)
    lib.mkdir()
    (proj / "assets" / "videos" / "01.mp4").write_bytes(b"office")
    (proj / "assets" / "images" / "scene_005.png").write_bytes(b"robot")
    (proj / "assets" / "images" / "scene_005_v.png").write_bytes(b"robot v")
    return root, proj, lib


def test_index_describes_once_and_keeps_description_on_rename(tmp_path):
    root, proj, _ = _setup(tmp_path)
    base, f = proj / "assets", proj / "assets" / "index.json"
    idx = assets.update(base, f, **NO_PROBE)
    todo = assets.undescribed(idx)
    assert [e.file for e in todo] == ["videos/01.mp4"]  # scene_NNN files need no description
    h = next(h for h, e in idx.assets.items() if e.file == "videos/01.mp4")
    idx.assets[h].description = "office employees computers"
    assets.save(f, idx)
    (base / "videos" / "01.mp4").rename(base / "videos" / "renamed.mp4")
    calls = []
    idx = assets.update(base, f, probe=lambda p: calls.append(p) or {}, thumb=lambda s, d: False)
    assert idx.assets[h].file == "videos/renamed.mp4" and idx.assets[h].description
    assert not calls  # same hash: not probed again


def test_resolve_order_template_internet_missing(tmp_path):
    root, proj, lib = _setup(tmp_path)
    idx = assets.update(proj / "assets", proj / "assets" / "index.json", **NO_PROBE)
    for e in idx.assets.values():
        e.description = e.description or "corporate office employees computers"
    assets.save(proj / "assets" / "index.json", idx)

    def search(q, kind, vt, key):
        return [Candidate("http://x/a.png", ".png", "Unrelated sunset", "s0", "CC0", "a", "wikimedia"),
                Candidate("http://x/logo.png", ".png", "File:ChatGPT logo.svg", "https://c/logo", "CC0", "OpenAI", "wikimedia")
                ] if "chatgpt" in q else [
                Candidate("http://x/b.jpg", ".jpg", "Office building in New York", "s1", "CC0", "b", "wikimedia")]
    # regression: a 1-of-4 keyword hit ("office") was downloaded as scene 3 in the first live run

    res = resolve(_plan(), proj, lib, root, search=search, download=lambda u, d: d.write_bytes(b"logo"))
    got = {r.id: r for r in res.scenes}
    assert got[1].status == "project" and got[1].asset == "projects/01_X/assets/videos/01.mp4"
    assert got[2].status == "template"
    assert got[3].status == "missing"
    assert got[4].status == "downloaded" and got[4].license == "CC0" and got[4].asset.startswith("_library/downloads/")
    assert got[5].asset.endswith("scene_005.png") and got[5].asset_9x16.endswith("scene_005_v.png")
    assert "https://c/logo" in credits(res)
    # downloaded file is now a described, credited library asset: reused without searching again
    res2 = resolve(_plan(), proj, lib, root, search=lambda *a: [], download=None)
    assert res2.scenes[3].status == "library" and res2.scenes[3].license == "CC0"


def test_storyboard_shows_missing_tile(tmp_path):
    res = Resolved.model_validate({"scenes": [{"id": i, "status": "missing"} for i in range(1, 6)]})
    page = build_html(_plan(), "01_X", {}, res, tmp_path)
    assert page.count("MISSING") == 5


def test_keywords():
    assert keywords("ChatGPT, Gemini and Grok logos side by side") == ["chatgpt", "gemini", "grok", "logo"]


def test_template_scene_with_template_params_is_never_a_loose_photo(tmp_path):
    """Seen on 03: kinetic `lines` scenes got a library photo that matched their query words."""
    root, proj, lib = _setup(tmp_path)
    idx = assets.update(proj / "assets", proj / "assets" / "index.json", **NO_PROBE)
    for e in idx.assets.values():
        e.description = "corporate office employees working at computers"
    assets.save(proj / "assets" / "index.json", idx)
    s = lambda i, p: {"id": i, "start": i - 1, "end": i, "narration": "x", "visual_type": "motion_graphic",  # noqa: E731
                      "query": "corporate office employees working at computers", "params": p}
    plan = ScenePlan(scenes=[s(1, {"lines": [{"text": "x"}]}), s(2, {})])
    got = {r.id: r.status for r in resolve(plan, proj, lib, root, search=lambda *a: [], download=None).scenes}
    assert got[1] == "template" and got[2] == "project"  # without template params the local match still wins
