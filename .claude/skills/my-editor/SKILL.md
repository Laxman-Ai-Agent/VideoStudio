---
name: my-editor
description: Edit a VideoStudio project from narration audio into a documentary-style video. Use when the user says "edit <project>", "continue", "assets పెట్టాను" or gives notes on a video.
---

# my-editor

1. Read `docs/STATUS.md`, then the project's `project.md` and `work/state.json` (`studio.cmd status NN`).
2. Follow the pipeline in `docs/ARCHITECTURE.md`. Resume from the first stage that is not done. Never redo finished stages.
3. Gates: stop for user approval after the transcript (when no script was given) and after the storyboard. Render previews at 720p, final only after approval.
4. Apply every rule in `rules.md`. When the user says "make this a rule" / "ఇది rule చేయి", append it there with the date.
5. Notes from the user: re-render only the affected scenes. Batch all notes in one pass.
6. Log what you did in the project's `project.md`.
