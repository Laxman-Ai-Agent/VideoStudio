# Status

Updated 2026-11-10. Phases 0-5 done, plus paper style, transitions, kinetic text, UI cards, free asset sources,
per-video themes, quote template, timeline page (dashboard `/timeline.html`: live preview of the real templates, scene list, warnings, transport, Render button), visual-assets.json and the Visual Assets dashboard. History: `docs/CHANGELOG.md` and git log.

## Where we are
- 01 final 16:9 rendered (QA PASS, output/final_16x9.mp4). User wants 16:9 only: `--format 16:9`.
- `studio.cmd run 01` works end to end (720p previews 16:9 + 9:16, QA PASS). Tests: 96. Doctor: all green.
- 01 picked the `tech` theme automatically; its previews are still the older paper render (user asked not to render yet).
- 01 `visual-assets.json`: 24 assets (context written for all), 12 ready, 12 prompts to generate.
- Dashboard: `studio.cmd ui` -> http://127.0.0.1:8790 (8765 is taken by another app).

- Manual Visual Editing built 2026-11-08 (`edits.json`, Timeline Edit mode, tabbed panel, assets strip, scene stills, reference layout; see CHANGELOG). Covers overlay images / stamp / subject panel / depth props.
- Timeline pending (next session, in this order):
  1. Restart `studio.cmd ui` after every backend change (a stale server has no `/edits`, `/thumb` routes). Checked 2026-11-08: stills for all 11 scenes of 01, scene names from on_screen_text, scene 8 Edit panel in the new layout.
  2. Edit still missing: template text blocks (kinetic title etc.), main full-frame visual (Video chip is always 0), meme-slot people, text editing, Split tool.
  3. 9:16 hands-on check of Edit (math is fraction-based, only 16:9 tried); real mouse drag only tested with synthetic events.
  4. 01 `edits.json` is not created (test edit removed); 01 final 16:9 still not re-rendered (ask first).
- Dev notes: pane must be visible for the browser checks (hidden pane = 0 width, slow timers); `live` is a `const` (not on `window`).

- Project 02_test-01 (Mars colony / terraforming, 50 s, Gemini JSON as script): plan (15 scenes, theme space) + visual-assets.json (20 assets: 10 mains, 5 templates, 3 presenter reactions C1 in a white bomber jacket, 2 depth props) done; `run 02 --review` OK, storyboard written. 13 assets to generate (prompts in the dashboard); scenes 4 and 12 use free downloads (Wikimedia / Openverse, kept in `_library/downloads`) until their own files arrive. Not rendered yet.

- Project 07_Mars_Mission (Mars part 1, 77 s, `E:/Youtube/18-Mars Mission/audio/01.wav`): final 16:9 rendered 2026-11-09, QA PASS, with music. Fully done by Claude: transcript hand-aligned to the script (align fails when Whisper writes English words in Telugu letters: 44/171 matched), 16 images collected from Wikimedia Commons, no user uploads. Audio 02-10 of the same folder not done yet.

- Project 03 (Chandrayaan-3, 66 s): fully automatic 16:9 preview rendered, QA PASS (`projects/03/output/preview_16x9.mp4`). credits.txt now lists all 8 sources (fixed 2026-11-08). Flag emoji show as letters (US, RU ...) on this PC.

- Timing correction (2026-11-09): user gives audio + Gemini JSON -> `tools\.venv\Scripts\python.exe -m pipeline.align_mms audio json out` (MMS, no Whisper). Keep every word, fix timings only, deliver the finished JSON. Not wired into `studio run` yet; 07 video still uses the older Whisper timing (~0.5 s early).

- Kaggle add-on (2026-11-10, `kaggle/README.md`): CLI + token work. Model kernel `videostudio-whisper-model` (CPU) holds Whisper large-v3 (8 s download on Kaggle; uploading from this PC was ~2 MB/s, dropped). `kaggle
un.cmd NN` works: Whisper large-v3 on a Kaggle T4 -> `work/whisper.json` (07 audio: 121 s vs ~10 min local). User rule: never run Whisper locally any more; audio-only videos go through Kaggle. Next: Claude fixes the words into a Gemini-style JSON (English words in English, Telugu in Telugu, meaning fits), then `align_mms`. User has older Kaggle notebooks (`whisper-gpu-service-notebook`, `img-vide-notebook`), untouched.

