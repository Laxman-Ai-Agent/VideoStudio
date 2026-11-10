---
name: my-editor
description: Edit a VideoStudio project from narration audio into a documentary-style video. Use when the user says "edit <project>", "continue", "assets పెట్టాను" or gives notes on a video.
---

# my-editor

1. Read `docs/STATUS.md`, then the project's `project.md` and `work/state.json` (`studio.cmd status NN`).
2. Follow the pipeline in `docs/ARCHITECTURE.md`. Resume from the first stage that is not done. Never redo finished stages.
3. Creative direction before scenes (new video): read the plan brief's "Creative direction" + style memory, write the project `theme.json` (fonts, palette, background, `motion`, `direction`) that fits this topic and tone, check `studio.cmd theme NN` (max ~30% alike earlier videos), then plan scenes with varied compositions.
4. Gates: stop for user approval after the transcript (when no script was given) and after the storyboard. Render previews at 720p, final only after approval.
5. Apply every rule in `rules.md`. When the user says "make this a rule" / "ఇది rule చేయి", append it there with the date.
6. Notes from the user: re-render only the affected scenes. Batch all notes in one pass.
7. Log what you did in the project's `project.md`.
