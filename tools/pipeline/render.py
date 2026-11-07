"""render stage: one MP4 per scene per format (HyperFrames), cached by content hash.

Engine contract (docs/ARCHITECTURE.md): scene JSON + template in, one MP4 of exactly the scene's
frame count out. A failing scene gets the `missing` tile (then a plain colour clip) and a report
entry; the other scenes still render.
"""
import hashlib
import json
import os
import shutil
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

from .assets import VIDEO, file_hash, probe
from .config import BRAND, ENGINES, TOOLS
from .contracts import (Brand, RenderReport, Resolved, ResolvedScene, Scene, ScenePlan, SceneRender,
                        TemplateSpec, ThemeSpec, Word, Prepared)
from .project import atomic_write

TEMPLATES = TOOLS / "templates"
SHARED = TEMPLATES / "_shared"
HF = ENGINES / "hyperframes" / "node_modules" / "hyperframes"
HF_BIN = HF / "bin" / "hyperframes.mjs"
GSAP = HF / "dist" / "vendor" / "npm" / "gsap@3.15.0" / "dist" / "gsap.min.js"
PREVIEW_SHORT_SIDE = 720
FIT_TOLERANCE = 0.35  # aspect mismatch above this -> blurred backdrop instead of a hard crop
RENDER_TIMEOUT = 900
REMOTION = ENGINES / "remotion" / "render.mjs"
FONTS = BRAND / "fonts"  # _brand/fonts/<Family>/*.ttf (Google Fonts, OFL), loaded by @font-face
WEIGHTS = {"thin": 100, "extralight": 200, "light": 300, "regular": 400, "medium": 500, "semibold": 600,
           "bold": 700, "extrabold": 800, "black": 900}
CAPTION_WORDS = {"landscape": 4, "portrait": 3}  # max words per caption page
CAPTION_BREAK = 0.5  # a pause longer than this starts a new caption page


def fmt_dir(fmt: str, final: bool) -> str:
    """'16:9' -> '16x9' (preview) or '16x9_final', so switching modes never evicts the other cache."""
    return fmt.replace(":", "x") + ("_final" if final else "")


def size_for(w: int, h: int, final: bool) -> tuple[int, int]:
    if final:
        return w, h
    k = PREVIEW_SHORT_SIDE / min(w, h)
    return round(w * k / 2) * 2, round(h * k / 2) * 2


def frame_count(scene: Scene, fps: int) -> int:
    """Frames from rounded absolute times, so clips add up to the narration with no drift."""
    return max(1, round(scene.end * fps) - round(scene.start * fps))


def pick_template(scene: Scene, r: ResolvedScene) -> str:
    if r.status == "template":
        if scene.params.get("lottie") and r.asset:
            return "lottie"
        if any(scene.params.get(k) for k in ("items", "stat", "button")):
            return "cards"
        if scene.params.get("lines") or scene.params.get("bg_word"):
            return "kinetic"
        if scene.visual_type == "chart":
            return "chart"
        if scene.params.get("events"):
            return "timeline"
        p = scene.params
        return "map" if scene.visual_type == "map" and (p.get("focus") or p.get("pin")) else "headline"
    if r.status == "missing" or not r.asset:
        return "missing"
    if Path(r.asset).suffix.lower() in VIDEO:
        return "video_clip"
    return "screenshot" if scene.visual_type == "screenshot" else "photo"


TRANSITIONS = {"blur", "wipe", "zoom", "circle", "cut"}


def transitions(plan: ScenePlan, brand: Brand) -> dict[int, tuple[str, str]]:
    """Scene id -> (in, out). Cut k (scene k -> k+1) uses scene k+1's `params.transition`, else the
    brand list cycled; both sides of a cut get the same type so out + in read as one move."""
    out = {s.id: ["", ""] for s in plan.scenes}
    cycle = [t for t in brand.transitions if t in TRANSITIONS]
    for k, (a, b) in enumerate(zip(plan.scenes, plan.scenes[1:])):
        t = str(b.params.get("transition") or (cycle[k % len(cycle)] if cycle else "cut"))
        t = "" if t not in TRANSITIONS or t == "cut" else t
        out[a.id][1] = out[b.id][0] = t
    return {k: tuple(v) for k, v in out.items()}


