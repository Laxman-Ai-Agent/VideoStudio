"""Visual Assets dashboard server (stdlib only, localhost). Start with `studio.cmd ui`.

    GET  /api/projects                                  project list with counts
    GET  /api/projects/<pid>/assets                     one project's visual-assets.json (+ found / preview)
    GET  /api/projects/<pid>/assets/<aid>               one asset
    PUT  /api/projects/<pid>/assets/<aid>/prompt        {"text": "...", "negative": "..."} -> saved asset
    PUT  /api/projects/<pid>/assets/<aid>/media         {aspect, fit, crop_x, crop_y, zoom, trim_start, trim_end}
    POST /api/projects/<pid>/assets/<aid>/upload[?replace=1]   raw file body, header X-Filename
    POST /api/projects/<pid>/assets/<aid>/replace/confirm | /replace/cancel
    GET  /files/<pid>/<path inside the project>         previews (Range supported for video)
    GET  /                                              the dashboard (ui/frontend)
"""
import json
import mimetypes
import re
import sys
import urllib.parse
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import service  # noqa: E402

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
MAX_BODY = service.MAX_VIDEO + 2**20
ASSET = re.compile(r"^/api/projects/([^/]+)/assets/([A-Za-z0-9_\-]+)(/prompt|/media|/upload|/replace/confirm|/replace/cancel)?$")


class Handler(BaseHTTPRequestHandler):
    server_version = "VideoStudioUI/1"

    def log_message(self, fmt, *args):  # quiet console; errors still print
        if len(args) > 1 and str(args[1])[:1] in "45":
            sys.stderr.write("  ui: " + fmt % args + "\n")

    # ---- helpers ----
    def _json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _error(self, e: Exception):
        status = {service.NotFound: 404, service.Invalid: 400, service.Conflict: 409}.get(type(e), 500)
        self._json({"error": str(e) or type(e).__name__}, status)

    def _body(self) -> bytes:
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise service.Invalid("upload too large")
        return self.rfile.read(n) if n else b""

    def _file(self, f: Path):
        size = f.stat().st_size
        ctype = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
        start, end = 0, size - 1
        rng = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range") or "")
        if rng and (rng[1] or rng[2]):
            start = int(rng[1]) if rng[1] else max(0, size - int(rng[2]))
            end = min(int(rng[2]), size - 1) if rng[1] and rng[2] else end
            self.send_response(HTTPStatus.PARTIAL_CONTENT)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        with open(f, "rb") as fh:
            fh.seek(start)
            left = end - start + 1
            while left > 0 and (chunk := fh.read(min(1 << 20, left))):
                self.wfile.write(chunk)
                left -= len(chunk)

    # ---- routes ----
    def do_GET(self):
        path = urllib.parse.unquote(urllib.parse.urlparse(self.path).path)
        try:
            if path == "/api/projects":
                return self._json(service.list_projects())
            if path == "/api/version":  # live update: the page polls this and reloads what changed
                pid = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("p", [""])[0]
                ui = max(f.stat().st_mtime for f in FRONTEND.rglob("*") if f.is_file())
                try:
                    data = (service.project_dir(pid) / "visual-assets.json").stat().st_mtime
                except Exception:  # noqa: BLE001 - no project / no file yet
                    data = 0
                return self._json({"ui": ui, "data": data})
            if m := re.match(r"^/api/projects/([^/]+)/assets$", path):
                return self._json(service.project_assets(m[1]))
            if (m := ASSET.match(path)) and not m[3]:
                return self._json(service.asset(m[1], m[2]))
            if m := re.match(r"^/files/([^/]+)/(.+)$", path):
                return self._file(service.file_path(m[1], m[2]))
            rel = "index.html" if path in ("/", "/index.html") else path.lstrip("/")
            f = (FRONTEND / rel).resolve()
            if f.is_relative_to(FRONTEND.resolve()) and f.is_file():
                return self._file(f)
            raise service.NotFound(path)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:  # noqa: BLE001 - every error becomes a JSON answer
            self._error(e)

    def do_PUT(self):
        m = ASSET.match(urllib.parse.urlparse(self.path).path)
        try:
            if not m or m[3] not in ("/prompt", "/media"):
                raise service.NotFound(self.path)
            data = json.loads(self._body() or b"{}")
            if m[3] == "/prompt":
                return self._json(service.save_prompt(m[1], m[2], data.get("text", ""), data.get("negative")))
            self._json(service.save_media(m[1], m[2], data))
        except json.JSONDecodeError:
            self._json({"error": "body must be JSON"}, 400)
        except Exception as e:  # noqa: BLE001
            self._error(e)

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        m = ASSET.match(url.path)
        try:
            if m and m[3] == "/replace/confirm":
                return self._json(service.confirm_replace(m[1], m[2]))
            if m and m[3] == "/replace/cancel":
                return self._json(service.cancel_replace(m[1], m[2]))
            if not m or m[3] != "/upload":
                raise service.NotFound(self.path)
            name = urllib.parse.unquote(self.headers.get("X-Filename") or "")
            replace = urllib.parse.parse_qs(url.query).get("replace", ["0"])[0] == "1"
            self._json(service.upload(m[1], m[2], name, self._body(), replace))
        except Exception as e:  # noqa: BLE001
            self._error(e)


PORT = 8790


def serve(port: int = PORT, open_browser: bool = True) -> None:
    """Listen on 127.0.0.1:port, or the next free port if another app already uses it."""
    for p in range(port, port + 20):
        try:
            httpd = ThreadingHTTPServer(("127.0.0.1", p), Handler)
            break
        except OSError:
            continue
    else:
        raise OSError(f"no free port in {port}-{port + 19}")
    url = f"http://127.0.0.1:{httpd.server_address[1]}/"
    print(f"  Visual Assets dashboard: {url}  (Ctrl+C to stop)")
    if open_browser:
        import webbrowser
        webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    serve(int(sys.argv[1]) if len(sys.argv) > 1 else PORT, open_browser=False)
