"""Exact-name asset providers (resolve stage): Wikidata person / brand images, Simple Icons logos,
animated Noto emoji. No keyword image search here: loose images are collected with the
asset-collector MCP and dropped in by asset id. stdlib urllib only."""
import json
import re
import urllib.parse
import urllib.request
from dataclasses import dataclass

UA = "VideoStudio/0.1 (personal documentary pipeline)"  # Wikimedia requires a User-Agent
WIKI_API = "https://commons.wikimedia.org/w/api.php"
TIMEOUT = 20


@dataclass
class Candidate:
    url: str          # file to download
    ext: str
    title: str        # text checked against the scene query
    source_url: str   # page to credit
    license: str
    author: str
    provider: str


def _get(url: str, headers: dict | None = None) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.load(r)


def download(url: str, dest) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".tmp")
    with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    tmp.replace(dest)


def _strip(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()


WIKIDATA_API = "https://www.wikidata.org/w/api.php"


def entity(name: str, logo: bool) -> list[Candidate]:
    """Exact person / brand by name (Wikidata, no key): the logo (P154) for logo scenes, else the main
    image (P18), as a Commons file with its licence. Far more reliable than a keyword search for
    'Sam Altman' or 'Anthropic'."""
    qs = urllib.parse.urlencode({"action": "wbsearchentities", "search": name, "language": "en",
                                 "limit": 1, "format": "json"})
    hits = _get(f"{WIKIDATA_API}?{qs}").get("search", [])
    if not hits:
        return []
    qs = urllib.parse.urlencode({"action": "wbgetclaims", "entity": hits[0]["id"], "format": "json"})
    claims = _get(f"{WIKIDATA_API}?{qs}").get("claims", {})
    for prop in (("P154", "P18") if logo else ("P18",)):
        for c in claims.get(prop, []):
            f = c.get("mainsnak", {}).get("datavalue", {}).get("value")
            if f:
                qs = urllib.parse.urlencode({"action": "query", "format": "json", "titles": f"File:{f}",
                                             "prop": "imageinfo", "iiprop": "url|extmetadata|mime", "iiurlwidth": 1920})
                found = _commons(_get(f"{WIKI_API}?{qs}").get("query", {}).get("pages", {}), "wikidata")
                for x in found:
                    x.title = f"{name} {hits[0].get('description', '')} {x.title}"
                if found:
                    return found
    return []


def simple_icon(name: str) -> str | None:
    """Brand icon SVG in the brand colour from Simple Icons (CC0 data; trademarks stay with their
    owners). Some brands are not there (removed on request), so this is a fallback."""
    slug = re.sub(r"[^a-z0-9]", "", name.lower().replace("+", "plus").replace(".", "dot").replace("&", "and"))
    req = urllib.request.Request(f"https://cdn.simpleicons.org/{slug}", headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            svg = r.read().decode("utf-8")
    except Exception:  # noqa: BLE001 - 404 = brand not in Simple Icons
        return None
    return svg if svg.lstrip().startswith("<svg") else None


def emoji_code(emoji: str) -> str:
    """'🚀' -> '1f680'; sequences joined by '_', variation selector dropped (Noto file naming)."""
    return "_".join(f"{ord(c):x}" for c in emoji if ord(c) != 0xFE0F)


def noto_lottie(emoji: str) -> Candidate | None:
    """Google's animated Noto emoji as Lottie JSON (CC BY 4.0), e.g. '🚀', '🤖', '💼'."""
    code = emoji_code(emoji)
    if not code:
        return None
    return Candidate(url=f"https://fonts.gstatic.com/s/e/notoemoji/latest/{code}/lottie.json", ext=".json",
                     title=f"animated emoji {emoji}", source_url="https://googlefonts.github.io/noto-emoji-animation/",
                     license="CC BY 4.0", author="Google Noto Emoji", provider="noto")


def _commons(pages: dict, provider: str) -> list[Candidate]:
    out = []
    for p in sorted(pages.values(), key=lambda p: p.get("index", 0)):
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png", "image/svg+xml"):
            continue
        url = ii.get("thumburl") or ii.get("url", "")
        md = ii.get("extmetadata", {})
        val = lambda k: _strip(md.get(k, {}).get("value", ""))  # noqa: E731
        out.append(Candidate(url=url, ext=".png" if urllib.parse.urlparse(url).path.lower().endswith(".png") else ".jpg",
                             title=f"{p.get('title', '')} {val('ImageDescription')}"[:300],
                             source_url=ii.get("descriptionurl", ""), license=val("LicenseShortName"),
                             author=val("Artist")[:120], provider=provider))
    return out
