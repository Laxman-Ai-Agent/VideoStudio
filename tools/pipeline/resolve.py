"""resolve stage: scenes.json + asset indexes -> work/resolved.json (+ output/credits.txt).

Per scene, first hit wins:
1. a validated main visual from visual-assets.json, `asset` set in scenes.json, or a project file scene_NNN.*
2. `params.entity` (exact person / brand): Wikidata photo or logo, Simple Icons for logos (no key)
3. best description match in project assets, then `_library` (each asset used once per video)
4. motion_graphic / diagram / chart / text / map: no asset needed -> 'template' (`params.lottie` fetches
   the animation: an emoji -> Google's animated Noto emoji in `_library/lottie`, or a project .json)
5. 'missing' -> visual-assets.json holds its generation prompt (visual.sync adds one if needed)
"""
import hashlib
import re
from collections.abc import Callable
from pathlib import Path

from . import assets, providers
from .contracts import AssetEntry, Resolved, ResolvedScene, Scene, ScenePlan

TEMPLATE_TYPES = {"motion_graphic", "diagram", "chart", "text", "map"}
TEMPLATE_PARAMS = ("lines", "bg_word", "items", "stat", "button", "rows", "quote", "meme", "events", "focus", "pin", "lottie", "bars", "number")
THRESHOLD = 0.34  # share of query keywords found in the description
STOP = set("""the and for with from into onto that this these those its are was were has have had
not but out off over under about than then them they their there here what when where which who
why how all any each few more most other some such only own same too very can will just shot
side wide close looking working own using used use one two three because of to in on at by an as
is it or be we do so up no my""".split())


def keywords(text: str) -> list[str]:
    """Lowercase content words, crude singular ('logos' -> 'logo'), order kept, no duplicates."""
    out = []
    for w in re.findall(r"[a-z0-9]+", text.lower()):
        if len(w) < 2 or w in STOP:  # 2 letters kept for "AI", "TV", "UK"
            continue
        w = w[:-1] if len(w) > 3 and w.endswith("s") and not w.endswith("ss") else w
        if w not in out:
            out.append(w)
    return out


def score(query: list[str], text: str) -> float:
    have = set(keywords(text))
    return sum(w in have for w in query) / len(query) if query else 0.0


def _rel(p: Path, root: Path) -> str:
    return p.resolve().relative_to(root.resolve()).as_posix()


def _hit(status: str, base: Path, e: AssetEntry, root: Path, sc: float = 1.0) -> ResolvedScene:
    return ResolvedScene(id=0, status=status, asset=_rel(base / e.file, root),
                         thumb=_rel(base / e.thumb, root) if e.thumb else None, score=round(sc, 2),
                         source_url=e.source_url, license=e.license, author=e.author)


def _best(scene: Scene, base: Path, idx, used: set[str]) -> tuple[float, str | None]:
    q = keywords(scene.query)
    best, key = 0.0, None
    for h, e in idx.assets.items():
        if h in used or assets.SCENE_FILE.match(Path(e.file).stem):
            continue
        s = score(q, f"{e.description} {e.query}")
        if scene.visual_type == "footage" and e.kind == "image":
            s *= 0.7  # a still can stand in for footage (Ken Burns), but a clip is better
        if s > best:
            best, key = s, h
    return best, key


def _take(c, scene: Scene, library: Path, lib_index: Path, root: Path, download: Callable,
          make: Callable | None = None) -> ResolvedScene | None:
    """Fetch one candidate into _library/downloads (cached by URL; `make(dest)` builds the file
    instead of downloading it), index it and keep its credits."""
    name = f"{c.provider}_{hashlib.sha1(c.url.encode()).hexdigest()[:10]}{c.ext}"
    dest = library / "downloads" / name
    try:
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            make(dest) if make else download(c.url, dest)
    except Exception as e:
        print(f"    (download failed: {type(e).__name__}: {e})")
        return None
    idx = assets.update(library, lib_index)
    for h, e in idx.assets.items():
        if e.file == f"downloads/{name}":
            idx.assets[h] = e = e.model_copy(update={
                "description": e.description or c.title, "query": scene.query,
                "source_url": c.source_url, "license": c.license, "author": c.author})
            assets.save(lib_index, idx)
            return _hit("downloaded", library, e, root)
    return None