def caption_pages(scene: Scene, words: list[Word], max_words: int) -> list[list[dict]]:
    """Words whose midpoint falls inside the scene, as pages of <= max_words, times relative to the
    scene start. A page never crosses a cut, a long pause or a sentence end."""
    pages, cur = [], []
    for wd in words:
        if not scene.start <= (wd.start + wd.end) / 2 < scene.end:
            continue
        s, e = max(0.0, wd.start - scene.start), min(scene.end, wd.end) - scene.start
        if cur and (len(cur) >= max_words or s - cur[-1]["e"] > CAPTION_BREAK or cur[-1]["t"][-1] in ".?!।"):
            pages.append(cur)
            cur = []
        cur.append({"t": wd.text, "s": round(s, 3), "e": round(max(e, s + 0.05), 3)})
    return pages + [cur] if cur else pages


def load_template(name: str) -> TemplateSpec:
    return TemplateSpec.model_validate_json((TEMPLATES / name / "template.json").read_text("utf-8"))


def _dir_hash(folder: Path) -> str:
    h = hashlib.sha256()
    for f in sorted(folder.iterdir()):
        if f.is_file():
            h.update(f.name.encode() + f.read_bytes())
    return h.hexdigest()[:16]


@dataclass
class Job:
    scene: Scene
    res: ResolvedScene
    template: str
    asset: Path | None
    w: int
    h: int
    fps: int
    frames: int
    out: Path
    key: str
    brand: Brand
    captions: list = None  # caption pages (caption_pages), None = no captions
    layers: tuple = ()     # photo_parallax: (fg.png, bg.png) from the prepare stage
    trans: tuple = ("", "")  # (in, out) transition at this scene's cuts, see transitions()
    style: ThemeSpec = None  # the video's visual theme (work/theme.json), see theme.py

    @property
    def duration(self) -> float:
        return self.frames / self.fps


def plan_jobs(plan: ScenePlan, resolved: Resolved, brand: Brand, fmt: str, root: Path,
              out_dir: Path, final: bool, words: list[Word] | None = None,
              prepared: Prepared | None = None, theme: ThemeSpec | None = None) -> list[Job]:
    """Cheap: hashes inputs only. Key = scene JSON + asset hash + template (version + files)
    + brand.json + theme + output size/fps."""
    from .theme import from_brand
    style = theme or from_brand(brand)
    of = brand.formats[fmt]
    w, h = size_for(of.width, of.height, final)
    fonts = [f"{f.relative_to(FONTS)}:{f.stat().st_size}" for fam in set(style.fonts.values()) if fam
             for f in sorted((FONTS / fam).glob("*.ttf"))]  # adding/removing a font file re-renders
    look = style.model_dump_json(include={"colors", "fonts", "background", "text", "name"})
    brand_hash = hashlib.sha256((brand.model_dump_json() + str(fonts) + look).encode()).hexdigest()[:16]
    shared = _dir_hash(SHARED)
    jobs, tpl_hash = [], {}
    by_id = {r.id: r for r in resolved.scenes}
    prep = {c.id: c for c in (prepared.scenes if prepared else [])}
    trans = transitions(plan, brand)
    for s in plan.scenes:
        r = by_id.get(s.id) or ResolvedScene(id=s.id, status="missing")
        name = pick_template(s, r)
        # opt-in templates that need a working cut-out (prepare stage); otherwise a plain photo
        c, layers = (prep.get(s.id) if name == "photo" else None), ()
        if c and s.params.get("cutout") and c.cut and (root / c.cut).exists():
            name, layers = "cutout_title", (root / c.cut,)
        elif c and s.params.get("parallax") and c.fg and c.bg and (root / c.fg).exists() and (root / c.bg).exists():
            name, layers = "photo_parallax", (root / c.fg, root / c.bg)
        if name not in tpl_hash:
            tpl_hash[name] = f"{load_template(name).version}:{_dir_hash(TEMPLATES / name)}:{shared}"
        rel = (r.asset_9x16 if fmt == "9:16" and r.asset_9x16 else r.asset) if name in ("photo", "video_clip", "screenshot", "lottie") else None
        asset = root / rel if rel else None
        asset_hash = file_hash(asset) if asset and asset.exists() else "none"
        if layers:
            asset_hash += ":" + ":".join(file_hash(f) for f in layers)
        caps = (caption_pages(s, words, CAPTION_WORDS["portrait" if h > w else "landscape"])
                if brand.captions and words else None)
        key = hashlib.sha256(json.dumps([s.model_dump(mode="json"), name, tpl_hash[name], asset_hash,
                                         brand_hash, fmt, w, h, brand.fps, caps, trans[s.id]]).encode()).hexdigest()[:16]
        jobs.append(Job(s, r, name, asset, w, h, brand.fps, frame_count(s, brand.fps),
                        out_dir / f"scene_{s.id:03d}.mp4", key, brand, caps, layers, trans[s.id], style))
    return jobs


