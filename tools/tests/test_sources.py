"""Free asset sources (resolve): exact entity lookup and Lottie fetch, with fake network functions."""
import subprocess

from pipeline import providers
from pipeline.contracts import ScenePlan
from pipeline.resolve import credits, resolve


def _plan():
    s = lambda i, vt, params: {"id": i, "start": i - 1, "end": i, "narration": "x", "visual_type": vt,  # noqa: E731
                               "query": "q", "params": params}
    return ScenePlan(scenes=[s(1, "photo", {"entity": "Sam Altman"}), s(2, "motion_graphic", {"lottie": "🚀"}),
                             s(3, "logo", {"entity": "Nobody Corp"})])


def test_entity_and_lottie_are_fetched_with_credits(tmp_path):
    png = tmp_path / "src.png"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=32x18", "-frames:v", "1", str(png)],
                   check=True)
    project, library = tmp_path / "proj", tmp_path / "lib"
    (project / "assets").mkdir(parents=True)

    def download(url, dest):
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(b"{}" if dest.suffix == ".json" else png.read_bytes())

    def entity(name, logo):
        if name != "Sam Altman":
            return []
        return [providers.Candidate(url="https://x/sam.jpg", ext=".png", title="Sam Altman", source_url="https://commons/sam",
                                    license="CC BY 2.0", author="Steve", provider="wikidata")]

    res = resolve(_plan(), project, library, tmp_path, search=lambda *a: [], download=download, entity=entity,
                  icon=lambda name: None)
    s1, s2, s3 = res.scenes
    assert s1.status == "downloaded" and s1.license == "CC BY 2.0" and s1.asset.startswith("lib/downloads/wikidata_")
    assert s2.status == "template" and s2.asset == "lib/lottie/noto_1f680.json" and s2.license == "CC BY 4.0"
    assert s3.status == "missing"  # unknown brand and no Simple Icon -> prompt as usual
    assert "CC BY 2.0" in credits(res) and "Noto" in credits(res)


def test_emoji_code_matches_noto_names():
    assert providers.emoji_code("🚀") == "1f680"
    assert providers.emoji_code("❤️") == "2764"  # variation selector dropped
