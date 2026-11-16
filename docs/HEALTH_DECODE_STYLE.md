# Health Decode mode: the 10_Diarrhea_ORS look

User 2026-11-16: "ok very good, idi health decode mode lo update cheyu". The channel brand "Health Decode" (Telugu-English
health education). Offer it with the other modes (documentary, explainer, light-documentary, cinematic, healthcare) at every
new health / body topic; healthcare (09) is the dark version, Health Decode the bright clinical one.

## What it is
- Bright clinical studio: background #F8FAFC (radial white centre, faint moving grid, soft colour bokeh), `HD.bgl()`.
- Every scene = one 3D medical render as the base (`HD.base(k, x, y, w, h)`: contain, never cropped, multiply-blended into the
  studio, feathered edge, contact shadow) + 2D vector overlays that explain it.
- Meaning colours (fixed): blue #0284C7 / green #059669 healthy flow, amber #D97706 process / attention, red #DC2626 danger;
  white cards #FFFFFF + text #0F172A.
- Overlays: drawn paths / arrows (`draw`, dashed + arrowhead), pulse rings (`ring`), particles along paths (`flow`),
  tank gauge (`tank`), circle-slash myth marks (`nope`), ticks, dot grids, white bar cards (`card`: English + Telugu line),
  pills, round icon badges (`icon`), counters that appear on their beat (`bigNum`).
- Motion: spring entrances (`E.spring`), camera push on the base (`push`), bases step aside to make room (`aside`, `enter`, `zin`),
  ambient `float`; `HD.clear(t)` fades old drawings at every composition change.
- Type: Outfit (heading) + Mandali (Telugu) + DM Sans; captions "underline" style. Kept <= 30% alike the last video.

## Workflow (project 10 scripts)
1. Audio: voice chain 1.15x only (both formats); Gemini JSON -> align_mms -> `input/gemini_corrected.json`.
2. Plan: `segment.py` (4-7 s scenes) + `<fmt>/work/visuals.json` (mode name, 3D image or REUSE, Remotion 2D + camera, SFX)
   -> `make_plan.py` -> `<fmt>/plan.md` + `images_3d.json`. 9:16 reuses the 16:9 image pool.
3. Images: Kaggle Z-Image, fixed prompt formula ("A scientifically accurate, highly detailed anatomical/scientific 3D render of
   [X], isolated on a clean, bright off-white studio background (#F8FAFC) ... No labels, no text, no human body outline."),
   16:9; check the sheet and regenerate wrong ones (asked for an open tube / tissue tile -> got a whole gut; text on labels);
   `whiten.py` -> `assets/3d/Hxx.png` (pure white background); scenes carry `params.grade: false`.
4. Sequences: one written sequence per ~20 s (3-7 plan scenes); `make_sequences.py` gives beats p1..pN (plan scene starts)
   + word beats. Samples first (gate), then all, 480p previews, frame-sheet QA, finals on the user's word.
5. Music: original synthesized loop `_library/music/calm/clinical_calm.mp3` (`make_music.py`), no copyright.

## Kit + examples
- `tools/templates/decode_kit`: kit.js (timeline core) + `hd.js` (this mode). Sequences `hd_l01..l15` (16:9), `hd_v01..v04` (9:16).

## Pitfalls seen in 10
- Never name a top-level const `top` / `parent` / `name` (window globals): the scene renders blank.
- Counters must stay hidden until their beat; flows and drawn svgs linger unless cleared.
- The palette grade tints white renders warm: keep `grade: false` for studio renders.
