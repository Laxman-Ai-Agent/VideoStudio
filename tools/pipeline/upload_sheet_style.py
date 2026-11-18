"""Look of the upload-path sheet (user, 2026-11-18): header cells colored by category, the same category as a light
tint on its column, frozen header + project name, column widths, "Not found" in red. Values are never touched.
Run again after adding a column: `python -c "from pipeline.upload_sheet_style import style; style()"`."""
from .config import SHEET_ID, SHEET_TABS
from .upload_sheet import _ok, _session

# category: (header color, column tint, column indexes)
CATEGORIES = {
    "project": ("#37474F", "#ECEFF1", (0, 1)),                                   # A-B
    "youtube_long": ("#C62828", "#FDECEA", tuple(range(2, 11))),                  # C-K
    "youtube_shorts": ("#EF6C00", "#FFF3E0", tuple(range(11, 19))),               # L-S
    "facebook": ("#1565C0", "#E3F2FD", (19,)),                                   # T
    "instagram": ("#AD1457", "#FCE4EC", (20,)),                                  # U
    "products": ("#2E7D32", "#E8F5E9", (21, 22)),                                # V-W
    "schedule": ("#6A1B9A", "#F3E5F5", (23, 24, 25, 26)),                         # X-AA upload times
    "refresh": ("#00695C", "#B7E1CD", (27,)),                                    # AB
}
WIDTHS = {0: 50, 1: 230, 5: 280, 6: 300, 7: 320, 14: 260, 15: 300, 23: 130, 24: 130, 25: 130, 26: 130, 27: 120}  # titles, title options, descriptions
DEFAULT_WIDTH = 220
LAST = 28  # A..AB


def rgb(hex_color: str) -> dict:
    h = hex_color.lstrip("#")
    return {"red": int(h[0:2], 16) / 255, "green": int(h[2:4], 16) / 255, "blue": int(h[4:6], 16) / 255}


def requests_for(sheet_id: int) -> list[dict]:
    reqs = [{"updateSheetProperties": {"properties": {"sheetId": sheet_id, "gridProperties": {
        "frozenRowCount": 1, "frozenColumnCount": 2}}, "fields": "gridProperties.frozenRowCount,gridProperties.frozenColumnCount"}}]
    for head, tint, cols in CATEGORIES.values():
        for c in cols:
            col = {"sheetId": sheet_id, "startColumnIndex": c, "endColumnIndex": c + 1}
            reqs.append({"repeatCell": {"range": {**col, "startRowIndex": 0, "endRowIndex": 1}, "cell": {"userEnteredFormat": {
                "backgroundColor": rgb(head), "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP",
                "textFormat": {"bold": True, "foregroundColor": rgb("#FFFFFF")}}},
                "fields": "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat)"}})
            reqs.append({"repeatCell": {"range": {**col, "startRowIndex": 1}, "cell": {"userEnteredFormat": {
                "backgroundColor": rgb(tint), "horizontalAlignment": "LEFT", "verticalAlignment": "TOP", "wrapStrategy": "CLIP",
                "textFormat": {"bold": False}}},
                "fields": "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat.bold)"}})
    for c in range(LAST):
        reqs.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id, "dimension": "COLUMNS", "startIndex": c,
                     "endIndex": c + 1}, "properties": {"pixelSize": WIDTHS.get(c, DEFAULT_WIDTH)}, "fields": "pixelSize"}})
    reqs.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
                 "properties": {"pixelSize": 48}, "fields": "pixelSize"}})
    reqs.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id, "dimension": "ROWS", "startIndex": 1},
                 "properties": {"pixelSize": 36}, "fields": "pixelSize"}})  # one line per row; full text in the cell
    reqs.append({"addConditionalFormatRule": {"index": 0, "rule": {
        "ranges": [{"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": LAST}],
        "booleanRule": {"condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": "Not found"}]},
                        "format": {"textFormat": {"foregroundColor": rgb("#C62828"), "italic": True}}}}}})
    return reqs


def style() -> None:
    s = _session()
    meta = _ok(s.get(f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}",
                     params={"fields": "sheets.properties,sheets.conditionalFormats"})).json()
    reqs = []
    for sh in meta["sheets"]:
        if sh["properties"]["title"] not in SHEET_TABS.values():
            continue
        sid = sh["properties"]["sheetId"]
        # drop our own earlier "Not found" rule so a re-run does not stack copies
        for i, rule in reversed(list(enumerate(sh.get("conditionalFormats", [])))):
            vals = rule.get("booleanRule", {}).get("condition", {}).get("values", [])
            if vals and vals[0].get("userEnteredValue") == "Not found":
                reqs.append({"deleteConditionalFormatRule": {"sheetId": sid, "index": i}})
        reqs += requests_for(sid)
    _ok(s.post(f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}:batchUpdate", json={"requests": reqs}))
    print(f"  sheet style: {len(reqs)} requests applied")
