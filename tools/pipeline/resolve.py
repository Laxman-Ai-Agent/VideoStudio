"""resolve stage: scenes.json + asset indexes -> work/resolved.json (+ output/credits.txt).

Per scene, first hit wins:
1. `asset` set in scenes.json, or a project file named scene_NNN.* (returned from the prompts stage)
2. best description match in project assets, then `_library` (each asset used once per video)
3. motion_graphic / diagram / chart / text / map: no asset needed -> 'template' (rendered in Phase 3)
4. internet (providers.search), downloaded to `_library/downloads`, source + license kept
5. 'missing' -> the prompts stage writes a generation prompt
"""
import hashlib
import re
from collections.abc import Callable
from pathlib import Path

from . import assets, providers
from .contracts import AssetEntry, Resolved, ResolvedScene, Scene, ScenePlan

TEMPLATE_TYPES = {"motion_graphic", "diagram", "chart", "text", "map"}
THRESHOLD = 0.34  # share of query keywords found in the description
STOP = set("""the and for with from into onto that this these those its are was were has have had
not but out off over under about than then them they their there here what when where which who
why how all any each few more most other some such only own same too very can will just shot
side wide close looking working own using used use one two three because of to in on at by an as
is it or be we do so up no my""".split())
NET_THRESHOLD = 0.5  # internet titles must cover half the query: search engines match loosely


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


def _internet(scene: Scene, library: Path, lib_index: Path, root: Path, pexels_key: str,
              search: Callable, download: Callable) -> ResolvedScene | None:
    kind = "video" if scene.visual_type == "footage" else "image"
    q = keywords(scene.query)
    if not q:
        return None
    need = max(min(2, len(q)), NET_THRESHOLD * len(q))
    for words in dict.fromkeys((" ".join(q[:4]), " ".join(q[:2]))):
        for c in search(words, kind, scene.visual_type, pexels_key):
            if sum(w in set(keywords(c.title)) for w in q) < need:
                continue  # search engines return loose matches; skip off-topic files
            name = f"{c.provider}_{hashlib.sha1(c.url.encode()).hexdigest()[:10]}{c.ext}"
            dest = library / "downloads" / name
            try:
                if not dest.exists():
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    download(c.url, dest)
            except Exception as e:
                print(f"    (download failed: {type(e).__name__}: {e})")
                continue
            idx = assets.update(library, lib_index)
            for h, e in idx.assets.items():
                if e.file == f"downloads/{name}":
                    idx.assets[h] = e = e.model_copy(update={
                        "description": e.description or c.title, "query": scene.query,
                        "source_url": c.source_url, "license": c.license, "author": c.author})
                    assets.save(lib_index, idx)
                    return _hit("downloaded", library, e, root)
    return None


def resolve(plan: ScenePlan, project: Path, library: Path, root: Path, pexels_key: str = "",
            search: Callable = providers.search, download: Callable = providers.download) -> Resolved:
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
        if s.asset and (project / s.asset).exists():
            r = ResolvedScene(id=0, status="project", asset=_rel(project / s.asset, root))
        elif s.id in by_scene:
            got = by_scene[s.id]
            r = _hit("project", base, got.get(False) or got[True], root)
            if True in got:
                r.asset_9x16 = _rel(base / got[True].file, root)
        else:
            for status, b, idx in (("project", base, proj), ("library", library, assets.load(lib_index))):
                sc, h = _best(s, b, idx, used)
                if h and sc >= THRESHOLD:
                    used.add(h)
                    r = _hit(status, b, idx.assets[h], root, sc)
                    break
        if r is None and s.visual_type in TEMPLATE_TYPES:
            r = ResolvedScene(id=0, status="template")
        if r is None:
            r = _internet(s, library, lib_index, root, pexels_key, search, download)
        r = r or ResolvedScene(id=0, status="missing")
        r.id = s.id
        print(f"    scene {s.id:>3}: {r.status:<10} {r.asset or ''}")
        out.append(r)
    return Resolved(scenes=out)


def credits(res: Resolved) -> str:
    lines = [f"Scene {r.id}: {r.source_url} · {r.author or 'unknown author'} · {r.license or 'see source'}"
             for r in res.scenes if r.source_url]
    return "Image and footage credits\n\n" + ("\n".join(lines) if lines else "No third-party assets.") + "\n"
