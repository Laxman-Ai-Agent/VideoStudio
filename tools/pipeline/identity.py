"""identity: how alike two videos look (style memory) and repetition inside one video.

Style memory = the work/theme.json of every earlier project (fonts, palette, backgrounds, motion and the
creative `direction`). Nothing extra is stored, so no project data is ever discarded. Used by the plan
brief (what to stay away from), `studio.cmd theme NN` and QA (identity + variety checks).
User rule 2026-11-10: a new video is at most ~30% alike the previous videos; variety inside a video.
"""
import colorsys
from pathlib import Path

from .contracts import QACheck, ScenePlan, ThemeSpec
from .theme import MOTION_DEFAULT, _rgb

MAX_SIMILAR = 0.30  # max share of look features in common with any of the previous videos
LOOKBACK = 3        # previous videos compared (project folder order)
RUN = 3             # same transition this many cuts in a row = repetitive


def motion(t: ThemeSpec, brand_transitions=()) -> dict:
    """What the video really used: missing motion values = the defaults render applied."""
    m = {**MOTION_DEFAULT, **t.motion}
    m["transitions"] = list(m.get("transitions") or brand_transitions)
    return m


def _colour_close(a: str, b: str) -> float:
    """1 = same hue family (or both near-grey of similar lightness), 0 = clearly different."""
    try:
        (h1, l1, s1), (h2, l2, s2) = (colorsys.rgb_to_hls(*_rgb(x)) for x in (a, b))
    except ValueError:
        return 0.0
    grey1, grey2 = s1 < 0.15, s2 < 0.15
    if grey1 or grey2:
        return max(0.0, 1 - abs(l1 - l2) / 0.3) if grey1 == grey2 else 0.0
    d = min(abs(h1 - h2), 1 - abs(h1 - h2)) * 360
    return max(0.0, 1 - d / 40) * max(0.0, 1 - abs(l1 - l2) / 0.5)


def similarity(a: ThemeSpec, b: ThemeSpec, brand_transitions=()) -> tuple[float, list[str]]:
    """0..1 share of look features in common + the names of the shared ones."""
    ma, mb = motion(a, brand_transitions), motion(b, brand_transitions)
    eq = lambda x, y: 1.0 if x == y else 0.0  # noqa: E731
    ta, tb = set(ma["transitions"]), set(mb["transitions"])
    hero = lambda t: t.fonts.get("hero") or t.fonts.get("heading")  # noqa: E731
    parts = {  # weights sum to 1
        "heading font": (0.18, eq(a.fonts.get("heading"), b.fonts.get("heading"))),
        "body font": (0.10, eq(a.fonts.get("body"), b.fonts.get("body"))),
        "hero font": (0.05, eq(hero(a), hero(b))),
        "accent colour": (0.15, _colour_close(a.colors.get("accent", ""), b.colors.get("accent", ""))),
        "background colour": (0.10, _colour_close(a.colors.get("background", ""), b.colors.get("background", ""))),
        "background style": (0.10, sum(eq(a.background.get(k), b.background.get(k))
                                       for k in ("type", "pattern", "texture")) / 3),
        "text animation": (0.12, eq(ma["text_in"], mb["text_in"])),
        "camera move": (0.05, eq(ma["camera"], mb["camera"])),
        "transitions": (0.10, len(ta & tb) / len(ta | tb) if ta | tb else 1.0),
        "text shadow": (0.05, eq(a.text.get("shadow"), b.text.get("shadow"))),
    }
    return round(sum(w * v for w, v in parts.values()), 2), [k for k, (_, v) in parts.items() if v >= 0.5]


def previous(project: Path, n: int = LOOKBACK) -> list[tuple[str, ThemeSpec]]:
    """The n projects before this one (folder name order) that have a theme, newest first."""
    out = []
    for d in sorted((x for x in project.parent.iterdir() if x.is_dir() and x.name < project.name), reverse=True):
        f = d / "work" / "theme.json"
        if f.exists():
            try:
                out.append((d.name, ThemeSpec.model_validate_json(f.read_text("utf-8"))))
            except ValueError:
                continue
        if len(out) >= n:
            break
    return out


def describe(t: ThemeSpec, brand_transitions=()) -> str:
    """One line of style memory for a video."""
    m, d = motion(t, brand_transitions), t.direction
    look = f"{d.get('look', '')} | " if d.get("look") else ""
    return (f"{look}theme {t.name}; fonts {t.fonts.get('heading')} / {t.fonts.get('body')} / hero {t.fonts.get('hero')}; "
            f"bg {t.colors.get('background')} {t.background.get('type')} {t.background.get('pattern')} "
            f"{t.background.get('texture')}; accent {t.colors.get('accent')}; shadow {t.text.get('shadow')}; "
            f"text_in {m['text_in']}; camera {m['camera']}; transitions {m['transitions']}")


def memory_md(project: Path, brand_transitions=()) -> str:
    rows = [f"- {name}: {describe(t, brand_transitions)}" for name, t in previous(project)]
    return "\n".join(rows) or "(no earlier videos)"


def identity_check(project: Path, theme: ThemeSpec, brand_transitions=(), final: bool = False) -> QACheck:
    rows = [(name, *similarity(theme, t, brand_transitions)) for name, t in previous(project)]
    worst = max(rows, key=lambda r: r[1], default=None)
    if worst is None or worst[1] <= MAX_SIMILAR:
        detail = f"max {worst[1]:.0%} alike {worst[0]}" if worst else "no earlier videos"
        return QACheck(name="identity", status="ok", detail=detail + f" (limit {MAX_SIMILAR:.0%})")
    return QACheck(name="identity", status="fail" if final else "warn",
                   detail=f"{worst[1]:.0%} alike {worst[0]} (limit {MAX_SIMILAR:.0%}); shared: {', '.join(worst[2])}")


def variety_check(plan: ScenePlan, trans: dict[int, tuple[str, str]], final: bool = False) -> QACheck:
    """The same (non-cut) transition RUN cuts in a row. Visual type runs are already refused by ScenePlan."""
    outs = [(s.id, trans.get(s.id, ("", ""))[1]) for s in plan.scenes[:-1]]
    issues, run = [], 1
    for (_, prev), (sid, cur) in zip(outs, outs[1:]):
        run = run + 1 if cur and cur == prev else 1
        if run == RUN:
            issues.append(f"transition {cur!r} {RUN}x in a row (at scene {sid})")
    return QACheck(name="variety", status=("fail" if final else "warn") if issues else "ok",
                   detail="; ".join(issues) or f"no transition {RUN}x in a row")
