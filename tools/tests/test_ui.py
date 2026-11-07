"""Visual Assets dashboard backend, end to end over HTTP against a temp projects folder."""
import io
import json
import sys
import threading
import urllib.error
import urllib.request
from pathlib import Path

import pytest
from PIL import Image

UI = Path(__file__).resolve().parents[2] / "ui" / "backend"
sys.path.insert(0, str(UI))
import server  # noqa: E402
import service  # noqa: E402


def _project(base: Path, name: str, assets: list) -> Path:
    p = base / name
    (p / "work").mkdir(parents=True)
    (p / "work" / "scenes.json").write_text(json.dumps({"scenes": [
        {"id": 1, "start": 0, "end": 2, "narration": "x", "visual_type": "photo", "query": "q"},
        {"id": 2, "start": 2, "end": 4, "narration": "y", "visual_type": "text", "query": "q"}]}), "utf-8")
    (p / "visual-assets.json").write_text(json.dumps({"project": {"title": name}, "assets": assets}), "utf-8")
    return p


@pytest.fixture()
def api(tmp_path, monkeypatch):
    monkeypatch.setattr(service, "PROJECTS", tmp_path)
    _project(tmp_path, "01_Alpha", [
        {"id": "A001", "name": "Hero", "category": "ai_image", "scenes": [1], "prompt": {"text": "alpha prompt", "negative": "no text"},
         "output": {"width": 64, "height": 36}},
        {"id": "A002", "name": "Sticker", "category": "sticker", "scenes": [1], "role": "overlay", "prompt": {"text": "keep me"}},
        {"id": "A003", "name": "Title", "category": "other", "scenes": [2], "method": "template"}])
    _project(tmp_path, "02_Beta", [{"id": "A001", "name": "Beta hero", "category": "photo", "prompt": {"text": "beta prompt"}}])
    httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{httpd.server_address[1]}"

    def call(method, path, body=None, headers=None):
        data = json.dumps(body).encode() if isinstance(body, dict) else body
        req = urllib.request.Request(base + path, data=data, method=method, headers=headers or {})
        try:
            with urllib.request.urlopen(req) as r:
                raw = r.read()
                return r.status, (json.loads(raw) if r.headers.get_content_type() == "application/json" else raw)
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read() or b"{}")
    yield call, tmp_path
    httpd.shutdown()


def _png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (128, 72), (10, 200, 90)).save(buf, "PNG")
    return buf.getvalue()


def test_projects_are_listed_and_isolated(api):
    call, _ = api
    st, projects = call("GET", "/api/projects")
    assert st == 200 and [p["id"] for p in projects] == ["01", "02"] and projects[0]["total"] == 3
    st, a = call("GET", "/api/projects/01/assets")
    assert st == 200 and a["counts"] == {"total": 3, "found": 1, "missing": 2}  # the template counts as found
    st, b = call("GET", "/api/projects/02/assets")
    assert [x["name"] for x in b["assets"]] == ["Beta hero"]
    assert call("GET", "/api/projects/01/assets/A001")[1]["prompt"]["text"] == "alpha prompt"
    assert call("GET", "/api/projects/02/assets/A001")[1]["prompt"]["text"] == "beta prompt"
    assert call("GET", "/api/projects/99/assets")[0] == 404


def test_prompt_save_changes_only_that_asset(api):
    call, root = api
    st, a = call("PUT", "/api/projects/01/assets/A001/prompt", {"text": "new words", "negative": "blur"},
                 {"Content-Type": "application/json"})
    assert st == 200 and a["prompt"]["text"] == "new words" and a["prompt"]["negative"] == "blur"
    saved = json.loads((root / "01_Alpha" / "visual-assets.json").read_text("utf-8"))
    by = {x["id"]: x for x in saved["assets"]}
    assert by["A001"]["prompt"]["text"] == "new words" and by["A002"]["prompt"]["text"] == "keep me"
    assert saved["project"]["title"] == "01_Alpha"  # unrelated data kept
    beta = json.loads((root / "02_Beta" / "visual-assets.json").read_text("utf-8"))
    assert beta["assets"][0]["prompt"]["text"] == "beta prompt"


def test_upload_validates_never_overwrites_and_replaces(api):
    call, root = api
    up = lambda name, data, q="": call("POST", f"/api/projects/01/assets/A001/upload{q}", data, {"X-Filename": name})  # noqa: E731
    assert up("x.gif", b"GIF89a")[0] == 400                      # type not allowed
    assert up("x.png", b"")[0] == 400                            # empty
    st, res = up("hero.png", _png())
    assert st == 200 and res["asset"]["found"] and res["asset"]["status"] == "validated"
    assert res["counts"] == {"total": 3, "found": 2, "missing": 1}
    first = res["asset"]["source_file"]
    assert (root / "01_Alpha" / res["asset"]["file"]).exists()
    assert up("again.png", _png())[0] == 409                     # no silent overwrite
    st, res2 = up("better.png", _png(), "?replace=1")
    assert st == 200 and res2["asset"]["source_file"] != first and (root / "01_Alpha" / first).exists()
    assert call("POST", "/api/projects/01/assets/A003/upload", _png(), {"X-Filename": "t.png"})[0] == 400  # template
    st, body = call("GET", f"/files/01/{res2['asset']['file']}")
    assert st == 200 and body[:8] == b"\x89PNG\r\n\x1a\n"
    assert call("GET", "/files/01/..%2F02_Beta%2Fvisual-assets.json")[0] == 404  # stays inside the project
    assert call("GET", "/")[0] == 200                             # the dashboard page itself
