# Decisions

Newest last. Format: decision · why · revisit when. All dated 2026-11-07. Full wording: git history of this file.

1. No web app, DB or server; Claude Code chat + files is the UI · single user, fewer moving parts · someone else needs it (see #36).
2. Plain `studio.py` orchestrator, no workflow framework · sequential stages · stages must run across machines.
3. HyperFrames default engine; Remotion isolated, per template where it looks better · open licence, HTML kit · per template, by test render.
4. Whisper only (faster-whisper, CPU), no ElevenLabs · user's choice, free · Telugu accuracy unacceptable even with script alignment.
5. Scene planning by Claude in-session, not the API · no API key; the contract validates either way · switching touches only the plan module.
6. No DepthFlow, no local generative models · no NVIDIA GPU (i5-1235U, Iris Xe, 16 GB); fake parallax via cut-outs · a GPU machine.
7. All caches on E: · C: has ~12 GB free.
8. HyperFrames uses the installed Chrome, no bundled browser.
9. uv (`uv.lock`) + `npm ci` (`package-lock.json`), exact pins · reproducible installs.
10. User media (audio, projects, library) never in git · privacy, repo size.
11. Storyboard = HTML screenshotted by headless Chrome, not Pillow · Pillow on Windows breaks Telugu conjuncts · Chrome dropped.
12. Whisper output and script alignment are separate stages · a script edit must never re-run Whisper.
13. Plan stage writes `work/plan_brief.md` and exits 2 until Claude writes `scenes.json`.
14. Text from the script / Gemini JSON, timing from Whisper large-v3 (int8, default fallback decoding, coverage check, 3 retries); interpolated words `matched=false`; align fails on >8 s without a match · benchmark: small and large-v3-turbo loop or lose anchors on Telugu, temperature 0 loops every model, Gemini timings differ by up to 3.7 s between runs; override `STUDIO_WHISPER_MODEL` · CPU time matters (large-v3 ~8x real time) or a GPU; next idea: per-VAD-chunk retry.
15. Phase 2 adds no library: Wikimedia/Pexels via stdlib `urllib`, thumbs via ffmpeg, contact sheet via Chrome · downloads need retries/concurrency.
16. Assets described once by Claude from ONE contact sheet per batch, cached by hash; keyword match (local >= 0.34, internet >= 0.5 and >= 2 words); template types are 'template', not 'missing' · Pro usage; Wikimedia returns loose matches · picks wrong files (then a local vision check).
17. Render v1: one HyperFrames clip per scene per format, cache key = scene + asset hash + template + brand + size; 720p preview, `--final` full size; 2 workers; videos pre-trimmed by FFmpeg (raw 1080p decode is slow) · render time matters.
18. `output/preview_*.mp4` vs `output/final_*.mp4` · a 720p file must never be mistaken for the upload.
19. Charts never invent numbers: data only from `scene.params`; without data, decorative bars (or text).
20. Captions are an overlay inside each scene render · keeps the per-scene cache · a caption style must cross cuts.
21. Music = first file in `_library/music/<music_mood>/`, 18 LU under narration, ducked, faded; whoosh before cuts into headline/chart; loudnorm on the mix · per-project music choice wanted.
22. Parallax: rembg `silueta` on CPU, opt-in, hole filled with blur · rough edges (try `STUDIO_REMBG_MODEL=isnet-general-use`).
23. QA: previews always exported, `--final` only on pass; placeholder tiles warn in previews, fail in finals · a MISSING tile must never reach an upload.
24. Remotion 4.0.541 second engine (system Chrome); headline ported (same look, slightly faster) · licence free for individuals (re-check above 3 people). Superseded for headline by #30.
25. Raw footage cut by FFmpeg scene filter into real shot files · no new library · slow fades are missed.
26. Maps: offline Natural Earth outlines (India's view of borders), SVG · no tiles, no key · streets or satellite needed.
27. Screenshots: browser-frame template + honest headless capture of `params.url` (no user-agent spoofing); blocked sites need a dropped `scene_NNN.png`.
28. Timeline and map chosen by `params` (`events`, `focus`/`pin`), not new visual types · no contract change.
29. Contact sheet shows max 20 files per run · long raw videos make 100+ shots; one readable image per read.
30. Fonts in `_brand/fonts/<Family>/`, loaded by @font-face; default Gidugu; headline back on HyperFrames (Remotion cannot load these fonts yet) · Remotion gets font loading.
31. Paper style: brand themes, grain/looks/marks in shared studio.js, cut-out poster via rembg; SFX generated with FFmpeg (CC0 packs needed a donate dialog) · user drops real SFX.
32. Transitions animate inside each clip (same type both sides of a cut), no xfade · keeps exact frames and the cache · a transition must show both scenes.
33. Free sources without keys: Wikidata (`params.entity`), Openverse, Simple Icons, Noto Lottie; cached with licence, credited · a paid source wanted, or more Lottie icons (useAnimations, MIT).
34. Per-video themes: presets + keyword scoring + validation in Python, applied by the shared helpers · zero usage cost, one JSON per look · keyword scoring picks badly.
35. ONE `visual-assets.json` per project: Claude writes assets + prompts, `pipeline/visual.py` keeps statuses, uploads, processing, validation; no prompts/*.md; reuses resolve providers + rembg + Pillow Lanczos; overlays in the shared helpers · user's choices · Claude usage per video too high.
36. Local dashboard `ui/`: stdlib HTTP on 127.0.0.1 + plain HTML/JS, no framework, JSON stays the source of truth; port 8790 (8765 is taken) · it grows several pages.
37. Replacing a Found asset = upload -> preview next to the current -> confirm; framing/trim always re-process from the original upload · never lose a working asset.
38. No keyword web image search in the pipeline (Pexels, Openverse, Wikimedia search removed 2026-11-09): the separate asset-collector MCP finds images in a Claude session; exact-name sources stay (Wikidata entity, Simple Icons, Noto Lottie) · unattended runs need loose stock images again.