- Project 08_Mars_Mission_02 (Mars part 2, 84 s, audio 02.wav): first audio-only run through Kaggle. `gemini_corrected.json` done (15 scenes, 171 words, Claude word fix from the script spelling + align_mms). Next: scene plan / render when the user asks. Audio 03-10 not done.

- Project 09_Image_Generation (2026-11-10, audio `E:/Youtube/14-Image Generation/audio/01.wav`, 33 s, part 1 of 11): Kaggle Whisper + script words (`script_part1.txt`) + align_mms -> transcript; 11 scenes; 6 main images by Z-Image on Kaggle (2 T4s, 8.5 min wall), 5 template cards; 720p 16:9 preview rendered in 148 s with 4 workers (2 scenes hit a Windows ERR_NETWORK_CHANGED, retried fine). QA: loudness -15.1 LUFS (just outside -14 +-1). Audio 02-11 not done.
- Creative direction (2026-11-10): every new video gets its own look. Claude writes the project `theme.json` (fonts, palette, background, `motion` text_in/camera/transitions, `direction`) at plan time from the brief's style memory; `studio.cmd theme NN` prints % alike the 3 previous videos (limit 30%); QA `identity` + `variety` warn on previews, fail finals. Captions ~45% smaller, no card, spoken word in a colour box (style per video); photo titles big in the calm part of the image (textzone.py); English-only highlight words in a per-video title_style (specimen-card look); 32 English display fonts now (19 added 2026-11-10). 09 re-rendered as the first example (ivory art-print look, Ponnala/Mandali, coral, mask words, push-in, dip/slide; 0% alike 02/03/07). Not yet: dramatic per-scene transitions used in a real video, 9:16 look of the small captions.
- Render defaults (2026-11-10): `studio run` renders 16:9 only (`--format 9:16|all` when the user asks) and uses 4 workers (07 preview: 2 workers 395 s, 4 -> 296 s, 6 -> 295 s).
- GPU plan (agreed 2026-11-10, all inside `kaggle/`, `tools/` unchanged): render today is ~7.5-8.5x video length on this laptop (07: 77 s -> 9.7 min final; a 10 min video ~1.5 h). Chrome/HTML render is CPU-bound (JS animation, frame capture), and Kaggle GPU sessions have only 4 vCPU (laptop: i5-1235U 10 cores, 16 GB, Iris Xe). Hybrid test DONE 2026-11-10 (07 scene 8, photo, 2.8 s, 1080p; `kaggle/hybrid_local.py` + `hybrid_run.py` + `kernels/hybrid`): local full Chrome render 36.2 s; hybrid = local Chrome text-only RGBA PNGs 18.5 s + T4 torch motion/composite + NVENC 2.9 s (throughput 84 s of video in 25 s); Kaggle overhead: 8.3 MB dataset 237 s (mostly Kaggle processing), kernel 97 s wall, PNG decode 17 s on 4 vCPU. Look matches (SSIM 0.98; first 0.25 s blur-in weaker on GPU). Verdict: not clearly faster end to end, the Chrome text frames are half the cost and stay local; do not build the full hybrid engine yet. Local text-only layer test DONE 2026-11-10 (07 scene 8, 84 frames, 1 worker): 720p full 22.3 s vs photo hidden 17-19 s; 1080p full 29.5 s vs 21.5-23 s, before any FFmpeg composite. Chrome cost is per frame (~0.1-0.2 s screenshot) + ~5 s init per scene, almost independent of the photo; HyperFrames' own static-frame dedup (on by default) kicks in once the Ken Burns tween is gone but saves 2.5 s and spends 2 s verifying. Net gain would be ~0-5% of a run (photo scenes only, CPU already saturated): NOT built. Bigger levers if speed matters: the ~5 s fixed cost per scene (several scenes per Chrome session) and the per-frame screenshot. Z-Image-Turbo test DONE 2026-11-10 (`kaggle\images.cmd`, see kaggle/README.md): 3 good images from 01 prompts, fp16 overflow fixed (`fp16_fix`): 2 T4s in parallel: ~20 s per image + ~5 min setup per run (50 images ~23 min). End to end DONE on 09 (below). Next if wanted: real use with `kaggle\images.cmd NN` into drop/. Later order: from visual-assets.json prompts, MMS align inside the Kaggle transcribe run, GPU cut-outs.

