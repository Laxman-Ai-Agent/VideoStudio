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
    assert (b / "drop" / "_unknown").is_dir() and (b / "work" / "scenes").is_dir()
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
