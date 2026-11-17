/* storm_kit (14_Epilepsy): "neural storm" cinematic documentary look, written fresh for this video (user brief 2026-11-17:
   big AI images, constant camera motion, frequent compositions, meaningful screens / documents, 2D motion graphics).
   Midnight navy frame; cyan = normal signals / right action, magenta = storm / danger / myth, amber = care / hope.
   Parts: shot (full-bleed or glass HUD panel image, camera move + entrance), net (canvas neuron network that fires and
   turns into a lightning storm), eeg (brain-wave trace), head (Unbounded type-on headline), te (Telugu line), hud (HUD
   label), num (counter), lock (scan brackets on an image detail), myth (claim card + strike + stamp), list (growing
   do / don't list), phone / doc (screens with real content), dots (dot-field share), bolt, ring, flash, cam, out.
   Scene code: const { ... } = SK; build; SK.done(). */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, V = H > W, u = Math.min(W, H) / 100;
  const C = S.colors || {};
  const K = { bg: C.background || "#050818", cy: C.primary || "#3DF2FF", mg: C.secondary || "#FF2D75", am: C.accent || "#FFC94A",
              ink: C.text || "#EEF3FF", mute: C.text2 || "#93A0C4", panel: C.panel || "rgba(8,13,36,0.82)" };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "expo.out", snap: "power4.out", io: "power3.inOut", soft: "sine.inOut", out: "power2.in", pop: "back.out(1.7)" };
  const IMG = S.images || [], B = P.beats || {};
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; background: radial-gradient(ellipse at 50% 40%, #0C1336, ${K.bg} 75%); }
  #stage { position: absolute; inset: 0; overflow: hidden; transform-origin: 50% 50%; }
  .sk-shot { position: absolute; overflow: hidden; background: #02040c; }
  .sk-shot .sk-im { position: absolute; inset: -8%; background: #0a0f24 no-repeat center / cover; filter: contrast(1.06) saturate(1.05); will-change: transform; }
  .sk-shot .sk-miss { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: ${K.mute}; font: 600 ${u * 2.2}px var(--font-script);
    letter-spacing: .3em; background: radial-gradient(circle at 50% 45%, #18224a, #04060f 70%); }
  .sk-shot .sk-sh { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 50%, transparent 52%, #02040cc0 100%),
    linear-gradient(0deg, #02040cb0, transparent 36%, transparent 78%, #02040c70); }
  .sk-shot.glass { border-radius: ${u * 1.2}px; box-shadow: 0 ${u * 1.5}px ${u * 6}px #000000c0, 0 0 0 ${Math.max(1, u * .14)}px ${K.cy}66; }
  .sk-shot.glass .sk-sh { background: linear-gradient(0deg, #02040c80, transparent 40%); }
  .sk-cap { position: absolute; left: ${u * 1.4}px; bottom: ${u * 1.1}px; font: 600 ${u * (V ? 2.4 : 1.5)}px var(--font-script); letter-spacing: .22em; color: ${K.ink}; text-transform: uppercase; }
  .sk-cap::before { content: ""; display: inline-block; width: ${u * .8}px; height: ${u * .8}px; border-radius: 50%; background: var(--c, ${K.cy}); margin-right: ${u * .8}px;
    box-shadow: 0 0 ${u}px var(--c, ${K.cy}); vertical-align: middle; }
  .sk-fx { position: absolute; inset: 0; pointer-events: none; }
  .sk-en { position: absolute; font: 700 ${u * (V ? 8.5 : 7.2)}px var(--font-head); line-height: 1.02; letter-spacing: -.02em; text-transform: uppercase; color: ${K.ink};
    white-space: nowrap; text-shadow: 0 0 ${u * 3}px #000000c0; }
  .sk-en b { font-weight: inherit; color: var(--c, ${K.cy}); text-shadow: 0 0 ${u * 2.4}px var(--c, ${K.cy}); }
  .sk-en .ch { display: inline-block; white-space: pre; }
  .sk-te { position: absolute; font: 400 ${u * (V ? 5.4 : 4.3)}px var(--font); color: ${K.ink}; line-height: 1.3; text-shadow: 0 ${u * .3}px ${u * 2}px #000; white-space: nowrap; }
  .sk-te b { color: var(--c, ${K.cy}); font-weight: 400; }
  .sk-hud { position: absolute; font: 600 ${u * (V ? 2.6 : 1.8)}px var(--font-script); letter-spacing: .3em; text-transform: uppercase; color: var(--c, ${K.cy}); white-space: nowrap;
    padding: ${u * .5}px ${u * 1.2}px; border: ${Math.max(1, u * .12)}px solid currentColor; background: #050818aa; }
  .sk-hud i { display: inline-block; width: ${u * .7}px; height: ${u * .7}px; background: currentColor; margin-right: ${u * .9}px; vertical-align: middle; font-style: normal; }
  .sk-num { position: absolute; font: 800 ${u * (V ? 22 : 19)}px var(--font-head); line-height: .9; color: ${K.ink}; letter-spacing: -.04em; white-space: nowrap;
    text-shadow: 0 0 ${u * 4}px var(--c, ${K.cy})88; }
  .sk-num small { font-size: .3em; letter-spacing: 0; color: var(--c, ${K.cy}); margin-left: .15em; }
  .sk-lock { position: absolute; }
  .sk-lock .k { position: absolute; width: 22%; height: 22%; border: 0 solid var(--c, ${K.cy}); filter: drop-shadow(0 0 ${u * .6}px var(--c, ${K.cy})); }
  .sk-lock .lab { position: absolute; left: 0; top: 100%; margin-top: ${u * .8}px; font: 600 ${u * (V ? 2.6 : 1.7)}px var(--font-script); letter-spacing: .2em; color: ${K.bg};
    background: var(--c, ${K.cy}); padding: ${u * .3}px ${u * .9}px; white-space: nowrap; text-transform: uppercase; }
  .sk-myth { position: absolute; padding: ${u * 1.6}px ${u * 2.2}px; background: ${K.panel}; border-left: ${u * .6}px solid ${K.mg}; border-radius: ${u * .6}px;
    font: 400 ${u * (V ? 4.6 : 3.4)}px var(--font); color: ${K.ink}; white-space: nowrap; box-shadow: 0 ${u}px ${u * 4}px #000000a0; }
  .sk-myth .ln { position: absolute; left: ${u * 1.6}px; right: ${u * 1.6}px; top: 50%; height: ${u * .5}px; background: ${K.mg}; transform-origin: 0 50%; box-shadow: 0 0 ${u}px ${K.mg}; }
  .sk-stamp { position: absolute; font: 800 ${u * (V ? 6 : 4.6)}px var(--font-head); color: ${K.mg}; border: ${u * .5}px solid ${K.mg}; padding: ${u * .2}px ${u * 1.4}px;
    letter-spacing: .06em; border-radius: ${u * .6}px; white-space: nowrap; text-shadow: 0 0 ${u * 2}px ${K.mg}aa; }
  .sk-list { position: absolute; display: flex; flex-direction: column; gap: ${u * 1.1}px; }
  .sk-li { display: flex; align-items: center; gap: ${u * 1.2}px; font: 400 ${u * (V ? 4.2 : 3.1)}px var(--font); color: ${K.ink}; white-space: nowrap;
    padding: ${u * .6}px ${u * 1.6}px ${u * .6}px ${u * .8}px; background: ${K.panel}; border-radius: ${u * .5}px; }
  .sk-li em { font: 700 ${u * (V ? 3.2 : 2.4)}px var(--font-head); font-style: normal; width: ${u * (V ? 5 : 3.8)}px; height: ${u * (V ? 5 : 3.8)}px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; color: ${K.bg}; background: var(--c, ${K.cy}); flex: none; }
  .sk-phone { position: absolute; border-radius: ${u * 4}px; background: #0b0f1e; padding: ${u * 1.1}px; box-shadow: 0 ${u * 2}px ${u * 7}px #000000d0, inset 0 0 0 ${u * .25}px #2a3358; }
  .sk-phone .scr { position: relative; width: 100%; height: 100%; border-radius: ${u * 3}px; overflow: hidden; background: linear-gradient(160deg, #101a3c, #060a1a);
    font-family: var(--font-script); color: ${K.ink}; }
  .sk-doc { position: absolute; background: #F4F1EA; color: #1a1f2e; border-radius: ${u * .4}px; padding: ${u * 2.2}px ${u * 2.6}px; box-shadow: 0 ${u * 2}px ${u * 6}px #000000c0;
    font: 400 ${u * 1.5}px var(--font-script); line-height: 1.5; overflow: hidden; }
  .sk-doc h3 { margin: 0 0 ${u * .6}px; font: 800 ${u * 2.4}px var(--font-head); letter-spacing: -.01em; }
  .sk-doc .rule { height: ${u * .3}px; background: #1a1f2e; margin: ${u * .6}px 0 ${u * 1}px; }
  .sk-dot { position: absolute; border-radius: 50%; }
  .sk-ring { position: absolute; border-radius: 50%; border: ${u * .3}px solid var(--c, ${K.cy}); box-shadow: 0 0 ${u * 2}px var(--c, ${K.cy}); }
  .sk-flash { position: absolute; inset: 0; background: #e8f6ff; opacity: 0; z-index: 40; pointer-events: none; }
  .sk-scan { position: absolute; left: 0; right: 0; height: ${u * .35}px; background: ${K.cy}; box-shadow: 0 0 ${u * 3}px ${u}px ${K.cy}88; z-index: 25; opacity: 0; }`;
  document.head.append(css);

  const $ = (id) => document.getElementById(id);
  const at = (k, d = 0) => (B[k] ?? d);
  const mk = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; (parent || stage()).append(e); return e; };
  function stage() { let s = $("stage"); if (!s) { s = document.createElement("div"); s.id = "stage"; $("root").append(s); } return s; }
  const place = (e, x, y, w, h) => { Object.assign(e.style, { left: x + "px", top: y + "px" }); if (w != null) e.style.width = w + "px"; if (h != null) e.style.height = h + "px"; return e; };
  const ix = (k) => (P.names || []).indexOf(k);
  const out = (e, t, d = .35, to = {}) => tl.to(e, { autoAlpha: 0, duration: d, ease: E.out, ...to }, t);
  const centre = (e) => { e.style.left = "0"; e.style.width = W + "px"; e.style.textAlign = "center"; };
  const show = (e, t, from, d = .6, ease = E.in) => tl.fromTo(e, from, { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0, filter: "blur(0px)", duration: d, ease, immediateRender: true }, t);

  /* camera moves on the inner image (a = amount) */
  const MOVES = {
    push: (a) => [{ scale: 1 }, { scale: 1 + .18 * a }], pull: (a) => [{ scale: 1 + .22 * a }, { scale: 1 }],
    panL: (a) => [{ xPercent: 4 * a, scale: 1.04 }, { xPercent: -4 * a, scale: 1.04 }], panR: (a) => [{ xPercent: -4 * a, scale: 1.04 }, { xPercent: 4 * a, scale: 1.04 }],
    rise: (a) => [{ yPercent: 4 * a, scale: 1.06 }, { yPercent: -4 * a, scale: 1.06 }], sink: (a) => [{ yPercent: -4 * a, scale: 1.06 }, { yPercent: 4 * a, scale: 1.06 }],
    orbit: (a) => [{ rotation: -2.5 * a, scale: 1.14, xPercent: -3 * a }, { rotation: 2.5 * a, scale: 1.08, xPercent: 3 * a }],
    dive: (a) => [{ scale: 1.02 }, { scale: 1 + .45 * a }], drift: (a) => [{ scale: 1.05, xPercent: -1.5 * a }, { scale: 1.1, xPercent: 1.5 * a }],
  };
  /* image shot. o: t, d (move length), mv, a, in, box [x,y,w,h], glass (HUD panel), cap (panel label), c, fx/fy focus, until */
  function shot(k, o = {}) {
    const t = o.t ?? 0, d = o.d ?? 3.2, b = o.box || [0, 0, W, H];
    const e = place(mk("div", "sk-shot" + (o.glass ? " glass" : ""), o.parent), ...b), im = mk("div", "sk-im", e); mk("div", "sk-sh", e);
    const i = ix(k); if (i >= 0 && IMG[i]) im.style.backgroundImage = `url("${IMG[i]}")`; else mk("div", "sk-miss", e, "IMAGE " + k);
    im.style.transformOrigin = `${(o.fx ?? .5) * 100}% ${(o.fy ?? .5) * 100}%`;
    if (o.cap) { const c = mk("div", "sk-cap", e, o.cap); if (o.c) c.style.setProperty("--c", o.c); }
    if (o.z) e.style.zIndex = o.z;
    tl.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    const [fr, to] = MOVES[o.mv || "push"](o.a ?? 1);
    tl.fromTo(im, fr, { ...to, duration: d + .6, ease: o.mv === "dive" ? "power2.in" : "none", immediateRender: true }, t);
    enter(e, t, o.in || "cut", o);
    if (o.until) out(e, o.until, .3);
    e.im = im; return e;
  }
  function enter(e, t, how, o = {}) {
    const fx = (o.fx ?? .5) * 100, fy = (o.fy ?? .5) * 100, r = o.glass ? ` round ${u * 1.2}px` : "";
    if (how === "flash") flash(t, .35);
    else if (how === "through") tl.fromTo(e, { scale: .55, opacity: 0, filter: "blur(16px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: .75, ease: E.in, immediateRender: true }, t);
    else if (how === "iris") tl.fromTo(e, { clipPath: `circle(0% at ${fx}% ${fy}%)` }, { clipPath: `circle(150% at ${fx}% ${fy}%)`, duration: .9, ease: E.io, immediateRender: true }, t);
    else if (how === "scan") { tl.fromTo(e, { clipPath: `inset(0% 0% 100% 0%${r})` }, { clipPath: `inset(0% 0% 0% 0%${r})`, duration: .8, ease: E.io, immediateRender: true }, t);
      const s = mk("div", "sk-scan", e); tl.fromTo(s, { top: "0%", opacity: 1 }, { top: "100%", duration: .8, ease: E.io, immediateRender: true }, t); tl.to(s, { opacity: 0, duration: .2 }, t + .8); }
    else if (how === "slide") tl.fromTo(e, { xPercent: o.dir === -1 ? -110 : 110 }, { xPercent: 0, duration: .75, ease: E.snap, immediateRender: true }, t);
    else if (how === "lift") tl.fromTo(e, { yPercent: 40, opacity: 0, rotation: o.rot ?? 0 }, { yPercent: 0, opacity: 1, duration: .7, ease: E.snap, immediateRender: true }, t);
    else if (how === "split") tl.fromTo(e, { clipPath: `inset(0% 50% 0% 50%${r})` }, { clipPath: `inset(0% 0% 0% 0%${r})`, duration: .7, ease: E.io, immediateRender: true }, t);
    else if (how === "fade") tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: .6, ease: E.soft, immediateRender: true }, t);
  }
  /* move / resize a shot or panel to a new box (layout morph) */
  const morph = (e, t, box, d = .9) => tl.to(e, { left: box[0], top: box[1], width: box[2], height: box[3], duration: d, ease: E.io }, t);

  /* canvas neuron network. o: n nodes, box, storm [[t0,t1],...] (magenta lightning), c, alpha, until. Deterministic by time. */
  function net(o = {}) {
    const b = o.box || [0, 0, W, H], cv = place(mk("canvas", "sk-fx", o.parent), b[0], b[1], b[2], b[3]); cv.width = b[2]; cv.height = b[3];
    if (o.z != null) cv.style.zIndex = o.z;
    const g = cv.getContext("2d"), n = o.n ?? 70, R = (i, s) => ((Math.sin(i * 127.1 + s * 311.7) * 43758.5453) % 1 + 1) % 1;
    const N = Array.from({ length: n }, (_, i) => ({ x: R(i, 1) * b[2], y: R(i, 2) * b[3], p: R(i, 3) * 6.28, r: u * (.25 + R(i, 4) * .45) }));
    const L = []; N.forEach((a, i) => N.forEach((c, j) => { if (j > i && Math.hypot(a.x - c.x, a.y - c.y) < (o.reach ?? Math.max(b[2], b[3]) * .16)) L.push([i, j]); }));
    const storms = o.storm || [], cyc = o.c || K.cy;
    const hex = (h, a) => h + Math.round(a * 255).toString(16).padStart(2, "0");
    const draw = (t) => {
      g.clearRect(0, 0, b[2], b[3]);
      const sv = storms.reduce((m, [s0, s1]) => Math.max(m, t < s0 || t > s1 ? 0 : Math.min(1, (t - s0) / .4, (s1 - t) / .4)), 0);
      const col = sv > .5 ? K.mg : cyc;
      L.forEach(([i, j], k) => {
        const a = N[i], c = N[j], wob = (q) => Math.sin(t * .8 + q.p) * u * .6;
        g.strokeStyle = hex(col, .12 + sv * .2); g.lineWidth = Math.max(1, u * .08);
        g.beginPath(); g.moveTo(a.x + wob(a), a.y + wob(c)); g.lineTo(c.x + wob(c), c.y + wob(a)); g.stroke();
        const sp = .35 + sv * 2.2, ph = (t * sp + R(k, 5)) % 1;
        if (R(k, 6) < .35 + sv * .6) { const x = a.x + (c.x - a.x) * ph, y = a.y + (c.y - a.y) * ph;
          g.fillStyle = hex(col, .9); g.shadowColor = col; g.shadowBlur = u * 1.4; g.beginPath(); g.arc(x, y, u * (.18 + sv * .2), 0, 6.28); g.fill(); g.shadowBlur = 0; }
      });
      N.forEach((a) => { const pul = .5 + .5 * Math.sin(t * 2 + a.p);
        g.fillStyle = hex(col, .35 + pul * .5); g.beginPath(); g.arc(a.x, a.y, a.r * (1 + sv * .8), 0, 6.28); g.fill(); });
      if (sv > .2) for (let q = 0; q < 3; q++) {   /* lightning: jagged path between two nodes, changes every 0.12 s */
        const f = Math.floor(t / .12) + q * 17, a = N[Math.floor(R(f, 7) * n)], c = N[Math.floor(R(f, 8) * n)];
        g.strokeStyle = hex("#ffffff", .5 * sv); g.shadowColor = K.mg; g.shadowBlur = u * 2.5; g.lineWidth = u * .22; g.beginPath(); g.moveTo(a.x, a.y);
        for (let s = 1; s <= 8; s++) { const k2 = s / 8; g.lineTo(a.x + (c.x - a.x) * k2 + (R(f + s, 9) - .5) * u * 6 * (s < 8), a.y + (c.y - a.y) * k2 + (R(f + s, 10) - .5) * u * 6 * (s < 8)); }
        g.stroke(); g.shadowBlur = 0; }
    };
    const v = { t: 0 }; draw(0);
    tl.fromTo(v, { t: 0 }, { t: D, duration: D, ease: "none", immediateRender: true, onUpdate: () => draw(v.t) }, 0);
    gsap.set(cv, { opacity: 0 }); tl.to(cv, { opacity: o.alpha ?? 1, duration: .8, ease: E.soft }, o.t ?? 0);
    if (o.until) out(cv, o.until, .5); return cv;
  }
  /* EEG trace drawing left->right across the box; spikes [[t0,t1],...] in seconds of the trace = jagged seizure burst */
  function eeg(t, o = {}) {
    const b = o.box || [0, H * .42, W, H * .16], d = o.d ?? 2.4, n = 220, c = o.c || K.cy, sp = o.spike || [];
    const pts = []; for (let i = 0; i <= n; i++) { const k = i / n, tt = k * d, hot = sp.some(([a, z]) => tt >= a && tt <= z);
      const y = b[3] / 2 + (Math.sin(i * .9) * .12 + Math.sin(i * 2.3) * .06 + (hot ? (((i * 7919) % 13) / 13 - .5) * 1.7 : 0)) * b[3]; pts.push(`${(k * b[2]).toFixed(1)},${y.toFixed(1)}`); }
    const e = place(mk("div", "sk-fx", o.parent), b[0], b[1], b[2], b[3]); if (o.z) e.style.zIndex = o.z;
    e.innerHTML = `<svg width="${b[2]}" height="${b[3]}" style="overflow:visible;position:absolute;left:0;top:0"><polyline points="${pts.join(" ")}" fill="none" stroke="${c}"
      stroke-width="${u * .32}" stroke-linejoin="round" style="filter:drop-shadow(0 0 ${u * .8}px ${c})"/></svg>`;
    const p = e.querySelector("polyline"), len = p.getTotalLength ? p.getTotalLength() : b[2] * 3; p.style.strokeDasharray = len;
    tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: d, ease: "none", immediateRender: true }, t);
    if (sp.length) sp.forEach(([a]) => tl.to(p, { stroke: K.mg, duration: .1 }, t + a));
    if (o.until) out(e, o.until); return e;
  }
  /* headline, type-on per character (text_in "type"); <b>word</b> takes colour o.c */
  function head(en, t, o = {}) {
    const e = mk("div", "sk-en", o.parent); if (o.c) e.style.setProperty("--c", o.c);
    const tmp = document.createElement("div"); tmp.innerHTML = en;
    const wrap = (node) => Array.from(node.childNodes).map((x) => x.nodeType === 3 ? x.textContent.split("").map((ch) => `<span class="ch">${ch}</span>`).join("")
      : `<b>${wrap(x)}</b>`).join("");
    e.innerHTML = wrap(tmp);
    place(e, o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .14 : .62)); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.align === "center") centre(e);
    const ch = e.querySelectorAll(".ch"), st = Math.min(.045, (o.dur ?? .55) / Math.max(ch.length, 1));
    tl.fromTo(ch, { opacity: 0, y: u * 1.4, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: .3, ease: E.in, stagger: st, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e;
  }
  function te(html, t, o = {}) { const e = place(mk("div", "sk-te", o.parent, html), o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .3 : .7)); if (o.c) e.style.setProperty("--c", o.c);
    if (o.size) e.style.fontSize = u * o.size + "px"; if (o.align === "center") centre(e);
    show(e, t, { opacity: 0, y: u * 2, filter: "blur(8px)" }, .5); if (o.until) out(e, o.until); return e; }
  function hud(text, t, o = {}) { const e = place(mk("div", "sk-hud", o.parent, "<i></i>" + text), o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .09 : .1));
    if (o.c) e.style.setProperty("--c", o.c); if (o.align === "center") { e.style.left = W / 2 + "px"; e.style.transform = "translateX(-50%)"; }
    tl.fromTo(e, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .5, ease: E.io, immediateRender: true }, t);
    tl.fromTo(e.querySelector("i"), { opacity: 1 }, { opacity: .15, duration: .45, repeat: Math.max(1, Math.floor(((o.until ?? D) - t) / .45)), yoyo: true, ease: "none" }, t + .5);
    if (o.until) out(e, o.until); return e; }
  /* counter */
  function num(from, to, t, o = {}) {
    const e = place(mk("div", "sk-num", o.parent), o.x ?? W * .06, o.y ?? H * .3); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.c) e.style.setProperty("--c", o.c);
    if (o.align === "center") centre(e);
    const f = o.fmt || ((v) => Math.round(v)), sm = o.unit ? `<small>${o.unit}</small>` : "", v = { v: from }; e.innerHTML = f(from) + sm;
    show(e, t, { opacity: 0, scale: 1.25, filter: "blur(10px)" }, .45, E.snap);
    tl.fromTo(v, { v: from }, { v: to, duration: o.d ?? 1.3, ease: "power2.out", immediateRender: true, onUpdate: () => { e.innerHTML = f(v.v) + sm; } }, t);
    if (o.until) out(e, o.until); return e;
  }
  /* scan brackets lock onto box [x,y,w,h] with a label */
  function lock(x, y, w, h, t, o = {}) {
    const e = place(mk("div", "sk-lock", o.parent), x, y, w, h); if (o.c) e.style.setProperty("--c", o.c); e.style.zIndex = o.z ?? 15;
    const bw = Math.max(2, u * .3) + "px";
    [["0", "0", "Top", "Left"], ["0", "auto", "Top", "Right"], ["auto", "0", "Bottom", "Left"], ["auto", "auto", "Bottom", "Right"]].forEach(([tp, lf, a, b2]) => {
      const k = mk("div", "k", e); k.style.top = tp === "auto" ? "auto" : "0"; k.style.bottom = tp === "auto" ? "0" : "auto"; k.style.left = lf === "auto" ? "auto" : "0"; k.style.right = lf === "auto" ? "0" : "auto";
      k.style["border" + a + "Width"] = bw; k.style["border" + b2 + "Width"] = bw; });
    if (o.label) mk("div", "lab", e, o.label);
    tl.fromTo(e, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: .5, ease: E.snap, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e;
  }
  /* myth: claim card, strike line, MYTH stamp at ts */
  function myth(html, t, ts, o = {}) {
    const e = place(mk("div", "sk-myth", o.parent, html), o.x ?? W * .06, o.y ?? H * .2); e.style.zIndex = 12;
    show(e, t, { opacity: 0, x: -u * 6 }, .55, E.snap);
    const ln = mk("div", "ln", e); tl.fromTo(ln, { scaleX: 0 }, { scaleX: 1, duration: .35, ease: E.io, immediateRender: true }, ts);
    const s = mk("div", "sk-stamp", e, o.stamp || "MYTH"); s.style.right = -u * 3 + "px"; s.style.top = -u * 3.5 + "px";
    tl.fromTo(s, { scale: 2.2, opacity: 0, rotation: -18 }, { scale: 1, opacity: 1, rotation: -9, duration: .4, ease: E.snap, immediateRender: true }, ts + .1);
    if (o.until) out(e, o.until); return e;
  }
  /* growing list: items [[html, t, ok]] (ok true = cyan tick, false = magenta cross) */
  function list(items, x, y, o = {}) {
    const e = place(mk("div", "sk-list", o.parent), x, y); e.style.zIndex = 12;
    items.forEach(([h, t, ok]) => { const li = mk("div", "sk-li", e, `<em>${ok === false ? "✕" : ok === null ? "!" : "✓"}</em><span>${h}</span>`);
      li.style.setProperty("--c", ok === false ? K.mg : ok === null ? K.am : K.cy);
      show(li, t, { opacity: 0, x: -u * 5 }, .5, E.snap); });
    if (o.until) out(e, o.until); return e;
  }
  /* phone with screen html (content is real UI built by the scene) */
  function phone(html, x, y, h, t, o = {}) { const w = h * .49, e = place(mk("div", "sk-phone", o.parent), x, y, w, h); e.style.zIndex = o.z ?? 14;
    const s = mk("div", "scr", e, html); show(e, t, { opacity: 0, y: u * 12, rotation: o.rot ?? -6 }, .8, E.snap); e.scr = s; if (o.until) out(e, o.until); return e; }
  /* paper document with real content */
  function doc(html, x, y, w, h, t, o = {}) { const e = place(mk("div", "sk-doc", o.parent, html), x, y, w, h); e.style.zIndex = o.z ?? 13;
    show(e, t, { opacity: 0, y: u * 10, rotation: o.rot ?? 4 }, .8, E.snap); gsap.set(e, { rotation: o.rest ?? -2 }); tl.set(e, { rotation: o.rot ?? 4 }, 0);
    tl.to(e, { rotation: o.rest ?? -2, duration: .8, ease: E.snap }, t); if (o.until) out(e, o.until); return e; }
  /* dot field: n dots in cols, lit (count) light up in colour c from t */
  function dots(n, lit, cols, box, t, o = {}) {
    const e = place(mk("div", "sk-fx", o.parent), ...box), rows = Math.ceil(n / cols), s = Math.min(box[2] / cols, box[3] / rows), r = s * .62;
    const ds = []; for (let i = 0; i < n; i++) { const d = place(mk("div", "sk-dot", e), (i % cols) * s + (s - r) / 2, Math.floor(i / cols) * s + (s - r) / 2, r, r);
      d.style.background = "#24305a"; ds.push(d); }
    tl.fromTo(ds, { scale: 0 }, { scale: 1, duration: .3, ease: E.pop, stagger: { each: Math.min(.02, .8 / n), from: "start" }, immediateRender: true }, t);
    const on = (o.order || ds.map((_, i) => i)).slice(0, lit).map((i) => ds[i]), c = o.c || K.cy;
    tl.to(on, { background: c, boxShadow: `0 0 ${u}px ${c}`, duration: .25, stagger: Math.min(.03, 1 / Math.max(lit, 1)) }, t + (o.lag ?? .9));
    if (o.until) out(e, o.until); return e;
  }
  /* lightning bolt from (x1,y1) to (x2,y2), flickers for d seconds */
  function bolt(x1, y1, x2, y2, t, o = {}) {
    const e = place(mk("div", "sk-fx", o.parent), 0, 0, W, H); e.style.zIndex = o.z ?? 20; let pts = `${x1},${y1}`;
    for (let s = 1; s < 10; s++) pts += ` ${x1 + (x2 - x1) * s / 10 + (((s * 7919) % 11) / 11 - .5) * u * 7},${y1 + (y2 - y1) * s / 10 + (((s * 104729) % 13) / 13 - .5) * u * 7}`;
    e.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0"><polyline points="${pts} ${x2},${y2}" fill="none" stroke="#fff" stroke-width="${u * .3}"
      style="filter:drop-shadow(0 0 ${u}px ${o.c || K.mg}) drop-shadow(0 0 ${u * 3}px ${o.c || K.mg})"/></svg>`;
    gsap.set(e, { opacity: 0 }); const d = o.d ?? .5;
    for (let i = 0; i < 4; i++) tl.to(e, { opacity: i % 2 ? .3 : 1, duration: d / 8, ease: "none" }, t + i * d / 4);
    tl.to(e, { opacity: 0, duration: .15 }, t + d); return e;
  }
  function ring(x, y, t, o = {}) { const r = o.r || u * 8, n = o.n || 3;
    for (let i = 0; i < n; i++) { const e = place(mk("div", "sk-ring", o.parent), x - r, y - r, r * 2, r * 2); e.style.setProperty("--c", o.c || K.cy); e.style.zIndex = o.z ?? 16;
      gsap.set(e, { opacity: 0 }); tl.fromTo(e, { scale: .1, opacity: .95 }, { scale: 1, opacity: 0, duration: o.d || 1.3, ease: "power1.out", immediateRender: false }, t + i * .3); } }
  const flash = (t, d = .3, c) => { const f = mk("div", "sk-flash", $("root")); if (c) f.style.background = c;
    tl.fromTo(f, { opacity: .8 }, { opacity: 0, duration: d, ease: "power2.out", immediateRender: false }, t); tl.set(f, { opacity: 0 }, 0); };
  /* whole-stage camera move */
  const cam = (t, d, to) => tl.to($("stage"), { duration: d, ease: E.io, ...to }, t);
  window.SK = { S, P, W, H, D, V, u, K, tl, E, at, $, mk, place, ix, out, show, shot, enter, morph, net, eeg, head, te, hud, num, lock, myth, list, phone, doc, dots, bolt,
                ring, flash, cam, done: () => finish(tl) };
})();
