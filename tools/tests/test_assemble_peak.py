"""05_Nvidia_CEO_Exit final failed QA at -0.9 dBTP: the final mix must end in a limiter under -1 dBFS."""
import math

from pipeline import assemble


def test_peak_guard_limits_below_qa_max():
    lim = float(assemble.PEAK_GUARD.split("limit=")[1].split(":")[0])
    assert 20 * math.log10(lim) < -1.5


def test_assemble_uses_peak_guard():
    src = open(assemble.__file__, encoding="utf-8").read()
    assert "{loudnorm_filter(m)},{PEAK_GUARD}" in src
