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
