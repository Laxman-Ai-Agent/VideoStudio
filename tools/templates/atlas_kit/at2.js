/* atlas_kit graphics (13_Aging_150): 3D instruction book with ribbon bookmarks, 3D DNA helix, drawn paths, year ruler,
   line chart (solid + dashed extrapolation), bars, gauge ring, dot grid, lens close-up, switches, arrows. Needs at.js first. */
(function () {
  const A = window.AT, { W, H, D, V, u, K, tl, E, SANS, mk, place, out, ff, src } = A;
  const svgNS = (w = W, h = H) => `<svg width="${w}" height="${h}" style="position:absolute;left:0;top:0;overflow:visible">`;
  let uid = 0;

  /* 3D book: opens at t, pages flip, ribbons hang from the top edge. o: ribbons [[label, colour, x0..1]], flips n, tilt */
  function book(b, t, o = {}) {
    const [x, y, w, h] = b, L = place(mk("div", "", o.parent), x, y, w, h);
    Object.assign(L.style, { position: "absolute", perspective: u * 220 + "px" });
    const S3 = mk("div", "", L); Object.assign(S3.style, { position: "absolute", inset: 0, transformStyle: "preserve-3d" });
    gsap.set(S3, { rotationX: o.tilt ?? 38, rotationZ: o.rz ?? -6 });
    const half = w / 2, pg = (cls, left) => { const p = mk("div", "", S3); Object.assign(p.style, { position: "absolute", top: 0, left: left + "px", width: half + "px", height: h + "px",
      background: "linear-gradient(90deg, #f7f3e8, #fffdf6 40%, #efe9da)", boxShadow: `inset ${left ? "" : "-"}${u * 1.2}px 0 ${u * 2}px #0000001a`, transformStyle: "preserve-3d" });
      for (let r = 0; r < 12; r++) { const l = mk("i", "", p); Object.assign(l.style, { position: "absolute", left: "12%", top: (12 + r * 6.4) + "%", height: u * .5 + "px",
        width: (55 + (r * 31 + left) % 28) + "%", background: "#13241d26", borderRadius: "2px" }); }
      return p; };
    const base = mk("div", "", S3); Object.assign(base.style, { position: "absolute", left: -u + "px", top: -u + "px", width: w + 2 * u + "px", height: h + 2 * u + "px",
      background: o.cover || K.green, borderRadius: u * .6 + "px", transform: `translateZ(${-u * 1.5}px)`, boxShadow: `0 ${u * 3}px ${u * 6}px #13241d55` });
    const lp = pg("l", 0), rp = pg("r", half);
    const flips = [...Array(o.flips ?? 4)].map((_, i) => { const f = pg("f", half); f.style.transformOrigin = "0% 50%"; f.style.transform = `translateZ(${i * .5}px)`;
      tl.fromTo(f, { rotationY: 0 }, { rotationY: -178 + i * 1.5, duration: .9, ease: E.io, immediateRender: true }, t + .9 + i * .35); return f; });
    const cov = mk("div", "", S3); Object.assign(cov.style, { position: "absolute", left: half + "px", top: -u * .6 + "px", width: half + u * .6 + "px", height: h + u * 1.2 + "px",
      background: `linear-gradient(90deg, ${o.cover || K.green}, #0f5c40)`, transformOrigin: "0% 50%", borderRadius: `0 ${u * .6}px ${u * .6}px 0`, transformStyle: "preserve-3d",
      transform: `translateZ(${u * 2}px)` });
    ff(cov, t, { rotationY: 0 }, { rotationY: -176 }, 1.1, E.io);
    ff(L, t - .3, { opacity: 0, y: u * 8 }, { opacity: 1, y: 0 }, .7, E.snap);
    const ribbons = (o.ribbons || []).map(([lab, c, fx], i) => { const r = mk("div", "", S3);  /* wrapper (no clip) = strip + tag */
      Object.assign(r.style, { position: "absolute", left: w * fx + "px", top: -h * .08 + "px", width: u * 2.2 + "px", height: h * .62 + "px", transform: `translateZ(${u * 3}px)`, transformOrigin: "50% 0%" });
      const st = mk("div", "", r); Object.assign(st.style, { position: "absolute", inset: 0, background: c, clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 88%, 0 100%)" });
      const tag = mk("div", "at-chip", r, lab); Object.assign(tag.style, { left: u * 3 + "px", top: h * (.12 + i * .2) + "px", fontSize: u * (V ? 2.6 : 1.7) + "px" }); tag.style.setProperty("--c", c);
      ff(r, t + 2.4 + i * .3, { scaleY: 0 }, { scaleY: 1 }, .6, E.snap); return r; });
    L.ribbons = ribbons; L.spin = S3; L.flips = flips; L.pages = [lp, rp];
    if (o.until) out(L, o.until); return L;
  }
  /* bookmarks scatter: ribbons fly loose and twist (aging) */
  function scatter(bk, t) { bk.ribbons.forEach((r, i) => tl.to(r, { x: (i % 2 ? 1 : -1) * u * (10 + i * 6), y: u * (6 + i * 5), rotation: (i % 2 ? 1 : -1) * (40 + i * 25),
    rotationX: 50, duration: 1.4, ease: "power2.inOut" }, t + i * .15)); }

  /* 3D DNA helix: two strands of dots + rungs, spinning about Y. b = [cx, cy, height], o: r, n, c1, c2, spin (turns over D) */
  function helix(b, t, o = {}) {
    const [cx, cy, hh] = b, r = o.r || hh * .16, n = o.n || 22, L = place(mk("div", "", o.parent), cx, cy, 1, 1);
    Object.assign(L.style, { position: "absolute", perspective: u * 120 + "px" });
    const S3 = mk("div", "", L); Object.assign(S3.style, { position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d" });
    if (o.tilt) gsap.set(S3, { rotationZ: o.tilt });
    const ds = u * (o.dot ?? 1.5), items = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 4, yy = (i / (n - 1) - .5) * hh;
      [0, Math.PI].forEach((ph, s) => { const d = mk("div", "at-dot", S3); Object.assign(d.style, { width: ds + "px", height: ds + "px", left: -ds / 2 + "px", top: -ds / 2 + "px",
        background: s ? (o.c2 || K.vio) : (o.c1 || K.green), boxShadow: `0 0 ${u}px ${s ? (o.c2 || K.vio) : (o.c1 || K.green)}`,
        transform: `rotateY(${(a + ph) * 180 / Math.PI}deg) translateZ(${r}px) translateY(${yy}px)` }); items.push(d); });
      const g = mk("div", "", S3); Object.assign(g.style, { position: "absolute", left: -r + "px", top: yy - 1 + "px", width: 2 * r + "px", height: u * .35 + "px",
        background: `linear-gradient(90deg, ${o.c1 || K.green}, ${o.c3 || K.red}88, ${o.c2 || K.vio})`, transform: `rotateY(${a * 180 / Math.PI}deg)`, opacity: .75 }); items.push(g); }
    ff(items, t, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, stagger: .012 }, .4, E.pop);
    tl.fromTo(S3, { rotationY: 0 }, { rotationY: 360 * (o.spin ?? Math.max(D / 8, 1)), duration: Math.max(D - t, 1), ease: "none", immediateRender: true }, t);
    L.spin = S3; L.items = items; if (o.until) out(L, o.until); return L;
  }

  /* SVG path drawn over t..t+d; o: c, w (u), dash, glow, pulse (dot travels along) */
  function path(d, t, o = {}) { const L = place(mk("div", "at-fx", o.parent), 0, 0, W, H), c = o.c || K.red;
    L.innerHTML = svgNS() + `<path d="${d}" stroke="${c}" stroke-width="${u * (o.w ?? .5)}" fill="none" stroke-linecap="round" stroke-linejoin="round"
      ${o.glow ? `style="filter:drop-shadow(0 0 ${u * .8}px ${c})"` : ""}/></svg>`;
    const p = L.querySelector("path"), len = p.getTotalLength();
    if (o.dash) { p.style.strokeDasharray = `${u * 1.2} ${u * 1}`; ff(L, t, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }, o.d ?? 1.2, E.io); }
    else { p.style.strokeDasharray = len; ff(p, t, { strokeDashoffset: len }, { strokeDashoffset: 0 }, o.d ?? 1.2, E.io); }
    if (o.pulse) { const dot = place(mk("div", "at-dot", L), 0, 0, u * 1.8, u * 1.8); dot.style.setProperty("--c", o.pc || K.white); dot.style.boxShadow = `0 0 ${u * 1.5}px ${c}`;
      const v = { k: 0 }, mv = () => { const q = p.getPointAtLength(v.k * len); dot.style.left = q.x - u * .9 + "px"; dot.style.top = q.y - u * .9 + "px"; }; mv();
      tl.fromTo(v, { k: 0 }, { k: 1, duration: o.pd ?? 1.2, ease: "none", repeat: o.rep ?? 3, immediateRender: true, onUpdate: mv }, t + (o.d ?? 1.2)); }
    if (o.until) out(L, o.until); L.p = p; return L; }
  function arrow(x1, y1, x2, y2, t, o = {}) { const a = Math.atan2(y2 - y1, x2 - x1), s = u * 1.8, hx = (k) => `${x2 - s * Math.cos(a + k)} ${y2 - s * Math.sin(a + k)}`;
    return path(`M${x1} ${y1} L${x2} ${y2} M${hx(.5)} L${x2} ${y2} L${hx(-.5)}`, t, { d: .6, ...o }); }

  /* year ruler lo..hi in box [x, y, w]; ticks every step; mark(v, t, label, c) drops a pin */
  function ruler(lo, hi, b, t, o = {}) { const [x, y, w] = b, step = o.step || 10, L = place(mk("div", "at-fx", o.parent), 0, 0, W, H), c = o.c || K.ink;
    const bar = place(mk("div", "", L), x, y, w, u * .3); Object.assign(bar.style, { position: "absolute", background: c, transformOrigin: "0 50%" });
    ff(bar, t, { scaleX: 0 }, { scaleX: 1 }, .9, E.io);
    const X = (v) => x + (v - lo) / (hi - lo) * w;
    for (let v = lo; v <= hi; v += step) { const big = (v - lo) % (step * (o.major || 5)) === 0, tk = place(mk("div", "", L), X(v), y - (big ? u * 1.6 : u * .8), 2, big ? u * 1.9 : u * 1.1);
      Object.assign(tk.style, { position: "absolute", background: c, opacity: big ? .9 : .5 }); ff(tk, t + .9 * (v - lo) / (hi - lo), { scaleY: 0 }, { scaleY: 1 }, .3, E.snap);
      if (big) { const lb = place(mk("div", "at-k", L, v), X(v), y + u * 1.4); Object.assign(lb.style, { transform: "translateX(-50%)", fontSize: u * (V ? 2.4 : 1.6) + "px", letterSpacing: ".08em" });
        lb.style.setProperty("--c", K.mute); ff(lb, t + .9 * (v - lo) / (hi - lo), { opacity: 0 }, { opacity: 1 }, .3); } }
    L.X = X; L.mark = (v, tt, label, mc = K.red, o2 = {}) => { const px = X(v), pin = place(mk("div", "", L), px - u * .2, y - u * (o2.hi ?? 9), u * .4, u * (o2.hi ?? 9));
      Object.assign(pin.style, { position: "absolute", background: mc, transformOrigin: "50% 100%" }); ff(pin, tt, { scaleY: 0 }, { scaleY: 1 }, .5, E.snap);
      const dt = place(mk("div", "at-dot", L), px - u * 1.1, y - u * 1.1, u * 2.2, u * 2.2); dt.style.setProperty("--c", mc); ff(dt, tt, { scale: 0 }, { scale: 1 }, .4, E.pop);
      const lb = place(mk("div", "at-chip", L, label), px, y - u * (o2.hi ?? 9) - u * (V ? 6 : 4.6)); lb.style.setProperty("--c", mc); gsap.set(lb, { xPercent: -50 });
      ff(lb, tt + .2, { opacity: 0, y: u * 2 }, { opacity: 1, y: 0 }, .4, E.snap); A.rings(px, y, tt, { c: mc, parent: L }); return [pin, dt, lb]; };
    if (o.until) out(L, o.until); return L; }

  /* line chart in box: pts [[0..1, 0..1]]; o.dashFrom = index where the dashed (projected) part starts; axis hairlines */
  function chart(pts, t, o = {}) { const [x, y, w, h] = o.box || [W * .1, H * .2, W * .8, H * .55], c = o.c || K.red, L = place(mk("div", "at-fx", o.parent), 0, 0, W, H), id = "atc" + (uid++);
    const P2 = pts.map(([a, b]) => [x + a * w, y + (1 - b) * h]), seg = (arr) => "M" + arr.map((p) => p.join(" ")).join(" L"), k = o.dashFrom ?? P2.length;
    L.innerHTML = svgNS() + `<defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".25"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
      <path d="M${x} ${y} L${x} ${y + h} L${x + w} ${y + h}" stroke="${K.ink}" stroke-opacity=".45" stroke-width="2" fill="none"/>
      <path class="ar" d="${seg(P2.slice(0, k))} L${P2[k - 1][0]} ${y + h} L${P2[0][0]} ${y + h} Z" fill="url(#g${id})"/>
      <path class="ln" d="${seg(P2.slice(0, k))}" stroke="${c}" stroke-width="${u * .5}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      ${k < P2.length ? `<path class="ds" d="${seg(P2.slice(k - 1))}" stroke="${o.dc || c}" stroke-width="${u * .45}" fill="none" stroke-dasharray="${u * 1.4} ${u}"/>` : ""}</svg>`;
    const ln = L.querySelector(".ln"), len = ln.getTotalLength(), dd = o.d ?? 1.6; ln.style.strokeDasharray = len;
    ff(ln, t, { strokeDashoffset: len }, { strokeDashoffset: 0 }, dd, E.io); ff(L.querySelector(".ar"), t + dd * .5, { opacity: 0 }, { opacity: 1 }, .6, E.soft);
    const ds = L.querySelector(".ds"); if (ds) { tl.set(ds, { opacity: 0 }, 0); ff(ds, o.dt ?? t + dd, { opacity: 0, clipPath: "inset(0% 100% 0% 0%)" }, { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" }, o.dd ?? 1.4, E.io); }
    ff(L, t - .3, { opacity: 0 }, { opacity: 1 }, .3, E.soft); L.pts = P2; if (o.until) out(L, o.until); return L; }
  /* vertical bars (0..1) with labels, staggered growth */
  function bars(vals, labels, t, o = {}) { const [x, y, w, h] = o.box || [W * .1, H * .2, W * .8, H * .55], n = vals.length, bw = w / n * .55, L = place(mk("div", "at-fx", o.parent), 0, 0, W, H);
    const cs = o.cs || vals.map(() => o.c || K.red);
    L.bars = vals.map((v, i) => { const bx = x + (i + .5) * w / n - bw / 2, b = place(mk("div", "", L), bx, y + h * (1 - v), bw, h * v);
      Object.assign(b.style, { position: "absolute", background: cs[i], transformOrigin: "50% 100%", borderRadius: `${u * .6}px ${u * .6}px 0 0` });
      ff(b, t + i * (o.stag ?? .3), { scaleY: 0 }, { scaleY: 1 }, .8, E.snap);
      if (labels[i]) { const l = place(mk("div", "at-k", L, labels[i]), bx - bw, y + h + u * 1.4, bw * 3); l.style.textAlign = "center"; l.style.setProperty("--c", K.mute);
        l.style.fontSize = u * (V ? 2.4 : 1.6) + "px"; ff(l, t + i * (o.stag ?? .3), { opacity: 0 }, { opacity: 1 }, .4); }
      return b; });
    if (o.until) out(L, o.until); return L; }
  /* gauge ring filling to pct (0..1) with a counter inside */
  function gauge(pct, cx, cy, r, t, o = {}) { const L = place(mk("div", "at-fx", o.parent), 0, 0, W, H), c = o.c || K.green, sw = u * (o.w ?? 2), C2 = 2 * Math.PI * r;
    L.innerHTML = svgNS() + `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${K.ink}" stroke-opacity=".12" stroke-width="${sw}" fill="${o.fill || "none"}"/>
      <circle class="ar" cx="${cx}" cy="${cy}" r="${r}" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})" stroke-dasharray="${C2}" stroke-dashoffset="${C2}"/></svg>`;
    ff(L.querySelector(".ar"), t, { attr: { "stroke-dashoffset": C2 } }, { attr: { "stroke-dashoffset": C2 * (1 - pct) } }, o.d ?? 1.6, E.io);
    ff(L, t - .2, { opacity: 0, scale: .8, transformOrigin: `${cx}px ${cy}px` }, { opacity: 1, scale: 1 }, .5, E.snap);
    if (o.label !== false) { const n = A.count(0, Math.round(pct * 100), t, { parent: L, x: cx, y: cy - u * (o.ns ?? 7) * .5, size: o.ns ?? 7, fmt: (v) => Math.round(v) + "%", d: o.d ?? 1.6 });
      gsap.set(n, { xPercent: -50 }); n.style.color = c; }
    if (o.until) out(L, o.until); return L; }
  /* dot grid: n dots, first `on` coloured c, rest pale; box [x, y, w], cols */
  function dots(n, on, b, t, o = {}) { const [x, y, w] = b, cols = o.cols || 10, g = w / cols, ds = g * .62, L = place(mk("div", "at-fx", o.parent), 0, 0, W, H), list = [];
    for (let i = 0; i < n; i++) { const d = place(mk("div", "at-dot", L), x + (i % cols) * g, y + Math.floor(i / cols) * g, ds, ds);
      d.style.setProperty("--c", i < on ? (o.c || K.red) : (o.off || "#13241d22")); list.push(d); }
    ff(list, t, { scale: 0 }, { scale: 1, stagger: { each: (o.d ?? 1.2) / n, from: o.from || "start" } }, .3, E.pop);
    L.list = list; if (o.until) out(L, o.until); return L; }
  /* lens: circular close-up of picture k (zoom z at focus fx, fy) with a white rim; grows at t */
  function lens(k, cx, cy, r, t, o = {}) { const e = place(mk("div", "", o.parent), cx - r, cy - r, r * 2, r * 2), s = src(k), z = o.z || 2.4;
    Object.assign(e.style, { position: "absolute", borderRadius: "50%", overflow: "hidden", border: `${u * .7}px solid ${K.card}`, boxShadow: `0 ${u}px ${u * 5}px #13241d66`,
      background: s ? `url("${s}") no-repeat` : "#cfd6c8", backgroundSize: `${z * 100}%`, backgroundPosition: `${(o.fx ?? .5) * 100}% ${(o.fy ?? .5) * 100}%`, zIndex: 12 });
    ff(e, t, { scale: 0, rotation: -20 }, { scale: 1, rotation: 0 }, .7, E.pop);
    if (o.drift) tl.to(e, { backgroundPosition: o.drift, duration: Math.max(D - t - .7, 1), ease: "none" }, t + .7);
    if (o.until) out(e, o.until); return e; }
  /* toggle switch flipping OFF -> ON at `on`, label under it */
  function toggle(x, y, t, on, label, o = {}) { const L = place(mk("div", "", o.parent), x, y), w = u * (V ? 12 : 8), h = w * .52, c = o.c || K.green;
    L.style.position = "absolute"; const tr = mk("div", "", L), kn = mk("div", "", tr);
    Object.assign(tr.style, { position: "absolute", left: 0, top: 0, width: w + "px", height: h + "px", borderRadius: h + "px", background: "#13241d33", boxShadow: "inset 0 2px 6px #0003" });
    Object.assign(kn.style, { position: "absolute", left: h * .1 + "px", top: h * .1 + "px", width: h * .8 + "px", height: h * .8 + "px", borderRadius: "50%", background: K.white, boxShadow: "0 2px 6px #0004" });
    const lb = place(mk("div", "at-k", L, label), 0, h + u * 1.2); lb.style.setProperty("--c", K.ink); lb.style.fontSize = u * (V ? 2.5 : 1.7) + "px";
    ff(L, t, { opacity: 0, y: u * 3 }, { opacity: 1, y: 0 }, .5, E.snap);
    tl.to(kn, { x: w - h, duration: .35, ease: E.pop }, on); tl.to(tr, { background: c, duration: .3 }, on);
    if (o.until) out(L, o.until); return L; }
  Object.assign(A, { book, scatter, helix, path, arrow, ruler, chart, bars, gauge, dots, lens, toggle });
})();
