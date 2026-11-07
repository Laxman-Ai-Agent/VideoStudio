"""Pre-flight checks, so a long render never dies halfway on a missing tool."""
import re
import shutil
import subprocess
import sys
from pathlib import Path

from .config import CACHE_ENV, ENGINES, FIXTURE, ROOT

CHROME_PATHS = [
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
]


def _version(cmd: list[str]) -> str | None:
    exe = shutil.which(cmd[0])
    if not exe:
        return None
    out = subprocess.run([exe, *cmd[1:]], capture_output=True, text=True).stdout
    m = re.search(r"\d+(\.\d+)+", out)
    return m.group(0) if m else out.strip()[:40]


def _major(v: str | None) -> int:
    return int(v.split(".")[0]) if v else 0


def checks() -> list[tuple[str, str, str]]:
    """Returns (status, name, detail); status is 'ok', 'warn' or 'fail'."""
    r = []
    py = f"{sys.version_info.major}.{sys.version_info.minor}"
    r.append(("ok" if py == "3.12" else "fail", "Python", py))
    node = _version(["node", "--version"])
    r.append(("ok" if _major(node) >= 22 else "fail", "Node.js", node or "not found (need >= 22)"))
    for tool in ("ffmpeg", "ffprobe", "git"):
        v = _version([tool, "-version" if tool.startswith("ff") else "--version"])
        r.append(("ok" if v else "fail", tool, v or "not found"))

    hf = ENGINES / "hyperframes" / "node_modules" / "hyperframes" / "bin" / "hyperframes.mjs"
    r.append(("ok" if hf.exists() else "fail", "HyperFrames",
              "installed" if hf.exists() else "run: npm ci in tools/engines/hyperframes"))
    from .render import GSAP, TEMPLATES, load_template  # templates validate + GSAP bundled by HyperFrames
    bad = []
    names = sorted(d.name for d in TEMPLATES.iterdir() if (d / "template.json").exists())
    for t in names:
        try:
            load_template(t)
        except Exception as e:  # noqa: BLE001
            bad.append(f"{t}: {type(e).__name__}")
    r.append(("ok" if not bad and GSAP.exists() else "fail", "Templates",
              ", ".join(names) if not bad and GSAP.exists() else f"{bad or ''} gsap: {GSAP.exists()}"))
    chrome = next((p for p in CHROME_PATHS if p.exists()), None)
    r.append(("ok" if chrome else "fail", "Chrome (render)", str(chrome) if chrome else "not found"))

    e_free = shutil.disk_usage(ROOT).free // 2**30
    r.append(("ok" if e_free >= 20 else "fail", f"Disk {ROOT.drive}", f"{e_free} GB free (need >= 20)"))
    c_free = shutil.disk_usage("C:\\").free // 2**30
    r.append(("ok" if c_free >= 10 else "warn", "Disk C:", f"{c_free} GB free (caches are on E:, keep C: >= 10)"))

    off_drive = [k for k, v in CACHE_ENV.items() if v.drive != ROOT.drive]
    r.append(("ok" if not off_drive else "fail", "Caches on project drive",
              "all redirected" if not off_drive else f"not redirected: {off_drive}"))
    sample = FIXTURE / "audio.wav"
    r.append(("ok" if sample.exists() else "warn", "Test sample", str(sample) if sample.exists() else "missing"))
    return r


def run() -> int:
    icon = {"ok": "✓", "warn": "!", "fail": "✗"}
    results = checks()
    for status, name, detail in results:
        print(f"  {icon[status]} {name:<24} {detail}")
    failed = sum(s == "fail" for s, _, _ in results)
    print("\n  All good." if not failed else f"\n  {failed} check(s) failed.")
    return 1 if failed else 0
