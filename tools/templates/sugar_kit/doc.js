/* doc.js (copied from moon_kit for 09_Sugar_Walk): image-led documentary parts (user brief 2026-11-15: big / full-screen photos, cards only sometimes).
   photo(k, x, y, w, h, o) full-bleed / split / framed photo (o.wash "l"|"r"|"b"|"t", o.credit, o.card, o.contain); kb(e, t, d, s0, s1, p0, p1) Ken Burns;
   reveal(e, t, dir, d) clip-path wipe; big(html, x, y, size, color); pill(html, x, y, o); tag(k, d, icon, c, x, y) contract card;
   lab(title, sub, c, x, y) label card; stat(n, label, x, y, c) number block; split(t, a, b) helper to slide two photos into halves. */
(function () {
  const { S, W, H, D, V, u, PAL, tl, E, mk, place, ix, ico } = X;
  const css = document.createElement("style");
  css.textContent = `
  .ph { position: absolute; overflow: hidden; background: #121722; }
  .ph .im { position: absolute; inset: 0; background: no-repeat 50% 50% / cover; transform-origin: 50% 50%; }
  .ph.contain { background: transparent; } .ph.contain .im { background-size: contain; }
  .ph.card { border: ${u * .6}px solid #fff; border-radius: ${u * 1.2}px; box-shadow: 0 ${u * 1.2}px ${u * 3.4}px #12172238; }
  .ph .wash { position: absolute; inset: 0; pointer-events: none; }
  .ph .cr { position: absolute; right: ${u * 1.1}px; bottom: ${u * .8}px; font: 700 ${u * (V ? 1.6 : 1.25)}px var(--font-script); color: #fff; letter-spacing: .12em; text-shadow: 0 1px 3px #000a; }
  .ph.card .cr { right: ${u * .8}px; bottom: ${u * .5}px; }
  .big { position: absolute; font: 900 ${u * 15}px var(--font-head); color: ${PAL.cyan}; letter-spacing: -.04em; line-height: 1; white-space: nowrap; }
  .big small { font-size: .3em; color: ${PAL.ink}; letter-spacing: 0; margin-left: .25em; }
  .pill { position: absolute; font: 800 ${u * (V ? 3.6 : 2.5)}px var(--font-head); color: ${PAL.ink}; background: #fff; border-radius: 99px; padding: ${u * .8}px ${u * 2}px;
          box-shadow: 0 ${u * .6}px ${u * 2}px #12172222; white-space: nowrap; }
  .pill em { font-style: normal; color: #2F6FDB; } .pill.dark { background: ${PAL.ink}; color: #fff; } .pill.dark em { color: ${PAL.cyan}; }
  .cc { position: absolute; display: flex; align-items: center; gap: ${u * 1.2}px; background: #fff; border-radius: ${u * 1.4}px; padding: ${u}px ${u * 1.6}px;
        box-shadow: 0 ${u * .8}px ${u * 2.4}px #12172226; border-left: ${u * .7}px solid var(--c); white-space: nowrap; }
  .cc .k { font: 800 ${u * (V ? 4 : 3)}px var(--font-head); color: ${PAL.ink}; letter-spacing: -.01em; }
  .cc .d { font: 700 ${u * (V ? 2.1 : 1.55)}px var(--font-script); color: ${PAL.mute}; letter-spacing: .12em; }
  .cc svg { width: ${u * 3.4}px; height: ${u * 3.4}px; color: var(--c); flex: none; }
  .lab { position: absolute; background: #fff; border-radius: ${u * 1.1}px; padding: ${u * .8}px ${u * 1.3}px; box-shadow: 0 ${u * .7}px ${u * 2}px #12172226;
         border-top: ${u * .5}px solid var(--c); white-space: nowrap; }
  .lab b { display: block; font: 800 ${u * (V ? 3 : 2.1)}px var(--font-head); color: ${PAL.ink}; }
  .lab span { display: block; font: 700 ${u * (V ? 1.9 : 1.35)}px var(--font-script); color: ${PAL.mute}; letter-spacing: .12em; }
  .stat { position: absolute; }
  .stat b { display: block; font: 900 ${u * (V ? 9 : 6.4)}px var(--font-head); color: var(--c); letter-spacing: -.03em; line-height: 1; }
  .stat > span { display: block; margin-top: ${u * .6}px; font: 700 ${u * (V ? 2.2 : 1.6)}px var(--font-script); color: ${PAL.mute}; letter-spacing: .14em; }
  .ondark .lh .en, .ondark .stat > span { color: #fff; } .ondark .lh .te { color: #ffffffd0; }`;
  document.head.append(css);
  const WASH = { l: "linear-gradient(90deg, #EEEFEAf4 0%, #EEEFEAc4 34%, #EEEFEA00 60%)", r: "linear-gradient(270deg, #EEEFEAf4 0%, #EEEFEAc4 34%, #EEEFEA00 60%)",
                 b: "linear-gradient(0deg, #EEEFEAf6 0%, #EEEFEAc0 30%, #EEEFEA00 56%)", t: "linear-gradient(180deg, #EEEFEAf4 0%, #EEEFEAb8 30%, #EEEFEA00 55%)",
                 dl: "linear-gradient(90deg, #0b0f17e6 0%, #0b0f1799 38%, #0b0f1700 64%)", db: "linear-gradient(0deg, #0b0f17ee 0%, #0b0f1788 34%, #0b0f1700 60%)" };
  function photo(k, x, y, w, h, o = {}) {
    const i = ix(k), src = (S.images || [])[i];
    const e = place(mk("div", "ph" + (o.card ? " card" : "") + (o.contain ? " contain" : ""), o.parent), x, y, w, h);
    const im = mk("div", "im", e); e.im = im;
    if (src) im.style.backgroundImage = `url(${src})`;
    if (o.pos) im.style.backgroundPosition = o.pos;
    if (o.wash) { const wv = mk("div", "wash", e); wv.style.background = WASH[o.wash]; e.wash = wv; }
    if (o.credit !== false) mk("div", "cr", e, o.credit || "NASA");
    return e;
  }
  // Ken Burns on a photo (always covers its box, any shape): zoom s0 -> s1 (%), focus point p0 -> p1 ("x% y%")
  const kb = (e, t, d, s0 = 106, s1 = 118, p0 = "50% 50%", p1 = "50% 50%") =>
    tl.fromTo(e.im || e, { scale: s0 / 100, backgroundPosition: p0, transformOrigin: p0 }, { scale: s1 / 100, backgroundPosition: p1, transformOrigin: p1, duration: Math.max(d, .5), ease: "none", immediateRender: true }, t);
  const CLIP = { l: "inset(0 100% 0 0)", r: "inset(0 0 0 100%)", u: "inset(100% 0 0 0)", d: "inset(0 0 100% 0)", c: "inset(50% 50% 50% 50%)" };
  const reveal = (e, t, dir = "l", d = .9) => tl.fromTo(e, { clipPath: CLIP[dir] }, { clipPath: "inset(0% 0% 0% 0%)", duration: d, ease: E.io, immediateRender: true }, t);
  const hide = (e, t, dir = "r", d = .7) => tl.to(e, { clipPath: CLIP[dir], duration: d, ease: E.io }, t);
  function big(html, x, y, size, color, parent) { const e = place(mk("div", "big", parent, html), x, y); if (size) e.style.fontSize = u * size + "px"; if (color) e.style.color = color; return e; }
  function pill(html, x, y, o = {}) { return place(mk("div", "pill" + (o.dark ? " dark" : ""), o.parent, html), x, y); }
  function tag(k, d, icon, c, x, y, parent) { const e = place(mk("div", "cc", parent, `${ico(icon)}<div><div class="k">${k}</div><div class="d">${d}</div></div>`), x, y); e.style.setProperty("--c", c); return e; }
  function lab(title, sub, c, x, y, parent) { const e = place(mk("div", "lab", parent, `<b>${title}</b>${sub ? `<span>${sub}</span>` : ""}`), x, y); e.style.setProperty("--c", c || PAL.cyan); return e; }
  function stat(n, label, x, y, c, parent) { const e = place(mk("div", "stat", parent, `<b>${n}</b><span>${label}</span>`), x, y); e.style.setProperty("--c", c || PAL.cyan); e.b = e.querySelector("b"); return e; }
  // count a number inside el from a to b; fmt(v) -> html
  function countTo(el, a, b, t, d = 1.1, fmt = (v) => Math.round(v)) { const o = { v: a }; el.innerHTML = fmt(a);
    tl.to(o, { v: b, duration: d, ease: "power2.out", onUpdate: () => { el.innerHTML = fmt(o.v); } }, t); }
  window.DOC = { photo, kb, reveal, hide, big, pill, tag, lab, stat, countTo, WASH };
})();
