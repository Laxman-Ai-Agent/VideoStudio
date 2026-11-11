// In-scene compositions of the photo template (params.layout). Boxes are fractions of the frame: [x, y, w, h].
// Returns {img: end box of the main picture, from: its start box (crop), img2: second picture, text: title area}.
(function (g) {
  const pad = (b, m) => [b[0] + b[2] * m, b[1] + b[3] * m, b[2] * (1 - 2 * m), b[3] * (1 - 2 * m)];
  function photoLayout(layout, side, W, H, two) {
    const portrait = H > W, flip = side === "right" || side === "bottom";
    const half = (first) => portrait ? [0, first !== flip ? 0 : .5, 1, .5] : [first !== flip ? 0 : .5, 0, .5, 1];
    if ((layout === "split2" || layout === "stack") && !two) layout = "split_text";  // no second picture
    if (layout === "split_text") return { img: half(true), text: pad(half(false), .08) };
    if (layout === "split2") return { img: half(true), img2: half(false) };
    if (layout === "stack") return { img: [0, 0, 1, .5], img2: [0, .5, 1, .5] };
    if (layout === "crop") {  // full frame shrinks to a 1:1 square on one side, the title takes the rest
      const s = portrait ? W / H : H / W;
      const img = portrait ? [0, flip ? 1 - s : 0, 1, s] : [flip ? 1 - s : 0, 0, s, 1];
      const rest = portrait ? [0, flip ? 0 : s, 1, 1 - s] : [flip ? 0 : s, 0, 1 - s, 1];
      return { from: [0, 0, 1, 1], img, text: pad(rest, .08) };
    }
    return { img: [0, 0, 1, 1] };
  }
  // params.dim / text_until: when the title leaves (0 = stays) and the dim window [on, off] (off 0 = stays dim).
  // dim without text_until: the title leaves at 65% of the scene so the picture is seen bright again.
  function textWindow(p, tIn, dur, hasText) {
    let until = p.text_until || (p.dim ? dur * 0.65 : 0);
    if (!hasText || until >= dur - 0.3) until = 0;
    return { until, dim: hasText && p.dim ? [tIn, until] : null, level: typeof p.dim === "number" ? p.dim : 0.5 };
  }
  g.photoLayout = photoLayout;
  g.textWindow = textWindow;
  if (typeof module !== "undefined") module.exports = { photoLayout, textWindow };
})(typeof window !== "undefined" ? window : globalThis);
