# Library registry

One responsibility per library. Check this table before adding anything. Add the row in the same commit as the dependency.

Evaluation checklist for a new library: license (MIT/Apache/BSD ok; AGPL/custom needs review) · release or commit in the last 6 months · works on Windows + CPU · dependency weight · not duplicating a row below · 5-minute trial in a scratch folder.

| Library | Version | License | Owner module | Responsibility | Why |
|---|---|---|---|---|---|
| pydantic | 2.14.3 | MIT | contracts | validate every file passed between modules | standard, stops bad data at stage boundaries |
| pytest (dev) | 8.4.2 | MIT | tests | test runner | standard |
| hyperframes | 0.9.19 | Apache-2.0 | engines/hyperframes | HTML/GSAP compositions -> MP4; `inspect` = layout check (pipeline/layout.py) | open license, built for agent workflows, uses system Chrome |
| faster-whisper | 1.2.1 | MIT | transcribe | Whisper large-v3 int8 on CPU, word timestamps | 4x faster than openai-whisper on CPU, no torch |
| ctranslate2 (via faster-whisper) | 4.8.5 | MIT | transcribe | inference backend | pulled by faster-whisper |
| transformers (group `match`, optional; torch 2.8.0 shared with `align`) | 4.57.6 | Apache-2.0 | clipmatch | CLIP `openai/clip-vit-base-patch32` (~600 MB in `tools/models/huggingface`, first load ~4 min): image / text vectors to match drop/ files with scene queries, locally | cosine scores: matches 0.21-0.25, unrelated 0.13-0.18 on Whisk pictures; pulls huggingface-hub 0.36, tokenizers, safetensors |
| torch + torchaudio (group `align`, optional) | 2.8.0 | BSD | align_mms | MMS_FA forced aligner: word timings for a given text (`torchaudio.pipelines.MMS_FA`, model 1.26 GB in `tools/models/torch`) | measured sentence starts within 0.05 s of the audio pauses on 07 (Whisper ~0.5 s early); 2.8 still has `forced_align`. MODEL IS CC-BY-NC 4.0: user's own experiments only (user's choice, 2026-11-09) |
| uroman (group `align`) | 1.3.1.1 | Apache-2.0 | align_mms | romanise Telugu for the aligner's a-z vocabulary | the romaniser MMS was trained with; pure Python |
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
| 13 English font families (Poppins, Montserrat, Inter, Oswald, Bebas Neue, Anton, Archivo Black, Playfair Display, DM Serif Display, Instrument Serif, Caveat, Pacifico, Bangers) | google/fonts main, 2026-11-08 | SIL OFL 1.1 (`OFL.txt` per family) | render (`font_css`) | same folder-per-family store as the Telugu fonts; catalog in `_brand/fonts/README.md` |
| lottie-web (SVG player, vendored in `tools/templates/lottie/lottie.min.js`) | 5.13.0 | MIT | templates/lottie | plays Lottie JSON frame-exactly from the GSAP timeline | standard player, one file, no npm install |

## Free online sources (no key, no cost)
| Source | Used for | License of what we fetch |
|---|---|---|
| Wikidata + Wikimedia Commons (`providers.entity`) | exact person photo (P18) / brand logo (P154) from `params.entity` | per file (CC BY / CC BY-SA / public domain), kept in credits |
| Simple Icons CDN (`providers.simple_icon`) | brand icon fallback for logo scenes, rendered to a transparent PNG | CC0 data; trademarks stay with their owners |
| Google animated Noto emoji (`providers.noto_lottie`) | Lottie icons from `params.lottie` emoji | CC BY 4.0, credited |
| kaggle (+ six) | 2.2.5 (1.17.0) | Apache-2.0 (MIT) | kaggle/ (own venv, optional) | Kaggle API: datasets, GPU notebooks, outputs | official CLI; lets Claude run GPU jobs without a browser; `six` is an undeclared dependency |

## Planned (add when the phase starts, not before)
| Library | Phase | Responsibility |
|---|---|---|
| D3 | 4+ | richer charts, only if the plain-DOM chart template falls short |
