import pytest

from pipeline.project import (find_project, hash_inputs, load_state, new_project, next_number,
                              run_stage, slug)


def test_slug_keeps_telugu_and_strips_forbidden():
    assert slug("AI Agents: part 1?") == "AI_Agents_part_1"
    assert slug("ఏఐ ఏజెంట్లు") == "ఏఐ_ఏజెంట్లు"
    with pytest.raises(ValueError):
        slug("  ??  ")


def test_new_project_numbers_and_layout(tmp_path):
    a = new_project("First", tmp_path)
    b = new_project("Second", tmp_path)
    assert (a.name, b.name) == ("01_First", "02_Second")
    assert sorted(x.name for x in b.iterdir()) == ["drop", "input", "project.md", "work"]  # no empty sub-folders
    assert next_number(tmp_path) == 3
    assert find_project("2", tmp_path) == b


def test_run_stage_skips_reruns_and_records_failure(tmp_path):
    p = new_project("demo", tmp_path)
    src, out = p / "input" / "a.txt", p / "work" / "out.txt"
    src.write_text("v1")
    calls = []

    def fn():
        calls.append(1)
        out.write_text("done")

    assert run_stage(p, "s", [src], [out], fn) is True
    assert run_stage(p, "s", [src], [out], fn) is False      # same input -> skipped
    src.write_text("v2")
    assert run_stage(p, "s", [src], [out], fn) is True       # input changed -> reruns
    out.unlink()
    assert run_stage(p, "s", [src], [out], fn) is True       # output deleted -> reruns
    assert len(calls) == 3

    def boom():
        raise RuntimeError("bad")

    with pytest.raises(RuntimeError):
        run_stage(p, "t", [src], [], boom)
    rec = load_state(p).stages["t"]
    assert rec.status == "failed" and "bad" in rec.error
    assert (p / "work" / "logs" / "t.log").exists()


def test_hash_changes_with_content(tmp_path):
    f = tmp_path / "x.bin"
    f.write_bytes(b"1")
    h1 = hash_inputs([f])
    f.write_bytes(b"2")
    assert hash_inputs([f]) != h1


def test_atomic_write_survives_a_briefly_locked_target(tmp_path, monkeypatch):
    """Bug 2026-11-10: render failed with WinError 5 on visual-assets.json.tmp -> .json (the dashboard had the file open)."""
    import os
    import time
    from pipeline.project import atomic_write
    real, calls = os.replace, []

    def flaky(a, b):
        calls.append(1)
        if len(calls) < 3:
            raise PermissionError(5, "Access is denied")
        return real(a, b)

    monkeypatch.setattr(os, "replace", flaky)
    monkeypatch.setattr(time, "sleep", lambda s: None)
    f = tmp_path / "visual-assets.json"
    atomic_write(f, "{}")
    assert f.read_text("utf-8") == "{}" and len(calls) == 3


def test_find_project_accepts_hyphen_folder(tmp_path):
    d = tmp_path / "11-AI_doctor"
    d.mkdir()
    assert find_project("11", tmp_path) == d
    assert next_number(tmp_path) == 12


def test_final_removes_only_its_formats_previews(tmp_path):
    from pipeline.project import remove_previews_after_final
    p = tmp_path / "01_x"
    for d in ("output", "work/assembled"):
        (p / d).mkdir(parents=True)
        for name in ("preview_16x9.mp4", "preview_9x16.mp4"):
            (p / d / name).write_text("x")
    (p / "output" / "final_16x9.mp4").write_text("final")
    removed = remove_previews_after_final(p, "final_16x9.mp4")
    assert sorted(x.name for x in removed) == ["preview_16x9.mp4", "preview_16x9.mp4"]
    assert not (p / "output" / "preview_16x9.mp4").exists()
    assert not (p / "work" / "assembled" / "preview_16x9.mp4").exists()
    assert (p / "output" / "preview_9x16.mp4").exists()          # other format kept
    assert (p / "output" / "final_16x9.mp4").exists()            # final kept


def _finished_variation(tmp_path, final_age_h: float):
    """Topic 03_T with a 16x9 variation: final made final_age_h hours ago, scene cache present."""
    import os
    import time
    from pipeline.project import mark_final
    topic = tmp_path / "03_T"
    var = topic / "16x9"
    (topic / "input").mkdir(parents=True)
    (topic / "theme.json").write_text("{}")
    (var / "output").mkdir(parents=True)
    (var / "output" / "final_16x9.mp4").write_text("final")
    (var / "work" / "scenes" / "16x9").mkdir(parents=True)
    (var / "work" / "scenes" / "16x9" / "scene_001.mp4").write_text("clip")
    mark_final(var)
    past = time.time() - final_age_h * 3600
    os.utime(var / "work" / "final_done.json", (past, past))
    for f in (topic / "theme.json", var / "output" / "final_16x9.mp4"):
        os.utime(f, (past, past))
    return topic, var


def test_scene_cache_pruned_after_24h_without_changes(tmp_path):
    from pipeline.project import prune_scene_cache
    topic, var = _finished_variation(tmp_path, final_age_h=25)
    assert prune_scene_cache(var) is True
    assert not (var / "work" / "scenes").exists()
    assert (var / "output" / "final_16x9.mp4").exists()          # the final is never touched


def test_scene_cache_kept_when_recent_or_changed(tmp_path):
    from pipeline.project import prune_scene_cache
    topic, var = _finished_variation(tmp_path, final_age_h=2)
    assert prune_scene_cache(var) is False                        # under 24 h
    topic, var = _finished_variation(tmp_path / "b", final_age_h=25)
    (topic / "input" / "script.txt").write_text("edited")         # a user change after the final
    assert prune_scene_cache(var) is False
    assert (var / "work" / "scenes").exists()


def test_scene_cache_without_marker_is_never_pruned(tmp_path):
    from pipeline.project import prune_scene_cache
    topic, var = _finished_variation(tmp_path, final_age_h=25)
    (var / "work" / "final_done.json").unlink()                   # a final from before this rule
    assert prune_scene_cache(var) is False


def test_export_final_moves_and_replaces_older_output(tmp_path):
    from pipeline.project import export_final
    src, dest = tmp_path / "work" / "final_16x9.mp4", tmp_path / "output" / "final_16x9.mp4"
    src.parent.mkdir(parents=True)
    dest.parent.mkdir(parents=True)
    src.write_text("new")
    dest.write_text("old")
    export_final(src, dest)
    assert dest.read_text() == "new" and not src.exists()        # one copy only, output replaced
    export_final(src, dest)                                      # src already moved: no error, no change
    assert dest.read_text() == "new"


def test_group_folder_inside_channel_is_searched(tmp_path):
    g = tmp_path / "The Dark World" / "AI_Doctor"
    (g / "01_AI_Doctor").mkdir(parents=True)
    (g / "02-AI_Doctor_5min").mkdir()
    assert find_project("02", tmp_path) == g / "02-AI_Doctor_5min"
    assert next_number(tmp_path) == 3


def test_channel_folders_are_searched_and_numbered(tmp_path):
    """Bug 2026-11-17: moving projects into 'The Dark World/' hid them from find_project and next_number."""
    (tmp_path / "01_First").mkdir()
    ch = tmp_path / "The Dark World"
    (ch / "03_Third").mkdir(parents=True)
    (tmp_path / "_deleted" / "09_old-20261111").mkdir(parents=True)  # trash is never a project
    assert next_number(tmp_path) == 4
    assert find_project("3", tmp_path) == ch / "03_Third"
    assert find_project("01", tmp_path) == tmp_path / "01_First"
