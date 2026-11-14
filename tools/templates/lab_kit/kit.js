/* Element-lab kit (06_Gemini_Hydrogen, light-documentary): cool lab paper + dot grid + drifting hexagon molecules, section tints,
   Sora headings with a growing cyan underline + Telugu line, models as periodic-table tiles (H / C / Ar), a developer terminal that types,
   bar races with count-ups, price tags, chips with icons, a bottom info rail. Dense frames (user 2026-11-14): every screen keeps heading,
   main visual, supporting graphics and a moving background. Smooth motion only. Each sequence writes its own composition with these parts. */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, V = H > W, u = Math.min(W, H) / 100;
  const PAL = { ink: "#101828", mute: "#526070", cyan: "#12A4D9", dcyan: "#0B7CA8", ice: "#BFEAF8", coal: "#3A3F4B", amber: "#F5A524", damber: "#B45309",
                green: "#22C55E", dgreen: "#15803D", red: "#EF4444", violet: "#7C6CF2", white: "#FFFFFF", term: "#0F1B2D" };
  const SEC = { ice: ["#F3F8FB", "#DCEBF3"], mint: ["#F1F9F5", "#D7EEE2"], lilac: ["#F6F4FB", "#E2DCF3"], sand: ["#F9F6EF", "#EDE3CD"], sky: ["#F0F6FC", "#D4E6F7"] };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "power3.out", pop: "back.out(1.6)", out: "power2.in", io: "power2.inOut", soft: "sine.inOut" };
  const IMG = S.images || [], AR = P.ar || [], B = P.beats || {};
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; background: #F2F6F8; }
  #bgs, #mols { position: absolute; inset: 0; pointer-events: none; }
  .lbg { position: absolute; inset: 0; }
  .lbg .dots { position: absolute; inset: 0; background-image: radial-gradient(#10182822 ${u * 0.14}px, transparent ${u * 0.16}px); background-size: ${u * 3}px ${u * 3}px; }
  .lbg .glow { position: absolute; inset: 0; background: radial-gradient(circle at 18% 20%, #ffffffb0, transparent 42%), radial-gradient(circle at 88% 85%, #12A4D914, transparent 45%); }
  #stage { position: absolute; inset: 0; transform-origin: 50% 50%; }
  .lh { position: absolute; left: ${V ? 7 : 5}%; top: ${V ? 6 : 6.5}%; width: ${V ? 86 : 56}%; color: ${PAL.ink}; }
  .lh .kk { display: inline-flex; align-items: center; gap: ${u * .6}px; font: 700 ${u * (V ? 2.6 : 1.9)}px var(--font-script); letter-spacing: .16em; text-transform: uppercase;
            color: ${PAL.dcyan}; background: #fff; border: 1px solid #12A4D955; border-radius: 99px; padding: ${u * .45}px ${u * 1.2}px; margin-bottom: ${u * 1.3}px; }
  .lh .kk::before { content: ""; width: ${u * .8}px; height: ${u * .8}px; border-radius: 50%; background: ${PAL.cyan}; }
  .lh .en { font: 800 ${u * (V ? 8 : 7.4)}px var(--font-head); line-height: 1.04; letter-spacing: -.02em; }
  .lh .en em { font-style: normal; color: ${PAL.cyan}; position: relative; white-space: nowrap; }
  .lh .en em::after { content: ""; position: absolute; left: 0; right: 0; bottom: -.06em; height: .12em; border-radius: 99px; background: currentColor; transform: scaleX(var(--k, 1)); transform-origin: 0 50%; }
  .lh .te { margin-top: ${u * 1.2}px; font: 600 ${u * (V ? 4.6 : 3.8)}px var(--font); line-height: 1.3; color: ${PAL.mute}; }
  .tile { position: absolute; box-sizing: border-box; background: #fff; border-radius: calc(var(--s) * 8); box-shadow: 0 calc(var(--s) * 4) calc(var(--s) * 12) #10182826, 0 0 0 1px #10182814;
          border-top: calc(var(--s) * 5) solid var(--c); color: var(--c); }
  .tile .n { position: absolute; left: 9%; top: 6%; font: 700 calc(var(--s) * 12) var(--font-script); color: ${PAL.mute}; }
  .tile .m { position: absolute; right: 9%; top: 7%; font: 700 calc(var(--s) * 8) var(--font-script); color: ${PAL.mute}; }
  .tile .y { position: absolute; left: 0; right: 0; top: 20%; text-align: center; font: 800 calc(var(--s) * 52) var(--font-head); line-height: 1; letter-spacing: -.03em; }
  .tile .w { position: absolute; left: 0; right: 0; bottom: 8%; text-align: center; font: 700 calc(var(--s) * 10.5) var(--font-script); color: ${PAL.ink}; letter-spacing: .08em; text-transform: uppercase; }
  .tile.fill { background: var(--c); color: #fff; } .tile.fill .n, .tile.fill .m, .tile.fill .w { color: #ffffffd0; }
  .term { position: absolute; background: ${PAL.term}; border-radius: ${u * 1.2}px; overflow: hidden; box-shadow: 0 ${u * 1.4}px ${u * 4}px #10182844; font-family: "Chakra Petch", var(--font-script); }
  .term .bar { height: ${u * 3.2}px; background: #1C2B42; display: flex; align-items: center; gap: ${u * .6}px; padding: 0 ${u * 1.2}px; }
  .term .bar i { width: ${u * .9}px; height: ${u * .9}px; border-radius: 50%; background: #EF4444; } .term .bar i + i { background: #F5A524; } .term .bar i + i + i { background: #22C55E; }
  .term .bar b { margin-left: ${u}px; font: 600 ${u * 1.5}px var(--font-script); color: #8DA2BF; letter-spacing: .06em; }
  .term .tbd { padding: ${u * 1.4}px ${u * 1.8}px; }
  .term .tln { font-size: ${u * (V ? 3.2 : 2.6)}px; line-height: 1.55; color: #D6E2F0; white-space: pre; }
  .term .tln .p { color: ${PAL.cyan}; } .term .tln .ok { color: ${PAL.green}; } .term .tln .no { color: ${PAL.red}; } .term .tln .dim { color: #6F84A3; position: static; inset: auto; background: none; z-index: auto; }
  .term .cur { display: inline-block; width: .55em; height: 1.05em; vertical-align: -.15em; background: ${PAL.cyan}; }
  .lchip { position: absolute; display: inline-flex; align-items: center; gap: ${u * .7}px; padding: ${u * .65}px ${u * 1.4}px; background: #fff; border-radius: 99px; color: ${PAL.ink};
           font: 700 ${u * (V ? 3 : 2.2)}px var(--font-script); letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; box-shadow: 0 ${u * .5}px ${u * 1.6}px #10182822; border: 1px solid #10182812; }
  .lchip svg { width: 1.25em; height: 1.25em; }
  .lchip.solid { background: var(--c); color: #fff; border: 0; }
  .ln2 { position: absolute; font: 800 ${u * 14}px var(--font-head); line-height: 1; white-space: nowrap; color: ${PAL.ink}; letter-spacing: -.03em; }
  .lcard { position: absolute; box-sizing: border-box; background: #fff; border-radius: ${u * 1.6}px; box-shadow: 0 ${u}px ${u * 3}px #10182822, 0 0 0 1px #10182810; }
  .lcard .ic { width: ${u * 6}px; height: ${u * 6}px; border-radius: ${u * 1.4}px; display: flex; align-items: center; justify-content: center; background: var(--c); color: #fff; margin: ${u * 2}px ${u * 2}px 0; }
  .lcard .ic svg { width: 60%; height: 60%; }
  .lcard .t { margin: ${u * 1.4}px ${u * 2}px 0; font: 800 ${u * (V ? 4.4 : 3.2)}px var(--font-head); color: ${PAL.ink}; letter-spacing: -.01em; }
  .lcard .s { margin: ${u * .5}px ${u * 2}px; font: 600 ${u * (V ? 3.2 : 2.3)}px var(--font); color: ${PAL.mute}; }
  .limg { position: absolute; background: #fff no-repeat center / contain; border: ${u * .6}px solid #fff; border-radius: ${u * 1.2}px; box-shadow: 0 ${u * 1.2}px ${u * 3.2}px #1018282e, 0 0 0 1px #10182812; }
  .limg .miss { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center; color: ${PAL.mute}; font: 700 ${u * 1.8}px var(--font-script); border: 2px dashed #C3CEDA; }
  .llogo { position: absolute; background: no-repeat center / contain; }
  .hb { position: absolute; }
  .hb .lb { position: absolute; left: 0; bottom: 100%; margin-bottom: ${u * .6}px; font: 700 ${u * (V ? 3 : 2.2)}px var(--font-script); color: ${PAL.ink}; letter-spacing: .04em; white-space: nowrap; }
  .hb .tr { position: absolute; inset: 0; border-radius: 99px; background: #10182810; }
  .hb .f { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 99px; background: var(--c); transform-origin: 0 50%; }
  .hb .v { position: absolute; top: 50%; transform: translateY(-50%); margin-left: ${u * 1.2}px; font: 800 ${u * (V ? 5 : 3.8)}px var(--font-head); color: var(--c); white-space: nowrap; }
  .vb { position: absolute; }
  .vb .f { position: absolute; left: 0; right: 0; bottom: 0; border-radius: ${u}px ${u}px ${u * .3}px ${u * .3}px; background: var(--c); transform-origin: 50% 100%; }
  .vb .lb { position: absolute; left: -20%; right: -20%; top: 100%; margin-top: ${u * .8}px; text-align: center; font: 700 ${u * (V ? 2.8 : 1.9)}px var(--font-script); color: ${PAL.ink}; letter-spacing: .04em; }
  .vb .v { position: absolute; left: -30%; right: -30%; text-align: center; font: 800 ${u * (V ? 4 : 3)}px var(--font-head); color: var(--c); }
  .rail { position: absolute; left: 0; right: 0; bottom: 0; height: ${u * (V ? 5.2 : 4.6)}px; display: flex; align-items: center; background: #ffffffd9; border-top: 1px solid #10182814; overflow: hidden; }
  .rail .a { height: 100%; display: flex; align-items: center; gap: ${u * .7}px; padding: 0 ${u * 1.8}px; background: ${PAL.ink}; color: #fff; font: 800 ${u * (V ? 2.4 : 1.8)}px var(--font-head); letter-spacing: .04em; white-space: nowrap; }
  .rail .a i { width: ${u * 1.6}px; height: ${u * 1.6}px; border-radius: ${u * .3}px; background: ${PAL.cyan}; display: inline-block; }
  .rail .b { padding: 0 ${u * 2}px; font: 700 ${u * (V ? 2.4 : 1.8)}px var(--font-script); color: ${PAL.mute}; letter-spacing: .14em; text-transform: uppercase; white-space: nowrap; }
  .rail .b b { color: ${PAL.dcyan}; }
  .ptag { position: absolute; display: flex; align-items: center; gap: ${u}px; padding: ${u * 1}px ${u * 2.2}px ${u * 1}px ${u * 3.2}px; background: var(--c, ${PAL.amber}); color: ${PAL.ink};
          clip-path: polygon(${u * 2}px 0, 100% 0, 100% 100%, ${u * 2}px 100%, 0 50%); font: 800 ${u * (V ? 5 : 4)}px var(--font-head); white-space: nowrap; }
  .ptag::before { content: ""; position: absolute; left: ${u * 1.3}px; top: 50%; width: ${u * .9}px; height: ${u * .9}px; margin-top: -${u * .45}px; border-radius: 50%; background: #fff; }
  .ptag small { font: 700 ${u * (V ? 2.4 : 1.8)}px var(--font-script); letter-spacing: .08em; opacity: .75; }`;
  document.head.append(css);

  const $ = (id) => document.getElementById(id);
  const at = (k, d = 0) => (B[k] ?? d);
  const mk = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; (parent || $("stage")).append(e); return e; };
  const place = (e, x, y, w, h) => { Object.assign(e.style, { left: x + "px", top: y + "px" }); if (w != null) e.style.width = w + "px"; if (h != null) e.style.height = h + "px"; return e; };
  const ix = (k) => (typeof k === "string" ? (P.names || []).indexOf(k) : k);
  const fade = (e, t, d = 0.45) => tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: d, ease: E.soft, immediateRender: true }, t);
  function pop(e, t, from = { y: u * 3, opacity: 0, scale: 0.95 }, d = 0.6, ease = E.in) {
    const to = { opacity: 1, duration: d, ease, immediateRender: true };  // only animated keys reset (keeps CSS centring)
    for (const k of ["x", "y", "scale", "scaleX", "scaleY", "rotationY", "rotationX"]) if (k in from) to[k] = k.startsWith("scale") ? 1 : 0;
    if ("rotation" in from) to.rotation = e._rot || 0;
    tl.fromTo(e, from, to, t);
  }
  const out = (e, t, to = {}) => tl.to(e, { opacity: 0, duration: 0.4, ease: E.out, ...to }, t);
  const move = (e, t, x, y, w, h, d = 0.9, extra = {}) => tl.to(e, { left: x, top: y, ...(w != null ? { width: w } : {}), ...(h != null ? { height: h } : {}), duration: d, ease: E.io, ...extra }, t);
  function fit(e, t, x, y, mw, mh, d = 0.9, extra) { const ar = parseFloat(e.style.width) / parseFloat(e.style.height), w = Math.min(mw, mh * ar), h = w / ar;
    return move(e, t, x + (mw - w) / 2, y + (mh - h) / 2, w, h, d, extra); }
  const tilt = (e, deg) => { e._rot = deg; gsap.set(e, { rotation: deg }); return e; };
  const cam = (t, d, s = 1.04, x = 0, y = 0) => tl.to($("stage"), { scale: s, x, y, duration: d, ease: E.soft }, t);

  /* background: section gradient + dot grid; bg(name, t > 0) crossfades a new tint in. Molecules drift above it for the whole scene. */
  function layer(id) { let e = $(id); if (!e) { e = document.createElement("div"); e.id = id; $("root").insertBefore(e, $("shake") || $("stage")); } return e; }
  function bg(name = "ice", t = 0) {
    layer("bgs"); layer("mols");
    const c = SEC[name], L = mk("div", "lbg", $("bgs")); L.style.background = `linear-gradient(155deg, ${c[0]}, ${c[1]})`; mk("div", "dots", L); mk("div", "glow", L);
    if (t > 0) fade(L, t, 0.8); if (!$("mols").children.length) mols(); return L;
  }
  function hexSvg(r, col) { const pts = [...Array(6)].map((_, i) => [r + r * Math.cos(Math.PI / 3 * i + Math.PI / 6), r + r * Math.sin(Math.PI / 3 * i + Math.PI / 6)]);
    return `<svg width="${2 * r}" height="${2 * r}" style="overflow:visible"><polygon points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${col}" stroke-width="${u * .18}"/>${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${u * .35}" fill="${col}"/>`).join("")}</svg>`; }
  function mols() {
    const L = $("mols"), seed = [[.08, .78, 5], [.9, .16, 7], [.72, .86, 4], [.42, .1, 3.5], [.96, .62, 5.5], [.22, .4, 3]];
    seed.forEach(([fx, fy, r], i) => { const m = place(mk("div", "", L, hexSvg(u * r, i % 2 ? "#12A4D92e" : "#1018281a")), W * fx, H * fy); m.style.position = "absolute";
      tl.fromTo(m, { x: 0, y: 0, rotation: 0 }, { x: u * (i % 2 ? -6 : 5), y: u * (i % 3 ? 4 : -5), rotation: i % 2 ? 25 : -20, duration: Math.max(D, 1), ease: "none", immediateRender: true }, 0); });
  }

  /* heading: kicker pill, Sora heading (<em>word</em> = cyan + growing underline), Telugu line */
  function head(en, te, t, o = {}) {
    const e = mk("div", "lh", o.parent, `${o.kick ? `<div class="kk">${o.kick}</div><br>` : ""}<div class="en">${en}</div>${te ? `<div class="te">${te}</div>` : ""}`);
    if (o.x != null) place(e, o.x, o.y, o.w); if (o.size) e.querySelector(".en").style.fontSize = u * o.size + "px"; if (o.align) e.style.textAlign = o.align;
    const parts = [...e.children].filter((c) => c.tagName !== "BR");
    tl.fromTo(parts, { opacity: 0, y: u * 2.4 }, { opacity: 1, y: 0, duration: 0.55, ease: E.in, stagger: 0.1, immediateRender: true }, t);
    e.querySelectorAll("em").forEach((m) => tl.fromTo(m, { "--k": 0 }, { "--k": 1, duration: 0.5, ease: E.io, immediateRender: true }, t + 0.45));
    return e;
  }
  const rehead = (old, en, te, t, o) => { out(old, t - 0.35, { y: -u * 2 }); return head(en, te, t, o); };

  /* periodic-table tile: symbol, atomic number, mass line, name; s = width in px (height 1.18 s) */
  function tile(sym, n, name, x, y, s, c = PAL.cyan, o = {}) {
    const e = place(mk("div", "tile" + (o.fill ? " fill" : ""), o.parent, `<div class="n">${n}</div><div class="m">${o.mass || ""}</div><div class="y">${sym}</div><div class="w">${name}</div>`), x, y, s, s * 1.18);
    e.style.setProperty("--s", s / 100 + "px"); e.style.setProperty("--c", c); return e;
  }
  const flipIn = (e, t, d = 0.8) => tl.fromTo(e, { rotationY: -90, opacity: 0 }, { rotationY: 0, opacity: 1, duration: d, ease: E.pop, immediateRender: true }, t);
  // resize a tile (keeps its inner type in proportion through --s)
  const retile = (e, t, x, y, s, d = 0.9) => tl.to(e, { left: x, top: y, width: s, height: s * 1.18, "--s": s / 100 + "px", duration: d, ease: E.io }, t);

  /* terminal window; type(term, t, html, cps) adds a line that types in (html tags kept whole) */
  function term(title, x, y, w, h, parent) { const e = place(mk("div", "term", parent, `<div class="bar"><i></i><i></i><i></i><b>${title}</b></div><div class="tbd"></div>`), x, y, w, h); e.bd = e.querySelector(".tbd"); return e; }
  function type(tm, t, html, cps = 38) {
    const ln = mk("div", "tln", tm.bd), toks = html.match(/<[^>]+>|&#?[a-z0-9]+;|[^<&]/g) || [], n = toks.filter((k) => k[0] !== "<").length, o = { v: 0 };
    const draw = () => { let c = 0, s = ""; for (const k of toks) { if (k[0] === "<") s += k; else if (c < o.v) { s += k; c++; } } ln.innerHTML = s; };
    tl.fromTo(o, { v: 0 }, { v: n, duration: n / cps, ease: "none", onUpdate: draw, immediateRender: true }, t);
    tl.fromTo(ln, { opacity: 0 }, { opacity: 1, duration: 0.01, immediateRender: true }, t); return ln;
  }

  /* icons (24 box, stroke) */
  const ICO = { bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none"/>', check: '<path d="M4 12.5l5 5L20 6.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', dollar: '<path d="M16 7.5c-.8-1.3-2.3-2-4-2-2.2 0-4 1.2-4 3.2 0 4.3 8.3 2.4 8.3 6.6 0 2-1.9 3.3-4.3 3.3-1.9 0-3.5-.8-4.3-2.2M12 3v18"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
    code: '<path d="M8 7 3 12l5 5M16 7l5 5-5 5M14 4l-4 16"/>', brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    fire: '<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    up: '<path d="M4 17l6-6 4 4 7-8M15 7h6v6"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>' };
  const ico = (k, c = "currentColor") => `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICO[k] || ""}</svg>`;
  const chip = (text, x, y, o = {}) => { const e = place(mk("div", "lchip" + (o.solid ? " solid" : ""), o.parent, `${o.ico ? ico(o.ico, o.solid ? "#fff" : o.c || PAL.cyan) : ""}${text}`), x, y);
    if (o.c) e.style.setProperty("--c", o.c); return e; };
  /* feature card: coloured icon square, title, sub line */
  function fcard(icon, title, sub, x, y, w, h, c = PAL.cyan, parent) { const e = place(mk("div", "lcard", parent, `<div class="ic">${ico(icon, "#fff")}</div><div class="t">${title}</div><div class="s">${sub || ""}</div>`), x, y, w, h);
    e.style.setProperty("--c", c); return e; }
  const num = (x, y, color, size, parent) => { const e = place(mk("div", "ln2", parent), x, y); if (color) e.style.color = color; if (size) e.style.fontSize = u * size + "px"; return e; };
  function count(e, from, to, t, d = 1.1, fmt = (v) => Math.round(v)) { const o = { v: from }; e.textContent = fmt(from);
    tl.to(o, { v: to, duration: d, ease: "power2.out", onUpdate: () => { e.textContent = fmt(o.v); } }, t); }
  /* picture card, never cropped (box takes the picture's aspect inside w x h) */
  function card(o) {
    const i = ix(o.i), ar = AR[i] || 1, bw = o.w || o.h * ar, bh = o.h || o.w / ar, w = Math.min(bw, bh * ar), h = w / ar;
    const c = place(mk("div", "limg", o.parent), o.x + (bw - w) / 2, o.y + (bh - h) / 2, w, h);
    if (i >= 0 && IMG[i]) c.style.backgroundImage = `url("${IMG[i]}")`; else mk("div", "miss", c, "IMAGE PENDING<br>" + String(o.i).toUpperCase());
    if (o.rot) tilt(c, o.rot); return c;
  }
  function logo(k, x, y, w, h, parent) { const i = ix(k), ar = AR[i] || 1, ww = Math.min(w, h * ar), hh = ww / ar;
    const b = place(mk("div", "llogo", parent), x + (w - ww) / 2, y + (h - hh) / 2, ww, hh); if (i >= 0 && IMG[i]) b.style.backgroundImage = `url("${IMG[i]}")`; return b; }
  /* horizontal bar with count-up value riding the tip; returns the group (g.f fill, g.v value) */
  function hbar(label, x, y, w, h, val, max, c, t, d = 1.2, fmt = (v) => v.toFixed(0) + "%", parent) {
    const g = place(mk("div", "hb", parent, `<div class="lb">${label}</div><div class="tr"></div><div class="f"></div><div class="v"></div>`), x, y, w, h); g.style.setProperty("--c", c);
    fade(g, t - 0.35, 0.35); g.f = g.querySelector(".f"); g.v = g.querySelector(".v"); const fw = w * val / max; g.f.style.width = fw + "px";
    tl.fromTo(g.f, { scaleX: 0 }, { scaleX: 1, duration: d, ease: "power2.out", immediateRender: true }, t);
    tl.fromTo(g.v, { left: 0, opacity: 0 }, { left: fw, opacity: 1, duration: d, ease: "power2.out", immediateRender: true }, t);
    const o = { v: 0 }; g.v.textContent = fmt(0); tl.to(o, { v: val, duration: d, ease: "power2.out", onUpdate: () => { g.v.textContent = fmt(o.v); } }, t); return g;
  }
  /* vertical bar (grows up), label under, value over the top */
  function vbar(label, x, base, w, hmax, frac, c, t, d = 1, val = "", parent) {
    const g = place(mk("div", "vb", parent, `<div class="f"></div><div class="lb">${label}</div><div class="v">${val}</div>`), x, base - hmax, w, hmax); g.style.setProperty("--c", c);
    fade(g, t - 0.3, 0.3); g.f = g.querySelector(".f"); g.v = g.querySelector(".v"); g.f.style.height = hmax * frac + "px"; g.v.style.bottom = hmax * frac + u * 0.8 + "px";
    tl.fromTo(g.f, { scaleY: 0 }, { scaleY: 1, duration: d, ease: E.in, immediateRender: true }, t); tl.fromTo(g.v, { opacity: 0, y: hmax * frac }, { opacity: 1, y: 0, duration: d, ease: E.in, immediateRender: true }, t);
    return g;
  }
  const regrow = (g, t, hmax, frac, d = 0.9) => { tl.to(g.f, { height: hmax * frac, duration: d, ease: E.io }, t); tl.to(g.v, { bottom: hmax * frac + u * 0.8, duration: d, ease: E.io }, t); };
  /* bottom info rail: dark tag + facts; railSet swaps the facts */
  function rail(tag, text, t) { const e = mk("div", "rail", undefined, `<div class="a"><i></i>${tag}</div><div class="b">${text}</div>`);
    tl.fromTo(e, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: E.in, immediateRender: true }, t); e.b = e.querySelector(".b"); return e; }
  function railSet(e, t, text) { tl.to(e.b, { opacity: 0, x: -u * 2, duration: 0.25, ease: E.out }, t - 0.25); tl.call(() => { e.b.innerHTML = text; }, null, t);
    tl.to(e.b, { opacity: 1, x: 0, duration: 0.35, ease: E.in }, t); }
  const ptag = (text, small, x, y, c, parent) => { const e = place(mk("div", "ptag", parent, `${text}${small ? `<small>${small}</small>` : ""}`), x, y); if (c) e.style.setProperty("--c", c); return e; };
  // draw an SVG line through points (connector / bracket / path)
  function line(pts, t, d = 1, color = PAL.ink, wd = u * 0.4, parent) {
    const s = place(mk("div", "", parent), 0, 0, W, H); s.style.position = "absolute"; s.style.pointerEvents = "none";
    s.innerHTML = `<svg width="${W}" height="${H}" style="overflow:visible"><path d="M${pts.map((p) => p.join(" ")).join(" L")}" fill="none" stroke="${color}" stroke-width="${wd}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const p = s.querySelector("path"), L = p.getTotalLength(); p.style.strokeDasharray = L;
    tl.fromTo(p, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: d, ease: E.io, immediateRender: true }, t); return s;
  }
  const blink = (e, t0, t1) => { for (let t = t0; t < t1; t += 1) { tl.set(e, { opacity: 0 }, t + 0.5); tl.set(e, { opacity: 1 }, t + 1); } };
  window.X = { S, P, W, H, D, V, u, PAL, SEC, tl, E, at, $, mk, place, ix, fade, pop, out, move, fit, tilt, cam, bg, head, rehead, tile, flipIn, retile, term, type, ico, chip, fcard,
               num, count, card, logo, hbar, vbar, regrow, rail, railSet, ptag, line, blink, done: () => finish(tl) };
})();
