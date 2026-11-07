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
| GSAP (bundled by hyperframes) | 3.15.0 | GSAP standard license (free, incl. commercial) | templates | template animation timelines | ships inside hyperframes (`dist/vendor/npm/gsap@3.15.0`), copied into each scene build; no CDN, no extra install |
| esbuild (via hyperframes) | 0.28.2 | MIT | engines/hyperframes | bundler HyperFrames needs | install script approved in package.json `allowScripts` |
| rembg | 2.0.87 | MIT | prepare | subject cut-out for fake parallax (CPU) | standard, CPU-only works; model `silueta` (43 MB) in `tools/models/rembg` via `U2NET_HOME`, override with env `STUDIO_REMBG_MODEL` |
| Pillow (via rembg) | 13.0.0 | MIT-CMU | prepare | mask math, blur, PNG write for the layers (never text) | already pulled by rembg |
| scipy, scikit-image, pymatting, numba, pooch (via rembg) | locked in uv.lock | BSD/MIT | prepare | rembg internals | not used directly |
| onnxruntime (via faster-whisper) | 1.31.1 | MIT | transcribe, prepare | inference for VAD and rembg | already installed, rembg needs no extra |
| remotion, @remotion/bundler, @remotion/renderer | 4.0.541 | Remotion License: free for individuals and companies of up to 3 people; bigger companies need a paid company license (remotion.dev/license) | engines/remotion | second render engine (React -> MP4) | isolated in `tools/engines/remotion` with its own lockfile; renders with system Chrome (`chromeMode: chrome-for-testing`), no browser download |
| react, react-dom | 19.3.1 | MIT | engines/remotion | Remotion components | required by Remotion |
| esbuild (via @remotion/bundler) | 0.28.1 | MIT | engines/remotion | bundler internals | own copy, never shared with HyperFrames |

## External tools (system-wide)
| Tool | Version | Used for |
|---|---|---|
| Python | 3.12.10 | pipeline runtime |
| Node.js | 24.19.0 | render engines |
| FFmpeg / FFprobe | 9.0.2 | cut, mix, loudness, encode, probe |
| Git | 2.55.0 | version control |
| Google Chrome | system | HyperFrames rendering, storyboard + asset contact sheet screenshots (headless) |
| uv | system | Python env + lockfile |

## Data
| Data | Version | License | Owner | Used for |
|---|---|---|---|---|
| Natural Earth admin-0 countries 10m, India point of view (`ne_10m_admin_0_countries_ind`) + admin-1 states 50m | natural-earth-vector master, 2026-11-07 | public domain | templates/map (`map.js`, built by `make_data.py`, simplified to 0.04°/0.02°) | offline map outlines, no tiles or API key |
| 24 Telugu font families from Google Fonts (`_brand/fonts/<Family>/`, catalog in `_brand/fonts/README.md`) | google/fonts main, 2026-11-07 | SIL OFL 1.1 (free, commercial ok, `OFL.txt` kept per family) | render (`font_css`) | brand fonts loaded by @font-face, no Windows install; git-ignored like the rest of `_brand/` |
| lottie-web (SVG player, vendored in `tools/templates/lottie/lottie.min.js`) | 5.13.0 | MIT | templates/lottie | plays Lottie JSON frame-exactly from the GSAP timeline | standard player, one file, no npm install |

## Free online sources (no key, no cost)
| Source | Used for | License of what we fetch |
|---|---|---|
| Wikidata + Wikimedia Commons (`providers.entity`) | exact person photo (P18) / brand logo (P154) from `params.entity` | per file (CC BY / CC BY-SA / public domain), kept in credits |
| Openverse API (`providers.openverse`) | CC / public-domain photos by keyword (anonymous, rate-limited) | per file, commercial-use licences only |
| Simple Icons CDN (`providers.simple_icon`) | brand icon fallback for logo scenes, rendered to a transparent PNG | CC0 data; trademarks stay with their owners |
| Google animated Noto emoji (`providers.noto_lottie`) | Lottie icons from `params.lottie` emoji | CC BY 4.0, credited |
| Pexels (free key in `tools/.env`) | stock photos and footage | Pexels License |

## Planned (add when the phase starts, not before)
| Library | Phase | Responsibility |
|---|---|---|
| D3 | 4+ | richer charts, only if the plain-DOM chart template falls short |
