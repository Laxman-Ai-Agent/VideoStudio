# Changelog

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
