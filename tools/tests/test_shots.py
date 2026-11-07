"""Raw-footage cutting on a generated 3-colour clip (no real footage needed)."""
import subprocess

from pipeline import shots
from pipeline.assets import media_files


def test_spans_merge_short_and_split_long():
    assert shots.spans([0.5, 10.0, 10.8], 55.0) == [(0.0, 10.8), (10.8, 25.533), (25.533, 40.267), (40.267, 55.0)]
    assert shots.spans([], 3.0) == [(0.0, 3.0)]


def test_cut_raw_footage_into_shots(tmp_path):
    raw = tmp_path / "assets" / "raw_footage" / "talk.mp4"
    raw.parent.mkdir(parents=True)
    src = [x for c in ("red", "blue", "green") for x in ("-f", "lavfi", "-i", f"color=c={c}:s=160x90:r=25:d=2")]
    subprocess.run(["ffmpeg", "-y", "-v", "error", *src, "-filter_complex", "[0][1][2]concat=n=3",
                    "-pix_fmt", "yuv420p", str(raw)], check=True)
    files = shots.cut(raw, tmp_path / "assets" / "shots")
    assert [f.name for f in files] == ["talk_001.mp4", "talk_002.mp4", "talk_003.mp4"]
    assert media_files(tmp_path / "assets") == files  # the original is indexed only through its shots
