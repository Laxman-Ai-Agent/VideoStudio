r"""Resume check for kaggle/run.py (no Kaggle calls): tools\.venv\Scripts\python.exe -m pytest kaggle -q"""
import json

import run


def test_resume(tmp_path, monkeypatch):
    monkeypatch.setattr(run, "MARKER", tmp_path / "last_push.json")
    monkeypatch.setattr(run, "fetch", lambda: tmp_path)
    status = {"s": ""}
    monkeypatch.setattr(run, "kg", lambda *a, **k: status["s"])
    jobs = {"b": None, "a": None}
    assert run.resume(jobs) is None                      # nothing pushed before -> fresh run
    run.MARKER.write_text(json.dumps(["a", "b"]))
    for s in ("KernelWorkerStatus.RUNNING", "KernelWorkerStatus.COMPLETE"):
        status["s"] = s
        assert run.resume(jobs) == tmp_path               # same files: wait / download, no new push
    status["s"] = "KernelWorkerStatus.ERROR"
    assert run.resume(jobs) is None                      # failed run -> push again
    status["s"] = "KernelWorkerStatus.COMPLETE"
    assert run.resume({"c": None}) is None               # other files -> fresh run


def test_topic_images_one_run_for_every_variation(tmp_path):
    import images
    a = {"id": "A001", "method": "ai_generate", "prompt": {"text": "x", "aspect_ratio": "9:16"}}
    for v in ("16x9", "9x16"):
        (tmp_path / v).mkdir()
        (tmp_path / v / "visual-assets.json").write_text(json.dumps({"assets": [a]}), "utf-8")
    jobs, dests = images.topic_jobs(tmp_path, [], False)
    assert [j["id"] for j in jobs] == ["16x9_A001", "9x16_A001"]
    assert dests["9x16_A001"] == (tmp_path / "9x16" / "work" / "generated", "A001.png")
    (tmp_path / "16x9" / "work" / "generated").mkdir(parents=True)
    (tmp_path / "16x9" / "work" / "generated" / "A001.png").write_bytes(b"x")
    assert [j["id"] for j in images.topic_jobs(tmp_path, [], False)[0]] == ["9x16_A001"]  # already generated: skipped
