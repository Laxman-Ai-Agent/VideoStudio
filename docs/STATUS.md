# Status

Current phase: **0 Foundation, done (2026-11-07)**. Next: **Phase 1, Audio -> Plan**.

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

## Phase 1: Audio -> Plan (next)
- [ ] ingest: sort `drop/` into input/assets, log moves, `_unknown` for unclear files
- [ ] transcribe: faster-whisper large-v3 int8 (CPU). Run ONCE on the sample and cache `fixtures/sample_30s/transcript.json` for all later tests
- [ ] script alignment (difflib) when `input/script.*` exists
- [ ] Scene contract + plan stage (Claude writes `scenes.json`, validated)
- [ ] text-only storyboard
- [ ] `studio run` wiring stages through `run_stage`

## Known issues / notes
- Only ~1.6 GB RAM was free during the HyperFrames doctor check. Close heavy apps before long renders.
- `_brand/brand.json` isn't created yet. Ask the user for fonts/colours/format at the start of Phase 1.
- The user also has `E:\Youtube\13-AI agents\ai agents content.txt` (likely the full script) and a hand-edited version of that video. Both are useful for script-alignment tests and style reference.
