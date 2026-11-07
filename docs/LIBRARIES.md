# Library registry

One responsibility per library. Check this table before adding anything. Add the row in the same commit as the dependency.

Evaluation checklist for a new library: license (MIT/Apache/BSD ok; AGPL/custom needs review) · release or commit in the last 6 months · works on Windows + CPU · dependency weight · not duplicating a row below · 5-minute trial in a scratch folder.

| Library | Version | License | Owner module | Responsibility | Why |
|---|---|---|---|---|---|
| pydantic | 2.14.3 | MIT | contracts | validate every file passed between modules | standard, stops bad data at stage boundaries |
| pytest (dev) | 8.4.2 | MIT | tests | test runner | standard |
| hyperframes | 0.9.19 | Apache-2.0 | engines/hyperframes | HTML/GSAP compositions -> MP4 | open license, built for agent workflows, uses system Chrome |
| esbuild (via hyperframes) | 0.28.2 | MIT | engines/hyperframes | bundler HyperFrames needs | install script approved in package.json `allowScripts` |

## External tools (system-wide)
| Tool | Version | Used for |
|---|---|---|
| Python | 3.12.10 | pipeline runtime |
| Node.js | 24.19.0 | render engines |
| FFmpeg / FFprobe | 9.0.2 | cut, mix, loudness, encode, probe |
| Git | 2.55.0 | version control |
| Google Chrome | system | HyperFrames rendering |
| uv | system | Python env + lockfile |

## Planned (add when the phase starts, not before)
| Library | Phase | Responsibility |
|---|---|---|
| faster-whisper | 1 | transcription with word timestamps (CPU int8) |
| Pillow | 1 | storyboard grid, image resize |
| httpx | 2 | Wikimedia / Pexels API |
| GSAP, D3 | 3 | animation, charts (inside templates) |
| rembg | 4 | background removal |
| remotion | 4 | second render engine (isolated in engines/remotion) |
| PySceneDetect, MapLibre GL | 5 | raw-footage shots, maps |
