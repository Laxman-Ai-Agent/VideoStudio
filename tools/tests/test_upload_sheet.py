from pathlib import Path

from pipeline.upload_sheet import (COLS, NOT_FOUND, PRODUCT_LINKS, SHARED, SHORTS_PIN, TEXT_COLS, THUMB_TEXT,
                                   TITLE_OPTIONS, WIDTH, channel_projects, check_tags, merge, run_rows, scan, signature, youtube_tag_chars)
V16, S16, T16 = COLS["16x9"]
V9, S9, T9 = COLS["9x16"]
TI16, DE16, TG16 = TEXT_COLS["16x9"]
TI9, DE9, TG9 = TEXT_COLS["9x16"]


def touch(p: Path) -> Path:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(b"x")
    return p


def test_scan_takes_output_finals_and_input_thumbnail(tmp_path):
    p = tmp_path / "Healthdecode" / "01__15-NOV-2026__Walk"
    v16 = touch(p / "16x9" / "output" / "09_Walk_16x9.mp4")
    touch(p / "16x9" / "output" / "preview_16x9.mp4")
    s16 = touch(p / "16x9" / "output" / "script.txt")
    t16 = touch(p / "16x9" / "input" / "Thumb 16X9.png")
    touch(p / "16x9" / "input" / "audio.mp3")
    v9 = touch(p / "9x16" / "output" / "final_9x16.mp4")  # no script, no thumbnail yet
    got = scan(p)
    assert got == {V16: str(v16), S16: str(s16), T16: str(t16), V9: str(v9)}


def test_merge_keeps_user_columns_and_paths_sorts_by_date():
    b_row = [""] * WIDTH
    b_row[:2] = ["1", "03__11-NOV-2026__B"]
    b_row[V16], b_row[T16], b_row[TI16], b_row[DE16], b_row[V9] = "old.mp4", "kept_thumb.png", "My title", "Desc", NOT_FOUND
    a_row = ["2", "02__10-NOV-2026__A", "a.mp4"]
    rows = merge([b_row, a_row], {"03__11-NOV-2026__B": {V16: "new.mp4", V9: "b9.mp4"},
                                  "01__12-NOV-2026__C": {V16: "c.mp4"}})
    assert [r[1] for r in rows] == ["01__12-NOV-2026__C", "03__11-NOV-2026__B", "02__10-NOV-2026__A"]  # newest first
    assert [r[0] for r in rows] == [1, 2, 3]
    b = rows[1]
    assert b[V16] == "new.mp4" and b[T16] == "kept_thumb.png" and (b[TI16], b[DE16]) == ("My title", "Desc")
    assert b[S16] == NOT_FOUND and b[V9] == "b9.mp4"
    assert rows[2][V16] == "a.mp4" and rows[2][S16] == ""  # projects not scanned this run stay as they were
    assert all(len(r) == WIDTH for r in rows)


def test_channel_projects_needs_a_final_and_a_channel(tmp_path):
    touch(tmp_path / "The Dark World" / "02__10-NOV-2026__X" / "output" / "final_16x9.mp4")
    touch(tmp_path / "The Dark World" / "03__11-NOV-2026__Y" / "16x9" / "output" / "preview_16x9.mp4")
    touch(tmp_path / "01__09-NOV-2026__Z" / "output" / "final_16x9.mp4")  # not in a channel folder
    tabs = channel_projects(tmp_path)
    assert list(tabs["Dark_World"]) == ["02__10-NOV-2026__X"] and tabs["Health_Decode"] == {}


