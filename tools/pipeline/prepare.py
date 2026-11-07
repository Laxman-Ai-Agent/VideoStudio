"""prepare stage: cut-out layers for fake parallax (rembg on CPU), opt-in per scene via
`params.parallax: true`. A failed or empty cut-out just means the scene renders as a plain photo."""
import os
from pathlib import Path

from .assets import IMAGE
from .config import MODELS
from .contracts import Prepared, PreparedScene, Resolved, ScenePlan

MODEL = os.environ.get("STUDIO_REMBG_MODEL", "silueta")  # 43 MB; isnet-general-use is sharper but 179 MB
MIN_SUBJECT, MAX_SUBJECT = 0.03, 0.85  # mask coverage outside this = no clear subject -> plain photo


def wanted(plan: ScenePlan, resolved: Resolved, root: Path) -> list[tuple[int, Path]]:
    by_id = {r.id: r for r in resolved.scenes}
    out = []
    for s in plan.scenes:
        r = by_id.get(s.id)
        if s.params.get("parallax") and r and r.asset and Path(r.asset).suffix.lower() in IMAGE:
            out.append((s.id, root / r.asset))
    return out


def cutout(src: Path, fg: Path, bg: Path, session) -> None:
    """fg = subject with alpha; bg = photo with the subject area replaced by a heavy blur, so the
    background shows no sharp double when the layers move apart."""
    from PIL import Image, ImageFilter, ImageStat
    from rembg import remove
    img = Image.open(src).convert("RGB")
    mask = remove(img, session=session, only_mask=True).convert("L")
    cover = ImageStat.Stat(mask).mean[0] / 255
    if not MIN_SUBJECT <= cover <= MAX_SUBJECT:
        raise ValueError(f"no clear subject (mask covers {cover:.0%})")
    r = max(4, min(img.size) // 40)
    hole = mask.point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(r // 2 * 2 + 1))
    Image.composite(img.filter(ImageFilter.GaussianBlur(r * 2)), img, hole.filter(ImageFilter.GaussianBlur(r))).save(bg)
    img.putalpha(mask)
    img.save(fg)


def prepare(plan: ScenePlan, resolved: Resolved, root: Path, out_dir: Path) -> Prepared:
    out_dir.mkdir(parents=True, exist_ok=True)
    todo = wanted(plan, resolved, root)
    res = Prepared()
    if not todo:
        return res
    os.environ.setdefault("U2NET_HOME", str(MODELS / "rembg"))
    try:
        from rembg import new_session
        session = new_session(MODEL)
    except Exception as e:  # noqa: BLE001 - no model/network: every scene falls back to a plain photo
        res.scenes = [PreparedScene(id=i, error=f"rembg: {type(e).__name__}: {e}") for i, _ in todo]
        return res
    for sid, src in todo:
        fg, bg = out_dir / f"scene_{sid:03d}_fg.png", out_dir / f"scene_{sid:03d}_bg.png"
        try:
            cutout(src, fg, bg, session)
            res.scenes.append(PreparedScene(id=sid, fg=fg.relative_to(root).as_posix(), bg=bg.relative_to(root).as_posix()))
        except Exception as e:  # noqa: BLE001 - isolation: this scene renders as a plain photo
            fg.unlink(missing_ok=True)
            bg.unlink(missing_ok=True)
            res.scenes.append(PreparedScene(id=sid, error=f"{type(e).__name__}: {e}"))
    return res