def _icon_card(svg: str, dest: Path) -> None:
    """Simple Icons SVG -> 1920x1080 PNG on a transparent background, logo centred (headless Chrome)."""
    from .chrome import screenshot
    src, page = dest.with_suffix(".svg"), dest.with_suffix(".html")
    src.write_text(svg, "utf-8")
    page.write_text(f'<body style="margin:0;background:transparent"><div style="width:1920px;height:1080px;display:flex;'
                    f'align-items:center;justify-content:center"><img src="{src.name}" style="height:44%"></div>', "utf-8")
    try:
        screenshot(page, dest, 1920, 1080, transparent=True)
    finally:
        page.unlink(missing_ok=True)
        src.unlink(missing_ok=True)


def _named(scene: Scene, library: Path, lib_index: Path, root: Path, entity: Callable, icon: Callable,
           download: Callable) -> ResolvedScene | None:
    """`params.entity` = an exact person / brand name: Wikidata photo or logo, then (logos) Simple Icons."""
    name, logo = str(scene.params["entity"]), scene.visual_type == "logo"
    try:
        for c in entity(name, logo):
            if r := _take(c, scene, library, lib_index, root, download):
                return r
        svg = icon(name) if logo else None
    except Exception as e:  # noqa: BLE001 - offline / API change: keep resolving the usual way
        print(f"    (entity lookup skipped: {type(e).__name__}: {e})")
        return None
    if not svg:
        return None
    c = providers.Candidate(url=f"https://simpleicons.org/?q={name}", ext=".png", title=f"{name} logo",
                            source_url="https://simpleicons.org", license="CC0 (Simple Icons; trademark of its owner)",
                            author="Simple Icons", provider="simpleicons")
    return _take(c, scene, library, lib_index, root, download, make=lambda dest: _icon_card(svg, dest))


def _lottie(scene: Scene, project: Path, library: Path, root: Path, download: Callable) -> ResolvedScene | None:
    """`params.lottie`: a project .json path, or an emoji fetched as Google's animated Noto emoji."""
    v = str(scene.params["lottie"])
    if v.lower().endswith(".json"):
        f = project / v
        return ResolvedScene(id=0, status="template", asset=_rel(f, root)) if f.exists() else None
    c = providers.noto_lottie(v)
    if not c:
        return None
    dest = library / "lottie" / f"noto_{providers.emoji_code(v)}.json"
    try:
        if not dest.exists():
            download(c.url, dest)
    except Exception as e:  # noqa: BLE001 - offline: the scene renders as a text card
        print(f"    (lottie download failed: {type(e).__name__}: {e})")
        return None
    return ResolvedScene(id=0, status="template", asset=_rel(dest, root), source_url=c.source_url,
                         license=c.license, author=c.author)


CATEGORY_VISUAL = {"logo": "logo", "video_broll": "footage", "screenshot": "screenshot"}


def fetch_asset(a, library: Path, root: Path, download: Callable = providers.download,
                entity: Callable = providers.entity, icon: Callable = providers.simple_icon) -> tuple[Path, dict] | None:
    """One visual-assets.json entry (method online / real_logo) by exact name (Wikidata, Simple Icons):
    logos and "entity:Name" hints. Anything else stays 'needed' (collect it with the asset-collector MCP)."""
    hint = a.source_hint or a.name
    if not (a.method == "real_logo" or hint.startswith("entity:")):
        return None
    name = hint.removeprefix("entity:").strip()
    s = Scene(id=a.scenes[0] if a.scenes else 1, start=0, end=1, narration="", query=a.description or name,
              visual_type=CATEGORY_VISUAL.get(a.category, "logo" if a.method == "real_logo" else "photo"),
              params={"entity": name})
    r = _named(s, library, library / "index.json", root, entity, icon, download)
    if not r or not r.asset:
        return None
    return root / r.asset, {"source_url": r.source_url, "license": r.license, "author": r.author}


