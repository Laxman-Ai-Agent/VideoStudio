"""Copy of the upload-path sheet on disk (user, 2026-11-18, option B): after every sync the sheet as it stands,
the user's own edits included, is saved to projects/upload_sheet.json. The sheet stays the place to edit; the
JSON is an automatic copy for reading offline and for `studio.cmd sheet --restore` (JSON -> sheet)."""
import json
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

from .config import PROJECTS, SHEET_ID, SHEET_TABS
from .project import atomic_write
from .upload_sheet import WIDTH, _ok, _session

SNAPSHOT = PROJECTS / "upload_sheet.json"
LAST = chr(ord("A") + WIDTH - 1)  # "X"
API = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/"


def build(values_by_tab: dict[str, list[list[str]]], when: str | None = None) -> dict:
    """{tab: [header, row, ...]} as read -> the JSON kept on disk (rows padded to the full width)."""
    tabs = {}
    for tab, values in values_by_tab.items():
        rows = [(list(r) + [""] * WIDTH)[:WIDTH] for r in values]
        tabs[tab] = {"headers": rows[0] if rows else [], "rows": rows[1:]}
    return {"spreadsheet": SHEET_ID, "saved": when or datetime.now().isoformat(timespec="seconds"), "tabs": tabs}


def save(s=None, path: Path = SNAPSHOT) -> dict:
    s = s or _session()
    values = {tab: _ok(s.get(API + quote(f"'{tab}'!A1:{LAST}", safe=""))).json().get("values", [])
              for tab in SHEET_TABS.values()}
    snap = build(values)
    atomic_write(path, json.dumps(snap, ensure_ascii=False, indent=1))
    return snap


def restore(path: Path = SNAPSHOT, ask: bool = True) -> bool:
    """Write the saved copy back over the sheet (headers and rows), then clear rows below it."""
    snap = json.loads(path.read_text("utf-8"))
    print(f"  backup from {snap['saved']}: " + ", ".join(f"{t} {len(v['rows'])} rows" for t, v in snap["tabs"].items()))
    if ask and input("  This replaces what is in the sheet now. Type yes to go on: ").strip().lower() != "yes":
        print("  not restored")
        return False
    s = _session()
    for tab, v in snap["tabs"].items():
        rows = [[int(r[0]) if str(r[0]).isdigit() else r[0]] + r[1:] for r in v["rows"]]  # S.No stays a number
        values = [v["headers"]] + rows
        _ok(s.put(API + quote(f"'{tab}'!A1:{LAST}{len(values)}", safe=""), params={"valueInputOption": "RAW"},
                  json={"values": values}))
        _ok(s.post(API + quote(f"'{tab}'!A{len(values) + 1}:{LAST}", safe="") + ":clear"))
        print(f"  restored {tab}: {len(v['rows'])} rows")
    return True
