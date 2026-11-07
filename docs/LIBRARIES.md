# Library registry

One responsibility per library. Check this table before adding anything. Add the row in the same commit as the dependency.

Evaluation checklist for a new library: license (MIT/Apache/BSD ok; AGPL/custom needs review) · release or commit in the last 6 months · works on Windows + CPU · dependency weight · not duplicating a row below · 5-minute trial in a scratch folder.

| Library | Version | License | Owner module | Responsibility | Why |
|---|---|---|---|---|---|
| pydantic | 2.14.3 | MIT | contracts | validate every file passed between modules | standard, stops bad data at stage boundaries |
| pytest (dev) | 8.4.2 | MIT | tests | test runner | standard |
| hyperframes | 0.9.19 | Apache-2.0 | engines/hyperframes | HTML/GSAP compositions -> MP4 | open license, built for agent workflows, uses system Chrome |
| faster-whisper | 1.2.1 | MIT | transcribe | Whisper large-v3 int8 on CPU, word timestamps | 4x faster than openai-whisper on CPU, no torch |
| ctranslate2 (via faster-whisper) | 4.8.5 | MIT | transcribe | inference backend | pulled by faster-whisper |
| av / PyAV (via faster-whisper) | 15.1.0 | BSD-3 | transcribe | audio decode | pinned `15.*`: av 19 dropped `metadata_errors`, faster-whisper 1.2.1 crashes. Unpin when faster-whisper fixes it |
| esbuild (via hyperframes) | 0.28.2 | MIT | engines/hyperframes | bundler HyperFrames needs | install script approved in package.json `allowScripts` |

## External tools (system-wide)
| Tool | Version | Used for |
|---|---|---|
| Python | 3.12.10 | pipeline runtime |
| Node.js | 24.19.0 | render engines |
| FFmpeg / FFprobe | 9.0.2 | cut, mix, loudness, encode, probe |
| Git | 2.55.0 | version control |
| Google Chrome | system | HyperFrames rendering, storyboard screenshot (headless) |
| uv | system | Python env + lockfile |

## Planned (add when the phase starts, not before)
| Library | Phase | Responsibility |
|---|---|---|
| Pillow | 2 | image resize/crop (NOT text: no raqm on Windows, Telugu breaks) |
| httpx | 2 | Wikimedia / Pexels API |
| GSAP, D3 | 3 | animation, charts (inside templates) |
| rembg | 4 | background removal |
| remotion | 4 | second render engine (isolated in engines/remotion) |
| PySceneDetect, MapLibre GL | 5 | raw-footage shots, maps |
