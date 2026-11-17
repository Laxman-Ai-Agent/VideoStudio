from pathlib import Path

from pipeline.upload_sheet import NOT_FOUND, channel_projects, check_tags, merge, run_rows, scan, signature, youtube_tag_chars


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
    assert got == {2: str(v16), 3: str(s16), 4: str(t16), 8: str(v9)}


def test_merge_keeps_user_columns_and_paths_sorts_by_date():
    existing = [["1", "03__11-NOV-2026__B", "old.mp4", "", "kept_thumb.png", "My title", "Desc", "", NOT_FOUND],
                ["2", "02__10-NOV-2026__A", "a.mp4"]]
    rows = merge(existing, {"03__11-NOV-2026__B": {2: "new.mp4", 8: "b9.mp4"},
                            "01__12-NOV-2026__C": {2: "c.mp4"}})
    assert [r[1] for r in rows] == ["02__10-NOV-2026__A", "03__11-NOV-2026__B", "01__12-NOV-2026__C"]
    assert [r[0] for r in rows] == [1, 2, 3]
    b = rows[1]
    assert b[2] == "new.mp4" and b[4] == "kept_thumb.png" and b[5:7] == ["My title", "Desc"]
    assert b[3] == NOT_FOUND and b[8] == "b9.mp4"
    assert rows[0][2] == "a.mp4" and rows[0][3] == ""  # projects not scanned this run stay as they were
    assert all(len(r) == 24 for r in rows)


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
    assert found[5] == "T16" and found[6] == "D16" and found[7] == "a, b" and found[14] == "book\nkit" and found[19] == "https://x/1"
    assert found[15] == "FB" and found[17] == "PIN" and found[18] == "1. A\n2. B\n3. C" and found[11] == "T9" and found[20] == "PIN9" and found[17] == "PIN" and 13 not in found and 16 not in found
    rows = merge([["1", p.name, "", "", "", "My own title"]], {p.name: found})
    assert rows[0][5] == "My own title" and rows[0][6] == "D16" and rows[0][11] == "T9"


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
    assert found[21].count("Visual:") == 5 and found[22].count("Visual:") == 2
    assert thumbnail_cell([{"main": "A", "sub": "B", "highlight": "A", "visual": "C"}]) == "1. A\n   B\n   Highlight: A · Visual: C"
