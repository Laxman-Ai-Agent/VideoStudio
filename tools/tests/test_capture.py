"""capture stage with a fake Chrome: never overwrites the user's file, re-captures on a new url."""
from pipeline.capture import capture
from pipeline.contracts import ScenePlan


def _plan(url):
    s = lambda i, vt, p: {"id": i, "start": i - 1, "end": i, "narration": "x", "visual_type": vt,  # noqa: E731
                          "query": "q", "params": p}
    return ScenePlan(scenes=[s(1, "screenshot", {"url": url}), s(2, "screenshot", {"url": url}),
                             s(3, "photo", {"url": url})])


def test_capture_keeps_user_files_and_follows_url(tmp_path):
    shots = tmp_path / "assets"
    shots.mkdir(parents=True)
    (shots / "scene_002.png").write_text("mine")
    calls = []
    fake = lambda url, dest, w, h: (calls.append((url, dest.name)), dest.write_text(url))  # noqa: E731
    log = tmp_path / "captures.json"
    capture(_plan("https://a.example"), tmp_path, log, fake)
    assert calls == [("https://a.example", "scene_001.png")]  # scene 2 is the user's, scene 3 not a screenshot
    capture(_plan("https://a.example"), tmp_path, log, fake)
    assert len(calls) == 1  # same url: nothing to do
    capture(_plan("https://b.example"), tmp_path, log, fake)
    assert calls[-1] == ("https://b.example", "scene_001.png") and (shots / "scene_002.png").read_text() == "mine"
