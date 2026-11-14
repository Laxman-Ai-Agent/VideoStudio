# Plan: explainer mode + full-frame composition + no-crop images (2026-11-13, draft for the user's OK)

> 2026-11-14: superseded for new videos by docs/EXPLAINER_STYLE.md (explainer = the 06 look, kit explainer2_kit).

Source: the user's reference clip (Git & GitHub class 2, 9 s, 6 screens; analysis in the 2026-11-13 session) and two user
rules already in `.claude/skills/my-editor/rules.md` (full-frame composition, never crop images).

## 0. Decisions needed from the user
- D1. DECIDED (user, 2026-11-13): explainer mode for tutorials AND AI news videos (like 04); still a per-project `style` field, default explainer.
- D2. Bring 04_Fable_Mythos up to the two new rules now (no-crop cards + full-frame), before its 1080p final?
- D3. Captions in explainer mode: off (heading carries the meaning) or very small?

## 1. Rules (my-editor `rules.md` + `docs/STYLE.md`)
Global (every video, already written 2026-11-13): full-frame composition; images never cropped.
Explainer mode only (`theme.json` -> `"style": "explainer"`):
- One idea per screen (one sentence / concept, 1.5-4 s); background colour changes only when the section changes.
- Fixed screen grid: accent dash + English title top-left (~7% of H) + Telugu line (~3.5% of H); one diagram in 30-85% of H.
- Max 5 elements per screen; text never under 3% of H; free space spread evenly, never one empty side.
- Look: light pastel gradient + blurred colour blobs, 5-6 section colours, navy text, one accent per screen, one flat icon set.
- Images: one hero image per screen, always in a card (rounded, white border, soft shadow, image's own aspect) or a cut-out (rembg) on the pastel;
  AI images generated in one style (fixed prompt suffix); real photos only for real people / places / products, light grade; logos in white badges.
- Motion calm and meaningful: 0.4-0.6 s ease-out, 0.1 s stagger, on the spoken word; no shake / glitch / flash / slam; static or slow camera.
- Transitions: inside a section objects stay and their content changes; between sections a soft slide / fade with the colour change.
- Components may be reused inside this mode (the "no templates" rule stays for documentary mode); a series keeps one look across episodes.

## 2. Code
1. `fable_kit` `card()` (and any kit `card` copies): contain scaling; the box takes the picture's aspect (`w` or `h` given, the other derived);
   if both are given, the box grows to fit, never crops. `focus` stays only to pick the anchor of a cut-out. Test: a scripted DOM check
   that the rendered background-size covers the full image (no part outside the box).
2. Full-frame helper in the kit: `stage.show(el)` centres a new main visual large; `stage.add(el, side)` moves / scales the current one
   to the other side (split, overlap or zoom chosen by the caller); one GSAP move, eased. Sequences keep writing their own layout.
3. QA "empty side" check (`pipeline/layout.py` or a QA script): per beat frame, measure non-background pixels in the left and right halves;
   flag a half that stays under ~8% for more than ~4 s. Runs with the beat-frame QA.
4. New kit `tools/templates/explainer_kit/kit.js`: pastel background (gradient + blobs), title block, icon set (inline SVG, one style),
   components: compare cards (A != B), two columns, steps list with active step, flow (device -> cloud with moving chips), terminal typing,
   browser / form mock, checklist, big number card, image card / cut-out. Registered in `docs/LIBRARIES.md` only if a library is added (none planned).
5. Theme: `style` field in `ThemeSpec` (`contracts.py`; optional field, so no schema bump), an `explainer` preset (fonts: one clean sans + Anek Telugu),
   grade: light lift for this preset instead of the dark grade.
6. Images: Kaggle prompt suffix per style in the asset brief; rembg cut-out step for explainer images (rembg already used in prepare / visual).

## 3. Order of work (one phase per session, each ends with a commit + STATUS)
1. Rules into `rules.md` / `STYLE.md` (explainer section) after D1-D3.
2. `card()` no-crop + full-frame helper + empty-side QA; re-render 04 changed scenes if D2 = yes; frame QA.
3. `explainer_kit` + theme preset + grade; 2 sample screens (e.g. the reference's "git commit vs git push" idea) at 480p -> user checks the look.
4. Image style suffix + cut-outs; first real explainer video on the user's next topic.

## 4. Decision 2026-11-13 (late): "light-documentary" (user)
Name: **light-documentary** = explainer LOOK (pastel sections, Plus Jakarta Sans + Noto Sans Telugu, white cards, light 3D images, flat icons, captions off) + documentary STYLE (visual on every spoken word, 3-4 beats per sequence, no 5-element cap, different composition per sequence, something new every 1-2 s, moving camera, presenter shock shots, chapter transitions, numbers as objects).
- Effects are SMOOTH only: no shake / glitch / flash / hard slam; use zoom-punch with easing, bounce, light sweep, stagger, eased camera push.
- `theme.json` gets two settings: `look` (explainer | dark) and `style` (documentary | explainer); names for the old looks: dark+documentary = "documentary", light+explainer = "explainer", light+documentary = "light-documentary" (default from now).
- Next: update rules/STYLE, add the documentary parts to explainer_kit (stamps, pillars, torn tag, swarm, count-ups), rewrite 04's fx_* sequences denser, re-render previews; 1080p only on the user's word.

## 5. Mode is chosen per video (user, 2026-11-13)
No default mode: at the start of each new video offer documentary / explainer / light-documentary with a content-based recommendation (AskUserQuestion), the user picks; save the pick in `theme.json` (`look` + `style`). 04_Fable_Mythos currently = explainer (finals); the user chose light-documentary as the mode to move 04 to when planning continues.

## 6. Scope decision (user, 2026-11-13 end)
04_Fable_Mythos stays as it is (explainer finals, done). light-documentary is NOT applied to 04: build the Phase 1 kit parts and try the mode on the NEXT video (offer the mode options first, per section 5).
