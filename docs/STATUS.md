# Status

Current phase: **1 Audio -> Plan, done (2026-11-07)**. Next: **Phase 2, Assets**.

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

## Phase 2: Assets (next)
- [ ] resolve stage: project assets -> `_library` -> Wikimedia/Pexels -> missing
- [ ] prompts stage for missing assets
- [ ] storyboard with thumbnails
- Test assets (user-approved): COPY (never move/modify) the media of the old hand-edited video, `E:\Youtube-AI agentsideos\` (mp4 clips + png images for the first audio segment), into `projects/01_AI_Agents/drop/`.
- Testing only proves the pipeline works: no extra benchmarks, minimal waiting, smallest check per stage (user: "idi testing purpose kabbati time waste cheyoddu").

## Known issues / notes
- Only ~1.6 GB RAM was free during the HyperFrames doctor check. Close heavy apps before long renders.
- The user also has `E:\Youtube\13-AI agents\ai agents content.txt` (likely the full script) and a hand-edited version of that video. Both are useful for script-alignment tests and style reference.
- Whisper large-v3 is slow here: ~4-12 min per 30 s clip (8x+ real time; a 20 min video is ~2.5 h+, unattended, cached once). small/turbo can't anchor Telugu (DECISIONS #14). Idea: retry per VAD chunk instead of the whole file.
- Python can't resolve the Hugging Face CDN host on this network at times (curl works). Only large-v3 is cached; set `HF_HUB_OFFLINE=1` to skip the network check.
- `projects/01_AI_Agents` uses the 30 s sample as `input/audio.wav` (testing).
