/* night_kit (17_Sleep_Apnea): "night watch" cinematic documentary look, written fresh for this video (user brief 2026-11-17:
   big AI images, constant camera motion, frequent compositions, meaningful screens / documents, 2D motion graphics).
   Moonlit plum-black frame like a sleep-lab monitor at 3 AM; mint = breathing / oxygen OK / right action, coral = apnea / danger,
   moon-gold = night time, lilac = labels. Core (this file): shot (full-bleed or monitor-window image, camera move + entrance),
   win (image in a monitor window with REC bar), dust (moonlight motes canvas), blink (eyelid transition), head (letters rise),
   te, tag, num, focus (reticle), myth, list, phone / doc (screens with real content), ring, flash, cam, out, morph.
   Science parts in nw2.js (trace, spo2, airway, night, ahi, tank, mult, clock). Scene code: const { ... } = NW; build; NW.done(). */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, V = H > W, u = Math.min(W, H) / 100;
  const C = S.colors || {};
  const K = { bg: C.background || "#100B16", mint: C.primary || "#6FF0B4", co: C.secondary || "#FF5A6E", txt: C.text || "#F1ECF7",
              mute: C.text2 || "#9C93A8", lil: C.accent || "#C9B8FF", moon: "#F4D58D", panel: C.panel || "rgba(24,17,32,0.84)" };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "expo.out", snap: "power4.out", io: "power3.inOut", soft: "sine.inOut", out: "power2.in", pop: "back.out(1.6)" };
  const IMG = S.images || [], B = P.beats || {};
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; background: radial-gradient(ellipse at 60% 30%, #22182E, ${K.bg} 72%); }
  #stage { position: absolute; inset: 0; overflow: hidden; transform-origin: 50% 50%; }
  .nw-shot { position: absolute; overflow: hidden; background: #08060B; }
  .nw-shot .nw-im { position: absolute; inset: -8%; background: #140F1A no-repeat center / cover; filter: contrast(1.05) saturate(.92) hue-rotate(-4deg); will-change: transform; }
  .nw-shot .nw-miss { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: ${K.mute}; font: 500 ${u * 2.2}px var(--font-script);
    letter-spacing: .3em; background: radial-gradient(circle at 50% 45%, #2a2035, #08060B 70%); }
  .nw-shot .nw-sh { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 45%, transparent 50%, #08060Bc8 100%),
    linear-gradient(0deg, #08060Bb8, transparent 34%, transparent 84%, #08060B60); }
  .nw-shot.win { border-radius: ${u * .8}px; box-shadow: 0 ${u * 1.6}px ${u * 5}px #000000c8, 0 0 0 ${Math.max(1, u * .15)}px var(--c, ${K.lil})66; }
  .nw-shot.win .nw-sh { background: linear-gradient(0deg, #08060B90, transparent 40%); }
  .nw-bar { position: absolute; left: 0; right: 0; top: 0; height: ${u * (V ? 3.6 : 2.7)}px; display: flex; align-items: center; gap: ${u}px; padding: 0 ${u * 1.2}px;
    background: #0d0912d8; font: 500 ${u * (V ? 2.2 : 1.45)}px var(--font-script); letter-spacing: .18em; color: ${K.txt}; text-transform: uppercase; z-index: 3; }
  .nw-bar i { width: ${u * .9}px; height: ${u * .9}px; border-radius: 50%; background: var(--c, ${K.co}); box-shadow: 0 0 ${u}px var(--c, ${K.co}); }
  .nw-bar s { margin-left: auto; text-decoration: none; color: ${K.mute}; }
  .nw-fx { position: absolute; inset: 0; pointer-events: none; }
  .nw-lid { position: absolute; left: -5%; width: 110%; height: 55%; background: #050308; z-index: 45; pointer-events: none; }
  .nw-en { position: absolute; font: 700 ${u * (V ? 7.4 : 6.2)}px var(--font-head); line-height: 1.04; letter-spacing: -.025em; color: ${K.txt}; white-space: nowrap;
    text-shadow: 0 ${u * .4}px ${u * 3}px #000000c8; }
  .nw-en b { font-weight: 800; color: var(--c, ${K.co}); }
  .nw-en .ch { display: inline-block; white-space: pre; }
  .nw-en .dot { position: absolute; left: -${u * 2.2}px; top: .42em; width: ${u * 1.1}px; height: ${u * 1.1}px; border-radius: 50%; background: var(--c, ${K.co}); box-shadow: 0 0 ${u * 1.4}px var(--c, ${K.co}); }
  .nw-te { position: absolute; font: 600 ${u * (V ? 4.8 : 3.7)}px var(--font); color: ${K.txt}; line-height: 1.45; text-shadow: 0 ${u * .3}px ${u * 2}px #000; white-space: nowrap; }
  .nw-te b { color: var(--c, ${K.mint}); font-weight: 700; }
  .nw-tag { position: absolute; font: 500 ${u * (V ? 3.1 : 2.2)}px var(--font-script); letter-spacing: .2em; text-transform: uppercase; color: var(--c, ${K.lil}); white-space: nowrap;
    padding: ${u * .45}px ${u * 1.3}px; background: #0d0912d0; border: ${Math.max(1, u * .12)}px solid currentColor; border-radius: ${u * 3}px; }
  .nw-num { position: absolute; font: 800 ${u * (V ? 18 : 15)}px var(--font-head); line-height: .9; color: ${K.txt}; letter-spacing: -.05em; white-space: nowrap; }
  .nw-num small { font-size: .3em; letter-spacing: 0; color: var(--c, ${K.co}); margin-left: .15em; font-weight: 700; }
  .nw-focus { position: absolute; }
  .nw-focus .lab { position: absolute; white-space: nowrap; font: 500 ${u * (V ? 2.5 : 1.7)}px var(--font-script); letter-spacing: .16em; color: ${K.bg}; background: var(--c, ${K.co});
    padding: ${u * .3}px ${u * 1}px; text-transform: uppercase; border-radius: ${u * 2}px; }
  .nw-myth { position: absolute; padding: ${u * 1.6}px ${u * 2.4}px; background: ${K.panel}; border-radius: ${u * .8}px; border: ${Math.max(1, u * .15)}px solid #ffffff22;
    font: 600 ${u * (V ? 5 : 4.2)}px var(--font); color: ${K.txt}; white-space: nowrap; box-shadow: 0 ${u}px ${u * 4}px #000000a0; }
  .nw-myth .ln { position: absolute; left: ${u * 1.8}px; right: ${u * 1.8}px; top: 54%; height: ${u * .4}px; background: ${K.co}; transform-origin: 0 50%; border-radius: ${u}px; }
  .nw-stamp { position: absolute; font: 800 ${u * (V ? 4.8 : 3.6)}px var(--font-head); color: var(--c, ${K.co}); border: ${u * .35}px solid var(--c, ${K.co}); padding: ${u * .1}px ${u * 1.4}px;
    letter-spacing: .08em; white-space: nowrap; background: #100B16e0; border-radius: ${u * 3}px; }
  .nw-list { position: absolute; display: flex; flex-direction: column; gap: ${u * .9}px; }
  .nw-li { display: flex; align-items: center; gap: ${u * 1.1}px; font: 600 ${u * (V ? 4 : 3.1)}px var(--font); color: ${K.txt}; white-space: nowrap;
    padding: ${u * .4}px ${u * 1.8}px ${u * .4}px ${u * .5}px; background: ${K.panel}; border-radius: ${u * 4}px; }
  .nw-li em { font: 700 ${u * (V ? 2.6 : 2)}px var(--font-head); font-style: normal; width: ${u * (V ? 4.4 : 3.4)}px; height: ${u * (V ? 4.4 : 3.4)}px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; color: ${K.bg}; background: var(--c, ${K.mint}); flex: none; }
  .nw-phone { position: absolute; border-radius: ${u * 3.6}px; background: #120d17; padding: ${u}px; box-shadow: 0 ${u * 2}px ${u * 7}px #000000d0, inset 0 0 0 ${u * .25}px #3b3046; }
  .nw-phone .scr { position: relative; width: 100%; height: 100%; border-radius: ${u * 2.7}px; overflow: hidden; background: linear-gradient(170deg, #241b2e, #0c0910);
    font-family: var(--font-script); color: ${K.txt}; }
  .nw-doc { position: absolute; background: #F5F2FA; color: #1a1420; border-radius: ${u * .4}px; padding: ${u * 2}px ${u * 2.4}px; box-shadow: 0 ${u * 2}px ${u * 6}px #000000c0;
    font: 400 ${u * (V ? 3.2 : 2.5)}px var(--font-script); line-height: 1.45; overflow: hidden; }
  .nw-doc h3 { margin: 0 0 ${u * .4}px; font: 800 ${u * (V ? 3.8 : 3.1)}px var(--font-head); letter-spacing: -.02em; line-height: 1.15; }
  .nw-doc .rule { height: ${u * .22}px; background: #1a1420; margin: ${u * .5}px 0 ${u * .9}px; }
  .nw-doc .hl { background: #ffd0d6; padding: 0 ${u * .3}px; }
  .nw-doc .ok { background: #c9f7e1; padding: 0 ${u * .3}px; }
  .nw-ring { position: absolute; border-radius: 50%; border: ${u * .25}px solid var(--c, ${K.co}); }
  .nw-flash { position: absolute; inset: 0; background: #f6efff; opacity: 0; z-index: 40; pointer-events: none; }`;
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
    breathe: (a) => [{ scale: 1.04 }, { scale: 1.04 + .05 * a, yoyo: true, repeat: 3 }],
  };
  /* image shot. o: t, d (move length), mv, a, in, box [x,y,w,h], win (monitor window), bar (window label), c, fx/fy focus, z, until, parent */
  function shot(k, o = {}) {
    const t = o.t ?? 0, d = o.d ?? 3.2, b = o.box || [0, 0, W, H];
    const e = place(mk("div", "nw-shot" + (o.win ? " win" : ""), o.parent), ...b), im = mk("div", "nw-im", e); mk("div", "nw-sh", e);
    const s = src(k); if (s) im.style.backgroundImage = `url("${s}")`; else mk("div", "nw-miss", e, "IMAGE " + k);
    im.style.transformOrigin = `${(o.fx ?? .5) * 100}% ${(o.fy ?? .5) * 100}%`;
    if (o.c) e.style.setProperty("--c", o.c);
    if (o.bar) mk("div", "nw-bar", e, `<i></i><span>${o.bar}</span><s>${o.rec || "REC"}</s>`);
    if (o.z) e.style.zIndex = o.z;
    tl.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    const [fr, to] = MOVES[o.mv || "push"](o.a ?? 1);
    tl.fromTo(im, fr, { ...to, duration: to.repeat ? (d + .6) / 4 : d + .6, ease: o.mv === "dive" ? "power2.in" : o.mv === "breathe" ? E.soft : "none", immediateRender: true }, t);
    enter(e, t, o.in || "cut", o);
    if (o.until) out(e, o.until, .3);
    e.im = im; return e;
  }
  function enter(e, t, how, o = {}) {
    const fx = (o.fx ?? .5) * 100, fy = (o.fy ?? .5) * 100;
    if (how === "dim") tl.fromTo(e, { opacity: 0, filter: "brightness(.15) blur(8px)" }, { opacity: 1, filter: "brightness(1) blur(0px)", duration: 1.0, ease: E.soft, immediateRender: true }, t);
    else if (how === "blink") { blink(t - .25); tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: .01, immediateRender: true }, t); }
    else if (how === "iris") tl.fromTo(e, { clipPath: `circle(0% at ${fx}% ${fy}%)` }, { clipPath: `circle(150% at ${fx}% ${fy}%)`, duration: .9, ease: E.io, immediateRender: true }, t);
    else if (how === "wipe") tl.fromTo(e, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .75, ease: E.io, immediateRender: true }, t);
    else if (how === "wipeL") tl.fromTo(e, { clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .75, ease: E.io, immediateRender: true }, t);
    else if (how === "open") tl.fromTo(e, { clipPath: "inset(50% 0% 50% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .8, ease: E.io, immediateRender: true }, t);
    else if (how === "slide") tl.fromTo(e, { xPercent: o.dir === -1 ? -110 : 110 }, { xPercent: 0, duration: .75, ease: E.snap, immediateRender: true }, t);
    else if (how === "rise") tl.fromTo(e, { yPercent: 25, opacity: 0, rotation: o.rot ?? 0 }, { yPercent: 0, opacity: 1, rotation: 0, duration: .75, ease: E.snap, immediateRender: true }, t);
    else if (how === "zoom") tl.fromTo(e, { scale: .55, opacity: 0, filter: "blur(12px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: .75, ease: E.in, immediateRender: true }, t);
    else if (how === "fade") tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: .6, ease: E.soft, immediateRender: true }, t);
  }
  const morph = (e, t, box, d = .9) => tl.to(e, { left: box[0], top: box[1], width: box[2], height: box[3], duration: d, ease: E.io }, t);
  /* eyelid blink over the whole frame: lids close at t, open at t + hold */
  function blink(t, hold = .25) {
    const a = mk("div", "nw-lid", $("root")), b = mk("div", "nw-lid", $("root"));
    a.style.borderRadius = "0 0 50% 50% / 0 0 30% 30%"; b.style.borderRadius = "50% 50% 0 0 / 30% 30% 0 0";
    gsap.set(a, { top: "-56%" }); gsap.set(b, { top: "101%" });
    tl.to(a, { top: "-4%", duration: .22, ease: "power2.in" }, t).to(b, { top: "50%", duration: .22, ease: "power2.in" }, t);
    tl.to(a, { top: "-56%", duration: .35, ease: "power2.out" }, t + .22 + hold).to(b, { top: "101%", duration: .35, ease: "power2.out" }, t + .22 + hold);
  }
  /* dust: moonlight motes drifting in a beam (canvas), dens [[t, 0-1]] */
  function dust(o = {}) {
    const b = o.box || [0, 0, W, H], cv = place(mk("canvas", "nw-fx", o.parent), b[0], b[1], b[2], b[3]); cv.width = Math.round(b[2] / 2); cv.height = Math.round(b[3] / 2);
    cv.style.width = b[2] + "px"; cv.style.height = b[3] + "px"; cv.style.zIndex = o.z ?? 20; cv.style.mixBlendMode = "screen";
    const g = cv.getContext("2d"), n = o.n ?? 70, cw = cv.width, ch = cv.height, keys = o.dens || [[0, .7]];
    const col = o.c || "#E8DDF8", rgb = [1, 3, 5].map((k) => parseInt(col.slice(k, k + 2), 16));
    const den = (t) => { let v = keys[0][1]; for (let i = 0; i < keys.length; i++) if (t >= keys[i][0]) { const nx = keys[i + 1]; v = nx ? keys[i][1] + (nx[1] - keys[i][1]) * Math.min(1, (t - keys[i][0]) / Math.max(.01, nx[0] - keys[i][0])) : keys[i][1]; } return v; };
    const draw = (t) => {
      g.clearRect(0, 0, cw, ch); const dv = den(t);
      const beam = g.createLinearGradient(cw * .8, 0, cw * .3, ch); beam.addColorStop(0, `rgba(${rgb},${.07 * dv})`); beam.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = beam; g.beginPath(); g.moveTo(cw * .62, 0); g.lineTo(cw * .98, 0); g.lineTo(cw * .55, ch); g.lineTo(cw * .1, ch); g.fill();
      for (let i = 0; i < n; i++) {
        const sp = .01 + R(i, 2) * .025, x = ((R(i, 3) + t * sp * .6 + Math.sin(t * .4 + i) * .01) % 1) * cw, y = ((R(i, 4) - t * sp * .3) % 1 + 1) % 1 * ch;
        const r = (.6 + R(i, 5) * 1.8) * (cw / 960), a = (.25 + .75 * Math.abs(Math.sin(t * (.5 + R(i, 6)) + i))) * dv * .8;
        g.fillStyle = `rgba(${rgb},${a})`; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
      }
    };
    const v = { t: 0 }; draw(0);
    tl.fromTo(v, { t: 0 }, { t: D, duration: D, ease: "none", immediateRender: true, onUpdate: () => draw(v.t) }, 0);
    gsap.set(cv, { opacity: 0 }); tl.to(cv, { opacity: 1, duration: 1, ease: E.soft }, o.t ?? 0);
    if (o.until) out(cv, o.until, .6); return cv;
  }
  /* headline: letters rise one by one through a mask, glowing dot before it; <b>word</b> takes colour o.c */
  function head(en, t, o = {}) {
    const wrap = mk("div", "nw-en", o.parent); if (o.c) wrap.style.setProperty("--c", o.c);
    const parts = en.split(/(<b>.*?<\/b>)/).filter(Boolean).map((p) => { const bold = p.startsWith("<b>"), s = p.replace(/<\/?b>/g, "");
      const ch = [...s].map((c) => `<span class="ch">${c}</span>`).join(""); return bold ? `<b>${ch}</b>` : ch; }).join("");
    wrap.innerHTML = `<div style="overflow:hidden;padding:0 .05em .1em">${parts}</div>`;
    if (!o.nodot && o.align !== "center") mk("div", "dot", wrap);
    place(wrap, o.x ?? W * (V ? .08 : .07), o.y ?? H * (V ? .14 : .64)); if (o.size) wrap.style.fontSize = u * o.size + "px"; if (o.align === "center") centre(wrap);
    if (o.align === "right") { wrap.style.left = "auto"; wrap.style.right = (o.x ?? W * .06) + "px"; wrap.style.textAlign = "right"; }
    if (o.z) wrap.style.zIndex = o.z;
    fitw(wrap, o.align === "right" ? 0 : (o.x ?? W * (V ? .08 : .07)));
    const chs = wrap.querySelectorAll(".ch");
    tl.fromTo(wrap, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    tl.fromTo(chs, { yPercent: 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .5, ease: E.in, stagger: Math.min(.035, .55 / chs.length), immediateRender: true }, t);
    const dot = wrap.querySelector(".dot"); if (dot) tl.fromTo(dot, { scale: 0 }, { scale: 1, duration: .4, ease: E.pop, immediateRender: true }, t);
    if (o.until) out(wrap, o.until); return wrap;
  }
  function te(html, t, o = {}) { const e = place(mk("div", "nw-te", o.parent, html), o.x ?? W * (V ? .08 : .07), o.y ?? H * (V ? .3 : .76)); if (o.c) e.style.setProperty("--c", o.c);
    if (o.size) e.style.fontSize = u * o.size + "px"; if (o.align === "center") centre(e); if (o.z) e.style.zIndex = o.z;
    fitw(e, o.x ?? W * (V ? .08 : .07));
    show(e, t, { opacity: 0, y: u * 2, filter: "blur(8px)" }, .55); if (o.until) out(e, o.until); return e; }
  function tag(text, t, o = {}) { const e = place(mk("div", "nw-tag", o.parent, text), o.x ?? W * (V ? .08 : .07), o.y ?? H * (V ? .09 : .1));
    if (o.c) e.style.setProperty("--c", o.c); if (o.z) e.style.zIndex = o.z; if (o.align === "center") { e.style.left = W / 2 + "px"; e.style.transform = "translateX(-50%)"; }
    tl.fromTo(e, { opacity: 0, scale: .85 }, { opacity: 1, scale: 1, duration: .45, ease: E.pop, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  /* counter */
  function num(from, to, t, o = {}) {
    const e = place(mk("div", "nw-num", o.parent), o.x ?? W * .07, o.y ?? H * .3); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.c) e.style.setProperty("--c", o.c);
    if (o.align === "center") centre(e); if (o.z) e.style.zIndex = o.z;
    const f = o.fmt || ((v) => Math.round(v).toLocaleString("en-IN")), sm = o.unit ? `<small>${o.unit}</small>` : "", v = { v: from }; e.innerHTML = (o.pre || "") + f(from) + sm;
    show(e, t, { opacity: 0, y: u * 4, filter: "blur(10px)" }, .5, E.snap);
    tl.fromTo(v, { v: from }, { v: to, duration: o.d ?? 1.4, ease: "power2.out", immediateRender: true, onUpdate: () => { e.innerHTML = (o.pre || "") + f(v.v) + sm; } }, t);
    if (o.until) out(e, o.until); return e;
  }
  /* focus: monitor reticle (circle + 4 ticks) on (x,y) radius r that closes in, label beside */
  function focus(x, y, r, t, o = {}) {
    const c = o.c || K.co, e = place(mk("div", "nw-focus", o.parent), x - r, y - r, r * 2, r * 2); e.style.zIndex = o.z ?? 15; e.style.setProperty("--c", c);
    const sw = u * .28, tk = r * .3;
    e.innerHTML = svg(r * 2, r * 2, `<circle cx="${r}" cy="${r}" r="${r * .82}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-dasharray="${r * .5} ${r * .22}" style="filter:drop-shadow(0 0 ${u * .5}px ${c})"/>` +
      [[r, 0, r, tk], [r, r * 2, r, r * 2 - tk], [0, r, tk, r], [r * 2, r, r * 2 - tk, r]].map(([a, b, c2, d2]) => `<line x1="${a}" y1="${b}" x2="${c2}" y2="${d2}" stroke="${c}" stroke-width="${sw}"/>`).join(""));
    tl.fromTo(e, { scale: 1.7, opacity: 0, rotation: -60 }, { scale: 1, opacity: 1, rotation: 0, duration: .6, ease: E.snap, immediateRender: true }, t);
    if (o.label) { const lb = mk("div", "lab", e, o.label); lb.style.left = (o.side === -1 ? -u * 1.5 : r * 2 + u * 1.2) + "px"; lb.style.top = r - u * 1.5 + "px";
      if (o.side === -1) lb.style.transform = "translateX(-100%)"; show(lb, t + .35, { opacity: 0, x: o.side === -1 ? u * 3 : -u * 3 }, .45, E.snap); }
    if (o.until) out(e, o.until); return e;
  }
  /* myth: claim card, strike line, stamp at ts */
  function myth(html, t, ts, o = {}) {
    const e = place(mk("div", "nw-myth", o.parent, html), o.x ?? W * .07, o.y ?? H * .2); e.style.zIndex = 12;
    show(e, t, { opacity: 0, y: u * 4 }, .55, E.snap);
    const ln = mk("div", "ln", e); tl.fromTo(ln, { scaleX: 0 }, { scaleX: 1, duration: .35, ease: E.io, immediateRender: true }, ts);
    const s = mk("div", "nw-stamp", e, o.stamp || "MYTH"); s.style.right = -u * 1.5 + "px"; s.style.bottom = -u * (V ? 6.4 : 5.2) + "px"; if (o.sc) s.style.setProperty("--c", o.sc);
    tl.fromTo(s, { scale: 1.8, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: -5, duration: .45, ease: E.pop, immediateRender: true }, ts + .1);
    if (o.until) out(e, o.until); return e;
  }
  /* growing list: items [[html, t, ok]] (ok true = mint tick, false = coral cross, null = lilac !, "n" = no badge) */
  function list(items, x, y, o = {}) {
    const e = place(mk("div", "nw-list", o.parent), x, y); e.style.zIndex = o.z ?? 12;
    items.forEach(([h, t, ok]) => { const li = mk("div", "nw-li", e, `<em>${ok === false ? "✕" : ok === null ? "!" : "✓"}</em><span>${h}</span>`);
      li.style.setProperty("--c", ok === false ? K.co : ok === null ? K.lil : K.mint); if (ok === "n") li.querySelector("em").style.display = "none";
      if (o.size) li.style.fontSize = u * o.size + "px";
      show(li, t, { opacity: 0, x: -u * 5 }, .45, E.snap); });
    if (o.until) out(e, o.until); return e;
  }
  function phone(html, x, y, h, t, o = {}) { const w = h * .49, e = place(mk("div", "nw-phone", o.parent), x, y, w, h); e.style.zIndex = o.z ?? 14;
    const s = mk("div", "scr", e, html); show(e, t, { opacity: 0, y: u * 12, rotation: o.rot ?? 5 }, .8, E.snap); e.scr = s; if (o.until) out(e, o.until); return e; }
  function doc(html, x, y, w, h, t, o = {}) { const e = place(mk("div", "nw-doc", o.parent, html), x, y, w, h); e.style.zIndex = o.z ?? 13;
    tl.fromTo(e, { opacity: 0, y: u * 10, rotation: o.rot ?? -4 }, { opacity: 1, y: 0, rotation: o.rest ?? 1.5, duration: .8, ease: E.snap, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  function ring(x, y, t, o = {}) { const r = o.r || u * 8, n = o.n || 3;
    for (let i = 0; i < n; i++) { const e = place(mk("div", "nw-ring", o.parent), x - r, y - r, r * 2, r * 2); e.style.setProperty("--c", o.c || K.co); e.style.zIndex = o.z ?? 16;
      gsap.set(e, { opacity: 0 }); tl.fromTo(e, { scale: .1, opacity: .9 }, { scale: 1, opacity: 0, duration: o.d || 1.5, ease: "power1.out", immediateRender: false }, t + i * .35); } }
  const flash = (t, d = .4, c) => { const f = mk("div", "nw-flash", $("root")); if (c) f.style.background = c;
    tl.fromTo(f, { opacity: .5 }, { opacity: 0, duration: d, ease: "power2.out", immediateRender: false }, t); tl.set(f, { opacity: 0 }, 0); };
  const cam = (t, d, to) => tl.to($("stage"), { duration: d, ease: E.io, ...to }, t);
  window.NW = { S, P, W, H, D, V, u, K, tl, E, R, at, $, mk, place, ix, src, out, show, svg, fitw, shot, enter, morph, blink, dust, head, te, tag, num, focus,
                myth, list, phone, doc, ring, flash, cam, done: () => finish(tl) };
})();
