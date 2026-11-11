# Motion catalog (user, 2026-11-11, STRICT)

**Core rule (above everything below):** never a template; think a fresh design every time. Build scenes from real
IMAGES and VIDEOS with a lot of MOTION ANIMATION (cards, masks, slides, zooms, reveals, text motion, transitions).
Drawn 2D graphics and 3D are not the point: use them only a little, where no picture can show the idea.
- Card / frame sizes: every shape, mixed through the video (1:1, 4:3, 3:4, 16:9, 9:16, 21:9 strips, circles, tall
  pillars, small thumbnails + one hero), each cropped around the picture's main object; never only one or two sizes.
- Text motion is as important as images: when the voice lists points, each point is typed / revealed on screen as it
  is spoken (a growing list); key lines, numbers and names appear as they are said (type-on, mask reveal, slam,
  highlight sweep), next to or over the pictures.

## Rules
1. No templates. Every scene is written fresh (HTML/CSS/GSAP, rendered by HyperFrames). Never pick from `tools/templates`
   by default. Save each written scene as a named template (`tools/templates/<video>_<category>`); reuse a saved one only
   when the user says so.
2. Visuals follow the words. Every meaningful spoken word (object, person, place, number, action, idea) brings its own
   visual at its exact time (`work/transcript.json` word times). Filler words do not. A scene has 2-4 such beats.
3. Motion graphics carry images and video: image / clip cards, masks, split and stacked frames, images at both ends of a
   flow. Never draw an object that a picture can show. Never a full-frame still with only a slow zoom.
4. Heavy motion: something new every 1-2 s, layout change every 4-6 s, the virtual camera always moves.
5. One design per category per video (consistent inside the video); the next video uses different designs and a
   different category mix. The same category never more than 2 times in a row.
6. Before rendering the whole video, render 1-2 sample scenes and show the user.
8. Smooth motion always (user, 2026-11-11): eased curves (power3 / expo / back), no jumps or pops without easing, overlapping
   moves instead of one-after-another stops, 30 fps, deterministic (seeded) particles; check a sample clip at full speed.
7. Graphs never repeat a look from earlier videos; numbers become objects, not plain bars (see 5, 6).

## Objects = real images (user, 2026-11-11, STRICT)
- When the narration names an object (laptop, fan, phone, TV, ...), show its actual picture, never a drawing made of shapes.
- Layout: a 1:1 picture in a clean, cinematic, modern card, the keyword text beside or inside it. The source may be any
  shape (16:9, 9:16): crop the 1:1 square around the MAIN OBJECT of the picture (find it with the rembg subject mask /
  its bounding box), never a blind centre crop that cuts the object.
- The picture itself stays still; the motion is on the card, the text, the transitions and the surrounding elements
  (subtle, smooth: slide / scale / mask reveal, light sweep, depth shadow, staggered text).
- Card and word appear on the keyword's beat in the voice-over (transcript word times).
- No fitting picture: a clean text motion graphic for that word instead; never an inaccurate image.
- Pictures: the drop pool first (any aspect, cropped as above), else the ONE Kaggle images run (object alone, clean background).

## Categories (word / moment -> motion -> where the image goes)
### A. Things and people
1. Object / device (TV, phone, laptop, fan, drone): the REAL picture of that object (never drawn in code), 1:1, inside a
   beautifully designed card, the word beside / under it; the card arrives on the spoken word. See "Objects = real
   images" below.
2. Person (scientist, historic figure, people): cut-out slides in with a depth shadow, a name-tag line draws ->
   image large on one third, name + role beside it.
3. Presenter reaction (shock, surprise, question, no-no): zoom punch + shake, background blurs and moves, words slam in
   beside -> the presenter at centre or right, 60-70% of the frame.
4. Place / organisation (country, university, agency): the map draws and a pin drops, or the logo stamps in as a badge
   -> a photo card rises from the pin; logo as a corner badge.
### B. Numbers and data
5. Number / measurement (4 cm, 8 km, 800 W): the number as an object (a line drawn between two ends with a counter, a
   ruler, an energy fill) -> images of the objects at both ends.
6. Percentage / share (20%, 80%): particles or a beam where only a part arrives and the rest scatters, or a grid of
   icons where only some light up -> source and target images at the ends.
7. Comparison (fact vs hype, then vs now): the screen splits, a divider moves and one side wins -> left / right images.
### C. Ideas and processes
8. Process / how it works: a beam / flow line draws between images, particles travel, each step's label pops ->
   one image per step (2-4).
9. List / steps: a glowing line draws; at each point icon + image card + label arrive on the spoken word -> one small
   image card per item.
10. Concept (energy loss, focus, density): abstract animation (scatter vs focus, glow pulses, morphing shapes) ->
    image dim in the background, the animation in front.
