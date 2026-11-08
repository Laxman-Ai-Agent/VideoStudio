# Changelog

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
