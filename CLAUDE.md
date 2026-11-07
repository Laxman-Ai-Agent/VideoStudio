# VideoStudio: audio narration -> documentary-style video

Talk to the user in Telugu (technical terms in English). Docs and code stay in English (cheaper for the usage limit).

## Read first, every session
- `docs/STATUS.md` only (short: where we are, what is pending, known issues).
- On demand, only the part you need (`grep -n` then read those lines): `docs/ARCHITECTURE.md` (design), `docs/LIBRARIES.md` (before adding a library), `docs/DECISIONS.md` (before re-arguing a choice), `docs/CHANGELOG.md` (history).

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

## Token budget (the Pro plan limit is the real cost)
- One phase or feature per session. When a session passes ~300k tokens of context, finish the step, commit, update `docs/STATUS.md` and start a fresh session (everything needed is in the docs).
- Never write a big file twice. The edit hook asks for facts on the first touch of every file, which makes a full write cost double: create files with one Bash `python` / `cat` write, or have the folder exempted (user setting `GATEGUARD_EXEMPT_GLOBS`). Then change files with small Edit / sed / python patches, not full rewrites.
- Read only the lines needed (offset + limit); do not re-read files just written. Use `grep -n` to find lines.
- Test the smallest thing that proves the change (one test file, one scene render); run the full test suite once per finished step. One screenshot per check, scaled down; prefer scripted DOM checks.
- Shell heredocs: ASCII only. Put Telugu text in a file written with the Write tool, never inside a long heredoc (a parse error means sending it twice).
- Long runs (renders, downloads) in the background; do not poll.
- Every .md and code file stays under 450 lines. Split a module before it grows past that (e.g. `visual.py` + `visual_media.py`).
- Huge data files (`map.js`, `lottie.min.js`, lock files, fixtures) are listed in `.ignore` so searches skip them; never open them.
