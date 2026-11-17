"""projects/upload_sheet.json sits between the project files and the sheet (user, 2026-11-18):
project files -> JSON -> Google Sheet. Every sync first writes the JSON, then shows exactly the JSON in the sheet.
Edits the user made in the sheet are read in before the JSON is written, so they are kept; a sheet tab that was
emptied by accident is filled again from the JSON. `studio.cmd sheet --restore` writes the JSON to the sheet alone."""
import json
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

from .config import PROJECTS, SHEET_ID
from .project import atomic_write
from .upload_sheet import WIDTH, _ok, _session

SNAPSHOT = PROJECTS / "upload_sheet.json"
LAST = chr(ord("A") + WIDTH - 1)  # "X"
API = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/"


def build(values_by_tab: dict[str, list[list]], when: str | None = None) -> dict:
    """{tab: [header, row, ...]} -> the JSON kept on disk (rows padded to the full width)."""
    tabs = {}
    for tab, values in values_by_tab.items():
        rows = [(list(r) + [""] * WIDTH)[:WIDTH] for r in values]
        tabs[tab] = {"headers": rows[0] if rows else [], "rows": rows[1:]}
    return {"spreadsheet": SHEET_ID, "saved": when or datetime.now().isoformat(timespec="seconds"), "tabs": tabs}


def load(path: Path = SNAPSHOT) -> dict | None:
    return json.loads(path.read_text("utf-8")) if path.is_file() else None


def save(snap: dict, path: Path = SNAPSHOT) -> None:
    atomic_write(path, json.dumps(snap, ensure_ascii=False, indent=1))


def read_tab(s, tab: str) -> list[list[str]]:
    return _ok(s.get(API + quote(f"'{tab}'!A1:{LAST}", safe=""))).json().get("values", [])


def write_sheet(s, snap: dict) -> None:
    """The sheet becomes exactly the JSON: headers, rows, and nothing below them."""
    for tab, v in snap["tabs"].items():
        rows = [[int(r[0]) if str(r[0]).isdigit() else r[0]] + r[1:] for r in v["rows"]]  # S.No stays a number
        values = [v["headers"]] + rows
        _ok(s.put(API + quote(f"'{tab}'!A1:{LAST}{len(values)}", safe=""), params={"valueInputOption": "RAW"},
                  json={"values": values}))
        _ok(s.post(API + quote(f"'{tab}'!A{len(values) + 1}:{LAST}", safe="") + ":clear"))


def restore(path: Path = SNAPSHOT, ask: bool = True) -> bool:
    snap = load(path)
    if not snap:
        print(f"  no copy at {path}")
        return False
    print(f"  copy from {snap['saved']}: " + ", ".join(f"{t} {len(v['rows'])} rows" for t, v in snap["tabs"].items()))
    if ask and input("  This replaces what is in the sheet now. Type yes to go on: ").strip().lower() != "yes":
        print("  not restored")
        return False
    write_sheet(_session(), snap)
    print("  restored")
    return True
