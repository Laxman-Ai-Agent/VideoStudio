# Changelog

## 2026-11-10 - Timeline loads fast

- Live preview is requested with `layout=0` (builds only, ~1 s when cached); the layout check (~8 s/scene, headless Chrome) runs afterwards and fills in warnings. Before, a first 9:16 open waited ~4.5 min on it.
- Thumbnails: 3 headless Chromes at a time (was 1, ~14 s each).

## 2026-11-10 - images_pending.txt is no longer deleted

- Fix: `studio assets` used to delete `output/images_pending.txt` the moment every image arrived, so the user never saw the prompts. Now it stays: header `ALL IMAGES ARE IN` + every prompt for reference. Test updated.

## 2026-11-10 - Preview first, images later: output/images_pending.txt
- New user rule: never wait for AI images. Render the preview with placeholders, then add the images.
- `pipeline/pending.py` writes `output/images_pending.txt` on every run / `studio assets`: every asset with no file yet (id, scene, time, prompt, the exact `drop/<id>.png` path, final size) plus the steps (kaggle images.cmd -> studio assets -> check timeline -> preview -> final). Deleted automatically once nothing is missing.
- 9:16 stat card: value 13u -> 20u, label 4u -> 5.5u (the 1:811 card was small in portrait); 9:16 captions 3.6u -> 4.3u (+20%, too small on a phone).

## 2026-11-10 · voice.cmd: approved narration chain
- `voice.cmd audio.mp3` -> 1.10x / 1.15x / 1.20x MP3s next to the original: atempo (Rubberband sounded bad), low cut, light denoise, strong bass, warmth, clarity, de-esser, compressor, two-pass loudnorm -14 LUFS. User picked it on "ai doctor" (A/B: atempo > rubberband, bass +7 > +4).

## 2026-11-10 · Specimen-style English titles
- 19 more English display fonts in `_brand/fonts` (google/fonts repo, OFL, ~7 MB; listed in its README): Bricolage Grotesque, Space Grotesk, Outfit, Sora, Jost, Fjalla One, Barlow Condensed, Alfa Slab One, Titan One, Lora, Cinzel, EB Garamond, Libre Baskerville, Audiowide, Exo 2, Share Tech, Dancing Script, Lobster, Black Ops One. All load through render.font_css (checked on a specimen sheet).
- Batch 2 (31 more, ~25 MB): Syne, Unbounded, Righteous, Bungee, Rubik, Raleway, Manrope, Lexend, Plus Jakarta Sans, DM Sans, Archivo Narrow, Teko, Rajdhani, Orbitron, Chakra Petch, Merriweather, Cormorant Garamond, Abril Fatface, Bodoni Moda, Fraunces, Big Shoulders Display, Staatliches, Russo One, Permanent Marker, Shrikhand, Special Elite, Creepster, Rye, Space Mono, Zilla Slab, Kanit (all checked).
- Theme `text.title_style` plain|split|italic|shadow|outline|caps (like type-specimen cards; the last word carries the contrast) on photo zone titles, lottie / headline / cards titles and kinetic hero lines; `params.kicker` small tracked label above a big title. Lottie title 9u -> 12u.
- Rule: highlight words (on_screen_text, lines, kicker) in English only; Telugu stays in the captions.
- 09: Playfair Display 800, italic coral last word, English texts + kickers, titles mostly one size. Caption box now grows 0.06 s before the word (a short word showed one white frame on the light page).

## 2026-11-10 · Captions without a card, big photo titles in the calm part of the picture
- Captions: card background removed (white + dark outline); spoken word styles box / marker / underline / pop from the theme's new `captions` field (default box), part of the similarity score (replaces text shadow).
- `pipeline/textzone.py`: calmest zone of a photo -> `scene.zone`; photo template puts the title there, big, heading font, white or dark by tone.
- 09: heading Baloo Tammudu 2 800, captions box in coral, heading font.

## 2026-11-10 · Creative direction per video, smaller captions
- Captions ~45% smaller (2.9u / 3.6u in 9:16, band 15-16u -> 8-9u, lighter weight, small padding); `CAP_BAND` in layout.js.
- `ThemeSpec.motion` (text_in, camera, transitions) + `direction` (optional, no schema bump); `transitions()` moved to theme.py (render re-exports), new transitions slide / dip / flash, 7 word entrances, 5 camera moves.
- `pipeline/identity.py`: style memory from earlier projects' work/theme.json, similarity score, QA `identity` + `variety` checks (warn on preview, fail on final); `studio.cmd theme NN` prints the score vs the 3 previous videos; plan brief asks for the creative direction first.
- 09 re-rendered with its own direction (ivory art-print look, Ponnala / Mandali, coral accent, mask words, push-in, dip/slide cuts): 0% alike 02/03/07.

## 2026-11-10 · Measured: hybrid text-layer render not worth building
- Text-only Chrome layer (photo hidden) vs full scene render, 07 scene 8: 720p 22.3 s -> 17-19 s, 1080p 29.5 s -> 21.5-23 s, before the FFmpeg photo motion + composite. Per-frame screenshot + ~5 s init dominate; dedup barely pays. Not built (details in STATUS GPU plan).

