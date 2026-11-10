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
        html = build_dir / "index.html"  # remotion templates have no index.html
        tpl = "chart" if html.exists() and 'id="bars"' in html.read_text("utf-8") else "other"
        calls.append(scene["id"])
        if tpl in fail:
            raise RuntimeError("boom")
        # deliberately 5 frames: the renderer must pad/trim to the scene's exact length
        _ffmpeg("-f", "lavfi", "-i", "color=c=red:s=64x36:r=30", "-frames:v", "5", "-pix_fmt", "yuv420p", str(out))
    return render


def test_frames_add_up_without_drift():
    plan = _plan()
    assert sum(rnd.frame_count(s, FPS) for s in plan.scenes) == round(plan.scenes[-1].end * FPS)
    assert rnd.size_for(1920, 1080, False) == (854, 480) and rnd.size_for(1080, 1920, False) == (480, 854)
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


def test_assemble_mixes_ducked_music_and_sfx_at_target_loudness(tmp_path):
    from pipeline.assemble import loudness, pick_music, sfx_cues
    lib = tmp_path / "lib"
    (lib / "music" / "calm").mkdir(parents=True)
    (lib / "sfx" / "whoosh").mkdir(parents=True)
    _ffmpeg("-f", "lavfi", "-i", "sine=frequency=220:duration=1", str(lib / "music" / "calm" / "m.wav"))
    _ffmpeg("-f", "lavfi", "-i", "anoisesrc=d=0.3:a=0.5", str(lib / "sfx" / "whoosh" / "w.wav"))
    assert pick_music(lib, "dramatic") is None and pick_music(lib, "") is None  # missing folder = no music
    music = pick_music(lib, "calm")
    cues = sfx_cues([(1, 0, "photo", {}), (2, 1.0, "headline", {}), (3, 1.5, "photo", {"sfx": "click"})], lib)
    assert [round(t, 2) for t, _ in cues] == [0.85]  # whoosh before the cut into a graphic; no click folder
    clip, audio, out = tmp_path / "c.mp4", tmp_path / "a.wav", tmp_path / "o.mp4"
    _ffmpeg("-f", "lavfi", "-i", "color=c=blue:s=64x36:r=30", "-frames:v", "30", "-pix_fmt", "yuv420p", str(clip))
    _ffmpeg("-f", "lavfi", "-i", "sine=frequency=440:duration=1.5", "-af", "volume=-20dB", str(audio))
    assemble([clip, clip], audio, out, FPS, 60, music, cues)  # music loops past its 1 s length
    assert rnd.frames_of(out) == 60
    assert abs(loudness(out) + 14) < 1.0


def test_parallax_only_when_cutout_exists(tmp_path):
    from pipeline.contracts import Prepared, PreparedScene
    img = tmp_path / "p.png"
    _ffmpeg("-f", "lavfi", "-i", "color=c=red:s=32x18", "-frames:v", "1", str(img))
    plan = _plan()
    plan.scenes[2].params["parallax"] = True
    res = Resolved(scenes=RESOLVED.scenes[:2] + [ResolvedScene(id=3, status="project", asset="p.png")])
    pick = lambda prep: rnd.plan_jobs(plan, res, BRAND, "16:9", tmp_path, tmp_path / "o", False, None, prep)[2].template  # noqa: E731
    assert pick(None) == "photo"
    assert pick(Prepared(scenes=[PreparedScene(id=3, error="no clear subject")])) == "photo"  # fallback
    assert pick(Prepared(scenes=[PreparedScene(id=3, fg="p.png", bg="p.png")])) == "photo_parallax"
    plan.scenes[2].visual_type = "logo"  # a logo split into layers was cropped huge (01 scene 3): keep it whole
    assert pick(Prepared(scenes=[PreparedScene(id=3, fg="p.png", bg="p.png")])) == "photo"


def test_qa_flags_black_and_frozen_video(tmp_path):
    from pipeline.qa import video_events
    v = tmp_path / "v.mp4"
    _ffmpeg("-f", "lavfi", "-i", "color=c=black:s=64x36:r=30:d=2", "-f", "lavfi", "-i", "color=c=red:s=64x36:r=30:d=6",
            "-filter_complex", "[0][1]concat=n=2", "-pix_fmt", "yuv420p", str(v))
    black, freeze = video_events(v)
    assert black and freeze


def test_build_follows_template_engine(tmp_path, monkeypatch):
    jobs = rnd.plan_jobs(_plan(), RESOLVED, BRAND, "16:9", tmp_path, tmp_path / "o", final=False)
    real = rnd.load_template  # headline ships both engines; force Remotion to cover that path
    monkeypatch.setattr(rnd, "load_template", lambda n: real(n).model_copy(
        update={"engine": "remotion"}) if n == "headline" else real(n))
    for j, want in zip(jobs[:2], ("Composition.jsx", "index.html")):  # headline -> remotion, chart -> hyperframes
        rnd.build(j, tmp_path / j.template, j.template)
        assert (tmp_path / j.template / "scene.json").exists() and (tmp_path / j.template / want).exists()


def test_template_scenes_pick_by_params():
    plan = _plan()
    plan.scenes[0].params["events"] = [{"date": "2022", "label": "ChatGPT"}]
    assert rnd.pick_template(plan.scenes[0], RESOLVED.scenes[0]) == "timeline"
    shot = plan.scenes[2].model_copy(update={"visual_type": "screenshot"})
    assert rnd.pick_template(shot, ResolvedScene(id=3, status="project", asset="a/s.png")) == "screenshot"
    assert rnd.pick_template(shot, ResolvedScene(id=3, status="project", asset="a/s.mp4")) == "video_clip"


