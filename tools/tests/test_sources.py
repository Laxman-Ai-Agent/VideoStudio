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

    res = resolve(_plan(), project, library, tmp_path, download=download, entity=entity,
                  icon=lambda name: None)
    s1, s2, s3 = res.scenes
    assert s1.status == "downloaded" and s1.license == "CC BY 2.0" and s1.asset.startswith("lib/downloads/wikidata_")
    assert s2.status == "template" and s2.asset == "lib/lottie/noto_1f680.json" and s2.license == "CC BY 4.0"
    assert s3.status == "missing"  # unknown brand and no Simple Icon -> prompt as usual
    assert "CC BY 2.0" in credits(res) and "Noto" in credits(res)


def test_emoji_code_matches_noto_names():
    assert providers.emoji_code("🚀") == "1f680"
    assert providers.emoji_code("❤️") == "2764"  # variation selector dropped


def test_credits_include_online_assets_from_visual_assets():
    """Seen on 03: credits.txt listed only resolve's downloads, not the 7 photos fetched for visual-assets.json."""
    from pipeline.contracts import Resolved, VisualAssets
    from pipeline.resolve import credits
    res = Resolved(scenes=[{"id": 2, "status": "template", "source_url": "https://noto", "license": "CC BY 4.0", "author": "Google"}])
    va = VisualAssets.model_validate({"assets": [
        {"id": "A1", "name": "launch", "category": "photo", "scenes": [7], "role": "main", "method": "online", "status": "validated",
         "credits": {"source_url": "https://commons/launch.jpg", "license": "GODL-India", "author": "ISRO"}},
        {"id": "A2", "name": "todo", "category": "photo", "scenes": [3], "method": "online", "credits": {"source_url": "https://x/never.jpg"}},
        {"id": "A3", "name": "same", "category": "photo", "scenes": [2], "method": "online", "status": "validated",
         "credits": {"source_url": "https://noto"}}]})
    text = credits(res, va)
    assert "Scene 7: https://commons/launch.jpg" in text and "ISRO" in text and "GODL-India" in text
    assert "never.jpg" not in text and text.count("https://noto") == 1
    assert text.index("Scene 2:") < text.index("Scene 7:")


def test_entity_skips_a_taxon_and_prefers_a_hit_with_a_logo(monkeypatch):
    """'DARPA' first matched Darpa, a butterfly genus (the video showed a butterfly as the logo)."""
    from pipeline import providers
    item = lambda q: {"mainsnak": {"datavalue": {"value": {"id": q}}}}  # noqa: E731
    file = lambda f: {"mainsnak": {"datavalue": {"value": f}}}  # noqa: E731
    claims = {"Q1": {"P31": [item("Q34740")], "P18": [file("Butterfly.jpg")]},          # genus Darpa
              "Q2": {"P31": [item("Q43229")], "P18": [file("Building.jpg")]},           # an organisation without a logo
              "Q3": {"P31": [item("Q43229")], "P154": [file("DARPA_Logo.svg")]}}
    asked = []

    def get(url):
        if "wbsearchentities" in url:
            return {"search": [{"id": q, "description": d} for q, d in (("Q1", "genus of insects"), ("Q2", "x"), ("Q3", "US agency"))]}
        if "wbgetclaims" in url:
            return {"claims": claims[url.split("entity=")[1].split("&")[0]]}
        asked.append(url)
        return {"query": {"pages": {"1": {"title": "File", "imageinfo": [{"mime": "image/svg+xml", "url": "https://x/" + url[-12:]}]}}}}

    monkeypatch.setattr(providers, "_get", get)
    found = providers.entity("DARPA", logo=True)
    assert found and "DARPA_Logo" in asked[0] and "US agency" in found[0].title
    assert "Building" in (providers.entity("DARPA", logo=False) and asked[-1])
