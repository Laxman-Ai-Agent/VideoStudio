# Upload metadata (titles, descriptions, tags, captions)

After every passed final, Claude reads `<fmt>/output/script.txt` (+ `work/scenes.json` for chapter times) and
writes `<fmt>/output/metadata.json`, then runs `studio.cmd sheet`. The sheet sync puts it in columns F-H / L-N
(per format) and O-Q (products, Facebook, Instagram; from either file) but only into EMPTY cells.
Approved reference: `projects/The Dark World/09__16-NOV-2026__Aging_150/{16x9,9x16}/output/metadata.json` (2026-11-17).

## Shape
`{"title", "description", "tags": [...], "products": [...], "facebook", "instagram"}`; the 9x16 file needs only
title / description / tags. Products and captions go in the 16x9 file.

## Rules
- Title: main keyword first, Telugu + English mix (how people search), 60-70 chars, curiosity without false claims.
  Shorts: short hook + `#shorts`.
- Description (long), The Dark World: the user's fixed template `docs/DARKWORLD_DESCRIPTION.md` (no chapters,
  no sources list; its own disclaimer).
- Description (long), Health Decode: 2-line hook with keywords; "ఈ video లో" bullets; chapters from scenes.json (first 0:00, each
  >= 10 s); sources that the script really used (never invented); disclaimer; 3 hashtags at the end.
- Description (short): 2-3 lines, CTA to the full video (comment keyword), short disclaimer, `#shorts` + 2 hashtags.
- Tags: 10-16, English + Telugu + Tenglish, under 500 chars.
- Products: safe, topic-related things only (books, devices like glucometer / BP monitor / ORS). Never medicines,
  prescription drugs or supplements the video warns against.
- Facebook: 2-3 line hook + one question for comments + 3 hashtags. Instagram: hook, 3 short lines, Save / Share CTA,
  8-10 hashtags.
- Monetization safety (YouTube medical misinformation + advertiser-friendly rules): no cure claims, no "stop your
  medicine", no fear words in titles, facts in line with WHO / ICMR.
- Disclaimer, always at the end of the long description:
  - Health Decode: "⚠️ ఈ వీడియో సాధారణ అవగాహన కోసం మాత్రమే, ఇది వైద్య సలహా కాదు. మందులు మొదలుపెట్టే / ఆపే ముందు
    మీ డాక్టర్‌ను సంప్రదించండి. అత్యవసర పరిస్థితిలో 108 కి కాల్ చేయండి. This video is for general awareness only
    and is not medical advice."
  - The Dark World: information only; company results are their own announcements; add "not medical advice" when
    the topic touches health.
  - Both: "Visuals లో కొన్ని AI-generated images ఉన్నాయి" when realistic AI images are used, and remind the user to
    tick YouTube's "Altered or synthetic content".
