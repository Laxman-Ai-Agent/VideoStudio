/* 03_Wireless_Power motion kit: this video's motion tokens + small helpers shared by its written sequences.
   Each sequence composes its own layout and choreography; the kit only keeps the design system consistent
   (card look, easing, durations, background FX). Load after studio.js: <script src="kit.js"></script>. */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, u = Math.min(W, H) / 100;
  const C = S.colors || {};
  const PAL = { pri: C.primary || "#38C8FF", acc: C.accent || "#FFB21A", bg: C.background || "#0A0E17",
                sec: C.secondary || "#16223A", text: C.text || "#EAF2FF", text2: C.text2 || "#8FA3BF", warn: C.warning || "#FF5A3C" };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "power3.out", pop: "back.out(1.6)", out: "power2.in", io: "power3.inOut", slam: "power4.in", soft: "sine.inOut", expo: "expo.out" };
  const T = { sm: 0.32, card: 0.62, big: 1.0 };
  const IMG = S.images || [], AR = P.ar || [], B = P.beats || {};
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; }
  .bgfx { position: absolute; inset: 0; }
  #stage { position: absolute; inset: 0; transform-origin: 50% 45%; }
  .kc { position: absolute; overflow: hidden; border-radius: ${u * 1.4}px; background: ${PAL.sec} no-repeat;
        box-shadow: 0 ${u * 2}px ${u * 5.5}px #000b, 0 0 0 1px #ffffff1f; }
  .kc.round { border-radius: 50%; } .kc.pill { border-radius: ${u * 30}px; } .kc.sharp { border-radius: ${u * 0.3}px; }
  .kc video { position: absolute; }
  .kc .sw { position: absolute; inset: -40%; background: linear-gradient(105deg, transparent 42%, #ffffff3a 50%, transparent 58%); transform: translateX(-130%); pointer-events: none; }
  .kc .rg { position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 ${u * 0.4}px ${PAL.acc}, 0 0 ${u * 3}px ${PAL.acc}88; opacity: 0; }
  .kt { position: absolute; color: ${PAL.text}; font: 800 ${u * 3}px var(--font-head); letter-spacing: .1em; text-transform: uppercase; white-space: pre; }
  .kt b, .kt em { color: ${PAL.acc}; font-style: normal; }
  .kh { position: absolute; color: ${PAL.text}; font: 900 ${u * 11}px var(--font-head); line-height: 1.02; white-space: nowrap; }
  .kh em { color: ${PAL.acc}; font-style: normal; } .kh i { font: italic 400 1.08em var(--font-hero); color: ${PAL.pri}; }
  .km { overflow: hidden; display: inline-block; vertical-align: top; padding-bottom: .06em; } .km > span { display: inline-block; }
  .kchip { position: absolute; display: flex; align-items: center; gap: ${u * 1}px; padding: ${u * 0.7}px ${u * 1.6}px; border-radius: ${u * 3}px;
           background: #0A0E17cc; border: 1px solid ${PAL.pri}66; color: ${PAL.text}; font: 700 ${u * 2.2}px var(--font-head); letter-spacing: .14em; text-transform: uppercase; white-space: nowrap; }
  .kchip::before { content: ""; width: ${u * 1}px; height: ${u * 1}px; border-radius: 50%; background: ${PAL.acc}; box-shadow: 0 0 ${u}px ${PAL.acc}; }
  .caret { display: inline-block; width: .08em; height: .9em; margin-left: .06em; background: ${PAL.acc}; vertical-align: -.08em; }
  .kbeam { position: absolute; height: ${u * 0.5}px; transform-origin: 0 50%; border-radius: ${u}px;
           background: linear-gradient(90deg, ${PAL.pri}00, ${PAL.pri} 30%, #fff); box-shadow: 0 0 ${u * 1.5}px ${PAL.pri}, 0 0 ${u * 4}px ${PAL.pri}88; }
  .kdot { position: absolute; width: ${u * 1.6}px; height: ${u * 1.6}px; margin: -${u * 0.8}px 0 0 -${u * 0.8}px; border-radius: 50%; background: #fff; box-shadow: 0 0 ${u * 2}px ${PAL.acc}, 0 0 ${u * 5}px ${PAL.acc}; }
  .kflash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }`;
  document.head.append(css);

  const $ = (id) => document.getElementById(id);
  const at = (k, d = 0) => (B[k] ?? d);
  const mk = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html;
    (parent || $("root")).append(e); return e; };
  const place = (e, x, y, w, h) => { Object.assign(e.style, { left: x + "px", top: y + "px" }); if (w) e.style.width = w + "px"; if (h) e.style.height = h + "px"; return e; };
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;  // seeded: every frame renders the same

  /* card: picture i cropped around its main object. focus [cx, cy, zoom] (0-1 inside the picture, zoom 1 = cover).
     video: optional clip index played on top from vstart for vdur (the card keeps the clip's still behind it). */
  const ix = (k) => (typeof k === "string" ? (P.names || []).indexOf(k) : k);  // pictures by name (params.names)
  const url = (k) => (IMG[ix(k)] ? `url("${IMG[ix(k)]}")` : "none");
  function card(o) {
    o = { ...o, i: ix(o.i), video: o.video === undefined ? undefined : ix(o.video) };
    const c = mk("div", "kc " + (o.shape || ""), o.parent || $("stage") || $("root"));
    place(c, o.x, o.y, o.w, o.h);
    const ar = AR[o.i] || 16 / 9, [cx, cy, z] = o.focus || [0.5, 0.5, 1];
    const dw = Math.max(o.w, o.h * ar) * z, dh = dw / ar;
    const px = Math.min(0, Math.max(o.w - dw, o.w / 2 - cx * dw)), py = Math.min(0, Math.max(o.h - dh, o.h / 2 - cy * dh));
    if (IMG[o.i]) Object.assign(c.style, { backgroundImage: `url("${IMG[o.i]}")`, backgroundSize: `${dw}px ${dh}px`, backgroundPosition: `${px}px ${py}px` });
    if (o.video !== undefined && IMG[o.video]) {
      const v = mk("video", "clip", c); v.src = IMG[o.video]; v.muted = true;
      const vs = o.vstart ?? 0, vd = Math.min(o.vdur ?? 5, D - vs);
      v.setAttribute("data-start", vs.toFixed(3)); v.setAttribute("data-duration", vd.toFixed(3)); v.setAttribute("data-media-start", "0");
      place(v, px, py, dw, dh);
    }
    mk("div", "sw", c); mk("div", "rg", c);
    return c;
  }
  const sweep = (c, t) => tl.fromTo(c.querySelector(".sw"), { xPercent: -130 }, { xPercent: 130, duration: 0.95, ease: "power2.inOut" }, t);
  const ring = (c, t, on = 1) => tl.to(c.querySelector(".rg"), { opacity: on, duration: 0.3, ease: E.in }, t);
  function pop(e, t, from = { scale: 0.6, opacity: 0, y: u * 6 }, d = T.card, ease = E.pop) {
    tl.fromTo(e, from, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: d, ease, immediateRender: true }, t);
    if (e.classList && e.classList.contains("kc")) sweep(e, t + d * 0.6);
  }
  const out = (e, t, to = {}) => tl.to(e, { opacity: 0, y: -u * 4, duration: 0.45, ease: E.out, ...to }, t);
  const dim = (e, t, op = 0.35) => tl.to(e, { opacity: op, filter: "saturate(.4) brightness(.8)", duration: 0.45, ease: E.soft }, t);
  const lit = (e, t) => tl.to(e, { opacity: 1, filter: "saturate(1) brightness(1)", duration: 0.45, ease: E.soft }, t);

  // text typed on the spoken word (*word* = accent), with an amber caret while it types
  function type(e, text, t, cps = 22) {
    const o = { n: 0 }, d = Math.max(0.15, text.replace(/\*/g, "").length / cps);
    tl.set(e, { opacity: 1 }, t);
    tl.to(o, { n: text.length, duration: d, ease: "none", onUpdate: () => {
      const k = Math.round(o.n); e.innerHTML = text.slice(0, k).replace(/\*([^*]*)(\*|$)/g, "<b>$1</b>") + (k < text.length ? '<span class="caret"></span>' : ""); } }, t);
    return t + d;
  }
  // mask rise of a heading: every word (or <tag>word</tag>) rises out of its own mask, in turn
  function rise(e, t, stagger = 0.08, d = 0.6) {
    e.innerHTML = e.innerHTML.split(/(<[^>]+>[^<]*<\/[^>]+>|\s+)/).filter((s) => s && s.trim()).map((w) => `<span class="km"><span>${w}</span></span>`).join(" ");
    tl.set(e, { opacity: 1 }, t);
    tl.fromTo(e.querySelectorAll(".km > span"), { yPercent: 115 }, { yPercent: 0, duration: d, ease: E.expo, stagger, immediateRender: true }, t);
  }
  const chip = (text, x, y, parent) => place(mk("div", "kchip", parent || $("stage"), text), x, y);
  function flash(t, op = 0.5) { const f = mk("div", "kflash"); tl.fromTo(f, { opacity: 0 }, { opacity: op, duration: 0.06, yoyo: true, repeat: 1 }, t); }
  const shake = (e, t, a = u * 0.7) => tl.fromTo(e, { x: -a }, { x: a, duration: 0.05, repeat: 5, yoyo: true, ease: "none", immediateRender: false }, t)
    && tl.set(e, { x: 0 }, t + 0.31);
  function slam(e, t) {
    tl.fromTo(e, { scale: 2.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: E.slam, immediateRender: true }, t);
    flash(t + 0.28, 0.35); shake($("shake") || $("root"), t + 0.3);
  }
  // a beam of light from (x1, y1) to (x2, y2) that draws, with a bright dot riding its tip
  function beam(x1, y1, x2, y2, t, d = 0.8, parent) {
    const len = Math.hypot(x2 - x1, y2 - y1), b = place(mk("div", "kbeam", parent || $("stage")), x1, y1, len);
    b.style.transform = `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`; b.style.marginTop = -u * 0.25 + "px";
    const dot = place(mk("div", "kdot", parent || $("stage")), x1, y1);
    tl.fromTo(b, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: d, ease: E.io, immediateRender: true }, t);
    tl.fromTo(dot, { left: x1, top: y1, opacity: 1, scale: 1 }, { left: x2, top: y2, duration: d, ease: E.io, immediateRender: true }, t);
    tl.to(dot, { scale: 2.2, opacity: 0, duration: 0.35, ease: E.in }, t + d);
    return b;
  }
  function count(e, from, to, t, d = 1, fmt = (v) => Math.round(v)) {
    const o = { v: from }; e.textContent = fmt(from);
    tl.to(o, { v: to, duration: d, ease: "power2.out", onUpdate: () => { e.textContent = fmt(o.v); } }, t);
  }
  // the camera never stops: slow push + drift over the whole sequence (sequences add their own punches)
  const camera = (e, push = 1.05, drift = 0.015) => tl.fromTo(e, { scale: 1, xPercent: 0 }, { scale: push, xPercent: -drift * 100, duration: D, ease: E.soft }, 0);

  // topic background: faint circuit traces with pulses running along them + floating sparks (seeded, frame-exact)
  function circuits(opts = {}) {
    const cv = document.createElement("canvas"); cv.className = "bgfx"; $("root").prepend(cv); cv.width = W; cv.height = H;
    const g = cv.getContext("2d"), r = rnd(opts.seed || 7), paths = [], sparks = [];
    for (let i = 0; i < (opts.lines || 14); i++) { let x = r() * W, y = r() * H; const pts = [[x, y]];
      for (let k = 0; k < 5; k++) { if (k % 2) y += (r() - 0.5) * H * 0.5; else x += (r() - 0.5) * W * 0.6; pts.push([x, y]); } paths.push(pts); }
    for (let i = 0; i < (opts.sparks || 40); i++) sparks.push([r() * W, r() * H, 0.3 + r() * 1.2, r() * 6.28, 0.2 + r() * 0.8]);
    const hex = (c, a) => c + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
    const col = opts.color || PAL.pri, sp = opts.spark || PAL.acc;
    const draw = (t) => {
      g.clearRect(0, 0, W, H); g.lineWidth = Math.max(1, u * 0.12); g.strokeStyle = hex(col, 0.1);
      paths.forEach((pts, i) => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
        const f = ((t * 0.12 + i * 0.37) % 1) * (pts.length - 1), s = Math.floor(f), a = pts[s], b = pts[s + 1], q = f - s;
        g.fillStyle = hex(col, 0.55); g.beginPath(); g.arc(a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, u * 0.35, 0, 6.28); g.fill(); });
      sparks.forEach(([x, y, sz, ph, v]) => { const yy = ((y - t * v * u * 3) % H + H) % H;
        g.fillStyle = hex(sp, 0.25 + 0.25 * Math.sin(t * 2 * v + ph)); g.beginPath(); g.arc(x + Math.sin(t + ph) * u, yy, sz * u * 0.18, 0, 6.28); g.fill(); });
    };
    const o = { t: 0 }; tl.fromTo(o, { t: 0 }, { t: D, duration: D, ease: "none", onUpdate: () => draw(o.t) }, 0); draw(0);
    return cv;
  }
  // chapter / method title (one design for the whole video): amber bars wipe across, a big index, the title rises
  function chapter(num, title, t, parent) {
    const g = mk("div", "", parent || $("stage")); g.style.cssText = `position:absolute;inset:0`;
    [0, 1, 2].forEach((i) => { const b = place(mk("div", "", g), 0, H * (0.3 + i * 0.07), W, H * 0.05);
      b.style.background = i === 1 ? PAL.acc : PAL.pri + "55";
      tl.fromTo(b, { xPercent: -101 }, { xPercent: 0, duration: 0.45, ease: E.io }, t + i * 0.06);
      tl.to(b, { xPercent: 101, duration: 0.45, ease: E.io }, t + 0.55 + i * 0.06); });
    const n = place(mk("div", "kh", g, num), W * 0.07, H * 0.2); n.style.cssText += `font-size:${u * 20}px;color:transparent;-webkit-text-stroke:${u * 0.25}px ${PAL.acc};opacity:0`;
    const h = place(mk("div", "kh", g, title), W * 0.07, H * 0.46); h.style.cssText += `font-size:${u * 8.5}px;opacity:0`;
    tl.fromTo(n, { opacity: 0, x: -u * 6 }, { opacity: 1, x: 0, duration: 0.6, ease: E.in }, t + 0.5);
    rise(h, t + 0.6, 0.1, 0.7);
    return g;
  }
  // a red X drawn over an element (two strokes)
  function xmark(e, t) {
    const x = mk("div", "", e.parentNode), s = e.style;
    x.style.cssText = `position:absolute;left:${s.left};top:${s.top};width:${s.width};height:${s.height};pointer-events:none`;
    [45, -45].forEach((a, i) => { const l = mk("div", "", x); l.style.cssText = `position:absolute;left:-5%;top:50%;width:110%;height:${u * 1.1}px;margin-top:${-u * 0.55}px;
      background:${PAL.warn};box-shadow:0 0 ${u * 2}px ${PAL.warn};border-radius:${u}px;transform:rotate(${a}deg);transform-origin:50% 50%`;
      tl.fromTo(l, { scaleX: 0 }, { scaleX: 1, duration: 0.28, ease: E.in }, t + i * 0.14); });
    return x;
  }
  // a social-media post card (the same design wherever the video quotes a viral claim)
  function post(x, y, w, text, t, likes = "1.3M") {
    const p = place(mk("div", "kpost", $("stage"), `<div class="pw"><div class="av"></div>TechNews Today • <span>2m</span></div>
      <div class="pt"></div><div class="pm"><span>♥ <i>0</i></span><span>↻ 48K</span></div>`), x, y, w);
    pop(p, t, { x: u * 10, opacity: 0, rotation: 2 }, 0.7, E.in);
    type(p.querySelector(".pt"), text, t + 0.35, 30);
    count(p.querySelector(".pm i"), 0, parseFloat(likes), t + 0.4, 2, (v) => v.toFixed(1) + likes.replace(/[\d.]/g, ""));
    return p;
  }
  css.textContent += `
  .kpost { position: absolute; border-radius: ${u * 1.6}px; background: #F4F7FF; color: #0A0E17; padding: ${u * 2.2}px; box-shadow: 0 ${u * 2}px ${u * 6}px #000c; }
  .kpost > div { position: relative; }
  .kpost .pw { display: flex; align-items: center; gap: ${u * 1.2}px; font: 800 ${u * 2.1}px var(--font-head); }
  .kpost .pw span { color: #5B6B85; } .kpost .av { width: ${u * 4.4}px; height: ${u * 4.4}px; border-radius: 50%; background: linear-gradient(135deg, ${PAL.acc}, #FF5A3C); }
  .kpost .pt { margin-top: ${u * 1.6}px; font: 800 ${u * 3.6}px var(--font-head); line-height: 1.15; min-height: 2.4em; white-space: normal; }
  .kpost .pt b { color: #E8590C; } .kpost .pm { margin-top: ${u * 1.4}px; display: flex; gap: ${u * 3}px; color: #5B6B85; font: 700 ${u * 2}px var(--font-head); }
  .kpost .pm span:first-child { color: #E03131; } .kpost .pm i { font-style: normal; }`;
  window.K = { chapter, xmark, post, ix, url, S, P, W, H, D, u, PAL, tl, E, T, IMG, at, $, mk, place, rnd, card, sweep, ring, pop, out, dim, lit, type, rise, chip, slam, flash,
               shake, beam, count, camera, circuits, done: () => finish(tl), X: (f) => f * W, Y: (f) => f * H };
})();
