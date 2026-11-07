"""Builds map.js for the map template from Natural Earth (public domain). Run once by hand:

    tools\\.venv\\Scripts\\python.exe tools/templates/map/make_data.py <countries_ind.geojson> <states_50m.geojson>

Sources (github.com/nvkelso/natural-earth-vector, folder geojson): ne_10m_admin_0_countries_ind
(India's official point of view for borders) and ne_50m_admin_1_states_provinces (states of IN, US,
CN, BR, AU, CA, RU, ID, ZA). Rings are simplified (Douglas-Peucker) and rounded to 0.01 degree.
Output: window.MAP = {"countries": [{"n": name, "r": [[lon, lat, lon, lat, ...], ...]}], "states": [{"n", "a", "r"}]}
"""
import json
import sys
from pathlib import Path

TOL_COUNTRY, TOL_STATE = 0.04, 0.02  # degrees (~4 km / ~2 km)
MIN_PTS = 4


def dp(pts: list[tuple[float, float]], tol: float) -> list[tuple[float, float]]:
    """Douglas-Peucker, iterative (rings have up to ~100k points)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        norm = (dx * dx + dy * dy) ** 0.5
        best, idx = 0.0, -1
        for i in range(a + 1, b):
            x, y = pts[i]
            d = (abs(dy * (x - x1) - dx * (y - y1)) / norm if norm > 1e-12
                 else ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5)  # closed ring: first == last point
            if d > best:
                best, idx = d, i
        if best > tol and idx > 0:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def rings(geom: dict, tol: float) -> list[list[float]]:
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    out = []
    for poly in polys:
        ring = dp([tuple(p[:2]) for p in poly[0]], tol)  # outer ring only: holes don't matter at this scale
        if len(ring) >= MIN_PTS:
            out.append([round(v, 2) for p in ring for v in p])
    return out


def main(countries_file: str, states_file: str) -> None:
    c = json.loads(Path(countries_file).read_text("utf-8"))
    s = json.loads(Path(states_file).read_text("utf-8"))
    data = {"countries": [], "states": []}
    for f in c["features"]:
        if f["geometry"] and (r := rings(f["geometry"], TOL_COUNTRY)):
            data["countries"].append({"n": f["properties"]["NAME"], "r": r})
    for f in s["features"]:
        if f["geometry"] and (r := rings(f["geometry"], TOL_STATE)):
            data["states"].append({"n": f["properties"]["name"], "a": f["properties"]["admin"], "r": r})
    out = Path(__file__).with_name("map.js")  # a script tag loads it; a JSON fetch from file:// may be blocked
    out.write_text("window.MAP = " + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n", "utf-8")
    print(f"{out}: {len(data['countries'])} countries, {len(data['states'])} states, {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(*sys.argv[1:3])
