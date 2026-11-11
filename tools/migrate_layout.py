r"""Move an existing project to the simple layout (docs/ARCHITECTURE.md, "Project layout").

    tools\.venv\Scripts\python.exe tools\migrate_layout.py PROJECT_DIR [--apply] [--root STUDIO_ROOT]

Without --apply it only prints the report. Files are MOVED, never edited; only exact byte duplicates and
empty folders are deleted. Paths inside the project's JSON files are rewritten, and the cached scene
keys (they hash the scene's `asset` path) are rewritten too, so nothing is re-rendered.
"""
import argparse
import filecmp
import json
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pipeline.config import BRAND, ROOT  # noqa: E402

SCENE_PNG = re.compile(r"scene_\d{3}(_v)?\.", re.I)
REWRITE = ["visual-assets.json", "edits.json", "work/resolved.json", "work/scenes.json", "work/prepared/prepared.json"]
SKIP = ("work/scenes/", "work/preview/", "output/", "drop/")


def _same(a: Path, b: Path) -> bool:
    return a.stat().st_size == b.stat().st_size and filecmp.cmp(a, b, shallow=False)


def referenced(p: Path) -> set[str]:
    f = p / "visual-assets.json"
    if not f.exists():
        return set()
    return {a[k] for a in json.loads(f.read_text("utf-8")).get("assets", []) for k in ("source_file", "pending_file") if a.get(k)}


def target(rel: str, refs: set[str]) -> str | None:
    """New project-relative path for `rel`, or None when the file stays where it is."""
    parts = rel.split("/")
    name = parts[-1]
    if rel.startswith("assets/processed/pending/"):
        return "work/pending/out/" + name
    if rel.startswith("assets/generated/pending/"):
        return "work/pending/up/" + name
    if rel.startswith("assets/processed/"):
        return "work/replaced/" + name if re.search(r"\.v\d+\.", name) else "assets/" + name
    if rel.startswith("assets/generated/"):
        return "assets/originals/" + name if rel in refs else "work/replaced/" + name
    if rel.startswith("assets/screenshots/") and SCENE_PNG.match(name):
        return "assets/" + name  # a captured scene file: where capture.py writes now
    if parts[0] == "assets" and len(parts) > 2 and parts[1] in ("images", "logos", "screenshots", "videos"):
        return "assets/originals/" + "/".join(parts[2:])
    if rel.startswith("assets/raw_footage/"):
        return "assets/originals/raw_footage/" + "/".join(parts[2:])
    if rel.startswith("assets/.thumbs/"):
        return "work/thumbs/" + "/".join(parts[2:])
    if rel == "assets/index.json":
        return "work/assets_index.json"
    if rel.startswith("input/converted/"):
        return "input/voice/" + "/".join(parts[2:])
    if len(parts) == 1:
        if name.endswith(".py") and (name.startswith("make_") or name == "user_images.py"):
            return "scripts/" + name
        if re.match(r"gemini.*\.json$|script_.*\.txt$", name):
            return "input/" + name
        if name == "input_chunks.json":
            return "work/" + name
        if name.endswith(".log"):
            return "work/logs/" + name
        if name == "visual-assets.json.tmp":
            return "work/" + name
    if parts[0] == "prompts":
        return "work/" + rel
    return None


def _free(new: str, taken: set[str], p: Path) -> str:
    stem, dot, ext = new.rpartition(".") if "." in new.rsplit("/", 1)[-1] else (new, "", "")
    n = 1
    while (p / new).exists() or new in taken:
        new, n = f"{stem}__{n}{dot}{ext}", n + 1
    return new


def plan(p: Path) -> dict:
    refs = referenced(p)
    moves, dups, clashes, taken = [], [], [], set()
    for f in sorted(x for x in p.rglob("*") if x.is_file()):
        rel = f.relative_to(p).as_posix()
        if rel.startswith(SKIP) or not (new := target(rel, refs)):
            continue
        if (p / new).exists() and _same(f, p / new):
            dups.append((rel, new))
            continue
        if (p / new).exists() or new in taken:  # a different file with the same name: keep both
            new = _free(new, taken, p)
            clashes.append((rel, new))
        taken.add(new)
        moves.append((rel, new))
    # input/converted/audio.mp3 == input/audio.mp3: the second copy is a byte duplicate
    for rel, new in list(moves):
        twin = p / "input" / Path(new).name
        if new.startswith("input/voice/") and twin.is_file() and _same(p / rel, twin):
            moves.remove((rel, new))
            dups.append((rel, "input/" + twin.name))
    return {"moves": moves, "dups": dups, "clashes": clashes}


def report(p: Path, pl: dict) -> str:
    out = [f"{p.name}: {len(pl['moves'])} move(s), {len(pl['dups'])} exact duplicate(s) to delete"]
    kinds: dict[str, int] = {}
    for a, b in pl["moves"]:
        k = f"{a.rsplit('/', 1)[0] if '/' in a else '(root)'} -> {b.rsplit('/', 1)[0] if '/' in b else '(root)'}"
        kinds[k] = kinds.get(k, 0) + 1
    out += [f"  {n:4d}  {k}" for k, n in sorted(kinds.items())]
    out += [f"  DELETE (identical to {b}): {a}" for a, b in pl["dups"]]
    out += [f"  renamed on clash: {a} -> {b}" for a, b in pl["clashes"]]
    return "\n".join(out)


def _rewrite_text(text: str, mapping: dict[str, str]) -> str:
    for old in sorted(mapping, key=len, reverse=True):
        text = re.sub(r'(?<=["/])' + re.escape(old) + r'(?=")', lambda _m, n=mapping[old]: n, text)
    return text


