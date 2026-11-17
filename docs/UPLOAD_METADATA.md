# Upload metadata: process (both channels)

After every passed final, Claude reads `<fmt>/output/script.txt` (+ `work/scenes.json` for chapter times) and
writes `<fmt>/output/metadata.json`, then runs `studio.cmd sheet`. The sheet sync puts it in columns F-H / L-N
(per format) and O-R (products, Facebook, Instagram, pinned comment; from either file) and T (title options, 16x9) but only into EMPTY cells, so the user's own
edits in the sheet stay. Sheet only: Claude never posts to the channels.

## Rules: one file per channel
- The Dark World: `docs/DARKWORLD_UPLOAD.md`
- Health Decode: `docs/HEALTHDECODE_UPLOAD.md`

## Shape
`{"title", "description", "tags": [...], "products": [...], "facebook", "instagram", "pinned_comment", "title_options": [3 titles]}`; the 9x16 file needs only
title / description / tags. Products, captions and the pinned comment go in the 16x9 file.