def test_map_scene_needs_focus_or_pin():
    from pipeline.contracts import Scene
    m = Scene(id=1, start=0, end=1, narration="x", visual_type="map", query="q")
    t = ResolvedScene(id=1, status="template")
    assert rnd.pick_template(m, t) == "headline"  # nothing to show on a map -> text card
    assert rnd.pick_template(m.model_copy(update={"params": {"focus": "Telangana"}}), t) == "map"
    assert "Telangana" in (rnd.TEMPLATES / "map" / "map.js").read_text("utf-8")  # offline data ships with it


def test_brand_fonts_load_from_folder_without_faux_bold(tmp_path):
    fonts, out = tmp_path / "fonts", tmp_path / "build"
    (fonts / "Gidugu").mkdir(parents=True)
    (fonts / "Gidugu" / "Gidugu-Regular.ttf").write_bytes(b"x")
    (fonts / "Hind").mkdir()
    for s in ("Regular", "Bold"):
        (fonts / "Hind" / f"Hind-{s}.ttf").write_bytes(b"x")
    out.mkdir()
    css = rnd.font_css(["Gidugu", "Hind", "Not Saved", "Gidugu"], out, fonts)
    assert css.count("@font-face") == 3  # duplicates once, unknown family -> system font
    assert 'font-family: "Gidugu"; src: url("font0.ttf"); font-weight: 100 900' in css  # one file = every weight
    assert "font-weight: 700" in css and (out / "font2.ttf").exists()


def test_cutout_poster_needs_its_cut(tmp_path):
    from pipeline.contracts import Prepared, PreparedScene
    img = tmp_path / "p.png"
    _ffmpeg("-f", "lavfi", "-i", "color=c=red:s=32x18", "-frames:v", "1", str(img))
    plan = _plan()
    plan.scenes[2].params["cutout"] = True
    res = Resolved(scenes=RESOLVED.scenes[:2] + [ResolvedScene(id=3, status="project", asset="p.png")])
    pick = lambda prep: rnd.plan_jobs(plan, res, BRAND, "16:9", tmp_path, tmp_path / "o", False, None, prep)[2].template  # noqa: E731
    assert pick(Prepared(scenes=[PreparedScene(id=3, fg="p.png", bg="p.png")])) == "photo"  # no tight cut -> photo
    assert pick(Prepared(scenes=[PreparedScene(id=3, fg="p.png", bg="p.png", cut="p.png")])) == "cutout_title"


def test_transitions_pair_both_sides_of_each_cut():
    plan = _plan()
    plan.scenes[2].params["transition"] = "cut"  # per-scene override: hard cut into scene 3
    b = BRAND.model_copy(update={"transitions": ["wipe", "bogus"]})
    assert rnd.transitions(plan, b) == {1: ("", "wipe"), 2: ("wipe", ""), 3: ("", "")}
    assert rnd.transitions(plan, BRAND) == {1: ("", ""), 2: ("", ""), 3: ("", "")}  # no list = hard cuts


def test_kinetic_and_cards_pick_by_params():
    s = _plan().scenes[0]
    t = ResolvedScene(id=1, status="template")
    assert rnd.pick_template(s.model_copy(update={"params": {"lines": [{"text": "a"}]}}), t) == "kinetic"
    assert rnd.pick_template(s.model_copy(update={"params": {"items": ["a"], "lines": [{"text": "a"}]}}), t) == "cards"


def test_quote_picks_by_params():
    s = _plan().scenes[0].model_copy(update={"params": {"quote": {"text": "a", "by": "b"}}})
    assert rnd.pick_template(s, ResolvedScene(id=1, status="template")) == "quote"


def test_safe_workers_follow_free_ram():
    assert rnd.safe_workers(2, 3.7) == 2      # plenty: as asked
    assert rnd.safe_workers(2, 1.6) == 1      # low: one at a time
    assert rnd.safe_workers(2, 0.2) == 1      # never zero
    assert rnd.safe_workers(4, float("inf")) == 4  # unknown: as asked
    assert rnd.free_ram_gb() > 0


def test_meme_param_picks_the_meme_template_and_callout_is_drawn(tmp_path):
    plan = _plan()
    plan.scenes[0].params = {"meme": {"lines": ["x"]}, "marks": [{"type": "callout", "x": .1, "y": .1, "text": "Look"}]}
    res = Resolved(scenes=[ResolvedScene(id=1, status="template")] + RESOLVED.scenes[1:])
    job = rnd.plan_jobs(plan, res, BRAND, "16:9", tmp_path, tmp_path / "o", False)[0]
    assert job.template == "meme"
    rnd.build(job, tmp_path / "b", job.template)
    js = (tmp_path / "b" / "studio.js").read_text("utf-8")
    assert 'm.type === "callout"' in js and "memeSlots" in js and (tmp_path / "b" / "index.html").exists()


def test_rows_pick_cards_and_hero_font_falls_back_to_heading(tmp_path):
    from pipeline import theme
    plan = _plan()
    plan.scenes[0].params = {"rows": [{"title": "Have", "items": [{"icon": "x", "label": "Time"}]}]}
    res = Resolved(scenes=[ResolvedScene(id=1, status="template")] + RESOLVED.scenes[1:])
    assert rnd.plan_jobs(plan, res, BRAND, "16:9", tmp_path, tmp_path / "o", False)[0].template == "cards"
    spec = theme.validate(theme.ThemeSpec(name="t", colors={"background": "#000000", "text": "#FFFFFF", "accent": "#FFC400"},
                                          fonts={"heading": "Gidugu", "body": "Gidugu", "script": "Gidugu", "hero": "NoSuchFont"}))
    assert spec.fonts["hero"] == "Gidugu" and any("fonts.hero" in i for i in spec.issues)
