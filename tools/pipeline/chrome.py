"""Headless system Chrome screenshot of a local HTML file (Telugu-safe, unlike Pillow on Windows)."""
import subprocess
from pathlib import Path

from .config import CACHE
from .doctor import CHROME_PATHS


def screenshot(html_file: Path, png_out: Path, width: int, height: int) -> None:
    chrome = next((p for p in CHROME_PATHS if p.exists()), None)
    if not chrome:
        raise FileNotFoundError("Chrome not found (studio doctor)")
    png_out.unlink(missing_ok=True)
    subprocess.run([str(chrome), "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--allow-file-access-from-files",
                    f"--user-data-dir={CACHE / 'chrome-storyboard'}",
                    f"--window-size={width},{height}",
                    f"--screenshot={png_out.resolve()}", html_file.resolve().as_uri()],
                   check=True, capture_output=True, timeout=120)
    if not png_out.exists():
        raise RuntimeError(f"Chrome did not write {png_out}")