## 2026-11-10 · Render defaults: 16:9 only, 4 workers; first Z-Image video (09)
- `studio run`: `--format` default 16:9 (`9:16` / `all` on request), `--workers` default 4. Benchmark on a copy of 07 (720p preview): 2 workers 395 s, 4 -> 296 s, 6 -> 295 s.
- Project 09 (33 s): Z-Image images (6) end to end through `studio assets` and render; preview in 148 s.

## 2026-11-10 · kaggle/ Z-Image on both T4s + free test prompts
- Second transformer copy on cuda:1 (meta skeleton + load_state_dict GPU to GPU, no CPU RAM), one thread per GPU, jobs split; a failed image no longer stops the others. Test 3 animal prompts: 2 images on GPU0 + 1 on GPU1 in 77 s (1 GPU: 122 s), ~40 s each, GPU1 output identical.
- `kaggle\images.cmd prompts.json`: free prompts without a project (test runs).

## 2026-11-10 · kaggle/ Z-Image fp16 fix: 255 s -> 43 s per image
- Plain fp16 overflowed inside the blocks (black images). `fp16_fix` divides the `to_v` / `w3` inputs by 256 and the following RMSNorm eps by 256^2 (math unchanged); fp16 on one T4, 1344x768: 41-44 s per image (bf16 split: 255 s). Same 3 test images look the same as bf16. bf16 split and debug hooks removed.

## 2026-11-10 · kaggle/ Z-Image-Turbo image test
- `kaggle\images.cmd NN [ids] [--out DIR]`: Z-Image-Turbo (Apache-2.0) on Kaggle T4 x2, weights downloaded inside the GPU run, PNGs to drop/ or DIR. Test 01 A010/A023/A024 at 1344x768: 3/3 OK, ~255 s per image, download 155 s + load 136 s.
- Fixes on the way: text encoder needs `torch.no_grad()` (OOM), fp16 gives black/NaN images -> bf16, bf16 attention on T4 needs ~2 GB extra -> transformer split over both GPUs (accelerate). Resume key includes the runner code (a stale failed run was reused once). Old weight-mount kernels (zimage/qwenimage model/te) deleted.

## 2026-11-10 · kaggle/run.py resumes an interrupted run
- Network drop / PC sleep / closed window during `kaggle
un.cmd`: the Kaggle run keeps going on Kaggle; a rerun with the same files now waits for it or downloads its output instead of pushing a second GPU run (`resume()`, marker `.work/last_push.json`, cleared once results are used). Test: `kaggle/test_run.py`.

## 2026-11-10 · kaggle/ hybrid GPU render test (one scene)
- `kaggle/hybrid_local.py 07 8` builds one scene like `run --final` into `kaggle/.work/hybrid` (07 outputs untouched): full Chrome render (36.2 s) and a text-only render (photo hidden, transparent page, `--format png-sequence`, 18.5 s, 84 RGBA frames, 6 MB).
- `kaggle/hybrid_run.py` uploads photo + frames + job.json (dataset `videostudio-hybrid-in`), GPU kernel `kernels/hybrid` redraws the photo template motion with torch (cover fit, scale 1->1.12, pan 3u, fade, blur-in), composites the text, RGB->NV12 on GPU, `h264_nvenc` (Kaggle ffmpeg had NVENC). T4: 2.9 s per scene, 84 s video in 25 s. Overhead: upload 237 s, kernel wall 97 s, PNG decode 17 s (4 vCPU).
- Result: SSIM 0.98 vs local; not clearly faster end to end (Chrome text = half the local cost). Hybrid engine not continued.

