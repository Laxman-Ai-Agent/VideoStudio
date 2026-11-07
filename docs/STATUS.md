# Status

Current phase: **5 Extras, done (2026-11-07)**. Next: not planned yet (ideas: multi-logo template, per-project music choice, Inter font, more Remotion templates).

## Phase 0: Foundation ✅
- [x] Folder structure (`_brand`, `_library`, `tools`, `projects`, `docs`, `.claude/skills`)
- [x] Git repo + .gitignore (no media)
- [x] Python 3.12 venv via uv (pydantic, pytest), locked
- [x] HyperFrames 0.9.19 isolated in `tools/engines/hyperframes`, `npx hyperframes doctor` ok (uses system Chrome)
- [x] Caches redirected to E: (`tools/pipeline/config.py`)
- [x] `studio doctor | new | status`, checkpoint/resume core (`run_stage`), atomic writes
- [x] Contracts v1: ProjectState, StageRecord, Transcript, Word
- [x] Tests: 4 passing
- [x] Docs: ARCHITECTURE, LIBRARIES, DECISIONS, STATUS, CHANGELOG
- [x] Sample fixture: `tools/tests/fixtures/sample_30s/audio.wav` (30.5 s, Telugu narration, git-ignored)
- [x] First project: `projects/01_AI_Agents`

