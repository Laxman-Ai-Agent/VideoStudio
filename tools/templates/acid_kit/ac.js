/* acid_kit (18 Acidity_GERD): "acid & valve" cinematic documentary look, written fresh for this video (user brief 2026-11-18:
   big AI images, constant camera motion, frequent compositions, meaningful screens / documents, 2D motion graphics).
   Bottle-green lab darkness; acid yellow = acid / pH / highlight, flame orange = burning / danger, porcelain = protection / right action.
   Core (this file): shot (full-bleed or specimen-slide frame with FIG tab), melt / burn / split reveals, drench (liquid meniscus wipe),
   fizz (rising acid bubbles canvas), heat (burn glow), head (Fraunces words press up, meniscus underline), te, tag (reagent chip),
   num, callout (leader line label), list, myth (pH paper turns), phone / doc (real content), ring, flash, cam, out, morph.
   Science parts in ac2.js (tract, phScale, shield, people, clock3, bed, chain, tubes, flags, radiate). Scene code: const { ... } = AC; build; AC.done(). */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, V = H > W, u = Math.min(W, H) / 100;
  const C = S.colors || {};
  const K = { bg: C.background || "#0A1612", acid: C.primary || "#D9F23F", fl: C.secondary || "#FF6A2B", txt: C.text || "#F3F0E6",
              mute: C.text2 || "#8FA597", por: C.accent || "#EADFC8", deep: "#06100C", panel: C.panel || "rgba(12,28,22,0.86)", red: "#E8344A" };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "expo.out", snap: "power4.out", io: "power3.inOut", soft: "sine.inOut", out: "power2.in", pop: "back.out(1.7)" };
  const IMG = S.images || [], B = P.beats || {};
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; background: radial-gradient(ellipse at 35% 25%, #143428, ${K.bg} 70%); }
  #stage { position: absolute; inset: 0; overflow: hidden; transform-origin: 50% 50%; }
  .ac-shot { position: absolute; overflow: hidden; background: ${K.deep}; }
  .ac-shot .ac-im { position: absolute; inset: -8%; background: #0d1d17 no-repeat center / cover; filter: contrast(1.06) saturate(1.02) sepia(.06); will-change: transform; }
  .ac-shot .ac-miss { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: ${K.mute}; font: 600 ${u * 2.4}px var(--font-script);
    letter-spacing: .3em; background: radial-gradient(circle at 50% 45%, #1c3a2e, ${K.deep} 70%); }
  .ac-shot .ac-sh { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 45%, transparent 55%, #06100Cb8 100%),
    linear-gradient(0deg, #06100Cb0, transparent 30%, transparent 86%, #06100C50); }
  .ac-shot.fr { border-radius: ${u * .5}px; box-shadow: 0 ${u * 1.8}px ${u * 6}px #000000c0; }
  .ac-shot.fr .ac-sh { background: linear-gradient(0deg, #06100C80, transparent 35%); }
  .ac-br { position: absolute; width: ${u * 2.6}px; height: ${u * 2.6}px; border: 0 solid var(--c, ${K.acid}); z-index: 3; }
  .ac-fig { position: absolute; left: ${u * 1.2}px; bottom: ${u * 1.1}px; z-index: 3; display: flex; gap: ${u * .7}px; align-items: center;
    font: 600 ${u * (V ? 2.8 : 2.1)}px var(--font-script); letter-spacing: .2em; text-transform: uppercase; color: ${K.txt}; }
  .ac-fig i { font-style: normal; color: ${K.deep}; background: var(--c, ${K.acid}); padding: ${u * .15}px ${u * .6}px; }
  .ac-fx { position: absolute; inset: 0; pointer-events: none; }
  .ac-dr { position: absolute; inset: 0; z-index: 44; pointer-events: none; }
  .ac-en { position: absolute; font: 800 ${u * (V ? 8 : 7.4)}px var(--font-head); line-height: 1.02; letter-spacing: -.03em; color: ${K.txt}; white-space: nowrap;
    text-shadow: 0 ${u * .4}px ${u * 3}px #000000b0; font-variation-settings: "SOFT" 100, "WONK" 1; }
  .ac-en b { font-weight: 900; color: var(--c, ${K.acid}); position: relative; }
  .ac-en .w { display: inline-block; white-space: pre; }
  .ac-en .men { position: absolute; left: 0; right: 0; bottom: -.08em; height: .09em; background: var(--c, ${K.acid}); border-radius: .1em; transform-origin: 0 50%;
    box-shadow: 0 0 ${u}px var(--c, ${K.acid}); }
  .ac-te { position: absolute; font: 400 ${u * (V ? 6 : 5.4)}px var(--font); color: ${K.txt}; line-height: 1.5; text-shadow: 0 ${u * .3}px ${u * 2}px #000; white-space: nowrap;
    padding-left: ${u * 2.2}px; }
  .ac-te::before { content: ""; position: absolute; left: 0; top: .55em; width: ${u * .9}px; height: ${u * 1.25}px; border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
    background: var(--c, ${K.acid}); transform: rotate(180deg); }
  .ac-te b { color: var(--c, ${K.acid}); font-weight: 400; }
  .ac-tag { position: absolute; display: flex; align-items: center; gap: ${u * .8}px; font: 600 ${u * (V ? 3.6 : 2.9)}px var(--font-script); letter-spacing: .16em;
    text-transform: uppercase; color: ${K.txt}; white-space: nowrap; padding: ${u * .35}px ${u * 1.3}px ${u * .35}px ${u * .5}px; background: #06100Cd8;
    border-left: ${u * .35}px solid var(--c, ${K.acid}); }
  .ac-tag i { width: ${u * 1.5}px; height: ${u * 1.5}px; background: var(--c, ${K.acid}); flex: none; }
  .ac-num { position: absolute; font: 900 ${u * (V ? 17 : 14)}px var(--font-head); line-height: .9; color: ${K.txt}; letter-spacing: -.04em; white-space: nowrap;
    text-shadow: 0 ${u * .5}px ${u * 3}px #000000b0; }
  .ac-num small { font: 700 .28em var(--font-script); letter-spacing: .05em; color: var(--c, ${K.acid}); margin-left: .2em; }
  .ac-call { position: absolute; z-index: 16; }
  .ac-call .lb { position: absolute; white-space: nowrap; font: 600 ${u * (V ? 3.2 : 2.5)}px var(--font-script); letter-spacing: .14em; text-transform: uppercase;
    color: ${K.deep}; background: var(--c, ${K.acid}); padding: ${u * .3}px ${u * 1}px; }
  .ac-myth { position: absolute; display: flex; align-items: center; gap: ${u * 1.6}px; padding: ${u * 1.4}px ${u * 2.2}px ${u * 1.4}px ${u * 1.4}px; background: ${K.panel};
    border: ${Math.max(1, u * .12)}px solid #ffffff1c; font: 400 ${u * (V ? 5.6 : 5)}px var(--font); color: ${K.txt}; white-space: nowrap; box-shadow: 0 ${u}px ${u * 4}px #00000090; }
  .ac-myth .strip { width: ${u * 1.6}px; height: ${u * 6}px; border-radius: ${u * .3}px; background: #d8d2b8; flex: none; }
  .ac-myth .st { position: absolute; right: -${u * 1.2}px; top: -${u * 2.6}px; font: 900 ${u * (V ? 4 : 3)}px var(--font-head); color: var(--c, ${K.fl});
    border: ${u * .3}px solid var(--c, ${K.fl}); padding: 0 ${u * 1.1}px; background: ${K.deep}; letter-spacing: .04em; }
  .ac-list { position: absolute; display: flex; flex-direction: column; gap: ${u * .8}px; }
  .ac-li { display: flex; align-items: center; gap: ${u * 1.1}px; font: 400 ${u * (V ? 5.6 : 5)}px var(--font); color: ${K.txt}; white-space: nowrap;
    padding: ${u * .3}px ${u * 1.8}px ${u * .3}px ${u * .4}px; background: ${K.panel}; border-radius: ${u * .4}px; }
  .ac-li em { font: 800 ${u * (V ? 2.6 : 2)}px var(--font-script); font-style: normal; width: ${u * (V ? 4.2 : 3.2)}px; height: ${u * (V ? 4.2 : 3.2)}px;
    display: flex; align-items: center; justify-content: center; color: ${K.deep}; background: var(--c, ${K.acid}); flex: none; border-radius: ${u * .3}px; }
  .ac-phone { position: absolute; border-radius: ${u * 3.4}px; background: #0b1511; padding: ${u * .9}px; box-shadow: 0 ${u * 2}px ${u * 7}px #000000d0, inset 0 0 0 ${u * .25}px #2d4238; }
  .ac-phone .scr { position: relative; width: 100%; height: 100%; border-radius: ${u * 2.6}px; overflow: hidden; background: linear-gradient(170deg, #f7f4ec, #e9e4d6);
    font-family: var(--font-script); color: #14211b; }
  .ac-doc { position: absolute; background: #F6F2E7; color: #13201a; border-radius: ${u * .3}px; padding: ${u * 2}px ${u * 2.4}px; box-shadow: 0 ${u * 2}px ${u * 6}px #000000c0;
    font: 500 ${u * (V ? 3.6 : 3.2)}px var(--font-script); line-height: 1.4; overflow: hidden; }
  .ac-doc h3 { margin: 0 0 ${u * .3}px; font: 900 ${u * (V ? 4.6 : 4.2)}px var(--font-head); letter-spacing: -.02em; line-height: 1.1; }
  .ac-doc .rule { height: ${u * .2}px; background: #13201a; margin: ${u * .5}px 0 ${u * .8}px; }
  .ac-doc .hl { background: #ecf7a8; padding: 0 ${u * .3}px; } .ac-doc .bad { background: #ffd2bd; padding: 0 ${u * .3}px; }
  .ac-ring { position: absolute; border-radius: 50%; border: ${u * .25}px solid var(--c, ${K.fl}); }
  .ac-flash { position: absolute; inset: 0; background: #fff8e6; opacity: 0; z-index: 40; pointer-events: none; }`;
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
  const fitw = (e, x) => { const base = e.style.fontSize || getComputedStyle(e).fontSize; const go = () => { e.style.fontSize = base; const r = document.createRange(); r.selectNodeContents(e); const w = r.getBoundingClientRect().width,
      room = e.style.textAlign === "center" ? W * .92 : (e.style.right ? W * .9 : W - (x ?? 0) - W * .04); if (w > room) e.style.fontSize = parseFloat(getComputedStyle(e).fontSize) * room / w + "px"; };
    go(); if (document.fonts) document.fonts.ready.then(go); };
  /* wavy liquid edge: polygon of the part BELOW a sine surface at level lv (0 = bottom, 1 = top, fraction of box), phase ph; flip = part ABOVE */
  const wave = (lv, ph, amp = .035, flip = false) => { const pts = []; for (let i = 0; i <= 24; i++) { const x = i / 24 * 100,
      y = (1 - lv) * 100 + Math.sin(i / 24 * 9.4 + ph) * amp * 100 + Math.sin(i / 24 * 3.1 - ph * .7) * amp * 60; pts.push(`${x}% ${y}%`); }
    return `polygon(${flip ? "0% 0%, 100% 0%, " + pts.reverse().join(",") : pts.join(",") + ", 100% 110%, 0% 110%"})`; };
  const MOVES = {
    push: (a) => [{ scale: 1 }, { scale: 1 + .15 * a }], pull: (a) => [{ scale: 1 + .2 * a }, { scale: 1 }],
    panL: (a) => [{ xPercent: 4 * a, scale: 1.04 }, { xPercent: -4 * a, scale: 1.04 }], panR: (a) => [{ xPercent: -4 * a, scale: 1.04 }, { xPercent: 4 * a, scale: 1.04 }],
    rise: (a) => [{ yPercent: 4 * a, scale: 1.06 }, { yPercent: -4 * a, scale: 1.06 }], sink: (a) => [{ yPercent: -4 * a, scale: 1.06 }, { yPercent: 4 * a, scale: 1.06 }],
    orbit: (a) => [{ rotation: -2.2 * a, scale: 1.14, xPercent: -3 * a }, { rotation: 2.2 * a, scale: 1.07, xPercent: 3 * a }],
    dive: (a) => [{ scale: 1.02 }, { scale: 1 + .42 * a }], drift: (a) => [{ scale: 1.05, xPercent: -1.5 * a, yPercent: 1 * a }, { scale: 1.1, xPercent: 1.5 * a, yPercent: -1 * a }],
    tilt: (a) => [{ rotationY: -9 * a, scale: 1.12, transformPerspective: 900 }, { rotationY: 9 * a, scale: 1.12, transformPerspective: 900 }],
  };
  /* image shot. o: t, d, mv, a, in, box [x,y,w,h], fr (specimen frame), fig (FIG tab text), c, fx/fy, z, until, parent */
  function shot(k, o = {}) {
    const t = o.t ?? 0, d = o.d ?? 3.2, b = o.box || [0, 0, W, H];
    const e = place(mk("div", "ac-shot" + (o.fr ? " fr" : ""), o.parent), ...b), im = mk("div", "ac-im", e); mk("div", "ac-sh", e);
    const s = src(k); if (s) im.style.backgroundImage = `url("${s}")`; else mk("div", "ac-miss", e, "IMAGE " + k);
    im.style.transformOrigin = `${(o.fx ?? .5) * 100}% ${(o.fy ?? .5) * 100}%`;
    if (o.c) e.style.setProperty("--c", o.c);
    if (o.fr) { const m = u * 1.1, bw = Math.max(2, u * .3) + "px";
      [["left", "top"], ["right", "top"], ["left", "bottom"], ["right", "bottom"]].forEach(([h, v]) => { const c = mk("div", "ac-br", e);
        c.style[h] = m + "px"; c.style[v] = m + "px"; c.style["border" + h[0].toUpperCase() + h.slice(1) + "Width"] = bw; c.style["border" + v[0].toUpperCase() + v.slice(1) + "Width"] = bw; });
      if (o.fig) mk("div", "ac-fig", e, `<i>FIG ${o.no || ""}</i><span>${o.fig}</span>`); }
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
    if (how === "melt" || how === "drip") { const v = { l: 0 }, up = how === "melt";
      tl.fromTo(v, { l: 0 }, { l: 1.12, duration: .85, ease: E.io, immediateRender: true, onUpdate: () => { e.style.clipPath = up ? wave(v.l, v.l * 9) : wave(1 - v.l, v.l * 9, .035, true); },
        onComplete: () => { e.style.clipPath = "none"; } }, t); e.style.clipPath = up ? wave(0, 0) : wave(1, 0, .035, true); }
    else if (how === "burn") { tl.fromTo(e, { clipPath: `circle(0% at ${fx}% ${fy}%)`, filter: "brightness(2) sepia(1) saturate(3)" },
        { clipPath: `circle(150% at ${fx}% ${fy}%)`, filter: "brightness(1) sepia(0) saturate(1)", duration: 1, ease: E.io, immediateRender: true }, t);
      const r = mk("div", "ac-ring", e.parentNode || stage()), bb = [parseFloat(e.style.left), parseFloat(e.style.top), parseFloat(e.style.width), parseFloat(e.style.height)];
      const cx = bb[0] + bb[2] * fx / 100, cy = bb[1] + bb[3] * fy / 100, rr = Math.hypot(bb[2], bb[3]) * .75; place(r, cx - rr, cy - rr, rr * 2, rr * 2);
      r.style.borderWidth = u * 1.6 + "px"; r.style.filter = `blur(${u * .8}px)`; r.style.zIndex = (+e.style.zIndex || 1) + 1;
      gsap.set(r, { opacity: 0 }); tl.fromTo(r, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 1, ease: E.io, immediateRender: false }, t); }
    else if (how === "split") tl.fromTo(e, { clipPath: "inset(0% 50% 0% 50%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .8, ease: E.io, immediateRender: true }, t);
    else if (how === "wipe") tl.fromTo(e, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .75, ease: E.io, immediateRender: true }, t);
    else if (how === "wipeL") tl.fromTo(e, { clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .75, ease: E.io, immediateRender: true }, t);
    else if (how === "slide") tl.fromTo(e, { xPercent: o.dir === -1 ? -110 : 110 }, { xPercent: 0, duration: .75, ease: E.snap, immediateRender: true }, t);
    else if (how === "rise") tl.fromTo(e, { yPercent: 22, opacity: 0, rotation: o.rot ?? 0 }, { yPercent: 0, opacity: 1, rotation: 0, duration: .75, ease: E.snap, immediateRender: true }, t);
    else if (how === "zoom") tl.fromTo(e, { scale: .6, opacity: 0, filter: "blur(12px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: .75, ease: E.in, immediateRender: true }, t);
    else if (how === "fade") tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: .6, ease: E.soft, immediateRender: true }, t);
  }
  const morph = (e, t, box, d = .9) => tl.to(e, { left: box[0], top: box[1], width: box[2], height: box[3], duration: d, ease: E.io }, t);
  /* drench: acid-yellow liquid floods up over the frame at t and drains down, revealing what is under it */
  function drench(t, o = {}) {
    const a = mk("div", "ac-dr", $("root")), b = mk("div", "ac-dr", $("root"));
    a.style.background = `linear-gradient(0deg, ${o.c || K.acid}, #b9d12f)`; b.style.background = "#0f2a20";
    const v = { l: 0 };
    const set = () => { const up = v.l <= 1 ? v.l : 2 - v.l, ph = v.l * 11, la = up * 1.3 - .12;
      a.style.clipPath = wave(la, ph); b.style.clipPath = wave(Math.max(-.3, la - .14), ph + 1); };
    /* o.part "in" = flood only (end of a scene), "out" = start full and drain (start of the next scene), default both */
    const part = o.part || "both";
    if (part === "out") { v.l = 1; set(); tl.fromTo(v, { l: 1 }, { l: 2, duration: .55, ease: "power2.out", onUpdate: set, immediateRender: true }, t); tl.set([a, b], { autoAlpha: 0 }, t + .6); return; }
    a.style.clipPath = b.style.clipPath = wave(-.2, 0);
    tl.fromTo(v, { l: 0 }, { l: 1, duration: .38, ease: "power2.in", onUpdate: set, immediateRender: true }, t - .38);
    if (part === "both") { tl.to(v, { l: 2, duration: .5, ease: "power2.out", onUpdate: set }, t); tl.set([a, b], { autoAlpha: 0 }, t + .55); }
  }
  /* fizz: acid bubbles rising (canvas). dens [[t, 0-1]], box, c */
  function fizz(o = {}) {
    const b = o.box || [0, 0, W, H], cv = place(mk("canvas", "ac-fx", o.parent), b[0], b[1], b[2], b[3]); cv.width = Math.round(b[2] / 2); cv.height = Math.round(b[3] / 2);
    cv.style.width = b[2] + "px"; cv.style.height = b[3] + "px"; cv.style.zIndex = o.z ?? 20; cv.style.mixBlendMode = "screen";
    const g = cv.getContext("2d"), n = o.n ?? 55, cw = cv.width, ch = cv.height, keys = o.dens || [[0, .6]];
    const col = o.c || K.acid, rgb = [1, 3, 5].map((k) => parseInt(col.slice(k, k + 2), 16));
    const den = (t) => { let v = keys[0][1]; for (let i = 0; i < keys.length; i++) if (t >= keys[i][0]) { const nx = keys[i + 1]; v = nx ? keys[i][1] + (nx[1] - keys[i][1]) * Math.min(1, (t - keys[i][0]) / Math.max(.01, nx[0] - keys[i][0])) : keys[i][1]; } return v; };
    const draw = (t) => { g.clearRect(0, 0, cw, ch); const dv = den(t);
      for (let i = 0; i < n; i++) { const sp = .04 + R(i, 2) * .08, y = ((R(i, 4) - t * sp) % 1 + 1) % 1, x = (R(i, 3) + Math.sin(t * 1.3 + i) * .012) * cw;
        const r = (1 + R(i, 5) * 3.2) * (cw / 960) * (1.2 - y * .5), a = Math.min(1, (1 - y) * 1.6) * dv * .75;
        g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = Math.max(.6, r * .35); g.beginPath(); g.arc(x, y * ch, r * 2, 0, 6.283); g.stroke();
        g.fillStyle = `rgba(255,255,255,${a * .5})`; g.beginPath(); g.arc(x - r * .6, y * ch - r * .6, r * .45, 0, 6.283); g.fill(); } };
    const v = { t: 0 }; draw(0);
    tl.fromTo(v, { t: 0 }, { t: D, duration: D, ease: "none", immediateRender: true, onUpdate: () => draw(v.t) }, 0);
    gsap.set(cv, { opacity: 0 }); tl.to(cv, { opacity: 1, duration: .8, ease: E.soft }, o.t ?? 0);
    if (o.until) out(cv, o.until, .5); return cv;
  }
  /* heat: pulsing flame-orange burn glow at (x,y) radius r */
  function heat(x, y, r, t, o = {}) {
    const e = place(mk("div", "ac-fx", o.parent), x - r, y - r, r * 2, r * 2); e.style.inset = "auto"; e.style.zIndex = o.z ?? 15; e.style.mixBlendMode = "screen";
    e.style.borderRadius = "50%"; e.style.background = `radial-gradient(circle, ${o.c || K.fl}d0, ${o.c || K.fl}55 40%, transparent 70%)`;
    tl.fromTo(e, { opacity: 0, scale: .3 }, { opacity: 1, scale: 1, duration: .7, ease: E.in, immediateRender: true }, t);
    tl.to(e, { scale: 1.18, opacity: .75, duration: .45, ease: E.soft, yoyo: true, repeat: Math.max(1, Math.round((o.d ?? 4) / .45)) }, t + .7);
    if (o.until) out(e, o.until); return e;
  }
  /* headline: words press up through a mask; <b>word</b> gets colour o.c and a meniscus underline that fills */
  function head(en, t, o = {}) {
    const wrap = mk("div", "ac-en", o.parent); if (o.c) wrap.style.setProperty("--c", o.c);
    const parts = en.split(/(<b>.*?<\/b>)/).filter(Boolean).map((p) => { const bold = p.startsWith("<b>"), s = p.replace(/<\/?b>/g, "");
      const ws = s.split(/(\s+)/).filter((x) => x).map((x) => `<span class="w">${x}</span>`).join(""); return bold ? `<b>${ws}<span class="men"></span></b>` : ws; }).join("");
    wrap.innerHTML = `<div style="overflow:hidden;padding:0 .06em .14em">${parts}</div>`;
    place(wrap, o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .14 : .62)); if (o.size) wrap.style.fontSize = u * o.size * 1.25 + "px"; if (o.align === "center") centre(wrap);
    if (o.align === "right") { wrap.style.left = "auto"; wrap.style.right = (o.x ?? W * .06) + "px"; wrap.style.textAlign = "right"; }
    if (o.z) wrap.style.zIndex = o.z;
    fitw(wrap, o.align === "right" ? 0 : (o.x ?? W * (V ? .07 : .06)));
    const ws = wrap.querySelectorAll(".w");
    tl.fromTo(wrap, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    tl.fromTo(ws, { yPercent: 110, skewY: 7 }, { yPercent: 0, skewY: 0, duration: .55, ease: E.in, stagger: .07, immediateRender: true }, t);
    wrap.querySelectorAll(".men").forEach((m) => tl.fromTo(m, { scaleX: 0 }, { scaleX: 1, duration: .5, ease: E.io, immediateRender: true }, t + .35));
    if (o.until) out(wrap, o.until); return wrap;
  }
  function te(html, t, o = {}) { const e = place(mk("div", "ac-te", o.parent, html), o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .3 : .76)); if (o.c) e.style.setProperty("--c", o.c);
    if (o.size) e.style.fontSize = u * o.size * 1.15 + "px"; if (o.align === "center") { centre(e); e.style.paddingLeft = "0"; } if (o.z) e.style.zIndex = o.z;
    fitw(e, o.x ?? W * (V ? .07 : .06));
    show(e, t, { opacity: 0, x: -u * 3 }, .5, E.snap); if (o.until) out(e, o.until); return e; }
  function tag(text, t, o = {}) { const e = place(mk("div", "ac-tag", o.parent, `<i></i><span>${text}</span>`), o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .09 : .1));
    if (o.c) e.style.setProperty("--c", o.c); if (o.z) e.style.zIndex = o.z; if (o.align === "center") { e.style.left = W / 2 + "px"; e.style.transform = "translateX(-50%)"; }
    tl.fromTo(e, { opacity: 0, clipPath: "inset(0% 100% 0% 0%)" }, { opacity: 1, clipPath: "inset(0% 0% 0% 0%)", duration: .5, ease: E.io, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  function num(from, to, t, o = {}) {
    const e = place(mk("div", "ac-num", o.parent), o.x ?? W * .06, o.y ?? H * .3); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.c) e.style.setProperty("--c", o.c);
    if (o.align === "center") centre(e); if (o.z) e.style.zIndex = o.z;
    const f = o.fmt || ((v) => Math.round(v).toLocaleString("en-IN")), sm = o.unit ? `<small>${o.unit}</small>` : "", v = { v: from }; e.innerHTML = (o.pre || "") + f(from) + sm;
    show(e, t, { opacity: 0, y: u * 4, filter: "blur(10px)" }, .5, E.snap);
    tl.fromTo(v, { v: from }, { v: to, duration: o.d ?? 1.4, ease: "power2.out", immediateRender: true, onUpdate: () => { e.innerHTML = (o.pre || "") + f(v.v) + sm; } }, t);
    if (o.until) out(e, o.until); return e;
  }
  /* callout: dot at (x,y) + leader line to the label at (x+dx, y+dy) */
  function callout(x, y, dx, dy, text, t, o = {}) {
    const c = o.c || K.acid, e = place(mk("div", "ac-call", o.parent), x, y); e.style.setProperty("--c", c); if (o.z) e.style.zIndex = o.z;
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
  /* list items [[html, t, ok]] ok true = porcelain tick, false = flame cross, null = acid !, "n" = number badge */
  function list(items, x, y, o = {}) {
    const e = place(mk("div", "ac-list", o.parent), x, y); e.style.zIndex = o.z ?? 12;
    items.forEach(([h, t, ok], i) => { const li = mk("div", "ac-li", e, `<em>${ok === false ? "✕" : ok === null ? "!" : ok === "n" ? i + 1 : "✓"}</em><span>${h}</span>`);
      li.style.setProperty("--c", ok === false ? K.fl : ok === null || ok === "n" ? K.acid : K.por); if (o.size) li.style.fontSize = u * o.size * 1.15 + "px";
      show(li, t, { opacity: 0, x: -u * 5 }, .45, E.snap); });
    if (o.until) out(e, o.until); return e;
  }
  /* myth card: pH paper strip turns flame (or porcelain if o.fact) at ts, stamp */
  function myth(html, t, ts, o = {}) {
    const e = place(mk("div", "ac-myth", o.parent, `<div class="strip"></div><span>${html}</span>`), o.x ?? W * .06, o.y ?? H * .2); e.style.zIndex = 12;
    show(e, t, { opacity: 0, y: u * 4 }, .55, E.snap);
    const col = o.fact ? K.por : K.fl; tl.to(e.querySelector(".strip"), { backgroundColor: col, duration: .5, ease: E.soft }, ts);
    const s = mk("div", "st", e, o.stamp || "MYTH"); s.style.setProperty("--c", col);
    tl.fromTo(s, { scale: 1.8, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: -4, duration: .45, ease: E.pop, immediateRender: true }, ts + .1);
    if (o.until) out(e, o.until); return e;
  }
  function phone(html, x, y, h, t, o = {}) { const w = h * .49, e = place(mk("div", "ac-phone", o.parent), x, y, w, h); e.style.zIndex = o.z ?? 14;
    const s = mk("div", "scr", e, html); show(e, t, { opacity: 0, y: u * 12, rotation: o.rot ?? 5 }, .8, E.snap); e.scr = s; if (o.until) out(e, o.until); return e; }
  function doc(html, x, y, w, h, t, o = {}) { const e = place(mk("div", "ac-doc", o.parent, html), x, y, w, h); e.style.zIndex = o.z ?? 13;
    tl.fromTo(e, { opacity: 0, y: u * 10, rotation: o.rot ?? -4 }, { opacity: 1, y: 0, rotation: o.rest ?? 1.5, duration: .8, ease: E.snap, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  function ring(x, y, t, o = {}) { const r = o.r || u * 8, n = o.n || 3;
    for (let i = 0; i < n; i++) { const e = place(mk("div", "ac-ring", o.parent), x - r, y - r, r * 2, r * 2); e.style.setProperty("--c", o.c || K.fl); e.style.zIndex = o.z ?? 16;
      gsap.set(e, { opacity: 0 }); tl.fromTo(e, { scale: .1, opacity: .9 }, { scale: 1, opacity: 0, duration: o.d || 1.5, ease: "power1.out", immediateRender: false }, t + i * .35); } }
  const flash = (t, d = .4, c) => { const f = mk("div", "ac-flash", $("root")); if (c) f.style.background = c;
    tl.fromTo(f, { opacity: .5 }, { opacity: 0, duration: d, ease: "power2.out", immediateRender: false }, t); tl.set(f, { opacity: 0 }, 0); };
  const cam = (t, d, to) => tl.to($("stage"), { duration: d, ease: E.io, ...to }, t);
  window.AC = { S, P, W, H, D, V, u, K, tl, E, R, at, $, mk, place, ix, src, out, show, svg, fitw, wave, shot, enter, morph, drench, fizz, heat, head, te, tag, num,
                callout, list, myth, phone, doc, ring, flash, cam, done: () => finish(tl) };
})();
