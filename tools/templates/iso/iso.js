// Isometric infographic engine (style grammar from lemo-opuscar "iso-infographic", MIT; code written here).
// Pure helpers (camAt, project, tones) are exported for node tests; drawing needs a canvas context.
(function (g) {
  const C30 = Math.cos(Math.PI / 6);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));
  const eio = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const back = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const mix = (a, b, t) => "rgb(" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t)).join(",") + ")";
  const tones = c => ({ top: mix(c, "#FFF8EC", .2), left: c, right: mix(c, "#231A2C", .22) });
  // camera keys [{t, x, y, zoom}] -> {x, y, zoom}; eased between keys, zoom interpolated in log space.
  // A slow drift (zoom +4% over the scene) keeps the picture moving even while a key holds.
  function camAt(keys, t, dur) {
    const k = keys && keys.length ? [...keys].sort((a, b) => a.t - b.t) : [{ t: 0 }];
    let a = k[0], b = k[0];
    for (const q of k) { if (q.t <= t) a = q; if (q.t >= t) { b = q; break; } b = q; }
    const f = b === a ? 0 : eio(seg(t, a.t, b.t)), za = a.zoom || 1, zb = b.zoom || 1;
    const lerp = (p, q) => p + (q - p) * f;
    return { x: lerp(a.x ?? NaN, b.x ?? NaN), y: lerp(a.y ?? NaN, b.y ?? NaN),
             zoom: Math.exp(lerp(Math.log(za), Math.log(zb))) * (1 + .04 * clamp(t / (dur || 1))) };
  }
  // world (x down-right, y down-left, z up) -> screen; cam = {x, y, k px per unit}
  function project(x, y, z, cam, W, H) {
    const ox = (cam.x - cam.y) * C30, oy = (cam.x + cam.y) * .5;
    return [W / 2 + ((x - y) * C30 - ox) * cam.k, H * .55 + ((x + y) * .5 - z - oy) * cam.k];
  }
  g.ISO = { C30, clamp, seg, eio, back, mix, tones, camAt, project };
  if (typeof module !== "undefined") module.exports = g.ISO;
})(typeof window !== "undefined" ? window : globalThis);
