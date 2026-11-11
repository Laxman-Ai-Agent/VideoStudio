import json

import migrate_layout as m


def _w(p, rel, data=b"x"):
    f = p / rel
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_bytes(data)


def _old_project(tmp_path):
    p = tmp_path / "projects" / "01_X"
    _w(p, "input/audio.mp3", b"voice")
    _w(p, "input/converted/audio.mp3", b"voice")          # byte duplicate
    _w(p, "input/converted/audio_1.15x.mp3", b"fast")
    _w(p, "assets/processed/A001.png", b"proc")
    _w(p, "assets/processed/A001.v1.png", b"old")
    _w(p, "assets/generated/A001_2026.png", b"upload")    # the asset's source
    _w(p, "assets/generated/A001.png", b"older")          # nothing points to it
    _w(p, "assets/images/u_01.jpg", b"pic")
    _w(p, "assets/.thumbs/h.jpg", b"t")
    _w(p, "make_scenes.py", b'P = Path(__file__).parent\nIMG = "assets/processed/"\n')
    _w(p, "gemini_corrected.json", json.dumps({"scenes": [{"text": "hello"}]}).encode())
    _w(p, "work/scenes.json", b'{"scenes": [{"asset": "assets/images/u_01.jpg"}]}')
    _w(p, "work/resolved.json", b'{"asset": "projects/01_X/assets/processed/A001.png"}')
    _w(p, "visual-assets.json", json.dumps({"assets": [{"id": "A001", "file": "assets/processed/A001.png",
                                                       "source_file": "assets/generated/A001_2026.png"}]}).encode())
    _w(p, "assets/index.json", json.dumps({"assets": {"h": {"file": "images/u_01.jpg", "thumb": ".thumbs/h.jpg"}}}).encode())
    return p


def test_migration_moves_rewrites_and_deletes_only_exact_duplicates(tmp_path):
    p = _old_project(tmp_path)
    pl = m.plan(p)
    assert pl["dups"] == [("input/converted/audio.mp3", "input/audio.mp3")]
    assert (p / "input/converted/audio.mp3").exists()      # a plan changes nothing
    m.apply(p, pl, tmp_path)
    ls = lambda d: sorted(x.name for x in (p / d).iterdir())  # noqa: E731
    assert ls("input") == ["audio.mp3", "gemini_corrected.json", "voice"] and ls("input/voice") == ["audio_1.15x.mp3"]
    assert ls("assets") == ["A001.png", "originals"] and ls("assets/originals") == ["A001_2026.png", "u_01.jpg"]
    assert ls("work/replaced") == ["A001.png", "A001.v1.png"] and (p / "work/thumbs/h.jpg").exists()
    assert (p / "scripts" / "make_scenes.py").read_text() == 'P = Path(__file__).resolve().parent.parent\nIMG = "assets/"\n'
    assert json.loads((p / "work/scenes.json").read_text())["scenes"][0]["asset"] == "assets/originals/u_01.jpg"
    assert "projects/01_X/assets/A001.png" in (p / "work/resolved.json").read_text()
    a = json.loads((p / "visual-assets.json").read_text())["assets"][0]
    assert (a["file"], a["source_file"]) == ("assets/A001.png", "assets/originals/A001_2026.png")
    e = json.loads((p / "work/assets_index.json").read_text())["assets"]["h"]
    assert (e["file"], e["thumb"]) == ("originals/u_01.jpg", "../work/thumbs/h.jpg")
    assert (p / "output/script.txt").read_text() == "hello\n"
    assert not (p / "assets/generated").exists() and not (p / "input/converted").exists()
    assert m.plan(p)["moves"] == []                        # a second run has nothing to do
