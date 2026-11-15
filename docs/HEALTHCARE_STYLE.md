# Healthcare mode: the 09_Sugar_Walk look

User 2026-11-15: "design this as a healthcare theme / mode; we will improve it in future". Offer it with the other modes
(explainer, cinematic, light documentary) at every new health / body topic.

## What it is
Dark science documentary (Vox / Kurzgesagt / MagnatesMedia feel) where every narration step is one visual beat.
- Background #0A0E17 + radial depth light, faint capillary network + drifting cells (`B.dbg()`), or an AI photo background
  (Kaggle photoreal) with Ken Burns 1.00 -> 1.06 and a dark vignette / side gradient (`B.aiPhoto`).
- Meaning colours, fixed for the whole video: cyan #00F0FF glucose / energy / flow, green #00E676 healthy, amber #FFB800
  mechanism / key / warning, red #FF3B30 danger / blockage. feGaussianBlur glow filters `#gC #gG #gA #gR`.
- 3D object PNGs (user sample: a glossy brain with glowing energy veins on white): Kaggle Z-Image prompt "vivid glossy hyper
  detailed 3D render, wet shiny surface, glowing yellow and blue energy veins, single object, isolated on pure white background"
  (`work/kaggle_png.json`) -> rembg cut-out (`scripts/cutout.py`) -> `assets/png/Pxx_name.png`; `B.png(k, x, y, h, {c})` adds a rim
  glow in the meaning colour. `cell()`, `key()`, `organ()` swap to their PNG automatically when the scene lists P05 / P04 / P03.
- Motion: `E.spring` (damped spring ease, Remotion-like) on every entrance, `B.breathe` ambient float (CSS translate, never
  fights pop / move), flows of glucose PNGs / dots along paths, doors that open / jam, meters, glowing graphs (`B.graph().line`).
- Type: Lexend heading (key word coloured: `<em>` cyan, `.a` amber, `.g` green, `.r` red) + one Telugu line (Ramabhadra),
  dark pill badges (`B.badge`), numbers in Chakra Petch counting up. Captions: box style.
- One idea per screen: old parts leave (`out`) before the next step arrives; keep 9:16 content above 0.70 H (captions).

## Kit + examples
- `tools/templates/sugar_kit`: kit.js / doc.js / m3d.js (from moon_kit, dark allowed) + `bio.js` (this mode's parts, 3D vessel `B3.vessel`).
- Sequences `sw_l01..l14` (16:9), `sw_v01..v05` (9:16); scripts in `projects/09_Sugar_Walk/scripts/` (make_sequences, cutout, render_samples, qa_sheet).

## Pitfalls seen in 09
- studio.css owns `.ovl` (z-index 4) and `.tx`: prefix this mode's classes with `b-`.
- Kaggle 1:1 is made as 3:4 (T4 memory); GPU queue can take 20-40 min, start image runs first.
- bio.js runs in <head>: append SVG defs to documentElement, not body.

## To improve next time (user: "future lo improve cheddam")
- Real 3D rotation for hero organs: image-to-3D (TripoSR, MIT) on Kaggle -> GLB -> m3d.js, or 2.5D depth (Depth Anything).
- A shared PNG library across health videos (organs reused), consistent lighting prompt.
