# Architecture

Goal: long-term stability. Adding a feature must never break or force a rebuild of a working one.

## Core principle
Every module is a box that reads files and writes files. Boxes never import each other's logic.
As long as a box's contract (input/output file shapes) holds, its inside can change freely.

## Pipeline
```
drop/ -> 1 ingest -> 2 transcribe (+align) -> 3 plan -> theme -> visual assets (Claude) -> 4 resolve -> 5 visual assets sync -> 6 storyboard -> [GATE: user approves]
      -> 7 prepare -> 8 render (per scene, per format) -> 9 assemble -> 10 qa -> output/{preview|final}_{16x9|9x16}.mp4
```

| Stage | Reads | Writes | Job |
|---|---|---|---|
| ingest | `drop/*` | `input/`, `assets/**`, log in `project.md` | sort dropped files by type (move, never edit) |
| transcribe | `input/audio.*` | `work/whisper.json` | faster-whisper large-v3 int8 CPU, word timings (slow, so its own stage) |
| align | `work/whisper.json`, optional `input/script.*` | `work/transcript.json` | difflib: script words win, Whisper gives timing. No script = copy |
| plan | transcript, `_brand/brand.json`, skill rules | `work/plan_brief.md` -> `work/scenes.json` | brief for Claude; Claude writes scenes.json in-session; `ScenePlan` validates it (run exits 2 until it exists) |
| capture | scenes (`visual_type: screenshot` + `params.url`) | `assets/screenshots/scene_NNN.png`, `work/captures.json` | headless Chrome page capture (1280x2000 at 1.5x); never overwrites a file the user dropped; failure = normal resolve |
| shots | `assets/raw_footage/*` (videos > 2 min) | `assets/shots/<stem>_NNN.mp4` | FFmpeg scene-change detect (score 0.3, on a 320 px copy), shots < 1.5 s merged, > 20 s split, re-encoded without audio. Originals are not indexed; their shots are |
| index | `assets/**` (minus `raw_footage/`), `_library/**` | `assets/index.json`, `_library/index.json`, `.thumbs/contact_sheet.png` | hash-keyed descriptions; Claude describes new files from one contact sheet of max 20 tiles per run (exit 2) |
| resolve | scenes, asset indexes | `work/resolved.json`, `output/credits.txt` | pick a file per scene: project assets, then `_library`, then internet, then missing |
| visual assets | scenes, transcript, theme, asset index, resolved, uploads `assets/generated/A012*` | `visual-assets.json` (project folder), `work/assets_brief.md`, `assets/processed/<id>.<ext>` | one JSON per video with every visual it needs: category, scenes + timestamps, role (main / overlay / reference), method (online, real_logo, ai_generate, capture, template, local), ready-to-paste prompt, output size/format/transparency, processing, status, final file, credits, validation. Claude writes it in-session from the brief (run exits 2 until it exists); `visual.sync` runs before resolve (uploads by id, online collection with resolve's providers, processing, validation) and after it (links what resolve found, adds a fallback entry for an uncovered missing scene, summary) |
| storyboard | scenes (resolved from Phase 2) | `work/storyboard.html`, `work/storyboard.png` | text-only sheet for approval, HTML screenshotted by headless Chrome |
| theme | transcript, scenes, script, project `theme.json`, `tools/themes/*.json` | `work/theme.json` | one visual identity per video: typography (heading/body/script fonts, weights, tracking, scale, shadow, outline), palette (background, text, text2, accent, highlight, warning, panel, caption pill), background (solid/linear/radial/multi, grid/dots/lines pattern, grain/paper/smoke/particles/stars texture). Auto from keywords (English + Telugu) or pinned in project `theme.json`; validated (colours, WCAG contrast, fonts) with fallbacks listed in `issues` |
| prepare | scenes, resolved | `work/prepared/prepared.json`, `scene_NNN_{fg,bg}.png` | rembg cut-out (CPU, model in `tools/models/rembg`) for scenes with `params.parallax: true`: fg = subject with alpha, bg = photo with the subject area blurred. Failure or no clear subject = plain photo |
| render | scenes, resolved, brand, `tools/templates/*` | `work/scenes/<16x9|9x16>[_final]/scene_NNN.mp4` + `.key`, `report.json` | one HyperFrames clip per scene per format, exact frame count, cached by key = scene JSON + asset hash + template (version + files) + brand + size. 720p preview by default, `--final` = full size. Failures -> `missing` tile + report, retried next run. `--workers` (default 2) |
| assemble | clips, narration, `_library/music/<brand.music_mood>/` (first file), `_library/sfx/{whoosh,click}/` | `work/assembled/{preview|final}_{16x9|9x16}.mp4` | FFmpeg concat (re-encoded once) + narration + music (18 LU under the narration, sidechain-ducked, faded) + SFX (whoosh before cuts into headline/chart, `params.sfx` overrides), two-pass loudnorm of the mix -14 LUFS / -1.5 dBTP, length = last scene end. No music/sfx files = narration only. Credits: `output/credits.txt` is written by resolve |
| qa | assembled, narration, clips, render reports | `work/qa.json`, `output/*` | loudness -14 ±1 LUFS, true peak <= -1 dBTP, blackdetect >= 1 s, freezedetect >= 5 s, length vs narration ±0.1 s, all clips present, placeholder tiles (warn in preview, fail in final). Previews always exported; `--final` exports only files that passed (exit 1 otherwise) |

## Orchestration and checkpoints
- `tools/studio.py` is the only orchestrator. No Airflow/Celery/DB/server.
- `run_stage()` (`tools/pipeline/project.py`) skips a stage when it already succeeded on identical inputs and its outputs still exist. A failure is recorded in `work/state.json` and the traceback goes to `work/logs/<stage>.log`.
- Writes are atomic (temp file + rename).
- Per-scene isolation: one failing scene gets a placeholder and a report. The other scenes still render.

## Contracts
- Source of truth: `tools/pipeline/contracts.py` (pydantic). Every JSON has a `schema_version`.
- Adding an optional field is safe. Removing/renaming a field or changing its meaning means bumping the version and adding a converter.

## Visual assets (visual-assets.json)
- One file per project, `projects/NN/visual-assets.json` (contract `VisualAssets`). Dashboard-ready: `summary` has total, by_category, by_status, by_method, found, missing, to_generate, failed; every asset has its prompt, status, final `file`, processing log and validation checks.
- Claude lists the assets from `work/assets_brief.md` (whole script, scenes, theme, local files, prompt rules): no fixed number, one `main` per scene plus any `overlay`s; `characters` keep faces/designs identical across prompts (description repeated word for word, reference sheets with role `reference`). Logos are never AI-generated (`sync` switches them to `real_logo`).
- Upload: save the generated file as its id (`A012.png`, `A012_v2.png`) in `drop/`; ingest moves it to `assets/generated/`; `studio.cmd assets NN` (or the next run) matches it, processes it (crop / extract from a composite, rembg background removal, trim, Lanczos resize, format) into `assets/processed/` and validates it (size, transparency, aspect, video length). Finished assets are never redone; an online search runs once per asset.
- Render: validated `main` files win in resolve; validated `overlay` images are drawn by `_shared/studio.js` on top of their scenes (position in the safe area above the captions, size = fraction of the safe-area height, pop / slide / float / fade, optional `until`). Overlays are part of the scene cache key.
- `assets/generated` and `assets/processed` are not in the asset index (the JSON describes them).

## Visual Assets dashboard (ui/)
- `ui/backend/` (Python standard library `http.server`, localhost only) + `ui/frontend/` (plain HTML/CSS/JS modules, no build, no npm). Start: `studio.cmd ui` (default http://127.0.0.1:8790, next free port if busy).
- No second database: `service.py` reads the project's `visual-assets.json` on every request, changes only the asked asset id and saves through `pipeline.visual` (atomic). Found / missing comes from the files on disk.
- API: list projects, one project's assets, one asset, `PUT .../prompt`, `POST .../upload` (raw body + `X-Filename`, `?replace=1`), `/files/<pid>/<path>` previews (path-checked, Range for video).
- Detail view: narration (from the transcript), context (Claude), scene; framing / trim (`AssetMedia`) re-process from the original upload; Replace keeps the current file until the candidate (`assets/generated/pending/`, preview in `assets/processed/pending/`) is confirmed and validated; every change goes to the asset's `history`.
- Uploads: png / jpg / jpeg / webp (50 MB), mp4 / mov / webm (1 GB) -> `assets/generated/<ID>_<time>.<ext>` (never overwritten); then `visual.sync` processes and validates exactly like `studio.cmd assets`. An asset that already has a file is only replaced with `?replace=1` (Replace button + confirm).

## Per-video theme
- Presets in `tools/themes/<name>.json` (tech, history, horror, war, education, documentary, space, health, finance, paper, dark). Add a preset = add a file with `keywords`.
- `studio.cmd theme NN` shows the pick; `--preset NAME` pins one (writes the project `theme.json`); `--auto` goes back to the automatic pick. Overrides in the project `theme.json`: `colors`, `fonts`, `background`, `text`.
- Render passes the theme to every scene (`scene.style`, colours, fonts; part of the cache key). `_shared/studio.js|css` turn it into CSS variables, the background gradient, the template grid pattern, the texture layer and heading/body/script typography, so templates need no theme code. Motion textures (smoke, particles, stars) are never drawn over real photos or footage. `params.bg_level` (0..1) tones a scene down.
- No `work/theme.json` (old projects, tests): `theme.from_brand` = the brand.json look as before. The theme controls only text, fonts, panels and backgrounds; layouts, motion, transitions and audio are untouched.

## Render engines
- Templates: `photo` (Ken Burns, blurred backdrop when the aspect doesn't fit), `photo_parallax` (cut-out fg moves faster than bg; opt-in `params.parallax`), `video_clip` (FFmpeg trims/loops + cover-fits first, then push-in), `headline` (kinetic 1-4 words), `chart` (bars / count-up from `scene.params`, decorative without data), `timeline` (`params.events`), `map` (offline Natural Earth outlines, `params.focus` / `pin` / `from`), `screenshot` (browser frame, scroll, `params.highlight` zoom), `quote` (quote mark, word-by-word reveal, `params.quote` {text, by, role}; real quotes only), `missing` (scene number tile, also used for failures). Extra `*.js` files in a template folder (e.g. `map/map.js` data) are copied into the build.
- Template choice (`render.pick_template`): resolved `template` -> chart for chart scenes, timeline when `params.events`, map for map scenes with `params.focus`/`pin`, else headline; missing -> missing; video file -> video_clip; image -> screenshot for screenshot scenes, else photo (-> photo_parallax when prepare made a cut-out).
- Captions (`brand.json "captions": true`): words of `work/transcript.json` whose midpoint is in the scene, in pages of max 4 words (3 in 9:16), new page on a pause > 0.5 s or a sentence end. Passed in `scene.captions`; drawn by `_shared/studio.js` (HyperFrames) and `engines/remotion/src/studio.jsx` (Remotion) at the bottom of the safe area, spoken word in the accent colour. Lower thirds move above them. Part of the scene cache key.
- Safe areas (`_shared/studio.js`): 16:9 6% sides / 8% top+bottom; 9:16 7% sides, 14% top, 22% bottom (Shorts UI). Sizes are in `--u` = 1% of the short side, so preview and final look the same.
- Each scene renders in its own build folder (`.build/scene_NNN`, kept only on failure) with GSAP copied from the HyperFrames package (no CDN).
- Each template declares `"engine": "hyperframes" | "remotion"` in its `template.json`. HyperFrames reads `index.html` + `scene.js`; Remotion reads `Composition.jsx` + `scene.json` (`node tools/engines/remotion/render.mjs <build> <out> <preview|final> <chrome>`, bundle cached per template hash in `.bundles/`, system Chrome). A template may ship both files; flipping the field switches engines.
- Engines live isolated in `tools/engines/<name>/`, each with its own `package.json` and lockfile, so they never share dependencies.
- Engine contract: scene JSON + template in, one MP4 (same size/fps) out. Assemble doesn't care which engine made a clip.
- Default is HyperFrames. Remotion is used only for templates where it measurably looks better (decided by test render, recorded in DECISIONS.md).

## Extension points (add, don't modify)
| New thing | How |
|---|---|
| scene/animation type | new `tools/templates/<name>/` (`template.json` = `TemplateSpec`, `index.html` with `{{W}} {{H}} {{DUR}} {{ASSET}}`, reads `window.SCENE`, uses `_shared/studio.js|css`) + a line in `render.pick_template` |
| asset source | new provider module with `search(need) -> candidates` |
| transcription engine / GPU parallax / vision check | an option inside the owning module only |
| new stage | new module + one line in the studio stage list |
| web UI | a layer that calls `studio.py`. The core is untouched |
Experimental features ship behind a config flag, default off.

## Asset search order
project `assets/` -> `_library/` (+ `_library/downloads` cache) -> Wikimedia / Pexels -> missing (write prompt).
Each asset is analysed once and its description is cached in `index.json`, keyed by file hash.

## Caches (C: is nearly full)
All caches are redirected to `E:\VideoStudio\tools\.cache` and `tools\models` via env vars set in `tools/pipeline/config.py` (HF_HOME, uv, pip, npm, HyperFrames cache/extract/fonts, TEMP). `studio doctor` verifies this.

## Project layout
```
projects/NN_Name/
  drop/        user puts everything here (mixed)
  input/       audio, optional script/json (sorted by ingest)
  assets/      images, videos, screenshots, logos, raw_footage, index.json
  visual-assets.json   every visual the video needs, prompts, statuses (one file)
  work/        state.json, whisper.json, transcript.json, plan_brief.md, scenes.json, storyboard.png, scenes/<format>/, logs/
  output/      preview_16x9.mp4, preview_9x16.mp4, final_16x9.mp4, final_9x16.mp4, thumbnail.jpg, description.txt, credits.txt
  project.md   human log
```

## Testing
1. Unit tests for pure logic (sorting, alignment, cache keys).
2. Contract tests: every module output validates against its schema.
3. Template tests: render one frame and compare to the golden `preview.png`.
4. Smoke test: `tests/fixtures/sample_30s` end to end at low resolution, before upgrades and at phase ends.
Fixtures are cached. Whisper output for the sample is generated once and reused.

## Phases
0 Foundation, 1 Audio->Plan, 2 Assets, 3 Render v1 (HyperFrames), 4 Polish + Remotion, 5 Extras. See STATUS.md.
