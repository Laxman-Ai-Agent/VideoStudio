# Explainer mode (v2): the 06_Gemini_Hydrogen look

User 2026-11-14 after the 06 finals: "from now on, explainer must come out like this". This replaces the calm 04-style
explainer (one idea per screen, max 5 elements). Old kit `tools/templates/explainer_kit` stays only for 04_Fable_Mythos.

## What it is
Light look + dense documentary pacing. Every frame is full and informative; nothing is left empty for long.
- Every screen: kicker pill (section name) + English heading (key word in `<em>`: primary colour + growing underline) +
  one Telugu line under it, one main visual, 2-3 supporting graphics, a bottom info rail with the current facts,
  a slowly drifting background motif. Something new enters every 1-2 s on the spoken word.
- 3-4 beats per sequence (A/B/C/D blocks), each beat a new composition; old elements move / shrink / fade out
  (never left dimmed under new ones), the heading changes in place (`rehead`), the rail text swaps (`railSet`).
- Section tints change per chapter (`bg(name, t)`: ice, mint, lilac, sand, sky); captions off.
- Smooth motion only: eased slides, flips, settles, count-ups, slow camera push. No shake / glitch / flash.
- Numbers always as objects: count-ups, bar races (`hbar`, `vbar`, `regrow`), price tags, meters, rings, gauges.
- Entities as symbol tiles (`tile`, e.g. periodic tiles H / C / Ar), processes as flows (`line`, chips moving between
  boxes), tech work as a terminal that types (`term`, `type`), claims labelled as claims (chip "CLAIMED BY ...").
- Images: real logos (public domain / CC0), everything else photorealistic Kaggle Z-Image photos (never light 3D),
  in white photo cards that keep the picture's own aspect (`card`, never cropped).

## Per video (identity stays different, max 30% alike)
- `theme.json`: `"look": "explainer"`, `"style": "documentary"`; fonts (heading / body Telugu / script), colours
  `primary` (headings, rail, main accent), `accent` (money / secondary), `text`, `text2`, `highlight`, `background` (light).
- `params.motif` per scene (optional): `hex` (default) | `ring` | `square` | `plus`, chosen from the topic.
- New sequences are still written per video (HTML/CSS/GSAP), using the kit parts; the kit itself is reused (user's word).

## Kit and files
- Kit: `tools/templates/explainer2_kit/kit.js` (theme-driven copy of 06's `lab_kit`). Set `"kit": "explainer2_kit"` in
  `make_sequences.py`.
- Parts: `bg`, `head`, `rehead`, `tile`, `flipIn`, `retile`, `term`, `type`, `chip`, `fcard`, `ptag`, `num`, `count`, `card`,
  `logo`, `hbar`, `vbar`, `regrow`, `rail`, `railSet`, `line`, `ico` (bolt, check, x, clock, dollar, chip, search, code, brain,
  fire, cal, up, star, thumb, share, bell, folder, file, lock, crown, trophy, users, gauge, shield, route), `pop`, `out`,
  `move`, `fit`, `cam`.
- Examples: `tools/templates/gh_l01..gh_l14` (16:9) and `gh_v01..gh_v05` (9:16). Project scripts to copy:
  `projects/06_Gemini_Hydrogen/scripts/` (make_transcript, make_sequences, render_samples, make_darkworld).
- 9:16: headings 8.6u, keep one-line headings short; stack visuals vertically, fill the lower half (chips, tiles, cards).

## Pitfalls seen in 06
- Kit / sequence class names must not clash with `_shared/studio.css` (`.bd`, `.dim`, `.tx`, `.ln` are taken).
- `type()` keeps tags and HTML entities whole; bars / groups fade in at their own beat (not visible before).
- Beat-frame QA (5 frames per sequence) catches overlaps of the Telugu line with chips, empty halves, leftovers.
