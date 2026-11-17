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
WIDTH = 25  # A..Y (S = the Refresh dropdown, carried with its row)
COLS = {"16x9": (2, 3, 4), "9x16": (8, 9, 10)}  # video, script, thumbnail columns (0-based: C D E, I J K)
PATH_COLS = (2, 3, 4, 8, 9, 10)
TEXT_COLS = {"16x9": (5, 6, 7), "9x16": (11, 12, 13)}  # title, description, tags (F G H, L M N)
SHARED = {"products": 14, "facebook": 15, "instagram": 16, "pinned_comment": 17,  # O P Q R, one per project
          "facebook_post": 21}  # V: Facebook long-video post caption (P is the Reel caption)
SHORTS_PIN = 22  # W: the 9x16 file's pinned_comment (R is the long video's)
THUMB_TEXT = {"16x9": 23, "9x16": 24}  # X / Y: thumbnail text options (main, sub, highlight, visual idea)


def thumbnail_cell(options: list[dict]) -> str:
    """Thumbnail text options as one readable cell: number + main line, sub line, highlight + visual idea."""
    return "\n\n".join(f"{i}. {o.get('main', '')}\n   {o.get('sub', '')}\n   Highlight: {o.get('highlight', '')}"
                       f" · Visual: {o.get('visual', '')}" for i, o in enumerate(options, 1))
PRODUCT_LINKS = 20  # U: affiliate links the user gives, one per line, same order as the products
TITLE_OPTIONS = 19  # T: the 16x9 file's 3 title options, one per line, for YouTube "Test & Compare"
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


def youtube_tag_chars(tags: list[str]) -> int:
    """Characters as YouTube counts the 500 limit: commas between tags, a tag with a space counts its quotes too."""
    return sum(len(t) + (2 if " " in t else 0) for t in tags) + max(len(tags) - 1, 0)


def check_tags(tags: list[str]) -> list[str]:
    """User rules (2026-11-18): no Telugu letters in tags, 500 characters max."""
    bad = [f"Telugu letters in tag {t!r}" for t in tags if any("ఀ" <= ch <= "౿" for ch in t)]
    if (n := youtube_tag_chars(tags)) > 500:
        bad.append(f"tags are {n} characters (YouTube max 500)")
    return bad


def _metadata(path: Path, fmt: str) -> dict[int, str]:
    if not path.is_file():
        return {}
    m = json.loads(path.read_text("utf-8"))
    for problem in check_tags(m.get("tags") or []):
        print(f"  sheet: WARNING {path}: {problem}")
    join = lambda v: ", ".join(v) if isinstance(v, list) else (v or "")
    got = {c: join(m.get(k)) for c, k in zip(TEXT_COLS[fmt], ("title", "description", "tags"))}
    got.update({c: join(m.get(k)) for k, c in SHARED.items() if not (fmt == "9x16" and k == "pinned_comment")})
    if fmt == "9x16" and m.get("pinned_comment"):
        got[SHORTS_PIN] = m["pinned_comment"]
    if m.get("thumbnail_text"):
        got[THUMB_TEXT[fmt]] = thumbnail_cell(m["thumbnail_text"])
    for c, k in ((14, "products"), (PRODUCT_LINKS, "product_links")):  # one per line: easy to copy one by one
        if isinstance(m.get(k), list) and m[k]:
            got[c] = "\n".join(m[k])
    if fmt == "16x9" and m.get("title_options"):
        got[TITLE_OPTIONS] = "\n".join(f"{i}. {t}" for i, t in enumerate(m["title_options"], 1))
    return {c: v for c, v in got.items() if v}


def _order(name: str) -> tuple:
    o = project_order(Path(name)) if PROJECT.match(name) else None
    return (0, *o, name) if o else (1, 0, 0, 0, 0, name)


def merge(existing: list[list[str]], scanned: dict[str, dict[int, str]]) -> list[list[str]]:
    """Sheet rows (A2:Y, as read) + scanned projects -> the rows to write back."""
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
        got = _ok(s.get(api + rng("A2:Y")))
        rows = merge(got.json().get("values", []), scanned)
        if rows:
            _ok(s.put(api + rng(f"A2:Y{len(rows) + 1}"), params={"valueInputOption": "RAW"},
                  json={"values": rows}))
        _ok(s.post(api + rng(f"A{len(rows) + 2}:Y") + ":clear"))
        print(f"  sheet: {tab} {len(rows)} rows")
    return True


def sync_safe() -> bool:
    """After a final: a sheet problem (no internet, no key) never fails the render."""
    try:
        return sync()
    except Exception as e:
        print(f"  sheet: not updated ({type(e).__name__}: {e}); run `studio.cmd sheet` later")
        return False


