# Upload-path sheet setup (one time)

`pipeline/upload_sheet.py` writes the Google Sheet "Video_Upload_Path" (`SHEET_ID` in `tools/pipeline/config.py`)
after every final and when `sheet.cmd` (or `studio.cmd sheet`) runs. It needs a Google service-account key.

1. https://console.cloud.google.com -> create a project (any name).
2. APIs & Services -> Library -> "Google Sheets API" -> Enable.
3. APIs & Services -> Credentials -> Create credentials -> Service account (any name) -> Done.
4. Open the service account -> Keys -> Add key -> JSON. A .json file downloads.
5. Save it as `tools/.secrets/google_sheet_key.json` (git ignores this folder).
6. Open the .json, copy `client_email`. In the sheet: Share -> paste that email -> Editor.
7. Double-click `sheet.cmd`. It prints `sheet: Dark_World N rows` per tab.

What it writes: tab per channel (`SHEET_TABS`). Paths only from `output/` (final videos, `script.txt`);
thumbnails from `input/` (an image whose name has 16x9 / 9x16 wins). New projects are added, empty or
"Not found" path cells are filled, a path already in the sheet is never erased. Titles, descriptions, tags,
captions come from `<fmt>/output/metadata.json` (`docs/UPLOAD_METADATA.md`) and only fill empty cells. Rows sort newest project first. `SHEET_SKIP` lists projects the user removed.

## Automatic refresh (watcher)
`sheet_watch.vbs` (double-click, no window) runs `studio.cmd sheet --watch`: it syncs once, then again within
~30 s whenever a file in a channel project's input/ or output/ changes (new thumbnail, new final, metadata.json).
Log: `tools/.cache/sheet_watch.log`. Start with Windows: put a shortcut to `sheet_watch.vbs` in the Startup folder
(Win+R, `shell:startup`). Stop: Task Manager > python.exe. `sheet.cmd` stays the manual Run button.

Button in the sheet: the last column X "Refresh" has a dropdown on every row (`install_buttons()` set it up). Pick "RUN" or "START";
the running watcher shows "RUNNING", syncs within ~30 s and sets "DONE" ("ASK" = the sync failed, ask Claude). If it stays RUN, the watcher is not running
(double-click `sheet_watch.vbs`).

## Look
`pipeline/upload_sheet_style.py` colors the header by category (project grey, YouTube long red, Shorts orange,
products green, Facebook blue, Instagram pink, thumbnail yellow, Refresh teal), tints each column, freezes the
header + project name, sets widths and one-line rows, and shows "Not found" in red. Values are never touched.
Re-run after a column change: `tools\.venv\Scripts\python.exe -c "from pipeline.upload_sheet_style import style; style()"`
(from `tools`).

## Data flow: project files -> JSON -> sheet
`projects/upload_sheet.json` sits between the project files and the sheet (user, 2026-11-18). Every sync:
reads the sheet (the user's own edits), merges the project files in, writes the JSON first, then makes the sheet
exactly the JSON (`pipeline/upload_sheet_backup.py`). A tab that was emptied by accident is filled again from the
JSON. `studio.cmd sheet --restore` writes the JSON to the sheet on its own (asks, type yes).
