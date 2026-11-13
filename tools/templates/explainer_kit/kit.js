/* Explainer kit (style "explainer", docs/EXPLAINER_PLAN.md; look from the user's Git & GitHub class reference):
   light pastel gradient + blurred blobs (one colour per section), coral accent dash + navy title + Telugu line top-left,
   flat icons, white rounded cards, images never cropped (contain, box = image aspect), calm eased motion, full-frame moves.
   Each sequence writes its own screens with these parts. Load after studio.js: <script src="kit.js"></script>. */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, V = H > W, u = Math.min(W, H) / 100;
  const PAL = { ink: "#1B2140", mute: "#5B6178", coral: "#F0623E", white: "#FFFFFF", navy: "#151A38", term: "#7CF0B0",
                green: "#22C55E", blue: "#3B82F6", violet: "#7C4DFF", mint: "#10B981", orange: "#F59E0B", red: "#E5484D",
                fab: "#10B981", myt: "#7C4DFF" };
  const SEC = {  // section backgrounds: [gradient from, to, blob 1, blob 2, blob 3, title colour]
    purple: ["#5A2BC8", "#2E1A7A", "#C451D6", "#F2876A", "#6D3BE0", "#FFFFFF"],
    peach: ["#FDF1EA", "#F8CDB8", "#F6A486", "#FBC2AB", "#F9B59B", PAL.ink],
    lavender: ["#F5F0FF", "#FFF7DD", "#C8B2FF", "#FFE58F", "#D9CCFF", PAL.ink],
    cream: ["#FFF8E8", "#FDEACB", "#F9C58C", "#FBD9A6", "#F6B979", PAL.ink],
    mint: ["#EEFCF6", "#D3F5E8", "#93E3C3", "#BDEFDB", "#A8E9CF", PAL.ink],
    sky: ["#EEF5FF", "#D9E8FF", "#A3C8FF", "#C7DCFF", "#B3D1FF", PAL.ink],
    rose: ["#FFF0F0", "#FBD3D6", "#F59AA2", "#F9BDC2", "#F2A0A8", PAL.ink],
  };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "power3.out", pop: "back.out(1.4)", out: "power2.in", io: "power2.inOut", soft: "sine.inOut" };
  const IMG = S.images || [], AR = P.ar || [], B = P.beats || {};
  const TS = V ? 8.6 : 7, SS = V ? 4.4 : 3.6;  // title / Telugu line sizes in u
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; background: #FDF1EA; }
  .xbg { position: absolute; inset: 0; overflow: hidden; }
  .xbg i { position: absolute; border-radius: 50%; filter: blur(${u * 9}px); opacity: .75; }
  #stage { position: absolute; inset: 0; }
  .xt { position: absolute; left: ${V ? 7 : 6}%; top: ${V ? 5 : 8}%; width: ${V ? 86 : 70}%; }
  .xt .dash { width: ${u * 4.2}px; height: ${u * 0.55}px; border-radius: 9px; background: ${PAL.coral}; margin-bottom: ${u * 1.6}px; }
  .xt .en { font: 800 ${u * TS}px var(--font-head); letter-spacing: -.01em; line-height: 1.08; }
  .xt .te { margin-top: ${u * 1}px; font: 500 ${u * SS}px var(--font); line-height: 1.35; opacity: .82; }
  .xt .kk { font: 700 ${u * (V ? 2.6 : 1.9)}px var(--font-head); letter-spacing: .16em; text-transform: uppercase; margin-bottom: ${u * 1.4}px; }
  .xc { position: absolute; background: #fff no-repeat center / contain; border-radius: ${u * 1.6}px; border: ${u * 0.6}px solid #fff;
        box-shadow: 0 ${u * 1.2}px ${u * 3.5}px #1B214022, 0 ${u * 0.2}px ${u * 0.6}px #1B214014; }
  .xc .miss { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: ${PAL.mute};
              font: 700 ${u * 1.8}px var(--font-head); border: 2px dashed #C9CCD8; border-radius: inherit; }
  .xl { position: absolute; transform: translateX(-50%); white-space: nowrap; font: 700 ${u * (V ? 3.6 : 3)}px var(--font-head); color: ${PAL.ink}; text-align: center; }
  .xp { position: absolute; display: flex; align-items: center; gap: ${u * 0.9}px; padding: ${u * 0.8}px ${u * 1.6}px; border-radius: ${u * 0.9}px;
        background: #fff; color: ${PAL.ink}; font: 700 ${u * (V ? 3.6 : 3)}px var(--font-head); white-space: nowrap; box-shadow: 0 ${u * 0.6}px ${u * 1.8}px #1B214020; }
  .xp::before { content: ""; width: ${u * 0.5}px; height: ${u * (V ? 3.6 : 3)}px; border-radius: 9px; background: var(--c, ${PAL.coral}); }
  .xb { position: absolute; border-radius: ${u * 1.8}px; background: #ffffffe8; box-shadow: 0 ${u * 1}px ${u * 3}px #1B21401c; }
  .xterm { position: absolute; padding: ${u * 1.2}px ${u * 1.8}px; border-radius: ${u * 1}px; background: ${PAL.navy}; color: ${PAL.term};
           font: 700 ${u * (V ? 4 : 3.2)}px var(--font-script); white-space: nowrap; min-height: 1.3em; box-shadow: 0 ${u}px ${u * 3}px #1B214033; }
  .xterm .car { display: inline-block; width: ${u * 0.25}px; height: 1.05em; vertical-align: -.18em; margin-left: 2px; background: ${PAL.term}; }
  .xn { position: absolute; font: 800 ${u * 13}px var(--font-head); line-height: 1; letter-spacing: -.03em; white-space: nowrap; }
  .xi { position: absolute; }
  .xv { position: absolute; border-radius: ${u * 2}px; background: #fff; box-shadow: 0 ${u * 1.4}px ${u * 4}px #1B214022; overflow: hidden; }
  .xv .top { height: 34%; background: var(--c); display: flex; align-items: center; justify-content: center; }
  .xv .nm { margin: 8% 9% 0; font: 800 calc(var(--s) * 13) var(--font-head); color: ${PAL.ink}; letter-spacing: -.01em; line-height: 1.05; }
  .xv .sub { margin: 3% 9% 0; font: 600 calc(var(--s) * 5.6) var(--font-head); color: ${PAL.mute}; }
  .xcut { position: absolute; background: no-repeat center bottom / contain; filter: drop-shadow(0 ${u}px ${u * 2}px #1B214033); }
  .xi svg { width: 100%; height: 100%; display: block; overflow: visible; }`;
  document.head.append(css);

  const $ = (id) => document.getElementById(id);
  const at = (k, d = 0) => (B[k] ?? d);
  const mk = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html;
    (parent || $("stage")).append(e); return e; };
  const place = (e, x, y, w, h) => { Object.assign(e.style, { left: x + "px", top: y + "px" }); if (w != null) e.style.width = w + "px"; if (h != null) e.style.height = h + "px"; return e; };
  const ix = (k) => (typeof k === "string" ? (P.names || []).indexOf(k) : k);
  const fade = (e, t, d = 0.45) => tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: d, ease: E.soft, immediateRender: true }, t);
  function pop(e, t, from = { y: u * 3, opacity: 0, scale: 0.94 }, d = 0.55, ease = E.in) {
    tl.fromTo(e, from, { x: 0, y: 0, scale: 1, opacity: 1, duration: d, ease, immediateRender: true }, t);
  }
  const out = (e, t, to = {}) => tl.to(e, { opacity: 0, duration: 0.35, ease: E.out, ...to }, t);
  // move / resize an element to a new box (the full-frame rule: the old visual makes room, the new one fills it)
  const move = (e, t, x, y, w, h, d = 0.8) => tl.to(e, { left: x, top: y, ...(w != null ? { width: w } : {}), ...(h != null ? { height: h } : {}), duration: d, ease: E.io }, t);

  // move into a max box keeping the element's own aspect (cards, logos, icons): centred inside the box, never cropped
  function fit(e, t, x, y, mw, mh, d = 0.8) {
    const ar = parseFloat(e.style.width) / parseFloat(e.style.height), w = Math.min(mw, mh * ar), h = w / ar;
    return move(e, t, x + (mw - w) / 2, y + (mh - h) / 2, w, h, d);
  }
  /* background of one section; setSection crossfades to another section's colours at time t */
  function bg(name = "peach", t = 0) {
    const c = SEC[name], L = document.createElement("div"); L.className = "xbg";
    $("root").insertBefore(L, $("shake") || $("stage"));
    L.style.background = `linear-gradient(135deg, ${c[0]}, ${c[1]})`;
    const spots = [[0.72, -0.15, 0.5], [-0.12, 0.55, 0.42], [0.45, 0.7, 0.36]];
    spots.forEach(([x, y, s], i) => { const b = mk("i", "", L); place(b, x * W, y * H, s * Math.max(W, H), s * Math.max(W, H)); b.style.background = c[2 + i];
      tl.fromTo(b, { x: 0, y: 0 }, { x: (i - 1) * u * 6, y: (1 - i) * u * 4, duration: Math.max(D, 1), ease: E.soft }, 0); });
    if (t > 0) fade(L, t, 0.6);
    return L;
  }
  const setSection = (name, t) => bg(name, t);

  /* title block: optional kicker, coral dash, English title, Telugu line; returns the block */
  function title(en, te, t, opts = {}) {
    const e = mk("div", "xt", opts.parent || $("stage"), `${opts.kick ? `<div class="kk">${opts.kick}</div>` : ""}<div class="dash"></div><div class="en">${en}</div>${te ? `<div class="te">${te}</div>` : ""}`);
    const col = opts.color || PAL.ink; e.style.color = col; if (opts.kick) e.querySelector(".kk").style.color = opts.kickColor || PAL.coral;
    if (opts.size) e.querySelector(".en").style.fontSize = u * opts.size + "px";
    const parts = [...e.children];
    tl.fromTo(parts, { opacity: 0, y: u * 2 }, { opacity: 1, y: 0, duration: 0.5, ease: E.in, stagger: 0.09, immediateRender: true }, t);
    tl.fromTo(e.querySelector(".dash"), { scaleX: 0, transformOrigin: "0 50%" }, { scaleX: 1, duration: 0.5, ease: E.in, immediateRender: true }, t);
    return e;
  }
  const retitle = (old, en, te, t, opts) => { out(old, t - 0.3, { y: -u * 2 }); return title(en, te, t, opts); };

  /* image card, never cropped: the box takes the picture's aspect inside the max box (w x h) */
  function card(o) {
    const i = ix(o.i), ar = AR[i] || 1, bw = o.w || o.h * ar, bh = o.h || o.w / ar;
    const w = Math.min(bw, bh * ar), h = w / ar, x = o.x + (bw - w) / 2, y = o.y + (bh - h) / 2;
    const c = place(mk("div", "xc", o.parent), x, y, w, h);
    if (i >= 0 && IMG[i]) c.style.backgroundImage = `url("${IMG[i]}")`; else mk("div", "miss", c, "MISSING " + String(o.i).toUpperCase());
    if (o.round) c.style.borderRadius = "50%";
    if (o.label) { const l = mk("div", "xl", c, o.label); place(l, w / 2, h + u * 1.4); }
    c.box = { x, y, w, h };
    return c;
  }
  // logo in a white badge (keeps its own colours)
  function logo(k, x, y, s, label) {
    const b = place(mk("div", "xc"), x, y, s, s); b.style.backgroundSize = "62%"; const i = ix(k); if (i >= 0 && IMG[i]) b.style.backgroundImage = `url("${IMG[i]}")`;
    if (label) { const l = mk("div", "xl", b, label); place(l, s / 2, s + u * 1.2); }
    return b;
  }
  const chip = (text, x, y, c, parent) => { const e = place(mk("div", "xp", parent, text), x, y); if (c) e.style.setProperty("--c", c); return e; };
  const box = (x, y, w, h, tint, parent) => { const e = place(mk("div", "xb", parent), x, y, w, h); if (tint) e.style.background = tint; return e; };
  const label = (text, cx, y, parent, color) => { const e = place(mk("div", "xl", parent, text), cx, y); if (color) e.style.color = color; return e; };
  function term(x, y, w, parent) { const e = place(mk("div", "xterm", parent, '<span>$ </span><b style="font-weight:700"></b><i class="car"></i>'), x, y, w); return e; }
  function typeIn(el, text, t, cps = 18) {
    const o = { n: 0 }, d = Math.max(0.2, text.length / cps);
    tl.to(o, { n: text.length, duration: d, ease: "none", onUpdate: () => { el.textContent = text.slice(0, Math.round(o.n)); } }, t);
    return t + d;
  }
  const typeTerm = (tm, text, t, cps) => typeIn(tm.querySelector("b"), text, t, cps);
  function count(e, from, to, t, d = 1, fmt = (v) => Math.round(v)) {
    const o = { v: from }; e.textContent = fmt(from);
    tl.to(o, { v: to, duration: d, ease: "power2.out", onUpdate: () => { e.textContent = fmt(o.v); } }, t);
  }
  const num = (x, y, color, size, parent) => { const e = place(mk("div", "xn", parent), x, y); e.style.color = color || PAL.ink; if (size) e.style.fontSize = u * size + "px"; return e; };

  /* flat icons (filled, one style). icon(name, x, y, size, colour) */
  const ICON = {
    laptop: (c) => `<svg viewBox="0 0 120 84"><rect x="14" y="4" width="92" height="62" rx="6" fill="${PAL.navy}"/><rect x="20" y="10" width="80" height="50" rx="2" fill="#fff"/><rect x="2" y="68" width="116" height="9" rx="4.5" fill="#C9CEDD"/></svg>`,
    cloud: (c) => `<svg viewBox="0 0 120 80"><path d="M30 76a26 26 0 0 1-2-52A32 32 0 0 1 89 22a24 24 0 0 1 3 54z" fill="#fff" style="filter:drop-shadow(0 6px 10px #1B214022)"/></svg>`,
    folder: (c) => `<svg viewBox="0 0 100 76"><path d="M4 12a6 6 0 0 1 6-6h26l9 9h45a6 6 0 0 1 6 6v6H4z" fill="${c}"/><rect x="4" y="22" width="92" height="52" rx="6" fill="${c}" opacity=".82"/></svg>`,
    file: (c) => `<svg viewBox="0 0 64 80"><path d="M4 6a4 4 0 0 1 4-4h34l18 18v54a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#fff" stroke="#D5D9E5" stroke-width="2"/><path d="M42 2v18h18" fill="#EEF0F6"/><rect x="14" y="34" width="36" height="5" rx="2.5" fill="${c}"/><rect x="14" y="46" width="28" height="5" rx="2.5" fill="#D5D9E5"/><rect x="14" y="58" width="32" height="5" rx="2.5" fill="#D5D9E5"/></svg>`,
    check: (c) => `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="${c || PAL.green}"/><path d="m11 21 6 6 12-13" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    cross: (c) => `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="${c || PAL.red}"/><path d="m13 13 14 14M27 13 13 27" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`,
    lock: (c) => `<svg viewBox="0 0 60 72"><path d="M16 32V20a14 14 0 0 1 28 0v12" fill="none" stroke="${PAL.navy}" stroke-width="7"/><rect x="4" y="30" width="52" height="40" rx="8" fill="${c}"/><circle cx="30" cy="48" r="5" fill="#fff"/><rect x="28" y="50" width="4" height="10" rx="2" fill="#fff"/></svg>`,
    unlock: (c) => `<svg viewBox="0 0 60 72"><path d="M16 32V20a14 14 0 0 1 27-5" fill="none" stroke="${PAL.navy}" stroke-width="7"/><rect x="4" y="30" width="52" height="40" rx="8" fill="${c}"/><circle cx="30" cy="48" r="5" fill="#fff"/><rect x="28" y="50" width="4" height="10" rx="2" fill="#fff"/></svg>`,
    bolt: (c) => `<svg viewBox="0 0 40 56"><path d="M24 2 4 32h13l-3 22 22-32H23z" fill="${c}"/></svg>`,
    tag: (c) => `<svg viewBox="0 0 80 50"><path d="M18 2h56a4 4 0 0 1 4 4v38a4 4 0 0 1-4 4H18L2 25z" fill="${c}"/><circle cx="18" cy="25" r="5" fill="#fff"/></svg>`,
    user: (c) => `<svg viewBox="0 0 40 44"><circle cx="20" cy="12" r="10" fill="${c}"/><path d="M2 42a18 16 0 0 1 36 0z" fill="${c}"/></svg>`,
    chat: (c) => `<svg viewBox="0 0 60 50"><path d="M6 2h48a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H22L10 48V38H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z" fill="${c}"/></svg>`,
    bug: (c) => `<svg viewBox="0 0 48 52"><rect x="12" y="12" width="24" height="36" rx="12" fill="${c}"/><path d="M24 12V4M12 26H2M46 26H36M12 40l-8 6M36 40l8 6M14 16 6 8M34 16l8-8" stroke="${c}" stroke-width="4" stroke-linecap="round"/></svg>`,
    eye: (c) => `<svg viewBox="0 0 60 40"><path d="M2 20S12 2 30 2s28 18 28 18-10 18-28 18S2 20 2 20z" fill="#fff" stroke="${c}" stroke-width="3"/><circle cx="30" cy="20" r="10" fill="${c}"/><circle cx="33" cy="17" r="3" fill="#fff"/></svg>`,
    shield: (c) => `<svg viewBox="0 0 50 58"><path d="M25 2 4 10v16c0 15 9 26 21 30 12-4 21-15 21-30V10z" fill="${c}"/><path d="m15 29 7 7 13-14" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    clock: (c) => `<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="23" fill="#fff" stroke="${c}" stroke-width="4"/><path d="M25 12v14l9 6" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/></svg>`,
    arrow: (c) => `<svg viewBox="0 0 100 20"><path d="M2 10h86M78 2l10 8-10 8" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 7"/></svg>`,
  };
  const ASPECT = { laptop: 84 / 120, cloud: 80 / 120, folder: 0.76, file: 1.25, check: 1, cross: 1, lock: 1.2, unlock: 1.2, bolt: 1.4, tag: 0.625, user: 1.1,
                   chat: 0.83, bug: 1.08, eye: 0.667, shield: 1.16, clock: 1, arrow: 0.2 };
  function icon(name, x, y, w, c, parent) { const e = place(mk("div", "xi", parent, ICON[name](c || PAL.coral)), x, y, w, w * (ASPECT[name] || 1)); return e; }
  // a chip that travels from one point to another (upload, request, ...)
  function travel(e, t, x1, y1, x2, y2, d = 1.0) {
    tl.fromTo(e, { left: x1, top: y1, opacity: 0 }, { left: x2, top: y2, opacity: 1, duration: d, ease: E.io, immediateRender: true }, t);
    tl.to(e, { opacity: 0, duration: 0.2 }, t + d);
  }
  /* Fable / Mythos version card ('fab' | 'myt'); --s scales the text with the card width */
  function vcard(kind, x, y, w, h, sub) {
    const c = kind === "fab" ? PAL.fab : PAL.myt, nm = kind === "fab" ? "Claude<br>Fable 5.2" : "Claude<br>Mythos 5.2";
    const e = place(mk("div", "xv", undefined, `<div class="top"></div><div class="nm">${nm}</div><div class="sub">${sub || "by Anthropic"}</div>`), x, y, w, h);
    e.style.setProperty("--c", c); e.style.setProperty("--s", w / 100 + "px");
    icon(kind === "fab" ? "shield" : "bug", 0, 0, h * 0.2, "#fff", e.querySelector(".top")).style.position = "relative";
    return e;
  }
  // presenter cut-out: whole picture, bottom-anchored, never cropped
  function cut(k, x, y, w, h) { const e = place(mk("div", "xcut"), x, y, w, h); const i = ix(k); if (i >= 0 && IMG[i]) e.style.backgroundImage = `url("${IMG[i]}")`; return e; }
  window.X = { S, P, W, H, D, V, u, PAL, SEC, tl, E, at, $, mk, place, ix, fade, pop, out, move, fit, bg, setSection, title, retitle, card, logo, chip, box, label,
               term, typeIn, typeTerm, count, num, icon, travel, vcard, cut, done: () => finish(tl), X: (f) => f * W, Y: (f) => f * H };
})();
