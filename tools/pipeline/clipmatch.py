"""match: pick the pictures / clips of drop/ that fit the scene plan, locally with CLIP (no Claude tokens).

Every image (and the middle frame of every video) and every scene `query` (English) become vectors with
CLIP (openai/clip-vit-base-patch32, ~600 MB in tools/models/huggingface, optional uv group `match`).
For each scene the best `TOP` file(s) are listed; a file that is in nobody's list is unused and (with --apply)
MOVED to drop/_unused/, never deleted. The report is short text: `scene 23 -> media (7).mp4 0.31`.
Embeddings are cached by file hash in <topic>/work/clip_cache.json, so a rerun only embeds new files.
"""
import io
import json
from collections.abc import Callable
from pathlib import Path

from .cull import UNUSED, files, video_frame
from .ingest import VIDEO

MODEL = "openai/clip-vit-base-patch32"
TOP = 1           # files kept per scene (raise to keep alternatives)
MIN_SCORE = 0.18  # cosine below this fits no scene. Measured 2026-11-11 on Whisk pictures: matching pairs 0.21-0.25,
#                   unrelated 0.13-0.18, so only a rough guide: look at the report before --apply


def dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def rank(files_: dict[str, list[float]], scenes: dict[int, list[float]], top: int = TOP, floor: float = MIN_SCORE):
    """-> ({scene: [(file, score)...]}, [unused files]). Vectors must be unit length."""
    best, used = {}, set()
    for sid, q in scenes.items():
        scored = sorted(((dot(v, q), f) for f, v in files_.items()), reverse=True)[:top]
        best[sid] = [(f, round(s, 3)) for s, f in scored]
        used.update(f for s, f in scored if s >= floor)
    return best, sorted(f for f in files_ if f not in used)


def load_clip():
    """-> (embed_images(list[PIL.Image]) -> vectors, embed_texts(list[str]) -> vectors), unit length."""
    import torch
    from transformers import CLIPModel, CLIPProcessor
    model, proc = CLIPModel.from_pretrained(MODEL).eval(), CLIPProcessor.from_pretrained(MODEL)

    def norm(t):
        return (t / t.norm(dim=-1, keepdim=True)).tolist()

    def images(imgs):
        with torch.no_grad():
            return norm(model.get_image_features(**proc(images=[i.convert("RGB") for i in imgs], return_tensors="pt")))

    def texts(txts):
        with torch.no_grad():
            return norm(model.get_text_features(**proc(text=txts, return_tensors="pt", padding=True, truncation=True)))

    return images, texts


def _image(path: Path):
    from PIL import Image
    if path.suffix.lower() in VIDEO:
        return Image.open(io.BytesIO(video_frame(path)[0]))
    return Image.open(path)


def embed_files(drop: Path, cache_file: Path, images: Callable, batch: int = 16) -> dict[str, list[float]]:
    from .assets import file_hash
    cache = json.loads(cache_file.read_text("utf-8")) if cache_file.exists() else {}
    todo = [(p, file_hash(p)) for p in files(drop)]
    new = [(p, h) for p, h in todo if h not in cache]
    for k in range(0, len(new), batch):
        chunk = new[k:k + batch]
        for (p, h), v in zip(chunk, images([_image(p) for p, _ in chunk])):
            cache[h] = v
    if new:
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps(cache), "utf-8")
    return {p.relative_to(drop).as_posix(): cache[h] for p, h in todo}


def queries(topic: Path) -> dict[str, str]:
    """'16x9:23' -> the English query of that scene, from every scenes.json of the topic (or of the project)."""
    out = {}
    for w in [topic] + sorted(d for d in topic.iterdir() if d.is_dir() and (d / "work" / "scenes.json").exists()):
        f = w / "work" / "scenes.json"
        if f.exists():
            for s in json.loads(f.read_text("utf-8"))["scenes"]:
                if s.get("query") and s.get("visual_type") in ("photo", "footage", "motion_graphic", "diagram"):
                    out[f"{w.name}:{s['id']}" if w != topic else str(s["id"])] = s["query"]
    return out


def match(topic: Path, apply: bool = False, clip=load_clip, log=print) -> dict:
    qs = queries(topic)
    if not qs:
        raise SystemExit("no scenes.json with queries yet: write the scene plan first")
    images, texts = clip()
    drop = topic / "drop"
    vecs = embed_files(drop, topic / "work" / "clip_cache.json", images)
    keys = list(qs)
    best, unused = rank(vecs, dict(zip(keys, texts([qs[k] for k in keys]))))
    for k in keys:
        log(f"  scene {k}: " + ", ".join(f"{f} {s}" for f, s in best[k]) + f"   [{qs[k][:60]}]")
    log(f"  {len(vecs) - len(unused)} files fit a scene, {len(unused)} {'moved to' if apply else 'for'} drop/{UNUSED}/")
    for f in unused:
        log(f"  {'moved' if apply else 'unused'}: {f}")
        if apply:
            dest = drop / UNUSED / f
            dest.parent.mkdir(parents=True, exist_ok=True)
            (drop / f).replace(dest)
    return {"best": best, "unused": unused}
