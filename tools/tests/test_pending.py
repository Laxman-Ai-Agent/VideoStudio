"""output/images_pending.txt: lists assets without a file (prompt, exact drop path, next steps); kept (as a prompt list) when none."""
from pipeline import pending
from pipeline.contracts import VisualAsset, VisualAssets


def _va(status):
    a = VisualAsset(id="A004", name="Wall", category="ai_image", scenes=[4], role="main", method="ai_generate",
                    status=status, prompt={"text": "a wall of scans", "tool": "Z-Image", "aspect_ratio": "9:16"},
                    timestamps=[{"scene": 4, "start": 6.1, "end": 9.8}],
                    output={"format": "png", "width": 1080, "height": 1920})
    return VisualAssets(project={"name": "10_X"}, assets=[a])


def test_pending_list_has_prompt_path_and_steps_then_stays_as_reference(tmp_path):
    p = tmp_path / "10_X"
    f = pending.write(_va("prompt_ready"), p)
    t = f.read_text("utf-8")
    assert f == p / "output" / "images_pending.txt"
    assert "a wall of scans" in t and str(p / "drop" / "A004.png") in t and "studio.cmd assets 10" in t and "6.1-9.8s" in t
    g = pending.write(_va("validated"), p)
    assert g == f and "ALL IMAGES ARE IN" in g.read_text("utf-8") and "a wall of scans" in g.read_text("utf-8")