def test_metadata_fills_only_empty_text_cells(tmp_path):
    import json
    p = tmp_path / "The Dark World" / "02__10-NOV-2026__X"
    touch(p / "16x9" / "output" / "x_16x9.mp4")
    (p / "16x9" / "output" / "metadata.json").write_text(json.dumps(
        {"title": "T16", "description": "D16", "tags": ["a", "b"], "products": ["book", "kit"], "product_links": ["https://x/1"], "facebook": "FB", "pinned_comment": "PIN", "title_options": ["A", "B", "C"]}), "utf-8")
    touch(p / "9x16" / "output" / "x_9x16.mp4")
    (p / "9x16" / "output" / "metadata.json").write_text(json.dumps({"title": "T9", "tags": [], "pinned_comment": "PIN9"}), "utf-8")
    found = scan(p)
    assert found[TI16] == "T16" and found[DE16] == "D16" and found[TG16] == "a, b"
    assert found[SHARED["products"]] == "book\nkit" and found[PRODUCT_LINKS] == "https://x/1"
    assert found[SHARED["facebook"]] == "FB" and found[SHARED["pinned_comment"]] == "PIN" and found[SHORTS_PIN] == "PIN9"
    assert found[TITLE_OPTIONS] == "1. A\n2. B\n3. C" and found[TI9] == "T9"
    assert TG9 not in found and SHARED["instagram"] not in found
    own = [""] * WIDTH
    own[:2], own[TI16] = ["1", p.name], "My own title"
    rows = merge([own], {p.name: found})
    assert rows[0][TI16] == "My own title" and rows[0][DE16] == "D16" and rows[0][TI9] == "T9"


def test_signature_changes_when_a_thumbnail_lands_in_input(tmp_path):
    p = tmp_path / "Healthdecode" / "01__15-NOV-2026__Walk"
    touch(p / "16x9" / "output" / "w_16x9.mp4")
    touch(p / "16x9" / "work" / "scene.png")
    before = signature(tmp_path)
    touch(p / "16x9" / "work" / "other.png")  # work/ is not watched
    assert signature(tmp_path) == before
    touch(p / "16x9" / "input" / "thumb_16x9.png")
    assert signature(tmp_path) != before


def test_run_rows_finds_only_run_cells():
    col = [["▶ RUN"], [], ["✅ DONE"], ["run"], [""], ["⏳ RUNNING"], ["▶ START"], ["❌ ASK"]]
    assert run_rows(col) == [2, 5, 8]


def test_check_tags_flags_telugu_letters_and_the_500_limit():
    assert youtube_tag_chars(["a b", "cd"]) == 3 + 2 + 2 + 1
    assert check_tags(["thyroid lakshanalu", "thyroid telugu"]) == []
    assert check_tags(["థైరా"])[0].startswith("Telugu letters")
    assert "500" in check_tags(["x" * 30] * 17)[0]  # 17*30 + 16 commas = 526


def test_thumbnail_text_goes_to_x_and_y(tmp_path):
    import json
    from pipeline.upload_sheet import thumbnail_cell
    p = tmp_path / "Healthdecode" / "01__15-NOV-2026__W"
    for fmt, n in (("16x9", 5), ("9x16", 2)):
        touch(p / fmt / "output" / f"w_{fmt}.mp4")
        opts = [{"main": f"M{i}", "sub": f"S{i}", "highlight": f"M{i}", "visual": f"V{i}"} for i in range(n)]
        (p / fmt / "output" / "metadata.json").write_text(json.dumps({"thumbnail_text": opts}), "utf-8")
    found = scan(p)
    assert found[THUMB_TEXT["16x9"]].count("Visual:") == 5 and found[THUMB_TEXT["9x16"]].count("Visual:") == 2
    assert thumbnail_cell([{"main": "A", "sub": "B", "highlight": "A", "visual": "C"}]) == "1. A\n   B\n   Highlight: A · Visual: C"


def test_style_covers_every_column_once():
    from pipeline.upload_sheet import WIDTH
    from pipeline.upload_sheet_style import CATEGORIES, LAST, rgb
    cols = sorted(c for _, _, cs in CATEGORIES.values() for c in cs)
    assert cols == list(range(LAST)) and LAST == WIDTH
    assert rgb("#FF8000") == {"red": 1.0, "green": 128 / 255, "blue": 0.0}


