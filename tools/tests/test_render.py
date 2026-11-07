"""Render/assemble logic with a fake engine (ffmpeg colour clips), so no Chrome render is needed."""
import json
import subprocess

from pipeline import render as rnd
from pipeline.assemble import assemble
from pipeline.contracts import Brand, Resolved, ResolvedScene, ScenePlan

FPS = 30
BRAND = Brand(formats={"16:9": {"width": 1920, "height": 1080}}, fps=FPS,
              colors={"background": "#0E0E10", "accent": "#FFC400", "text": "#FFFFFF"},
              fonts={"telugu": "Noto Sans Telugu", "latin": "Inter"})


def _plan(text1="One"):
    s = lambda i, vt, a, b, t="": {"id": i, "start": a, "end": b, "narration": "x", "visual_type": vt,  # noqa: E731
                                   "query": "q", "on_screen_text": t}
    return ScenePlan(scenes=[s(1, "text", 0, 0.41, text1), s(2, "chart", 0.41, 0.8), s(3, "photo", 0.8, 1.13)])


RESOLVED = Resolved(scenes=[ResolvedScene(id=1, status="template"), ResolvedScene(id=2, status="template"),
                            ResolvedScene(id=3, status="missing")])


def _ffmpeg(*args):
    subprocess.run(["ffmpeg", "-y", "-v", "error", *args], check=True)


def _fake(calls, fail):
    def render(build_dir, out, fps, final):
        scene = json.loads((build_dir / "scene.js").read_text("utf-8").split("=", 1)[1].rstrip(";\n"))
        tpl = "chart" if 'id="bars"' in (build_dir / "index.html").read_text("utf-8") else "other"
        calls.append(scene["id"])
        if tpl in fail:
            raise RuntimeError("boom")
        # deliberately 5 frames: the renderer must pad/trim to the scene's exact length
        _ffmpeg("-f", "lavfi", "-i", "color=c=red:s=64x36:r=30", "-frames:v", "5", "-pix_fmt", "yuv420p", str(out))
    return render


def test_frames_add_up_without_drift():
    plan = _plan()
    assert sum(rnd.frame_count(s, FPS) for s in plan.scenes) == round(plan.scenes[-1].end * FPS)
    assert rnd.size_for(1920, 1080, False) == (1280, 720) and rnd.size_for(1080, 1920, False) == (720, 1280)
    assert [rnd.pick_template(s, r) for s, r in zip(plan.scenes, RESOLVED.scenes)] == ["headline", "chart", "missing"]


def test_cache_isolation_and_single_scene_rerender(tmp_path):
    out = tmp_path / "16x9"
    calls = []
    jobs = rnd.plan_jobs(_plan(), RESOLVED, BRAND, "16:9", tmp_path, out, final=False)
    rep = rnd.render_format(jobs, "16:9", False, workers=2, render=_fake(calls, {"chart"}), log=lambda *_: None)
    assert [s.status for s in rep.scenes] == ["rendered", "failed", "rendered"]  # chart failed -> tile
    assert "chart" in rep.scenes[1].error
    for j in jobs:  # every clip exists with the exact frame count, even the failed one
        assert rnd.frames_of(j.out) == j.frames
    assert not jobs[1].out.with_suffix(".key").exists()  # failed scene is retried next run

    calls.clear()
    jobs = rnd.plan_jobs(_plan("Two"), RESOLVED, BRAND, "16:9", tmp_path, out, final=False)  # scene 1 edited
    rep = rnd.render_format(jobs, "16:9", False, render=_fake(calls, set()), log=lambda *_: None)
    assert sorted(calls) == [1, 2]  # edited scene + previously failed scene; scene 3 untouched
    assert [s.status for s in rep.scenes] == ["rendered", "rendered", "cached"]


def test_assemble_matches_scene_length_and_has_audio(tmp_path):
    clip, audio, out = tmp_path / "c.mp4", tmp_path / "a.wav", tmp_path / "o.mp4"
    _ffmpeg("-f", "lavfi", "-i", "color=c=blue:s=64x36:r=30", "-frames:v", "30", "-pix_fmt", "yuv420p", str(clip))
    _ffmpeg("-f", "lavfi", "-i", "sine=frequency=440:duration=1.5", str(audio))
    assemble([clip, clip], audio, out, FPS, 60)
    assert rnd.frames_of(out) == 60
    streams = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(out)],
                             capture_output=True, text=True).stdout.split()
    assert sorted(streams) == ["audio", "video"]


def test_caption_pages_split_on_count_pause_and_cut():
    from pipeline.contracts import Scene, Word
    w = lambda t, a, b: Word(text=t, start=a, end=b)  # noqa: E731
    words = [w("a", 0.9, 1.0), w("b", 1.0, 1.2), w("c", 1.2, 1.4), w("d.", 1.4, 1.6), w("e", 1.6, 1.8),
             w("f", 2.6, 2.8), w("g", 2.95, 3.2)]
    scene = Scene(id=1, start=1.0, end=3.0, narration="x", visual_type="text", query="q")
    pages = rnd.caption_pages(scene, words, 3)
    # "a" (midpoint before the cut) and "g" (midpoint after) belong to other scenes
    assert [[x["t"] for x in p] for p in pages] == [["b", "c", "d."], ["e"], ["f"]]
    assert pages[0][0]["s"] == 0.0 and pages[2][0]["s"] == 1.6
