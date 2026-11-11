r"""kaggle\images.cmd NN [A010 A023 ...] [--out DIR] [--force]  |  kaggle\images.cmd prompts.json [--out DIR]
Generate AI image assets of a project with Z-Image-Turbo (Apache-2.0) on Kaggle GPU -> projects/NN/work/generated/<id>.png (processed into assets/, then deleted),
so `studio.cmd assets NN` picks them up unchanged. A topic with variations (03_Topic/16x9, /9x16): one run for all of them. Default ids: every asset with a prompt and method ai_generate
that has no file yet (no `file` in visual-assets.json and nothing in work/generated/). --force regenerates anyway.
--out DIR writes DIR/<id>.png instead of work/generated/ (test runs). prompts.json = free test prompts
([{"id", "prompt", "aspect_ratio"}]), images go to the folder next to it named like the file. Weights are downloaded inside the GPU run.
A rerun with the same ids resumes the previous Kaggle run instead of starting a new GPU run.
"""
import argparse
import hashlib
import json
import re
import shutil
import time
from pathlib import Path

from run import USER, WORK, find_project, kg, wait

HERE = Path(__file__).resolve().parent
KERNEL = f"{USER}/videostudio-images"
MARKER = WORK / "images_last_push.json"
# ~1 MP, multiples of 16 (Z-Image's native range; larger sizes cost T4 time and memory)
SIZES = {"16:9": (1344, 768), "9:16": (768, 1344), "1:1": (960, 960),  # 1024x1024 ran out of T4 memory (2026-11-11)
         "4:3": (1152, 864),
         "3:4": (864, 1152), "3:2": (1216, 832), "2:3": (832, 1216)}


def clean_prompt(text: str) -> str:
    """Z-Image draws a size written in the prompt ("768x1344") as text in the picture: the size goes in width / height only."""
    return re.sub(r"\s*,?\s*\d{3,4}\s*[x×X]\s*\d{3,4}", "", text)


def pick(p: Path, ids: list[str], force: bool) -> list[dict]:
    assets = json.loads((p / "visual-assets.json").read_text("utf-8"))["assets"]
    missing = set(ids) - {a["id"] for a in assets}
    if missing:
        raise SystemExit(f"unknown asset ids: {sorted(missing)}")
    jobs = []
    for a in assets:
        pr = a.get("prompt") or {}
        if ids and a["id"] not in ids or not ids and a.get("method") != "ai_generate" or not pr.get("text"):
            continue
        if not ids and (a.get("character") or "chatgpt" in pr.get("tool", "").lower()):
            continue  # presenter shots need the reference photo (ChatGPT image): the user makes them, Z-Image cannot
        if not ids and not force and (a.get("file") or any(f for d in ("drop", "work/generated") for f in (p / d).glob(a["id"] + ".*"))):
            print(f"  {a['id']}: has a file already, skipped (--force to regenerate)")
            continue
        w, h = SIZES.get(pr.get("aspect_ratio"), SIZES["16:9"])
        jobs.append({"id": a["id"], "prompt": clean_prompt(pr["text"]), "width": w, "height": h})
    return jobs


def topic_jobs(p: Path, ids: list[str], force: bool) -> tuple[list[dict], dict]:
    """Jobs of a project, or of every variation of a topic, plus where each image goes (folder, file name)."""
    vs = [d for d in sorted(p.iterdir()) if re.match(r"^\d+x\d+$", d.name) and (d / "visual-assets.json").exists()] or [p]
    jobs, dests = [], {}
    for v in vs:
        for j in pick(v, ids, force):
            name = j["id"] + ".png"
            if v != p:
                j["id"] = f"{v.name}_{j['id']}"  # 16x9_A001 and 9x16_A001 never clash in the kernel output
            dests[j["id"]] = (v / "work" / "generated", name)
            jobs.append(j)
    return jobs, dests


def main() -> int:
    ap = argparse.ArgumentParser(usage=__doc__)
    ap.add_argument("project")
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--out")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    if a.project.endswith(".json"):  # free prompts: [{"id": "tiger", "prompt": "...", "aspect_ratio": "16:9"}]
        p, items = Path(a.project), json.loads(Path(a.project).read_text("utf-8"))
        jobs = [{"id": i["id"], "prompt": i["prompt"], "width": SIZES[i.get("aspect_ratio", "16:9")][0],
                 "height": SIZES[i.get("aspect_ratio", "16:9")][1]} for i in items]
        a.out = a.out or str(p.with_suffix(""))
        dests = {}
    else:
        p = find_project(a.project)  # a topic with variations (03_Topic/16x9, /9x16): ONE Kaggle run for all of them
        jobs, dests = topic_jobs(p, a.ids, a.force)
    if not jobs:
        print(f"{p.name}: nothing to generate")
        return 0
    print(f"{p.name}: {len(jobs)} image(s): {[j['id'] for j in jobs]}")
    code = (HERE / "kernels" / "images" / "runner.py").read_text("utf-8").replace("JOBS = []", "JOBS = " + repr(jobs), 1)
    key = hashlib.sha256(code.encode()).hexdigest()  # same jobs AND same runner code, else a stale run would be reused
    s = kg("kernels", "status", KERNEL, check=False)
    if MARKER.exists() and MARKER.read_text("utf-8") == key and any(x in s for x in ("RUNNING", "QUEUED", "COMPLETE")):
        print("  resuming the previous Kaggle run (no new GPU run)")
    else:
        k = WORK / "images"
        shutil.rmtree(k, ignore_errors=True)
        k.mkdir(parents=True)
        (k / "runner.py").write_text(code, encoding="utf-8")
        shutil.copy(HERE / "kernels" / "images" / "kernel-metadata.json", k)
        print("  " + kg("kernels", "push", "-p", str(k)).strip().splitlines()[-1])
        MARKER.write_text(key, encoding="utf-8")
    t0 = time.monotonic()
    wait("kernel", ["kernels", "status", KERNEL], ("COMPLETE",), ("ERROR", "CANCEL"))
    print(f"  kernel finished in {time.monotonic() - t0:.0f} s (wall clock, includes queue)")
    out = WORK / "images-out"
    shutil.rmtree(out, ignore_errors=True)
    kg("kernels", "output", KERNEL, "-p", str(out))
    report = json.loads(next(out.rglob("report.json")).read_text("utf-8"))
    print("  report:", json.dumps(report))
    n = 0
    for j in jobs:
        got = next(out.rglob(f"{j['id']}.png"), None)
        if got:
            # work/generated: `studio.cmd assets` processes it into assets/A001.png, then deletes it
            folder, name = (Path(a.out), got.name) if a.out else dests[j["id"]]
            folder.mkdir(parents=True, exist_ok=True)
            shutil.copy(got, folder / name)
            n += 1
        else:
            print(f"  {j['id']}: FAILED ({report.get('error')})")
    print(f"  {n}/{len(jobs)} image(s) written to {a.out or sorted({str(f) for f, _ in dests.values()})}")
    if n == len(jobs):
        MARKER.unlink(missing_ok=True)
        if not a.out:
            print(f"  next: studio.cmd assets {a.project}")
    return 0 if n == len(jobs) else 1


if __name__ == "__main__":
    raise SystemExit(main())