11. History / time: a timeline line draws, sepia turns to colour, a year counter runs -> a photo card per time.
12. Cause -> effect: a slider / knob moves and the effect grows with it -> cause and effect objects at both ends.
13. Quote / claim (viral post, someone's words): a social post or headline card types in, the key word highlights ->
    profile photo or news thumbnail in the card.
14. Zoom-in detail (inside a chip, receiver, sensor): a magnifier / zoom-through opens the detail -> the whole image
    and a crop of its detail.
15. Before / after: a wipe slider moves left and right -> the same scene in two versions.
16. Scale / size (tiny power, thousands of sensors): one icon multiplies into a swarm, or big shrinks to small ->
    icon grid or crowd image.
17. Sound / wave (ultrasonic, radio): concentric rings, a waveform moving in sync -> source device image + waves.
### D. Feeling and attention
18. Shock / big reveal: flash, electric arc (topic FX), camera shake, a heavy hero word slam -> the subject's photo
    large + the presenter's reaction.
19. Warning / myth-bust: a red MYTH stamp, a line strikes through the claim, a warning pulse -> a viral-post-like card
    under the stamp.
20. Question to the audience: a question mark builds, option cards turn, the presenter points -> the options as images.
21. Emotion moment (laugh, headache, hope): emoji / sticker pop, presenter expression, colour mood shift -> presenter or
    sticker.
22. Chapter heading: a big title types / splits with a chapter number, a topic transition (lightning wipe for
    electricity) -> the previous scene's image stays dim behind and the title grows out of it.
### E. Ending
23. Call to action (subscribe, like, comment, full video): button press, bell shake, arrow bounce -> video thumbnail
    card or the presenter.

## Across every category
- Continuity: an image / line of one scene moves into the next (a laser line becomes the next diagram's beam).
- Kinetic captions: a key word (number, name) flies out of the caption and grows.
- Camera: push, pan, rack focus in every scene.
- Sound design on every beat (whoosh, zap, pop, click; electric topic: zap / buzz).
- Depth: blurred props in front, subject in the middle, moving background behind.
- Light / colour storytelling: problem = red / dim, solution = accent glow, future = bright.
- Topic FX layer per video (electricity: sparks, arcs, flicker, glow pulses).

## Tools (user, 2026-11-11)
- On the PC (render): HyperFrames + GSAP (free plugins SplitText, DrawSVG, MorphSVG, MotionPath, Flip after registering in
  docs/LIBRARIES.md) + CSS / SVG + canvas 2D (sparks, particles, arcs, glow). Depth feel only by 2D: CSS perspective tilt,
  parallax layers, shadows.
- NO 3D: no Three.js, no WebGL scenes (PixiJS included): the PC (Iris Xe, no GPU) cannot handle it.
- On Kaggle GPU, in the ONE images run per video: Z-Image images, Depth-Anything (2.5D parallax), BiRefNet cut-outs,
  Real-ESRGAN upscale. Image-to-video (LTX-Video) only when the drop clips do not cover a scene (slow: minutes per clip).
- Measure the render time on the sample scenes before planning the whole video around a heavy effect.

## Craft (how it moves; Claude as motion designer, 2026-11-11)
- Storyboard first: before writing code, one line per sequence: words -> pictures -> motion -> transition. Claude decides;
  no user approval needed for the storyboard (user, 2026-11-11). Build the video as 15-20 SEQUENCES (10-25 s, one
  composition each, several sentences) instead of one clip per sentence: elements carry across beats (continuity).
- Motion tokens per video (`work/motion.json` or the scene code's top): durations (small 0.25-0.4 s, cards 0.5-0.7 s,
  big moves 0.8-1.2 s), easing set (in: power3 / expo out; out: power2 in), distances, card style (radius, shadow,
  border, light sweep), transition set. Every scene uses them: consistent inside the video, new set for the next video.
- Principles: ease every move (linear only for continuous spin / drift); a small anticipation before pops, a slight
  overshoot when settling; stagger related elements 60-120 ms; motion blur only on fast slides / zooms.
- One focal point at a time: when a new element arrives, the previous one dims or steps back.
- Text: on screen at least (words / 3) seconds; 2-3 text animations per video; the key word in the accent colour.
- Layout: a grid and safe zones per format (bottom band free for captions); same card sizes and margins in a video.
- Rhythm: big moves on word beats; a pattern interrupt (layout change, zoom, flash) every 5-8 s.
- Transitions: match cuts (a shape / colour / move carries into the next scene); big ones only between chapters.
- Sound: one SFX per animation kind (pop = soft click, slam = hit, wipe = whoosh, spark = zap), under the voice.
- Images: subject-aware 1:1 crop, graded toward the palette, cards with depth shadow + light sweep.
- QA after the sample render: one frame per beat (overlaps, cut text, contrast, wrong image) + the clip at full speed.

## Visual identity per video (user, 2026-11-11, STRICT)
Analyse topic, category, script and emotional tone first, then choose the identity; never force a fixed design.
- Background: colours, gradients, patterns, textures, particles / shapes that show the subject (electricity: circuit
  lines, arcs; medicine: ECG; space: stars); attractive but never fighting the content.
- Typography: Telugu + English fonts, weights, sizes and layout chosen for the category; clear hierarchy, readable.
- Palette with named roles: primary, secondary, accent, background, text, highlight; every element uses only these.
- Colour correction on EVERY image, clip and graphic: brightness, contrast, saturation, temperature and tone matched to
  the palette, consistent between consecutive scenes, natural skin tones, nothing looking pasted-in.
- One design system inside the video (background, type, images, motion, transitions, effects work together); scenes
  vary within it.
- Between videos: at least 70% different (background, fonts, palette, image treatment, layouts, text animation, motion
  graphics, transitions, effects, editing rhythm); similarity below ~30% (`studio.cmd theme NN` shows the score).
