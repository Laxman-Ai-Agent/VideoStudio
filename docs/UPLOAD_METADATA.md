# Upload metadata: process (both channels)

After every passed final, Claude reads `<fmt>/output/script.txt` (+ `work/scenes.json` for chapter times) and
writes `<fmt>/output/metadata.json`, then runs `studio.cmd sheet`. The sheet sync puts it in columns F-H / L-N
(per format), O-R (products, Facebook Reel, Instagram, pinned comment), S (title options), T (product links),
U (Facebook post caption), V (Shorts pinned comment, 9x16 file), W / X (thumbnail text, 16x9 / 9x16); Y is the
Refresh dropdown (last column). Only EMPTY cells are filled, so the user's own
edits in the sheet stay. Sheet only: Claude never posts to the channels.

## Rules: one file per channel
- The Dark World: `docs/DARKWORLD_UPLOAD.md`
- Health Decode: `docs/HEALTHDECODE_UPLOAD.md`

## Shape
`{"title", "description", "tags": [...], "products": [...], "facebook", "instagram", "pinned_comment", "title_options": [3 titles], "product_links": [...], "facebook_post", "thumbnail_text": [{"main", "sub", "highlight", "visual"}]}`; the 9x16 file needs only
title / description / tags. Products, captions and the pinned comment go in the 16x9 file.
