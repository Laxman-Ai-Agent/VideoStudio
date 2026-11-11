"""One topic, two videos: projects/03_Topic/16x9 and /9x16 with one shared drop/ and theme.json."""
import studio
from pipeline.identity import previous
from pipeline.ingest import ingest_shared
from pipeline.project import ensure_layout, find_project, ref


def _topic(tmp_path):
    t = tmp_path / "03_Topic"
    for v in ("16x9", "9x16"):
        ensure_layout(t / v)
    (t / "drop").mkdir()
    return t


def test_variation_lookup_layout_and_shared_drop(tmp_path):
    t = _topic(tmp_path)
    assert find_project("03/9x16", tmp_path) == t / "9x16" and ref(t / "9x16") == "03_Topic/9x16"
    assert not (t / "16x9" / "drop").exists()                      # one drop/ for the topic
    for n in ("pic.png", "voice.mp3"):
        (t / "drop" / n).write_bytes(b"x")
    moved = ingest_shared(t, duration=lambda f: 0)
    assert [d.relative_to(t).as_posix() for _, d in moved] == ["assets/originals/pic.png"]
    assert (t / "drop" / "voice.mp3").exists()                     # audio belongs to one variation: left alone
    assert "drop/pic.png" in (t / "project.md").read_text("utf-8")


def test_topic_run_asks_for_a_variation(tmp_path):
    assert studio.run_project(_topic(tmp_path)) == studio.NEEDS_USER


def test_variations_share_a_look_and_compare_with_earlier_topics(tmp_path):
    from pipeline.theme import build
    t = _topic(tmp_path)
    spec = build("tech video", {"preset": "tech"}).model_dump_json()
    for d in (tmp_path / "02_Old" / "work", t / "16x9" / "work"):
        d.mkdir(parents=True, exist_ok=True)
        (d / "theme.json").write_text(spec, "utf-8")
    assert [n for n, _ in previous(t / "9x16")] == ["02_Old"]     # not its sibling 16x9
    assert [n for n, _ in previous(tmp_path / "04_Next")] == ["03_Topic", "02_Old"]  # a later topic sees 03's look
