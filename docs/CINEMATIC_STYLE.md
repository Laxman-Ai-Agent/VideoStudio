# Cinematic documentary mode: the 07_NASA_Moon_Base look

User 2026-11-15 after the 07 finals: "ee video chala bavundi"; named the mode "cinematic documentary" (short: cinematic)
and asked to offer it with the other modes at the start of every new project.

## What it is
Light look, image-led, cinematic. Big real photos carry the story; graphics explain on top of them.
- Images big and varied: full-screen photo with the text in its calm part (soft wash `l/r/t/b`, dark `dl/db` at night),
  half / split screens, a photo that shrinks into a corner or slides into a half (layout morph = continuity), close-up crops
  with a slow push. Cards only sometimes (a "document" feel); never every image in a card.
- Real public-domain photos first (NASA, Wikimedia), photoreal Kaggle Z-Image only for the gaps (credit "AI IMAGE ... (ILLUSTRATION)").
- 3D where it explains: three.js globe dives (real LRO texture), turning models with labels wired to points on the model.
- 2D animated diagrams in code: cross-sections (sun rays, shadow), flows with drawn arrows, record boards whose icons act out
  the fate (tips over, never arrives), timelines with phase blocks, bars / rings / gauges that count, bricks that stack.
- Every frame: kicker + English heading (key word in `<em>`) + one Telugu line, one main visual, 1-3 supporting parts,
  bottom info rail (`railSet` per beat). 3-5 beats per sequence on the spoken words; old elements leave fully
  (out / hide wipe), nothing dimmed under new ones, no empty frame longer than ~1.5 s.
- Motion: Ken Burns on every photo (`kb`), clip-path reveals / hides, slow stage push (`cam`), eased pops; no shake / glitch / flash.
- Scene to scene: cut transitions; continuity by carrying the same photo / layout across the cut (L15 flag -> L16 flag).

## Kit + examples
- `tools/templates/moon_kit`: `kit.js` (explainer2 parts: head/rehead, chip, hbar, line, rail ...), `doc.js` (photo, kb,
  reveal, hide, big, pill, tag, lab, stat, countTo), `m3d.js` (three.js on the HyperFrames hf-seek protocol).
- Sequences: `nm_l01..l16` (16:9), `nm_v01..v05` (9:16, headings 8.6u, photo top ~46% + text below, or full-bleed portrait images).
- Scripts: `projects/07_NASA_Moon_Base/scripts/` (make_sequences beats, render_samples, qa_sheet, nasa_get, make_darkworld).
- New video: copy the kit idea, new fonts / colours / motif per video (identity limit 30%), new sequence code per scene.

## Pitfalls seen in 07
- Class names clash with `_shared/studio.css` (`.tx` = absolute inset 0): check before naming a class.
- `place()` sets `left`, overriding CSS `left: 50%`; centre by placing at W * .5.
- Beat words match by substring ("land" hits "lander"): use (word, nth).
- theme.json `motion` / `text` / `background.pattern` should describe the real look (transitions cut, text_in mask,
  title caps), or QA identity flags false likeness with earlier videos.
