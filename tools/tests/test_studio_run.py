import studio


def test_run_on_hand_made_folder_creates_layout_and_waits_for_audio(tmp_path):
    p = tmp_path / "11-hand_made"
    p.mkdir()
    assert studio.run_project(p) == studio.NEEDS_USER  # no audio yet: stop, not a crash on missing drop/
    assert (p / "drop").is_dir() and (p / "work").is_dir()
