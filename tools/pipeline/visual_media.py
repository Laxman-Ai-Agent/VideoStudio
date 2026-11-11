"""Media processing for visual-assets.json (split out of visual.py to keep files under 450 lines):
transparency check, aspect framing (fill / fit, crop window, zoom), video trim with FFmpeg,
the image pipeline (`process`) and file validation (`check`). visual.py re-exports these names."""
import shutil
import subprocess
from collections.abc import Callable
from pathlib import Path

from .assets import probe
from .contracts import VisualAsset
from .ingest import IMAGE, VIDEO

PROCESSED = "assets"     # final files after processing: ONE file per asset (assets/A012.png)


def is_transparent(img) -> bool:
    if img.mode not in ("RGBA", "LA") and "transparency" not in img.info:
        return False
    return img.convert("RGBA").getchannel("A").getextrema()[0] < 250


ASPECTS = {"16:9": (16, 9), "9:16": (9, 16), "4:5": (4, 5), "1:1": (1, 1)}


def out_size(a: VisualAsset) -> tuple[int, int]:
    """Final pixel size: the output size, or the chosen aspect at the output's long side (even numbers)."""
    tw, th = a.output.width or 1920, a.output.height or 1080
    if a.media.aspect not in ASPECTS:
        return tw, th
    rw, rh = ASPECTS[a.media.aspect]
    L = max(tw, th)
    w, h = (L, L * rh / rw) if rw >= rh else (L * rw / rh, L)
    return round(w / 2) * 2, round(h / 2) * 2


def crop_window(w: int, h: int, ratio: float, m) -> tuple[int, int, int, int]:
    """Fill: the largest window of `ratio` inside w x h, shrunk by zoom, centred on the focus point."""
    cw = min(w, h * ratio) / max(1.0, m.zoom)
    ch = cw / ratio
    x = min(max(0.0, m.crop_x * w - cw / 2), w - cw)
    y = min(max(0.0, m.crop_y * h - ch / 2), h - ch)
    return round(x), round(y), round(cw), round(ch)