## Phase 1: Audio -> Plan ✅
- [x] `_brand/brand.json` + `Brand` contract: formats 16:9 and 9:16 (one plan, rendered per format), #0E0E10 / #FFC400 / #FFFFFF, Noto Sans Telugu + Inter
- [x] ingest: sorts `drop/` (audio, script .txt/.md/*gemini*.json, images by keyword, videos > 2 min -> raw_footage), `_unknown`, log in `project.md`, stops on 2 audios / 2 scripts
- [x] transcribe: faster-whisper large-v3 int8 CPU -> `work/whisper.json`, coverage check + 3 retries. Fixture `fixtures/sample_30s/transcript.json` cached (64 words)
- [x] align (difflib): script / Gemini words win, Whisper timing, interpolated words `matched=false`, fails on > 8 s without a matched word
- [x] Scene contract (`ScenePlan`) + plan stage (`work/plan_brief.md` -> Claude writes `work/scenes.json` -> validated)
- [x] storyboard: `work/storyboard.html` + `.png` (headless Chrome, correct Telugu)
- [x] `studio.cmd run NN` wires all stages through `run_stage`, resumes; exit 2 = waiting for user/Claude
- [x] Tests: 32 passing. End to end on `projects/01_AI_Agents` (sample audio + full script): 11 scenes, storyboard ok

## Phase 2: Assets ✅
- [x] Contracts: `AssetEntry`, `AssetIndex` (keyed by content hash), `ResolvedScene`, `Resolved`
- [x] index / library_index stages: `assets/index.json`, `_library/index.json` (ffprobe size/duration, first-frame thumbs in `.thumbs/`). New files -> ONE contact sheet `.thumbs/contact_sheet.png`, Claude fills `description`, run exits 2 until done. Unchanged files are not re-read (path+size+mtime); renamed files keep their description (hash)
- [x] resolve: `scenes.json asset` / `scene_NNN.*` -> project -> `_library` -> template types (motion_graphic, diagram, chart, text, map) -> Pexels/Wikimedia -> missing. `work/resolved.json` + `output/credits.txt`. Downloads in `_library/downloads` with source/license/author
- [x] prompts: `prompts/{images,videos}/scene_NNN.md` + `prompts/README.md`; dropped `scene_NNN.png|mp4` (and `scene_NNN_v.*` for 9:16) map straight to the scene
- [x] storyboard: thumbnail per scene, or MISSING / TEMPLATE tile
- [x] Tests: 37 passing. On 01 (15 test files copied from `E:\Youtube\13-AI agents\videos\01\`): 5 project, 5 template, 1 missing (scene 10 prompt); drop-back of `scene_010.png` verified

## Phase 3: Render v1 ✅
- [x] Templates `photo`, `video_clip`, `headline`, `chart`, `missing` (+ `_shared`): brand colours/fonts, safe areas 16:9 + 9:16, GSAP from HyperFrames
- [x] render: per scene per format, exact frames, cache key (scene + asset hash + template + brand + size), failure -> tile + `report.json`, 2 workers
- [x] assemble: concat + narration, two-pass loudnorm -> `output/preview_{16x9,9x16}.mp4` (720p) or `final_*` with `--final`
- [x] Tests: 40 passing (fake engine: cache, single-scene re-render, isolation, exact frames; assemble sync)
- [x] On 01: 22 clips in 5 min (2 workers, 720p); both previews 915 frames = 30.5 s, -14.3 LUFS, peak -1.4 dB. Editing scene 11 re-rendered only scene 11 (13 s per format)

## Phase 4: Polish + Remotion ✅
- [x] Captions: word-by-word overlay from `work/transcript.json` (script words + Whisper timing), Noto Sans Telugu + Inter, brand colours, bottom of the safe area per format, `"captions": true` in brand.json
- [x] Audio polish in assemble: music from `_library/music/<music_mood>/` (sidechain-ducked), whoosh/click SFX from `_library/sfx/`, loudnorm on the mix. Missing folders = narration only
- [x] prepare stage + `photo_parallax`: rembg `silueta` cut-out on CPU (model in `tools/models/rembg`), opt-in `params.parallax`, falls back to `photo`
- [x] qa stage -> `work/qa.json` (loudness, true peak, black, freeze, sync ±0.1 s, clips, placeholders). Previews always exported, `--final` only on pass
- [x] Remotion 4.0.541 isolated in `tools/engines/remotion`; `headline` ported and switched to `"engine": "remotion"` (DECISIONS #24)
- [x] Tests: 45 passing. Doctor all green
- [x] On 01: 22 clips in ~11 min (2 workers, 720p, captions changed every key), scene 3 parallax, headline scenes 1/5/8/11 by Remotion, rest HyperFrames, mixed video assembled. QA PASS both formats: -14.4 LUFS, -1.4 dBTP, 30.50 s vs 30.49 s narration, no black/freeze, warn: scene 10 still MISSING

## Phase 5: Extras ✅
- [x] Raw footage: videos > 2 min cut into shots (FFmpeg scene detect) in `assets/shots/`, described from the contact sheet (max 20 per run) and matched like clips
- [x] Screenshots: `screenshot` template (browser frame, scroll for tall pages, `highlight` zoom) + automatic capture of `params.url`
- [x] Timeline template (`params.events`, horizontal 16:9 / vertical 9:16)
- [x] Map template: offline Natural Earth outlines with India's official borders + states (incl. Telangana/AP), fly-in, focus fill, pins with Telugu labels
- [x] Tests: 50 passing. Doctor all green. Each template checked by one test render (16:9 + 9:16). 01 unchanged (all cached), QA PASS

## Paper style ✅ (2026-11-07)
- [x] Themes in brand.json (paper default, dark kept), grain, photo looks, hand-drawn marks + sticker tag + highlighter, `cutout_title` poster, generated SFX. Tests: 52 passing. Checked by one test sheet (4 scenes x 2 formats)

## Transitions + kinetic text + UI cards ✅ (2026-11-07)
- [x] Per-cut transitions, `kinetic` and `cards` templates, script font role. Tests: 54 passing. Checked by one test sheet; the stat card arrow/line bug found there is fixed
- [x] 01 scenes.json updated to use them

## Free asset sources ✅ (2026-11-07, saved mid-work: user hit the usage limit)
- [x] `params.entity` (exact person / brand): Wikidata photo (P18) or logo (P154) from Commons, Simple Icons fallback for logos (rendered to a transparent PNG card). Openverse (no key) added to keyword search. `params.lottie` = emoji -> Google animated Noto emoji (CC BY 4.0) in `_library/lottie`, or a project .json; new `lottie` template (lottie-web 5.13.0 vendored, MIT). Photo template: logo scenes shown whole on the themed background
- [x] Live-checked: Sam Altman photo (CC BY 2.0), Anthropic + Claude logos (public domain), rocket Lottie; credits filled. Tests 54 passing
- [ ] Not done yet: look at the last test sheet (`tools/.cache/p8/sheet.png`) for the new logo layout; add unit tests for entity/lottie resolve; LIBRARIES.md rows (lottie-web, Openverse, Wikidata, Simple Icons, Noto animation), DECISIONS entry, CHANGELOG; plan brief line for `entity` / `lottie`
- Footage still needs the free `PEXELS_API_KEY` in `tools/.env` (Openverse / Wikimedia have photos only)

## Known issues / notes
- Still open from the style references: brand logo watermark + CTA end card (needs the channel logo file), duotone tint and several floating cut-out objects in one scene, dark cinematic glow style.
- `marks` positions are fractions of the frame, so the 9:16 crop needs its own `marks_v`.
- Auto-capture: some sites block headless Chrome (Wikipedia returned its block page). Check captured screenshots in the storyboard; drop your own `scene_NNN.png` in `assets/screenshots/` when a capture is wrong (a dropped file is never overwritten).
- Map names are Natural Earth English names (`"Telangana"`, `"India"`); pins need lat/lon in scenes.json (no geocoder). States exist only for IN, US, CN, BR, AU, CA, RU, ID, ZA.
- Raw-footage cutting is untested on real long footage (tested on a generated 3-shot clip); a 20 min 1080p video should take a few minutes on this CPU.
- `_library/music/*` and `_library/sfx/*` are empty, so 01 has no music/SFX yet (code tested with generated tones). Drop royalty-free tracks in `_library/music/calm/` (or change `music_mood`) and whoosh files in `_library/sfx/whoosh/`; the next run re-assembles only (no re-render).
- Default font is now Gidugu (`_brand/fonts`, DECISIONS #30). Gidugu is smaller and lighter than Noto at the same size, so text looks ~20% smaller; scale sizes up if it reads small. The 01 previews are not re-rendered with it yet.
- The first rembg cut-out took ~2 min (model download + numba warm-up); the prepare stage caches it afterwards.
- Caption pages split by word count, so a page can start with a suffix word (e.g. "ని చూసాం."). Tune `CAPTION_WORDS` / `CAPTION_BREAK` in render.py if it reads badly.
- Render speed here: ~15-30 s per 720p scene clip, video scenes up to ~50 s when two run at once. Full-size `--final` not timed yet (expect ~2-3x).
- Scene 3 ("Chatbots") resolved to a Grok-only logo; the multi-logo idea needs a new template (not in Phase 4). Scene 9 chart has no cited data, so it shows decorative bars only (add `params.bars` + `params.source` to scenes.json).
- An edit that doesn't change pixels (e.g. `notes`) re-renders the scene but assemble stays cached (same clip bytes).
- No `PEXELS_API_KEY` yet (`tools/.env`), so internet search is Wikimedia only. Wikimedia rarely fits generic stock scenes; the first live run picked off-topic files at a 2-keyword match, so internet results now need half the query keywords (DECISIONS #16).
- Matching is keyword overlap on English descriptions (threshold 0.34). Multi-item scenes (e.g. "ChatGPT, Gemini and Grok logos") get one asset; Phase 3 templates can combine more.
- Only ~1.6 GB RAM was free during the HyperFrames doctor check. Close heavy apps before long renders.
- The user also has `E:\Youtube\13-AI agents\ai agents content.txt` (likely the full script) and a hand-edited version of that video. Both are useful for script-alignment tests and style reference.
- Whisper large-v3 is slow here: ~4-12 min per 30 s clip (8x+ real time; a 20 min video is ~2.5 h+, unattended, cached once). small/turbo can't anchor Telugu (DECISIONS #14). Idea: retry per VAD chunk instead of the whole file.
- Python can't resolve the Hugging Face CDN host on this network at times (curl works). Only large-v3 is cached; set `HF_HUB_OFFLINE=1` to skip the network check.
- `projects/01_AI_Agents` uses the 30 s sample as `input/audio.wav` (testing).