def resolve(plan: ScenePlan, project: Path, library: Path, root: Path, download: Callable = providers.download,
            entity: Callable = providers.entity, icon: Callable = providers.simple_icon,
            main_assets: dict[int, Path] | None = None) -> Resolved:
    """`main_assets`: scene id -> validated main file from visual-assets.json (wins over everything)."""
    base = project / "assets"
    proj, lib_index = assets.load(base / "index.json"), library / "index.json"
    by_scene: dict[int, dict[bool, AssetEntry]] = {}
    for e in proj.assets.values():
        if m := assets.SCENE_FILE.match(Path(e.file).stem):
            by_scene.setdefault(int(m[1]), {})[bool(m[2])] = e
    used: set[str] = set()
    out = []
    for s in plan.scenes:
        r = None
        if main_assets and s.id in main_assets and main_assets[s.id].exists():
            r = ResolvedScene(id=0, status="project", asset=_rel(main_assets[s.id], root))
        elif s.asset and (project / s.asset).exists():
            r = ResolvedScene(id=0, status="project", asset=_rel(project / s.asset, root))
        elif s.id in by_scene:
            got = by_scene[s.id]
            r = _hit("project", base, got.get(False) or got[True], root)
            if True in got:
                r.asset_9x16 = _rel(base / got[True].file, root)
        elif s.params.get("entity") and s.visual_type not in TEMPLATE_TYPES:
            r = _named(s, library, lib_index, root, entity, icon, download)
        if r is None and s.visual_type in TEMPLATE_TYPES and any(s.params.get(k) for k in TEMPLATE_PARAMS):
            r = ResolvedScene(id=0, status="template")  # the plan asked for a drawn scene: a loose photo match must not replace it
        if r is None:  # local match (also when an entity lookup found nothing)
            for status, b, idx in (("project", base, proj), ("library", library, assets.load(lib_index))):
                sc, h = _best(s, b, idx, used)
                if h and sc >= THRESHOLD:
                    used.add(h)
                    r = _hit(status, b, idx.assets[h], root, sc)
                    break
        if r is None and s.visual_type in TEMPLATE_TYPES:
            r = ResolvedScene(id=0, status="template")
        if s.params.get("lottie") and r and r.status == "template":
            r = _lottie(s, project, library, root, download) or r
        r = r or ResolvedScene(id=0, status="missing")
        r.id = s.id
        print(f"    scene {s.id:>3}: {r.status:<10} {r.asset or ''}")
        out.append(r)
    return Resolved(scenes=out)


def credits(res: Resolved, va=None) -> str:
    """One line per third-party file: resolve's own downloads, plus the online / logo files collected for
    visual-assets.json (main visuals and overlays; their credits live on the asset)."""
    line = lambda sc, url, author, lic: f"Scene {sc}: {url} · {author or 'unknown author'} · {lic or 'see source'}"  # noqa: E731
    rows = [(r.id, line(r.id, r.source_url, r.author, r.license)) for r in res.scenes if r.source_url]
    seen = {r.source_url for r in res.scenes if r.source_url}
    for a in (va.assets if va else []):
        c = a.credits or {}
        if a.status == "validated" and c.get("source_url") and c["source_url"] not in seen:
            seen.add(c["source_url"])
            rows.append((min(a.scenes or [0]), line(", ".join(map(str, a.scenes)) or "-", c["source_url"], c.get("author"), c.get("license"))))
    lines = [t for _, t in sorted(rows, key=lambda x: x[0])]
    return "Image and footage credits\n\n" + ("\n".join(lines) if lines else "No third-party assets.") + "\n"