WATCHED = IMAGES | {".mp4", ".txt", ".json"}
# Column S dropdown (same look as the user's script sheet): the user picks RUN or START, the watcher shows
# RUNNING while it syncs, then DONE, or ASK when the sync failed (ask Claude).
RUN, START, RUNNING, DONE, ASK = "▶ RUN", "▶ START", "⏳ RUNNING", "✅ DONE", "❌ ASK"


def run_rows(column: list[list[str]]) -> list[int]:
    """Sheet row numbers (2-based) whose column S cell asks for a refresh (S2:S as read)."""
    return [i for i, c in enumerate(column, 2)
            if c and any(w in c[0].upper().split() for w in ("RUN", "START"))]


def install_buttons(s=None) -> None:
    """Column S on every tab: header "Refresh" + a RUN / DONE dropdown, green and bold like the user's other sheet."""
    s = s or _session()
    meta = _ok(s.get(f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}",
                     params={"fields": "sheets.properties"})).json()
    ids = {sh["properties"]["title"]: sh["properties"]["sheetId"] for sh in meta["sheets"]}
    reqs = []
    for tab in SHEET_TABS.values():
        col = {"sheetId": ids[tab], "startColumnIndex": 18, "endColumnIndex": 19}
        reqs += [
            {"updateCells": {"rows": [{"values": [{"userEnteredValue": {"stringValue": "▶ Refresh"}}]}],
                             "fields": "userEnteredValue", "start": {"sheetId": ids[tab], "rowIndex": 0, "columnIndex": 18}}},
            {"setDataValidation": {"range": {**col, "startRowIndex": 1}, "rule": {
                "condition": {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": v} for v in (RUN, START, RUNNING, DONE, ASK)]},
                "showCustomUi": True, "strict": False}}},
            {"repeatCell": {"range": col, "cell": {"userEnteredFormat": {
                "backgroundColor": {"red": 0.72, "green": 0.88, "blue": 0.8},
                "textFormat": {"bold": True}, "horizontalAlignment": "CENTER"}},
                "fields": "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat.bold,userEnteredFormat.horizontalAlignment"}},
        ]
    _ok(s.post(f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}:batchUpdate", json={"requests": reqs}))


def _requests(s) -> dict[str, list[int]]:
    api = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/"
    return {tab: run_rows(_ok(s.get(api + quote(f"'{tab}'!S2:S", safe=""))).json().get("values", []))
            for tab in SHEET_TABS.values()}


def _mark(s, asked: dict[str, list[int]], word: str) -> None:
    data = [{"range": f"'{tab}'!S{r}", "values": [[word]]} for tab, rows in asked.items() for r in rows]
    if data:
        _ok(s.post(f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values:batchUpdate",
                   json={"valueInputOption": "RAW", "data": data}))


def signature(projects_dir: Path = PROJECTS) -> tuple:
    """What the sheet depends on: files in every channel project's input/ and output/ (name, size, mtime).
    A new thumbnail in input/ or a new final / metadata.json in output/ changes it."""
    sig = []
    for p in project_dirs(projects_dir):
        if p.relative_to(projects_dir).parts[0] not in SHEET_TABS:
            continue
        for d in [p] + variations(p):
            for sub in ("input", "output"):
                if (d / sub).is_dir():
                    sig += [(str(f), f.stat().st_size, f.stat().st_mtime_ns) for f in (d / sub).iterdir()
                            if f.is_file() and f.suffix.lower() in WATCHED]
    return tuple(sorted(sig))


def watch(every: float = 30, projects_dir: Path = PROJECTS) -> None:
    """`studio.cmd sheet --watch`: sync once, then again whenever signature() changes or a row's column S says
    RUN (both checked every 30 s); asked rows are set to DONE after the sync.
    ponytail: polling, no OS file events; 15 projects scan in milliseconds, add watchdog only if that changes."""
    import msvcrt
    import time
    from .config import CACHE
    CACHE.mkdir(parents=True, exist_ok=True)
    lock = open(CACHE / "sheet_watch.lock", "w")  # held while this watcher lives; Windows frees it on exit
    try:
        msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError:
        print("sheet watcher already running", flush=True)
        return
    last, s = None, None
    while True:
        now, asked = signature(projects_dir), {}
        try:
            s = s or _session()
            asked = _requests(s)
        except Exception as e:  # offline for a moment: file changes still sync when it is back
            print(time.strftime("%Y-%m-%d %H:%M:%S"), f"sheet not reachable ({type(e).__name__})", flush=True)
        if now != last or any(asked.values()):
            why = "RUN in sheet" if any(asked.values()) else "change seen"
            print(time.strftime("%Y-%m-%d %H:%M:%S"), why + ", syncing", flush=True)
            try:
                _mark(s, asked, RUNNING)
                ok = sync_safe()
                _mark(s, asked, DONE if ok else ASK)
            except Exception as e:
                print(f"  sheet: could not update column S ({e})")
            print(flush=True)  # the log is a file: show the sync result now, not when the buffer fills
            last = now
        time.sleep(every)
