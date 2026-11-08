// Pure transform math for the Timeline "Visual Edit" (no DOM, tested with node: tools/tests/test_edits.py).
// A box is {x, y, w, h, rot}: top-left corner + size in frame pixels, rotation in degrees about its centre.
(function (root) {
  const rad = (d) => (d * Math.PI) / 180;
  const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const turn = (p, deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }; };
  const HANDLES = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };
  const MIN = 8;

  function toLocal(b, p) { const c = centre(b), q = turn({ x: p.x - c.x, y: p.y - c.y }, -b.rot); return q; }
  function hit(b, p) { const q = toLocal(b, p); return Math.abs(q.x) <= b.w / 2 && Math.abs(q.y) <= b.h / 2; }
  function move(b, dx, dy) { return { ...b, x: b.x + dx, y: b.y + dy }; }

  // Drag handle `hd` to frame point p; the opposite side/corner stays where it is. lock keeps the aspect ratio.
  function resize(b, hd, p, lock) {
    const [hx, hy] = HANDLES[hd], q = toLocal(b, p);
    const ax = -hx * b.w / 2, ay = -hy * b.h / 2;  // anchor, local to the old centre
    let w = hx ? Math.max(MIN, (q.x - ax) * hx) : b.w, h = hy ? Math.max(MIN, (q.y - ay) * hy) : b.h;
    if (lock) {
      const s = hx && hy ? Math.max(w / b.w, h / b.h) : hx ? w / b.w : h / b.h;
      w = Math.max(MIN, b.w * s); h = Math.max(MIN, b.h * s);
    }
    const lc = { x: hx ? ax + hx * w / 2 : 0, y: hy ? ay + hy * h / 2 : 0 }, c = centre(b), d = turn(lc, b.rot);
    return { ...b, x: c.x + d.x - w / 2, y: c.y + d.y - h / 2, w, h };
  }
  // Rotation handle sits above the box: angle from the centre to the pointer, 0 = straight up. snap (deg) optional.
  function rotate(b, p, snap) {
    const c = centre(b);
    let a = (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI + 90;
    a = ((a + 540) % 360) - 180;
    if (snap) a = Math.round(a / snap) * snap;
    return { ...b, rot: Math.round(a * 100) / 100 };
  }
  // Size to a percentage of `base` (the automatic size), about the centre.
  function scaleTo(b, pct, base) {
    const k = Math.max(0.02, pct / 100), w = base.w * k, h = base.h * k, c = centre(b);
    return { ...b, x: c.x - w / 2, y: c.y - h / 2, w, h };
  }
  function bounds(b) {  // axis-aligned box around the rotated one
    const c = centre(b), pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => turn({ x: i * b.w / 2, y: j * b.h / 2 }, b.rot));
    const xs = pts.map((q) => c.x + q.x), ys = pts.map((q) => c.y + q.y);
    return { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) };
  }
  function align(b, how, W, H) {
    const a = bounds(b);
    const dx = { left: -a.l, center: W / 2 - (a.l + a.r) / 2, right: W - a.r }[how];
    const dy = { top: -a.t, middle: H / 2 - (a.t + a.b) / 2, bottom: H - a.b }[how];
    return move(b, dx || 0, dy || 0);
  }
  function fit(b, W, H) {  // contain inside the frame, centred, upright
    const k = Math.min(W / b.w, H / b.h), w = b.w * k, h = b.h * k;
    return { ...b, x: (W - w) / 2, y: (H - h) / 2, w, h, rot: 0 };
  }
  // pixels <-> the saved fractions of the frame
  const toFrac = (b, W, H, extra) => ({ ...extra, x: b.x / W, y: b.y / H, w: b.w / W, h: b.h / H, rot: b.rot });
  const fromFrac = (m, W, H) => ({ x: m.x * W, y: m.y * H, w: m.w * W, h: m.h * H, rot: m.rot || 0 });

  const api = { HANDLES, hit, move, resize, rotate, scaleTo, bounds, align, fit, toFrac, fromFrac };
  if (typeof module !== "undefined") module.exports = api; else root.EditMath = api;
})(this);
