# Editing rules

Creative rules from the user's corrections. Newest last. Format: date · rule · (what the user said).

## Starting rules (from planning, 2026-11-07)
- Never use the same visual type more than twice in a row.
- Something changes on screen every 2–4 s (16:9).
- When the narration says a number, show it on screen.
- 1–4 words of on-screen text. Show the idea, not the sentence. Keep the bottom third free for captions.
- Real person → real photo/footage. Company → real logo. Place → photo/map. Data → numbers as objects (motion.md 5, 6). Process → drawn flow between images (motion.md 8). News → claim card + photo.
- Reuse existing assets before writing a generation prompt.

## 2026-11-10
- 2026-11-10 · Captions small (half the old size), readable, off the important visuals · ("captions too big")
- 2026-11-10 · Every video its own creative direction (fonts, palette, motion, transitions), max ~30% alike earlier videos; vary transitions and compositions inside a video too · ("stop repetitive templates")
- 2026-11-10 · On-screen words on photos big and bold, in the empty part of the image; captions without a card, the spoken word in a colour box / highlight; caption style differs per video · ("words big bold in the empty place", "subtitle card remove")
- 2026-11-10 · Highlight words / headings in English only, designed like type-specimen cards (title_style + kicker), style per video · (user's Google Fonts samples)
- 2026-11-10 · Titles mostly one size for the whole phrase; small line + huge word only sometimes · ("konni sarlu text motham oke size lo vundali")
- 2026-11-10 · Never wait for AI images: render the preview at once with MISSING placeholders, leave `output/images_pending.txt` (prompts + the drop path), add the images later, then re-render only those scenes · ("images system off lo vunnapudu ... aa prompt output folder oka text file pettu")
- 2026-11-10 · 9:16 captions 20% bigger than the 16:9 scaling gave (3.6u -> 4.3u): they read small on a phone · ("9x16 lo caption koncham chinnaga vastunnai")

## 2026-11-11
- 2026-11-11 · Documentary motion design, not a slideshow: topic-based identity (pattern, 2-3 colours, type, image grade, motion set) kept for the whole video; varied compositions (split, stack, crops, cards, character + info); elements staged on the narration; each scene grows out of the previous one (what stays, moves, resizes, leaves, enters). Full rules: docs/STYLE.md "Visual storytelling and motion" · (user's visual storytelling brief)
- 2026-11-11 · Graphs never look the same as in earlier videos; no fake trend lines on stat numbers · ("bar chart 5 videos same", "800 W down arrow")
- 2026-11-11 · STRICT: no templates. Every scene written fresh (HTML/CSS/GSAP), saved as a template, reused only when the user says; sample 1-2 scenes first · ("template use cheyaku, prati okkati code rayu")
- 2026-11-11 · Visuals on the spoken words: each meaningful word brings its visual at its time; motion graphics carry images (devices with the image on screen, masks, cards); heavy motion; shock moments = presenter big at centre / right + slam text. Catalog: motion.md · ("prati padam matladinappudu daniki kavalsindi display avvali", "heavy motion vundali")
- 2026-11-11 · Objects named in the narration = their REAL picture (1:1, in a designed card, keyword beside it, on the word's beat); never draw objects from shapes; picture static, motion on card / text / surroundings; no fitting picture -> text motion, never an inaccurate image · (user's intro motion graphics brief)
- 2026-11-11 · Visual identity per video from topic / category / tone: topic background, Telugu + English type, palette with roles (primary, secondary, accent, background, text, highlight), colour correction of every image / clip to the palette, one design system inside the video, >= 70% different from earlier videos · (user's visual identity brief)
- 2026-11-13 · Presenter expression shots fill the frame height (bottom-anchored cut-out, about half the frame wide), never a small half-size figure · ("expression image antha peddaga vundali, not half")
- 2026-11-13 · Full-frame composition (16:9): a new scene's main visual starts large and centred; when the next visual enters, the current one moves / scales left or right to make room (split, overlap, zoom, cinematic repositioning, chosen per content, not split every time); never leave one side empty for long, also in 20 s+ scenes; balanced, complete frames · (user's "Dynamic Full-Frame Visual Composition" brief)
- 2026-11-13 · Images are never cropped: scale proportionally (contain, never cover / stretch); the card / box takes the image's own aspect ratio, and grows instead of cutting; the whole picture stays visible through every resize, move and transition · (user's "Responsive Image Scaling - No Cropping" brief)
- 2026-11-13 · Default look + style = "light-documentary": explainer LOOK (light pastel sections, Plus Jakarta Sans + Noto Sans Telugu, white cards, light 3D images, captions off) with documentary STYLE (a visual on every spoken word, 3-4 beats per sequence, no 5-element cap, a different composition per sequence, something new every 1-2 s, camera always moving, presenter shock shots); effects SMOOTH only (no shake / glitch / flash / hard slam; eased zoom-punch, bounce, sweep, stagger) · ("documentary style, look as explainer", "smooth effects")
