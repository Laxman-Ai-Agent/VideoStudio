/* cyclone_kit (10 Cyclone_Akwan): "eye of the storm" cinematic weather-desk look, written fresh for this video (plan.md 2026-11-18).
   Deep sea-slate night; storm cyan = data / the storm, alert red / orange / yellow only for alerts, ink = text.
   Core (this file): atmo (moving isobars + lat/lon grid + drifting cloud texture), shot (full-bleed or monitor frame with corner
   coordinates + SAT tag), radar / iris / wipe / cloud reveals, cloudwipe (cloud band transition), head (Teko caps, radar scan bar),
   te (NTR line, cyan bar), tag (alert chip), num, callout, list, chips, stamp, phone, doc, ring, flash, cam, out, morph.
   Weather parts in ck2.js (swirl, bay map, cal3, ladder, dial, xsec, gauge, wheel, mast, clock24). Scene code: const {...} = CK; build; CK.done(). */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, V = H > W, u = Math.min(W, H) / 100;
  const C = S.colors || {};
  const K = { bg: C.background || "#06121A", cy: C.primary || "#3FE0FF", red: C.secondary || "#FF3B3B", or: C.accent || "#FF9A1F", yl: C.highlight || "#FFD23F",
              ink: C.text || "#ECF5F9", mute: C.text2 || "#89A4B4", deep: "#030A10", land: "#163C4E", panel: C.panel || "rgba(6,22,32,0.86)", ok: "#4BE39A" };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "expo.out", snap: "power4.out", io: "power3.inOut", soft: "sine.inOut", out: "power2.in", pop: "back.out(1.7)" };
  const IMG = S.images || [], B = P.beats || {};
  const css = document.createElement("style");
  css.textContent = `
  html, body { background: ${K.bg} !important; }
  html body #root { overflow: hidden; background: radial-gradient(ellipse at 60% 30%, #0C2633, ${K.bg} 72%) !important; }
  #stage { position: absolute; inset: 0; overflow: hidden; transform-origin: 50% 50%; }
  .ck-atmo { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
  .ck-shot { position: absolute; overflow: hidden; background: ${K.deep}; }
  .ck-shot .ck-im { position: absolute; inset: -8%; background: #0a1b24 no-repeat center / cover; filter: contrast(1.07) saturate(.9) hue-rotate(-4deg); will-change: transform; }
  .ck-shot .ck-miss { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: ${K.mute}; font: 600 ${u * 2.4}px var(--font-script);
    letter-spacing: .3em; background: radial-gradient(circle at 50% 45%, #15384a, ${K.deep} 70%); }
  .ck-shot .ck-sh { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 45%, transparent 52%, #030A10c0 100%),
    linear-gradient(0deg, #030A10b8, transparent 32%, transparent 84%, #030A1060); }
  .ck-shot .ck-tint { position: absolute; inset: 0; background: #0b3a52; mix-blend-mode: soft-light; opacity: .55; pointer-events: none; }
  .ck-shot.fr { border-radius: ${u * .4}px; box-shadow: 0 ${u * 1.8}px ${u * 6}px #000000c8, 0 0 0 ${Math.max(1, u * .15)}px #3FE0FF55; }
  .ck-shot.fr .ck-sh { background: linear-gradient(0deg, #030A1090, transparent 35%); }
  .ck-co { position: absolute; z-index: 3; font: 600 ${u * (V ? 2.4 : 1.7)}px var(--font-script); letter-spacing: .14em; color: ${K.cy}; opacity: .9; }
  .ck-sat { position: absolute; z-index: 3; top: ${u * 1.1}px; left: ${u * 1.2}px; display: flex; gap: ${u * .6}px; align-items: center;
    font: 700 ${u * (V ? 2.8 : 2.1)}px var(--font-script); letter-spacing: .2em; text-transform: uppercase; color: ${K.ink}; }
  .ck-sat i { width: ${u * 1.1}px; height: ${u * 1.1}px; border-radius: 50%; background: var(--c, ${K.red}); box-shadow: 0 0 ${u}px var(--c, ${K.red}); }
  .ck-cross { position: absolute; z-index: 3; border: 0 solid ${K.cy}; width: ${u * 2.4}px; height: ${u * 2.4}px; }
  .ck-fx { position: absolute; inset: 0; pointer-events: none; }
  .ck-cw { position: absolute; top: -10%; height: 120%; z-index: 45; pointer-events: none; }
  .ck-en { position: absolute; font: 600 ${u * (V ? 9.4 : 8.6)}px var(--font-head); line-height: .92; letter-spacing: .01em; text-transform: uppercase; color: ${K.ink};
    white-space: nowrap; text-shadow: 0 ${u * .4}px ${u * 3}px #000000b8; }
  .ck-en b { font-weight: 700; color: var(--c, ${K.cy}); }
  .ck-en .scan { position: absolute; top: -.05em; bottom: .05em; width: ${u * .5}px; background: var(--c, ${K.cy}); box-shadow: 0 0 ${u * 1.6}px var(--c, ${K.cy}); }
  .ck-te { position: absolute; font: 400 ${u * (V ? 5.6 : 5)}px var(--font); color: ${K.ink}; line-height: 1.55; text-shadow: 0 ${u * .3}px ${u * 2}px #000; white-space: nowrap;
    padding-left: ${u * 2}px; }
  .ck-te::before { content: ""; position: absolute; left: 0; top: .3em; bottom: .35em; width: ${u * .45}px; background: var(--c, ${K.cy}); box-shadow: 0 0 ${u}px var(--c, ${K.cy}); }
  .ck-te b { color: var(--c, ${K.cy}); font-weight: 400; }
  .ck-tag { position: absolute; display: flex; align-items: center; gap: ${u * .8}px; font: 700 ${u * (V ? 3.4 : 2.6)}px var(--font-script); letter-spacing: .18em;
    text-transform: uppercase; color: ${K.ink}; white-space: nowrap; padding: ${u * .35}px ${u * 1.3}px ${u * .35}px ${u * .7}px; background: #030A10d8;
    border: ${Math.max(1, u * .12)}px solid #3FE0FF40; border-radius: ${u * .3}px; }
  .ck-tag i { width: ${u * 1.3}px; height: ${u * 1.3}px; background: var(--c, ${K.cy}); flex: none; border-radius: 50%; box-shadow: 0 0 ${u * .8}px var(--c, ${K.cy}); }
  .ck-num { position: absolute; font: 600 ${u * (V ? 19 : 16)}px var(--font-head); line-height: .85; color: ${K.ink}; white-space: nowrap; text-shadow: 0 ${u * .5}px ${u * 3}px #000000b0; }
  .ck-num small { font: 700 .24em var(--font-script); letter-spacing: .08em; color: var(--c, ${K.cy}); margin-left: .25em; }
  .ck-call { position: absolute; z-index: 16; }
  .ck-call .lb { position: absolute; white-space: nowrap; font: 700 ${u * (V ? 3 : 2.4)}px var(--font-script); letter-spacing: .14em; text-transform: uppercase;
    color: ${K.deep}; background: var(--c, ${K.cy}); padding: ${u * .25}px ${u * .9}px; border-radius: ${u * .2}px; }
  .ck-list { position: absolute; display: flex; flex-direction: column; gap: ${u * .8}px; }
  .ck-li { display: flex; align-items: center; gap: ${u * 1.1}px; font: 400 ${u * (V ? 5.2 : 4.6)}px var(--font); color: ${K.ink}; white-space: nowrap;
    padding: ${u * .25}px ${u * 1.8}px ${u * .25}px ${u * .4}px; background: ${K.panel}; border-left: ${u * .35}px solid var(--c, ${K.cy}); }
  .ck-li em { font: 700 ${u * (V ? 2.8 : 2.2)}px var(--font-script); font-style: normal; width: ${u * (V ? 4.2 : 3.4)}px; height: ${u * (V ? 4.2 : 3.4)}px;
    display: flex; align-items: center; justify-content: center; color: ${K.deep}; background: var(--c, ${K.cy}); flex: none; border-radius: 50%; }
  .ck-chip { position: absolute; font: 700 ${u * (V ? 3.2 : 2.6)}px var(--font-script); letter-spacing: .1em; text-transform: uppercase; color: ${K.deep}; white-space: nowrap;
    background: var(--c, ${K.red}); padding: ${u * .3}px ${u * 1.1}px; border-radius: ${u * .3}px; box-shadow: 0 0 ${u * 1.4}px var(--c, ${K.red}); }
  .ck-stamp { position: absolute; font: 700 ${u * (V ? 8 : 6.4)}px var(--font-head); letter-spacing: .06em; color: var(--c, ${K.red}); border: ${u * .5}px solid var(--c, ${K.red});
    padding: 0 ${u * 1.4}px; line-height: 1.05; z-index: 30; white-space: nowrap; background: #030A10a0; }
  .ck-phone { position: absolute; border-radius: ${u * 3.4}px; background: #081218; padding: ${u * .9}px; box-shadow: 0 ${u * 2}px ${u * 7}px #000000d0, inset 0 0 0 ${u * .25}px #284452; }
  .ck-phone .scr { position: relative; width: 100%; height: 100%; border-radius: ${u * 2.6}px; overflow: hidden; background: #0f1d24; font-family: var(--font-script); color: ${K.ink}; }
  .ck-doc { position: absolute; background: #EEF3F5; color: #0b1a22; border-radius: ${u * .3}px; padding: ${u * 2}px ${u * 2.4}px; box-shadow: 0 ${u * 2}px ${u * 6}px #000000c0;
    font: 600 ${u * (V ? 3.6 : 3.1)}px var(--font-script); line-height: 1.35; overflow: hidden; }
  .ck-doc h3 { margin: 0 0 ${u * .3}px; font: 600 ${u * (V ? 6 : 5.4)}px var(--font-head); text-transform: uppercase; line-height: 1; }
  .ck-doc .rule { height: ${u * .2}px; background: #0b1a22; margin: ${u * .5}px 0 ${u * .8}px; }
  .ck-doc .hl { background: #b9f1ff; padding: 0 ${u * .3}px; } .ck-doc .bad { background: #ffc9c9; padding: 0 ${u * .3}px; }
  .ck-ring { position: absolute; border-radius: 50%; border: ${u * .25}px solid var(--c, ${K.cy}); }
  .ck-flash { position: absolute; inset: 0; background: #e8f8ff; opacity: 0; z-index: 40; pointer-events: none; }`;
  document.head.append(css);

  const $ = (id) => document.getElementById(id);
  const at = (k, d = 0) => (B[k] ?? d);
  const mk = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; (parent || stage()).append(e); return e; };
  function stage() { let s = $("stage"); if (!s) { s = document.createElement("div"); s.id = "stage"; $("root").append(s); } return s; }
  const place = (e, x, y, w, h) => { Object.assign(e.style, { left: x + "px", top: y + "px" }); if (w != null) e.style.width = w + "px"; if (h != null) e.style.height = h + "px"; return e; };
  const ix = (k) => (P.names || []).indexOf(k);
  const src = (k) => { const i = ix(k); return i >= 0 && IMG[i] ? IMG[i] : null; };
  const out = (e, t, d = .35, to = {}) => tl.to(e, { autoAlpha: 0, duration: d, ease: E.out, ...to }, t);
  const centre = (e) => { e.style.left = "0"; e.style.width = W + "px"; e.style.textAlign = "center"; };
  const show = (e, t, from, d = .6, ease = E.in) => tl.fromTo(e, from, { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0, filter: "blur(0px)", duration: d, ease, immediateRender: true }, t);
  const svg = (w, h, inner) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;left:0;top:0;overflow:visible">${inner}</svg>`;
  const R = (i, s = 1) => ((Math.sin(i * 127.1 + s * 311.7) * 43758.5453) % 1 + 1) % 1;
  const fitw = (e, x) => { const base = e.style.fontSize || getComputedStyle(e).fontSize; const go = () => { e.style.fontSize = base; const r = document.createRange(); r.selectNodeContents(e);
      const w = r.getBoundingClientRect().width, room = e.style.textAlign === "center" ? W * .92 : (e.style.right ? W * .9 : W - (x ?? 0) - W * .04);
      if (w > room) e.style.fontSize = parseFloat(getComputedStyle(e).fontSize) * room / w + "px"; };
    go(); if (document.fonts) document.fonts.ready.then(go); };
  /* time-keyed value: keys [[t, v], ...] linear between keys */
  const key = (keys, t) => { let v = keys[0][1]; for (let i = 0; i < keys.length; i++) if (t >= keys[i][0]) { const nx = keys[i + 1];
      v = nx ? keys[i][1] + (nx[1] - keys[i][1]) * Math.min(1, (t - keys[i][0]) / Math.max(.01, nx[0] - keys[i][0])) : keys[i][1]; } return v; };
  /* animate a canvas draw(t) over the whole scene */
  const run = (draw) => { const v = { t: 0 }; draw(0); tl.fromTo(v, { t: 0 }, { t: D, duration: D, ease: "none", immediateRender: true, onUpdate: () => draw(v.t) }, 0); };
  function canvas(b, z, parent, scale = .5) { const cv = mk("canvas", "ck-fx", parent); cv.style.inset = "auto"; place(cv, b[0], b[1], b[2], b[3]);
    cv.width = Math.round(b[2] * scale); cv.height = Math.round(b[3] * scale); cv.style.width = b[2] + "px"; cv.style.height = b[3] + "px"; cv.style.zIndex = z; return cv; }
  /* atmo: weather-map backdrop: isobar contour lines that breathe, lat/lon grid, drifting cloud wisps. o.a opacity, o.low [x,y] (0-1) centre */
  function atmo(o = {}) {
    const cv = canvas([0, 0, W, H], 0, $("root"), .5); cv.className = "ck-atmo"; $("root").prepend(cv);
    const g = cv.getContext("2d"), cw = cv.width, ch = cv.height, lo = o.low || [.68, .42], a = o.a ?? 1;
    run((t) => { g.clearRect(0, 0, cw, ch); g.lineWidth = 1;
      g.strokeStyle = `rgba(63,224,255,${.06 * a})`; const st = cw / (V ? 6 : 12);
      for (let x = (t * 2) % st; x < cw; x += st) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ch); g.stroke(); }
      for (let y = (t * 1.2) % st; y < ch; y += st) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); }
      for (let k = 1; k <= 9; k++) { g.beginPath(); const r0 = k * Math.max(cw, ch) * .085;
        for (let i = 0; i <= 90; i++) { const th = i / 90 * 6.283, wob = 1 + .09 * Math.sin(th * 3 + k + t * .35) + .05 * Math.sin(th * 5 - t * .5 + k * 2);
          const x = lo[0] * cw + Math.cos(th) * r0 * wob * 1.25, y = lo[1] * ch + Math.sin(th) * r0 * wob * .85; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.strokeStyle = `rgba(137,164,180,${(.16 - k * .012) * a})`; g.stroke(); }
      for (let i = 0; i < 7; i++) { const x = ((R(i, 7) + t * .006 * (1 + R(i, 8))) % 1.3 - .15) * cw, y = R(i, 9) * ch, r = (.12 + R(i, 3) * .2) * cw;
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(200,230,245,${.05 * a})`); gr.addColorStop(1, "rgba(200,230,245,0)");
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } });
    return cv;
  }
  const MOVES = {
    push: (a) => [{ scale: 1 }, { scale: 1 + .14 * a }], pull: (a) => [{ scale: 1 + .2 * a }, { scale: 1 }],
    panL: (a) => [{ xPercent: 4 * a, scale: 1.04 }, { xPercent: -4 * a, scale: 1.04 }], panR: (a) => [{ xPercent: -4 * a, scale: 1.04 }, { xPercent: 4 * a, scale: 1.04 }],
    rise: (a) => [{ yPercent: 4 * a, scale: 1.06 }, { yPercent: -4 * a, scale: 1.06 }], sink: (a) => [{ yPercent: -4 * a, scale: 1.06 }, { yPercent: 4 * a, scale: 1.06 }],
    spin: (a) => [{ rotation: 3 * a, scale: 1.16 }, { rotation: -3 * a, scale: 1.1 }],
    dive: (a) => [{ scale: 1.02 }, { scale: 1 + .4 * a }], drift: (a) => [{ scale: 1.06, xPercent: -1.6 * a, yPercent: 1 * a }, { scale: 1.11, xPercent: 1.6 * a, yPercent: -1 * a }],
  };
  /* image shot. o: t, d, mv, a, in, box [x,y,w,h], fr (monitor frame), sat (top-left live tag), co (corner coordinates), c, fx/fy, z, until, parent, tint */
  function shot(k, o = {}) {
    const t = o.t ?? 0, d = o.d ?? 3.2, b = o.box || [0, 0, W, H];
    const e = place(mk("div", "ck-shot" + (o.fr ? " fr" : ""), o.parent), ...b), im = mk("div", "ck-im", e); if (o.tint !== false) mk("div", "ck-tint", e); mk("div", "ck-sh", e);
    const s = src(k); if (s) im.style.backgroundImage = `url("${s}")`; else mk("div", "ck-miss", e, "IMAGE " + k);
    im.style.transformOrigin = `${(o.fx ?? .5) * 100}% ${(o.fy ?? .5) * 100}%`;
    if (o.c) e.style.setProperty("--c", o.c);
    if (o.fr) { const m = u * 1, bw = Math.max(2, u * .22) + "px";
      [["left", "top"], ["right", "top"], ["left", "bottom"], ["right", "bottom"]].forEach(([h, v]) => { const c = mk("div", "ck-cross", e);
        c.style[h] = m + "px"; c.style[v] = m + "px"; c.style["border" + h[0].toUpperCase() + h.slice(1) + "Width"] = bw; c.style["border" + v[0].toUpperCase() + v.slice(1) + "Width"] = bw; }); }
    if (o.sat) mk("div", "ck-sat", e, `<i></i><span>${o.sat}</span>`);
    if (o.co) { const c = mk("div", "ck-co", e, o.co); c.style.right = u * 1.4 + "px"; c.style.bottom = u * 1.2 + "px"; }
    if (o.z) e.style.zIndex = o.z;
    tl.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    const [fr, to] = MOVES[o.mv || "push"](o.a ?? 1);
    tl.fromTo(im, fr, { ...to, duration: d + .6, ease: o.mv === "dive" ? "power2.in" : "none", immediateRender: true }, t);
    enter(e, t, o.in || "cut", o);
    if (o.until) out(e, o.until, .3);
    e.im = im; return e;
  }
  function enter(e, t, how, o = {}) {
    const fx = (o.fx ?? .5) * 100, fy = (o.fy ?? .5) * 100;
    if (how === "radar") { const v = { a: 0 }, set = () => { const m = `conic-gradient(from 0deg at ${fx}% ${fy}%, #000 ${v.a}deg, transparent ${v.a + .5}deg)`;
        e.style.webkitMaskImage = e.style.maskImage = v.a >= 360 ? "none" : m; };
      set(); tl.fromTo(v, { a: 0 }, { a: 360, duration: .9, ease: E.io, immediateRender: true, onUpdate: set }, t); }
    else if (how === "iris") tl.fromTo(e, { clipPath: `circle(0% at ${fx}% ${fy}%)` }, { clipPath: `circle(150% at ${fx}% ${fy}%)`, duration: .9, ease: E.io, immediateRender: true }, t);
    else if (how === "cloud") tl.fromTo(e, { opacity: 0, filter: "blur(18px) brightness(1.8)", scale: 1.06 }, { opacity: 1, filter: "blur(0px) brightness(1)", scale: 1, duration: .9, ease: E.soft, immediateRender: true }, t);
    else if (how === "split") tl.fromTo(e, { clipPath: "inset(50% 0% 50% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .8, ease: E.io, immediateRender: true }, t);
    else if (how === "wipe") tl.fromTo(e, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .75, ease: E.io, immediateRender: true }, t);
    else if (how === "wipeL") tl.fromTo(e, { clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .75, ease: E.io, immediateRender: true }, t);
    else if (how === "wipeU") tl.fromTo(e, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .75, ease: E.io, immediateRender: true }, t);
    else if (how === "slide") tl.fromTo(e, { xPercent: o.dir === -1 ? -110 : 110 }, { xPercent: 0, duration: .75, ease: E.snap, immediateRender: true }, t);
    else if (how === "rise") tl.fromTo(e, { yPercent: 22, opacity: 0, rotation: o.rot ?? 0 }, { yPercent: 0, opacity: 1, rotation: 0, duration: .75, ease: E.snap, immediateRender: true }, t);
    else if (how === "zoom") tl.fromTo(e, { scale: .6, opacity: 0, filter: "blur(12px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: .75, ease: E.in, immediateRender: true }, t);
    else if (how === "fade") tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: .6, ease: E.soft, immediateRender: true }, t);
  }
  const morph = (e, t, box, d = .9) => tl.to(e, { left: box[0], top: box[1], width: box[2], height: box[3], duration: d, ease: E.io }, t);
  /* cloudwipe: a band of storm cloud sweeps across the frame, centred on t (covers the cut). o.dir -1 = right to left */
  function cloudwipe(t, o = {}) {
    const e = mk("div", "ck-cw", $("root")), w = W * 1.7; place(e, 0, -H * .1, w, H * 1.2);
    e.style.background = [0, 1, 2, 3, 4, 5, 6].map((i) => `radial-gradient(ellipse ${30 + R(i, 2) * 30}% ${18 + R(i, 3) * 20}% at ${15 + R(i, 4) * 70}% ${R(i, 5) * 100}%, #dfeef5 0%, #9fb9c6cc 40%, transparent 72%)`).join(",") +
      ", linear-gradient(90deg, transparent, #7f99a6 22%, #c9dde6 50%, #7f99a6 78%, transparent)";
    e.style.filter = `blur(${u * 1.6}px)`;
    const dir = o.dir === -1 ? -1 : 1, d = o.d ?? 1.1, a = dir > 0 ? -w * 1.05 : W * 1.05, z = dir > 0 ? W * 1.05 : -w * 1.05, mid = (W - w) / 2;
    /* o.part "in" = band arrives and covers the frame at t (end of a scene); "out" = starts covering at t and leaves (start of the next) */
    if (o.part === "in") tl.fromTo(e, { x: a }, { x: mid, duration: d / 2, ease: "power1.in", immediateRender: true }, t - d / 2);
    else if (o.part === "out") tl.fromTo(e, { x: mid }, { x: z, duration: d / 2, ease: "power1.out", immediateRender: true }, t);
    else tl.fromTo(e, { x: a }, { x: z, duration: d, ease: "power1.inOut", immediateRender: true }, Math.max(0, t - d / 2));
    return e;
  }
  /* headline: caps; a radar scan bar runs across and the text appears behind it. <b>word</b> in o.c */
  function head(en, t, o = {}) {
    const wrap = mk("div", "ck-en", o.parent); if (o.c) wrap.style.setProperty("--c", o.c);
    wrap.innerHTML = `<span>${en}</span>`; const txt = wrap.firstChild; txt.style.position = "relative"; txt.style.display = "inline-block";
    const bar = mk("div", "scan", wrap);
    place(wrap, o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .14 : .62)); if (o.size) wrap.style.fontSize = u * o.size * 1.25 + "px"; if (o.align === "center") centre(wrap);
    if (o.align === "right") { wrap.style.left = "auto"; wrap.style.right = (o.x ?? W * .06) + "px"; wrap.style.textAlign = "right"; }
    wrap.style.zIndex = o.z ?? 18;
    fitw(wrap, o.align === "right" ? 0 : (o.x ?? W * (V ? .07 : .06)));
    tl.fromTo(wrap, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    tl.fromTo(txt, { clipPath: "inset(-20% 100% -20% 0%)" }, { clipPath: "inset(-20% 0% -20% 0%)", duration: .7, ease: E.io, immediateRender: true }, t);
    const v = { p: 0 }; gsap.set(bar, { opacity: 0 });
    tl.fromTo(v, { p: 0 }, { p: 1, duration: .7, ease: E.io, immediateRender: false, onUpdate: () => { bar.style.left = txt.offsetLeft + txt.offsetWidth * v.p + "px"; } }, t);
    tl.fromTo(bar, { opacity: 1 }, { opacity: 0, duration: .3, ease: E.out, immediateRender: false }, t + .62);
    if (o.until) out(wrap, o.until); return wrap;
  }
  function te(html, t, o = {}) { const e = place(mk("div", "ck-te", o.parent, html), o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .3 : .78)); if (o.c) e.style.setProperty("--c", o.c);
    if (o.size) e.style.fontSize = u * o.size * 1.15 + "px"; if (o.align === "center") { centre(e); e.style.paddingLeft = "0"; } e.style.zIndex = o.z ?? 18;
    fitw(e, o.x ?? W * (V ? .07 : .06));
    show(e, t, { opacity: 0, x: -u * 3 }, .5, E.snap); if (o.until) out(e, o.until); return e; }
  function tag(text, t, o = {}) { const e = place(mk("div", "ck-tag", o.parent, `<i></i><span>${text}</span>`), o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .09 : .1));
    if (o.c) e.style.setProperty("--c", o.c); e.style.zIndex = o.z ?? 19; if (o.align === "center") { e.style.left = W / 2 + "px"; e.style.transform = "translateX(-50%)"; }
    if (o.size) e.style.fontSize = u * o.size + "px";
    tl.fromTo(e, { opacity: 0, clipPath: "inset(0% 100% 0% 0%)" }, { opacity: 1, clipPath: "inset(0% 0% 0% 0%)", duration: .5, ease: E.io, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  function num(from, to, t, o = {}) {
    const e = place(mk("div", "ck-num", o.parent), o.x ?? W * .06, o.y ?? H * .3); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.c) e.style.setProperty("--c", o.c);
    if (o.align === "center") centre(e); e.style.zIndex = o.z ?? 18; if (o.col) e.style.color = o.col;
    const f = o.fmt || ((v) => Math.round(v).toLocaleString("en-IN")), sm = o.unit ? `<small>${o.unit}</small>` : "", v = { v: from }; e.innerHTML = (o.pre || "") + f(from) + sm;
    show(e, t, { opacity: 0, y: u * 4, filter: "blur(10px)" }, .5, E.snap);
    tl.fromTo(v, { v: from }, { v: to, duration: o.d ?? 1.4, ease: "power2.out", immediateRender: true, onUpdate: () => { e.innerHTML = (o.pre || "") + f(v.v) + sm; } }, t);
    if (o.until) out(e, o.until); return e;
  }
  function callout(x, y, dx, dy, text, t, o = {}) {
    const c = o.c || K.cy, e = place(mk("div", "ck-call", o.parent), x, y); e.style.setProperty("--c", c); if (o.z) e.style.zIndex = o.z;
    const len = Math.hypot(dx, dy), sw = Math.max(1.5, u * .2);
    e.innerHTML = svg(1, 1, `<circle cx="0" cy="0" r="${u * .7}" fill="${c}"/><circle cx="0" cy="0" r="${u * 1.6}" fill="none" stroke="${c}" stroke-width="${sw}" class="pl"/>` +
      `<path d="M0 0 L${dx} ${dy}" stroke="${c}" stroke-width="${sw}" fill="none" stroke-dasharray="${len}" stroke-dashoffset="${len}" class="ld"/>`);
    const lb = mk("div", "lb", e, text); lb.style.left = dx + (dx < 0 ? -u : u * .6) + "px"; lb.style.top = dy - u * 1.6 + "px"; if (dx < 0) lb.style.transform = "translateX(-100%)";
    tl.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    tl.fromTo(e.querySelector(".pl"), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: .5, ease: E.pop, immediateRender: true }, t);
    tl.to(e.querySelector(".ld"), { strokeDashoffset: 0, duration: .45, ease: E.io }, t + .1);
    show(lb, t + .4, { opacity: 0, x: dx < 0 ? u * 2 : -u * 2 }, .4, E.snap);
    if (o.until) out(e, o.until); return e;
  }
  /* list items [[html, t, kind]] kind true = tick (green), false = cross (red), null = ! (orange), "n" = number (cyan) */
  function list(items, x, y, o = {}) {
    const e = place(mk("div", "ck-list", o.parent), x, y); e.style.zIndex = o.z ?? 12;
    items.forEach(([h, t, ok], i) => { const li = mk("div", "ck-li", e, `<em>${ok === false ? "✕" : ok === null ? "!" : ok === "n" ? i + 1 : "✓"}</em><span>${h}</span>`);
      li.style.setProperty("--c", ok === false ? K.red : ok === null ? K.or : ok === "n" ? K.cy : K.ok); if (o.size) li.style.fontSize = u * o.size * 1.15 + "px";
      show(li, t, { opacity: 0, x: -u * 5 }, .45, E.snap); });
    if (o.until) out(e, o.until); return e;
  }
  /* chips: [[text, t, colour]] laid out in rows from (x,y), wrap at width w */
  function chips(items, x, y, w, o = {}) {
    const fs = o.size || (V ? 3.2 : 2.6), gap = u * (V ? 1.2 : 1), hgt = u * fs * 1.9; let cx = x, cy = y; const els = [];
    items.forEach(([text, t, c]) => { const e = mk("div", "ck-chip", o.parent, text); e.style.setProperty("--c", c || K.red); e.style.zIndex = o.z ?? 17; e.style.fontSize = u * fs + "px";
      const ew = text.length * u * fs * .72 + u * 2.6; if (cx + ew > x + w) { cx = x; cy += hgt; } place(e, cx, cy); cx += ew + gap;
      tl.fromTo(e, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: .4, ease: E.pop, immediateRender: true }, t); els.push(e); if (o.until) out(e, o.until); });
    return els;
  }
  function stamp(text, x, y, t, o = {}) { const e = place(mk("div", "ck-stamp", o.parent, text), x, y); if (o.c) e.style.setProperty("--c", o.c); if (o.size) e.style.fontSize = u * o.size + "px";
    tl.fromTo(e, { scale: 2.2, opacity: 0, rotation: -14 }, { scale: 1, opacity: 1, rotation: o.rot ?? -6, duration: .45, ease: E.pop, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  function phone(html, x, y, h, t, o = {}) { const w = h * .49, e = place(mk("div", "ck-phone", o.parent), x, y, w, h); e.style.zIndex = o.z ?? 14;
    const s = mk("div", "scr", e, html); show(e, t, { opacity: 0, y: u * 12, rotation: o.rot ?? 5 }, .8, E.snap); e.scr = s; if (o.until) out(e, o.until); return e; }
  function doc(html, x, y, w, h, t, o = {}) { const e = place(mk("div", "ck-doc", o.parent, html), x, y, w, h); e.style.zIndex = o.z ?? 13;
    tl.fromTo(e, { opacity: 0, y: u * 10, rotation: o.rot ?? -4 }, { opacity: 1, y: 0, rotation: o.rest ?? 1.5, duration: .8, ease: E.snap, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  function ring(x, y, t, o = {}) { const r = o.r || u * 8, n = o.n || 3;
    for (let i = 0; i < n; i++) { const e = place(mk("div", "ck-ring", o.parent), x - r, y - r, r * 2, r * 2); e.style.setProperty("--c", o.c || K.cy); e.style.zIndex = o.z ?? 16;
      gsap.set(e, { opacity: 0 }); tl.fromTo(e, { scale: .1, opacity: .9 }, { scale: 1, opacity: 0, duration: o.d || 1.5, ease: "power1.out", immediateRender: false }, t + i * .35); } }
  const flash = (t, d = .4, c) => { const f = mk("div", "ck-flash", $("root")); if (c) f.style.background = c;
    tl.fromTo(f, { opacity: .55 }, { opacity: 0, duration: d, ease: "power2.out", immediateRender: false }, t); tl.set(f, { opacity: 0 }, 0); };
  const cam = (t, d, to) => tl.to($("stage"), { duration: d, ease: E.io, ...to }, t);
  window.CK = { S, P, W, H, D, V, u, K, tl, E, R, at, $, mk, place, ix, src, out, show, svg, fitw, key, run, canvas, atmo, shot, enter, morph, cloudwipe, head, te, tag, num,
                callout, list, chips, stamp, phone, doc, ring, flash, cam, done: () => finish(tl) };
})();
