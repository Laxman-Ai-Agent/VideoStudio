"""Headless system Chrome screenshot of a local HTML file (Telugu-safe, unlike Pillow on Windows)."""
import subprocess
from pathlib import Path

from .config import CACHE
from .doctor import CHROME_PATHS


def screenshot(html_file: Path | str, png_out: Path, width: int, height: int, transparent: bool = False) -> None:
    """Local HTML file, or an http(s) URL (web page capture: 1.5x pixels, 8 s for scripts to settle)."""
    web = isinstance(html_file, str)
    chrome = next((p for p in CHROME_PATHS if p.exists()), None)
    if not chrome:
        raise FileNotFoundError("Chrome not found (studio doctor)")
    png_out.unlink(missing_ok=True)
    subprocess.run([str(chrome), "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--allow-file-access-from-files",
                    f"--user-data-dir={CACHE / 'chrome-storyboard'}",
                    f"--window-size={width},{height}",
                    *(["--force-device-scale-factor=1.5", "--virtual-time-budget=8000"] if web else []),
                    *(["--default-background-color=00000000"] if transparent else []),
                    f"--screenshot={png_out.resolve()}", html_file if web else html_file.resolve().as_uri()],
                   check=True, capture_output=True, timeout=120)
    if not png_out.exists():
        raise RuntimeError(f"Chrome did not write {png_out}")
