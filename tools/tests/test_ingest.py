import pytest

from pipeline.ingest import AmbiguousInput, ingest
from pipeline.project import new_project


def _drop(p, *names):
    for n in names:
        (p / "drop" / n).write_bytes(n.encode())


def test_ingest_sorts_moves_and_logs(tmp_path):
    p = new_project("demo", tmp_path)
    _drop(p, "Narration.WAV", "notes.txt", "openai_logo.png", "Screenshot 2026.png", "photo.jpg",
          "short.mp4", "interview.mp4", "weird.xyz")
    lengths = {"short.mp4": 30.0, "interview.mp4": 600.0}
    moves = ingest(p, duration=lambda f: lengths[f.name])

    expect = {"input/audio.wav", "input/script.txt", "assets/originals/openai_logo.png",
              "assets/originals/Screenshot 2026.png", "assets/originals/photo.jpg",
              "assets/originals/short.mp4", "assets/originals/raw_footage/interview.mp4", "drop/_unknown/weird.xyz"}
    assert {d.relative_to(p).as_posix() for _, d in moves} == expect
    assert (p / "input" / "audio.wav").read_bytes() == b"Narration.WAV"   # moved, not edited
    assert not any(f.is_file() for f in (p / "drop").iterdir())
    log = (p / "project.md").read_text("utf-8")
    assert "`drop/Narration.WAV` -> `input/audio.wav`" in log and log.count("ingest:") == 8


def test_ingest_refuses_two_audios_and_moves_nothing(tmp_path):
    p = new_project("demo", tmp_path)
    _drop(p, "a.mp3", "b.wav", "pic.png")
    with pytest.raises(AmbiguousInput, match="audio"):
        ingest(p, duration=lambda f: 0)
    assert len(list((p / "drop").glob("*.*"))) == 3


def test_ingest_refuses_second_script_when_one_exists(tmp_path):
    p = new_project("demo", tmp_path)
    (p / "input" / "script.txt").write_text("old")
    _drop(p, "new.md")
    with pytest.raises(AmbiguousInput, match="script"):
        ingest(p, duration=lambda f: 0)


def test_name_clash_gets_suffix(tmp_path):
    p = new_project("demo", tmp_path)
    (p / "assets" / "originals").mkdir(parents=True)
    (p / "assets" / "originals" / "x.png").write_text("old")
    _drop(p, "x.png")
    (_, dest), = ingest(p, duration=lambda f: 0)
    assert dest.name == "x__1.png" and (p / "assets" / "originals" / "x.png").read_text() == "old"


def test_gemini_json_is_the_script(tmp_path):
    p = new_project("demo", tmp_path)
    _drop(p, "transcript.gemini.json", "other.json")
    moved = {d.relative_to(p).as_posix() for _, d in ingest(p, duration=lambda f: 0)}
    assert moved == {"input/script.json", "drop/_unknown/other.json"}


def test_asset_id_uploads_and_all_media_go_to_originals(tmp_path):
    p = new_project("demo", tmp_path)
    _drop(p, "A012.png", "A013_v2.mp4", "x.json")
    moved = {d.relative_to(p).as_posix() for _, d in ingest(p, duration=lambda f: 10)}
    assert moved == {"assets/originals/A012.png", "assets/originals/A013_v2.mp4", "drop/_unknown/x.json"}
    assert list((p / "drop").iterdir()) == [p / "drop" / "_unknown"]
