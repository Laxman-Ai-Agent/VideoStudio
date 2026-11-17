/* cine_kit (11_Thyroid): fast cinematic documentary look, written fresh for this video (user brief 2026-11-16: big AI images,
   constant camera motion, frequent new compositions, dramatic transitions). Dark obsidian frame, amber = hormone / energy,
   teal = calm / healthy, crimson = attack / danger. Every shot = one big image layer (full screen or a large panel) with its own
   camera move (push, pull, pan, rise, orbit, crash) and entrance (cut, flash, whip, iris, slice, zoom, shutter, wipe).
   Text: huge condensed English words (masked rise / slam) + Telugu line; counters; tags with leader lines; pulse rings;
   ember particles, light leaks, letterbox bars. Scene code: const { ... } = CX; build; CX.done(). */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, V = H > W, u = Math.min(W, H) / 100;
  const C = S.colors || {};
  const K = { bg: C.background || "#06080B", amber: C.primary || "#FF9F43", teal: C.secondary || "#2DD4BF", red: C.warning || "#FF3B5C",
              ink: C.text || "#F5F1EA", mute: C.text2 || "#A9B3BC", gold: C.accent || "#FFD166" };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "expo.out", snap: "power4.out", io: "power3.inOut", soft: "sine.inOut", out: "power2.in", pop: "back.out(1.8)" };
  const IMG = S.images || [], B = P.beats || {};
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; background: ${K.bg}; }
  #stage { position: absolute; inset: 0; overflow: hidden; transform-origin: 50% 50%; }
  .cx-shot { position: absolute; overflow: hidden; background: #000; }
  .cx-shot .cx-im { position: absolute; inset: -9%; background: #111 no-repeat center / cover; filter: contrast(1.08) saturate(1.06); will-change: transform; }
  .cx-shot .cx-miss { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: ${K.mute}; font: 700 ${u * 2.4}px var(--font-script);
    letter-spacing: .3em; background: radial-gradient(circle at 50% 45%, #22303a, #07090c 70%); }
  .cx-shot .cx-sh { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 50%, transparent 55%, #000000b0 100%),
    linear-gradient(0deg, #000000a0, transparent 34%, transparent 80%, #00000060); }
  .cx-fx { position: absolute; inset: 0; pointer-events: none; }
  .cx-en { position: absolute; font: 800 ${u * (V ? 15 : 13)}px var(--font-head); line-height: .9; letter-spacing: -.01em; text-transform: uppercase; color: ${K.ink};
    white-space: nowrap; text-shadow: 0 ${u * .4}px ${u * 3}px #000000b0; }
  .cx-en .w { display: inline-block; overflow: hidden; vertical-align: top; padding: 0 .04em .06em; margin-right: .12em; }
  .cx-en .w > i { display: inline-block; font-style: normal; }
  .cx-te { position: absolute; font: 400 ${u * (V ? 5.6 : 4.2)}px var(--font); color: ${K.ink}; line-height: 1.35; text-shadow: 0 ${u * .3}px ${u * 2}px #000; white-space: nowrap; }
  .cx-te b { color: var(--c, ${K.amber}); font-weight: 400; }
  .cx-kick { position: absolute; font: 700 ${u * (V ? 2.8 : 2)}px var(--font-script); letter-spacing: .42em; text-transform: uppercase; color: var(--c, ${K.amber}); white-space: nowrap; }
  .cx-kick::before { content: ""; display: inline-block; width: ${u * 4}px; height: 2px; background: currentColor; vertical-align: middle; margin-right: ${u * 1.2}px; }
  .cx-num { position: absolute; font: 800 ${u * (V ? 26 : 24)}px var(--font-head); line-height: .85; color: ${K.ink}; letter-spacing: -.02em; white-space: nowrap; text-shadow: 0 0 ${u * 4}px #000; }
  .cx-num small { font-size: .32em; letter-spacing: .02em; color: var(--c, ${K.amber}); margin-left: .12em; }
  .cx-tag { position: absolute; display: flex; align-items: center; gap: ${u}px; font: 700 ${u * (V ? 3.2 : 2.3)}px var(--font-script); letter-spacing: .14em; text-transform: uppercase;
    color: ${K.ink}; white-space: nowrap; padding: ${u * .6}px ${u * 1.4}px; background: #05070acc; border-left: ${u * .5}px solid var(--c, ${K.amber}); }
  .cx-tag small { font: 400 ${u * (V ? 3.2 : 2.4)}px var(--font); letter-spacing: 0; text-transform: none; color: ${K.mute}; }
  .cx-bar { position: absolute; left: 0; right: 0; height: ${H * .1}px; background: #000; z-index: 30; }
  .cx-ring { position: absolute; border-radius: 50%; border: ${u * .35}px solid var(--c, ${K.amber}); box-shadow: 0 0 ${u * 2}px var(--c, ${K.amber}); }
  .cx-dot { position: absolute; border-radius: 50%; background: var(--c, ${K.amber}); box-shadow: 0 0 ${u * 1.2}px var(--c, ${K.amber}); }
  .cx-flash { position: absolute; inset: 0; background: #fff; opacity: 0; z-index: 40; pointer-events: none; }
  .cx-leak { position: absolute; width: ${W * 1.2}px; height: ${H * 1.4}px; top: ${-H * .2}px; left: 0; opacity: 0; z-index: 35; mix-blend-mode: screen; pointer-events: none;
    background: radial-gradient(ellipse at 50% 50%, ${K.amber}aa, ${K.red}44 35%, transparent 65%); }`;
  document.head.append(css);

  const $ = (id) => document.getElementById(id);
  const at = (k, d = 0) => (B[k] ?? d);
  const mk = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; (parent || stage()).append(e); return e; };
  function stage() { let s = $("stage"); if (!s) { s = document.createElement("div"); s.id = "stage"; $("root").append(s); } return s; }
  const place = (e, x, y, w, h) => { Object.assign(e.style, { left: x + "px", top: y + "px" }); if (w != null) e.style.width = w + "px"; if (h != null) e.style.height = h + "px"; return e; };
  const ix = (k) => (P.names || []).indexOf(k);
  const out = (e, t, d = .35, to = {}) => tl.to(e, { autoAlpha: 0, duration: d, ease: E.out, ...to }, t);
  const centre = (e) => { e.style.left = "0"; e.style.width = W + "px"; e.style.textAlign = "center"; };

  /* camera moves on the inner image (a = amount) */
  const MOVES = {
    push: (a) => [{ scale: 1 }, { scale: 1 + .2 * a }], pull: (a) => [{ scale: 1 + .24 * a }, { scale: 1 }],
    panL: (a) => [{ xPercent: 5 * a, scale: 1.04 }, { xPercent: -5 * a, scale: 1.04 }], panR: (a) => [{ xPercent: -5 * a, scale: 1.04 }, { xPercent: 5 * a, scale: 1.04 }],
    rise: (a) => [{ yPercent: 5 * a, scale: 1.06 }, { yPercent: -5 * a, scale: 1.06 }], sink: (a) => [{ yPercent: -5 * a, scale: 1.06 }, { yPercent: 5 * a, scale: 1.06 }],
    orbit: (a) => [{ rotation: -3 * a, scale: 1.16, xPercent: -3 * a }, { rotation: 3 * a, scale: 1.08, xPercent: 3 * a }],
    crash: (a) => [{ scale: 1 + .6 * a }, { scale: 1.02 }], drift: (a) => [{ scale: 1.05, xPercent: -1.5 * a }, { scale: 1.12, xPercent: 1.5 * a }],
  };
  /* one image shot. o: t start, d move length, mv move, a amount, in entrance, box [x,y,w,h], fx/fy focus (0-1), clip (css polygon), until */
  function shot(k, o = {}) {
    const t = o.t ?? 0, d = o.d ?? 3.2, b = o.box || [0, 0, W, H];
    const e = place(mk("div", "cx-shot", o.parent), ...b), im = mk("div", "cx-im", e); mk("div", "cx-sh", e);
    const i = ix(k); if (i >= 0 && IMG[i]) im.style.backgroundImage = `url("${IMG[i]}")`; else mk("div", "cx-miss", e, "IMAGE " + k);
    im.style.transformOrigin = `${(o.fx ?? .5) * 100}% ${(o.fy ?? .5) * 100}%`;
    if (o.clip) e.style.clipPath = o.clip;
    tl.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    const [fr, to] = MOVES[o.mv || "push"](o.a ?? 1);
    tl.fromTo(im, fr, { ...to, duration: d + .6, ease: o.mv === "crash" ? E.in : "none", immediateRender: true }, t);
    enter(e, t, o.in || "cut", o);
    if (o.until) out(e, o.until, .3);
    e.im = im; return e;
  }
  function enter(e, t, how, o = {}) {
    const fx = (o.fx ?? .5) * 100, fy = (o.fy ?? .5) * 100, base = o.clip || "inset(0% 0% 0% 0%)";
    if (how === "flash") flash(t, .35);
    else if (how === "whip") tl.fromTo(e, { xPercent: o.dir === -1 ? -100 : 100, filter: "blur(30px)" }, { xPercent: 0, filter: "blur(0px)", duration: .45, ease: E.snap, immediateRender: true }, t);
    else if (how === "iris") tl.fromTo(e, { clipPath: `circle(0% at ${fx}% ${fy}%)` }, { clipPath: `circle(150% at ${fx}% ${fy}%)`, duration: .9, ease: E.io, immediateRender: true }, t);
    else if (how === "slice") tl.fromTo(e, { clipPath: "inset(0% 50% 0% 50%)" }, { clipPath: base, duration: .7, ease: E.io, immediateRender: true }, t);
    else if (how === "shutter") tl.fromTo(e, { clipPath: "inset(50% 0% 50% 0%)" }, { clipPath: base, duration: .6, ease: E.snap, immediateRender: true }, t);
    else if (how === "wipe") tl.fromTo(e, { clipPath: o.dir === -1 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" }, { clipPath: base, duration: .7, ease: E.io, immediateRender: true }, t);
    else if (how === "zoom") tl.fromTo(e, { scale: 1.5, opacity: 0, filter: "blur(18px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: .7, ease: E.in, immediateRender: true }, t);
    else if (how === "rise") tl.fromTo(e, { yPercent: 100 }, { yPercent: 0, duration: .7, ease: E.snap, immediateRender: true }, t);
    else if (how === "drop") tl.fromTo(e, { yPercent: -100 }, { yPercent: 0, duration: .7, ease: E.snap, immediateRender: true }, t);
    else if (how === "fade") tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: .6, ease: E.soft, immediateRender: true }, t);
  }
  /* split screen: n panels side by side (V: stacked) with slanted seams; each panel its own image, move and stagger */
  function split(ks, t, o = {}) {
    const n = ks.length, L = V ? H : W, X = V ? W : H, s = L * (o.skew ?? 4) / 100, g = o.gap ?? u * .4;
    const seam = (j, top) => (j <= 0 ? 0 : j >= n ? L : j * L / n + (top ? s : -s));  // seam j: slanted line between panel j-1 and j
    return ks.map((k, j) => {
      const x0 = j * L / n - s, x1 = (j + 1) * L / n + s, lT = seam(j, 1) - x0 + (j ? g : 0), lB = seam(j, 0) - x0 + (j ? g : 0), rT = seam(j + 1, 1) - x0, rB = seam(j + 1, 0) - x0;
      const clip = V ? `polygon(0px ${lT}px, ${X}px ${lB}px, ${X}px ${rB}px, 0px ${rT}px)` : `polygon(${lT}px 0px, ${rT}px 0px, ${rB}px ${X}px, ${lB}px ${X}px)`;
      const box = V ? [0, x0, W, x1 - x0] : [x0, 0, x1 - x0, H];
      return shot(k, { t: t + j * (o.stag ?? .3), d: o.d ?? 3, mv: (o.mvs || [])[j] || (j % 2 ? "rise" : "sink"), a: .7, in: o.in || (V ? "whip" : (j % 2 ? "drop" : "rise")), dir: j % 2 ? -1 : 1,
                       clip, box, fx: (o.fxs || [])[j], until: o.until, parent: o.parent });
    });
  }
  /* big title: words rise from masks (slam: scale punch). <em>word</em> takes the accent colour (o.c) */
  function title(en, t, o = {}) {
    const hot = `<b style="color:${o.c || K.amber};font-weight:inherit">`;
    const words = en.split(" ").map((w) => `<span class="w"><i>${w.replace(/<em>/g, hot).replace(/<\/em>/g, "</b>")}</i></span>`);
    const e = mk("div", "cx-en", o.parent, words.join(""));
    place(e, o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .14 : .6)); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.align === "center") centre(e);
    const parts = e.querySelectorAll(".w > i");
    if (o.slam) tl.fromTo(parts, { scale: 2.4, opacity: 0, filter: "blur(12px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: .45, ease: E.snap, stagger: .08, immediateRender: true }, t);
    else tl.fromTo(parts, { yPercent: 110 }, { yPercent: 0, duration: .6, ease: E.in, stagger: .07, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e;
  }
  function te(html, t, o = {}) { const e = place(mk("div", "cx-te", o.parent, html), o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .3 : .78)); if (o.c) e.style.setProperty("--c", o.c);
    if (o.size) e.style.fontSize = u * o.size + "px"; if (o.align === "center") centre(e);
    tl.fromTo(e, { opacity: 0, y: u * 2, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: .5, ease: E.in, immediateRender: true }, t); if (o.until) out(e, o.until); return e; }
  function kick(text, t, o = {}) { const e = place(mk("div", "cx-kick", o.parent, text), o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .1 : .53)); if (o.c) e.style.setProperty("--c", o.c);
    if (o.align === "center") centre(e);
    tl.fromTo(e, { opacity: 0, letterSpacing: ".9em" }, { opacity: 1, letterSpacing: ".42em", duration: .7, ease: E.in, immediateRender: true }, t); if (o.until) out(e, o.until); return e; }
  /* counter: big number counting up; fmt formats the value; unit = small coloured suffix */
  function num(from, to, t, o = {}) {
    const e = place(mk("div", "cx-num", o.parent), o.x ?? W * .06, o.y ?? H * .3); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.c) e.style.setProperty("--c", o.c);
    if (o.align === "center") centre(e);
    const f = o.fmt || ((v) => Math.round(v)), sm = o.unit ? `<small>${o.unit}</small>` : "", v = { v: from }; e.innerHTML = f(from) + sm;
    tl.fromTo(e, { opacity: 0, scale: 1.3 }, { opacity: 1, scale: 1, duration: .4, ease: E.snap, immediateRender: true }, t);
    tl.fromTo(v, { v: from }, { v: to, duration: o.d ?? 1.4, ease: "power2.out", immediateRender: true, onUpdate: () => { e.innerHTML = f(v.v) + sm; } }, t);
    if (o.until) out(e, o.until); return e;
  }
  /* tag with a leader line from (px, py) on the image to the label at (x, y) + pulse ring at the point */
  function tag(html, px, py, x, y, t, o = {}) {
    const c = o.c || K.amber, s = place(mk("div", "cx-fx", o.parent), 0, 0, W, H);
    s.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0"><path d="M${px} ${py} L${x} ${y}" stroke="${c}" stroke-width="${u * .25}" fill="none"/></svg>`;
    const p = s.querySelector("path"), L = Math.hypot(x - px, y - py) + 1; p.style.strokeDasharray = L;
    tl.fromTo(p, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: .45, ease: E.io, immediateRender: true }, t);
    const dot = place(mk("div", "cx-dot", s), px - u * .7, py - u * .7, u * 1.4, u * 1.4); dot.style.setProperty("--c", c);
    tl.fromTo(dot, { scale: 0 }, { scale: 1, duration: .3, ease: E.pop, immediateRender: true }, t);
    ring(px, py, t, { c, r: u * 5, n: 2, parent: s });
    const box = place(mk("div", "", s), x, y); box.style.position = "absolute"; box.style.transform = `translate(${x < px ? "-100%" : "0"}, -50%)`;
    const e = mk("div", "cx-tag", box, html); e.style.position = "relative"; e.style.setProperty("--c", c);
    tl.fromTo(e, { opacity: 0, x: x < px ? u * 3 : -u * 3 }, { opacity: 1, x: 0, duration: .45, ease: E.in, immediateRender: true }, t + .3);
    if (o.until) out(s, o.until); return s;
  }
  function ring(x, y, t, o = {}) { const r = o.r || u * 8, n = o.n || 3;
    for (let i = 0; i < n; i++) { const e = place(mk("div", "cx-ring", o.parent), x - r, y - r, r * 2, r * 2); e.style.setProperty("--c", o.c || K.amber);
      gsap.set(e, { opacity: 0 });
      tl.fromTo(e, { scale: .1, opacity: .95 }, { scale: 1, opacity: 0, duration: o.d || 1.4, ease: "power1.out", immediateRender: false }, t + i * .35); } }
  const flash = (t, d = .3) => { const f = mk("div", "cx-flash", $("root")); tl.fromTo(f, { opacity: .85 }, { opacity: 0, duration: d, ease: "power2.out", immediateRender: false }, t);
    tl.set(f, { opacity: 0 }, 0); };
  const leak = (t, d = 1.6) => { const L = mk("div", "cx-leak", $("root")); tl.fromTo(L, { x: -W * 1.2, opacity: 0 }, { x: -W * .1, opacity: .75, duration: d / 2, ease: E.soft, immediateRender: true }, t);
    tl.to(L, { x: W * 1.1, opacity: 0, duration: d / 2, ease: E.soft }, t + d / 2); };
  /* letterbox bars slide in (on) / out (landscape only) */
  let bars = null;
  function scope(t, on = true) { if (V) return;
    if (!bars) { bars = [mk("div", "cx-bar", $("root")), mk("div", "cx-bar", $("root"))]; bars[0].style.top = "0"; bars[1].style.bottom = "0";
      bars[0].style.transformOrigin = "50% 0"; bars[1].style.transformOrigin = "50% 100%"; tl.set(bars, { scaleY: 0 }, 0); }
    tl.to(bars, { scaleY: on ? 1 : 0, duration: .6, ease: E.io }, t); }
  /* drifting embers over everything (deterministic positions) */
  function embers(n = 26, c = K.amber) { const L = mk("div", "cx-fx", $("root")); L.style.zIndex = 20;
    for (let i = 0; i < n; i++) { const r = (i * 7919 % 97) / 97, q = (i * 104729 % 89) / 89, s = u * (.25 + r * .6);
      const d = place(mk("div", "cx-dot", L), W * q, H * (.3 + r * .8), s, s); d.style.setProperty("--c", c);
      tl.fromTo(d, { y: 0, x: 0, opacity: 0 }, { y: -H * (.4 + r * .5), x: u * (q - .5) * 20, opacity: .2 + r * .6, duration: Math.max(D, 1), ease: "none", immediateRender: true }, 0); }
    return L; }
  /* big arrow (up / down) that springs in; s = height px */
  function arrow(up, x, y, s, c, t, o = {}) {
    const e = mk("div", "cx-fx", o.parent); e.style.inset = "auto"; place(e, x - s * .35, y - s / 2, s * .7, s);
    e.innerHTML = `<svg viewBox="0 0 70 100" width="${s * .7}" height="${s}" style="overflow:visible;filter:drop-shadow(0 0 ${u}px ${c})"><path d="${up ? "M35 0 L70 42 L48 42 L48 100 L22 100 L22 42 L0 42 Z" : "M35 100 L70 58 L48 58 L48 0 L22 0 L22 58 L0 58 Z"}" fill="${c}"/></svg>`;
    tl.fromTo(e, { y: up ? s * .4 : -s * .4, opacity: 0, scale: .6 }, { y: 0, opacity: 1, scale: 1, duration: .5, ease: E.pop, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e;
  }
  /* slam word helper: one huge word, punch-in, gone at until */
  const slam = (txt, t, until, o = {}) => title(txt, t, { slam: true, size: o.size ?? 15, align: o.align, x: o.x, y: o.y ?? H * (V ? .3 : .62), c: o.c, until });
  /* whole-stage camera move (push / tilt over every layer) */
  const cam = (t, d, to) => tl.to($("stage"), { duration: d, ease: E.io, ...to }, t);
  window.CX = { S, P, W, H, D, V, u, K, tl, E, at, $, mk, place, ix, out, shot, enter, split, title, te, kick, num, tag, ring, flash, leak, scope, embers, cam, arrow, slam,
                done: () => finish(tl) };
})();
