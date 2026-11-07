# VideoStudio: audio narration -> documentary-style video

Talk to the user in Telugu (technical terms in English). Docs and code stay in English (cheaper for the usage limit).

## Read first, every session
1. `docs/STATUS.md`: current phase, what is done, what is next, known issues.
2. `docs/ARCHITECTURE.md`: design and the rules below in detail.
3. Before adding any library: `docs/LIBRARIES.md`. Before re-arguing a choice: `docs/DECISIONS.md`.

## Hard rules
- Modules talk only through files. Shapes live in `tools/pipeline/contracts.py`. Changing a field's meaning means bumping `SCHEMA_VERSION` and adding a converter.
- One library per responsibility. Every addition gets registered in `docs/LIBRARIES.md` (version, license, owner module, why).
- Pin exact versions (`uv.lock`, `package-lock.json`). Upgrade one library at a time, then run the tests.
- Every bug fix gets a test. Every finished step gets a git commit. Update `docs/STATUS.md` and `docs/CHANGELOG.md`.
- Never modify the user's media. `drop/` files are moved (and logged), never edited or deleted.
- Re-render only what changed (scene cache keyed by content hash). Never full re-renders for a small fix.
- Tests reuse cached fixtures (e.g. `tools/tests/fixtures/sample_30s/transcript.json`). Never re-run Whisper just to test.

## Commands (run from `E:\VideoStudio`)
- `studio.cmd doctor`: pre-flight checks
- `studio.cmd new "Name"`: new project in `projects/`
- `studio.cmd status 01`: stage checkpoints
- `studio.cmd theme 01 [--preset NAME | --auto]`: show / pin / re-pick the video's visual theme (no render)
- `studio.cmd ui`: Visual Assets dashboard (http://127.0.0.1:8790): see assets, copy / edit prompts, upload / replace files
- `studio.cmd assets 01`: after dropping generated files named by asset id (A012.png) into drop/: match, process, validate, update visual-assets.json (no render)
- New video: after scenes.json the run stops once more; read `work/assets_brief.md` and write `visual-assets.json` (every asset, exact prompts)
- `studio.cmd run 01`: all stages, resumes; exit 2 = waiting (plan, asset descriptions)
- `studio.cmd run 01 --final`: full-resolution render (default is a 720p preview); `--workers N` (default 2)
- `tools\.venv\Scripts\python.exe -m pytest tools -q`: tests
