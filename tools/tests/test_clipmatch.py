import json

from PIL import Image

from pipeline import clipmatch


def test_rank_keeps_best_files_per_scene_and_reports_the_rest():
    files = {"laser.jpg": [1.0, 0.0], "spark.jpg": [0.0, 1.0], "cat.jpg": [0.7071, -0.7071]}
    scenes = {1: [1.0, 0.0], 2: [0.0, 1.0]}
    best, unused = clipmatch.rank(files, scenes, top=1, floor=0.5)
    assert best[1] == [("laser.jpg", 1.0)] and best[2] == [("spark.jpg", 1.0)]
    assert unused == ["cat.jpg"]


def test_match_moves_unused_files_never_deletes_and_caches_embeddings(tmp_path):
    topic = tmp_path / "03_T"
    (topic / "drop").mkdir(parents=True)
    for n, c in (("laser.png", "red"), ("cat.png", "blue")):
        Image.new("RGB", (600, 600), c).save(topic / "drop" / n)
    (topic / "16x9" / "work").mkdir(parents=True)
    (topic / "16x9" / "work" / "scenes.json").write_text(json.dumps({"scenes": [
        {"id": 1, "visual_type": "photo", "query": "red laser"}, {"id": 2, "visual_type": "text", "query": "ignored"}]}), "utf-8")
    calls = []
    # fake CLIP: a red picture is [1,0], anything else [0,1]; the text "red laser" is [1,0]
    images = lambda imgs: calls.append(len(imgs)) or [[1.0, 0.0] if im.getpixel((0, 0))[0] > 200 else [0.0, 1.0] for im in imgs]  # noqa: E731
    texts = lambda t: [[1.0, 0.0] for _ in t]  # noqa: E731
    out = clipmatch.match(topic, apply=True, clip=lambda: (images, texts), log=lambda *_: None)
    assert out["best"]["16x9:1"][0][0] == "laser.png" and out["unused"] == ["cat.png"]
    assert (topic / "drop" / "laser.png").exists() and (topic / "drop" / "_unused" / "cat.png").exists()
    clipmatch.match(topic, clip=lambda: (images, texts), log=lambda *_: None)
    assert calls == [2]  # the second run embeds nothing: cached by file hash
