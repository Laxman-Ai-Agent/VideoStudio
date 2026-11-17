/* smoke_kit (16_Lung_Cancer): "lightbox & ember" cinematic documentary look, written fresh for this video (user brief 2026-11-17:
   big AI images, constant camera motion, frequent compositions, meaningful screens / documents, 2D motion graphics).
   Warm graphite reading-room frame; ember = smoke / tumour / danger, ice (X-ray blue) = anatomy / right action, bone = type.
   Core (this file): shot (full-bleed or film panel image, camera move + entrance), film (image clipped on a lightbox with a scan beam),
   smoke (canvas wisps), head (one-line slide-in headline with ember bar), te (Telugu line), tag (label), num (counter), focus,
   myth (claim + strike + stamp), list, phone / doc (screens with real content), ring, flash, cam, out, morph.
   Science parts in sm2.js (lungs, body, cells, dna, people, donut, cal, dial). Scene code: const { ... } = SM; build; SM.done(). */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, V = H > W, u = Math.min(W, H) / 100;
  const C = S.colors || {};
  const K = { bg: C.background || "#0E0C0B", ice: C.primary || "#9CC4E4", em: C.secondary || "#FF6A2A", bone: C.text || "#EFE9DF",
              mute: C.text2 || "#9A928A", panel: C.panel || "rgba(22,19,17,0.82)", ok: "#9FD8A4" };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "expo.out", snap: "power4.out", io: "power3.inOut", soft: "sine.inOut", out: "power2.in", pop: "back.out(1.5)" };
  const IMG = S.images || [], B = P.beats || {};
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; background: radial-gradient(ellipse at 55% 40%, #1F1915, ${K.bg} 70%); }
  #stage { position: absolute; inset: 0; overflow: hidden; transform-origin: 50% 50%; }
  .sm-shot { position: absolute; overflow: hidden; background: #050404; }
  .sm-shot .sm-im { position: absolute; inset: -8%; background: #15110f no-repeat center / cover; filter: contrast(1.06) saturate(.94) sepia(.08); will-change: transform; }
  .sm-shot .sm-miss { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: ${K.mute}; font: 600 ${u * 2.2}px var(--font-script);
    letter-spacing: .3em; background: radial-gradient(circle at 50% 45%, #2a211c, #070605 70%); }
  .sm-shot .sm-sh { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 50%, transparent 52%, #050404c0 100%),
    linear-gradient(0deg, #050404b0, transparent 36%, transparent 82%, #05040470); }
  .sm-shot.panel { border-radius: ${u * .5}px; box-shadow: 0 ${u * 1.6}px ${u * 5}px #000000c0, 0 0 0 ${Math.max(1, u * .14)}px var(--c, ${K.bone})55; }
  .sm-shot.panel .sm-sh { background: linear-gradient(0deg, #05040490, transparent 40%); }
  .sm-cap { position: absolute; left: ${u * 1.4}px; top: ${u * 1.2}px; font: 600 ${u * (V ? 2.5 : 1.6)}px var(--font-script); letter-spacing: .2em; color: ${K.bone};
    text-transform: uppercase; padding-left: ${u * 1.1}px; border-left: ${u * .35}px solid var(--c, ${K.em}); text-shadow: 0 0 ${u}px #000; }
  .sm-film { position: absolute; background: #EAF2F8; padding: ${u * .9}px; border-radius: ${u * .4}px;
    box-shadow: 0 0 ${u * 6}px #cfe3f455, 0 ${u * 2}px ${u * 6}px #000000c0; }
  .sm-film .fi { position: absolute; inset: ${u * .9}px; background: #000 no-repeat center / cover; filter: grayscale(1) contrast(1.25) brightness(1.05); overflow: hidden; }
  .sm-film .clip { position: absolute; top: -${u * 1.4}px; width: ${u * 4}px; height: ${u * 2.2}px; background: linear-gradient(#cfcac2, #8a847c); border-radius: ${u * .3}px; }
  .sm-film .beam { position: absolute; left: 0; right: 0; height: ${u * 1.2}px; background: linear-gradient(0deg, transparent, var(--c, ${K.ice})cc, transparent);
    box-shadow: 0 0 ${u * 3}px var(--c, ${K.ice}); mix-blend-mode: screen; }
  .sm-fx { position: absolute; inset: 0; pointer-events: none; }
  .sm-en { position: absolute; font: 800 ${u * (V ? 7.6 : 6.4)}px var(--font-head); line-height: 1; letter-spacing: -.035em; color: ${K.bone}; white-space: nowrap;
    text-shadow: 0 ${u * .4}px ${u * 3}px #000000c0; }
  .sm-en b { font-weight: inherit; color: var(--c, ${K.em}); }
  .sm-en .bar { position: absolute; left: 0; bottom: -${u * .9}px; height: ${u * .45}px; width: ${u * 7}px; background: var(--c, ${K.em}); transform-origin: 0 50%; }
  .sm-te { position: absolute; font: 600 ${u * (V ? 4.8 : 3.7)}px var(--font); color: ${K.bone}; line-height: 1.4; text-shadow: 0 ${u * .3}px ${u * 2}px #000; white-space: nowrap; }
  .sm-te b { color: var(--c, ${K.em}); font-weight: 700; }
  .sm-tag { position: absolute; font: 600 ${u * (V ? 2.7 : 1.8)}px var(--font-script); letter-spacing: .2em; text-transform: uppercase; color: ${K.bone}; white-space: nowrap;
    padding: ${u * .4}px ${u * 1.2}px; background: #120f0dd8; border-left: ${u * .4}px solid var(--c, ${K.em}); }
  .sm-num { position: absolute; font: 800 ${u * (V ? 19 : 16)}px var(--font-head); line-height: .9; color: ${K.bone}; letter-spacing: -.05em; white-space: nowrap; }
  .sm-num small { font-size: .3em; letter-spacing: 0; color: var(--c, ${K.em}); margin-left: .15em; }
  .sm-focus { position: absolute; }
  .sm-focus .lab { position: absolute; white-space: nowrap; font: 600 ${u * (V ? 2.6 : 1.75)}px var(--font-script); letter-spacing: .16em; color: ${K.bg}; background: var(--c, ${K.em});
    padding: ${u * .3}px ${u * .9}px; text-transform: uppercase; }
  .sm-myth { position: absolute; padding: ${u * 1.5}px ${u * 2.2}px; background: ${K.panel}; border-top: ${u * .35}px solid ${K.em};
    font: 600 ${u * (V ? 5 : 4.2)}px var(--font); color: ${K.bone}; white-space: nowrap; box-shadow: 0 ${u}px ${u * 4}px #000000a0; }
  .sm-myth .ln { position: absolute; left: ${u * 1.6}px; right: ${u * 1.6}px; top: 54%; height: ${u * .4}px; background: ${K.em}; transform-origin: 0 50%; }
  .sm-stamp { position: absolute; font: 800 ${u * (V ? 5.2 : 4)}px var(--font-head); color: var(--c, ${K.em}); border: ${u * .4}px solid var(--c, ${K.em}); padding: ${u * .1}px ${u * 1.2}px;
    letter-spacing: .04em; white-space: nowrap; background: #0e0c0bdd; }
  .sm-list { position: absolute; display: flex; flex-direction: column; gap: ${u * .9}px; }
  .sm-li { display: flex; align-items: center; gap: ${u * 1.1}px; font: 600 ${u * (V ? 4 : 3.1)}px var(--font); color: ${K.bone}; white-space: nowrap;
    padding: ${u * .45}px ${u * 1.6}px ${u * .45}px ${u * .5}px; background: ${K.panel}; border-left: ${u * .35}px solid var(--c, ${K.ice}); }
  .sm-li em { font: 800 ${u * (V ? 2.8 : 2.1)}px var(--font-head); font-style: normal; width: ${u * (V ? 4.4 : 3.4)}px; height: ${u * (V ? 4.4 : 3.4)}px;
    display: flex; align-items: center; justify-content: center; color: ${K.bg}; background: var(--c, ${K.ice}); flex: none; }
  .sm-phone { position: absolute; border-radius: ${u * 3.6}px; background: #141110; padding: ${u}px; box-shadow: 0 ${u * 2}px ${u * 7}px #000000d0, inset 0 0 0 ${u * .25}px #3a322c; }
  .sm-phone .scr { position: relative; width: 100%; height: 100%; border-radius: ${u * 2.7}px; overflow: hidden; background: linear-gradient(170deg, #241d19, #0d0b0a);
    font-family: var(--font-script); color: ${K.bone}; }
  .sm-doc { position: absolute; background: #F4F1EA; color: #1b1714; border-radius: ${u * .3}px; padding: ${u * 2}px ${u * 2.4}px; box-shadow: 0 ${u * 2}px ${u * 6}px #000000c0;
    font: 500 ${u * (V ? 2.7 : 2.05)}px var(--font-script); line-height: 1.42; overflow: hidden; }
  .sm-doc h3 { margin: 0 0 ${u * .4}px; font: 800 ${u * (V ? 3.3 : 2.6)}px var(--font-head); letter-spacing: -.02em; }
  .sm-doc .rule { height: ${u * .25}px; background: #1b1714; margin: ${u * .5}px 0 ${u * .9}px; }
  .sm-doc .hl { background: #ffd2bd; padding: 0 ${u * .3}px; }
  .sm-dot { position: absolute; border-radius: 50%; }
  .sm-ring { position: absolute; border-radius: 50%; border: ${u * .25}px solid var(--c, ${K.em}); }
  .sm-flash { position: absolute; inset: 0; background: #fff6ec; opacity: 0; z-index: 40; pointer-events: none; }`;
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

  /* shrink a one-line text element until it fits the frame (re-run when the web fonts arrive) */
  const fitw = (e, x) => { const go = () => { const r = document.createRange(); r.selectNodeContents(e); const w = r.getBoundingClientRect().width,
      room = e.style.textAlign === "center" ? W * .92 : (e.style.right ? W * .9 : W - (x ?? 0) - W * .04); if (w > room) e.style.fontSize = parseFloat(getComputedStyle(e).fontSize) * room / w + "px"; };
    go(); if (document.fonts) document.fonts.ready.then(go); };
  /* camera moves on the inner image (a = amount) */
  const MOVES = {
    push: (a) => [{ scale: 1 }, { scale: 1 + .15 * a }], pull: (a) => [{ scale: 1 + .2 * a }, { scale: 1 }],
    panL: (a) => [{ xPercent: 4 * a, scale: 1.04 }, { xPercent: -4 * a, scale: 1.04 }], panR: (a) => [{ xPercent: -4 * a, scale: 1.04 }, { xPercent: 4 * a, scale: 1.04 }],
    rise: (a) => [{ yPercent: 4 * a, scale: 1.06 }, { yPercent: -4 * a, scale: 1.06 }], sink: (a) => [{ yPercent: -4 * a, scale: 1.06 }, { yPercent: 4 * a, scale: 1.06 }],
    orbit: (a) => [{ rotation: -2 * a, scale: 1.13, xPercent: -3 * a }, { rotation: 2 * a, scale: 1.07, xPercent: 3 * a }],
    dive: (a) => [{ scale: 1.02 }, { scale: 1 + .4 * a }], drift: (a) => [{ scale: 1.05, xPercent: -1.5 * a, yPercent: 1 * a }, { scale: 1.1, xPercent: 1.5 * a, yPercent: -1 * a }],
  };
  /* image shot. o: t, d (move length), mv, a, in, box [x,y,w,h], panel, cap, c, fx/fy focus, z, until, parent */
  function shot(k, o = {}) {
    const t = o.t ?? 0, d = o.d ?? 3.2, b = o.box || [0, 0, W, H];
    const e = place(mk("div", "sm-shot" + (o.panel ? " panel" : ""), o.parent), ...b), im = mk("div", "sm-im", e); mk("div", "sm-sh", e);
    const s = src(k); if (s) im.style.backgroundImage = `url("${s}")`; else mk("div", "sm-miss", e, "IMAGE " + k);
    im.style.transformOrigin = `${(o.fx ?? .5) * 100}% ${(o.fy ?? .5) * 100}%`;
    if (o.c) e.style.setProperty("--c", o.c);
    if (o.cap) mk("div", "sm-cap", e, o.cap);
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
    if (how === "smoke") tl.fromTo(e, { opacity: 0, scale: 1.06, filter: "blur(22px) brightness(.4)" }, { opacity: 1, scale: 1, filter: "blur(0px) brightness(1)", duration: 1.0, ease: E.in, immediateRender: true }, t);
    else if (how === "scan") tl.fromTo(e, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .85, ease: E.io, immediateRender: true }, t);
    else if (how === "iris") tl.fromTo(e, { clipPath: `circle(0% at ${fx}% ${fy}%)` }, { clipPath: `circle(150% at ${fx}% ${fy}%)`, duration: .9, ease: E.io, immediateRender: true }, t);
    else if (how === "wipe") tl.fromTo(e, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .75, ease: E.io, immediateRender: true }, t);
    else if (how === "wipeL") tl.fromTo(e, { clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .75, ease: E.io, immediateRender: true }, t);
    else if (how === "slide") tl.fromTo(e, { xPercent: o.dir === -1 ? -110 : 110 }, { xPercent: 0, duration: .75, ease: E.snap, immediateRender: true }, t);
    else if (how === "rise") tl.fromTo(e, { yPercent: 25, opacity: 0, rotation: o.rot ?? 0 }, { yPercent: 0, opacity: 1, rotation: 0, duration: .75, ease: E.snap, immediateRender: true }, t);
    else if (how === "zoom") tl.fromTo(e, { scale: .55, opacity: 0, filter: "blur(12px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: .75, ease: E.in, immediateRender: true }, t);
    else if (how === "fade") tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: .6, ease: E.soft, immediateRender: true }, t);
  }
  const morph = (e, t, box, d = .9) => tl.to(e, { left: box[0], top: box[1], width: box[2], height: box[3], duration: d, ease: E.io }, t);
  /* film on a lightbox: image k grayscale on a glowing white frame, clip on top, scan beam sweeps at o.scan (times list) */
  function film(k, x, y, w, h, t, o = {}) {
    const e = place(mk("div", "sm-film", o.parent), x, y, w, h); e.style.zIndex = o.z ?? 10; if (o.c) e.style.setProperty("--c", o.c);
    const fi = mk("div", "fi", e), s = src(k); if (s) fi.style.backgroundImage = `url("${s}")`; else mk("div", "sm-miss", fi, "IMAGE " + k);
    if (o.color) fi.style.filter = "contrast(1.08)";
    place(mk("div", "clip", e), w / 2 - u * 2, -u * 1.4);
    tl.fromTo(e, { opacity: 0, y: -u * 8, rotation: o.rot ?? -3 }, { opacity: 1, y: 0, rotation: o.rest ?? 0, duration: .8, ease: E.snap, immediateRender: true }, t);
    tl.fromTo(fi, { filter: "grayscale(1) brightness(3) contrast(.4)" }, { filter: o.color ? "grayscale(0) brightness(1) contrast(1.08)" : "grayscale(1) brightness(1.05) contrast(1.25)", duration: 1.1, ease: E.soft, immediateRender: true }, t + .2);
    tl.fromTo(fi, { scale: 1 }, { scale: 1.1, duration: o.d ?? 6, ease: "none", immediateRender: true }, t);
    (o.scan || []).forEach((st) => { const b = mk("div", "beam", fi); tl.fromTo(b, { top: "-6%", opacity: 0 }, { top: "100%", opacity: 1, duration: 1.4, ease: E.soft, immediateRender: true }, st);
      tl.to(b, { opacity: 0, duration: .25 }, st + 1.3); });
    if (o.until) out(e, o.until); e.fi = fi; return e;
  }
  /* smoke: canvas of soft curling wisps rising from the bottom (or from (ox,oy)), dens [[t, density 0-1]], ember tint c */
  function smoke(o = {}) {
    const b = o.box || [0, 0, W, H], cv = place(mk("canvas", "sm-fx", o.parent), b[0], b[1], b[2], b[3]); cv.width = Math.round(b[2] / 2); cv.height = Math.round(b[3] / 2);
    cv.style.width = b[2] + "px"; cv.style.height = b[3] + "px"; cv.style.zIndex = o.z ?? 20; cv.style.mixBlendMode = o.blend || "screen";
    const g = cv.getContext("2d"), n = o.n ?? 26, cw = cv.width, ch = cv.height;
    const col = o.c || "#cbbdb0", rgb = [1, 3, 5].map((k) => parseInt(col.slice(k, k + 2), 16));
    const keys = o.dens || [[0, .6]];
    const den = (t) => { let v = keys[0][1]; for (let i = 0; i < keys.length; i++) if (t >= keys[i][0]) { const nx = keys[i + 1]; v = nx ? keys[i][1] + (nx[1] - keys[i][1]) * Math.min(1, (t - keys[i][0]) / Math.max(.01, nx[0] - keys[i][0])) : keys[i][1]; } return v; };
    const draw = (t) => {
      g.clearRect(0, 0, cw, ch); const dv = den(t);
      for (let i = 0; i < n; i++) {
        const life = 7 + R(i, 2) * 6, ph = ((t + R(i, 3) * life) % life) / life;
        const x0 = o.ox != null ? o.ox * cw : R(i, 4) * cw, y0 = o.oy != null ? o.oy * ch : ch * 1.1;
        const x = x0 + Math.sin(ph * 5 + i) * cw * .06 * (1 + ph * 2) + (o.wind ?? .05) * ph * cw, y = y0 - ph * ch * (o.rise ?? 1.1);
        const r = (o.r ?? .12) * Math.min(cw, ch) * (.4 + ph * 1.6), a = Math.sin(ph * Math.PI) * dv * (o.alpha ?? .22);
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
      }
    };
    const v = { t: 0 }; draw(0);
    tl.fromTo(v, { t: 0 }, { t: D, duration: D, ease: "none", immediateRender: true, onUpdate: () => draw(v.t) }, 0);
    gsap.set(cv, { opacity: 0 }); tl.to(cv, { opacity: 1, duration: 1, ease: E.soft }, o.t ?? 0);
    if (o.until) out(cv, o.until, .6); return cv;
  }
  /* headline: whole line slides up through a mask, ember bar draws under it; <b>word</b> takes colour o.c */
  function head(en, t, o = {}) {
    const wrap = mk("div", "sm-en", o.parent); if (o.c) wrap.style.setProperty("--c", o.c);
    wrap.innerHTML = `<div class="ln" style="overflow:hidden;padding-bottom:.08em"><div class="in">${en}</div></div>`;
    if (!o.nobar) mk("div", "bar", wrap);
    place(wrap, o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .14 : .64)); if (o.size) wrap.style.fontSize = u * o.size + "px"; if (o.align === "center") centre(wrap);
    if (o.align === "right") { wrap.style.left = "auto"; wrap.style.right = (o.x ?? W * .06) + "px"; wrap.style.textAlign = "right"; }
    if (o.z) wrap.style.zIndex = o.z;
    fitw(wrap, o.align === "right" ? 0 : (o.x ?? W * (V ? .07 : .06)));
    const bar = wrap.querySelector(".bar"); if (bar && o.align === "center") { bar.style.left = "50%"; bar.style.marginLeft = -u * 3.5 + "px"; }
    if (bar && o.align === "right") { bar.style.left = "auto"; bar.style.right = "0"; bar.style.transformOrigin = "100% 50%"; }
    tl.fromTo(wrap, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    tl.fromTo(wrap.querySelector(".in"), { yPercent: 130, skewY: 4 }, { yPercent: 0, skewY: 0, duration: .65, ease: E.in, immediateRender: true }, t);
    if (bar) tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: .5, ease: E.io, immediateRender: true }, t + .25);
    if (o.until) out(wrap, o.until); return wrap;
  }
  function te(html, t, o = {}) { const e = place(mk("div", "sm-te", o.parent, html), o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .3 : .75)); if (o.c) e.style.setProperty("--c", o.c);
    if (o.size) e.style.fontSize = u * o.size + "px"; if (o.align === "center") centre(e); if (o.z) e.style.zIndex = o.z;
    fitw(e, o.x ?? W * (V ? .07 : .06));
    show(e, t, { opacity: 0, x: -u * 2, filter: "blur(6px)" }, .5); if (o.until) out(e, o.until); return e; }
  function tag(text, t, o = {}) { const e = place(mk("div", "sm-tag", o.parent, text), o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .09 : .1));
    if (o.c) e.style.setProperty("--c", o.c); if (o.z) e.style.zIndex = o.z; if (o.align === "center") { e.style.left = W / 2 + "px"; e.style.transform = "translateX(-50%)"; }
    tl.fromTo(e, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .5, ease: E.io, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  /* counter */
  function num(from, to, t, o = {}) {
    const e = place(mk("div", "sm-num", o.parent), o.x ?? W * .06, o.y ?? H * .3); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.c) e.style.setProperty("--c", o.c);
    if (o.align === "center") centre(e); if (o.z) e.style.zIndex = o.z;
    const f = o.fmt || ((v) => Math.round(v).toLocaleString("en-IN")), sm = o.unit ? `<small>${o.unit}</small>` : "", v = { v: from }; e.innerHTML = f(from) + sm;
    show(e, t, { opacity: 0, y: u * 4, filter: "blur(10px)" }, .5, E.snap);
    tl.fromTo(v, { v: from }, { v: to, duration: o.d ?? 1.4, ease: "power2.out", immediateRender: true, onUpdate: () => { e.innerHTML = f(v.v) + sm; } }, t);
    if (o.until) out(e, o.until); return e;
  }
  /* focus: square brackets on (x,y) size r that close in, label beside */
  function focus(x, y, r, t, o = {}) {
    const c = o.c || K.em, e = place(mk("div", "sm-focus", o.parent), x - r, y - r, r * 2, r * 2); e.style.zIndex = o.z ?? 15; e.style.setProperty("--c", c);
    const L = r * .45, sw = u * .32;
    e.innerHTML = svg(r * 2, r * 2, [[0, 0, 1, 1], [r * 2, 0, -1, 1], [0, r * 2, 1, -1], [r * 2, r * 2, -1, -1]].map(([px, py, sx, sy]) =>
      `<path d="M${px},${py + sy * L} L${px},${py} L${px + sx * L},${py}" fill="none" stroke="${c}" stroke-width="${sw}" style="filter:drop-shadow(0 0 ${u * .5}px ${c})"/>`).join(""));
    tl.fromTo(e, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: .55, ease: E.snap, immediateRender: true }, t);
    if (o.label) { const lb = mk("div", "lab", e, o.label); lb.style.left = (o.side === -1 ? -u * 1.5 : r * 2 + u * 1.2) + "px"; lb.style.top = r - u * 1.5 + "px";
      if (o.side === -1) lb.style.transform = "translateX(-100%)"; show(lb, t + .35, { opacity: 0, x: o.side === -1 ? u * 3 : -u * 3 }, .45, E.snap); }
    if (o.until) out(e, o.until); return e;
  }
  /* myth: claim card, strike line, stamp at ts */
  function myth(html, t, ts, o = {}) {
    const e = place(mk("div", "sm-myth", o.parent, html), o.x ?? W * .06, o.y ?? H * .2); e.style.zIndex = 12;
    show(e, t, { opacity: 0, y: u * 4 }, .55, E.snap);
    const ln = mk("div", "ln", e); tl.fromTo(ln, { scaleX: 0 }, { scaleX: 1, duration: .35, ease: E.io, immediateRender: true }, ts);
    const s = mk("div", "sm-stamp", e, o.stamp || "MYTH"); s.style.right = -u * 1.5 + "px"; s.style.bottom = -u * (V ? 6.2 : 5) + "px"; if (o.sc) s.style.setProperty("--c", o.sc);
    tl.fromTo(s, { scale: 1.8, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: -6, duration: .45, ease: E.pop, immediateRender: true }, ts + .1);
    if (o.until) out(e, o.until); return e;
  }
  /* growing list: items [[html, t, ok]] (ok true = ice tick, false = ember cross, null = bone !) */
  function list(items, x, y, o = {}) {
    const e = place(mk("div", "sm-list", o.parent), x, y); e.style.zIndex = o.z ?? 12;
    items.forEach(([h, t, ok]) => { const li = mk("div", "sm-li", e, `<em>${ok === false ? "✕" : ok === null ? "!" : ok === "n" ? "" : "✓"}</em><span>${h}</span>`);
      li.style.setProperty("--c", ok === false || ok === "n" ? K.em : ok === null ? K.bone : K.ice); if (ok === "n") li.querySelector("em").style.display = "none";
      show(li, t, { opacity: 0, x: -u * 5 }, .45, E.snap); });
    if (o.until) out(e, o.until); return e;
  }
  function phone(html, x, y, h, t, o = {}) { const w = h * .49, e = place(mk("div", "sm-phone", o.parent), x, y, w, h); e.style.zIndex = o.z ?? 14;
    const s = mk("div", "scr", e, html); show(e, t, { opacity: 0, y: u * 12, rotation: o.rot ?? 5 }, .8, E.snap); e.scr = s; if (o.until) out(e, o.until); return e; }
  function doc(html, x, y, w, h, t, o = {}) { const e = place(mk("div", "sm-doc", o.parent, html), x, y, w, h); e.style.zIndex = o.z ?? 13;
    tl.fromTo(e, { opacity: 0, y: u * 10, rotation: o.rot ?? -4 }, { opacity: 1, y: 0, rotation: o.rest ?? 1.5, duration: .8, ease: E.snap, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  function ring(x, y, t, o = {}) { const r = o.r || u * 8, n = o.n || 3;
    for (let i = 0; i < n; i++) { const e = place(mk("div", "sm-ring", o.parent), x - r, y - r, r * 2, r * 2); e.style.setProperty("--c", o.c || K.em); e.style.zIndex = o.z ?? 16;
      gsap.set(e, { opacity: 0 }); tl.fromTo(e, { scale: .1, opacity: .9 }, { scale: 1, opacity: 0, duration: o.d || 1.5, ease: "power1.out", immediateRender: false }, t + i * .35); } }
  const flash = (t, d = .4, c) => { const f = mk("div", "sm-flash", $("root")); if (c) f.style.background = c;
    tl.fromTo(f, { opacity: .5 }, { opacity: 0, duration: d, ease: "power2.out", immediateRender: false }, t); tl.set(f, { opacity: 0 }, 0); };
  const cam = (t, d, to) => tl.to($("stage"), { duration: d, ease: E.io, ...to }, t);
  window.SM = { S, P, W, H, D, V, u, K, tl, E, R, at, $, mk, place, ix, src, out, show, svg, fitw, shot, enter, morph, film, smoke, head, te, tag, num, focus,
                myth, list, phone, doc, ring, flash, cam, done: () => finish(tl) };
})();
