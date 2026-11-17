/* ledger_kit (12_Anthropic_IPO): "prospectus noir" - premium fast financial documentary, written fresh for this video
   (user brief 2026-11-16: complete creative freedom, smart visual mix, big cinematic images, constant motion).
   Ink-black frame with a hairline ledger grid; coral = Anthropic / the story, green = money in, red = loss / risk, gold = value.
   Type: tall editorial serif headlines (italic coral accents) + Space Mono readouts (tickers, counters, kickers) + Telugu line.
   Pictures: AI cinematic stills and real photos as big shots (full frame or framed panels with corner ticks), each with its
   own camera move. Graphics: ticker tape, line / bar charts that draw, price bracket, company chips, prospectus pages.
   Scene code: const { ... } = LK; build; LK.done(). */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, V = H > W, u = Math.min(W, H) / 100;
  const C = S.colors || {};
  const K = { bg: C.background || "#07090F", coral: C.primary || "#E07A5F", green: C.secondary || "#3DDC97", red: C.warning || "#FF5A5F",
              ink: C.text || "#F3EEE4", mute: C.text2 || "#9AA3B2", gold: "#E9C46A", blue: C.accent || "#7FA7FF" };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "expo.out", snap: "power4.out", io: "power3.inOut", soft: "sine.inOut", out: "power2.in", pop: "back.out(1.7)" };
  const IMG = S.images || [], B = P.beats || {};
  const MONO = "'Space Mono', monospace";
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; background: ${K.bg}; }
  #stage { position: absolute; inset: 0; overflow: hidden; transform-origin: 50% 50%; }
  .lk-grid { position: absolute; inset: -10%; pointer-events: none;
    background-image: linear-gradient(${K.ink}14 1px, transparent 1px), linear-gradient(90deg, ${K.ink}14 1px, transparent 1px);
    background-size: ${u * 8}px ${u * 8}px; }
  .lk-shot { position: absolute; overflow: hidden; background: #000; }
  .lk-shot .im { position: absolute; inset: -8%; background: #111 no-repeat center / cover; filter: contrast(1.06) saturate(1.04); will-change: transform; }
  .lk-shot.fit .im { inset: 0; background-size: contain; background-color: transparent; }
  .lk-shot .miss { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: ${K.mute};
    font: 700 ${u * 2.2}px ${MONO}; letter-spacing: .3em; background: radial-gradient(circle at 50% 45%, #1b2333, #07090f 70%); }
  .lk-shot .sh { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(0deg, #07090fd0, transparent 40%, transparent 78%, #07090f80); }
  .lk-shot.framed { box-shadow: 0 ${u * 2}px ${u * 6}px #000c; outline: 1px solid ${K.ink}30; }
  .lk-tick { position: absolute; width: ${u * 2.4}px; height: ${u * 2.4}px; border: 0 solid ${K.coral}; pointer-events: none; }
  .lk-fx { position: absolute; inset: 0; pointer-events: none; }
  .lk-h { position: absolute; font: 400 ${u * (V ? 11 : 10)}px var(--font-head); line-height: .95; letter-spacing: -.015em; color: ${K.ink}; white-space: nowrap;
    text-shadow: 0 ${u * .3}px ${u * 3}px #000a; }
  .lk-h .w { display: inline-block; overflow: hidden; vertical-align: top; padding: 0 .14em .12em .03em; margin-right: .08em; }
  .lk-h .w > i { display: inline-block; font-style: normal; }
  .lk-h em { font-style: italic; color: var(--c, ${K.coral}); }
  .lk-te { position: absolute; font: 500 ${u * (V ? 5.2 : 3.9)}px var(--font); color: ${K.ink}; line-height: 1.35; white-space: nowrap; text-shadow: 0 ${u * .3}px ${u * 2}px #000; }
  .lk-te b { color: var(--c, ${K.coral}); font-weight: 600; }
  .lk-mono { position: absolute; font: 700 ${u * (V ? 2.8 : 1.9)}px ${MONO}; letter-spacing: .22em; text-transform: uppercase; color: var(--c, ${K.coral}); white-space: nowrap; }
  .lk-num { position: absolute; font: 700 ${u * (V ? 17 : 16)}px ${MONO}; line-height: .9; color: ${K.ink}; letter-spacing: -.04em; white-space: nowrap; text-shadow: 0 0 ${u * 4}px #000; }
  .lk-num small { font-size: .3em; letter-spacing: .06em; color: var(--c, ${K.coral}); margin-left: .2em; }
  .lk-tape { position: absolute; left: 0; width: ${W}px; height: ${u * (V ? 5 : 4.4)}px; background: ${K.ink}; color: ${K.bg}; overflow: hidden; z-index: 25; }
  .lk-tape .row { position: absolute; top: 0; height: 100%; display: flex; align-items: center; gap: ${u * 4}px; white-space: nowrap;
    font: 700 ${u * (V ? 2.6 : 2)}px ${MONO}; letter-spacing: .08em; }
  .lk-tape .up { color: #0a7a4a; } .lk-tape .dn { color: #c22a2e; }
  .lk-chip { position: absolute; display: flex; align-items: center; justify-content: center; padding: 0 ${u * 2}px; height: ${u * (V ? 7 : 6.4)}px; box-sizing: border-box;
    font: 700 ${u * (V ? 3.2 : 2.5)}px ${MONO}; letter-spacing: .06em; color: ${K.ink}; white-space: nowrap;
    background: #0d1220e8; border: 1px solid ${K.ink}40; border-left: ${u * .5}px solid var(--c, ${K.coral}); }
  .lk-page { position: absolute; background: #f3eee4; box-shadow: 0 ${u}px ${u * 4}px #000b; overflow: hidden; }
  .lk-page i { position: absolute; left: 10%; height: ${u * .7}px; background: #07090f30; border-radius: 2px; }
  .lk-page i.r { background: ${K.red}cc; }
  .lk-flash { position: absolute; inset: 0; background: #fff; opacity: 0; z-index: 40; pointer-events: none; }
  .lk-scan { position: absolute; left: 0; width: ${W}px; height: 2px; background: ${K.coral}; box-shadow: 0 0 ${u * 2}px ${K.coral}; z-index: 30; opacity: 0; }
  .lk-dot { position: absolute; border-radius: 50%; background: var(--c, ${K.coral}); box-shadow: 0 0 ${u * 1.5}px var(--c, ${K.coral}); }
  .lk-ring { position: absolute; border-radius: 50%; border: ${u * .3}px solid var(--c, ${K.coral}); }`;
  document.head.append(css);

  const $ = (id) => document.getElementById(id);
  const at = (k, d = 0) => (B[k] ?? d);
  const mk = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; (parent || stage()).append(e); return e; };
  function stage() { let s = $("stage"); if (!s) { s = document.createElement("div"); s.id = "stage"; $("root").append(s); } return s; }
  const place = (e, x, y, w, h) => { Object.assign(e.style, { left: x + "px", top: y + "px" }); if (w != null) e.style.width = w + "px"; if (h != null) e.style.height = h + "px"; return e; };
  const ix = (k) => (P.names || []).indexOf(k);
  const src = (k) => { const i = ix(k); return i >= 0 ? IMG[i] : null; };
  const out = (e, t, d = .35, to = {}) => tl.to(e, { autoAlpha: 0, duration: d, ease: E.out, ...to }, t);
  const centre = (e) => { e.style.left = "0"; e.style.width = W + "px"; e.style.textAlign = "center"; };
  const pos = (e, o, dx, dy) => { place(e, o.x ?? dx, o.y ?? dy);
    if (o.align === "center") centre(e);
    if (o.align === "right") { e.style.left = "auto"; e.style.right = (o.r ?? W * .06) + "px"; e.style.textAlign = "right"; } };

  /* ledger grid behind everything, drifting slowly */
  function grid(o = {}) { const g = mk("div", "lk-grid", o.parent); g.style.opacity = o.a ?? .5;
    tl.fromTo(g, { x: 0, y: 0 }, { x: -u * 8, y: -u * 4, duration: Math.max(D, 1), ease: "none", immediateRender: true }, 0); return g; }

  /* camera moves on the inner image (a = amount) */
  const MOVES = {
    push: (a) => [{ scale: 1 }, { scale: 1 + .18 * a }], pull: (a) => [{ scale: 1 + .22 * a }, { scale: 1 }],
    panL: (a) => [{ xPercent: 5 * a, scale: 1.04 }, { xPercent: -5 * a, scale: 1.04 }], panR: (a) => [{ xPercent: -5 * a, scale: 1.04 }, { xPercent: 5 * a, scale: 1.04 }],
    rise: (a) => [{ yPercent: 5 * a, scale: 1.06 }, { yPercent: -5 * a, scale: 1.06 }], sink: (a) => [{ yPercent: -5 * a, scale: 1.06 }, { yPercent: 5 * a, scale: 1.06 }],
    orbit: (a) => [{ rotation: -2.5 * a, scale: 1.14, xPercent: -3 * a }, { rotation: 2.5 * a, scale: 1.06, xPercent: 3 * a }],
    crash: (a) => [{ scale: 1 + .55 * a }, { scale: 1.02 }], still: () => [{ scale: 1 }, { scale: 1 }],
  };
  /* one picture. o: t, d (move length), mv, a, in (entrance), box [x,y,w,h], fx/fy focus, framed (corner ticks), fit (contain), until */
  function shot(k, o = {}) {
    const t = o.t ?? 0, d = o.d ?? 3.2, b = o.box || [0, 0, W, H];
    const e = place(mk("div", "lk-shot" + (o.framed ? " framed" : "") + (o.fit ? " fit" : ""), o.parent), ...b), im = mk("div", "im", e);
    if (!o.fit && !o.clean) mk("div", "sh", e);
    const s = src(k); if (s) im.style.backgroundImage = `url("${s}")`; else mk("div", "miss", e, "IMAGE " + k);
    if (o.fit) e.style.background = "transparent";
    im.style.transformOrigin = `${(o.fx ?? .5) * 100}% ${(o.fy ?? .5) * 100}%`;
    if (o.fx != null || o.fy != null) im.style.backgroundPosition = `${(o.fx ?? .5) * 100}% ${(o.fy ?? .5) * 100}%`;
    if (o.clip) e.style.clipPath = o.clip;
    tl.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    const [fr, to] = MOVES[o.mv || "push"](o.a ?? 1);
    tl.fromTo(im, fr, { ...to, duration: d + .6, ease: o.mv === "crash" ? E.in : "none", immediateRender: true }, t);
    enter(e, t, o.in || "cut", o);
    if (o.framed) e.ticks = ticks(b, t + .3, o);
    if (o.until) out(e, o.until, .3);
    e.im = im; return e;
  }
  function ticks(b, t, o = {}) { const [x, y, w, h] = b, s = u * 2.4, g = u * 1.2, L = mk("div", "lk-fx", o.parent);
    [[x - g, y - g, "Top", "Left"], [x + w + g - s, y - g, "Top", "Right"], [x - g, y + h + g - s, "Bottom", "Left"], [x + w + g - s, y + h + g - s, "Bottom", "Right"]].forEach(([px, py, a, c]) => {
      const e = place(mk("div", "lk-tick", L), px, py); e.style["border" + a + "Width"] = u * .35 + "px"; e.style["border" + c + "Width"] = u * .35 + "px"; e.style.borderColor = o.tc || K.coral; });
    tl.fromTo(L.children, { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: .4, ease: E.snap, stagger: .05, immediateRender: true }, t);
    if (o.until) out(L, o.until, .3); return L; }
  function enter(e, t, how, o = {}) {
    const fx = (o.fx ?? .5) * 100, fy = (o.fy ?? .5) * 100, base = o.clip || "inset(0% 0% 0% 0%)";
    if (how === "flash") flash(t, .3);
    else if (how === "line") { tl.fromTo(e, { clipPath: "inset(49.6% 0% 49.6% 0%)" }, { clipPath: base, duration: .65, ease: E.io, immediateRender: true }, t); scan(t, .65); }
    else if (how === "whip") tl.fromTo(e, { xPercent: o.dir === -1 ? -100 : 100, filter: "blur(24px)" }, { xPercent: 0, filter: "blur(0px)", duration: .45, ease: E.snap, immediateRender: true }, t);
    else if (how === "iris") tl.fromTo(e, { clipPath: `circle(0% at ${fx}% ${fy}%)` }, { clipPath: `circle(150% at ${fx}% ${fy}%)`, duration: .9, ease: E.io, immediateRender: true }, t);
    else if (how === "wipe") tl.fromTo(e, { clipPath: o.dir === -1 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" }, { clipPath: base, duration: .7, ease: E.io, immediateRender: true }, t);
    else if (how === "zoom") tl.fromTo(e, { scale: 1.4, opacity: 0, filter: "blur(16px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: .7, ease: E.in, immediateRender: true }, t);
    else if (how === "rise") tl.fromTo(e, { yPercent: 110 }, { yPercent: 0, duration: .7, ease: E.snap, immediateRender: true }, t);
    else if (how === "drop") tl.fromTo(e, { yPercent: -110 }, { yPercent: 0, duration: .7, ease: E.snap, immediateRender: true }, t);
    else if (how === "slideL") tl.fromTo(e, { x: -W * .6, opacity: 0 }, { x: 0, opacity: 1, duration: .7, ease: E.snap, immediateRender: true }, t);
    else if (how === "slideR") tl.fromTo(e, { x: W * .6, opacity: 0 }, { x: 0, opacity: 1, duration: .7, ease: E.snap, immediateRender: true }, t);
    else if (how === "fade") tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: .6, ease: E.soft, immediateRender: true }, t);
  }
  /* move a placed element to a new box (layout morph) */
  const morph = (e, t, b, d = .8) => tl.to(e, { left: b[0], top: b[1], width: b[2], height: b[3], duration: d, ease: E.io }, t);

  /* serif headline: words rise from masks; <em>word</em> = italic accent (o.c); o.size in u */
  function head(html, t, o = {}) {
    const e = mk("div", "lk-h", o.parent, html.split(" ").map((w) => `<span class="w"><i>${w}</i></span>`).join(""));
    pos(e, o, W * (V ? .07 : .06), H * (V ? .14 : .62)); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.c) e.style.setProperty("--c", o.c);
    tl.fromTo(e.querySelectorAll(".w > i"), { yPercent: 115 }, { yPercent: 0, duration: .65, ease: E.in, stagger: .07, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e;
  }
  function te(html, t, o = {}) { const e = mk("div", "lk-te", o.parent, html); pos(e, o, W * (V ? .07 : .06), H * (V ? .3 : .8)); if (o.c) e.style.setProperty("--c", o.c);
    if (o.size) e.style.fontSize = u * o.size + "px";
    tl.fromTo(e, { opacity: 0, y: u * 1.6, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: .5, ease: E.in, immediateRender: true }, t); if (o.until) out(e, o.until); return e; }
  /* mono kicker: typed in letter by letter */
  function mono(text, t, o = {}) { const e = mk("div", "lk-mono", o.parent, ""); pos(e, o, W * (V ? .07 : .06), H * (V ? .1 : .55)); if (o.c) e.style.setProperty("--c", o.c);
    if (o.size) e.style.fontSize = u * o.size + "px";
    const v = { n: 0 }, txt = "■ " + text;
    tl.fromTo(v, { n: 0 }, { n: txt.length, duration: Math.min(.03 * txt.length, .7), ease: "none", immediateRender: true, onUpdate: () => { e.textContent = txt.slice(0, Math.round(v.n)); } }, t);
    if (o.until) out(e, o.until); return e; }
  /* counter in mono; fmt formats the value; pre / unit around it */
  function num(from, to, t, o = {}) {
    const e = mk("div", "lk-num", o.parent); pos(e, o, W * .06, H * .3); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.c) e.style.setProperty("--c", o.c);
    if (o.col) e.style.color = o.col;
    const f = o.fmt || ((v) => Math.round(v)), pre = o.pre || "", sm = o.unit ? `<small>${o.unit}</small>` : "", v = { v: from }; e.innerHTML = pre + f(from) + sm;
    tl.fromTo(e, { opacity: 0, y: u * 3 }, { opacity: 1, y: 0, duration: .35, ease: E.snap, immediateRender: true }, t);
    tl.fromTo(v, { v: from }, { v: to, duration: o.d ?? 1.3, ease: "power3.out", immediateRender: true, onUpdate: () => { e.innerHTML = pre + f(v.v) + sm; } }, t);
    if (o.until) out(e, o.until); return e;
  }
  /* ticker tape band: items [[text, +1|-1|0], ...] scrolling left from t */
  function tape(items, t, o = {}) { const b = mk("div", "lk-tape", o.parent); b.style.top = (o.y ?? H - u * (V ? 5 : 4.4)) + "px";
    const row = mk("div", "row", b), one = items.map(([s, d]) => `<span class="${d > 0 ? "up" : d < 0 ? "dn" : ""}">${s}${d > 0 ? " ▲" : d < 0 ? " ▼" : ""}</span>`).join("");
    row.innerHTML = one + one + one + one;
    tl.fromTo(b, { scaleX: 0, rotation: o.rot || 0 }, { scaleX: 1, rotation: o.rot || 0, duration: .5, ease: E.io, immediateRender: true }, t);
    tl.fromTo(row, { x: 0 }, { x: -W * (o.speed ?? .9), duration: Math.max(D - t, 1), ease: "none", immediateRender: true }, t);
    if (o.until) out(b, o.until); return b; }
  /* line chart drawn left to right: pts [[x0..1, y0..1], ...] inside box; area glow under it; end dot */
  let cid = 0;
  function chart(pts, t, o = {}) { const [x, y, w, h] = o.box || [W * .08, H * .2, W * .84, H * .6], c = o.c || K.green, L = place(mk("div", "lk-fx", o.parent), 0, 0, W, H), id = "lkc" + (cid++);
    const P2 = pts.map(([a, b]) => [x + a * w, y + (1 - b) * h]), d = "M" + P2.map((p) => p.join(" ")).join(" L");
    L.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"><defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>
      <clipPath id="c${id}"><rect x="${x}" y="${y - h}" width="0" height="${h * 3}"/></clipPath></defs>
      <path d="${d} L${P2.at(-1)[0]} ${y + h} L${P2[0][0]} ${y + h} Z" fill="url(#g${id})" clip-path="url(#c${id})"/>
      <path class="ln" d="${d}" stroke="${c}" stroke-width="${u * .45}" fill="none" stroke-linejoin="round" style="filter:drop-shadow(0 0 ${u}px ${c})"/></svg>`;
    const ln = L.querySelector(".ln"), len = ln.getTotalLength(), rc = L.querySelector("rect"); ln.style.strokeDasharray = len;
    const dd = o.d ?? 1.6;
    tl.fromTo(ln, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: dd, ease: E.io, immediateRender: true }, t);
    tl.fromTo(rc, { attr: { width: 0 } }, { attr: { width: w + 2 }, duration: dd, ease: E.io, immediateRender: true }, t);
    const p = P2.at(-1), dot = place(mk("div", "lk-dot", L), p[0] - u, p[1] - u, u * 2, u * 2); dot.style.setProperty("--c", c);
    tl.fromTo(dot, { scale: 0 }, { scale: 1, duration: .3, ease: E.pop, immediateRender: true }, t + dd - .1);
    ring(p[0], p[1], t + dd, { c, parent: L });
    if (o.until) out(L, o.until); L.pts = P2; return L; }
  /* vertical bars: vals (0..1), labels; grow in a stagger from the baseline */
  function bars(vals, labels, t, o = {}) { const [x, y, w, h] = o.box || [W * .1, H * .2, W * .8, H * .6], n = vals.length, bw = w / n * .56, L = place(mk("div", "lk-fx", o.parent), 0, 0, W, H);
    const cs = o.cs || vals.map(() => o.c || K.coral), st = o.stag ?? .25;
    L.bars = vals.map((v, i) => { const bx = x + (i + .5) * w / n - bw / 2, b = place(mk("div", "", L), bx, y + h * (1 - v), bw, h * v);
      b.style.position = "absolute"; b.style.background = `linear-gradient(0deg, ${cs[i]}, ${cs[i]}88)`; b.style.transformOrigin = "50% 100%"; b.style.boxShadow = `0 0 ${u * 3}px ${cs[i]}55`;
      tl.fromTo(b, { scaleY: 0 }, { scaleY: 1, duration: .8, ease: E.snap, immediateRender: true }, t + i * st);
      if (labels[i]) { const l = place(mk("div", "lk-mono", L, labels[i]), bx - bw, y + h + u * 1.5, bw * 3); l.style.textAlign = "center"; l.style.setProperty("--c", K.mute);
        tl.fromTo(l, { opacity: 0 }, { opacity: 1, duration: .4, immediateRender: true }, t + i * st); }
      return b; });
    if (o.until) out(L, o.until); return L; }
  /* price bracket: a horizontal range lo..hi with a marker sliding to the top */
  function bracket(lo, hi, t, o = {}) { const [x, y, w] = o.box || [W * .12, H * .55, W * .76], c = o.c || K.gold, L = place(mk("div", "lk-fx", o.parent), 0, 0, W, H);
    const bar = place(mk("div", "", L), x, y, w, u * .6); bar.style.position = "absolute"; bar.style.background = `linear-gradient(90deg, ${K.ink}55, ${c})`; bar.style.transformOrigin = "0 50%";
    tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: .8, ease: E.io, immediateRender: true }, t);
    [[x, lo], [x + w, hi]].forEach(([px, s], i) => { const tk = place(mk("div", "", L), px - 1, y - u * 2, 3, u * 4.6); tk.style.position = "absolute"; tk.style.background = K.ink;
      const lb = place(mk("div", "lk-num", L, s), px, y + u * 3.5); lb.style.fontSize = u * (V ? 8 : 6) + "px"; lb.style.transform = "translateX(-50%)"; if (i) lb.style.color = c;
      tl.fromTo([tk, lb], { opacity: 0 }, { opacity: 1, duration: .4, ease: E.snap, immediateRender: true }, t + .3 + i * .5); });
    const m = place(mk("div", "lk-dot", L), x - u * 1.3, y - u * 1, u * 2.6, u * 2.6); m.style.setProperty("--c", c);
    tl.fromTo(m, { x: 0, opacity: 0 }, { x: w, opacity: 1, duration: 1.4, ease: E.io, immediateRender: true }, t + .5);
    if (o.until) out(L, o.until); return L; }
  /* company chip (typeset wordmark); returns element */
  function chip(text, x, y, t, o = {}) { const e = place(mk("div", "lk-chip", o.parent, text), x, y); if (o.c) e.style.setProperty("--c", o.c); if (o.w) e.style.width = o.w + "px"; if (o.size) e.style.fontSize = u * o.size + "px";
    tl.fromTo(e, { opacity: 0, y: u * 3, scale: .9 }, { opacity: 1, y: 0, scale: 1, duration: .45, ease: E.pop, immediateRender: true }, t); if (o.until) out(e, o.until); return e; }
  /* logo image (svg / png key) in a box */
  const logo = (k, b, t, o = {}) => shot(k, { t, box: b, fit: true, mv: "still", in: o.in || "fade", until: o.until, parent: o.parent });
  /* prospectus pages fanning in; rows of grey lines, some red (risks) */
  function pages(n, b, t, o = {}) { const [x, y, w, h] = b, L = place(mk("div", "lk-fx", o.parent), 0, 0, W, H);
    L.pages = [...Array(n)].map((_, i) => { const p = place(mk("div", "lk-page", L), x, y, w, h);
      for (let r = 0; r < 14; r++) { const l = mk("i", (o.red && (r * 7 + i) % 5 === 0) ? "r" : "", p); l.style.top = (10 + r * 6) + "%"; l.style.width = (50 + (r * 37 + i * 11) % 30) + "%"; }
      tl.fromTo(p, { opacity: 0, y: H * .5, x: 0, rotation: 0 }, { opacity: 1, y: 0, rotation: (i - (n - 1) / 2) * 5, x: (i - (n - 1) / 2) * w * .18, duration: .7, ease: E.snap, immediateRender: true }, t + i * .12);
      return p; });
    if (o.until) out(L, o.until); return L; }
  function ring(x, y, t, o = {}) { const r = o.r || u * 6, n = o.n || 2;
    for (let i = 0; i < n; i++) { const e = place(mk("div", "lk-ring", o.parent), x - r, y - r, r * 2, r * 2); e.style.setProperty("--c", o.c || K.coral); gsap.set(e, { opacity: 0 });
      tl.fromTo(e, { scale: .1, opacity: .9 }, { scale: 1, opacity: 0, duration: o.d || 1.3, ease: "power1.out", immediateRender: false }, t + i * .3); } }
  const flash = (t, d = .3) => { const f = mk("div", "lk-flash", $("root")); tl.set(f, { opacity: 0 }, 0); tl.fromTo(f, { opacity: .8 }, { opacity: 0, duration: d, ease: "power2.out", immediateRender: false }, t); };
  const scan = (t, d = .6) => { const s = mk("div", "lk-scan", $("root")); s.style.top = H / 2 + "px"; tl.set(s, { opacity: 0 }, 0);
    tl.fromTo(s, { opacity: 1, scaleX: 0 }, { scaleX: 1, duration: d * .5, ease: E.io, immediateRender: false }, t); tl.to(s, { opacity: 0, duration: d * .5 }, t + d * .5); };
  /* whole-stage camera move */
  const cam = (t, d, to) => tl.to($("stage"), { duration: d, ease: E.io, ...to }, t);
  /* dim layer (for text over a picture) */
  function dim(t, until, a = .6, o = {}) { const e = place(mk("div", "lk-fx", o.parent), 0, 0, W, H); e.style.background = o.bg || "linear-gradient(90deg, #07090f, #07090f00 75%)";
    tl.fromTo(e, { opacity: 0 }, { opacity: a, duration: .4, immediateRender: true }, t); if (until) out(e, until); return e; }
  /* rubber stamp: bordered mono word punched in at an angle */
  function stamp(text, x, y, t, o = {}) { const c = o.c || K.red, e = place(mk("div", "", o.parent, text), x, y);
    Object.assign(e.style, { position: "absolute", font: `700 ${u * (o.size ?? 5)}px ${MONO}`, letterSpacing: ".12em", color: c, border: `${u * .5}px solid ${c}`,
      padding: `${u * .4}px ${u * 1.6}px`, whiteSpace: "nowrap", background: "#07090f99", zIndex: 20 });
    tl.fromTo(e, { xPercent: -50, yPercent: -50, scale: 2.6, rotation: 0, opacity: 0 }, { xPercent: -50, yPercent: -50, scale: 1, rotation: o.rot ?? -8, opacity: 1, duration: .35, ease: E.snap, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  /* drawn arrow from (x1,y1) to (x2,y2) */
  function arrow(x1, y1, x2, y2, t, o = {}) { const c = o.c || K.coral, L = place(mk("div", "lk-fx", o.parent), 0, 0, W, H), a = Math.atan2(y2 - y1, x2 - x1), s = u * 2;
    const hx = (k) => `${x2 - s * Math.cos(a + k)} ${y2 - s * Math.sin(a + k)}`;
    L.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"><path class="ln" d="M${x1} ${y1} L${x2} ${y2}" stroke="${c}" stroke-width="${u * .4}" fill="none"/>
      <path class="hd" d="M${hx(.5)} L${x2} ${y2} L${hx(-.5)}" stroke="${c}" stroke-width="${u * .4}" fill="none"/></svg>`;
    const ln = L.querySelector(".ln"), len = Math.hypot(x2 - x1, y2 - y1); ln.style.strokeDasharray = len;
    tl.fromTo(ln, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: o.d ?? .6, ease: E.io, immediateRender: true }, t);
    tl.fromTo(L.querySelector(".hd"), { opacity: 0 }, { opacity: 1, duration: .2, immediateRender: true }, t + (o.d ?? .6) - .1);
    if (o.until) out(L, o.until); return L; }
  /* big static mono word (ANT, dates) that punches in */
  function big(text, t, o = {}) { const e = mk("div", "lk-num", o.parent, text); pos(e, o, W * .06, H * .3); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.col) e.style.color = o.col;
    tl.fromTo(e, { opacity: 0, scale: 1.25, filter: "blur(10px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: .5, ease: E.snap, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e; }
  window.LK = { S, P, W, H, D, V, u, K, tl, E, at, $, mk, place, ix, src, out, grid, shot, ticks, enter, morph, head, te, mono, num, tape, chart, bars, bracket, chip, logo, pages,
                ring, flash, scan, cam, dim, stamp, arrow, big, done: () => finish(tl) };
})();
