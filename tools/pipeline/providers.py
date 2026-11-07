"""Internet asset providers (resolve stage). Each returns candidates for a keyword query; any network
or API error returns [] so the scene just becomes 'missing' (gets a prompt). The run never fails
because of the internet. stdlib urllib only (no httpx: two GET endpoints don't need a library)."""
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


def wikimedia(query: str, kind: str) -> list[Candidate]:
    """Commons file search, images only (SVG logos come back as PNG renders). No key needed."""
    if kind != "image":
        return []
    qs = urllib.parse.urlencode({
        "action": "query", "format": "json", "generator": "search", "gsrnamespace": 6,
        "gsrsearch": query, "gsrlimit": 8, "prop": "imageinfo",
        "iiprop": "url|extmetadata|mime", "iiurlwidth": 1920})
    pages = _get(f"{WIKI_API}?{qs}").get("query", {}).get("pages", {})
    out = []
    for p in sorted(pages.values(), key=lambda p: p.get("index", 0)):
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png", "image/svg+xml"):
            continue
        url = ii.get("thumburl") or ii.get("url", "")
        md = ii.get("extmetadata", {})
        val = lambda k: _strip(md.get(k, {}).get("value", ""))  # noqa: E731
        out.append(Candidate(url=url, ext=".png" if url.lower().endswith(".png") else ".jpg",
                             title=f"{p.get('title', '')} {val('ImageDescription')}"[:300],
                             source_url=ii.get("descriptionurl", ""), license=val("LicenseShortName"),
                             author=val("Artist")[:120], provider="wikimedia"))
    return out


def pexels(query: str, kind: str, key: str) -> list[Candidate]:
    """Pexels photos / videos (free license, credit appreciated). Skipped when there is no key."""
    if not key:
        return []
    qs = urllib.parse.urlencode({"query": query, "per_page": 5, "orientation": "landscape"})
    auth = {"Authorization": key}
    if kind == "image":
        return [Candidate(url=ph["src"]["large2x"], ext=".jpg", title=ph.get("alt", ""),
                          source_url=ph["url"], license="Pexels License",
                          author=ph.get("photographer", ""), provider="pexels")
                for ph in _get(f"https://api.pexels.com/v1/search?{qs}", auth).get("photos", [])]
    out = []
    for v in _get(f"https://api.pexels.com/videos/search?{qs}", auth).get("videos", []):
        files = [f for f in v.get("video_files", [])
                 if f.get("file_type") == "video/mp4" and (f.get("width") or 0) <= 1920]
        if not files:
            continue
        best = max(files, key=lambda f: f.get("width") or 0)
        title = v["url"].rstrip("/").rsplit("/", 1)[-1].replace("-", " ")  # page slug = description
        out.append(Candidate(url=best["link"], ext=".mp4", title=title, source_url=v["url"],
                             license="Pexels License", author=v.get("user", {}).get("name", ""),
                             provider="pexels"))
    return out


def search(query: str, kind: str, visual_type: str, pexels_key: str) -> list[Candidate]:
    """Stock photos/footage: Pexels first. Logos/screenshots: Wikimedia first (real, named things)."""
    order = ([lambda: pexels(query, kind, pexels_key), lambda: wikimedia(query, kind)]
             if visual_type in ("photo", "footage") else
             [lambda: wikimedia(query, kind), lambda: pexels(query, kind, pexels_key)])
    out = []
    for fn in order:
        try:
            out += fn()
        except Exception as e:  # offline, rate limit, API change: degrade to 'missing'
            print(f"    (search skipped: {type(e).__name__}: {e})")
    return out
