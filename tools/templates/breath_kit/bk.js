/* breath_kit (15_Asthma): "breath lab" cinematic documentary look, written fresh for this video (user brief 2026-11-17:
   big AI images, constant camera motion, frequent compositions, meaningful screens / documents, 2D motion graphics).
   Deep slate-teal frame; mint = open airway / right action, coral = inflammation / danger / myth, honey = care / caution.
   Parts: shot (full-bleed or frosted glass panel image, camera move + entrance), flow (canvas airflow particles that choke
   and turn coral), airway (cross-section: lining swells, muscle squeezes, mucus fills, opens again), tree (bronchial tree
   grows branch by branch), meter (breath gauge), puff (inhaler mist burst), head (Syne words rise through a mask), te
   (Telugu line), tag (pill label), num (counter), focus (circle on an image detail), myth (claim + strike + stamp), list,
   phone / doc (screens with real content), dots, ring, mist (soft white flash), cam, out, morph.
   Scene code: const { ... } = BK; build; BK.done(). */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, V = H > W, u = Math.min(W, H) / 100;
  const C = S.colors || {};
  const K = { bg: C.background || "#071216", mt: C.primary || "#6CF5C2", co: C.secondary || "#FF6A4D", hn: C.accent || "#FFC163",
              ink: C.text || "#F1F7F4", mute: C.text2 || "#8FA9A6", panel: C.panel || "rgba(10,26,30,0.78)" };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "expo.out", snap: "power4.out", io: "power3.inOut", soft: "sine.inOut", out: "power2.in", pop: "back.out(1.6)" };
  const IMG = S.images || [], B = P.beats || {};
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; background: radial-gradient(ellipse at 40% 35%, #12302F, ${K.bg} 72%); }
  #stage { position: absolute; inset: 0; overflow: hidden; transform-origin: 50% 50%; }
  .bk-shot { position: absolute; overflow: hidden; background: #03090b; }
  .bk-shot .bk-im { position: absolute; inset: -8%; background: #0b1c1f no-repeat center / cover; filter: contrast(1.05) saturate(1.04); will-change: transform; }
  .bk-shot .bk-miss { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: ${K.mute}; font: 600 ${u * 2.2}px var(--font-script);
    letter-spacing: .3em; background: radial-gradient(circle at 50% 45%, #183a3a, #040b0d 70%); }
  .bk-shot .bk-sh { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 50%, transparent 55%, #03090bb0 100%),
    linear-gradient(0deg, #03090ba0, transparent 34%, transparent 80%, #03090b60); }
  .bk-shot.glass { border-radius: ${u * 2.2}px; box-shadow: 0 ${u * 1.8}px ${u * 6}px #000000b0, 0 0 0 ${Math.max(1, u * .12)}px #ffffff30, 0 0 ${u * 3}px var(--c, ${K.mt})33; }
  .bk-shot.glass .bk-sh { background: linear-gradient(0deg, #03090b90, transparent 42%); }
  .bk-cap { position: absolute; left: ${u * 1.6}px; bottom: ${u * 1.3}px; font: 700 ${u * (V ? 2.6 : 1.7)}px var(--font-script); letter-spacing: .18em; color: ${K.bg};
    text-transform: uppercase; background: var(--c, ${K.mt}); padding: ${u * .25}px ${u * 1.1}px; border-radius: ${u * 3}px; }
  .bk-fx { position: absolute; inset: 0; pointer-events: none; }
  .bk-en { position: absolute; font: 800 ${u * (V ? 8 : 6.8)}px var(--font-head); line-height: 1.04; letter-spacing: -.01em; text-transform: uppercase; color: ${K.ink};
    white-space: nowrap; text-shadow: 0 ${u * .4}px ${u * 3}px #000000b0; }
  .bk-en b { font-weight: inherit; color: var(--c, ${K.mt}); }
  .bk-en .w { display: inline-block; overflow: hidden; vertical-align: top; padding-bottom: .06em; }
  .bk-en .w > span { display: inline-block; }
  .bk-te { position: absolute; font: 400 ${u * (V ? 5.2 : 4.1)}px var(--font); color: ${K.ink}; line-height: 1.32; text-shadow: 0 ${u * .3}px ${u * 2}px #000; white-space: nowrap; }
  .bk-te b { color: var(--c, ${K.mt}); font-weight: 400; }
  .bk-tag { position: absolute; font: 700 ${u * (V ? 2.8 : 1.9)}px var(--font-script); letter-spacing: .22em; text-transform: uppercase; color: ${K.ink}; white-space: nowrap;
    padding: ${u * .45}px ${u * 1.4}px ${u * .45}px ${u * 1.1}px; border-radius: ${u * 4}px; background: #0a1a1ecc; border: ${Math.max(1, u * .1)}px solid var(--c, ${K.mt}); }
  .bk-tag i { display: inline-block; width: ${u * .8}px; height: ${u * .8}px; border-radius: 50%; background: var(--c, ${K.mt}); margin-right: ${u * .9}px; vertical-align: middle;
    box-shadow: 0 0 ${u}px var(--c, ${K.mt}); }
  .bk-num { position: absolute; font: 800 ${u * (V ? 20 : 17)}px var(--font-head); line-height: .92; color: ${K.ink}; letter-spacing: -.03em; white-space: nowrap; }
  .bk-num small { font-size: .3em; letter-spacing: .02em; color: var(--c, ${K.mt}); margin-left: .18em; }
  .bk-focus { position: absolute; }
  .bk-focus .lab { position: absolute; white-space: nowrap; font: 700 ${u * (V ? 2.7 : 1.8)}px var(--font-script); letter-spacing: .16em; color: ${K.bg}; background: var(--c, ${K.mt});
    padding: ${u * .3}px ${u * 1}px; border-radius: ${u * 3}px; text-transform: uppercase; }
  .bk-myth { position: absolute; padding: ${u * 1.6}px ${u * 2.4}px; background: ${K.panel}; border-radius: ${u * 1.4}px; border: ${Math.max(1, u * .1)}px solid #ffffff22;
    font: 400 ${u * (V ? 4.4 : 3.3)}px var(--font); color: ${K.ink}; white-space: nowrap; box-shadow: 0 ${u}px ${u * 4}px #00000090; }
  .bk-myth .ln { position: absolute; left: ${u * 1.8}px; right: ${u * 1.8}px; top: 52%; height: ${u * .45}px; background: ${K.co}; transform-origin: 0 50%; border-radius: ${u}px; }
  .bk-stamp { position: absolute; font: 800 ${u * (V ? 5.4 : 4.2)}px var(--font-head); color: var(--c, ${K.co}); border: ${u * .45}px solid var(--c, ${K.co}); padding: ${u * .15}px ${u * 1.4}px;
    letter-spacing: .06em; border-radius: ${u * 5}px; white-space: nowrap; background: #071216cc; }
  .bk-list { position: absolute; display: flex; flex-direction: column; gap: ${u * 1}px; }
  .bk-li { display: flex; align-items: center; gap: ${u * 1.2}px; font: 400 ${u * (V ? 4.2 : 3.3)}px var(--font); color: ${K.ink}; white-space: nowrap;
    padding: ${u * .55}px ${u * 1.8}px ${u * .55}px ${u * .7}px; background: ${K.panel}; border-radius: ${u * 4}px; border: ${Math.max(1, u * .08)}px solid #ffffff1c; }
  .bk-li em { font: 800 ${u * (V ? 3 : 2.2)}px var(--font-head); font-style: normal; width: ${u * (V ? 4.8 : 3.6)}px; height: ${u * (V ? 4.8 : 3.6)}px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; color: ${K.bg}; background: var(--c, ${K.mt}); flex: none; }
  .bk-phone { position: absolute; border-radius: ${u * 4}px; background: #0c1416; padding: ${u * 1.1}px; box-shadow: 0 ${u * 2}px ${u * 7}px #000000d0, inset 0 0 0 ${u * .25}px #2b4144; }
  .bk-phone .scr { position: relative; width: 100%; height: 100%; border-radius: ${u * 3}px; overflow: hidden; background: linear-gradient(165deg, #12292b, #070f11);
    font-family: var(--font-script); color: ${K.ink}; }
  .bk-doc { position: absolute; background: #F5F3EC; color: #15201f; border-radius: ${u * .5}px; padding: ${u * 2.2}px ${u * 2.6}px; box-shadow: 0 ${u * 2}px ${u * 6}px #000000c0;
    font: 500 ${u * (V ? 2.3 : 1.6)}px var(--font-script); line-height: 1.45; overflow: hidden; }
  .bk-doc h3 { margin: 0 0 ${u * .5}px; font: 800 ${u * (V ? 3.2 : 2.4)}px var(--font-head); letter-spacing: -.01em; }
  .bk-doc .rule { height: ${u * .3}px; background: #15201f; margin: ${u * .6}px 0 ${u * 1}px; }
  .bk-dot { position: absolute; border-radius: 50%; }
  .bk-ring { position: absolute; border-radius: 50%; border: ${u * .25}px solid var(--c, ${K.mt}); }
  .bk-mist { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, #ffffff, #dff7ef 60%, #b8e8da); opacity: 0; z-index: 40; pointer-events: none; }`;
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
  const svg = (w, h, inner) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;left:0;top:0;overflow:visible">${inner}</svg>`;

  /* shrink a one-line text element until it fits the frame (re-run when the web fonts arrive) */
  const fitw = (e, x) => { const go = () => { const r = document.createRange(); r.selectNodeContents(e); const w = r.getBoundingClientRect().width,
      room = e.style.textAlign === "center" ? W * .92 : W - (x ?? 0) - W * .04; if (w > room) e.style.fontSize = parseFloat(getComputedStyle(e).fontSize) * room / w + "px"; };
    go(); if (document.fonts) document.fonts.ready.then(go); };
  /* camera moves on the inner image (a = amount) */
  const MOVES = {
    push: (a) => [{ scale: 1 }, { scale: 1 + .16 * a }], pull: (a) => [{ scale: 1 + .2 * a }, { scale: 1 }],
    panL: (a) => [{ xPercent: 4 * a, scale: 1.04 }, { xPercent: -4 * a, scale: 1.04 }], panR: (a) => [{ xPercent: -4 * a, scale: 1.04 }, { xPercent: 4 * a, scale: 1.04 }],
    rise: (a) => [{ yPercent: 4 * a, scale: 1.06 }, { yPercent: -4 * a, scale: 1.06 }], sink: (a) => [{ yPercent: -4 * a, scale: 1.06 }, { yPercent: 4 * a, scale: 1.06 }],
    orbit: (a) => [{ rotation: -2 * a, scale: 1.13, xPercent: -3 * a }, { rotation: 2 * a, scale: 1.07, xPercent: 3 * a }],
    dive: (a) => [{ scale: 1.02 }, { scale: 1 + .42 * a }], drift: (a) => [{ scale: 1.05, xPercent: -1.5 * a, yPercent: 1 * a }, { scale: 1.1, xPercent: 1.5 * a, yPercent: -1 * a }],
    breathe: (a) => [{ scale: 1.04 }, { scale: 1.04 + .08 * a }],
  };
  /* image shot. o: t, d (move length), mv, a, in, box [x,y,w,h], glass, cap, c, fx/fy focus, z, until */
  function shot(k, o = {}) {
    const t = o.t ?? 0, d = o.d ?? 3.2, b = o.box || [0, 0, W, H];
    const e = place(mk("div", "bk-shot" + (o.glass ? " glass" : ""), o.parent), ...b), im = mk("div", "bk-im", e); mk("div", "bk-sh", e);
    const i = ix(k); if (i >= 0 && IMG[i]) im.style.backgroundImage = `url("${IMG[i]}")`; else mk("div", "bk-miss", e, "IMAGE " + k);
    im.style.transformOrigin = `${(o.fx ?? .5) * 100}% ${(o.fy ?? .5) * 100}%`;
    if (o.c) e.style.setProperty("--c", o.c);
    if (o.cap) mk("div", "bk-cap", e, o.cap);
    if (o.z) e.style.zIndex = o.z;
    tl.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    const [fr, to] = MOVES[o.mv || "push"](o.a ?? 1);
    if (o.mv === "breathe") { gsap.set(im, fr); tl.to(im, { ...to, duration: 2, ease: E.soft, repeat: Math.max(1, Math.ceil(d / 2)), yoyo: true }, t); }
    else tl.fromTo(im, fr, { ...to, duration: d + .6, ease: o.mv === "dive" ? "power2.in" : "none", immediateRender: true }, t);
    enter(e, t, o.in || "cut", o);
    if (o.until) out(e, o.until, .3);
    e.im = im; return e;
  }
  function enter(e, t, how, o = {}) {
    const fx = (o.fx ?? .5) * 100, fy = (o.fy ?? .5) * 100, r = o.glass ? ` round ${u * 2.2}px` : "";
    if (how === "mist") { mist(t - .05, .5); tl.fromTo(e, { opacity: 0, scale: 1.08, filter: "blur(18px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: .8, ease: E.in, immediateRender: true }, t); }
    else if (how === "through") tl.fromTo(e, { scale: .6, opacity: 0, filter: "blur(14px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: .75, ease: E.in, immediateRender: true }, t);
    else if (how === "iris") tl.fromTo(e, { clipPath: `circle(0% at ${fx}% ${fy}%)` }, { clipPath: `circle(150% at ${fx}% ${fy}%)`, duration: .9, ease: E.io, immediateRender: true }, t);
    else if (how === "wipe") tl.fromTo(e, { clipPath: `inset(0% 100% 0% 0%${r})`, filter: "blur(6px)" }, { clipPath: `inset(0% 0% 0% 0%${r})`, filter: "blur(0px)", duration: .8, ease: E.io, immediateRender: true }, t);
    else if (how === "wipeL") tl.fromTo(e, { clipPath: `inset(0% 0% 0% 100%${r})` }, { clipPath: `inset(0% 0% 0% 0%${r})`, duration: .8, ease: E.io, immediateRender: true }, t);
    else if (how === "slide") tl.fromTo(e, { xPercent: o.dir === -1 ? -110 : 110 }, { xPercent: 0, duration: .75, ease: E.snap, immediateRender: true }, t);
    else if (how === "rise") tl.fromTo(e, { yPercent: 30, opacity: 0, rotation: o.rot ?? 0 }, { yPercent: 0, opacity: 1, rotation: 0, duration: .75, ease: E.snap, immediateRender: true }, t);
    else if (how === "split") tl.fromTo(e, { clipPath: `inset(50% 0% 50% 0%${r})` }, { clipPath: `inset(0% 0% 0% 0%${r})`, duration: .7, ease: E.io, immediateRender: true }, t);
    else if (how === "fade") tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: .6, ease: E.soft, immediateRender: true }, t);
  }
  /* move / resize a shot or panel to a new box (layout morph) */
  const morph = (e, t, box, d = .9) => tl.to(e, { left: box[0], top: box[1], width: box[2], height: box[3], duration: d, ease: E.io }, t);

  /* canvas airflow: n particles streaming along x (dir 1 / -1). choke [[t0,t1,amount]] squeezes the stream at cx and turns it coral;
     breathe: period (s) -> flow reverses in and out. box, c, alpha, t, until. Deterministic by time. */
  function flow(o = {}) {
    const b = o.box || [0, 0, W, H], cv = place(mk("canvas", "bk-fx", o.parent), b[0], b[1], b[2], b[3]); cv.width = b[2]; cv.height = b[3];
    if (o.z != null) cv.style.zIndex = o.z;
    const g = cv.getContext("2d"), n = o.n ?? 160, R = (i, s) => ((Math.sin(i * 127.1 + s * 311.7) * 43758.5453) % 1 + 1) % 1;
    const band = o.band ?? .5, cy = b[3] * (o.cy ?? .5), cx = b[2] * (o.cx ?? .5), sp = (o.speed ?? 1) * b[2] / 3.2;
    const N = Array.from({ length: n }, (_, i) => ({ x: R(i, 1), y: (R(i, 2) - .5) * band * b[3], v: .6 + R(i, 3) * .8, r: u * (.12 + R(i, 4) * .32), a: .3 + R(i, 5) * .6 }));
    const chokes = o.choke || [];
    const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
    const c1 = rgb(o.c || K.mt), c2 = rgb(K.co);
    const cv_ = (t) => chokes.reduce((m, [s0, s1, a = .8]) => Math.max(m, t < s0 || t > s1 ? 0 : a * Math.min(1, (t - s0) / .6, (s1 - t) / .6)), 0);
    const draw = (t) => {
      g.clearRect(0, 0, b[2], b[3]);
      const ch = cv_(t), col = c1.map((v, k) => Math.round(v + (c2[k] - v) * Math.min(1, ch * 1.2)));
      const pos = o.breathe ? Math.sin(t * 6.283 / o.breathe) * o.breathe / 6.283 * 2.2 : t * (o.dir ?? 1);
      N.forEach((p) => {
        const slow = 1 - ch * .55, x = ((((p.x + pos * p.v * slow * sp / b[2]) % 1) + 1) % 1) * b[2];
        const bump = Math.exp(-(((x - cx) / (b[2] * .16)) ** 2)), y = cy + p.y * (1 - ch * bump * .85);
        const tail = u * (1.2 + p.v * 1.6) * (o.breathe ? Math.cos(t * 6.283 / o.breathe) : (o.dir ?? 1)) * slow;
        g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${p.a * (o.alpha ?? .8)})`; g.lineWidth = p.r; g.lineCap = "round";
        g.beginPath(); g.moveTo(x - tail, y); g.lineTo(x, y); g.stroke();
      });
    };
    const v = { t: 0 }; draw(0);
    tl.fromTo(v, { t: 0 }, { t: D, duration: D, ease: "none", immediateRender: true, onUpdate: () => draw(v.t) }, 0);
    gsap.set(cv, { opacity: 0 }); tl.to(cv, { opacity: 1, duration: .8, ease: E.soft }, o.t ?? 0);
    if (o.until) out(cv, o.until, .5); return cv;
  }
  /* airway cross-section at centre (x,y), outer radius r. Times: swell, squeeze, mucus, open; labels true -> callouts. Returns element. */
  function airway(x, y, r, t, o = {}) {
    const s = r * 2.6, e = place(mk("div", "bk-fx", o.parent), x - s / 2, y - s / 2, s, s), c = s / 2; e.style.zIndex = o.z ?? 8;
    const seg = Array.from({ length: 14 }, (_, i) => { const a = i / 14 * 6.283; return `<rect class="mu" x="${-r * .09}" y="${-r * 1.02}" width="${r * .18}" height="${r * .14}" rx="${r * .05}"
      fill="${K.co}" transform="translate(${c},${c}) rotate(${a * 57.3})" opacity=".85"/>`; }).join("");
    const blobs = Array.from({ length: 7 }, (_, i) => { const a = i / 7 * 6.283 + .4; return `<circle class="mc" cx="${c + Math.cos(a) * r * .3}" cy="${c + Math.sin(a) * r * .3}" r="${r * .16}" fill="${K.hn}" opacity="0"/>`; }).join("");
    e.innerHTML = svg(s, s, `<defs><radialGradient id="aw${o.id || ""}" cx="50%" cy="50%" r="50%"><stop offset="55%" stop-color="#e9a39a"/><stop offset="100%" stop-color="#9c4f4a"/></radialGradient></defs>
      <circle class="wall" cx="${c}" cy="${c}" r="${r}" fill="url(#aw${o.id || ""})" stroke="#ffffff40" stroke-width="${u * .15}"/>
      <g class="mus">${seg}</g>
      <circle class="lin" cx="${c}" cy="${c}" r="${r * .72}" fill="#f4c6bc"/>
      <circle class="lum" cx="${c}" cy="${c}" r="${r * .6}" fill="#06100f"/>
      <circle class="air" cx="${c}" cy="${c}" r="${r * .6}" fill="none" stroke="${K.mt}" stroke-width="${u * .25}" stroke-dasharray="${u * .6} ${u * 1.2}" opacity=".9"/>
      ${blobs}`);
    const q = (k) => e.querySelector(k), lin = q(".lin"), lum = q(".lum"), air = q(".air"), mus = q(".mus"), mc = e.querySelectorAll(".mc");
    tl.fromTo(e, { scale: .3, opacity: 0, rotation: -40 }, { scale: 1, opacity: 1, rotation: 0, duration: .9, ease: E.in, immediateRender: true }, t);
    tl.to(air, { rotation: 360, svgOrigin: `${c} ${c}`, duration: D, ease: "none" }, 0);
    const st = (tt, lr, ur, col) => { tl.to(lin, { attr: { r: r * lr }, fill: col || "#f4c6bc", duration: .9, ease: E.io }, tt);
      tl.to([lum, air], { attr: { r: r * ur }, duration: .9, ease: E.io }, tt); };
    if (o.swell != null) st(o.swell, .8, .38, "#ef7f6c");
    if (o.squeeze != null) { tl.to(mus, { scale: .78, svgOrigin: `${c} ${c}`, duration: .9, ease: E.io }, o.squeeze); tl.to(q(".wall"), { attr: { r: r * .9 }, duration: .9, ease: E.io }, o.squeeze);
      st(o.squeeze, .66, .24, "#e8604d"); tl.to(mus.querySelectorAll(".mu"), { opacity: 1, attr: { height: r * .24 }, duration: .5 }, o.squeeze); }
    if (o.mucus != null) { tl.to(mc, { opacity: .95, attr: { r: r * .11 }, duration: .7, stagger: .08, ease: E.pop }, o.mucus); tl.to([lum, air], { attr: { r: r * .14 }, duration: .9, ease: E.io }, o.mucus); }
    if (o.open != null) { tl.to(mus, { scale: 1, duration: 1, ease: E.io }, o.open); tl.to(q(".wall"), { attr: { r }, duration: 1, ease: E.io }, o.open); tl.to(mc, { opacity: 0, duration: .5 }, o.open);
      st(o.open, o.keepSwell ? .8 : .72, o.keepSwell ? .42 : .6, o.keepSwell ? "#ef7f6c" : "#f4c6bc"); }
    if (o.labels) { const L = (txt, ang, rr, tt, col) => { const ax = c + Math.cos(ang) * rr, ay = c + Math.sin(ang) * rr, lx = c + Math.cos(ang) * r * 1.45, ly = c + Math.sin(ang) * r * 1.45;
        const g = mk("div", "bk-fx", e); g.innerHTML = svg(s, s, `<line x1="${ax}" y1="${ay}" x2="${lx}" y2="${ly}" stroke="${col}" stroke-width="${u * .18}"/><circle cx="${ax}" cy="${ay}" r="${u * .45}" fill="${col}"/>`);
        const lb = place(mk("div", "bk-tag", e, "<i></i>" + txt), lx + (Math.cos(ang) < 0 ? -u * 14 : u), ly - u * 1.6); lb.style.setProperty("--c", col);
        show(g, tt, { opacity: 0 }, .4); show(lb, tt, { opacity: 0, x: Math.cos(ang) < 0 ? u * 3 : -u * 3 }, .5, E.snap); if (o.labelsUntil) { out(g, o.labelsUntil); out(lb, o.labelsUntil); } };
      o.labels.forEach(([txt, ang, rr, tt, col]) => L(txt, ang, r * rr, tt, col || K.ink)); }
    if (o.until) out(e, o.until, .4); return e;
  }
  /* bronchial tree: trachea from (x,y) down h, branching depth levels; grows over d seconds from t */
  function tree(x, y, h, t, o = {}) {
    const w = h * 1.3, e = place(mk("div", "bk-fx", o.parent), x - w / 2, y, w, h * 1.05), c = o.c || K.mt; e.style.zIndex = o.z ?? 6;
    const paths = [], dep = o.depth ?? 6, R = (i) => ((Math.sin(i * 91.7) * 43758.5) % 1 + 1) % 1; let id = 0;
    const br = (x0, y0, ang, len, lv) => { if (lv > dep) return; const x1 = x0 + Math.sin(ang) * len, y1 = y0 + Math.cos(ang) * len;
      paths.push([`M${x0.toFixed(1)},${y0.toFixed(1)} Q${(x0 + Math.sin(ang) * len * .5 + (R(id) - .5) * len * .2).toFixed(1)},${(y0 + Math.cos(ang) * len * .5).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`, lv, Math.max(.6, (dep - lv + 1) * .55)]); id++;
      const sp = .42 + R(id) * .25; br(x1, y1, ang - sp, len * .74, lv + 1); br(x1, y1, ang + sp * .9, len * .72, lv + 1); };
    const top = h * .02, split = h * .3; paths.push([`M${w / 2},${top} L${w / 2},${split}`, 0, dep * .7]);
    br(w / 2, split, -.85, h * .2, 1); br(w / 2, split, .85, h * .2, 1);
    e.innerHTML = svg(w, h * 1.05, paths.map(([d, lv, sw]) => `<path d="${d}" data-l="${lv}" fill="none" stroke="${c}" stroke-width="${sw * u * .22}" stroke-linecap="round"
      style="filter:drop-shadow(0 0 ${u * .5}px ${c}88)"/>`).join(""));
    const d = o.d ?? 2.4;
    e.querySelectorAll("path").forEach((p) => { const L = p.getTotalLength ? p.getTotalLength() : 200, lv = +p.dataset.l; p.style.strokeDasharray = L;
      tl.fromTo(p, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: d / (dep + 1) * 1.6, ease: "power1.out", immediateRender: true }, t + lv * d / (dep + 1)); });
    if (o.until) out(e, o.until); return e;
  }
  /* breath meter: rounded capsule, fills to o.to (0-1) at t over d, label */
  function meter(x, y, w, h, t, o = {}) {
    const e = place(mk("div", "bk-fx", o.parent), x, y, w, h), c = o.c || K.mt; e.style.zIndex = o.z ?? 12;
    e.innerHTML = `<div style="position:absolute;inset:0;border-radius:${Math.min(w, h) / 2}px;border:${u * .25}px solid ${c}88;background:#0a1a1ecc;overflow:hidden">
      <div class="f" style="position:absolute;left:0;bottom:0;width:100%;height:100%;background:linear-gradient(0deg,${c},${c}66);transform-origin:50% 100%"></div></div>`;
    if (o.label) { const lb = mk("div", "bk-tag", e, "<i></i>" + o.label); lb.style.setProperty("--c", c); place(lb, 0, h + u * 1.2); }
    const f = e.querySelector(".f"); show(e, t, { opacity: 0, y: u * 4 }, .5, E.snap);
    tl.fromTo(f, { scaleY: o.from ?? 0 }, { scaleY: o.to ?? 1, duration: o.d ?? 1.4, ease: E.io, immediateRender: true }, t + .2);
    (o.steps || []).forEach(([tt, v, col]) => tl.to(f, { scaleY: v, background: col ? `linear-gradient(0deg,${col},${col}66)` : undefined, duration: .8, ease: E.io }, tt));
    if (o.until) out(e, o.until); return e;
  }
  /* inhaler puff: mist particles burst from (x,y) towards angle (deg), spread */
  function puff(x, y, t, o = {}) {
    const n = o.n ?? 42, ang = (o.ang ?? 0) / 57.3, len = o.len ?? u * 26, e = place(mk("div", "bk-fx", o.parent), 0, 0, W, H); e.style.zIndex = o.z ?? 18;
    const R = (i, s) => ((Math.sin(i * 12.9898 + s * 78.233) * 43758.5453) % 1 + 1) % 1;
    for (let i = 0; i < n; i++) { const a = ang + (R(i, 1) - .5) * (o.spread ?? .7), L = len * (.4 + R(i, 2) * .8), sz = u * (.6 + R(i, 3) * 2.2);
      const p = place(mk("div", "bk-dot", e), x - sz / 2, y - sz / 2, sz, sz); p.style.background = `radial-gradient(circle, #ffffffdd, ${o.c || "#d8fff2"}00 70%)`;
      tl.fromTo(p, { x: 0, y: 0, opacity: 0, scale: .3 }, { x: Math.cos(a) * L, y: Math.sin(a) * L, opacity: 0, scale: 2.4, duration: 1.4 + R(i, 4) * .6, ease: "power2.out",
        keyframes: undefined, immediateRender: true }, t + R(i, 5) * .25);
      tl.to(p, { opacity: .9, duration: .12 }, t + R(i, 5) * .25); tl.to(p, { opacity: 0, duration: .9, ease: E.soft }, t + R(i, 5) * .25 + .35); }
    return e;
  }
  /* headline: words rise through a mask; <b>word</b> takes colour o.c */
  function head(en, t, o = {}) {
    const e = mk("div", "bk-en", o.parent); if (o.c) e.style.setProperty("--c", o.c);
    const tmp = document.createElement("div"); tmp.innerHTML = en;
    const words = []; Array.from(tmp.childNodes).forEach((x) => { const bold = x.nodeType !== 3; (x.textContent).split(/(\s+)/).forEach((w) => {
      if (!w) return; if (/^\s+$/.test(w)) { words.push(" "); return; } words.push(`<span class="w"><span>${bold ? `<b>${w}</b>` : w}</span></span>`); }); });
    e.innerHTML = words.join("");
    place(e, o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .14 : .62)); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.align === "center") centre(e);
    if (o.align === "right") { e.style.left = "auto"; e.style.right = (o.x ?? W * .06) + "px"; e.style.textAlign = "right"; }
    fitw(e, o.align === "right" ? 0 : (o.x ?? W * (V ? .07 : .06)));
    const ws = e.querySelectorAll(".w > span");
    tl.fromTo(ws, { yPercent: 115 }, { yPercent: 0, duration: .6, ease: E.in, stagger: o.st ?? .09, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e;
  }
  function te(html, t, o = {}) { const e = place(mk("div", "bk-te", o.parent, html), o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .3 : .72)); if (o.c) e.style.setProperty("--c", o.c);
    if (o.size) e.style.fontSize = u * o.size + "px"; if (o.align === "center") centre(e); if (o.z) e.style.zIndex = o.z;
    fitw(e, o.x ?? W * (V ? .07 : .06));
    show(e, t, { opacity: 0, y: u * 2, filter: "blur(8px)" }, .5); if (o.until) out(e, o.until); return e; }
  function tag(text, t, o = {}) { const e = place(mk("div", "bk-tag", o.parent, "<i></i>" + text), o.x ?? W * (V ? .07 : .06), o.y ?? H * (V ? .09 : .1));
    if (o.c) e.style.setProperty("--c", o.c); if (o.z) e.style.zIndex = o.z; if (o.align === "center") { e.style.left = W / 2 + "px"; e.style.transform = "translateX(-50%)"; }
    tl.fromTo(e, { clipPath: `inset(0% 100% 0% 0% round ${u * 4}px)` }, { clipPath: `inset(0% 0% 0% 0% round ${u * 4}px)`, duration: .55, ease: E.io, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  /* counter */
  function num(from, to, t, o = {}) {
    const e = place(mk("div", "bk-num", o.parent), o.x ?? W * .06, o.y ?? H * .3); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.c) e.style.setProperty("--c", o.c);
    if (o.align === "center") centre(e); if (o.z) e.style.zIndex = o.z;
    const f = o.fmt || ((v) => Math.round(v)), sm = o.unit ? `<small>${o.unit}</small>` : "", v = { v: from }; e.innerHTML = f(from) + sm;
    show(e, t, { opacity: 0, y: u * 4, filter: "blur(10px)" }, .5, E.snap);
    tl.fromTo(v, { v: from }, { v: to, duration: o.d ?? 1.4, ease: "power2.out", immediateRender: true, onUpdate: () => { e.innerHTML = f(v.v) + sm; } }, t);
    if (o.until) out(e, o.until); return e;
  }
  /* focus circle on (x,y) radius r, draws on, label beside */
  function focus(x, y, r, t, o = {}) {
    const c = o.c || K.mt, e = place(mk("div", "bk-focus", o.parent), x - r, y - r, r * 2, r * 2); e.style.zIndex = o.z ?? 15; e.style.setProperty("--c", c);
    e.innerHTML = svg(r * 2, r * 2, `<circle cx="${r}" cy="${r}" r="${r - u * .3}" fill="none" stroke="${c}" stroke-width="${u * .32}" style="filter:drop-shadow(0 0 ${u * .6}px ${c})"/>`);
    const ci = e.querySelector("circle"), L = 6.283 * r; ci.style.strokeDasharray = L;
    tl.fromTo(ci, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: .7, ease: E.io, immediateRender: true }, t);
    tl.fromTo(e, { scale: 1.3, opacity: 0 }, { scale: 1, opacity: 1, duration: .6, ease: E.snap, immediateRender: true }, t);
    if (o.label) { const lb = mk("div", "lab", e, o.label); lb.style.left = (o.side === -1 ? -u * 2 : r * 2 + u) + "px"; lb.style.top = r - u * 1.6 + "px";
      if (o.side === -1) lb.style.transform = "translateX(-100%)"; show(lb, t + .4, { opacity: 0, x: o.side === -1 ? u * 3 : -u * 3 }, .5, E.snap); }
    if (o.until) out(e, o.until); return e;
  }
  /* myth: claim card, strike line, stamp at ts */
  function myth(html, t, ts, o = {}) {
    const e = place(mk("div", "bk-myth", o.parent, html), o.x ?? W * .06, o.y ?? H * .2); e.style.zIndex = 12;
    show(e, t, { opacity: 0, y: u * 4 }, .55, E.snap);
    const ln = mk("div", "ln", e); tl.fromTo(ln, { scaleX: 0 }, { scaleX: 1, duration: .35, ease: E.io, immediateRender: true }, ts);
    const s = mk("div", "bk-stamp", e, o.stamp || "MYTH"); s.style.right = -u * 3 + "px"; s.style.top = -u * 3.6 + "px"; if (o.sc) s.style.setProperty("--c", o.sc);
    tl.fromTo(s, { scale: 1.8, opacity: 0, rotation: -14 }, { scale: 1, opacity: 1, rotation: -7, duration: .45, ease: E.pop, immediateRender: true }, ts + .1);
    if (o.until) out(e, o.until); return e;
  }
  /* growing list: items [[html, t, ok]] (ok true = mint tick, false = coral cross, null = honey !) */
  function list(items, x, y, o = {}) {
    const e = place(mk("div", "bk-list", o.parent), x, y); e.style.zIndex = 12;
    items.forEach(([h, t, ok]) => { const li = mk("div", "bk-li", e, `<em>${ok === false ? "✕" : ok === null ? "!" : "✓"}</em><span>${h}</span>`);
      li.style.setProperty("--c", ok === false ? K.co : ok === null ? K.hn : K.mt);
      show(li, t, { opacity: 0, x: -u * 5 }, .5, E.snap); });
    if (o.until) out(e, o.until); return e;
  }
  /* phone with screen html (content is real UI built by the scene) */
  function phone(html, x, y, h, t, o = {}) { const w = h * .49, e = place(mk("div", "bk-phone", o.parent), x, y, w, h); e.style.zIndex = o.z ?? 14;
    const s = mk("div", "scr", e, html); show(e, t, { opacity: 0, y: u * 12, rotation: o.rot ?? -6 }, .8, E.snap); e.scr = s; if (o.until) out(e, o.until); return e; }
  /* paper document with real content */
  function doc(html, x, y, w, h, t, o = {}) { const e = place(mk("div", "bk-doc", o.parent, html), x, y, w, h); e.style.zIndex = o.z ?? 13;
    tl.fromTo(e, { opacity: 0, y: u * 10, rotation: o.rot ?? 4 }, { opacity: 1, y: 0, rotation: o.rest ?? -2, duration: .8, ease: E.snap, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  /* dot field: n dots in cols, lit (count) light up in colour c from t */
  function dots(n, lit, cols, box, t, o = {}) {
    const e = place(mk("div", "bk-fx", o.parent), ...box), rows = Math.ceil(n / cols), s = Math.min(box[2] / cols, box[3] / rows), r = s * .62;
    const ds = []; for (let i = 0; i < n; i++) { const d = place(mk("div", "bk-dot", e), (i % cols) * s + (s - r) / 2, Math.floor(i / cols) * s + (s - r) / 2, r, r);
      d.style.background = "#1e3a3c"; ds.push(d); }
    tl.fromTo(ds, { scale: 0 }, { scale: 1, duration: .3, ease: E.pop, stagger: { each: Math.min(.02, .8 / n), from: "start" }, immediateRender: true }, t);
    const on = (o.order || ds.map((_, i) => i)).slice(0, lit).map((i) => ds[i]), c = o.c || K.mt;
    tl.to(on, { background: c, duration: .25, stagger: Math.min(.03, 1 / Math.max(lit, 1)) }, t + (o.lag ?? .9));
    if (o.until) out(e, o.until); return e;
  }
  function ring(x, y, t, o = {}) { const r = o.r || u * 8, n = o.n || 3;
    for (let i = 0; i < n; i++) { const e = place(mk("div", "bk-ring", o.parent), x - r, y - r, r * 2, r * 2); e.style.setProperty("--c", o.c || K.mt); e.style.zIndex = o.z ?? 16;
      gsap.set(e, { opacity: 0 }); tl.fromTo(e, { scale: .1, opacity: .9 }, { scale: 1, opacity: 0, duration: o.d || 1.5, ease: "power1.out", immediateRender: false }, t + i * .35); } }
  const mist = (t, d = .45, c) => { const f = mk("div", "bk-mist", $("root")); if (c) f.style.background = c;
    tl.fromTo(f, { opacity: .55 }, { opacity: 0, duration: d, ease: "power2.out", immediateRender: false }, t); tl.set(f, { opacity: 0 }, 0); };
  /* whole-stage camera move */
  const cam = (t, d, to) => tl.to($("stage"), { duration: d, ease: E.io, ...to }, t);
  window.BK = { S, P, W, H, D, V, u, K, tl, E, at, $, mk, place, ix, out, show, svg, shot, enter, morph, flow, airway, tree, meter, puff, head, te, tag, num, focus,
                myth, list, phone, doc, dots, ring, mist, cam, done: () => finish(tl) };
})();
