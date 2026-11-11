"""Extra facts for the Timeline render popup: last finished scene (from the `studio run` log), this PC's CPU / RAM /
disk, and a still frame of a finished scene clip. Real numbers only: nothing here is estimated or made up."""
import re
import shutil
import subprocess
from pathlib import Path

_cpu_last: list = []  # [(idle, busy)] of the previous sample


def last_scene(log: str) -> dict | None:
    """{id, template, seconds} of the most recently finished scene, None before the first one."""
    hits = re.findall(r"^\s+\S+ scene\s+(\d+) (\S+)\s+(?:rendered|failed)\s+(\d+)s", log, re.M)
    return {"id": int(hits[-1][0]), "template": hits[-1][1], "seconds": int(hits[-1][2])} if hits else None


def activity(log: str, n: int = 5) -> list[dict]:
    """The last n scene results of the log, newest first: [{id, template, status, seconds}]."""
    rows = re.findall(r"^\s+\S+ scene\s+(\d+) (\S+)\s+(rendered|failed)\s+(\d+)s", log, re.M)[-n:]
    return [{"id": int(i), "template": t, "status": s, "seconds": int(sec)} for i, t, s, sec in reversed(rows)]


def _memory() -> tuple[float, float]:
    """(free GB, total GB) of physical RAM (Windows GlobalMemoryStatusEx); (0, 0) when unreadable."""
    import ctypes

    class MS(ctypes.Structure):
        _fields_ = [("len", ctypes.c_ulong), ("load", ctypes.c_ulong)] + [(n, ctypes.c_ulonglong) for n in ("tot", "avail", "tpf", "apf", "tv", "av", "aev")]
    try:
        m = MS(len=ctypes.sizeof(MS))
        return (m.avail / 2**30, m.tot / 2**30) if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m)) else (0.0, 0.0)
    except Exception:  # noqa: BLE001 - not Windows
        return (0.0, 0.0)


def _cpu() -> int:
    """CPU busy % since the previous call (Windows GetSystemTimes); 0 on the first call or elsewhere."""
    import ctypes
    from ctypes import wintypes
    try:
        t = [wintypes.FILETIME() for _ in range(3)]
        ctypes.windll.kernel32.GetSystemTimes(*[ctypes.byref(x) for x in t])
        idle, kern, user = [(x.dwHighDateTime << 32) | x.dwLowDateTime for x in t]
    except Exception:  # noqa: BLE001
        return 0
    total, busy = kern + user, kern + user - idle  # kernel time includes idle
    prev, _cpu_last[:] = (_cpu_last[0] if _cpu_last else None), [(idle, total)]
    if not prev:
        return 0
    di, dt = idle - prev[0], total - prev[1]
    return round(100 * (1 - di / dt)) if dt > 0 else 0


def system(path: Path) -> dict:
    free, total = _memory()
    d = shutil.disk_usage(path)
    return {"cpu": _cpu(), "ram_used": round(total - free, 1), "ram_total": round(total, 1),
            "disk_free": round(d.free / 2**30), "disk_total": round(d.total / 2**30)}


def frame(clip: Path, dest: Path, at: float = 0.8) -> bool:
    """One JPEG frame (320 px wide) of a rendered scene clip."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    p = subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(at), "-i", str(clip), "-frames:v", "1", "-vf", "scale=360:-2", str(dest)],
                       capture_output=True, timeout=30)
    return p.returncode == 0 and dest.exists()