## 2026-11-10 · kaggle/ add-on: CLI + token
- `kaggle\run.cmd NN`: Whisper large-v3 on Kaggle GPU writes `work/whisper.json` with the studio `transcribe` checkpoint. Fixes found on the way: pin av 15.1.0 (Kaggle's newer av: `open() got an unexpected keyword argument 'metadata_errors'`), preload pip CUDA 12 cuBLAS/cuDNN (`libcublas.so.12` missing in the Kaggle image). 07 audio: 161 words, 121 s on T4.
- New self-contained `kaggle/` folder (own venv, `requirements.lock.txt`, `kg.cmd` wrapper reading the git-ignored `kaggle/access_token`, README). Token verified (`kg.cmd kernels list --mine`). Plan: audio-only videos -> Whisper large-v3 on Kaggle GPU -> Claude fixes words into a Gemini-style JSON -> local `align_mms`. Nothing in `tools/` changed.
- Model: CPU kernel `kaggle/kernels/whisper-model` downloads the pinned faster-whisper large-v3 snapshot on Kaggle (8 s) into its output; GPU kernels attach it via `kernel_sources`. A private dataset upload from this PC was stopped (~2 MB/s upload, ~30 min).

## 2026-11-09 · align_mms: timing correction for a word-timed JSON
- `python -m pipeline.align_mms audio json out` keeps the JSON's text and replaces every word / scene time with times measured by Meta's MMS forced aligner (torchaudio 2.8, optional `uv` group `align`, model cached in `tools/models/torch` via `TORCH_HOME`). On 07 the Gemini JSON was off by 5.5 s on average (max 11.8 s, it stretched 77 s to 89 s); corrected sentence starts match the audio pauses within 0.05 s. Not wired into `studio run`. Model licence CC-BY-NC 4.0 (user's own experiments). Tests: `test_align_mms.py`.

## 2026-11-09 · keyword web search removed (asset-collector MCP instead)
- Removed `providers.wikimedia / openverse / pexels / search`, `resolve._internet`, `config.secret` and `PEXELS_API_KEY`. Scenes with no local or exact-name match now resolve to `missing`; `fetch_asset` only handles `real_logo` and `entity:` hints. Loose images: asset-collector MCP, then drop `<id>.png` + `studio.cmd assets NN`. Already downloaded files in `_library/downloads` stay and are still matched locally. Tests updated (`test_resolve_order_template_missing`).

## 2026-11-08 · credits.txt lists every third-party file
- `resolve.credits(res, va)` also lists the validated online / logo files collected for visual-assets.json (mains and overlays; their credits are on the asset), sorted by scene, without duplicates; `studio run` rewrites credits.txt on every run (cheap). Before, 03 listed 1 of 8 credits. Test: `test_credits_include_online_assets_from_visual_assets`.

## 2026-11-08 · resolve: drawn scenes stay drawn
- Seen on 03: kinetic scenes (`params.lines`) got a loose library photo whose description matched their query words, so the kinetic text never showed. A template-type scene with template params (lines, rows, items, stat, events, focus/pin, quote, meme, lottie, bars ...) now resolves to `template` before any local match. Test: `test_template_scene_with_template_params_is_never_a_loose_photo`.
- Project 03 (Chandrayaan-3, 66 s, ElevenLabs voice): no Whisper; Gemini words placed on the audio's real pauses (13 sentence breaks, mean error 0.3 s), then align/plan/assets as usual; 11 template scenes + 7 free photos (Wikimedia/Openverse, credited), no manual download.

## 2026-11-08 · Visual Assets page: "Prepare & open Timeline"
- One button in the page header runs `studio run <pid> --review` in the background (matches uploads, processes, resolves, storyboard; no render), shows the elapsed seconds, then opens the Timeline of that project. `POST /api/projects/<pid>/render?review=1`; a prepare run does not count as a render time. Test: `test_prepare_runs_review_without_render_and_keeps_render_times`. Checked on 02 (~20 s).

## 2026-11-08 · Whisper: a garbage word over lost speech is a hole; holes are re-transcribed alone
- Seen on 02: large-v3 returned one word ("bha?") spanning 8.3-27.6 s of real speech; the coverage check only looked at gaps between words, so it passed and align failed later ("no script word matched 7.9-27.6 s").
- `transcribe.holes()` also counts words longer than MAX_GAP; `patch_holes()` re-transcribes only those stretches (`clip_timestamps`, VAD off) and splices the words in, before the whole-file retry. 02 fixed this way (90 words, no holes). Tests: `test_a_word_spanning_lost_speech_is_a_hole_and_only_that_stretch_is_redone`, retry test updated.

## 2026-11-08 · Timeline: elements card is the big one in the right column
- "Scene N - Elements" gets the larger share of the right column (bigger cards, 84 px pictures); Scene Details / Visual Edit / Animation / Effects tabs sit below it and scroll inside.

## 2026-11-08 · Timeline: app menu bar removed
- The top app bar (logo, Timeline Editor, nav, project select) is gone; the project select moved into the project bar, and a close button (x, top right) returns to the dashboard. More height for the preview.

## 2026-11-08 · Bigger preview; elements card moved to the right column
- The preview card now takes the whole centre height (1500x850: 647x364 instead of 487x274). The "Scene N - Elements" card sits at the top of the right column (2 cards per row, scrolls inside), the tabbed panel below it.

## 2026-11-08 · Timeline page fits the window; elements below the preview
- No page scroll: body is a 100vh flex column; scene list, right panel and tracks scroll inside their own cards; the preview fills the free height of its card (`fitScreen` reads the stage size); track lanes are shorter.
- The left list shows scenes only. The "Scene N - Elements" card under the preview lists every element of the selected scene (background, pictures, text blocks, overlays) as cards with chips All / Images / Video / Graphics / Text; a card click selects it (same selection as canvas and panel). The layer rows under the scene (previous change) were removed.

## 2026-11-08 · Layer-based editing: background + text blocks are layers too
- Generic layers ids in `edits.json`: `L:bg` (the main picture / footage `.fill`) and `L:t1..` (each text block of the template: kinetic lines, title, lower third, cards items; nested blocks count once). Same schema as overlays; `manual` = the wanted visual box (fractions of the frame), reached with CSS `translate / scale / rotate` + `filter: opacity()` (GSAP only writes `transform`, so template animations keep working); hidden = invisible. `edits.layers()` -> `plan_jobs(..., manual=)` (in the scene key) -> `scene.json["layers"]` -> `layout.js layers()/placeLayer`; preview, `studio run` and the Timeline use the same call.
- Timeline: the selected scene lists its layers under it in the left list (Background / Images / Logos / Text / Overlays, thumbnail, name, eye); list, canvas and right panel share one selection (`ed.sel`). Canvas click prefers pictures over text; the background is picked from the list or the strip only (an empty click still clears). Background / text have no Duplicate.
- Fix: the render key hashed font families in set order, so two Python processes (dashboard preview vs `studio run`) could get different keys for the same scene (needless re-renders). Now sorted. Test `test_render_key_does_not_depend_on_the_python_process`. All scene keys changed once.
- Fix: elements without an id are never stored in edits.json ("null" keys were seen); the UI ignores edits without a selected element.
- Checked on 01 scene 1: single-scene render shows the moved / scaled / rotated text block like the preview (same key).

## 2026-11-08 · Timeline page re-laid out like the reference
- `timeline.html` restructured (new `timeline.css`): app bar (logo, Timeline Editor pill, nav, project select), project bar (back, title, scene count, 16:9 / 9:16, Preview / Final, Render Video), three card columns (scene list with still + time range + type badge + green check | preview card with round play, prev / next / loop, time, scene seek slider, speed + Scene Assets strip | right tabs), tracks card with toolbar (undo / redo / delete, zoom, Fit) and track icons. All element ids unchanged, so the render bar, live preview and edit code work as before.

## 2026-11-08 · Images in the Timeline (scene stills, overlay thumbnails)
- `POST /api/projects/<pid>/thumb?fmt=&scene=` -> `pipeline/preview.make_thumb`: `hyperframes snapshot --at 1.3` of the built scene -> `scene_NNN/thumb.jpg` (480 px), cached by the scene render key (`.thumb.key`); one Chrome at a time. The preview answer carries `thumb` per scene.
- Timeline: scene list shows the still (64x36) per scene, the Visual track clips are film strips of the still, Overlay clips carry their asset thumbnail. Stills arrive one by one after the page loads (~8 s each, current scene first, cached afterwards); an edited scene gets a new still after its rebuild. Test: `test_scene_thumbnail_is_cached_by_render_key`.

## 2026-11-08 · Timeline Visual Edit UI follows the reference layout
- Right panel (310 px) with 4 tabs: Scene Details (the old details) | Visual Edit (layer header with thumbnail, file name, "Image Layer (Selected)", eye = hide via opacity 0, trash = delete; Transform: Position, Size + lock icon, Scale slider + %, Rotation + reset, Opacity slider + %; Arrange 4 icons; Fit & Align 6 icons + fit to canvas; Reset Transform, Duplicate) | Animation and Effects (read-only: placement from the built scene.json). Selecting an element switches to Visual Edit.
- "Scene N - Assets" strip under the preview: All / Images / Video / Graphics chips, cards (thumbnail, file name, natural size, green check, selected highlight); a click selects the element and turns Edit mode on. Toolbar: undo / redo / delete beside the transport; scene list shows thumbnails when the resolved visual is inside the project.
- Files: `timeline_panel.js` (panel + strip), `timeline_edit.css`; `timeline_edit.js` keeps the edit logic. Readout on the box is "x, y  w x h". Test: `test_timeline_scripts_parse_and_load_in_order`.
- Left out: Split (no engine), Video filter is always 0 (the main visual is not editable yet), no new animation / effects editing.

## 2026-11-08 · Manual Visual Editing (Timeline "Visual Edit")
- Data: `<project>/edits.json` = `{fmt: {scene: {asset id: {x,y,w,h (fractions of the frame), rot, opacity, z, lock, hidden, dup?}}}}` (`pipeline/edits.py`, values clamped; 16:9 and 9:16 independent). `visual.overlays(va, project, fmt)` merges it as `placement.manual` (hidden = dropped, duplicate = extra overlay `A012#2`) and adds `placement.id`. `manual` is in the scene render key (a bare `id` is not, so no scene re-renders just from this change); `preview`, `studio run` and the Timeline use the same call, so preview build = render build. Originals never touched.
- Render: `layout.js` lets `o.manual` replace the automatic box of that element only (image overlays, stamp text, subject panel, depth prop), rotation via CSS `rotate` (no clash with GSAP), opacity as the tween target, layer = zIndex offset. It exposes `__boxes / __manual / __settle` to the dashboard.
- Timeline: Edit mode (E): click an element in the live preview, 8 handles + rotation handle (Shift = 15 deg snap / flip aspect lock), live X/Y/W/H readout, right panel (Transform, Arrange, Fit & Align, Duplicate, Delete, Reset), undo/redo (Ctrl+Z / Ctrl+Y), Ctrl+D, Delete, arrows nudge. Saves with `PUT /api/projects/<pid>/edits`, then `POST /preview?layout=0` rebuilds only that scene. Files `ui/frontend/edit_math.js` (pure math) + `timeline_edit.js`.
- Fix: `timeline.js` started loading before the later scripts were parsed (race); it now waits for DOMContentLoaded.
- Tests: `tools/tests/test_edits.py` (clamp, persistence, apply, only the edited scene's key changes, preview build = render build, node math), `test_ui.py::test_edits_api_...`. Checked on 01 scene 8: preview and a single-scene render show the same moved / enlarged / rotated robot, same render key.

## 2026-11-08 · Hero word, info card, depth props (style plan step 4)
- Kinetic: line styles `hero` (the one big word, font = theme `fonts.hero`, falls back to heading; `italic` option, size `xxl`) and `pill` (key phrase on a marker-colour capsule). `ThemeSpec.fonts.hero` is validated like heading / script.
- Cards: `params.rows` = up to 3 info rows `{title, items: [{icon: emoji, label}]}` (icon tiles, staggered pop); picks the `cards` template.
- Overlay `placement.depth`: a big blurred prop cut by its frame corner, behind the text, drifting slowly (atmosphere, not the hero). Brief + plan prompt describe all three. Test: `test_rows_pick_cards_and_hero_font_falls_back_to_heading`.

## 2026-11-08 · Meme template + callout (style plan step 3)
- Template `meme` (`params.meme = {lines: [...], bg: "rays"|"plain"}`): rotating accent sunburst, bold white caption boxes at the top (bounce in), the scene's person / meme overlays below in `#stage` (1 centred, 2 side by side), with outline / B&W / backdrop treatments (backdrops white on the sunburst). `layout.js memeSlots`. Plan brief mentions it.
- Mark type `callout` {x, y, w, h, text, side}: circle draws on a thing, a line, then a label pops beside it. Test: `test_meme_param_picks_the_meme_template_and_callout_is_drawn`.

## 2026-11-08 · Cut-out treatments (style plan step 2)
- `placement.outline` ("white" | "accent" sticker edge), `placement.bw` (black-and-white subject), `placement.backdrop` ("glow" | "rings" | "rays": accent-colour shape behind the subject; rays turn slowly). Work on the subject panel and on plain overlays; backdrops sit under the text. Brief tells Claude when to use them. 01: A015 white outline + rays, A018 B&W + accent outline + glow.
- Overlay / layout code moved from `studio.js` to `_shared/layout.js` (file size limit); `render.build` writes both into one `studio.js` (layout first). Test: `test_cutout_treatments_reach_the_scene_and_layout_js_is_bundled`.

## 2026-11-08 · Presenter reference photo
- `Character.reference_image` + `outfit`; the user is C1 in every video (photos in `_brand/presenter/`, git-ignored; two shock samples are there now). The assets brief tells Claude the presenter rules: every C1 prompt starts "Attach reference image: <file>", outfit word for word, per-video outfit.
- Dashboard asset page: "Attach this reference image" box (photo / character sheet, outfit, path); Copy Prompt puts the attach line first. Route `GET /brand/presenter/<file>`. Test: `test_asset_view_gives_the_character_reference_photo`.
- English font families (13) added to `_brand/fonts/` (see LIBRARIES.md).

## 2026-11-08 · Subject panel + stamp words
- Person / character overlays (category `character_expression`, `reaction`) on photo or footage scenes: a full-height 9:16 panel at the left or right edge (slides in, background dims, subject large and bottom-anchored). Side = away from where the subject stands in its own picture (`cx` = alpha centroid from `render._centre_x`), or the other side if that one holds the lower third; the lower third wraps before the panel. Text scenes keep corner stickers.
- Overlays with `subcategory: text_sticker` + `prompt.text_in_image` (LAYOFFS) are drawn as type, not as the picture: big bold red stamp that slams in with a flash and shake. Layout check skips the stamp and flash (rotated box corners gave a false "hidden under video"). Test: `test_overlay_subject_side_and_stamp_text`.

## 2026-11-08 · Phase A: alignment
- Layout zones in `_shared/studio.js`: text boxes are measured (lower third, kinetic lines, titles, card items, tags) plus the fixed caption band; overlays that would cover text or another overlay move to the first free corner, then shrink (min 0.2 of the area). Overlays get their pixel size from render (`w`, `h`) and their asset `kind`.
- Highlight boxes, lower thirds and tags are padded from canvas glyph metrics so Telugu ink sits centred (01 scenes 1, 8, 9 were clipped at the top).
- Captions: hot word grows 5% (was 8%) and words get a 0.12 em margin; Hind Guntur's narrow space was covered ("cutచేయడం"). Test: `test_caption_words_keep_a_gap`.
- Logo grid: a logo scene with `logo` overlays shows same-size white cards centred above the lower third; logo scenes never use parallax (01 scene 3 cropped the Grok logo huge). Test: `test_parallax_only_when_cutout_exists`.
- Cards: the checklist column shrinks to its content (no empty right half).
- Layout check `pipeline/layout.py`: `hyperframes inspect` per built preview scene (~8 s, cached by render key in `.layout.json`), "layout: text hidden under an image ..." lines in the Timeline warnings; `text_box_overflow` ignored (line box, not ink). Test: `test_layout_check_summary_and_cache`.

## 2026-11-08 · Render clock in the Timeline
- Render bar under the header while a render runs: big elapsed clock (ticks every second), "usually takes" from the last finished run of the same mode (`work/logs/ui_render_times.json`) with a progress bar and time left, and the latest log line. Stays visible after the run (green done / red failed). Test: `test_render_status_reports_elapsed_and_remembers_duration`.

## 2026-11-08 · One aspect only
- `studio run 01 --format 16:9|9:16`: skip the other format's render/assemble (its cache is untouched).

## 2026-11-08 · Timeline UI redesign
- Layout: scene list (left, warning marks, "only warnings" filter), large live preview with scene badge and Expand (F), details panel (narration, visual, text, overlays, warnings). Dashboard colours.
- Transport: previous / next scene, loop scene, speed 0.5-1.5x, zoom - / + / Fit, keys (Space, arrows, Shift+arrows, L, F, Home/End).
- Tracks: Captions (from the scene builds), Text, Overlays, Visual coloured by kind (template / video / image / missing), yellow border = warning, red = build failure.
- Header Render button: `POST /api/projects/<pid>/render[?final=1]` runs `studio run` in the background; status line shows the last log line (`work/logs/ui_render.log`).
- Preview API adds per-scene `warnings` (missing visual, asset validation warn/fail) and `captions`.
- Fix: dashboard server no longer shares a busy port on Windows (SO_REUSEADDR); a second `studio ui` now moves to the next port. Test: `test_busy_port_is_not_shared`.

## 2026-11-08 · Live preview in the Timeline
- `pipeline/preview.py` + `POST /api/projects/<pid>/preview?fmt=`: scene builds in `work/preview/<fmt>/` (01: 2.5 s for 16:9, 0.2 s cached). Timeline plays the real templates (animation, overlays, captions, theme) synced to the narration, 16:9 / 9:16 switch, next scene preloads (two iframes only). Not in preview: music, SFX, loudness. Test: `test_preview.py`.

## 2026-11-08 · RAM-aware rendering
- Render lowers parallel workers to what free RAM allows (`safe_workers`: 0.6 GB per worker + 1 GB headroom, never below 1) and says so; `doctor` shows free RAM and warns under 2 GB. Test: `test_safe_workers_follow_free_ram`.

## 2026-11-08 · Timeline view (read-only)
- Dashboard page `ui/frontend/timeline.html` + `timeline.js` (nav link "Timeline"): Text / Overlays / Visual / Narration tracks, playhead, Play (input/audio.wav), zoom, click to seek, preview of the selected scene. Reads work/scenes.json, work/resolved.json, visual-assets.json. Writes nothing.

## 2026-11-08 · Quote template
- `quote` template: accent quote mark, text revealed word by word, bar + speaker name / role. Picked by `params.quote` {text, by, role}; the plan prompt lists it (real quotes only). Test: `test_quote_picks_by_params`.

## 2026-11-07 · Dashboard: narration context, framing, trim, safe replacement
- Contract: `VisualAsset.narration`, `context`, `prompt_original`, `media` (`AssetMedia`: aspect 16:9 / 9:16 / 4:5 / 1:1, fill / fit, crop focus, zoom, trim start / end, required and source duration, source and output size), `pending_file`, `pending_preview`, `history` (additive).
- `visual.sync(words=...)` fills the narration from the transcript (an overlay's own time window, a main visual's scene) and the required duration; `visual.process` frames images (fill / fit at the chosen aspect) and trims / frames videos with FFmpeg into a new file. Brief asks for `context`, full video prompts (max 10 s, start / end) and narration-linked memes.
- Dashboard: Narration / Why this visual / Scene box, live framing preview (aspect, fill / fit, crop X / Y, zoom), video start / end with "use required length", Replace = upload -> side-by-side preview -> Confirm or Discard (the current file stays until the new one validates; previous processed files kept as `.vN`), original prompt kept, history list, Save Changes / Cancel. API: `PUT .../media`, `POST .../replace/confirm|cancel`.
- 01: `context` written for all 24 assets, narration filled. Tests: 70.

## 2026-11-07 · Visual Assets dashboard
- `ui/backend/service.py` (projects, assets, prompt save, upload / replace through `pipeline.visual.sync`), `ui/backend/server.py` (stdlib JSON API, safe file serving with Range, static UI).
- `ui/frontend/`: dark / purple layout from the reference (sidebar, project dropdown, Total / Found / Missing, image grid with Found / Missing badges), asset detail modal (preview, facts, its own editable prompt + negative, Copy / Edit / Save, Upload / Replace with drag and drop and progress, unsaved-changes guard). Project choice survives a refresh.
- `studio.cmd ui [--port N] [--no-browser]`. Tests: `tests/test_ui.py` (HTTP end to end: listing, isolation, prompt save, upload validation, no overwrite, replace, file safety). 68 tests.

## 2026-11-07 · Visual asset requirements (visual-assets.json)
- Contracts `VisualAssets`, `VisualAsset`, `Character`, `AssetPrompt`, `AssetOutput`, `AssetProcessing`, `AssetPlacement`.
- `pipeline/visual.py`: brief for Claude, sync (timestamps, logo rule, uploads by id, online fetch, processing, validation, fallback entry for uncovered missing scenes, summary), `main_files`, `overlays`, rembg remover.
- `resolve.fetch_asset` (one asset through the same providers) and `resolve(main_assets=...)`. Ingest sends `A012*.png|mp4|json` to `assets/generated/`. Asset index skips `generated/` and `processed/`.
- Render: overlay layer (`scene.overlays`, `_shared/studio.js|css`), overlays in the cache key.
- studio: theme right after the plan, visual-assets stop + brief, sync before and after resolve, `studio.cmd assets NN` (no render). `pipeline/prompts.py` and the `prompts/` folders removed.
- 01: `visual-assets.json` written in-session (24 assets: 2 characters + reference sheets, real local logos as overlays, 10 AI prompts, scene 10 main image). Tests: 65.

## 2026-11-07 · Per-video visual themes
- `ThemeSpec` contract, `pipeline/theme.py` (auto pick by English/Telugu keywords, manual preset + overrides, validation: colours, WCAG contrast fix, font availability with safe fallbacks, unsupported values), 11 presets in `tools/themes/`.
- theme stage -> `work/theme.json`; `studio theme NN [--preset NAME | --auto]` (never renders). Doctor checks the presets.
- render: theme -> scene colours, fonts (`font_css` loads the theme fonts), `scene.style`; theme in the cache key.
- `_shared/studio.js|css`: heading/body/script fonts, weights, tracking, shadow, outline, text scale, secondary text and warning colours, gradient backgrounds, grid/dots/lines patterns, grain/paper/smoke/particles/stars textures, light/dark tone rules (`.tone-light` replaces `.theme-paper`). Stat card down arrow uses the warning colour.
- Tests: 61.

## 2026-11-07 · Free asset sources
- `params.entity`: exact person photo / brand logo via Wikidata + Commons, Simple Icons fallback for logos (transparent PNG card by headless Chrome).
- Openverse added to keyword search (photos, no key). Commons URLs keep the right file extension.
- `params.lottie`: emoji -> Google animated Noto emoji in `_library/lottie` (or a project .json); new `lottie` template with lottie-web 5.13.0.
- Photo template: logo scenes show the whole logo on the themed background (no blurred copy); `params.full` keeps the old look.
- Plan brief lists `entity`, `lottie` and the other style params. Tests: 56.

## 2026-11-07 · Transitions, kinetic text, UI cards
- Transitions: brand.json `transitions` cycled per cut (blur, wipe, zoom, circle; `params.transition` overrides, `cut` = hard cut). The outgoing scene animates out in its last 0.2 s and the incoming one in over its first 0.25 s, so clips stay separate and cached. Wipe/zoom cuts get a whoosh.
- `kinetic` template: mixed-size lines (`params.lines` with size s/m/l/xl and style bold/plain/box/script/outline), words blur in, giant faded `bg_word`. Script style uses `brand.fonts.script` (Akaya Telivigala).
- `cards` template: checklist card (`items`), stat card (`stat` value/label/trend with a drawn trend shape, numbers only from the plan), call-to-action `button`.
- 01 scenes.json uses kinetic (1, 5, 8, 9), cards (11), highlighter (2, 4, 7) and black & white (4).

## 2026-11-07 · Paper style
- brand.json `theme` + `themes` (dark, paper; paper is the default): colours incl. marker, panel, caption pill. Paper adds animated film grain.
- Shared params for every template: `look` (sepia, bw, vintage, halftone), `marks` / `marks_v` (hand-drawn circle, underline, arrow, box, sticker tag), `marker` (highlighter behind on-screen words).
- `cutout_title` template: rembg subject with a white sticker outline over a big two-line title (`params.cutout`, `title`, `kicker`, `frame`); prepare also writes a tight `scene_NNN_cut.png`.
- `_library/sfx`: whoosh, click, pop, paper sounds generated with FFmpeg (no third-party licence).

## 2026-11-07 · Brand fonts
- 24 Telugu families (Google Fonts, OFL) saved in `_brand/fonts/` with a catalog README; specimen sheet in `tools/.cache/fonts/`.
- render: `font_css` writes @font-face rules for the brand.json families into each build's studio.css and copies the files; font files are part of the scene cache key.
- brand.json: Gidugu is the default font. `headline` back on HyperFrames (DECISIONS #30).

## 2026-11-07 · Phase 5 Extras
- shots stage (`pipeline/shots.py`): `assets/raw_footage` videos cut into `assets/shots/<stem>_NNN.mp4` by FFmpeg scene detection; originals left out of the index; contact sheet capped at 20 tiles per run.
- capture stage (`pipeline/capture.py`): `params.url` on screenshot scenes -> `assets/screenshots/scene_NNN.png` via headless Chrome (`chrome.screenshot` accepts URLs), `work/captures.json`.
- Templates: `screenshot` (browser frame, scroll, highlight zoom), `timeline` (`params.events`), `map` (Natural Earth India-POV outlines + 50m states, `map.js` from `make_data.py`, fly-in, focus fill, pins). render copies template `*.js` data and passes `asset_w`/`asset_h`.
- Plan brief lists the optional template params.

## 2026-11-07 · Phase 4 Polish + Remotion
- Captions: `Brand.captions` toggle, `render.caption_pages` (script words + Whisper timing, per scene, max 4/3 words per page), overlay in `_shared/studio.js|css`; part of the scene cache key.
- Audio: assemble mixes music from `_library/music/<Brand.music_mood>/` (ducked under the narration) and whoosh/click SFX from `_library/sfx/`, loudnorm on the mix. Missing folders = no music/SFX.
- prepare stage + `photo_parallax` template: rembg 2.0.87 cut-outs (model in `tools/models/rembg`), opt-in `params.parallax`, falls back to `photo`. Contracts `PreparedScene`, `Prepared`.
- qa stage: loudness, true peak, black/freeze, duration vs narration, clips, placeholders -> `work/qa.json` (`QACheck`, `QAFile`, `QAReport`). Assemble now writes `work/assembled/`; previews always exported, finals only on pass.
- Remotion 4.0.541 engine in `tools/engines/remotion` (own lockfile, `render.mjs`, `src/studio.jsx` twin of the shared HyperFrames helpers). `headline` ported (`Composition.jsx`) and switched to `"engine": "remotion"`; render picks the engine from template.json.
- Doctor checks Remotion and rembg, and validates every template folder.

## 2026-11-07 · Phase 3 Render v1
- templates (`tools/templates/`): `photo`, `video_clip`, `headline`, `chart`, `missing` + `_shared/studio.js|css` (brand colours/fonts, safe areas for 16:9 and 9:16, kinetic word pop-in). GSAP 3.15.0 from the HyperFrames package.
- contracts: `Scene.params` (optional), `TemplateSpec`, `SceneRender`, `RenderReport` (schema v1, additive).
- `pipeline/render.py`: per-scene, per-format HyperFrames render, exact frame count (pad/trim), content-hash cache (`.key` files), failure -> `missing` tile + `report.json`, retried next run; parallel workers (default 2).
- `pipeline/assemble.py`: concat + narration, two-pass loudnorm to -14 LUFS, `output/preview_*.mp4` (720p) or `output/final_*.mp4` (`--final`).
- `studio run NN [--final] [--workers N]` continues storyboard -> render 16:9 / 9:16 -> assemble. Doctor checks templates + GSAP.
- Tests: fake-engine render (cache, single-scene re-render, isolation, exact frames) and assemble sync.

## 2026-11-07 · Phase 2 Assets
- contracts: `AssetEntry`, `AssetIndex`, `ResolvedScene`, `Resolved` (schema v1, new files only).
- `pipeline/assets.py`: hash-keyed asset index for project and `_library`, ffprobe info, ffmpeg first-frame thumbs, one contact sheet per batch of undescribed files (exit 2 until Claude describes them).
- `pipeline/resolve.py` + `pipeline/providers.py`: scene -> asset (project, library, template, Pexels/Wikimedia via stdlib urllib, missing); `work/resolved.json`, `output/credits.txt`. Network errors degrade to 'missing'.
- `pipeline/prompts.py`: generation prompts with exact save-as names + README.
- `pipeline/chrome.py`: shared headless-Chrome screenshot (storyboard + contact sheet).
- storyboard shows thumbnails / MISSING / TEMPLATE tiles. `studio run` wires index -> library_index -> resolve -> prompts -> storyboard; resolve re-runs when a chosen file was deleted.
- `config.secret()` reads `tools/.env` (git-ignored) for `PEXELS_API_KEY`.

## 2026-11-07 · Phase 1 Audio -> Plan
- `_brand/brand.json` + `Brand` contract: formats 16:9 (1920x1080) and 9:16 (1080x1920), one plan rendered per format, 30 fps, dark #0E0E10 + yellow #FFC400 + white, Noto Sans Telugu + Inter.
- ingest: sorts `drop/` by extension + name keywords, videos > 2 min to raw_footage (ffprobe), unknown to `drop/_unknown`, moves logged in `project.md`, stops on 2 audios / 2 scripts.
- transcribe: faster-whisper 1.2.1 large-v3 int8 CPU, Telugu, word timestamps -> `work/whisper.json`. Fixture `tests/fixtures/sample_30s/transcript.json` generated once.
- align: difflib script alignment -> `work/transcript.json` (script words, Whisper timing).
- contracts: `Scene`, `ScenePlan` (back-to-back, ids 1..n, max 4 words on screen, no visual type 3x in a row).
- plan: `work/plan_brief.md` for Claude + validation of `work/scenes.json`.
- storyboard: HTML + headless Chrome screenshot (Telugu-correct). Pillow dropped until Phase 2.
- `studio run NN`: ingest -> transcribe -> align -> plan -> storyboard, resumes via `run_stage`; exit 2 = waiting for user/Claude.

## 2026-11-07 · Phase 0 Foundation
- Project skeleton, git, docs.
- tools: uv venv (pydantic, pytest), HyperFrames 0.9.19 engine (isolated), cache redirection to E:.
- `studio.py`: `doctor`, `new`, `status`. `pipeline/project.py`: checkpoints, resume, atomic writes. `pipeline/contracts.py` v1.
- Tests: project layout, numbering, Telugu-safe names, stage skip/rerun/failure, hashing.
