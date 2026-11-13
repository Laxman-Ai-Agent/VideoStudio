/* News-desk kit (05_Nvidia_CEO_Exit, light-documentary): warm newsprint + newspaper column grid, section tints,
   Archivo Black caps headlines + Telugu line, real press photos in white-border cards (contain, never cropped, slight tilt, tape),
   real screenshots in a browser frame with a yellow marker on the key line, eased stamps, BREAKING bar, calendar,
   count-ups, quote cards. Smooth motion only (no shake / glitch / flash). Each sequence writes its own composition with these parts. */
(function () {
  const S = window.SCENE, P = S.params || {}, W = S.w, H = S.h, D = S.duration, V = H > W, u = Math.min(W, H) / 100;
  const PAL = { ink: "#14171F", mute: "#5B6472", green: "#76B900", dgreen: "#4E7D00", red: "#E0393E", marker: "#FFE14D", paper: "#F3F1EA", white: "#FFFFFF" };
  const SEC = { company: ["#F2F3EA", "#E3E9D3"], scandal: ["#F5EEEC", "#ECD9D6"], money: ["#F5F0E4", "#EADFC6"], next: ["#EEF4EF", "#D9E8DC"], paper: ["#F3F1EA", "#E9E6DC"] };
  const tl = gsap.timeline({ paused: true });
  const E = { in: "power3.out", pop: "back.out(1.5)", out: "power2.in", io: "power2.inOut", soft: "sine.inOut", stamp: "back.out(2.2)" };
  const IMG = S.images || [], AR = P.ar || [], B = P.beats || {};
  const css = document.createElement("style");
  css.textContent = `
  #root { overflow: hidden; background: ${PAL.paper}; }
  .nbg { position: absolute; inset: 0; }
  .nbg .cols { position: absolute; inset: 0; background-image: repeating-linear-gradient(90deg, transparent 0 ${W / 6 - 1}px, #14171F10 ${W / 6 - 1}px ${W / 6}px),
     repeating-linear-gradient(0deg, transparent 0 ${u * 3 - 1}px, #14171F07 ${u * 3 - 1}px ${u * 3}px); }
  .nbg .grain { position: absolute; inset: 0; background: radial-gradient(circle at 20% 15%, #ffffff90, transparent 45%), radial-gradient(circle at 85% 90%, #00000010, transparent 50%); }
  #stage { position: absolute; inset: 0; transform-origin: 50% 50%; }
  .nh { position: absolute; left: ${V ? 7 : 5}%; top: ${V ? 6 : 7}%; width: ${V ? 86 : 60}%; color: ${PAL.ink}; }
  .nh .kk { display: inline-block; font: 700 ${u * (V ? 2.8 : 2)}px var(--font-script); letter-spacing: .2em; text-transform: uppercase; color: #fff; background: ${PAL.ink};
            padding: ${u * .35}px ${u * .9}px; margin-bottom: ${u * 1.2}px; }
  .nh .en { font: 400 ${u * (V ? 8 : 6.6)}px var(--font-head); text-transform: uppercase; line-height: 1.02; letter-spacing: -.005em; }
  .nh .en em { font-style: normal; position: relative; z-index: 0; }
  .nh .en em::before { content: ""; position: absolute; z-index: -1; left: -.08em; right: -.08em; top: .52em; bottom: .02em; background: var(--mk, ${PAL.marker}); transform: scaleX(var(--k, 1)); transform-origin: 0 50%; }
  .nh .te { margin-top: ${u * 1.1}px; font: 600 ${u * (V ? 4.2 : 3.3)}px var(--font); line-height: 1.35; color: ${PAL.mute}; }
  .nc { position: absolute; background: #fff no-repeat center / contain; border: ${u * .7}px solid #fff; box-shadow: 0 ${u * 1.2}px ${u * 3.2}px #14171F2e, 0 0 0 1px #14171F14; }
  .nc .cap { position: absolute; left: 0; top: 100%; margin-top: ${u * 1.1}px; white-space: nowrap; font: 400 ${u * (V ? 3.6 : 2.6)}px var(--font-head); text-transform: uppercase; color: ${PAL.ink}; }
  .nc .cap small { display: block; font: 600 ${u * (V ? 2.6 : 1.8)}px var(--font-script); letter-spacing: .14em; color: ${PAL.mute}; margin-top: ${u * .3}px; }
  .nc .tape { position: absolute; width: 28%; height: ${u * 2.6}px; left: 36%; top: -${u * 1.6}px; background: #F7E9A8cc; transform: rotate(-3deg); box-shadow: 0 1px 2px #0002; }
  .nc .miss { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: ${PAL.mute}; font: 700 ${u * 1.8}px var(--font-script); border: 2px dashed #C9CCD8; }
  .nw { position: absolute; background: #fff; border-radius: ${u * 1}px; overflow: hidden; box-shadow: 0 ${u * 1.4}px ${u * 4}px #14171F33, 0 0 0 1px #14171F1a; }
  .nw .bar { position: absolute; left: 0; right: 0; top: 0; background: #E8E6E0; display: flex; align-items: center; gap: ${u * .6}px; padding: 0 ${u * 1.2}px; z-index: 2; }
  .nw .bar i { width: ${u * .9}px; height: ${u * .9}px; border-radius: 50%; background: #CFCBC2; }
  .nw .bar b { margin-left: ${u}px; flex: 1; height: 58%; border-radius: 99px; background: #fff; font: 600 ${u * 1.3}px var(--font-script); color: ${PAL.mute};
               display: flex; align-items: center; padding-left: ${u}px; white-space: nowrap; overflow: hidden; }
  .nw .pg { position: absolute; left: 0; right: 0; bottom: 0; background: #fff no-repeat center top / contain; transform-origin: 50% 50%; }
  .nm { position: absolute; background: ${PAL.marker}; mix-blend-mode: multiply; transform-origin: 0 50%; border-radius: 2px; }
  .nbox { position: absolute; border: ${u * .45}px solid ${PAL.red}; border-radius: ${u * .6}px; }
  .nst { position: absolute; padding: ${u * .6}px ${u * 1.6}px; border: ${u * .55}px solid currentColor; border-radius: ${u * .5}px; color: ${PAL.red};
         font: 400 ${u * (V ? 7 : 5.6)}px var(--font-head); text-transform: uppercase; letter-spacing: .02em; white-space: nowrap; background: #ffffffb3; }
  .nbr { position: absolute; left: 0; right: 0; display: flex; align-items: stretch; height: ${u * (V ? 6 : 6.4)}px; box-shadow: 0 ${u * .5}px ${u * 1.5}px #0002; }
  .nbr .a { background: ${PAL.red}; color: #fff; font: 400 ${u * (V ? 3.4 : 3.2)}px var(--font-head); display: flex; align-items: center; padding: 0 ${u * 2}px; letter-spacing: .04em; }
  .nbr .b { flex: 1; background: ${PAL.ink}; color: #fff; font: 700 ${u * (V ? 2.9 : 2.7)}px var(--font-script); display: flex; align-items: center; padding: 0 ${u * 2}px; letter-spacing: .06em; white-space: nowrap; overflow: hidden; }
  .ncal { position: absolute; background: #fff; border-radius: ${u * 1}px; overflow: hidden; text-align: center; box-shadow: 0 ${u}px ${u * 3}px #14171F2a; }
  .ncal .m { background: var(--c, ${PAL.red}); color: #fff; font: 400 calc(var(--s) * 15) var(--font-head); padding: 5% 0; letter-spacing: .08em; }
  .ncal .d { font: 400 calc(var(--s) * 44) var(--font-head); color: ${PAL.ink}; line-height: 1.2; }
  .ncal .l { font: 700 calc(var(--s) * 9) var(--font-script); color: ${PAL.mute}; letter-spacing: .12em; padding-bottom: 7%; }
  .nchip { position: absolute; padding: ${u * .7}px ${u * 1.5}px; background: #fff; color: ${PAL.ink}; border-left: ${u * .6}px solid var(--c, ${PAL.green});
           font: 400 ${u * (V ? 4.2 : 3.2)}px var(--font-head); text-transform: uppercase; white-space: nowrap; box-shadow: 0 ${u * .5}px ${u * 1.6}px #14171F22; }
  .nn { position: absolute; font: 400 ${u * 14}px var(--font-head); line-height: 1; white-space: nowrap; color: ${PAL.ink}; }
  .nq { position: absolute; box-sizing: border-box; background: #fff; padding: ${u * 2}px ${u * 2.4}px; box-shadow: 0 ${u}px ${u * 3}px #14171F26; border-top: ${u * .7}px solid var(--c, ${PAL.green}); }
  .nq .t { font: 400 ${u * (V ? 4.6 : 3.6)}px var(--font-head); text-transform: uppercase; line-height: 1.15; color: ${PAL.ink}; }
  .nq .w { margin-top: ${u * 1.2}px; font: 700 ${u * (V ? 2.6 : 1.9)}px var(--font-script); letter-spacing: .12em; color: ${PAL.mute}; text-transform: uppercase; }
  .nl { position: absolute; background: #fff no-repeat center / 70%; border-radius: ${u * 1.2}px; box-shadow: 0 ${u * .8}px ${u * 2.4}px #14171F22; }
  .ndoc { position: absolute; box-sizing: border-box; background: #fff; box-shadow: 0 ${u}px ${u * 3}px #14171F2a; padding: 6% 7%; font-family: var(--font-script); color: ${PAL.ink}; }
  .ndoc .h { font: 400 calc(var(--s) * 9) var(--font-head); letter-spacing: .02em; }
  .ndoc .r { height: calc(var(--s) * 2.2); background: #E4E1D8; margin-top: calc(var(--s) * 3.2); border-radius: 2px; }
  .ndoc .k { margin-top: calc(var(--s) * 5); font: 700 calc(var(--s) * 4.6) var(--font-script); }`;
  document.head.append(css);

  const $ = (id) => document.getElementById(id);
  const at = (k, d = 0) => (B[k] ?? d);
  const mk = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; (parent || $("stage")).append(e); return e; };
  const place = (e, x, y, w, h) => { Object.assign(e.style, { left: x + "px", top: y + "px" }); if (w != null) e.style.width = w + "px"; if (h != null) e.style.height = h + "px"; return e; };
  const ix = (k) => (typeof k === "string" ? (P.names || []).indexOf(k) : k);
  const fade = (e, t, d = 0.45) => tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: d, ease: E.soft, immediateRender: true }, t);
  function pop(e, t, from = { y: u * 3, opacity: 0, scale: 0.95 }, d = 0.6, ease = E.in) {
    const to = { x: 0, y: 0, scale: 1, opacity: 1, duration: d, ease, immediateRender: true }; if ("rotation" in from) to.rotation = e._rot || 0;
    tl.fromTo(e, from, to, t);
  }
  const out = (e, t, to = {}) => tl.to(e, { opacity: 0, duration: 0.4, ease: E.out, ...to }, t);
  const move = (e, t, x, y, w, h, d = 0.9, extra = {}) => tl.to(e, { left: x, top: y, ...(w != null ? { width: w } : {}), ...(h != null ? { height: h } : {}), duration: d, ease: E.io, ...extra }, t);
  function fit(e, t, x, y, mw, mh, d = 0.9, extra) { const ar = parseFloat(e.style.width) / parseFloat(e.style.height), w = Math.min(mw, mh * ar), h = w / ar;
    return move(e, t, x + (mw - w) / 2, y + (mh - h) / 2, w, h, d, extra); }
  const tilt = (e, deg) => { e._rot = deg; gsap.set(e, { rotation: deg }); return e; };

  /* newsprint background with a section tint; bg(name, t) at t > 0 crossfades to another tint */
  function bg(name = "paper", t = 0) {
    const c = SEC[name], L = document.createElement("div"); L.className = "nbg"; $("root").insertBefore(L, $("shake") || $("stage"));
    L.style.background = `linear-gradient(160deg, ${c[0]}, ${c[1]})`; mk("div", "cols", L); mk("div", "grain", L);
    if (t > 0) fade(L, t, 0.7);
    return L;
  }
  // slow camera push on the whole stage (always moving, eased)
  const cam = (t, d, s = 1.04, x = 0, y = 0) => tl.to($("stage"), { scale: s, x, y, duration: d, ease: E.soft }, t);

  /* headline: kicker tag, caps English headline (wrap a word in <em> for the marker), Telugu line */
  function head(en, te, t, o = {}) {
    const e = mk("div", "nh", o.parent, `${o.kick ? `<div class="kk">${o.kick}</div><br>` : ""}<div class="en">${en}</div>${te ? `<div class="te">${te}</div>` : ""}`);
    if (o.x != null) place(e, o.x, o.y, o.w); if (o.size) e.querySelector(".en").style.fontSize = u * o.size + "px"; if (o.align) e.style.textAlign = o.align;
    const parts = [...e.children].filter((c) => c.tagName !== "BR");
    tl.fromTo(parts, { opacity: 0, y: u * 2.4 }, { opacity: 1, y: 0, duration: 0.55, ease: E.in, stagger: 0.1, immediateRender: true }, t);
    e.querySelectorAll("em").forEach((m) => { if (o.mk) m.style.setProperty("--mk", o.mk); tl.fromTo(m, { "--k": 0 }, { "--k": 1, duration: 0.5, ease: E.io, immediateRender: true }, t + 0.45); });
    return e;
  }
  const rehead = (old, en, te, t, o) => { out(old, t - 0.35, { y: -u * 2 }); return head(en, te, t, o); };

  /* press photo card, never cropped: box takes the picture's aspect inside the max box (w x h) */
  function card(o) {
    const i = ix(o.i), ar = AR[i] || 1, bw = o.w || o.h * ar, bh = o.h || o.w / ar;
    const w = Math.min(bw, bh * ar), h = w / ar, x = o.x + (bw - w) / 2, y = o.y + (bh - h) / 2;
    const c = place(mk("div", "nc", o.parent), x, y, w, h);
    if (i >= 0 && IMG[i]) c.style.backgroundImage = `url("${IMG[i]}")`; else mk("div", "miss", c, "MISSING " + String(o.i).toUpperCase());
    if (o.tape) mk("i", "tape", c); if (o.cap) mk("div", "cap", c, o.cap); if (o.rot) tilt(c, o.rot);
    return c;
  }
  /* screenshot in a browser frame; the page keeps its aspect; returns the frame (frame.pg = page layer) */
  function shot(o) {
    const i = ix(o.i), ar = AR[i] || 16 / 9, bh = u * (V ? 3.4 : 2.8), w = o.w || (o.h - bh) * ar, ph = w / ar, h = ph + bh;
    const f = place(mk("div", "nw", o.parent), o.x, o.y, w, h);
    const bar = mk("div", "bar", f, `<i></i><i></i><i></i><b>${o.url || ""}</b>`); bar.style.height = bh + "px";
    const pg = mk("div", "pg", f); pg.style.top = bh + "px"; if (i >= 0 && IMG[i]) pg.style.backgroundImage = `url("${IMG[i]}")`;
    f.pg = pg; f.pw = w; f.ph = ph; f.bh = bh; if (o.rot) tilt(f, o.rot);
    return f;
  }
  // yellow marker over a region of the page, region in page fractions [x, y, w, h]
  function mark(f, t, r, d = 0.55, col) {
    const m = place(mk("div", "nm", f.pg), r[0] * f.pw, r[1] * f.ph, r[2] * f.pw, r[3] * f.ph); if (col) m.style.background = col;
    tl.fromTo(m, { scaleX: 0 }, { scaleX: 1, duration: d, ease: E.io, immediateRender: true }, t); return m;
  }
  // red outline box around a region (draws in)
  function ring(f, t, r) { const b = place(mk("div", "nbox", f.pg), r[0] * f.pw, r[1] * f.ph, r[2] * f.pw, r[3] * f.ph);
    tl.fromTo(b, { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1, duration: 0.45, ease: E.in, immediateRender: true }, t); return b; }
  // push the page in toward a region centre (camera move inside the frame)
  function zoom(f, t, r, s = 1.8, d = 1.1) { const cx = (r[0] + r[2] / 2) * 100, cy = (r[1] + r[3] / 2) * 100;
    tl.set(f.pg, { transformOrigin: `${cx}% ${cy}%` }, t); tl.to(f.pg, { scale: s, duration: d, ease: E.io }, t); }
  const unzoom = (f, t, d = 0.9) => tl.to(f.pg, { scale: 1, duration: d, ease: E.io }, t);

  /* rubber stamp: eased drop + settle (no shake) */
  function stamp(text, x, y, t, o = {}) { const e = place(mk("div", "nst", o.parent, text), x, y); if (o.color) e.style.color = o.color; if (o.size) e.style.fontSize = u * o.size + "px";
    tilt(e, o.rot ?? -8); tl.fromTo(e, { scale: 1.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: E.stamp, immediateRender: true }, t); return e; }
  /* BREAKING bar: red tag + ticker text, slides in from the left */
  function breaking(text, y, t, tag = "BREAKING") { const e = place(mk("div", "nbr", undefined, `<div class="a">${tag}</div><div class="b">${text}</div>`), 0, y);
    tl.fromTo(e, { xPercent: -100 }, { xPercent: 0, duration: 0.7, ease: E.in, immediateRender: true }, t);
    tl.fromTo(e.querySelector(".b"), { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: true }, t + 0.45); return e; }
  /* calendar page: month, day, label; flip() swaps it */
  function cal(m, d, l, x, y, w, c) { const e = place(mk("div", "ncal", undefined, `<div class="m">${m}</div><div class="d">${d}</div><div class="l">${l || ""}</div>`), x, y, w);
    e.style.setProperty("--s", w / 100 + "px"); if (c) e.style.setProperty("--c", c); return e; }
  function flip(e, t, m, d, l, c) { tl.to(e, { rotationX: 90, duration: 0.25, ease: E.out }, t);
    tl.call(() => { e.querySelector(".m").textContent = m; e.querySelector(".d").textContent = d; e.querySelector(".l").textContent = l || ""; if (c) e.style.setProperty("--c", c); }, null, t + 0.25);
    tl.to(e, { rotationX: 0, duration: 0.3, ease: E.in }, t + 0.25); }
  const chip = (text, x, y, c, parent) => { const e = place(mk("div", "nchip", parent, text), x, y); if (c) e.style.setProperty("--c", c); return e; };
  const num = (x, y, color, size, parent) => { const e = place(mk("div", "nn", parent), x, y); if (color) e.style.color = color; if (size) e.style.fontSize = u * size + "px"; return e; };
  function count(e, from, to, t, d = 1.1, fmt = (v) => Math.round(v)) { const o = { v: from }; e.textContent = fmt(from);
    tl.to(o, { v: to, duration: d, ease: "power2.out", onUpdate: () => { e.textContent = fmt(o.v); } }, t); }
  function quote(text, who, x, y, w, c) { const e = place(mk("div", "nq", undefined, `<div class="t">&ldquo;${text}&rdquo;</div><div class="w">${who}</div>`), x, y, w); if (c) e.style.setProperty("--c", c); return e; }
  function logo(k, x, y, s) { const b = place(mk("div", "nl"), x, y, s, s); const i = ix(k); if (i >= 0 && IMG[i]) b.style.backgroundImage = `url("${IMG[i]}")`; return b; }
  // generic document card (filing / report) drawn as a plain page: title + grey lines + one key line
  function doc(title, key, x, y, w, h) { const e = place(mk("div", "ndoc", undefined, `<div class="h">${title}</div>${"<div class='r'></div>".repeat(5)}<div class="k">${key}</div>${"<div class='r'></div>".repeat(3)}`), x, y, w, h);
    e.style.setProperty("--s", w / 100 + "px"); return e; }
  // draw an SVG line (connector / timeline / chart path) through points in stage px
  function line(pts, t, d = 1, color = PAL.ink, wd = u * 0.4, parent) {
    const s = place(mk("div", "", parent), 0, 0, W, H); s.style.position = "absolute"; s.style.pointerEvents = "none";
    s.innerHTML = `<svg width="${W}" height="${H}" style="overflow:visible"><path d="M${pts.map((p) => p.join(" ")).join(" L")}" fill="none" stroke="${color}" stroke-width="${wd}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const p = s.querySelector("path"), L = p.getTotalLength(); p.style.strokeDasharray = L;
    tl.fromTo(p, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: d, ease: E.io, immediateRender: true }, t); return s;
  }
  window.X = { S, P, W, H, D, V, u, PAL, SEC, tl, E, at, $, mk, place, ix, fade, pop, out, move, fit, tilt, bg, cam, head, rehead, card, shot, mark, ring, zoom, unzoom,
               stamp, breaking, cal, flip, chip, num, count, quote, logo, doc, line, done: () => finish(tl) };
})();