def is_cached(job: Job) -> bool:
    k = job.out.with_suffix(".key")
    return job.out.exists() and k.exists() and k.read_text("utf-8").strip() == job.key


def _ffmpeg(args: list[str]) -> None:
    p = subprocess.run(["ffmpeg", "-y", "-v", "error", *args], capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError(f"ffmpeg failed: {p.stderr.strip()[-400:]}")


def _dims(asset: Path | None) -> dict:
    info = probe(asset) if asset else {}
    return {"asset_w": info.get("width", 0), "asset_h": info.get("height", 0)}


def _fit(asset: Path, w: int, h: int) -> str:
    info = probe(asset)
    if not info.get("width") or not info.get("height"):
        return "cover"
    a, f = info["width"] / info["height"], w / h
    return "cover" if abs(a - f) / f <= FIT_TOLERANCE else "blur"


def _prep_video(src: Path, dest: Path, job: Job, fit: str) -> None:
    """Trim (or loop) to the scene length and fit to the frame with FFmpeg, so the browser only
    decodes a small clip of exactly the right size."""
    w, h = job.w, job.h
    cover = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"
    vf = (cover if fit == "cover" else
          f"split[a][b];[a]{cover},boxblur=20:2,eq=brightness=-0.12[bg];"
          f"[b]scale={w}:{h}:force_original_aspect_ratio=decrease[fg];"
          f"[bg][fg]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2")
    start = float(job.scene.params.get("media_start", 0) or 0)
    _ffmpeg(["-stream_loop", "-1", "-ss", f"{start}", "-i", str(src), "-t", f"{job.duration:.4f}", "-an",
             "-vf", vf + ",setsar=1", "-r", str(job.fps), "-c:v", "libx264", "-preset", "veryfast",
             "-crf", "18", "-pix_fmt", "yuv420p", str(dest)])


def font_css(families, dest: Path, fonts_dir: Path = FONTS) -> str:
    """@font-face rules for brand fonts saved in _brand/fonts/<Family>/*.ttf (copied into dest).
    A variable font or a single-file family covers every weight, so templates asking for 800/900
    get the real glyphs, not a synthetic bold. A family without a folder falls back to system fonts."""
    css = []
    for fam in dict.fromkeys(families):
        files = [f for f in sorted((fonts_dir / fam).glob("*.ttf")) if "italic" not in f.name.lower()] if fam else []
        for f in files:
            style = f.stem.rsplit("-", 1)[-1].lower()
            w = "100 900" if "[" in f.name or len(files) == 1 else WEIGHTS.get(style, 400)
            name = f"font{len(css)}.ttf"
            shutil.copy2(f, dest / name)
            css.append(f'@font-face {{ font-family: "{fam}"; src: url("{name}"); font-weight: {w}; }}')
    return "\n".join(css)


def build(job: Job, build_dir: Path, template: str, error: str = "") -> None:
    """Self-contained HyperFrames project: index.html + scene.js + shared files + gsap + asset."""
    shutil.rmtree(build_dir, ignore_errors=True)
    build_dir.mkdir(parents=True)
    for f in (SHARED / "studio.js", GSAP):
        shutil.copy2(f, build_dir / f.name)
    (build_dir / "studio.css").write_text(font_css(job.style.fonts.values(), build_dir) + "\n"
                                          + (SHARED / "studio.css").read_text("utf-8"), "utf-8")
    asset_name, fit = "", "cover"
    if template == "lottie":
        if not job.asset or not job.asset.exists():
            raise FileNotFoundError(f"lottie not found: {job.asset}")
        (build_dir / "anim.js").write_text("window.ANIM = " + job.asset.read_text("utf-8") + ";\n", "utf-8")
    elif template == "cutout_title":
        shutil.copy2(job.layers[0], build_dir / "cut.png")
        asset_name = "cut.png"
    elif template == "photo_parallax":
        for f, name in zip(job.layers, ("fg.png", "bg.png")):
            shutil.copy2(f, build_dir / name)
        asset_name = "bg.png"
    elif template in ("photo", "video_clip", "screenshot"):
        if not job.asset or not job.asset.exists():
            raise FileNotFoundError(f"asset not found: {job.asset}")
        fit = _fit(job.asset, job.w, job.h)
        if template == "video_clip":
            asset_name = "asset.mp4"
            _prep_video(job.asset, build_dir / asset_name, job, fit)
        else:
            asset_name = "asset" + job.asset.suffix.lower()
            shutil.copy2(job.asset, build_dir / asset_name)
    s, st = job.scene, job.style
    f = st.fonts
    scene = {"id": s.id, "w": job.w, "h": job.h, "fps": job.fps, "duration": job.duration,
             "text": s.on_screen_text, "query": s.query, "visual_type": s.visual_type, "narration": s.narration, "params": s.params,
             "asset": asset_name, "fit": fit, **_dims(job.layers[0] if template == "cutout_title" else job.asset if asset_name else None),
             "colors": {**st.colors, "marker": st.colors.get("highlight") or st.colors.get("accent", "")},
             "theme": st.name, "style": {"background": st.background, "text": st.text},
             "fonts": {"telugu": f.get("body"), "latin": f.get("body"), "heading": f.get("heading"), "script": f.get("script")},
             "error": error,
             "captions": job.captions or [], "trans_in": job.trans[0], "trans_out": job.trans[1]}
    (build_dir / "scene.js").write_text("window.SCENE = " + json.dumps(scene, ensure_ascii=False) + ";\n", "utf-8")
    (build_dir / "scene.json").write_text(json.dumps(scene, ensure_ascii=False), "utf-8")
    if load_template(template).engine == "remotion":
        shutil.copy2(TEMPLATES / template / "Composition.jsx", build_dir / "Composition.jsx")
        return
    for f in (TEMPLATES / template).glob("*.js"):  # template data, e.g. map/map.js
        shutil.copy2(f, build_dir / f.name)
    html = (TEMPLATES / template / "index.html").read_text("utf-8")
    for k, v in {"{{W}}": job.w, "{{H}}": job.h, "{{DUR}}": f"{job.duration:.4f}", "{{ASSET}}": asset_name}.items():
        html = html.replace(k, str(v))
    (build_dir / "index.html").write_text(html, "utf-8")


def frames_of(path: Path) -> int:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
                          "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True).stdout.strip()
    return int(out) if out.isdigit() else 0


def _exact_frames(src: Path, dest: Path, job: Job) -> None:
    """Pad (clone last frame) or trim so the clip has exactly job.frames frames."""
    if frames_of(src) == job.frames:
        os.replace(src, dest)
        return
    _ffmpeg(["-i", str(src), "-vf", f"tpad=stop_mode=clone:stop={job.frames},trim=end_frame={job.frames},"
             "setpts=PTS-STARTPTS", "-r", str(job.fps), "-c:v", "libx264", "-preset", "veryfast",
             "-crf", "18", "-pix_fmt", "yuv420p", str(dest)])
    src.unlink(missing_ok=True)


def hyperframes(build_dir: Path, out: Path, fps: int, final: bool) -> None:
    env = dict(os.environ, HYPERFRAMES_RENDER_LOCK="off")  # our own worker pool limits parallelism
    p = subprocess.run(["node", str(HF_BIN), "render", str(build_dir), "-o", str(out), "--fps", str(fps),
                        "--quality", "standard" if final else "draft", "--workers", "1", "--quiet"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace",
                       env=env, timeout=RENDER_TIMEOUT)
    if p.returncode or not out.exists():
        raise RuntimeError(f"hyperframes exit {p.returncode}: {(p.stderr or p.stdout).strip()[-500:]}")


def remotion(build_dir: Path, out: Path, fps: int, final: bool) -> None:
    """Second engine (tools/engines/remotion). Same contract; fps/size come from scene.json."""
    from .doctor import CHROME_PATHS
    chrome = next((c for c in CHROME_PATHS if c.exists()), None)
    if not chrome:
        raise FileNotFoundError("Chrome not found (studio doctor)")
    p = subprocess.run(["node", str(REMOTION), str(build_dir), str(out), "final" if final else "preview", str(chrome)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=RENDER_TIMEOUT)
    if p.returncode or not out.exists():
        raise RuntimeError(f"remotion exit {p.returncode}: {(p.stderr or p.stdout).strip()[-500:]}")


ENGINE_FN = {"hyperframes": hyperframes, "remotion": remotion}


def _color_clip(job: Job, dest: Path) -> None:
    bg = (job.brand.colors.get("background") or "#000000").lstrip("#")
    _ffmpeg(["-f", "lavfi", "-i", f"color=c=0x{bg}:s={job.w}x{job.h}:r={job.fps}", "-frames:v", str(job.frames),
             "-c:v", "libx264", "-pix_fmt", "yuv420p", str(dest)])


def render_one(job: Job, final: bool, render=None) -> SceneRender:
    """`render` overrides the engine (tests); default = the template's engine from template.json."""
    t0 = time.monotonic()
    work = job.out.parent / ".build" / job.out.stem
    raw = job.out.with_name(job.out.stem + ".raw.mp4")
    tmp = job.out.with_name(job.out.stem + ".tmp.mp4")
    error = ""
    for template in dict.fromkeys([job.template, "missing"]):  # requested template, then the tile
        try:
            build(job, work, template, error)
            (render or ENGINE_FN[load_template(template).engine])(work, raw, job.fps, final)
            _exact_frames(raw, tmp, job)
            break
        except Exception as e:  # noqa: BLE001 - isolation: any scene failure becomes a report entry
            error = error or f"{template}: {type(e).__name__}: {e}"
    else:
        _color_clip(job, tmp)  # even the tile failed (Chrome gone?) -> plain clip keeps the timeline
    os.replace(tmp, job.out)
    if not error:  # a failed scene keeps no key, so the next run tries it again
        atomic_write(job.out.with_suffix(".key"), job.key)
        shutil.rmtree(work, ignore_errors=True)  # failed builds stay for debugging
    raw.unlink(missing_ok=True)
    return SceneRender(id=job.scene.id, template=job.template, status="failed" if error else "rendered",
                       key=job.key, seconds=round(time.monotonic() - t0, 1), error=error)


def render_format(jobs: list[Job], fmt: str, final: bool, workers: int = 2,
                  render=None, log=print) -> RenderReport:
    """Render every uncached job with `workers` parallel HyperFrames processes; write report.json."""
    out_dir = jobs[0].out.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    results: dict[int, SceneRender] = {}
    todo = []
    for j in jobs:
        if is_cached(j):
            results[j.scene.id] = SceneRender(id=j.scene.id, template=j.template, status="cached", key=j.key)
        else:
            j.out.with_suffix(".key").unlink(missing_ok=True)  # a crash mid-render must not look cached
            todo.append(j)

    def one(j: Job) -> SceneRender:
        r = render_one(j, final, render)
        log(f"    {fmt} scene {j.scene.id:>3} {j.template:<10} {r.status} {r.seconds:.0f}s"
            + (f"  ({r.error[:120]})" if r.error else ""))
        return r

    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        for r in pool.map(one, todo):
            results[r.id] = r
    j0 = jobs[0]
    report = RenderReport(format=fmt, width=j0.w, height=j0.h, fps=j0.fps,
                          scenes=[results[j.scene.id] for j in jobs])
    atomic_write(out_dir / "report.json", report.model_dump_json(indent=2))
    return report
