# VideoStudio

Turns a narration audio file into a documentary/explainer-style video. It mixes real photos, footage, screenshots, charts, maps, motion graphics and on-screen text, all synced to the narration. When it can't find an asset, it writes image/video generation prompts. You drop the generated files back into the project and it continues.

Built to be driven from Claude Code. Design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Progress: [docs/STATUS.md](docs/STATUS.md).

## Setup (Windows)
Requires Python 3.12, Node.js >= 22, FFmpeg, Git, Google Chrome and [uv](https://docs.astral.sh/uv/).

```bat
cd tools && uv sync && cd ..
cd tools\engines\hyperframes && npm ci && cd ..\..\..
studio.cmd doctor
```

## Use
```bat
studio.cmd new "My Topic"        :: creates projects\NN_My_Topic\
:: put audio (+ optional script, images, clips) into projects\NN_My_Topic\drop\
studio.cmd status NN
```