def test_backup_build_pads_rows_and_keeps_headers():
    from pipeline.upload_sheet_backup import build
    snap = build({"Dark_World": [["S.No", "Project Name"], ["1", "09__16-NOV-2026__X", "a.mp4"]], "Health_Decode": []},
                 when="2026-11-18T10:00:00")
    dw = snap["tabs"]["Dark_World"]
    assert dw["headers"][:2] == ["S.No", "Project Name"] and len(dw["headers"]) == WIDTH
    assert dw["rows"] == [["1", "09__16-NOV-2026__X", "a.mp4"] + [""] * (WIDTH - 3)]
    assert snap["tabs"]["Health_Decode"] == {"headers": [], "rows": []} and snap["saved"] == "2026-11-18T10:00:00"


def test_sync_writes_json_first_then_sheet_and_refills_an_empty_tab(tmp_path, monkeypatch):
    import json
    import pipeline.upload_sheet as us
    import pipeline.upload_sheet_backup as bk
    order, written = [], {}
    snap_path = tmp_path / "upload_sheet.json"
    saved_row = ["1", "01__09-NOV-2026__Old", "old.mp4"] + [""] * (WIDTH - 3)
    snap_path.write_text(json.dumps({"saved": "x", "tabs": {"Health_Decode": {"headers": ["S.No"] + [""] * (WIDTH - 1),
                                                                               "rows": [saved_row]}}}), "utf-8")
    key = tmp_path / "key.json"
    key.write_text("{}")
    monkeypatch.setattr(us, "SHEET_KEY", key)
    monkeypatch.setattr(us, "_session", lambda: None)
    monkeypatch.setattr(bk, "SNAPSHOT", snap_path)
    monkeypatch.setattr(bk, "load", lambda path=snap_path: json.loads(snap_path.read_text("utf-8")))
    monkeypatch.setattr(bk, "read_tab", lambda s, tab: [])  # both tabs empty in the sheet
    real_save = bk.save
    monkeypatch.setattr(bk, "save", lambda snap, path=snap_path: (order.append("json"), real_save(snap, snap_path)))
    monkeypatch.setattr(bk, "write_sheet", lambda s, snap: (order.append("sheet"), written.update(snap["tabs"])))
    touch(tmp_path / "Healthdecode" / "02__10-NOV-2026__New" / "output" / "final_16x9.mp4")
    assert us.sync(tmp_path)
    assert order == ["json", "sheet"]
    names = [r[1] for r in written["Health_Decode"]["rows"]]
    assert names == ["02__10-NOV-2026__New", "01__09-NOV-2026__Old"]  # the emptied tab came back from the JSON
    assert json.loads(snap_path.read_text("utf-8"))["tabs"]["Health_Decode"]["rows"] == written["Health_Decode"]["rows"]


def test_merge_fills_upload_times_but_keeps_the_users_own():
    from pipeline.upload_sheet import REFRESH, SCHEDULE
    own = [""] * WIDTH
    own[1], own[23], own[24] = "01__09-NOV-2026__A", "20-Nov-2026 7:30 PM", "6:00 PM"  # user's own, old time-only default
    rows = merge([own], {"01__09-NOV-2026__A": {}, "02__10-NOV-2026__B": {}})
    by = {r[1]: r for r in rows}
    assert by["01__09-NOV-2026__A"][23] == "20-Nov-2026 7:30 PM" and by["01__09-NOV-2026__A"][24] == "09-Nov-2026 6:00 PM"
    assert [by["02__10-NOV-2026__B"][c] for c in SCHEDULE] == ["10-Nov-2026 5:00 PM"] + ["10-Nov-2026 6:00 PM"] * 3
    assert REFRESH == WIDTH - 1 and REFRESH not in SCHEDULE


def test_backup_last_column_letter_matches_width():
    from pipeline.upload_sheet_backup import LAST
    n = 0
    for ch in LAST:
        n = n * 26 + ord(ch) - 64
    assert n == WIDTH
