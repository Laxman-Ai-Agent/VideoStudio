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
captions are never touched. Rows sort by project date. `SHEET_SKIP` lists projects the user removed.
