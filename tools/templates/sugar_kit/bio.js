/* bio.js (09_Sugar_Walk): dark science documentary layer over kit.js + doc.js + m3d.js (user brief 2026-11-15, readme.txt).
   Look: #0A0E17 with radial depth light, faint capillary network + drifting cells, neon meaning colours (cyan glucose / energy,
   green healthy, amber insulin key / mechanism / warning, red danger), soft glow on active parts, ambient breathing on everything.
   dbg() background; glow(e, c, s); breathe(e, t0, amp, per); badge(html, c, x, y); aiPhoto(k, x, y, w, h, o) Ken Burns 1.00 -> 1.06 + vignette;
   cell(x, y, r, o) 2D cell with a door {e, door, mem}; key(x, y, s); organ(x, y, s) pancreas; flow(pts, n, t0, t1, o) glucose dots along a path;
   meter(x, y, w, h, label) blood sugar gauge {set(t, frac, c)}; spark(x, y, t, c); B3.vessel(v, o) 3D blood vessel fly-through.
   Head colours: <em> cyan, <em class="a"> amber, <em class="g"> green, <em class="r"> red. Class names start with b- (studio.css has .tx etc.). */
(function () {
  const { S, W, H, D, V, u, tl, E, mk, place, $ } = X;
  const K = { bg: "#0A0E17", ink: "#EAF2FF", mute: "#8A97AD", cyan: "#00F0FF", green: "#00E676", amber: "#FFB800", red: "#FF3B30", panel: "#111827" };
  const css = document.createElement("style");
  css.textContent = `
  #root { background: ${K.bg}; }
  #bgs { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .b-l { position: absolute; inset: 0; }
  .lh { color: ${K.ink}; }
  .lh .kk { background: #121A2Bee; border: 1px solid ${K.cyan}55; color: ${K.cyan}; }
  .lh .kk::before { background: ${K.cyan}; box-shadow: 0 0 ${u * .8}px ${K.cyan}; }
  .lh .en { color: ${K.ink}; font-weight: 700; letter-spacing: -.025em; }
  .lh .en em { color: ${K.cyan}; text-shadow: 0 0 ${u * 1.8}px ${K.cyan}77; }
  .lh .en em.a { color: ${K.amber}; text-shadow: 0 0 ${u * 1.8}px ${K.amber}77; } .lh .en em.g { color: ${K.green}; text-shadow: 0 0 ${u * 1.8}px ${K.green}77; }
  .lh .en em.r { color: ${K.red}; text-shadow: 0 0 ${u * 1.8}px ${K.red}88; }
  .lh .te { color: #B9C4D6; }
  .lchip { background: #111827e8; color: ${K.ink}; border: 1px solid #ffffff1c; box-shadow: none; }
  .rail { background: #0D1320e8; border-top: 1px solid #ffffff14; } .rail .a { background: #121A2B; color: ${K.cyan}; } .rail .b { color: ${K.mute}; } .rail .b b { color: ${K.ink}; }
  .pill { background: #121A2B; color: ${K.ink}; border: 1px solid #ffffff1c; box-shadow: none; } .pill em { color: ${K.cyan}; }
  .stat > span { color: ${K.mute}; }
  .ph { background: #0D1320; } .ph .cr { color: #ffffff99; }
  .b-vig { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 50%, rgba(10,14,23,.12) 0%, rgba(10,14,23,.6) 72%, rgba(10,14,23,.9) 100%); }
  .b-badge { position: absolute; display: inline-flex; align-items: center; gap: ${u * .8}px; padding: ${u * .7}px ${u * 1.6}px; background: #0F1626ee; border: 1px solid var(--c);
             border-radius: 99px; font: 700 ${u * (V ? 3 : 2.1)}px var(--font-head); color: ${K.ink}; letter-spacing: .02em; white-space: nowrap; box-shadow: 0 0 ${u * 2.2}px var(--c), inset 0 0 ${u}px #ffffff08; }
  .b-badge i { width: ${u * 1}px; height: ${u * 1}px; border-radius: 50%; background: var(--c); box-shadow: 0 0 ${u}px var(--c); flex: none; }
  .b-badge b { color: var(--c); font-weight: 800; }
  .b-svg { position: absolute; overflow: visible; }
  .b-dot { position: absolute; border-radius: 50%; }
  .b-meter { position: absolute; }
  .b-meter .tr { position: absolute; inset: 0; border-radius: 99px; background: #ffffff0d; border: 1px solid #ffffff1f; overflow: hidden; }
  .b-meter .f { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 99px; background: var(--c); box-shadow: 0 0 ${u * 1.6}px var(--c); }
  .b-meter .lb { position: absolute; left: 50%; top: 100%; transform: translateX(-50%); margin-top: ${u}px; font: 700 ${u * (V ? 2.4 : 1.6)}px var(--font-script); color: ${K.mute}; letter-spacing: .14em; white-space: nowrap; }
  .b-meter .v { position: absolute; left: 50%; transform: translate(-50%, -120%); font: 800 ${u * (V ? 3.4 : 2.4)}px var(--font-script); color: var(--c); white-space: nowrap; }`;
  document.head.append(css);

  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const NS = "http://www.w3.org/2000/svg";
  const svg = (w, h, inner, parent) => { const s = place(mk("div", "b-svg", parent, `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible">${inner}</svg>`), 0, 0, w, h); return s; };

  /* background: radial depth light that drifts, capillary network, drifting faint cells, edge vignette */
  function dbg() {
    let L = $("bgs"); if (!L) { L = document.createElement("div"); L.id = "bgs"; $("root").insertBefore(L, $("stage")); }
    const a = mk("div", "b-l", L); a.style.background = `radial-gradient(ellipse at 50% 42%, #18233D 0%, #0E1526 42%, ${K.bg} 78%)`;
    const lit = mk("div", "b-l", L); lit.style.background = `radial-gradient(circle at 50% 50%, ${K.cyan}12 0%, transparent 34%)`;
    tl.fromTo(lit, { x: -W * .18, y: -H * .1 }, { x: W * .16, y: H * .08, duration: Math.max(D, 1), ease: "sine.inOut", immediateRender: true }, 0);
    let p = "";
    for (let i = 0; i < 9; i++) {  // branching capillaries
      let x = rnd() * W, y = rnd() * H, ang = rnd() * 6.28, d = `M${x.toFixed(0)} ${y.toFixed(0)}`;
      for (let k = 0; k < 7; k++) { ang += (rnd() - .5) * 1.1; const l = u * (6 + rnd() * 8), cx = x + Math.cos(ang) * l * .6, cy = y + Math.sin(ang) * l * .6; x += Math.cos(ang) * l; y += Math.sin(ang) * l; d += ` Q${cx.toFixed(0)} ${cy.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`; }
      p += `<path d="${d}" fill="none" stroke="${i % 3 ? K.cyan : K.red}" stroke-opacity="${i % 3 ? .07 : .06}" stroke-width="${u * (.15 + rnd() * .25)}" stroke-linecap="round"/>`;
    }
    const net = svg(W, H, p, L); tl.fromTo(net, { scale: 1, x: 0 }, { scale: 1.06, x: -u * 3, duration: Math.max(D, 1), ease: "none", immediateRender: true }, 0);
    for (let i = 0; i < 7; i++) {  // faint cells drifting
      const r = u * (2 + rnd() * 4), c = place(mk("div", "b-dot", L), rnd() * W, rnd() * H, r * 2, r * 2);
      Object.assign(c.style, { border: `1px solid ${K.cyan}22`, background: `radial-gradient(circle at 40% 40%, ${K.cyan}10, transparent 60%)` });
      tl.fromTo(c, { x: 0, y: 0 }, { x: u * (rnd() * 10 - 5), y: u * (rnd() * 8 - 4), duration: Math.max(D, 1), ease: "sine.inOut", immediateRender: true }, 0);
    }
    const vg = mk("div", "b-l", L); vg.style.background = `radial-gradient(ellipse at 50% 50%, transparent 55%, #05070cc0 100%)`;
    return L;
  }
  const glow = (e, c = K.cyan, s = 1.2) => { e.style.filter = `drop-shadow(0 0 ${u * s}px ${c})`; return e; };
  // ambient float on the CSS translate property, so it never fights pop()/move() tweens on x / y / left / top
  function breathe(e, t0 = 0, amp = u * .7, per = 3.2) {
    const n = Math.max(1, Math.ceil((D - t0) / (per / 2)));
    tl.fromTo(e, { translate: "0px 0px" }, { translate: `0px ${-amp}px`, duration: per / 2, ease: "sine.inOut", repeat: n, yoyo: true, immediateRender: false }, t0);
    return e;
  }
  const badge = (html, c, x, y, parent) => { const e = place(mk("div", "b-badge", parent, `<i></i>${html}`), x, y); e.style.setProperty("--c", c || K.cyan); return e; };
  // AI photo: Ken Burns 1.00 -> 1.06 over its life + dark vignette so the vectors on top stay crisp
  function aiPhoto(k, x, y, w, h, o = {}) {
    const e = DOC.photo(k, x, y, w, h, { credit: o.credit || "AI IMAGE (ILLUSTRATION)", pos: o.pos, wash: o.wash, parent: o.parent });
    mk("div", "b-vig", e); DOC.kb(e, o.t || 0, o.d || Math.max(D, 1), 100, 106, o.pos || "50% 50%", o.pos || "50% 50%");
    if (o.round) { e.style.borderRadius = "50%"; }
    return e;
  }
  /* 2D cell: glowing membrane, cytoplasm, nucleus, a door on the left (rotates open from its top hinge) */
  function cell(x, y, r, o = {}) {
    const c = o.c || K.green, s = r * 2.6, cx = s / 2, cy = s / 2;
    const e = place(mk("div", "b-svg", o.parent), x - s / 2, y - s / 2, s, s);
    e.innerHTML = `<svg width="${s}" height="${s}" style="overflow:visible"><defs><radialGradient id="cg${x | 0}" cx="45%" cy="40%"><stop offset="0" stop-color="${c}" stop-opacity=".22"/><stop offset="1" stop-color="${c}" stop-opacity=".04"/></radialGradient></defs>
      <circle class="mem" cx="${cx}" cy="${cy}" r="${r}" fill="url(#cg${x | 0})" stroke="${c}" stroke-width="${u * .5}" style="filter:drop-shadow(0 0 ${u}px ${c})"/>
      <circle cx="${cx + r * .22}" cy="${cy - r * .12}" r="${r * .26}" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-opacity=".5" stroke-width="${u * .2}"/>
      <rect class="door" x="${cx - r - u * .9}" y="${cy - r * .2}" width="${u * 1.8}" height="${r * .4}" rx="${u * .5}" fill="#0F1626" stroke="${K.amber}" stroke-width="${u * .35}" style="transform-box:fill-box;transform-origin:50% 0%"/>
      <circle class="hole" cx="${cx - r}" cy="${cy + r * .05}" r="${u * .35}" fill="${K.amber}"/></svg>`;
    e.mem = e.querySelector(".mem"); e.door = e.querySelector(".door"); e.hole = e.querySelector(".hole"); e.r = r; e.cx = x; e.cy = y;
    e.doorPt = [x - r, y]; return e;
  }
  // tint a cell's membrane to colour c at time t
  const tintCell = (e, t, c, d = .6) => { tl.to(e.mem, { attr: { stroke: c }, duration: d, ease: E.io }, t); tl.set(e.mem, { filter: `drop-shadow(0 0 ${u}px ${c})` }, t + d * .5); };
  function key(x, y, s = u * 6, parent) {
    const e = place(mk("div", "b-svg", parent), x, y, s * 1.8, s);
    e.innerHTML = `<svg viewBox="0 0 36 20" width="${s * 1.8}" height="${s}" style="overflow:visible;filter:drop-shadow(0 0 ${u}px ${K.amber})">
      <circle cx="8" cy="10" r="6.5" fill="none" stroke="${K.amber}" stroke-width="3"/><path d="M14.5 10H34M28 10v5M32 10v4" stroke="${K.amber}" stroke-width="3" stroke-linecap="round"/></svg>`;
    return e;
  }
  function organ(x, y, s = u * 12, parent) {  // pancreas silhouette
    const e = place(mk("div", "b-svg", parent), x, y, s * 2, s);
    e.innerHTML = `<svg viewBox="0 0 100 50" width="${s * 2}" height="${s}" style="overflow:visible;filter:drop-shadow(0 0 ${u * .8}px ${K.amber}aa)">
      <path d="M6 30c4-14 20-18 34-14s24 2 34-4 20-4 22 6-10 16-24 18-30 4-42 8S2 44 6 30z" fill="${K.amber}22" stroke="${K.amber}" stroke-width="2.4"/>
      <path d="M18 30c16-4 34-2 52-8" fill="none" stroke="${K.amber}" stroke-opacity=".5" stroke-width="1.4" stroke-dasharray="3 3"/></svg>`;
    return e;
  }
  /* glucose dots flowing along a polyline path from t0 to t1; o.stop = fraction of the path where dots stop (a closed door) */
  function flow(pts, n, t0, t1, o = {}) {
    const c = o.c || K.cyan, r = o.r || u * .7, wrap = place(mk("div", "b-svg", o.parent), 0, 0, W, H);
    const pth = document.createElementNS(NS, "path"); pth.setAttribute("d", "M" + pts.map((p) => p.join(" ")).join(" L"));
    const sv = document.createElementNS(NS, "svg"); sv.setAttribute("width", W); sv.setAttribute("height", H); sv.style.overflow = "visible"; sv.append(pth); pth.setAttribute("fill", "none"); wrap.append(sv);
    const L = pth.getTotalLength(), stop = o.stop ?? 1, dots = [...Array(n)].map((_, i) => { const d = place(mk("div", "b-dot", wrap), 0, 0, r * 2, r * 2);
      Object.assign(d.style, { background: c, boxShadow: `0 0 ${u}px ${c}, 0 0 ${u * 2.4}px ${c}88`, marginLeft: -r + "px", marginTop: -r + "px" }); d.k = i / n; d.j = (rnd() - .5) * u * 1.6; return d; });
    const st = { p: 0 }, sp = o.speed || .22;
    const draw = () => dots.forEach((d) => { let f = (st.p * sp + d.k) % 1; if (o.pile) f = Math.min(f + d.k * .02, stop - d.k * .08); else if (f > stop) f = stop - (f - stop) * .15;
      const q = pth.getPointAtLength(Math.max(0, f) * L); d.style.left = q.x + "px"; d.style.top = q.y + d.j + "px"; });
    tl.fromTo(st, { p: 0 }, { p: t1 - t0, duration: Math.max(t1 - t0, .1), ease: "none", onUpdate: draw, immediateRender: true }, t0); draw();
    tl.fromTo(wrap, { opacity: 0 }, { opacity: 1, duration: .5, immediateRender: true }, t0);
    wrap.dots = dots; return wrap;
  }
  function meter(x, y, w, h, label, parent) {
    const e = place(mk("div", "b-meter", parent, `<div class="tr"><div class="f"></div></div><div class="v"></div><div class="lb">${label}</div>`), x, y, w, h);
    e.f = e.querySelector(".f"); e.v = e.querySelector(".v"); e.style.setProperty("--c", K.green); e.f.style.height = "20%"; e.v.style.top = "80%";
    e.set = (t, frac, c, txt, d = 1) => { tl.to(e.f, { height: frac * 100 + "%", duration: d, ease: E.io }, t); tl.to(e.v, { top: (1 - frac) * 100 + "%", duration: d, ease: E.io }, t);
      if (c) tl.to(e, { "--c": c, duration: d * .6 }, t); if (txt) tl.call(() => { e.v.textContent = txt; }, null, t + d * .5); };
    return e;
  }
  function spark(x, y, t, c = K.red, parent) {  // short burst of 6 rays
    const e = place(mk("div", "b-svg", parent), x - u * 4, y - u * 4, u * 8, u * 8);
    e.innerHTML = `<svg width="${u * 8}" height="${u * 8}" style="overflow:visible;filter:drop-shadow(0 0 ${u * .6}px ${c})">${[...Array(6)].map((_, i) => { const a = i * Math.PI / 3, r0 = u * 1.4, r1 = u * 3.4;
      return `<line x1="${u * 4 + Math.cos(a) * r0}" y1="${u * 4 + Math.sin(a) * r0}" x2="${u * 4 + Math.cos(a) * r1}" y2="${u * 4 + Math.sin(a) * r1}" stroke="${c}" stroke-width="${u * .35}" stroke-linecap="round"/>`; }).join("")}</svg>`;
    tl.fromTo(e, { scale: .3, opacity: 0 }, { scale: 1.1, opacity: 1, duration: .25, ease: E.in, immediateRender: true }, t); tl.to(e, { opacity: 0, scale: 1.3, duration: .35 }, t + .3);
    return e;
  }

  /* 3D: blood vessel fly-through. Tube seen from inside, red blood cells and cyan glucose drift along it; v.update drives the camera.
     st.p = camera position along the vessel (tween it), st.g = glucose opacity 0..1 (tween it). */
  function glowTex(c) { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const g = cv.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, c); gr.addColorStop(.25, c + "aa"); gr.addColorStop(1, c + "00"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); }
  function vessel(v, o = {}) {
    const T = THREE, pts = [...Array(8)].map((_, i) => new T.Vector3(Math.sin(i * .9) * 1.6, Math.cos(i * .7) * .9, -i * 6));
    const curve = new T.CatmullRomCurve3(pts), R = o.r || 1.25;
    const wall = new T.Mesh(new T.TubeGeometry(curve, 240, R, 48, false), new T.MeshStandardMaterial({ color: 0x3a0a14, emissive: 0x14040a, roughness: .6, metalness: .05, side: T.BackSide }));
    v.scene.add(wall); v.scene.fog = new T.FogExp2(0x0A0E17, .12);
    const lamp = new T.PointLight(0xffc8c0, 1.1, 10, 1.8); v.scene.add(lamp);
    const rbcGeo = new T.TorusGeometry(.17, .09, 12, 24), rbcMat = new T.MeshStandardMaterial({ color: 0xd0202f, emissive: 0x3a0508, roughness: .4 });
    const sprC = new T.SpriteMaterial({ map: glowTex("#00F0FF"), blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
    const gluMat = new T.MeshBasicMaterial({ color: 0x9ffcff, transparent: true, opacity: 0 });
    const items = [];
    for (let i = 0; i < (o.rbc || 70); i++) { const m = new T.Mesh(rbcGeo, rbcMat); m.rotation.set(rnd() * 6, rnd() * 6, 0); v.scene.add(m); items.push({ m, q: rnd(), a: rnd() * 6.28, rr: R * (.25 + rnd() * .55), sp: .006 + rnd() * .006, spin: rnd() }); }
    for (let i = 0; i < (o.glu || 90); i++) { const g = new T.Group(), core = new T.Mesh(new T.IcosahedronGeometry(.045, 0), gluMat), halo = new T.Sprite(sprC); halo.scale.setScalar(.32); g.add(core, halo); v.scene.add(g);
      items.push({ m: g, q: rnd(), a: rnd() * 6.28, rr: R * (.1 + rnd() * .7), sp: .008 + rnd() * .008, spin: 0 }); }
    const st = { p: 0.02, g: 0 }, nrm = new T.Vector3(), bin = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    v.update = (t) => {
      const p = Math.min(st.p, .9), cp = curve.getPointAt(p), la = curve.getPointAt(Math.min(p + .03, 1));
      v.cam.position.copy(cp); v.cam.lookAt(la); lamp.position.copy(cp); gluMat.opacity = st.g; sprC.opacity = st.g * .9;
      items.forEach((it) => { const q = (it.q + t * it.sp) % 1, c = curve.getPointAt(q), tg = curve.getTangentAt(q); nrm.crossVectors(tg, up).normalize(); bin.crossVectors(tg, nrm).normalize();
        it.m.position.copy(c).addScaledVector(nrm, Math.cos(it.a + t * .2) * it.rr).addScaledVector(bin, Math.sin(it.a + t * .2) * it.rr);
        if (it.spin) { it.m.rotation.x += 0; it.m.rotation.y = it.spin * 6 + t * .6; } });
    };
    return { curve, st, wall };
  }
  // spring() feel (Remotion-like damped spring) as a GSAP ease; SVG feGaussianBlur glow filters #gC #gG #gA #gR for vector parts
  const spring = (t) => 1 - Math.exp(-6.5 * t) * Math.cos(9.5 * t);
  E.spring = spring;
  const defs = document.createElement("div"); defs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  defs.innerHTML = `<svg width="0" height="0"><defs>${[["gC", K.cyan], ["gG", K.green], ["gA", K.amber], ["gR", K.red]].map(([id, c]) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="${u * .9}" result="b"/><feFlood flood-color="${c}" flood-opacity=".9"/><feComposite in2="b" operator="in" result="g"/>
    <feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`).join("")}</defs></svg>`;
  document.documentElement.append(defs);  // bio.js runs in <head>: body does not exist yet
  window.B = { K, spring, dbg, glow, breathe, badge, aiPhoto, cell, tintCell, key, organ, flow, meter, spark, svg };
  window.B3 = { vessel };
})();
