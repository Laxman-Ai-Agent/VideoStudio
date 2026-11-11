from PIL import Image, ImageDraw

from pipeline import cull


def _img(path, size=(800, 600), seed=0, blur=False, flat=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    im = Image.new("RGB", size, (20, 20, 20) if flat else (200, 200, 200))
    if not flat:
        d = ImageDraw.Draw(im)
        for k in range(12):  # a different layout per seed, so dHash differs between seeds
            x = (k * 67 + seed * 131) % size[0]
            y = (k * 41 + seed * 97) % size[1]
            d.rectangle([x, y, x + 60 + seed * 9, y + 40 + k * 7], fill=((k * 40 + seed * 70) % 255,) * 3)
    if blur:
        from PIL import ImageFilter
        im = im.filter(ImageFilter.GaussianBlur(25))
    im.save(path)


def test_clean_moves_duplicates_lookalikes_and_poor_files_but_deletes_nothing(tmp_path):
    drop = tmp_path / "drop"
    _img(drop / "a.png", seed=1)
    (drop / "a_copy.png").write_bytes((drop / "a.png").read_bytes())          # exact duplicate
    Image.open(drop / "a.png").resize((1000, 750)).save(drop / "a_small.png")   # same picture, saved at another size
    _img(drop / "b.png", seed=2)
    _img(drop / "tiny.png", size=(200, 150), seed=3)
    _img(drop / "black.png", flat=True)
    _img(drop / "soft.png", seed=4, blur=True)
    (drop / "broken.jpg").write_bytes(b"not a picture")
    _img(drop / "sub" / "c.png", seed=5)
    items = cull.clean(drop, apply=False, log=lambda *_: None)
    reasons = {i.path.name: i.reasons for i in items}
    assert reasons["a_copy.png"] and reasons["tiny.png"] and reasons["black.png"] and reasons["soft.png"]
    assert reasons["broken.jpg"] == ["unreadable"]
    assert sum(1 for n in ("a.png", "a_small.png", "a_copy.png") if not reasons[n]) == 1   # ONE of the look-alikes stays
    assert not reasons["b.png"] and not reasons["c.png"]
    assert (drop / "tiny.png").exists()                                       # a report moves nothing
    cull.clean(drop, apply=True, log=lambda *_: None)
    assert not (drop / "tiny.png").exists() and (drop / "_unused" / "tiny.png").exists()
    assert (drop / "b.png").exists() and (drop / "sub" / "c.png").exists()
    assert not any("_unused" in str(p) for p in cull.files(drop))             # a second run ignores the rejects


def test_a_video_wins_over_its_source_still_and_short_clips_go(tmp_path):
    drop = tmp_path / "drop"
    _img(drop / "still.png", seed=6)
    (drop / "clip.mp4").write_bytes(b"v")
    (drop / "blip.mp4").write_bytes(b"v2")
    png = (drop / "still.png").read_bytes()
    frames = {"clip.mp4": (png, 5.0), "blip.mp4": (png, 0.4)}
    items = cull.judge([cull.measure(p, lambda q: frames[q.name]) for p in cull.files(drop)])
    r = {i.path.name: i.reasons for i in items}
    assert not r["clip.mp4"] and r["still.png"] and r["blip.mp4"]