def _frame(img, a: VisualAsset, want_alpha: bool, log: list):
    """Aspect framing chosen in the dashboard: fill (crop window) or fit (pad), exact output size."""
    from PIL import Image
    ow, oh = out_size(a)
    m = a.media
    if m.fit == "fit":
        k = min(ow / img.size[0], oh / img.size[1])
        img = img.resize((max(1, round(img.size[0] * k)), max(1, round(img.size[1] * k))), Image.LANCZOS)
        canvas = Image.new("RGBA" if want_alpha else "RGB", (ow, oh), (0, 0, 0, 0) if want_alpha else (0, 0, 0))
        canvas.paste(img, ((ow - img.size[0]) // 2, (oh - img.size[1]) // 2), img if img.mode == "RGBA" else None)
        log.append(f"fit into {m.aspect} {ow}x{oh} (padded)")
        return canvas
    x, y, cw, ch = crop_window(*img.size, ow / oh, m)
    img = img.crop((x, y, x + cw, y + ch)).resize((ow, oh), Image.LANCZOS)
    log.append(f"filled {m.aspect} {ow}x{oh} (crop {cw}x{ch} at {x},{y}, zoom {m.zoom:g})")
    return img


def _video(a: VisualAsset, src: Path, dest: Path, log: list) -> None:
    """Trim (trim_start..trim_end) and frame (aspect, fill/fit) with FFmpeg into a new file."""
    info = probe(src)
    w, h, dur = info.get("width") or 0, info.get("height") or 0, _video_seconds(src)
    m = a.media
    m.source_w, m.source_h, m.duration_source = w, h, round(dur, 3)
    start = max(0.0, min(m.trim_start, max(0.0, dur - 0.1)))
    end = min(m.trim_end, dur) if m.trim_end else dur
    if end - start < 0.1:
        raise ValueError(f"trim {start:.2f}-{end:.2f} s is empty (video is {dur:.2f} s)")
    vf = []
    if m.aspect in ASPECTS and w and h:
        ow, oh = out_size(a)
        if m.fit == "fit":
            vf.append(f"scale={ow}:{oh}:force_original_aspect_ratio=decrease,pad={ow}:{oh}:(ow-iw)/2:(oh-ih)/2")
        else:
            x, y, cw, ch = crop_window(w, h, ow / oh, m)
            vf.append(f"crop={cw // 2 * 2}:{ch // 2 * 2}:{x}:{y},scale={ow}:{oh}")
        m.out_w, m.out_h = ow, oh
    else:
        m.out_w, m.out_h = w, h
    cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{start:.3f}", "-i", str(src), "-t", f"{end - start:.3f}", "-an",
           *(["-vf", ",".join(vf + ["setsar=1"])] if vf else []), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
           "-pix_fmt", "yuv420p", str(dest)]
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode:
        raise RuntimeError(f"ffmpeg: {p.stderr.strip()[-300:]}")
    log.append(f"video trimmed {start:.2f}-{end:.2f} s ({end - start:.2f} s of {dur:.2f} s)"
               + (f", framed {m.aspect} {m.fit} {m.out_w}x{m.out_h}" if vf else ""))


def process(a: VisualAsset, src: Path, project: Path, remove_bg: Callable | None = None,
            dest_dir: Path | None = None) -> tuple[Path, list[str]]:
    """Image pipeline: extract/crop -> background removal -> trim -> aspect framing (dashboard) or
    resize (Lanczos) -> format. Videos: trim + framing with FFmpeg when set, else copied. The source
    file is never changed; the result goes to `dest_dir` (default assets/)."""
    from PIL import Image
    log, out_dir = [], dest_dir or project / PROCESSED
    out_dir.mkdir(parents=True, exist_ok=True)
    ext = src.suffix.lower()
    if ext in VIDEO:
        m = a.media
        edited = m.aspect in ASPECTS or m.trim_start > 0 or m.trim_end
        dest = out_dir / f"{a.id}{'.mp4' if edited else ext}"
        if edited:
            _video(a, src, dest, log)
        else:
            info = probe(src)
            m.source_w, m.source_h, m.duration_source = info.get("width") or 0, info.get("height") or 0, round(_video_seconds(src), 3)
            m.out_w, m.out_h = m.source_w, m.source_h
            shutil.copy2(src, dest)
            log.append("video copied as is (no trim / framing set)")
        return dest, log
    if ext not in IMAGE or ext == ".svg":
        dest = out_dir / f"{a.id}{ext}"
        shutil.copy2(src, dest)
        return dest, ["copied as is (not a raster image)"]
    p = a.processing
    img = Image.open(src)
    img.load()
    a.media.source_w, a.media.source_h = img.size
    if p.crop and len(p.crop) == 4:
        x, y, w, h = p.crop
        W, H = img.size
        img = img.crop((round(x * W), round(y * H), round((x + w) * W), round((y + h) * H)))
        log.append(f"cropped to {img.size[0]}x{img.size[1]}" + (f" from {p.extract_from}" if p.extract_from else ""))
    want_alpha = a.output.transparent or p.remove_background
    if p.remove_background and not is_transparent(img):
        if remove_bg is None:
            raise RuntimeError("background removal needed but rembg is not available")
        img = remove_bg(img.convert("RGB"))
        log.append("background removed (rembg)")
    if want_alpha and is_transparent(img):
        bbox = img.convert("RGBA").getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
        if bbox and bbox != (0, 0, *img.size):
            img = img.crop(bbox)
            log.append("trimmed to the subject")
    tw, th = a.output.width, a.output.height
    if a.media.aspect in ASPECTS:
        img = _frame(img, a, want_alpha, log)
    elif p.resize and tw and th:
        k = min(tw / img.size[0], th / img.size[1])
        if k < 1 or (k > 1 and p.upscale_if_small):
            img = img.resize((max(1, round(img.size[0] * k)), max(1, round(img.size[1] * k))), Image.LANCZOS)
            log.append(f"resized x{k:.2f} to {img.size[0]}x{img.size[1]}" + (" (upscaled, may look soft)" if k > 1.5 else ""))
    a.media.out_w, a.media.out_h = img.size
    fmt = (p.convert_to or a.output.format or "png").lower().lstrip(".")
    fmt = "png" if want_alpha or fmt not in ("png", "jpg", "jpeg", "webp") else fmt
    dest = out_dir / f"{a.id}.{'jpg' if fmt == 'jpeg' else fmt}"
    if fmt in ("jpg", "jpeg"):
        img.convert("RGB").save(dest, quality=92)
    else:
        img.save(dest)
    return dest, log


def _video_seconds(f: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                         capture_output=True, text=True).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def check(a: VisualAsset, f: Path, scene_len: float) -> dict:
    """Validation of the final file: exists, size, transparency, aspect (main), video length."""
    checks, status = [], "ok"

    def bad(msg, level="fail"):
        nonlocal status
        checks.append(f"{level}: {msg}")
        status = "fail" if level == "fail" or status == "fail" else "warn"

    if not f.exists():
        bad("file missing")
        return {"status": status, "checks": checks}
    ext = f.suffix.lower()
    if ext in VIDEO:
        info, dur = probe(f), _video_seconds(f)
        checks.append(f"video {info.get('width')}x{info.get('height')}, {dur:.1f} s")
        if scene_len and dur + 0.05 < scene_len:
            bad(f"video is {dur:.1f} s, the scene needs {scene_len:.1f} s (it will loop)", "warn")
        if (info.get("width") or 0) < 0.5 * a.output.width:
            bad("low resolution video", "warn")
    elif ext in IMAGE and ext != ".svg":
        from PIL import Image
        with Image.open(f) as img:
            w, h = img.size
            checks.append(f"image {w}x{h}")
            has_alpha = img.mode in ("RGBA", "LA", "PA") or "transparency" in img.info
            if a.output.transparent and not has_alpha:
                bad("transparent background required but the image has none")
            elif a.output.transparent and not is_transparent(img):
                bad("alpha channel but no transparent pixels (subject fills the frame?)", "warn")
            if a.role == "main" and a.output.width and a.output.height:
                want, have = a.output.width / a.output.height, w / h
                if abs(have - want) / want > 0.25:
                    bad(f"aspect {have:.2f} differs from {want:.2f} (it will be fitted)", "warn")
            if a.output.min_width and w < a.output.min_width:
                bad(f"width {w} < min {a.output.min_width}", "warn")
            if max(w / max(1, a.output.width), h / max(1, a.output.height)) < 0.5:
                bad("low resolution: regenerate larger if it looks soft", "warn")
    else:
        checks.append(f"{ext} file")
    return {"status": status, "checks": checks}
