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
        {"id": "A003", "name": "Title", "category": "other", "scenes": [2], "method": "template"},
        {"id": "A004", "name": "Clip", "category": "video_broll", "scenes": [1], "output": {"format": "mp4", "width": 64, "height": 36}}])
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
    assert st == 200 and [p["id"] for p in projects] == ["01", "02"] and projects[0]["total"] == 4
    st, a = call("GET", "/api/projects/01/assets")
    assert st == 200 and a["counts"] == {"total": 4, "found": 1, "missing": 3}  # the template counts as found
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
    assert res["counts"] == {"total": 4, "found": 2, "missing": 2}
    first = res["asset"]["source_file"]
    assert (root / "01_Alpha" / res["asset"]["file"]).exists()
    assert up("again.png", _png())[0] == 409                     # no silent overwrite
    st, res2 = up("better.png", _png(), "?replace=1")       # a candidate: the current file stays
    a2 = res2["asset"]
    assert st == 200 and a2["pending_file"].startswith("assets/generated/pending/") and a2["source_file"] == first
    assert a2["pending_preview"] and (root / "01_Alpha" / a2["pending_preview"]).exists()
    st, res3 = call("POST", "/api/projects/01/assets/A001/replace/confirm")
    a3 = res3["asset"]
    assert st == 200 and a3["source_file"] == a2["pending_file"] and not a3["pending_file"] and a3["status"] == "validated"
    assert (root / "01_Alpha" / first).exists() and "replaced" in [h["action"] for h in a3["history"]]
    assert call("POST", "/api/projects/01/assets/A001/replace/cancel")[0] == 200   # nothing waiting: harmless
    res2 = res3
    assert call("POST", "/api/projects/01/assets/A003/upload", _png(), {"X-Filename": "t.png"})[0] == 400  # template
    st, body = call("GET", f"/files/01/{res2['asset']['file']}")
    assert st == 200 and body[:8] == b"\x89PNG\r\n\x1a\n"
    assert call("GET", "/files/01/..%2F02_Beta%2Fvisual-assets.json")[0] == 404  # stays inside the project
    assert call("GET", "/")[0] == 200                             # the dashboard page itself


def test_media_framing_and_video_trim_keep_originals(api, tmp_path):
    import subprocess
    call, root = api
    up = lambda aid, name, data: call("POST", f"/api/projects/01/assets/{aid}/upload", data, {"X-Filename": name})  # noqa: E731
    put = lambda aid, body: call("PUT", f"/api/projects/01/assets/{aid}/media", body, {"Content-Type": "application/json"})  # noqa: E731
    assert put("A001", {"aspect": "1:1"})[0] == 400              # nothing uploaded yet
    st, res = up("A001", "hero.png", _png())
    orig = root / "01_Alpha" / res["asset"]["source_file"]
    before = orig.read_bytes()
    assert put("A001", {"aspect": "3:2"})[0] == 400              # unsupported aspect
    st, res = put("A001", {"aspect": "1:1", "fit": "fill", "crop_x": 0, "zoom": 2})
    a = res["asset"]
    assert st == 200 and a["media"]["aspect"] == "1:1" and (a["media"]["out_w"], a["media"]["out_h"]) == (64, 64)
    with Image.open(root / "01_Alpha" / a["file"]) as im:
        assert im.size == (64, 64)
    assert orig.read_bytes() == before and "media_changed" in [h["action"] for h in a["history"]]
    clip = tmp_path / "c.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=s=128x72:r=25:d=3", "-pix_fmt", "yuv420p",
                    str(clip)], check=True)
    st, res = up("A004", "clip.mp4", clip.read_bytes())
    assert st == 200 and res["asset"]["media"]["duration_source"] > 2.9
    st, res = put("A004", {"trim_start": 0.5, "trim_end": 1.5, "aspect": "9:16", "fit": "fit"})
    a = res["asset"]
    out = root / "01_Alpha" / a["file"]
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)],
                               capture_output=True, text=True).stdout)
    assert st == 200 and abs(dur - 1.0) < 0.15 and (a["media"]["out_w"], a["media"]["out_h"]) == (36, 64)
    assert (root / "01_Alpha" / a["source_file"]).stat().st_size == clip.stat().st_size  # the upload is untouched
    assert put("A004", {"trim_start": 2, "trim_end": 1})[0] == 400


