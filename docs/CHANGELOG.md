# Changelog

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
