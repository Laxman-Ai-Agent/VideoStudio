# Decisions

Newest last. Format: date · decision · why · revisit when.

1. 2026-11-07 · No web app, DB or server. Chat (Claude Code) + files is the UI · single user on one laptop, and fewer moving parts · revisit when someone other than the owner needs to use it.
2. 2026-11-07 · Plain `studio.py` orchestrator, no workflow framework · 10 sequential stages don't need Airflow/Prefect · revisit when stages need to run across machines.
3. 2026-11-07 · HyperFrames is the default render engine. Remotion is a second, isolated engine used per template when it looks better · open license, HTML matches the existing kit, Remotion has a richer ecosystem for captions/3D · per template, by test render.
4. 2026-11-07 · Whisper only (faster-whisper on CPU), no ElevenLabs · the user's choice, free · revisit if Telugu accuracy is unacceptable even with script alignment.
5. 2026-11-07 · Scene planning by Claude inside Claude Code (Pro plan), not the API · there is no API key, and planning is validated by the contract either way · switching to the API would change only the plan module.
6. 2026-11-07 · No DepthFlow and no local generative models · the laptop has no NVIDIA GPU (i5-1235U, Iris Xe, 16 GB). Fake parallax via cut-out layers instead · revisit on a GPU machine.
7. 2026-11-07 · All caches on E: · C: has about 12 GB free.
8. 2026-11-07 · HyperFrames uses the installed Chrome. No bundled browser download.
9. 2026-11-07 · Python deps via uv (`uv.lock`), Node via `npm ci` + `package-lock.json`, exact pins · reproducible installs, no surprise upgrades.
10. 2026-11-07 · User media (sample audio, projects, library) is never committed to git · privacy and repo size.
11. 2026-11-07 · Storyboard is HTML screenshotted by headless system Chrome, not Pillow · Pillow wheels on Windows have no raqm, so Telugu conjuncts break; Chrome shapes Telugu and is already required · revisit if Chrome is dropped.
12. 2026-11-07 · Whisper output (`work/whisper.json`) and script alignment (`work/transcript.json`) are separate stages · editing the script must never re-run Whisper.
13. 2026-11-07 · Plan stage stops with exit code 2 and writes `work/plan_brief.md` when `scenes.json` is missing; Claude writes scenes.json in-session, the next run validates it.
