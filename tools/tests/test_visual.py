"""visual-assets.json: rules, uploads by id, processing, fallbacks, summary, render overlays (offline fakes)."""
import json

import pytest
from PIL import Image

from pipeline import render as rnd
from pipeline import visual
from pipeline.contracts import Brand, Resolved, ScenePlan, VisualAsset, VisualAssets


def _plan():
    s = lambda i, vt: {"id": i, "start": i - 1, "end": i, "narration": "x", "visual_type": vt, "query": f"q{i}"}  # noqa: E731
    return ScenePlan(scenes=[s(1, "photo"), s(2, "photo"), s(3, "text")])


def _png(p, size=(400, 300), color=(200, 30, 30)):
    p.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", size, color).save(p)
    return p


def _remove_bg(img):  # fake rembg: keep the left half, clear the rest
    out = img.convert("RGBA")
    w, h = out.size
    out.paste((0, 0, 0, 0), (w // 2, 0, w, h))
    return out


def test_sync_rules_uploads_processing_and_fallbacks(tmp_path):
    root, proj = tmp_path, tmp_path / "projects" / "01_X"
    _png(proj / "assets" / "images" / "found.png", (1920, 1080))
    _png(proj / visual.GENERATED / "A002_v1.png")             # user upload, opaque
    online = _png(root / "_library" / "downloads" / "logo.png", (600, 600))
    va = VisualAssets.model_validate({"assets": [
        {"id": "A001", "name": "OpenAI logo", "category": "logo", "scenes": [1], "role": "overlay", "method": "ai_generate"},
        {"id": "A002", "name": "Ravi shocked", "category": "character_expression", "scenes": [1], "role": "overlay",
         "prompt": {"text": "full prompt"}, "output": {"width": 512, "height": 512, "transparent": True},
         "processing": {"remove_background": True}},
        {"id": "A003", "name": "Ravi crop", "category": "character_expression", "scenes": [3], "role": "overlay",
         "processing": {"extract_from": "A002", "crop": [0, 0, 0.5, 1]}, "output": {"width": 200, "height": 300}},
        {"id": "A004", "name": "Scene 1 photo", "category": "photo", "scenes": [1], "role": "main", "method": "online"},
        {"id": "A005", "name": "Need art", "category": "illustration", "scenes": [3], "role": "overlay",
         "prompt": {"text": "draw it"}},
        {"id": "A006", "name": "Title", "category": "other", "scenes": [3], "method": "template"},
    ]})
    res = Resolved.model_validate({"scenes": [
        {"id": 1, "status": "project", "asset": "projects/01_X/assets/images/found.png"},
        {"id": 2, "status": "missing"}, {"id": 3, "status": "template"}]})
    calls = []
    fetch = lambda a: calls.append(a.id) or (online, {"license": "CC0", "source_url": "u", "author": "x"})  # noqa: E731
    va = visual.sync(va, proj, _plan(), root, res, fetch=fetch, remove_bg=_remove_bg, log=lambda *_: None)
    a = {x.id: x for x in va.assets}
    assert a["A001"].method == "real_logo" and a["A001"].status == "validated" and a["A001"].credits["license"] == "CC0"
    assert a["A002"].status == "validated" and a["A002"].file == "assets/processed/A002.png"
    assert "background removed (rembg)" in a["A002"].processing.log and "trimmed to the subject" in a["A002"].processing.log
    with Image.open(proj / a["A002"].file) as im:
        assert im.mode == "RGBA" and max(im.size) == 512  # trimmed to the subject, then fitted (Lanczos)
    assert a["A003"].status == "validated" and a["A003"].processing.log[0].startswith("cropped")
    assert a["A004"].status == "validated" and a["A004"].source_file == "assets/images/found.png"
    assert calls == ["A001"]  # the scene photo came from resolve's own find, no second search
    assert a["A005"].status == "prompt_ready" and a["A006"].status == "validated"
    extra = [x for x in va.assets if x.notes.startswith("added automatically")]
    assert len(extra) == 1 and extra[0].scenes == [2] and extra[0].status == "prompt_ready" and "q2" in extra[0].prompt.text
    assert va.summary["total"] == 7 and va.summary["to_generate"] == ["A005", extra[0].id]
    assert visual.main_files(va, proj) == {1: proj / a["A004"].file}
    assert [f.name for f, _ in visual.overlays(va, proj)[1]] == ["A001.png", "A002.png"]
    va2 = visual.sync(va, proj, _plan(), root, res, fetch=fetch, remove_bg=_remove_bg, log=lambda *_: None)
    assert calls == ["A001"] and len(va2.assets) == 7  # finished assets are not redone, fallback not duplicated


def test_transparency_is_enforced(tmp_path):
    proj = tmp_path / "p"
    _png(proj / visual.GENERATED / "A001.png")
    va = VisualAssets.model_validate({"assets": [{"id": "A001", "name": "s", "category": "sticker", "scenes": [1],
                                                  "role": "overlay", "output": {"transparent": True}}]})
    va = visual.sync(va, proj, _plan(), tmp_path, None, remove_bg=None, log=lambda *_: None)
    a = va.assets[0]
    assert a.status == "failed" and "transparent background required" in " ".join(a.validation["checks"])


def test_duplicate_ids_and_unknown_characters_are_rejected():
    with pytest.raises(ValueError):
        VisualAssets.model_validate({"assets": [{"id": "A1", "name": "a", "category": "meme"},
                                                {"id": "A1", "name": "b", "category": "meme"}]})
    with pytest.raises(ValueError):
        VisualAssets.model_validate({"assets": [{"id": "A1", "name": "a", "category": "meme", "character": "C9"}]})


def test_render_puts_overlays_into_the_scene(tmp_path):
    ov = _png(tmp_path / "ov.png", (64, 64))
    brand = Brand(formats={"16:9": {"width": 1920, "height": 1080}}, colors={"background": "#000000", "accent": "#FFC400",
                  "text": "#FFFFFF"}, fonts={"telugu": "Gidugu"})
    plan = ScenePlan(scenes=[{"id": 1, "start": 0, "end": 1, "narration": "x", "visual_type": "text", "query": "q"}])
    res = Resolved(scenes=[{"id": 1, "status": "template"}])
    a = rnd.plan_jobs(plan, res, brand, "16:9", tmp_path, tmp_path / "o", False)[0]
    pl = {"position": "top-right", "size": 0.3, "at": 0.2, "until": None, "animation": "pop"}
    b = rnd.plan_jobs(plan, res, brand, "16:9", tmp_path, tmp_path / "o", False, overlays={1: [(ov, pl)]})[0]
    assert a.key != b.key
    rnd.build(b, tmp_path / "build", b.template)
    scene = json.loads((tmp_path / "build" / "scene.json").read_text("utf-8"))
    assert scene["overlays"] == [{"src": "ov0.png", **pl, "w": 64, "h": 64, "cx": 0.5}] and (tmp_path / "build" / "ov0.png").exists()


def test_brief_lists_scenes_rules_and_local_files(tmp_path):
    out = tmp_path / "brief.md"
    visual.brief(tmp_path / "01_X", _plan(), "full narration", {"16:9": {"width": 1920, "height": 1080}},
                 {"name": "tech", "colors": {}}, ["assets/images/a.png - office"], out)
    md = out.read_text("utf-8")
    assert "Never ai_generate a logo" in md and "WORD FOR WORD" in md and "assets/images/a.png - office" in md
    assert "| 2 | 1.00-2.00 | photo |" in md and "full narration" in md


def test_narration_comes_from_the_transcript_window(tmp_path):
    from pipeline.contracts import Word
    words = [Word(text=t, start=a, end=a + 0.3) for t, a in (("one", 0.0), ("two", 0.3), ("three", 0.55))]
    va = VisualAssets.model_validate({"assets": [
        {"id": "A1", "name": "main", "category": "photo", "scenes": [1], "method": "template"},
        {"id": "A2", "name": "pop", "category": "sticker", "scenes": [1], "role": "overlay",
         "placement": {"at": 0.4, "until": 0.8}, "method": "template"}]})
    va = visual.sync(va, tmp_path, _plan(), tmp_path, None, log=lambda *_: None, words=words)
    assert va.assets[0].narration == "one two three" and va.assets[1].narration == "two three"
    assert va.assets[0].media.duration_required == 1.0


def test_overlay_subject_side_and_stamp_text(tmp_path):
    from PIL import Image
    left = tmp_path / "l.png"
    im = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
    im.paste((255, 0, 0, 255), (0, 0, 30, 100))  # subject stands on the left of its picture
    im.save(left)
    assert rnd._centre_x(left) < 0.25 and rnd._centre_x(tmp_path / "missing.png") == 0.5
    va = VisualAssets(assets=[VisualAsset(id="A001", name="s", category="sticker", subcategory="text_sticker", role="overlay",
                                          scenes=[1], status="validated", file="l.png", prompt={"text_in_image": "LAYOFFS"})])
    assert visual.overlays(va, tmp_path)[1][0][1]["text"] == "LAYOFFS"


def test_cutout_treatments_reach_the_scene_and_layout_js_is_bundled(tmp_path):
    ov = _png(tmp_path / "ov.png", (64, 64))
    va = VisualAssets(assets=[VisualAsset(id="A001", name="s", category="reaction", role="overlay", scenes=[1], status="validated",
                                          file="ov.png", placement={"outline": "accent", "bw": True, "backdrop": "rays"})])
    pl = visual.overlays(va, tmp_path)[1][0][1]
    assert (pl["outline"], pl["bw"], pl["backdrop"]) == ("accent", True, "rays")
    brand = Brand(formats={"16:9": {"width": 1920, "height": 1080}}, colors={"background": "#000000", "accent": "#FFC400",
                  "text": "#FFFFFF"}, fonts={"telugu": "Gidugu"})
    plan = ScenePlan(scenes=[{"id": 1, "start": 0, "end": 1, "narration": "x", "visual_type": "text", "query": "q"}])
    res = Resolved(scenes=[{"id": 1, "status": "template"}])
    job = rnd.plan_jobs(plan, res, brand, "16:9", tmp_path, tmp_path / "o", False, overlays={1: [(ov, pl)]})[0]
    rnd.build(job, tmp_path / "build", job.template)
    js = (tmp_path / "build" / "studio.js").read_text("utf-8")
    assert js.index("window.studioLayout = function") < js.index("window.studioLayout({ S")  # layout.js first, then studio.js
    assert json.loads((tmp_path / "build" / "scene.json").read_text("utf-8"))["overlays"][0]["backdrop"] == "rays"
