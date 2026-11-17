/* atlas_kit (13_Aging_150): "cell atlas" light science documentary, written fresh for this video
   (brief 2026-11-16: light, image-led, many big photos, varied sizes, 2D/3D motion, no empty frames).
   Pale sage paper like a natural-history plate; photos full bleed / split / white plates with FIG. captions;
   DM Serif Display headlines (vermilion italic accents), Jost caps kickers with hairline rulers, Telugu lines.
   Graphics (3D book, helix, paths, rulers, rings, dots, lens, switches) live in at2.js.
   vermilion = time / aging, green = youth / repair, violet = AI. Scene code: const {...} = AT; build; AT.done(). */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, V = H > W, u = Math.min(W, H) / 100;
  const C = S.colors || {};
  const K = { bg: C.background || "#E9EDE3", ink: C.text || "#13241D", mute: C.text2 || "#56655C", red: C.primary || "#F0532D",
              green: C.secondary || "#1F8F64", vio: C.accent || "#5B4BD6", warn: C.warning || "#D7263D", card: "#FAFBF6", gold: "#D9A441", white: "#FFFFFF" };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "expo.out", snap: "power4.out", io: "power3.inOut", soft: "sine.inOut", out: "power2.in", pop: "back.out(1.6)" };
  const IMG = S.images || [], B = P.beats || {};
  const SANS = "'Jost', sans-serif";
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; background: ${K.bg}; }
  #stage { position: absolute; inset: 0; overflow: hidden; transform-origin: 50% 50%; }
  .at-paper { position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 20%, #F4F6EF, ${K.bg} 60%, #DDE4D6); }
  .at-blob { position: absolute; border-radius: 50%; filter: blur(${u * 6}px); }
  .at-rule { position: absolute; background: ${K.ink}; opacity: .22; }
  .at-shot { position: absolute; overflow: hidden; background: #cfd6c8; }
  .at-shot .im { position: absolute; inset: -8%; background: #cfd6c8 no-repeat center / cover; will-change: transform; }
  .at-shot.fit { background: transparent; } .at-shot.fit .im { inset: 0; background-size: contain; background-color: transparent; }
  .at-shot .miss { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: ${K.mute};
    font: 600 ${u * 2.4}px ${SANS}; letter-spacing: .3em; background: repeating-linear-gradient(45deg, #dfe5d8 0 ${u * 2}px, #d5dccd ${u * 2}px ${u * 4}px); }
  .at-shot .sh { position: absolute; inset: 0; pointer-events: none; }
  .at-plate { position: absolute; background: ${K.card}; box-shadow: 0 ${u * 1.4}px ${u * 5}px #13241d40; }
  .at-slat { position: absolute; background: ${K.bg}; transform-origin: 50% 0%; }
  .at-fx { position: absolute; inset: 0; pointer-events: none; }
  .at-h { position: absolute; font: 400 ${u * (V ? 10 : 8.4)}px var(--font-head); line-height: 1.02; letter-spacing: -.01em; color: var(--col, ${K.ink}); white-space: nowrap; }
  .at-h .w { display: inline-block; overflow: hidden; vertical-align: top; padding: 0 .1em .14em .02em; margin-right: .06em; }
  .at-h .w > i { display: inline-block; font-style: normal; }
  .at-h em { font-style: italic; color: var(--c, ${K.red}); }
  .at-k { position: absolute; font: 600 ${u * (V ? 2.9 : 2)}px ${SANS}; letter-spacing: .26em; text-transform: uppercase; color: var(--c, ${K.red}); white-space: nowrap; font-size: ${u * (V ? 3 : 2.3)}px; }
  .at-k .ln { display: inline-block; width: ${u * 5}px; height: 2px; background: currentColor; vertical-align: middle; margin-right: ${u * 1.2}px; transform-origin: 0 50%; }
  .at-t { position: absolute; font: 400 ${u * (V ? 5 : 3.8)}px var(--font); color: var(--col, ${K.ink}); line-height: 1.3; white-space: nowrap; }
  .at-t b { color: var(--c, ${K.red}); font-weight: 400; }
  .at-n { position: absolute; font: 400 ${u * 16}px var(--font-head); line-height: .9; color: var(--col, ${K.ink}); white-space: nowrap; letter-spacing: -.02em; }
  .at-n small { font: 600 .2em ${SANS}; letter-spacing: .2em; color: var(--c, ${K.red}); margin-left: .35em; vertical-align: .9em; }
  .at-card { position: absolute; background: ${K.card}; box-shadow: 0 ${u}px ${u * 4}px #13241d33; border-left: ${u * .7}px solid var(--c, ${K.red}); padding: ${u * 1.6}px ${u * 2.4}px; white-space: nowrap; }
  .at-card .nm { font: 400 ${u * (V ? 6.2 : 4.6)}px var(--font-head); color: ${K.ink}; line-height: 1.05; }
  .at-card .rl { font: 600 ${u * (V ? 2.5 : 1.75)}px ${SANS}; letter-spacing: .22em; text-transform: uppercase; color: var(--c, ${K.red}); margin-top: ${u * .8}px; }
  .at-chip { position: absolute; padding: ${u * .9}px ${u * 2.2}px; border-radius: ${u * 5}px; font: 600 ${u * (V ? 3 : 2.1)}px ${SANS}; letter-spacing: .08em;
    color: ${K.white}; background: var(--c, ${K.ink}); white-space: nowrap; box-shadow: 0 ${u * .5}px ${u * 2}px #13241d33; }
  .at-flash { position: absolute; inset: 0; background: #fff; opacity: 0; z-index: 40; pointer-events: none; }
  .at-dot { position: absolute; border-radius: 50%; background: var(--c, ${K.red}); }
  .at-ring { position: absolute; border-radius: 50%; border: ${u * .35}px solid var(--c, ${K.red}); }`;
  document.head.append(css);

  const $ = (id) => document.getElementById(id);
  const at = (k, d = 0) => (B[k] ?? d);
  function stage() { let s = $("stage"); if (!s) { s = document.createElement("div"); s.id = "stage"; $("root").append(s); } return s; }
  const mk = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; (parent || stage()).append(e); return e; };
  const place = (e, x, y, w, h) => { Object.assign(e.style, { left: x + "px", top: y + "px" }); if (w != null) e.style.width = w + "px"; if (h != null) e.style.height = h + "px"; return e; };
  const src = (k) => { const i = (P.names || []).indexOf(k); return i >= 0 ? IMG[i] : null; };
  const out = (e, t, d = .4, to = {}) => tl.to(e, { autoAlpha: 0, duration: d, ease: E.out, ...to }, t);
  const pos = (e, o, dx, dy) => { place(e, o.x ?? dx, o.y ?? dy);
    if (o.align === "center") { e.style.left = "0"; e.style.width = W + "px"; e.style.textAlign = "center"; }
    if (o.align === "right") { e.style.left = "auto"; e.style.right = (o.r ?? W * .06) + "px"; e.style.textAlign = "right"; } };
  const ff = (e, t, from, to, d = .6, ease = E.in) => tl.fromTo(e, from, { ...to, duration: d, ease, immediateRender: true }, t);

  /* paper plate: soft gradient, drifting colour blobs (depth), hairline frame + edge ruler ticks */
  function paper(o = {}) { const L = mk("div", "at-fx", o.parent); mk("div", "at-paper", L);
    [[.15, .2, K.green], [.85, .75, K.red], [.7, .15, K.vio]].forEach(([x, y, c], i) => { const b = place(mk("div", "at-blob", L), W * x - u * 18, H * y - u * 18, u * 36, u * 36);
      b.style.background = c; b.style.opacity = o.blob ?? .16;
      tl.fromTo(b, { x: 0, y: 0 }, { x: (i - 1) * u * 8, y: (1 - i) * u * 5, duration: Math.max(D, 1), ease: "none", immediateRender: true }, 0); });
    const m = u * 2.4; [[m, m, W - 2 * m, 1], [m, H - m, W - 2 * m, 1]].forEach((b) => place(mk("div", "at-rule", L), ...b));
    for (let i = 0; i <= 40; i++) { const r = place(mk("div", "at-rule", L), m, m + (H - 2 * m) * i / 40, i % 5 ? u * .6 : u * 1.4, 1); r.style.opacity = .18; }
    return L; }

  const MOVES = {
    push: (a) => [{ scale: 1 }, { scale: 1 + .16 * a }], pull: (a) => [{ scale: 1 + .2 * a }, { scale: 1 }],
    panL: (a) => [{ xPercent: 5 * a, scale: 1.05 }, { xPercent: -5 * a, scale: 1.05 }], panR: (a) => [{ xPercent: -5 * a, scale: 1.05 }, { xPercent: 5 * a, scale: 1.05 }],
    rise: (a) => [{ yPercent: 5 * a, scale: 1.06 }, { yPercent: -5 * a, scale: 1.06 }], sink: (a) => [{ yPercent: -5 * a, scale: 1.06 }, { yPercent: 5 * a, scale: 1.06 }],
    drift: (a) => [{ xPercent: -3 * a, yPercent: 2 * a, scale: 1.08 }, { xPercent: 3 * a, yPercent: -2 * a, scale: 1.12 }],
    orbit: (a) => [{ rotation: -2 * a, scale: 1.14, xPercent: -3 * a }, { rotation: 2 * a, scale: 1.06, xPercent: 3 * a }], still: () => [{ scale: 1 }, { scale: 1 }],
  };
  /* one picture. o: t, d, mv, a, in, dir, box [x,y,w,h], fx/fy focus, plate (white border), fig (caption under plate), shade, fit, until, r, rot */
  function photo(k, o = {}) {
    const t = o.t ?? 0, d = o.d ?? Math.max(D - t, 2), b = o.box || [0, 0, W, H], par = o.parent, pd = u * (V ? 1.6 : 1.1);
    let host = par, pl = null;
    if (o.plate) { pl = place(mk("div", "at-plate", par), b[0] - pd, b[1] - pd, b[2] + 2 * pd, b[3] + 2 * pd + (o.fig ? u * (V ? 5 : 3.6) : 0));
      if (o.fig) { const f = place(mk("div", "at-k", pl, o.fig), pd, b[3] + pd * 1.6); f.style.fontSize = u * (V ? 2.3 : 1.45) + "px"; f.style.setProperty("--c", o.fc || K.mute); }
      host = pl; }
    const e = place(mk("div", "at-shot" + (o.fit ? " fit" : ""), host), ...(pl ? [pd, pd, b[2], b[3]] : b)), im = mk("div", "im", e);
    if (o.r) e.style.borderRadius = o.r + "px";
    const s = src(k); if (s) im.style.backgroundImage = `url("${s}")`; else mk("div", "miss", e, "IMAGE " + k);
    if (o.shade) { const sh = mk("div", "sh", e); sh.style.background = o.shade === "left" ? "linear-gradient(90deg, #0b1611d0, #0b161100 60%)" : o.shade === "paper" ?
      `linear-gradient(90deg, ${K.bg} 8%, ${K.bg}00 55%)` : o.shade === "top" ? "linear-gradient(180deg, #0b1611c0, #0b161100 50%)" : "linear-gradient(0deg, #0b1611d0, #0b161100 55%)"; }
    im.style.transformOrigin = `${(o.fx ?? .5) * 100}% ${(o.fy ?? .5) * 100}%`;
    if (o.fx != null || o.fy != null) im.style.backgroundPosition = `${(o.fx ?? .5) * 100}% ${(o.fy ?? .5) * 100}%`;
    const box = pl || e;
    if (o.rot) gsap.set(box, { rotation: o.rot });
    if (o.blend) box.style.mixBlendMode = "multiply";
    tl.fromTo(box, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    const [fr, to] = MOVES[o.mv || "push"](o.a ?? 1);
    tl.fromTo(im, fr, { ...to, duration: d + .6, ease: "none", immediateRender: true }, t);
    enter(box, t, o.in || "cut", o);
    if (o.until) out(box, o.until, .35);
    box.im = im; box.shot = e; return box;
  }
  function enter(e, t, how, o = {}) {
    const fx = (o.fx ?? .5) * 100, fy = (o.fy ?? .5) * 100, dir = o.dir || 1, R = o.rot || 0;
    if (how === "fade") ff(e, t, { opacity: 0 }, { opacity: 1 }, .7, E.soft);
    else if (how === "iris") ff(e, t, { clipPath: `circle(0% at ${fx}% ${fy}%)` }, { clipPath: `circle(150% at ${fx}% ${fy}%)` }, .9, E.io);
    else if (how === "wipe") ff(e, t, { clipPath: dir < 0 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }, .8, E.io);
    else if (how === "rise") ff(e, t, { clipPath: "inset(100% 0% 0% 0%)", y: u * 4 }, { clipPath: "inset(0% 0% 0% 0%)", y: 0 }, .8, E.io);
    else if (how === "split") ff(e, t, { clipPath: "inset(0% 50% 0% 50%)" }, { clipPath: "inset(0% 0% 0% 0%)" }, .8, E.io);
    else if (how === "zoom") ff(e, t, { scale: 1.25, opacity: 0, filter: "blur(14px)" }, { scale: 1, opacity: 1, filter: "blur(0px)" }, .8);
    else if (how === "slide") ff(e, t, { x: dir * W * .5, opacity: 0, rotation: R }, { x: 0, opacity: 1, rotation: R }, .8, E.snap);
    else if (how === "drop") ff(e, t, { y: -H * .6, rotation: R - 8 * dir, opacity: 0 }, { y: 0, rotation: R, opacity: 1 }, .9, E.snap);
    else if (how === "page") { e.style.transformOrigin = dir < 0 ? "100% 50%" : "0% 50%";
      ff(e, t, { transformPerspective: u * 180, rotationY: dir * -100, opacity: 0 }, { transformPerspective: u * 180, rotationY: 0, opacity: 1 }, 1, E.io); }
    else if (how === "blinds") { const L = mk("div", "at-fx", e); L.style.zIndex = 5;
      for (let i = 0; i < 7; i++) { const s = mk("div", "at-slat", L); Object.assign(s.style, { left: 0, width: "100%", top: (i * 100 / 7) + "%", height: (100 / 7 + .5) + "%" });
        tl.fromTo(s, { scaleY: 1 }, { scaleY: 0, duration: .55, ease: E.io, immediateRender: true }, t + i * .05); } }
    else if (how === "flash") flash(t, .35);
  }
  const morph = (e, t, b, d = .9) => tl.to(e, { left: b[0], top: b[1], width: b[2], height: b[3], duration: d, ease: E.io }, t);
  /* paper-coloured (default) or dark wash for text over a photo */
  function wash(t, until, o = {}) { const e = place(mk("div", "at-fx", o.parent), 0, 0, W, H);
    e.style.background = o.bg || (o.dark ? "linear-gradient(90deg, #0b1611e0, #0b161100 70%)" : `linear-gradient(90deg, ${K.bg}f2 25%, ${K.bg}00 70%)`);
    ff(e, t, { opacity: 0 }, { opacity: o.a ?? 1 }, .5, E.soft); if (until) out(e, until); return e; }
  /* solid paper panel sliding in (split screens); side L|R|T|B */
  function panel(b, t, o = {}) { const e = place(mk("div", "at-fx", o.parent), ...b); e.style.background = o.c || K.card; e.style.boxShadow = `0 0 ${u * 5}px #13241d33`;
    const f = { L: { xPercent: -105 }, R: { xPercent: 105 }, T: { yPercent: -105 }, B: { yPercent: 105 } }[o.side || "L"];
    ff(e, t, f, { xPercent: 0, yPercent: 0 }, .8, E.io); if (o.until) out(e, o.until); return e; }

  /* serif headline, words rise out of masks; <em> = italic accent; o.col text colour, o.c accent, o.size (u) */
  function head(html, t, o = {}) {
    let em = false;  /* <em> may span words; <br> breaks lines */
    const words = (ln) => ln.split(" ").filter(Boolean).map((w) => { if (w.includes("<em>")) em = true; const c = w.replace(/<\/?em>/g, ""), s = em ? `<em>${c}</em>` : c;
      if (w.includes("</em>")) em = false; return `<span class="w"><i>${s}</i></span>`; }).join("");
    const e = mk("div", "at-h", o.parent, html.split(/<br\s*\/?>/).map(words).join("<br>"));
    pos(e, o, W * (V ? .07 : .06), H * (V ? .12 : .6)); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.c) e.style.setProperty("--c", o.c); if (o.col) e.style.setProperty("--col", o.col);
    if (o.shadow) e.style.textShadow = `0 ${u * .3}px ${u * 2.5}px #000a`;
    ff(e.querySelectorAll(".w > i"), t, { yPercent: 115, filter: "blur(6px)" }, { yPercent: 0, filter: "blur(0px)", stagger: .07 }, .7);
    if (o.until) out(e, o.until); return e; }
  /* caps kicker with a drawn hairline before it */
  function kick(text, t, o = {}) { const e = mk("div", "at-k", o.parent, `<span class="ln"></span>${text}`); pos(e, o, W * (V ? .07 : .06), H * (V ? .08 : .52));
    if (o.c) e.style.setProperty("--c", o.c); if (o.size) e.style.fontSize = u * o.size + "px"; if (o.shadow) e.style.textShadow = `0 0 ${u * 2}px #000`;
    ff(e.querySelector(".ln"), t, { scaleX: 0 }, { scaleX: 1 }, .5, E.io); ff(e, t, { opacity: 0, letterSpacing: ".5em" }, { opacity: 1, letterSpacing: ".26em" }, .7);
    if (o.until) out(e, o.until); return e; }
  /* Telugu / body line; <b> = accent */
  function tel(html, t, o = {}) { const e = mk("div", "at-t", o.parent, html); pos(e, o, W * (V ? .07 : .06), H * (V ? .3 : .75));
    if (o.c) e.style.setProperty("--c", o.c); if (o.col) e.style.setProperty("--col", o.col); if (o.size) e.style.fontSize = u * o.size + "px";
    if (o.shadow) e.style.textShadow = `0 ${u * .3}px ${u * 2}px #000c`;
    ff(e, t, { opacity: 0, y: u * 1.6, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)" }, .55); if (o.until) out(e, o.until); return e; }
  /* serif counter; fmt formats; pre / unit */
  function count(from, to, t, o = {}) { const e = mk("div", "at-n", o.parent); pos(e, o, W * .06, H * .3); if (o.size) e.style.fontSize = u * o.size + "px";
    if (o.c) e.style.setProperty("--c", o.c); if (o.col) e.style.setProperty("--col", o.col); if (o.shadow) e.style.textShadow = `0 ${u * .3}px ${u * 3}px #0009`;
    const f = o.fmt || ((v) => Math.round(v)), pre = o.pre || "", sm = o.unit ? `<small>${o.unit}</small>` : "", v = { v: from }; e.innerHTML = pre + f(from) + sm;
    ff(e, t, { opacity: 0, y: u * 3 }, { opacity: 1, y: 0 }, .4, E.snap);
    tl.fromTo(v, { v: from }, { v: to, duration: o.d ?? 1.3, ease: "power3.out", immediateRender: true, onUpdate: () => { e.innerHTML = pre + f(v.v) + sm; } }, t);
    if (o.until) out(e, o.until); return e; }
  /* name card (people without a free photo): name + role */
  function card(name, role, x, y, t, o = {}) { const e = place(mk("div", "at-card", o.parent, `<div class="nm">${name}</div><div class="rl">${role}</div>`), x, y);
    if (o.c) e.style.setProperty("--c", o.c);
    ff(e, t, { opacity: 0, x: -u * 4, clipPath: "inset(0% 100% 0% 0%)" }, { opacity: 1, x: 0, clipPath: "inset(0% 0% 0% 0%)" }, .7, E.io);
    if (o.until) out(e, o.until); return e; }
  function chip(text, x, y, t, o = {}) { const e = place(mk("div", "at-chip", o.parent, text), x, y); if (o.c) e.style.setProperty("--c", o.c); if (o.size) e.style.fontSize = u * o.size + "px";
    ff(e, t, { opacity: 0, scale: .6 }, { opacity: 1, scale: 1 }, .45, E.pop); if (o.until) out(e, o.until); return e; }
  const flash = (t, d = .35) => { const f = mk("div", "at-flash", $("root")); tl.set(f, { opacity: 0 }, 0); tl.fromTo(f, { opacity: .85 }, { opacity: 0, duration: d, ease: "power2.out", immediateRender: false }, t); };
  const cam = (t, d, to) => tl.to(stage(), { duration: d, ease: E.io, ...to }, t);
  function stamp(text, x, y, t, o = {}) { const c = o.c || K.warn, e = place(mk("div", "", o.parent, text), x, y);
    Object.assign(e.style, { position: "absolute", font: `700 ${u * (o.size ?? 4.5)}px ${SANS}`, letterSpacing: ".14em", color: c, border: `${u * .45}px solid ${c}`,
      padding: `${u * .3}px ${u * 1.6}px`, whiteSpace: "nowrap", background: K.card + "e6", zIndex: 20, borderRadius: u * .6 + "px" });
    ff(e, t, { xPercent: -50, yPercent: -50, scale: 2.4, rotation: 0, opacity: 0 }, { xPercent: -50, yPercent: -50, scale: 1, rotation: o.rot ?? -7, opacity: 1 }, .35, E.snap);
    if (o.until) out(e, o.until); return e; }
  function rings(x, y, t, o = {}) { const r = o.r || u * 6;
    for (let i = 0; i < (o.n || 2); i++) { const e = place(mk("div", "at-ring", o.parent), x - r, y - r, r * 2, r * 2); e.style.setProperty("--c", o.c || K.red); gsap.set(e, { opacity: 0 });
      tl.fromTo(e, { scale: .1, opacity: .9 }, { scale: 1, opacity: 0, duration: 1.3, ease: "power1.out", immediateRender: false }, t + i * .3); } }
  window.AT = { S, P, W, H, D, V, u, K, tl, E, SANS, at, $, mk, place, src, out, ff, pos, paper, photo, enter, morph, wash, panel, head, kick, tel, count, card, chip,
                flash, cam, stamp, rings, done: () => finish(tl) };
})();
