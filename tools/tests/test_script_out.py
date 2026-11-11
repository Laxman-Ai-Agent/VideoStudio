import json

from pipeline.script_out import write_script


def test_script_txt_comes_from_the_corrected_json(tmp_path):
    (tmp_path / "input").mkdir()
    assert write_script(tmp_path) is None
    doc = lambda t: json.dumps({"scenes": [{"text": f"{t} one"}, {"text": " "}, {"text": f"{t} two"}]})  # noqa: E731
    (tmp_path / "input" / "gemini-transcript.json").write_text(doc("raw"), "utf-8")
    (tmp_path / "input" / "gemini_corrected.json").write_text(doc("fixed"), "utf-8")
    out = write_script(tmp_path)
    assert out == tmp_path / "output" / "script.txt" and out.read_text("utf-8") == "fixed one\nfixed two\n"