def _keys(p: Path, root: Path) -> dict[Path, str]:
    try:
        return _keys_unsafe(p, root)
    except Exception as e:  # noqa: BLE001 - e.g. no scenes yet: nothing cached to keep
        print(f"  (cache keys not computed: {type(e).__name__}); scenes may re-render once")
        return {}


def _keys_unsafe(p: Path, root: Path) -> dict[Path, str]:
    """Render keys of every scene clip (preview and final, every format) as the pipeline computes them now."""
    from pipeline import edits, visual
    from pipeline import render as rnd
    from pipeline.contracts import Brand, Prepared, Resolved, ScenePlan, ThemeSpec, Transcript
    from pipeline.preview import _load
    w = p / "work"
    plan_, res = _load(ScenePlan, w / "scenes.json"), _load(Resolved, w / "resolved.json")
    if not plan_ or not res:
        return {}
    brand = Brand.model_validate_json((BRAND / "brand.json").read_text("utf-8"))
    tr, va = _load(Transcript, w / "transcript.json"), visual.load(p)
    out = {}
    for fmt in brand.formats:
        for final in (False, True):
            jobs = rnd.plan_jobs(plan_, res, brand, fmt, root, w / "scenes" / rnd.fmt_dir(fmt, final), final,
                                 tr.words if tr else None, _load(Prepared, w / "prepared" / "prepared.json"),
                                 _load(ThemeSpec, w / "theme.json"), visual.overlays(va, p, fmt), edits.layers(p, fmt))
            for j in jobs:
                out[j.out] = j.key
                if not final:
                    out[w / "preview" / rnd.fmt_dir(fmt, False) / f"scene_{j.scene.id:03d}"] = j.key
    return out


def _move_keys(old: dict[Path, str], new: dict[Path, str]) -> int:
    """Cached clips keep their place: swap the old key for the new one in the files that store it."""
    n = 0
    for path, k_old in old.items():
        k_new = new.get(path)
        if not k_new or k_new == k_old:
            continue
        files = [path.with_suffix(".key")] if path.suffix == ".mp4" else (list(path.glob("*")) if path.is_dir() else [])
        for f in files:
            if f.is_file() and f.stat().st_size < 200_000:
                try:
                    t = f.read_text("utf-8")
                except UnicodeDecodeError:
                    continue
                if k_old in t:
                    f.write_text(t.replace(k_old, k_new), "utf-8")
                    n += 1
    return n


def _dedupe_originals(p: Path) -> int:
    """An original that is byte-identical to its processed asset file is the same picture twice: keep one."""
    f = p / "visual-assets.json"
    if not f.exists():
        return 0
    doc, n = json.loads(f.read_text("utf-8")), 0
    for a in doc.get("assets", []):
        if not (a.get("source_file") and a.get("file")):
            continue
        src, out = p / a["source_file"], p / a["file"]
        if src.parent.name == "originals" and src.is_file() and out.is_file() and src != out and _same(src, out):
            src.unlink()
            a["source_file"] = ""
            n += 1
    if n:
        f.write_text(json.dumps(doc, ensure_ascii=False, indent=1), "utf-8")
    return n


def _patch_scripts(p: Path) -> int:
    n = 0
    for f in (p / "scripts").glob("*.py") if (p / "scripts").is_dir() else []:
        t = f.read_text("utf-8")
        new = (t.replace("Path(__file__).parent", "Path(__file__).resolve().parent.parent")
               .replace("assets/processed/", "assets/").replace('"assets" / "images"', '"assets" / "originals"')
               .replace("assets/images/", "assets/originals/"))
        if new != t:
            f.write_text(new, "utf-8")
            n += 1
    return n


def apply(p: Path, pl: dict, root: Path = ROOT) -> dict:
    old_keys = _keys(p, root)
    mapping = {}
    for a, b in pl["moves"]:
        (p / b).parent.mkdir(parents=True, exist_ok=True)
        shutil.move(p / a, p / b)
        mapping[a] = b
    for a, _ in pl["dups"]:
        (p / a).unlink()
    for rel in REWRITE:
        f = p / rel
        if f.exists():
            f.write_text(_rewrite_text(f.read_text("utf-8"), mapping), "utf-8")
    idx = p / "work" / "assets_index.json"
    if idx.exists():  # entry paths are relative to assets/
        m = {k[7:]: v[7:] for k, v in mapping.items() if k.startswith("assets/") and v.startswith("assets/")}
        doc = json.loads(idx.read_text("utf-8"))
        for e in doc.get("assets", {}).values():
            e["file"] = m.get(e["file"], e["file"])
            if e.get("thumb", "").startswith(".thumbs/"):
                e["thumb"] = "../work/thumbs/" + e["thumb"][8:]
        idx.write_text(json.dumps(doc, indent=2, ensure_ascii=False), "utf-8")
    fixed, patched = _dedupe_originals(p), _patch_scripts(p)
    keys = _move_keys(old_keys, _keys(p, root))
    for d in sorted((x for x in p.rglob("*") if x.is_dir()), key=lambda x: len(x.parts), reverse=True):
        if not any(d.iterdir()) and d.relative_to(p).as_posix() not in ("drop", "input", "work"):
            d.rmdir()
    from pipeline.script_out import write_script
    write_script(p)
    return {"moved": len(mapping), "deleted": len(pl["dups"]), "same_as_asset": fixed, "scripts": patched, "keys": keys}


if __name__ == "__main__":
    ap = argparse.ArgumentParser(usage=__doc__)
    ap.add_argument("project")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--root", default=str(ROOT))
    a = ap.parse_args()
    proj = Path(a.project).resolve()
    pl = plan(proj)
    print(report(proj, pl))
    if a.apply:
        print("done:", apply(proj, pl, Path(a.root)))
