# Architecture

Goal: long-term stability. Adding a feature must never break or force a rebuild of a working one.

## Core principle
Every module is a box that reads files and writes files. Boxes never import each other's logic.
As long as a box's contract (input/output file shapes) holds, its inside can change freely.

## Pipeline
```
drop/ -> 1 ingest -> 2 transcribe (+align) -> 3 plan -> 4 resolve -> 5 prompts -> 6 storyboard -> [GATE: user approves]
      -> 7 prepare -> 8 render (per scene, per format) -> 9 assemble -> 10 qa -> output/{preview|final}_{16x9|9x16}.mp4
```

| Stage | Reads | Writes | Job |
|---|---|---|---|
| ingest | `drop/*` | `input/`, `assets/**`, log in `project.md` | sort dropped files by type (move, never edit) |
| transcribe | `input/audio.*` | `work/whisper.json` | faster-whisper large-v3 int8 CPU, word timings (slow, so its own stage) |
| align | `work/whisper.json`, optional `input/script.*` | `work/transcript.json` | difflib: script words win, Whisper gives timing. No script = copy |
| plan | transcript, `_brand/brand.json`, skill rules | `work/plan_brief.md` -> `work/scenes.json` | brief for Claude; Claude writes scenes.json in-session; `ScenePlan` validates it (run exits 2 until it exists) |
| index | `assets/**`, `_library/**` | `assets/index.json`, `_library/index.json`, `.thumbs/contact_sheet.png` | hash-keyed descriptions; Claude describes new files from one contact sheet (exit 2) |
| resolve | scenes, asset indexes | `work/resolved.json`, `output/credits.txt` | pick a file per scene: project assets, then `_library`, then internet, then missing |
| prompts | resolved (missing) | `prompts/{images,videos}/scene_NNN.md`, `prompts/README.md` | generation prompts with an exact "save as" name |
| storyboard | scenes (resolved from Phase 2) | `work/storyboard.html`, `work/storyboard.png` | text-only sheet for approval, HTML screenshotted by headless Chrome |
| prepare | resolved | `work/prepared/*` | crops, cut-outs, fake parallax layers |
| render | scenes, resolved, brand, `tools/templates/*` | `work/scenes/<16x9|9x16>[_final]/scene_NNN.mp4` + `.key`, `report.json` | one HyperFrames clip per scene per format, exact frame count, cached by key = scene JSON + asset hash + template (version + files) + brand + size. 720p preview by default, `--final` = full size. Failures -> `missing` tile + report, retried next run. `--workers` (default 2) |
| assemble | clips, narration (music/sfx in Phase 4) | `output/{preview|final}_{16x9|9x16}.mp4` | FFmpeg concat (re-encoded once) + narration, two-pass loudnorm -14 LUFS / -1.5 dBTP, length = last scene end. Credits: `output/credits.txt` is written by resolve |
| qa | assembled | `work/qa.json`, `output/*` | loudness (-14 LUFS), black frames, sync, final export |

## Orchestration and checkpoints
- `tools/studio.py` is the only orchestrator. No Airflow/Celery/DB/server.
- `run_stage()` (`tools/pipeline/project.py`) skips a stage when it already succeeded on identical inputs and its outputs still exist. A failure is recorded in `work/state.json` and the traceback goes to `work/logs/<stage>.log`.
- Writes are atomic (temp file + rename).
- Per-scene isolation: one failing scene gets a placeholder and a report. The other scenes still render.

## Contracts
- Source of truth: `tools/pipeline/contracts.py` (pydantic). Every JSON has a `schema_version`.
- Adding an optional field is safe. Removing/renaming a field or changing its meaning means bumping the version and adding a converter.

## Render engines
- Templates: `photo` (Ken Burns, blurred backdrop when the aspect doesn't fit), `video_clip` (FFmpeg trims/loops + cover-fits first, then push-in), `headline` (kinetic 1-4 words), `chart` (bars / count-up from `scene.params`, decorative without data), `missing` (scene number tile, also used for failures).
- Template choice (`render.pick_template`): resolved `template` -> chart for chart scenes, else headline; missing -> missing; video file -> video_clip; image -> photo.
- Safe areas (`_shared/studio.js`): 16:9 6% sides / 8% top+bottom; 9:16 7% sides, 14% top, 22% bottom (Shorts UI). Sizes are in `--u` = 1% of the short side, so preview and final look the same.
- Each scene renders in its own build folder (`.build/scene_NNN`, kept only on failure) with GSAP copied from the HyperFrames package (no CDN).
- Each template declares `"engine": "hyperframes" | "remotion"` in its `template.json`.
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
  prompts/     images/, videos/, README.md
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
