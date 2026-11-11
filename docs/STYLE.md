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

## Visual storytelling and motion (user, 2026-11-11)
Goal: a designed, animated documentary, never a slideshow of full-screen stills with zoom. Pick what fits the topic,
narration, assets and scene length; never every effect on every scene. Merges with "Every video its own look" above.

1. Topic identity, kept for the whole video: background pattern + texture from the topic (medical: ECG lines, anatomy,
   medical grid; space: stars, planets, atmosphere; history: old maps, vintage paper, architecture; tech: circuits,
   data lines, digital grid); 2-3 main colours; one typography + highlight style; one image grade; one graphic
   language; one animation / transition set. Background may vary in light, depth and motion, never in identity.
2. Backgrounds support the content, never compete with it; no plain unrelated backgrounds.
3. Type: same size and style for every highlight word, readable always, few font variations. Images from mixed
   sources get a grade toward the palette. Text over an image: dim the image or add a soft overlay only while the
   text is on screen, then restore it.
4. Composition varies with the narration: full screen, half image + half text, left/right split, vertical stack, two
   or more images, 1:1 crops, image cards, image + infographic, character + information. E.g. full image that
   shrinks into a 1:1 crop on one side; images entering from top / bottom; images joined by drawn lines and diagrams.
5. Continuity (most important): the video is one connected piece. At every cut decide what stays, moves, resizes,
   transforms, leaves and enters, and morph the old layout into the new one (image moves up, the next one rises from
   the bottom into its place, text changes in place, background stays). Examples only, not fixed layouts.
6. Motion vocabulary, rotated, never one move on repeat: slide / reposition, stack / replace, split-screen change,
   scale + crop, position morph, mask / clip reveal, vertical / horizontal moves, parallax, layered motion, drawn
   lines + connectors, text transforms, character entrances / moves, graphic transitions, image-to-image, layout
   transforms, animated infographics, coordinated multi-element moves.
7. Inside a scene elements enter one after another on the narration (sequential, overlapping, independent or
   coordinated), stay as long as they are needed, and may carry over the scene boundary. Short and long scenes both
   get timing that fits.
8. Transparent PNG characters (the presenter C1 or others) take part: character right + info left (or the reverse),
   beside a diagram, moving / resizing between scenes with the narration; never a static sticker for a whole scene.
9. No layout twice in a row without a reason; variety never breaks the video's identity.
10. Visual plan and motion plan are made together: what the line explains, which assets, which composition, which
   elements animate and when, how they interact, what carries into the next scene. The plan holds position, size,
   layer, timing, movement, transition and continuity, reusing the existing JSON (scenes.json params, edits.json
   layers, theme.json motion) before adding fields.

### What the pipeline can do today (checked 2026-11-11; update when a part is built)
- Built: per-video theme (fonts, 2-3 colours, background type, pattern none|grid|dots|lines, texture
  grain|paper|smoke|particles|stars, title_style, caption style, motion text_in / camera / transitions) with the 30%
  alike check; templates photo (full frame Ken Burns; in-scene `params.layout` split_text | split2 | stack | crop with
  `side`, `image2`, `crop_at`; `params.dim` darkens the picture only while the title shows, `text_until`), photo_parallax, cutout_title, kinetic, cards (rows, stat),
  chart, map, lottie, meme (1-2 characters), quote, timeline, screenshot, video_clip, iso (isometric infographic diorama:
  blocks, pins, drawn flow lines, camera keys, fills the frame, camera always moving; `params.iso`); overlays with placement
  (position, size, at / until, animation, outline, backdrop, depth); textzone puts photo titles in the calm area;
  per-element edits in edits.json (Timeline editor); one transition per cut from the theme set.
- Not built (plan around it, say so in the plan, do not claim it): elements that persist or morph across cuts (every
  scene is rendered as its own clip and joined by a transition); images inside motion graphics (cards / chart / stat) in 9:16 / 1:1 / masked frames (planned next); three or more
  images in one scene; drawn
  connector lines; colour grading of images to the palette (only the `look` filters such as sepia); topic patterns beyond grid / dots /
  lines (ECG lines, circuits, maps, anatomy); characters moving between scenes.
- Until those exist: get the closest result with what is built (overlays with `at` timing to stage elements in
  order, cutout_title / meme for character + text, cards / kinetic beside photos, varied templates, a carried-over
  background through the theme), and list the wanted continuity moves in scene `notes` so they can be built later.
