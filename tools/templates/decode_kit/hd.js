/* hd.js (10_Diarrhea_ORS): "Health Decode" light clinical layer over kit.js (user brief 2026-11-16).
   Look: off-white studio #F8FAFC, every scene = a 3D medical render (base) + crisp 2D vector overlays that explain it.
   Meaning colours: blue #0284C7 / green #059669 healthy flow, amber #D97706 process / attention, red #DC2626 danger.
   bgl() studio background; base(k, x, y, w, h, o) 3D render (contain, multiply-blended into the studio, placeholder when missing);
   push(e, t, d, s, x, y, ease) camera move on a base; card(html, x, y, o); pill(text, c, x, y, o); word(html, x, y, size, o);
   draw(d, c, t, dur, o) SVG stroke draw (o.dash, o.head arrow, o.w); ring(x, y, c, t, o) pulse ring; flow(d, n, c, t0, t1, o) particles along a path;
   tank(x, y, w, h, label) {set(t, frac, c, d)}; nope(x, y, r, t, c) circle-slash; tick(x, y, s, t, c); dots(x, y, cols, rows, gap, r, c);
   float(e, t0, amp, per) ambient drift; spring ease E.spring. Class names start with hd-. */
(function () {
  const { S, W, H, D, V, u, tl, E, mk, place, ix, $ } = X;
  const K = { bg: "#F8FAFC", card: "#FFFFFF", ink: "#0F172A", mute: "#475569", line: "#CBD5E1", blue: "#0284C7", green: "#059669", amber: "#D97706", red: "#DC2626" };
  E.spring = "elastic.out(1, 0.72)"; E.soft2 = "back.out(1.25)";
  const NS = "http://www.w3.org/2000/svg";
  const css = document.createElement("style");
  css.textContent = `
  #root { background: ${K.bg}; }
  #hdbg { position: absolute; inset: 0; pointer-events: none; overflow: hidden;
          background: radial-gradient(ellipse 70% 60% at 50% 46%, #FFFFFF 0%, ${K.bg} 58%, #E9EEF5 100%); }
  #hdbg .grid { position: absolute; inset: -10%; opacity: .55;
          background-image: linear-gradient(#0F172A08 1px, transparent 1px), linear-gradient(90deg, #0F172A08 1px, transparent 1px);
          background-size: ${u * 6}px ${u * 6}px; }
  #hdbg .bk { position: absolute; border-radius: 50%; filter: blur(${u * 2}px); }
  .hd-base { position: absolute; transform-origin: 50% 50%; }
  .hd-base .im { position: absolute; inset: 0; background: no-repeat 50% 50% / contain; mix-blend-mode: multiply; -webkit-mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%); mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%); }
  .hd-base .sh { position: absolute; left: 22%; right: 22%; bottom: 4%; height: 7%; border-radius: 50%; background: radial-gradient(ellipse, #0F172A26, transparent 70%); }
  .hd-base .miss { position: absolute; inset: 6%; border: ${u * .25}px dashed #94A3B8; border-radius: ${u * 2}px; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: ${u}px; text-align: center; color: #64748B; font: 600 ${u * (V ? 2.4 : 1.7)}px var(--font-script); padding: ${u * 3}px; box-sizing: border-box; background: #FFFFFF80; }
  .hd-base .miss b { font: 800 ${u * (V ? 5 : 3.6)}px var(--font-head); color: #94A3B8; letter-spacing: .06em; }
  .hd-card { position: absolute; box-sizing: border-box; background: ${K.card}; border-radius: ${u * 1.8}px; color: ${K.ink};
          box-shadow: 0 ${u * .4}px ${u * 1}px #0F172A0f, 0 ${u * 1.6}px ${u * 4}px #0F172A1a; border: 1px solid #0F172A0d;
          padding: ${u * 1.6}px ${u * 2.4}px; font: 700 ${u * (V ? 4 : 3)}px var(--font-head); line-height: 1.15; white-space: nowrap; }
  .hd-card.bar { border-left: ${u * .8}px solid var(--c); }
  .hd-card .te { display: block; font: 600 ${u * (V ? 3.6 : 2.6)}px var(--font); color: ${K.mute}; margin-top: ${u * .5}px; }
  .hd-card em { font-style: normal; color: var(--c, ${K.blue}); }
  .hd-pill { position: absolute; display: inline-flex; align-items: center; gap: ${u * .8}px; padding: ${u * .7}px ${u * 1.7}px; background: #fff;
          border: ${u * .22}px solid var(--c); border-radius: 99px; color: ${K.ink}; white-space: nowrap;
          font: 700 ${u * (V ? 3.4 : 2.4)}px var(--font); box-shadow: 0 ${u * .6}px ${u * 1.8}px #0F172A1a; }
  .hd-pill i { width: ${u * 1.1}px; height: ${u * 1.1}px; border-radius: 50%; background: var(--c); flex: none; }
  .hd-pill.solid { background: var(--c); color: #fff; } .hd-pill.solid i { background: #fff; }
  .hd-word { position: absolute; font: 800 ${u * 8}px var(--font-head); color: ${K.ink}; letter-spacing: -.03em; line-height: 1; white-space: nowrap; }
  .hd-word em { font-style: normal; color: var(--c, ${K.blue}); }
  .hd-word .te { display: block; font: 700 .42em var(--font); letter-spacing: 0; color: ${K.mute}; margin-top: .25em; }
  .hd-svg { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
  .hd-p { position: absolute; border-radius: 50%; }
  .hd-tank { position: absolute; }
  .hd-tank .tr { position: absolute; inset: 0; border-radius: ${u * 2}px; background: #fff; border: ${u * .3}px solid ${K.line}; overflow: hidden; box-shadow: 0 ${u}px ${u * 3}px #0F172A1a; }
  .hd-tank .f { position: absolute; left: 0; right: 0; bottom: 0; background: var(--c); }
  .hd-tank .f::before { content: ""; position: absolute; left: 0; right: 0; top: -${u * .6}px; height: ${u * 1.2}px; border-radius: 50%; background: inherit; filter: brightness(1.15); }
  .hd-tank .lb { position: absolute; left: 50%; top: 100%; transform: translateX(-50%); margin-top: ${u * 1.2}px; font: 700 ${u * (V ? 3 : 2.1)}px var(--font); color: ${K.mute}; white-space: nowrap; }
  .hd-tank .v { position: absolute; left: 50%; top: -${u * (V ? 6 : 4.6)}px; transform: translateX(-50%); font: 800 ${u * (V ? 4.4 : 3.2)}px var(--font-head); color: var(--c); }`;
  document.head.append(css);

  let rs = 7;  // deterministic random (same frames every render)
  const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);

  function float(e, t0 = 0, amp = u * .6, per = 3.4) {
    const n = Math.max(1, Math.ceil((D - t0) / (per / 2)));
    tl.fromTo(e, { translate: "0px 0px" }, { translate: `0px ${-amp}px`, duration: per / 2, ease: "sine.inOut", repeat: n, yoyo: true, immediateRender: false }, t0);
    return e;
  }

  function bgl() {
    const b = document.createElement("div"); b.id = "hdbg"; $("root").insertBefore(b, $("stage"));
    const g = document.createElement("div"); g.className = "grid"; b.append(g);
    tl.fromTo(g, { x: 0, y: 0 }, { x: -u * 6, y: -u * 3, duration: Math.max(D, 1), ease: "none" }, 0);
    [[.12, .2, K.blue], [.86, .78, K.green], [.78, .14, K.amber]].forEach(([x, y, c], i) => {
      const k = document.createElement("div"); k.className = "bk"; b.append(k);
      Object.assign(k.style, { left: W * x + "px", top: H * y + "px", width: u * 22 + "px", height: u * 22 + "px", marginLeft: -u * 11 + "px", marginTop: -u * 11 + "px", background: c + "0d" });
      tl.fromTo(k, { x: 0, y: 0 }, { x: u * (i % 2 ? -5 : 5), y: u * (i ? 4 : -4), duration: Math.max(D, 1), ease: "sine.inOut" }, 0);
    });
    return b;
  }

  /* the scene's 3D render: k = name in params.names (e.g. "H01"); contain inside the box, never cropped */
  function base(k, x, y, w, h, o = {}) {
    const e = place(mk("div", "hd-base", o.parent), x, y, w, h), i = ix(k), src = (S.images || [])[i];
    if (o.shadow !== false) mk("div", "sh", e);
    const im = mk("div", "im", e); e.im = im;
    if (src) im.style.backgroundImage = `url(${src})`;
    else mk("div", "miss", e, `<b>${k}</b>${o.label || "3D render pending"}`);
    return e;
  }
  const push = (e, t, d, s = 1.1, x = 0, y = 0, ease = E.soft) => tl.to(e, { scale: s, x, y, duration: d, ease }, t);

  const card = (html, x, y, o = {}) => { const e = place(mk("div", "hd-card" + (o.bar ? " bar" : ""), o.parent, html), x, y, o.w); e.style.setProperty("--c", o.c || K.blue); if (o.center) e.style.textAlign = "center"; return e; };
  const pill = (text, c, x, y, o = {}) => { const e = place(mk("div", "hd-pill" + (o.solid ? " solid" : ""), o.parent, `<i></i>${text}`), x, y); e.style.setProperty("--c", c || K.blue); return e; };
  const word = (html, x, y, size = 8, o = {}) => { const e = place(mk("div", "hd-word", o.parent, html), x, y); e.style.fontSize = u * size + "px"; e.style.setProperty("--c", o.c || K.blue); return e; };

  function svg(parent) { const s = document.createElementNS(NS, "svg"); s.setAttribute("class", "hd-svg"); s.setAttribute("width", W); s.setAttribute("height", H); (parent || $("stage")).append(s); return s; }
  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; }
  let mid = 0;
  /* draw a path: solid -> stroke-dashoffset; dashed -> a solid mask path is drawn over the dashed line; o.head adds an arrowhead */
  function draw(d, c, t, dur = .8, o = {}) {
    const s = svg(o.parent), wd = o.w || u * .45, id = "hm" + (++mid);
    const p = el("path", { d, fill: "none", stroke: c, "stroke-width": wd, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
    if (o.head) { const m = el("marker", { id: id + "a", viewBox: "0 0 10 10", refX: 6, refY: 5, markerWidth: 4, markerHeight: 4, orient: "auto-start-reverse" }, el("defs", {}, s));
      el("path", { d: "M0 0 L10 5 L0 10 z", fill: c }, m); p.setAttribute("marker-end", `url(#${id}a)`); }
    const L = p.getTotalLength();
    if (o.dash) {
      p.setAttribute("stroke-dasharray", `${u * 1.2} ${u * .9}`);
      const mk2 = el("mask", { id, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, el("defs", {}, s));
      const mp = el("path", { d, fill: "none", stroke: "#fff", "stroke-width": wd * 3, "stroke-linecap": "round" }, mk2);
      p.setAttribute("mask", `url(#${id})`); mp.style.strokeDasharray = L; mp.style.strokeDashoffset = L;
      tl.to(mp.style, { strokeDashoffset: 0, duration: dur, ease: E.io }, t);
      if (o.head) { p.removeAttribute("marker-end"); tl.call(() => p.setAttribute("marker-end", `url(#${id}a)`), null, t + dur * .95); tl.call(() => p.removeAttribute("marker-end"), null, Math.max(t - .01, 0)); }
    } else {
      p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      tl.to(p.style, { strokeDashoffset: 0, duration: dur, ease: E.io }, t);
    }
    tl.set(s, { opacity: 1 }, t); tl.set(s, { opacity: 0 }, 0); s.p = p; return s;
  }
  function ring(x, y, c, t, o = {}) {
    const s = svg(o.parent), R = o.r || u * 6, n = o.n || 2;
    for (let i = 0; i < n; i++) {
      const ci = el("circle", { cx: x, cy: y, r: 1, fill: "none", stroke: c, "stroke-width": u * .35 }, s);
      gsap.set(ci, { opacity: 0 });
      tl.fromTo(ci, { attr: { r: R * .1 } }, { attr: { r: R }, duration: 1.1, ease: "power2.out", immediateRender: false }, t + i * .35);
      tl.fromTo(ci, { opacity: 1 }, { opacity: 0, duration: 1.05, ease: "power1.in", immediateRender: false }, t + i * .35);
    }
    return s;
  }
  /* n particles travel along path d between t0 and t1 (loop); o.stop ends them at a fraction, o.r radius, o.ring white stroke */
  function flow(d, n, c, t0, t1, o = {}) {
    const s = svg(o.parent), g = el("path", { d, fill: "none", stroke: "none" }, s), L = g.getTotalLength(), r = o.r || u * .7;
    const ps = [...Array(n)].map((_, i) => { const p = el("circle", { r, fill: c, stroke: o.ring || "#fff", "stroke-width": u * .18, opacity: 0 }, s); p.k = i / n; p.j = (rnd() - .5) * u * (o.jit ?? 1.4); return p; });
    const st = { p: 0 }, sp = o.speed || .25, stop = o.stop ?? 1;
    const upd = () => ps.forEach((p) => { let f = (p.k + st.p) % 1; if (o.once) f = Math.min(p.k * .6 + st.p, stop); const q = g.getPointAtLength(L * Math.min(f, stop));
      p.setAttribute("cx", q.x + p.j * .6); p.setAttribute("cy", q.y + p.j); p.setAttribute("opacity", o.once && f <= 0 ? 0 : (f > .94 && !o.once ? (1 - f) / .06 : Math.min(1, f / .05))); });
    tl.fromTo(st, { p: 0 }, { p: o.once ? 1 : (t1 - t0) * sp, duration: Math.max(t1 - t0, .1), ease: o.once ? E.io : "none", onUpdate: upd, immediateRender: false }, t0);
    tl.set(s, { opacity: 0 }, 0); tl.set(s, { opacity: 1 }, t0); if (!o.keep && t1 < D) tl.to(s, { opacity: 0, duration: .4 }, t1); s.ps = ps; return s;
  }
  function tank(x, y, w, h, label) {
    const e = place(mk("div", "hd-tank", undefined, `<div class="tr"><div class="f"></div></div><div class="v"></div><div class="lb">${label || ""}</div>`), x, y, w, h);
    e.f = e.querySelector(".f"); e.v = e.querySelector(".v"); const o = { v: 100 };
    e.set = (t, frac, c, d = 1.2) => { tl.to(e.f, { height: h * frac, background: c, duration: d, ease: E.io }, t); tl.to(e, { "--c": c, duration: d }, t);
      tl.to(o, { v: frac * 100, duration: d, ease: E.io, onUpdate: () => { e.v.textContent = Math.round(o.v) + "%"; } }, t); };
    gsap.set(e.f, { height: h, background: K.blue }); e.style.setProperty("--c", K.blue); e.v.textContent = "100%";
    return e;
  }
  function nope(x, y, r, t, c = K.red, parent) {  // hand-drawn circle with a slash
    const s = svg(parent), ci = el("circle", { cx: x, cy: y, r, fill: "none", stroke: c, "stroke-width": u * .6, "stroke-linecap": "round", transform: `rotate(-110 ${x} ${y})` }, s);
    const ln = el("line", { x1: x - r * .7, y1: y - r * .7, x2: x + r * .7, y2: y + r * .7, stroke: c, "stroke-width": u * .6, "stroke-linecap": "round" }, s);
    const L1 = 2 * Math.PI * r, L2 = r * 2;
    ci.style.strokeDasharray = L1; ci.style.strokeDashoffset = L1; ln.style.strokeDasharray = L2; ln.style.strokeDashoffset = L2;
    tl.to(ci.style, { strokeDashoffset: 0, duration: .35, ease: E.in }, t); tl.to(ln.style, { strokeDashoffset: 0, duration: .2, ease: E.in }, t + .3);
    return s;
  }
  function tick(x, y, sz, t, c = K.green, parent) {
    const s = svg(parent), pth = el("path", { d: `M${x - sz * .5} ${y} L${x - sz * .12} ${y + sz * .38} L${x + sz * .55} ${y - sz * .42}`, fill: "none", stroke: c, "stroke-width": u * .8, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
    const L = pth.getTotalLength(); pth.style.strokeDasharray = L; pth.style.strokeDashoffset = L; tl.to(pth.style, { strokeDashoffset: 0, duration: .35, ease: E.in }, t); return s;
  }
  function dots(x, y, cols, rows, gap, r, c, parent) {
    const out = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const d = place(mk("div", "hd-p", parent), x + i * gap - r, y + j * gap - r, r * 2, r * 2); d.style.background = c; d.i = i; d.j = j; out.push(d); }
    return out;
  }
  /* round white icon badge; glyphs drawn as 24x24 strokes */
  const G = { plate: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/>', glass: '<path d="M6 4h12l-1.5 16h-9z"/><path d="M7 10h10"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>', alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    hosp: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>', coin: '<circle cx="12" cy="12" r="8"/><path d="M9 9h6M9 12h6M12 9c3 0 3 6-1 6l4 3"/>',
    drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>', heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    person: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/>', thermo: '<path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
    pill: '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8v8"/>', bottle: '<path d="M10 2h4v4l2 3v12H8V9l2-3z"/>', baby: '<circle cx="12" cy="9" r="5"/><path d="M10 9h.5M13.5 9h.5M10 12c1 1 3 1 4 0"/>',
    soap: '<rect x="4" y="9" width="16" height="10" rx="4"/><circle cx="9" cy="5" r="1.5"/><circle cx="14" cy="4" r="1"/>', share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4M8 13l8 4"/>',
    like: '<path d="M7 10v10H4V10zM7 10l4-7c2 0 3 1 2 4l-1 3h7l-2 10H7"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>', zz: '<path d="M5 6h6l-6 7h6M13 12h5l-5 6h5"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', funnel: '<path d="M3 4h18l-7 8v7l-4 2v-9z"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>' };
  const css2 = document.createElement("style");
  css2.textContent = `.hd-ic { position: absolute; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 ${u * .6}px ${u * 2}px #0F172A1f; border: ${u * .25}px solid var(--c); box-sizing: border-box; }
  .hd-ic svg { width: 56%; height: 56%; }`;
  document.head.append(css2);
  function icon(k, c, x, y, s, parent) { const e = place(mk("div", "hd-ic", parent, `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${G[k] || ""}</svg>`), x, y, s, s); e.style.setProperty("--c", c); return e; }
  /* a base steps aside (smaller, dimmer) to make room for the next one */
  const aside = (e, t, x, y, w, h, op = .55, d = .9) => tl.to(e, { left: x, top: y, width: w, height: h, scale: 1, x: 0, y: 0, opacity: op, duration: d, ease: E.io }, t);
  const enter = (e, t, dx = W * .08, d = .9) => tl.fromTo(e, { x: dx, opacity: 0 }, { x: 0, opacity: 1, duration: d, ease: E.in, immediateRender: true }, t);
  const zin = (e, t, s0 = 1.12, d = 1) => tl.fromTo(e, { scale: s0, opacity: 0 }, { scale: 1, opacity: 1, duration: d, ease: E.soft2, immediateRender: true }, t);
  function bigNum(x, y, from, to, t, d, c, size = 12, fmt = (v) => Math.round(v).toLocaleString("en-IN"), parent) {
    const e = word("", x, y, size, { parent }); e.style.color = c; const o = { v: from }; e.textContent = fmt(from);
    tl.set(e, { opacity: 0 }, 0); tl.set(e, { opacity: 1 }, Math.max(t - .05, 0));
    tl.to(o, { v: to, duration: d, ease: "power2.out", onUpdate: () => { e.textContent = fmt(o.v); } }, t); return e; }
  /* fade every drawn svg made so far (lines, rings, marks, flows) when the composition changes */
  const clear = (t) => { const a = [...document.querySelectorAll('#stage > svg.hd-svg')]; if (a.length) tl.to(a, { opacity: 0, duration: .35 }, t); };
  window.HD = { clear, K, float, bgl, base, push, card, pill, word, svg, el, draw, ring, flow, tank, nope, tick, dots, rnd, icon, aside, enter, zin, bigNum };
})();
