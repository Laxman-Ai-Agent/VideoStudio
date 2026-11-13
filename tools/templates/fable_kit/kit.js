/* 04_Fable_Mythos motion kit ("redacted lab file"): motion tokens + helpers shared by this video's written sequences.
   Each sequence writes its own layout and choreography; the kit keeps the design system (cards, redaction reveal,
   version cards, stamps, badges, background). Load after studio.js: <script src="kit.js"></script>. */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, u = Math.min(W, H) / 100, V = H > W;
  const C = S.colors || {};
  const PAL = { fab: C.primary || "#6EF0B5", myt: C.secondary || "#A47CFF", bg: C.background || "#0D0D10", text: C.text || "#EDE6DA",
                mute: C.text2 || "#8C877F", warn: C.warning || "#FF6A4D", ink: "#050506" };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "expo.out", pop: "back.out(1.5)", out: "power2.in", io: "power3.inOut", slam: "power4.in", soft: "sine.inOut" };
  const T = { sm: 0.3, card: 0.6, big: 1.0 };
  const IMG = S.images || [], AR = P.ar || [], B = P.beats || {};
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; background: radial-gradient(120% 90% at 50% 40%, #18161D, #08080A); }
  .bgfx { position: absolute; inset: 0; }
  #stage { position: absolute; inset: 0; transform-origin: 50% 42%; }
  .kc { position: absolute; overflow: hidden; border-radius: ${u * 0.8}px; background: #16151A no-repeat;
        box-shadow: 0 ${u * 1.6}px ${u * 4.5}px #000c, 0 0 0 1px ${PAL.text}33; filter: saturate(.8) contrast(1.06); }
  .kc.round { border-radius: 50%; }
  .kc.cut { background-color: transparent; box-shadow: none; border-radius: 0; filter: drop-shadow(0 ${u}px ${u * 2.5}px #000c) saturate(.9); }
  .kc .sw { position: absolute; inset: -40%; background: linear-gradient(105deg, transparent 44%, #ffffff30 50%, transparent 56%); transform: translateX(-130%); }
  .kc .miss { position: absolute; inset: ${u * 0.8}px; border: 2px dashed ${PAL.mute}; display: flex; align-items: center; justify-content: center;
              color: ${PAL.mute}; font: 700 ${u * 1.8}px var(--font-script); letter-spacing: .1em; text-align: center; }
  .kc .tag { position: absolute; left: ${u}px; bottom: ${u}px; padding: ${u * 0.4}px ${u}px; background: ${PAL.ink}d0; color: ${PAL.text};
             font: 700 ${u * 1.7}px var(--font-script); letter-spacing: .12em; text-transform: uppercase; }
  .kh { position: absolute; color: ${PAL.text}; font: 400 ${u * 9}px var(--font-head); line-height: 1; text-transform: uppercase; white-space: nowrap; letter-spacing: .01em; opacity: 0; }
  .kh em { font-style: normal; color: ${PAL.fab}; } .kh b { font-weight: 400; color: ${PAL.myt}; } .kh s { text-decoration: none; color: ${PAL.warn}; }
  .kk { position: absolute; color: ${PAL.mute}; font: 700 ${u * 2}px var(--font-script); letter-spacing: .22em; text-transform: uppercase; white-space: nowrap; }
  .rd { position: relative; display: inline-block; } .rd > .rt { opacity: 0; }
  .rd > .rb { position: absolute; left: -2%; right: -2%; top: 6%; bottom: 2%; background: ${PAL.ink}; box-shadow: 0 0 0 1px #ffffff18; transform: scaleX(0); transform-origin: 0 50%; }
  .vc { position: absolute; border-radius: ${u * 1.4}px; overflow: hidden; background: linear-gradient(160deg, #ffffff16, #ffffff05 45%, #00000040);
        box-shadow: 0 ${u * 2}px ${u * 6}px #000d; }
  .vc .bd { position: absolute; inset: 0; border-radius: inherit; border: ${u * 0.25}px solid var(--c); box-shadow: inset 0 0 ${u * 4}px var(--c4), 0 0 ${u * 3}px var(--c4); }
  .vc .nm { position: absolute; left: 9%; bottom: 20%; font: 400 calc(var(--s) * 12) var(--font-head); color: ${PAL.text}; letter-spacing: .02em; }
  .vc .ver { position: absolute; left: 9%; bottom: 8%; font: 700 calc(var(--s) * 8) var(--font-script); color: var(--c); }
  .vc .lb { position: absolute; left: 9%; top: 7%; font: 700 calc(var(--s) * 4.6) var(--font-script); color: ${PAL.mute}; letter-spacing: .2em; }
  .vc .core { position: absolute; left: 50%; top: 40%; width: 34%; aspect-ratio: 1; margin: -17% 0 0 -17%; border-radius: 50%;
              background: radial-gradient(circle, #fff 0 8%, var(--c) 22%, var(--c4) 46%, transparent 70%); }
  .vc .sw { position: absolute; inset: -40%; background: linear-gradient(105deg, transparent 44%, #ffffff30 50%, transparent 56%); transform: translateX(-130%); }
  .chip { position: absolute; display: flex; align-items: center; gap: ${u * 0.8}px; padding: ${u * 0.6}px ${u * 1.4}px; border-radius: ${u * 0.5}px;
          background: ${PAL.ink}d8; border: 1px solid var(--c, ${PAL.text}66); color: ${PAL.text}; font: 700 ${u * 1.9}px var(--font-script);
          letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
  .chip::before { content: ""; width: ${u * 0.8}px; height: ${u * 0.8}px; background: var(--c, ${PAL.fab}); }
  .stamp { position: absolute; padding: ${u * 0.8}px ${u * 2}px; border: ${u * 0.5}px solid var(--c); color: var(--c); border-radius: ${u * 0.6}px;
           font: 400 ${u * 4}px var(--font-head); letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; background: ${PAL.ink}88; }
  .logo { position: absolute; background: ${PAL.text}; -webkit-mask: no-repeat center / contain; mask: no-repeat center / contain; }
  .badge { position: absolute; border-radius: ${u * 1}px; background: #ffffff0d; border: 1px solid ${PAL.text}30; box-shadow: 0 ${u}px ${u * 3}px #000a; }
  .ico { fill: none; stroke: var(--c); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  .kflash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
  .slice { position: absolute; left: 0; width: 100%; background: var(--c); mix-blend-mode: screen; opacity: 0; }`;
  document.head.append(css);

  const $ = (id) => document.getElementById(id);
  const at = (k, d = 0) => (B[k] ?? d);
  const mk = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html;
    (parent || $("stage") || $("root")).append(e); return e; };
  const place = (e, x, y, w, h) => { Object.assign(e.style, { left: x + "px", top: y + "px" }); if (w != null) e.style.width = w + "px"; if (h != null) e.style.height = h + "px"; return e; };
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const ix = (k) => (typeof k === "string" ? (P.names || []).indexOf(k) : k);
  const has = (k) => ix(k) >= 0 && !!IMG[ix(k)];

  /* picture card cropped around focus [cx, cy, zoom]; a missing picture shows a dashed MISSING placeholder */
  function card(o) {
    const i = ix(o.i), c = place(mk("div", "kc " + (o.shape || ""), o.parent), o.x, o.y, o.w, o.h);
    const ar = AR[i] || 16 / 9, [cx, cy, z] = o.focus || [0.5, 0.5, 1];
    const cut = o.shape === "cut", dw = (cut ? Math.min(o.w, o.h * ar) : Math.max(o.w, o.h * ar)) * z, dh = dw / ar;
    const px = cut ? (o.w - dw) / 2 : Math.min(0, Math.max(o.w - dw, o.w / 2 - cx * dw)), py = cut ? o.h - dh : Math.min(0, Math.max(o.h - dh, o.h / 2 - cy * dh));
    if (i >= 0 && IMG[i]) Object.assign(c.style, { backgroundImage: `url("${IMG[i]}")`, backgroundSize: `${dw}px ${dh}px`, backgroundPosition: `${px}px ${py}px` });
    else mk("div", "miss", c, "MISSING<br>" + String(o.i).toUpperCase());
    if (o.tag) mk("div", "tag", c, o.tag);
    if (!cut) mk("div", "sw", c);
    return c;
  }
  const sweep = (c, t) => { const s = c.querySelector && c.querySelector(".sw"); if (s) tl.fromTo(s, { xPercent: -130 }, { xPercent: 130, duration: 0.9, ease: E.io }, t); };
  function pop(e, t, from = { scale: 0.7, opacity: 0, y: u * 5 }, d = T.card, ease = E.pop) {
    tl.fromTo(e, from, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: d, ease, immediateRender: true }, t);
    if (e.classList) sweep(e, t + d * 0.5);
  }
  const out = (e, t, to = {}) => tl.to(e, { opacity: 0, y: -u * 3, duration: 0.4, ease: E.out, ...to }, t);
  const dim = (e, t, op = 0.3) => tl.to(e, { opacity: op, duration: 0.45, ease: E.soft }, t);
  const lit = (e, t) => tl.to(e, { opacity: 1, duration: 0.45, ease: E.soft }, t);

  /* this video's heading look: a black redaction bar covers the slot, then slides off and leaves the word */
  function head(html, x, y, size = 9, parent) {
    const e = place(mk("div", "kh", parent), x, y); e.style.fontSize = u * size * 1.35 + "px";  // Anton is condensed: 1.35x keeps the old visual weight
    e.innerHTML = `<span class="rd"><span class="rt">${html}</span><i class="rb"></i></span>`; return e;
  }
  function redact(e, t, d = 0.32) {
    const rb = e.querySelector(".rb"), rt = e.querySelector(".rt");
    tl.set(e, { opacity: 1 }, t);
    tl.fromTo(rb, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: d, ease: E.io, immediateRender: true }, t);
    tl.fromTo(rt, { opacity: 0 }, { opacity: 1, duration: 0.01, immediateRender: true }, t + d);
    tl.to(rb, { scaleX: 0, transformOrigin: "100% 50%", duration: d * 1.2, ease: E.io }, t + d + 0.05);
    return t + d * 2.2;
  }
  const kick = (text, x, y, parent) => place(mk("div", "kk", parent, text), x, y);
  // tech words: letters scramble, then settle left to right
  function scramble(e, text, t, d = 0.7) {
    const r = rnd(text.length * 97 + 13), A = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%", o = { p: 0 };
    tl.set(e, { opacity: 1 }, t);
    tl.to(o, { p: 1, duration: d, ease: "none", onUpdate: () => {
      const k = Math.floor(o.p * text.length);
      e.textContent = text.split("").map((ch, i) => (i < k || ch === " " ? ch : A[Math.floor(r() * A.length)])).join(""); } }, t);
  }
  function type(e, text, t, cps = 24) {
    const o = { n: 0 }, d = Math.max(0.15, text.length / cps);
    tl.set(e, { opacity: 1 }, t);
    tl.to(o, { n: text.length, duration: d, ease: "none", onUpdate: () => { e.textContent = text.slice(0, Math.round(o.n)); } }, t);
    return t + d;
  }
  function count(e, from, to, t, d = 1, fmt = (v) => Math.round(v)) {
    const o = { v: from }; e.textContent = fmt(from);
    tl.to(o, { v: to, duration: d, ease: "power2.out", onUpdate: () => { e.textContent = fmt(o.v); } }, t);
  }
  /* version card: kind 'fab' | 'myt' */
  function vcard(kind, x, y, w, h, parent) {
    const c = kind === "fab" ? PAL.fab : PAL.myt, nm = kind === "fab" ? "FABLE" : "MYTHOS";
    const e = place(mk("div", "vc", parent, `<div class="core"></div><div class="lb">CLAUDE</div><div class="nm">${nm}</div><div class="ver">5.2</div><div class="bd"></div><div class="sw"></div>`), x, y, w, h);
    e.style.setProperty("--c", c); e.style.setProperty("--c4", c + "55"); e.style.setProperty("--s", w / 100 + "px");
    return e;
  }
  const chip = (text, x, y, c, parent) => { const e = place(mk("div", "chip", parent, text), x, y); if (c) e.style.setProperty("--c", c); return e; };
  function stamp(text, x, y, c, t, rot = -8, parent) {
    const e = place(mk("div", "stamp", parent, text), x, y); e.style.setProperty("--c", c || PAL.warn);
    tl.fromTo(e, { scale: 2.2, opacity: 0, rotation: rot - 6 }, { scale: 1, opacity: 1, rotation: rot, duration: 0.28, ease: E.slam, immediateRender: true }, t);
    shake($("shake") || $("stage"), t + 0.27, u * 0.5); return e;
  }
  // logo silhouette in the text colour (CSS mask), optionally inside a glass badge
  function logo(k, x, y, w, h, opts = {}) {
    const i = ix(k), b = opts.badge ? place(mk("div", "badge", opts.parent), x, y, w, h) : null;
    const e = place(mk("div", "logo", b || opts.parent), b ? w * 0.2 : x, b ? h * 0.2 : y, b ? w * 0.6 : w, b ? h * 0.6 : h);
    if (i >= 0 && IMG[i]) { e.style.webkitMaskImage = e.style.maskImage = `url("${IMG[i]}")`; } else e.style.background = "none";
    if (opts.color) e.style.background = opts.color;
    return b || e;
  }
  const ICONS = {
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    bug: '<rect x="8" y="7" width="8" height="13" rx="4"/><path d="M12 7V4M8 12H4M20 12h-4M8 17l-3 2M16 17l3 2M8 9 5 7M16 9l3-2"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', check: '<path d="m5 12 4 4 10-10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>', code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
    flask: '<path d="M9 3h6M10 3v6l-6 10a1.5 1.5 0 0 0 1.3 2h13.4A1.5 1.5 0 0 0 20 19L14 9V3"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/>',
  };
  function icon(name, x, y, s, c, parent) {
    const e = place(mk("div", "", parent), x, y, s, s); e.style.position = "absolute";
    e.innerHTML = `<svg class="ico" viewBox="0 0 24 24" width="${s}" height="${s}" style="--c:${c || PAL.text}">${ICONS[name] || ""}</svg>`;
    return e;
  }
  function flash(t, op = 0.45) { const f = mk("div", "kflash", $("root")); tl.fromTo(f, { opacity: 0 }, { opacity: op, duration: 0.05, yoyo: true, repeat: 1 }, t); }
  function shake(e, t, a = u * 0.6) { tl.fromTo(e, { x: -a }, { x: a, duration: 0.05, repeat: 5, yoyo: true, ease: "none", immediateRender: false }, t); tl.set(e, { x: 0 }, t + 0.31); }
  function slam(e, t) { tl.fromTo(e, { scale: 2.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: E.slam, immediateRender: true }, t); flash(t + 0.28, 0.3); shake($("shake") || $("stage"), t + 0.3); }
  // chapter cut: colour slices glitch across, the frame jolts sideways
  function glitch(t, c = PAL.myt) {
    const r = rnd(Math.round(t * 100) + 5);
    for (let i = 0; i < 7; i++) { const s = place(mk("div", "slice", $("root")), 0, r() * H, null, (0.02 + r() * 0.07) * H); s.style.setProperty("--c", i % 2 ? c : "#ffffff");
      tl.fromTo(s, { opacity: 0, xPercent: (r() - 0.5) * 60 }, { opacity: 0.55, xPercent: 0, duration: 0.06, yoyo: true, repeat: 3, ease: "none", immediateRender: true }, t + i * 0.025); }
    tl.fromTo($("stage"), { x: u * 3 }, { x: 0, duration: 0.25, ease: "steps(4)", immediateRender: false }, t);
  }
  // line drawn from (x1,y1) to (x2,y2)
  function line(x1, y1, x2, y2, t, c = PAL.text, d = 0.6, wpx = u * 0.3, parent) {
    const len = Math.hypot(x2 - x1, y2 - y1), l = place(mk("div", "", parent), x1, y1, len, wpx);
    l.style.cssText += `;position:absolute;background:${c};transform-origin:0 50%;margin-top:${-wpx / 2}px;box-shadow:0 0 ${u}px ${c}88`;
    tl.fromTo(l, { scaleX: 0, rotation: Math.atan2(y2 - y1, x2 - x1) * 57.2958 }, { scaleX: 1, duration: d, ease: E.io, immediateRender: true }, t); return l;
  }
  const camera = (e, push = 1.05, drift = 0.012) => tl.fromTo(e, { scale: 1, xPercent: 0 }, { scale: push, xPercent: -drift * 100, duration: D, ease: E.soft }, 0);
  // background: dot grid, slow scan line, drifting redaction bars (seeded, frame-exact)
  function bg(opts = {}) {
    const cv = document.createElement("canvas"); cv.className = "bgfx"; $("root").prepend(cv); cv.width = W; cv.height = H;
    const g = cv.getContext("2d"), r = rnd(opts.seed || 3), step = u * 3.2, bars = [];
    for (let i = 0; i < (opts.bars || 6); i++) bars.push([r() * W, r() * H, (0.08 + r() * 0.25) * W, u * (0.6 + r() * 1.2), 0.3 + r()]);
    const tint = opts.tint || PAL.text;
    const draw = (t) => {
      g.clearRect(0, 0, W, H); g.fillStyle = tint + "22";
      for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) g.fillRect(x, y, u * 0.18, u * 0.18);
      bars.forEach(([x, y, w, h, v]) => { g.fillStyle = "#00000070"; g.fillRect(((x + t * v * u * 4) % (W + w)) - w, y, w, h); });
      const sy = ((t * 0.12) % 1) * H, gr = g.createLinearGradient(0, sy - u * 8, 0, sy); gr.addColorStop(0, tint + "00"); gr.addColorStop(1, tint + "14");
      g.fillStyle = gr; g.fillRect(0, sy - u * 8, W, u * 8);
    };
    const o = { t: 0 }; tl.fromTo(o, { t: 0 }, { t: D, duration: D, ease: "none", onUpdate: () => draw(o.t) }, 0); draw(0);
    return cv;
  }
  window.K = { S, P, W, H, D, u, V, PAL, tl, E, T, IMG, at, $, mk, place, rnd, ix, has, card, sweep, pop, out, dim, lit, head, redact, kick, scramble, type,
               count, vcard, chip, stamp, logo, icon, flash, shake, slam, glitch, line, camera, bg, done: () => finish(tl), X: (f) => f * W, Y: (f) => f * H };
})();
