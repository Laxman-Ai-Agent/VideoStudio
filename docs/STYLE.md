# Style references (user, 2026-11-08)

What the user wants every video to feel like. Read before planning scenes or writing asset prompts.
Sources: 7 Pinterest reels/posts the user shared (meme ad, real-estate motion graphics, comedy reel,
marketing post, agency reel, infographic reel, business reel) + two sample photos of the user.

## The presenter is the user
- The user appears in every video (memes, reactions, pointing). Their own photo is the reference image;
  the outfit changes per video (set in `characters[].description` of that video).
- Expression shots: clean background removal, sharp edges, half body (waist up) or full body.
  Examples given: hands on head + open mouth = shock. Others to cover: confused, thinking, happy/laugh,
  pointing (left / right / at camera), facepalm, angry, sad, thumbs-up.
- Every prompt for such a shot says which reference image to attach; the dashboard detail page shows it.

## Visual rules seen in the references
1. One idea per screen. Few words: a small kicker line + one big hero word (bold, italic or serif,
   accent colour). Words reveal one by one (blur-in, pop); the key phrase can sit in a highlight pill.
2. Cut-outs everywhere, always clean: people (often black-and-white with one accent colour), objects
   (hourglass, chest, compass, bulb) with a soft drop shadow. Optional sticker outline (white or accent,
   offset). Subjects are anchored to the bottom or an edge, large, never floating small.
3. Behind a subject: a glow disc, concentric circles or radial rays, in the accent colour.
4. One accent colour per video (red / pink / orange) on a neutral base (white, cream paper, black),
   faint grid or paper texture. No rainbow.
5. Memes: actor-style reaction cut-outs on a sunburst background, caption in bold boxes at the top,
   two characters side by side for a dialogue.
6. Pointing / circling: a circle or arrow on a thing, then a label pops next to it (callout).
7. Information as cards: title with underline, rows of icons with short labels ("Have" / "Don't have"),
   pinned paper notes, a curved road / path linking steps.
8. Depth: blurred props in the corners (foreground), subject sharp in the middle; slides and scale-ins,
   blur transitions between beats. Concept shots: a head replaced by a bulb or a word bubble.

## How it maps to the pipeline (status, all built 2026-11-08)
- Subject panel (big side cut-out), stamp words, layout zones, overlap check (phase A).
- Presenter reference photo in prompts + dashboard box (`Character.reference_image`, `outfit`).
- Cut-out treatments: `placement.outline` / `bw` / `backdrop` (glow, rings, rays).
- `meme` template (sunburst + caption boxes + 1-2 subjects), `callout` mark (circle + label).
- Kinetic `hero` / `pill` styles + theme `fonts.hero`; cards `rows` (icon tiles); `placement.depth` corner props.
- Not built: pinned paper notes / curved road, head-replaced-by-bulb concept shots, duotone tint.

## Every video its own look (user, 2026-11-10)
- No fixed template: topic decides style, story decides editing; consistent inside a video, different between videos
  (max ~30% alike the previous videos; earlier videos are references to avoid, never defaults).
- Per video: fonts, heading design, word animation, palette, background, camera move, transition set, chosen from the
  topic and tone (Claude writes the project `theme.json` with `motion` + `direction`, see plan brief).
- Visual kinds by topic, never all at once: geopolitics footage/maps/data; science diagrams/2D animation; history
  archival photos/maps; mystery atmosphere/dramatic light; tech UI/diagrams/futuristic motion.
- Transitions subtle for normal story, dramatic (flash, zoom) only where the moment needs it. Captions small and readable.
- Captions (user, 2026-11-10): no card behind them; the spoken word gets a colour (box in the accent colour,
  highlighter, underline or colour pop), a different caption style per video.
- Titles like type-specimen cards (user samples 2026-11-10): one designed English heading per screen (light + heavy
  mix, serif italic accent, hard offset shadow, hollow word, caps, small tracked kicker), style chosen per video.
  Highlight words are English only; Telugu lives in the captions.
- Photo titles: big and bold, placed in the empty part of the picture, never a small panel.
