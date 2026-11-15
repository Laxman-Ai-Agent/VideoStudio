# Changelog

## 2026-11-15
- 07_NASA_Moon_Base: nm_l12-l16 (MMRTG flow + night power check, 3D Moon -> south pole cross-section / crater ice / H2O-O2-H2 / 18-month ring + drill gauge, lander record board with animated fates, cost timeline + $20B/$30B bars + first bricks, Apollo -> STAY -> question card) and 9:16 nm_v01-v05; 480p previews of both formats. CHANGELOG split: 2026-11-11 and older -> CHANGELOG_2026-11a.md.
- 07_NASA_Moon_Base: paired project (16x9 merge of 4 parts, 3 speeds, 1.15x, align_mms), plan rev 2 after the user's image-led light-documentary brief, theme, samples nm_l01 (3D Moon) + nm_l11 (3D Curiosity); NASA photo set + 9 Kaggle images; moon_kit/doc.js (image-led parts); sequences nm_l02-l10 with beat-frame QA (fixed: half-width photos left a dark band -> inner cover layer, `.stat span` hid the number, dimmed leftovers under new content, empty openings).
- 3D: three.js 0.147.0 vendored (`moon_kit`, registered in LIBRARIES.md), `m3d.js` follows the HyperFrames hf-seek / buildReady protocol; render copies `params.files` ungraded and keys the cache on them (test_raw_files_copied_ungraded_and_keyed).

## 2026-11-14
- Explainer mode v2 = the 06 look: `explainer2_kit` (colours from theme, background motif per scene), docs/EXPLAINER_STYLE.md, rule + memory; EXPLAINER_PLAN.md marked superseded.
- 06_Gemini_Hydrogen: paired project (16x9 merge, 3 speeds, 1.15x, align_mms), light-documentary "element lab" look (`lab_kit`: periodic tiles, terminal typing, bar races, info rail, icons), sequences gh_l01-l14 / gh_v01-v05, 8 photorealistic Kaggle Z-Image images, 480p previews + beat-frame QA. Lessons: kit class names clash with studio.css (`.bd`, `.dim`, `.tx`, `.ln`): prefix kit classes; type() must keep numeric entities whole.

## 2026-11-13
- 05_Nvidia_CEO_Exit 1080p finals (QA PASS), DarkWorld/README.md; keynote / Kress photos replaced (copyright) by a free photo and a name card. assemble: peak limiter after loudnorm (true peak -0.9 -> under -1 dBTP), test_assemble_peak.
- 05_Nvidia_CEO_Exit: paired project (merge, 3 speeds, align), light-documentary news-desk look, real photos + screenshots (asset-collector), `news_kit`, sequences nv_l01-l14 / nv_v01-v05, 480p previews with beat-frame QA (fixed: substring beat matches, kit pop() wiping translateX centring, chips / stamps past the 9:16 edge, stamp re-showing after its out).
- 04_Fable_Mythos rebuilt in the explainer style (user's reference class clip): theme (Plus Jakarta Sans + Noto Sans Telugu, pastel sections, captions off), `explainer_kit`, sequences fx_s01-s18 + fx_v01-v06, 20 light-style Kaggle images, theme captions style `off` (test). Both 480p previews rendered, QA PASS. 1080p finals rendered on the user's go (QA PASS), named 04_Fable_Mythos_16x9.mp4 / _9x16.mp4; DarkWorld/README.md describes the explainer look.
- 04_Fable_Mythos: paired project from the user's workflow prompt (merge, 3 speeds, Gemini JSON align), theme, 20 Kaggle images, kit fable_kit, sequences fm_s01-fm_s12.
- 04_Fable_Mythos: sequences fm_s13-fm_s18 (16x9) and fm_v01-fm_v06 (9x16, own portrait layout); Anton weight 400 + 1.35x sizes, presenter fills the frame height (16x9 right 54%, 9x16 lower ~70%). Both 480p previews rendered, beat-frame QA: fixed s13 2 over OPEN PROBLEMS + pet card too short, s15 -55% over its kickers, s16 crack visible before 'flaw' (non-scaling-stroke ignores pathLength), s17 heads wrapped (own .rt class hit the kit's redaction span), v02 SELECTED over the 9x16 captions (captions sit at ~0.75H), v03 350 over its kicker, v06 comment box past the edge. DarkWorld/README.md from scripts/make_darkworld.py.
- grade.graded returns SVG files unchanged (logos are CSS masks; PIL cannot open SVG). Test: test_svg_is_not_graded.

Older entries (2026-11-11 and earlier): docs/CHANGELOG_2026-11a.md.
