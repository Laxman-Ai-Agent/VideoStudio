"""upload sheet: the Google Sheet "Video_Upload_Path" lists each project's upload files, one tab per channel.

Paths come only from output/ (final videos, output/script.txt); thumbnails from input/ (the user puts them there).
Runs after every final and from `studio.cmd sheet` (the Run button, sheet.cmd): new projects are added, empty or
"Not found" path cells are filled, a path already in the sheet is never erased. Titles, descriptions, tags,
products and captions come from output/metadata.json and only fill empty cells (the user's edits stay). Rows are sorted by project date, S.No renumbered."""
import json
from pathlib import Path
from urllib.parse import quote

from .config import PROJECTS, SHEET_ID, SHEET_KEY, SHEET_SKIP, SHEET_TABS
from .project import PROJECT, project_dirs, project_order, variations

NOT_FOUND = "Not found"
WIDTH = 18  # A..R
COLS = {"16x9": (2, 3, 4), "9x16": (8, 9, 10)}  # video, script, thumbnail columns (0-based: C D E, I J K)
PATH_COLS = (2, 3, 4, 8, 9, 10)
TEXT_COLS = {"16x9": (5, 6, 7), "9x16": (11, 12, 13)}  # title, description, tags (F G H, L M N)
SHARED = {"products": 14, "facebook": 15, "instagram": 16, "pinned_comment": 17}  # O P Q R, one per project
METADATA = "metadata.json"  # output/metadata.json, written by Claude after a final (docs/UPLOAD_METADATA.md)
IMAGES = {".png", ".jpg", ".jpeg", ".webp"}


def scan(project: Path) -> dict[int, str]:
    """Column -> path for the files this project has: final videos and script.txt in output/, a thumbnail image
    in the input/ next to that output/ (one with the format in its name wins, e.g. thumb_16x9.png)."""
    found: dict[int, str] = {}
    for out in [project / "output"] + [v / "output" for v in variations(project)]:
        if not out.is_dir():
            continue
        videos = sorted((f for f in out.glob("*.mp4") if not f.name.startswith("preview_")),
                        key=lambda f: f.stat().st_mtime)
        for fmt, (cv, cs, ct) in COLS.items():
            mine = [f for f in videos if fmt in f.name.lower()]
            if not mine:
                continue
            found[cv] = str(mine[-1])
            if (out / "script.txt").is_file():
                found[cs] = str(out / "script.txt")
            inp = out.parent / "input"
            pics = sorted(f for f in inp.iterdir() if f.suffix.lower() in IMAGES) if inp.is_dir() else []
            pics = [f for f in pics if fmt in f.name.lower()] or pics
            if pics:
                found[ct] = str(pics[0])
            found.update(_metadata(out / METADATA, fmt))
    return found


def _metadata(path: Path, fmt: str) -> dict[int, str]:
    if not path.is_file():
        return {}
    m = json.loads(path.read_text("utf-8"))
    join = lambda v: ", ".join(v) if isinstance(v, list) else (v or "")
    got = {c: join(m.get(k)) for c, k in zip(TEXT_COLS[fmt], ("title", "description", "tags"))}
    got.update({c: join(m.get(k)) for k, c in SHARED.items()})
    return {c: v for c, v in got.items() if v}


def _order(name: str) -> tuple:
    o = project_order(Path(name)) if PROJECT.match(name) else None
    return (0, *o, name) if o else (1, 0, 0, 0, 0, name)


def merge(existing: list[list[str]], scanned: dict[str, dict[int, str]]) -> list[list[str]]:
    """Sheet rows (A2:R, as read) + scanned projects -> the rows to write back."""
    rows = {}
    for r in existing:
        r = (list(r) + [""] * WIDTH)[:WIDTH]
        if r[1]:
            rows[r[1]] = r
    for name, found in scanned.items():
        r = rows.setdefault(name, [""] * WIDTH)
        r[1] = name
        for c in PATH_COLS:
            if c in found:
                r[c] = found[c]
            elif r[c] in ("", NOT_FOUND):
                r[c] = NOT_FOUND
        for c, v in found.items():
            if c not in PATH_COLS and not r[c]:  # text the user already has in the sheet is never replaced
                r[c] = v
    out = sorted(rows.values(), key=lambda r: _order(r[1]))
    for i, r in enumerate(out, 1):
        r[0] = i
    return out


def channel_projects(projects_dir: Path = PROJECTS) -> dict[str, dict[str, dict[int, str]]]:
    """Tab -> {project name: scanned paths} for projects inside a channel folder with at least one final."""
    tabs: dict[str, dict[str, dict[int, str]]] = {t: {} for t in SHEET_TABS.values()}
    for p in project_dirs(projects_dir):
        tab = SHEET_TABS.get(p.relative_to(projects_dir).parts[0])
        found = scan(p)
        if tab and p.name not in SHEET_SKIP and any(c in found for c in (2, 8)):
            tabs[tab][p.name] = found
    return tabs


def _session():
    from google.auth.transport.requests import AuthorizedSession
    from google.oauth2 import service_account
    creds = service_account.Credentials.from_service_account_file(
        str(SHEET_KEY), scopes=["https://www.googleapis.com/auth/spreadsheets"])
    return AuthorizedSession(creds)


def _ok(r):
    """Google's own error message (API off, sheet not shared) instead of a bare 403."""
    if not r.ok:
        raise RuntimeError(f"Google {r.status_code}: {r.json().get('error', {}).get('message', r.text)[:300]}")
    return r


def sync(projects_dir: Path = PROJECTS) -> bool:
    if not SHEET_KEY.is_file():
        print(f"  sheet: no key at {SHEET_KEY} (setup: docs/SHEET_SETUP.md); sheet not updated")
        return False
    s = _session()
    api = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/"
    for tab, scanned in channel_projects(projects_dir).items():
        rng = lambda a: quote(f"'{tab}'!{a}", safe="")
        got = _ok(s.get(api + rng("A2:R")))
        rows = merge(got.json().get("values", []), scanned)
        if rows:
            _ok(s.put(api + rng(f"A2:R{len(rows) + 1}"), params={"valueInputOption": "RAW"},
                  json={"values": rows}))
        _ok(s.post(api + rng(f"A{len(rows) + 2}:R") + ":clear"))
        print(f"  sheet: {tab} {len(rows)} rows")
    return True


def sync_safe() -> None:
    """After a final: a sheet problem (no internet, no key) never fails the render."""
    try:
        sync()
    except Exception as e:
        print(f"  sheet: not updated ({type(e).__name__}: {e}); run `studio.cmd sheet` later")