## Pending, user side
- Generate the 12 prompt-ready 01 assets (A023 + A024 reference sheets first, then A010, A014-A022); upload in the dashboard or drop `A012.png` in `drop/` + `studio.cmd assets 01`.
- Music in `_library/music/calm/` (and whoosh files in `_library/sfx/whoosh/` if wanted). Loose images / stock: ask Claude to use the asset-collector MCP (keyword web search removed from the pipeline 2026-11-09).
- The 4 local stock videos of 01 are only 832x464 (validation warns); larger ones look better in a final.

## Pending, our side
- [x] Style plan from `docs/STYLE.md` (steps 1-4) built 2026-11-08. Not used in a real video yet: plan the next video with `meme`, `hero` / `pill` lines, `rows`, outline / backdrop / depth placements, and re-render 01 when asked.
- [ ] Pro-level plan (agreed 2026-11-08, one phase per session, in this order):
  A. Alignment: DONE 2026-11-08 (layout zones, overlay avoidance, ink-centred boxes, caption spacing, logo grid, layout check in Timeline warnings). subject panel + stamp text done; 01 preview fixed; 01 final 16:9 not re-rendered yet (ask first).
  B. Visual grammar: beat type per scene -> format, rhythm rules, one art direction per video.
  C. Templates: logo wall, split-screen, meme/reaction, news card, process diagram, character + speech bubble, end card.
  D. Sound: music library + SFX (01 final has no music).
- [ ] Re-render 01 in the chosen theme once the user says so (~11 min, background).
- [ ] One small test render of the new theme presets (gradients, textures, fonts) before a real video.
- [ ] Not built yet (from the style references): logo watermark + CTA end card (needs the channel logo), duotone tint, several floating cut-outs per scene, dark glow style. Dashboard Settings page is a placeholder.

## Known issues / notes
- Layout check makes the first Timeline preview slow (~8 s per changed scene, 01: ~90 s once), then cached.
- Open sessions in `E:\VideoStudio`: its `.claude/settings.local.json` (local) turns off the ECC and Superpowers plugins here (verified: no edit gate, smaller start-up context).
- `marks` positions are fractions of the frame; the 9:16 crop needs its own `marks_v`.
- Auto-capture: some sites block headless Chrome (Wikipedia did). Drop your own `scene_NNN.png` when a capture is wrong.
- Map names are Natural Earth English names; pins need lat/lon. States only for IN, US, CN, BR, AU, CA, RU, ID, ZA.
- Raw-footage cutting is tested only on a generated clip; a 20 min 1080p video should take a few minutes.
- Gidugu (default font) looks ~20% smaller than Noto at the same size; scale text up if it reads small.
- First rembg cut-out takes ~2 min (model download + warm-up), cached afterwards.
- Caption pages split by word count; tune `CAPTION_WORDS` / `CAPTION_BREAK` in render.py if a page starts badly.
- Render speed: ~15-30 s per 720p scene clip (video scenes up to ~50 s with 2 workers); `--final` not timed (expect 2-3x).
- Scene 9 of 01 has no cited data, so it uses text, not a chart (charts need `params.bars` + `params.source`).
- Keyword matching (threshold 0.34) can pick loose files; prefer `params.entity` for named people / brands.
- Whisper large-v3 is ~8x real time here (20 min audio ~2.5 h, cached once). small/turbo cannot anchor Telugu.
- Hugging Face host sometimes does not resolve from Python; set `HF_HUB_OFFLINE=1` (large-v3 is cached).
- Free RAM can be low (~1.6 GB seen); render now drops to 1 worker by itself (slower, not a crash). Biggest users seen: Chrome tabs (~2.2 GB), Claude, ChatGPT app, VS Code.
- `projects/01_AI_Agents` uses the 30 s sample audio; the full script is at `E:\Youtube\13-AI agents\ai agents content.txt`.