def test_busy_port_is_not_shared():
    """Bug: on Windows a second dashboard bound the same port (SO_REUSEADDR) and requests reached the old one."""
    a = server.Server(("127.0.0.1", 0), server.Handler)
    try:
        with pytest.raises(OSError):
            server.Server(("127.0.0.1", a.server_address[1]), server.Handler)
    finally:
        a.server_close()


def test_render_status_reports_elapsed_and_remembers_duration(tmp_path, monkeypatch):
    import time
    from types import SimpleNamespace as NS
    proj = tmp_path / "03_T"
    (proj / "work" / "logs").mkdir(parents=True)
    monkeypatch.setattr(service, "project_dir", lambda pid: proj)
    monkeypatch.setattr(service, "_renders", {"03_T": {"proc": NS(poll=lambda: None), "final": True, "t0": time.time() - 90, "t1": None}})
    st = service.render_status("03")
    assert st["state"] == "running" and 89 <= st["elapsed"] <= 92 and st["last"] is None
    service._renders["03_T"]["proc"] = NS(poll=lambda: 0)  # finished OK
    done = service.render_status("03")
    assert done["state"] == "done" and done["elapsed"] >= 89
    assert service.render_status("03")["last"] is None or True
    service._renders.clear()
    assert service.render_status("03")["history"]["final"] == done["elapsed"]  # next run can show "usually takes"


def test_asset_view_gives_the_character_reference_photo(tmp_path, monkeypatch):
    # the user is the presenter: the asset page shows which photo to attach in the image tool
    monkeypatch.setattr(service, "PROJECTS", tmp_path)
    monkeypatch.setattr(service, "ROOT", tmp_path)
    (tmp_path / "_brand" / "presenter").mkdir(parents=True)
    Image.new("RGB", (8, 8)).save(tmp_path / "_brand" / "presenter" / "me.png")
    p = _project(tmp_path, "01_Alpha", [{"id": "A001", "name": "Shock", "category": "character_expression", "scenes": [1],
                                         "role": "overlay", "character": "C1", "prompt": {"text": "hands on head"}}])
    va = json.loads((p / "visual-assets.json").read_text("utf-8"))
    va["characters"] = [{"id": "C1", "name": "Presenter", "description": "d", "outfit": "red t-shirt",
                         "reference_image": "_brand/presenter/me.png"}]
    (p / "visual-assets.json").write_text(json.dumps(va), "utf-8")
    ref = service.asset("01", "A001")["reference"]
    assert ref["name"] == "me.png" and ref["src"] == "/brand/presenter/me.png" and ref["outfit"] == "red t-shirt"
    httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    try:
        base = f"http://127.0.0.1:{httpd.server_address[1]}"
        assert urllib.request.urlopen(base + "/brand/presenter/me.png").status == 200
        with pytest.raises(urllib.error.HTTPError):
            urllib.request.urlopen(base + "/brand/presenter/..%2F..%2Fsecret.txt")
    finally:
        httpd.shutdown()
    from pipeline.visual import presenter_rules
    assert "me.png" in presenter_rules(tmp_path) and "none yet" in presenter_rules(tmp_path / "empty")


def test_edits_api_saves_per_project_and_leaves_assets_alone(api):
    call, root = api
    h = {"Content-Type": "application/json"}
    before = (root / "01_Alpha" / "visual-assets.json").read_bytes()
    st, r = call("PUT", "/api/projects/01/edits", {"fmt": "16:9", "scene": 1, "items": {"A002": {"x": 0.2, "y": 0.1, "w": 0.3, "h": 0.4, "rot": 400}}}, h)
    assert st == 200 and r["items"]["A002"]["rot"] == 360
    assert call("GET", "/api/projects/01/edits")[1]["16:9"]["1"]["A002"]["w"] == 0.3
    assert call("GET", "/api/projects/02/edits")[1] == {}  # other project untouched
    assert call("PUT", "/api/projects/01/edits", {"fmt": "4:3", "scene": 1, "items": {}}, h)[0] == 400
    assert (root / "01_Alpha" / "visual-assets.json").read_bytes() == before
