/* smoke_kit science parts (16_Lung_Cancer), loaded after sm.js: lungs (X-ray outline, airway tree, alveoli, oxygen, tumour),
   body (outline + spread lines to brain / bones / liver / adrenal), cells (orderly sheet that renews, then one cell divides out of control),
   dna (ladder that snaps), people (icon rows for % of people), donut (split ring), cal (calendar strip), dial (gauge with needle). */
(function () {
  const { W, H, D, V, u, K, tl, E, R, mk, place, out, show, svg } = SM;
  const st = document.createElement("style");
  st.textContent = `
  .sm-lab { position: absolute; white-space: nowrap; font: 600 ${u * (V ? 2.6 : 1.75)}px var(--font-script); letter-spacing: .14em; text-transform: uppercase; color: ${K.bone};
    padding: ${u * .25}px ${u * .8}px; background: #0e0c0bcc; border-bottom: ${u * .3}px solid var(--c, ${K.ice}); }
  .sm-cal { position: absolute; display: flex; gap: ${u * .6}px; }
  .sm-cal .c { flex: 1; border: ${Math.max(1, u * .15)}px solid #ffffff30; background: #17130fd8; display: flex; flex-direction: column; align-items: center; justify-content: center;
    font: 700 ${u * (V ? 2.6 : 1.8)}px var(--font-script); letter-spacing: .1em; color: ${K.mute}; position: relative; overflow: hidden; }
  .sm-cal .c .f { position: absolute; inset: 0; background: var(--c, ${K.em}); transform-origin: 0 50%; opacity: .85; }
  .sm-cal .c span { position: relative; color: ${K.bone}; font-size: 1.25em; text-shadow: 0 0 ${u * .6}px #000; }
  .sm-cal .c b { position: relative; font: 800 ${u * (V ? 4.4 : 3.2)}px var(--font-head); color: ${K.bone}; }`;
  document.head.append(st);
  const lab = (parent, txt, x, y, t, c, until) => { const l = place(mk("div", "sm-lab", parent, txt), x, y); l.style.setProperty("--c", c || K.ice);
    show(l, t, { opacity: 0, y: u * 2 }, .45, E.snap); if (until) out(l, until); return l; };

  /* lungs: box w = h * 1.05 at (x,y). o: c, alv (alveoli time), o2 (oxygen dots time), tumor (time), tumorGrow (s), smoke (time: lungs darken),
     d (draw length). Returns element; e.pt(px,py) -> frame coordinates of a point in 0-100 lung units. */
  function lungs(x, y, h, t, o = {}) {
    const w = h * 1.05, sx = w / 100, sy = h / 100, c = o.c || K.ice, e = place(mk("div", "sm-fx", o.parent), x, y, w, h); e.style.zIndex = o.z ?? 8;
    const P = (px, py) => `${(px * sx).toFixed(1)},${(py * sy).toFixed(1)}`;
    const LL = `M${P(44, 20)} C${P(28, 15)} ${P(12, 34)} ${P(9, 60)} C${P(6, 82)} ${P(10, 95)} ${P(19, 97)} C${P(30, 99)} ${P(40, 94)} ${P(45, 87)} C${P(47, 68)} ${P(47, 40)} ${P(44, 20)} Z`;
    const LR = `M${P(56, 20)} C${P(72, 15)} ${P(88, 34)} ${P(91, 60)} C${P(94, 82)} ${P(90, 95)} ${P(81, 97)} C${P(71, 99)} ${P(61, 95)} ${P(56, 90)} C${P(59, 82)} ${P(53, 75)} ${P(56, 68)} C${P(58, 52)} ${P(57, 38)} ${P(56, 20)} Z`;
    const br = [], tips = []; let id = 0;
    const grow = (x0, y0, ang, len, lv) => { const x1 = x0 + Math.sin(ang) * len, y1 = y0 + Math.cos(ang) * len; br.push([`M${P(x0, y0)} L${P(x1, y1)}`, lv]); id++;
      if (lv >= 4) { tips.push([x1, y1]); return; } const sp = .35 + R(id, 7) * .3; grow(x1, y1, ang - sp, len * .72, lv + 1); grow(x1, y1, ang + sp * .9, len * .7, lv + 1); };
    grow(42, 38, -.55, 13, 1); grow(58, 38, .55, 13, 1); grow(40, 44, -.15, 14, 2); grow(60, 44, .15, 14, 2);
    const alv = tips.map(([px, py], i) => `<circle class="alv" cx="${px * sx}" cy="${py * sy}" r="${u * (.5 + R(i, 3) * .4)}" fill="${c}" opacity="0"/>`).join("");
    e.innerHTML = svg(w, h, `<defs><radialGradient id="lg${o.id || ""}" cx="50%" cy="45%" r="60%"><stop offset="0%" stop-color="${c}" stop-opacity=".22"/><stop offset="100%" stop-color="${c}" stop-opacity=".04"/></radialGradient></defs>
      <g class="lobes"><path d="${LL}" fill="url(#lg${o.id || ""})" stroke="${c}" stroke-width="${u * .28}" style="filter:drop-shadow(0 0 ${u}px ${c}aa)"/>
      <path d="${LR}" fill="url(#lg${o.id || ""})" stroke="${c}" stroke-width="${u * .28}" style="filter:drop-shadow(0 0 ${u}px ${c}aa)"/></g>
      <path class="tr" d="M${P(50, 0)} L${P(50, 30)} M${P(50, 30)} L${P(42, 38)} M${P(50, 30)} L${P(58, 38)}" fill="none" stroke="${K.bone}" stroke-width="${u * .7}" stroke-linecap="round"/>
      ${br.map(([d, lv]) => `<path class="br" data-l="${lv}" d="${d}" fill="none" stroke="${K.bone}" stroke-width="${u * (.55 - lv * .09)}" stroke-linecap="round" opacity=".85"/>`).join("")}
      ${alv}<g class="tum" opacity="0">${[0, 1, 2, 3, 4].map((i) => `<circle cx="${(26 + (R(i, 9) - .5) * 5) * sx}" cy="${(58 + (R(i, 8) - .5) * 5) * sy}" r="${u * (1.6 + R(i, 4) * 1.2)}" fill="${K.em}"/>`).join("")}</g>`);
    const q = (s) => e.querySelectorAll(s), d = o.d ?? 2.2;
    q(".lobes path, .tr").forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; tl.fromTo(p, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: d * .6, ease: E.io, immediateRender: true }, t); });
    tl.fromTo(q(".lobes path"), { fillOpacity: 0 }, { fillOpacity: 1, duration: .8, immediateRender: true }, t + d * .4);
    q(".br").forEach((p) => { const L = p.getTotalLength(), lv = +p.dataset.l; p.style.strokeDasharray = L;
      tl.fromTo(p, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: .35, ease: "power1.out", immediateRender: true }, (o.br ?? t + d * .5) + lv * .22); });
    if (o.alv != null) tl.to(q(".alv"), { opacity: .9, duration: .3, stagger: .015, ease: E.pop }, o.alv);
    if (o.o2 != null) { const dots = q(".alv"); tl.to(dots, { fill: "#ff5a4a", duration: .6, stagger: .01 }, o.o2); tl.to(dots, { attr: { r: u * 1.1 }, duration: .4, yoyo: true, repeat: 3, stagger: .01 }, o.o2); }
    if (o.smoke != null) { tl.to(q(".lobes path"), { fill: "#5a4a40", stroke: "#a88f7e", duration: 1.6, ease: E.soft }, o.smoke); tl.to(q(".br"), { stroke: "#8a7a6e", duration: 1.6 }, o.smoke); }
    if (o.tumor != null) { const g = e.querySelector(".tum"); g.style.transformOrigin = `${26 * sx}px ${58 * sy}px`; g.style.filter = `drop-shadow(0 0 ${u * 1.4}px ${K.em})`;
      tl.fromTo(g, { opacity: 0, scale: .1 }, { opacity: 1, scale: 1, duration: o.tumorGrow ?? 2.4, ease: "power2.inOut", immediateRender: false }, o.tumor); }
    tl.fromTo(e, { opacity: 0, scale: .92 }, { opacity: 1, scale: 1, duration: .6, ease: E.in, immediateRender: true }, t);
    e.pt = (px, py) => [x + px * sx, y + py * sy];
    if (o.until) out(e, o.until); return e;
  }
  /* body outline (front view) in a box h tall at (x,y); spread [[organ, t, label]] organs: brain, bone, liver, adrenal, lung, lymph */
  function body(x, y, h, t, o = {}) {
    const w = h * .5, sx = w / 100, sy = h / 200, c = o.c || K.ice, e = place(mk("div", "sm-fx", o.parent), x, y, w, h); e.style.zIndex = o.z ?? 8;
    const P = (px, py) => `${(px * sx).toFixed(1)},${(py * sy).toFixed(1)}`;
    const outline = `M${P(50, 2)} C${P(61, 2)} ${P(64, 12)} ${P(62, 20)} C${P(61, 26)} ${P(57, 29)} ${P(57, 32)} C${P(70, 34)} ${P(80, 36)} ${P(84, 46)} L${P(92, 98)} C${P(93, 104)} ${P(86, 105)} ${P(85, 99)}
      L${P(76, 56)} L${P(74, 100)} L${P(72, 192)} C${P(72, 198)} ${P(58, 198)} ${P(58, 192)} L${P(52, 112)} L${P(48, 112)} L${P(42, 192)} C${P(42, 198)} ${P(28, 198)} ${P(28, 192)} L${P(26, 100)}
      L${P(24, 56)} L${P(15, 99)} C${P(14, 105)} ${P(7, 104)} ${P(8, 98)} L${P(16, 46)} C${P(20, 36)} ${P(30, 34)} ${P(43, 32)} C${P(43, 29)} ${P(39, 26)} ${P(38, 20)} C${P(36, 12)} ${P(39, 2)} ${P(50, 2)} Z`;
    const ORG = { brain: [50, 10], lung: [41, 46], liver: [42, 66], adrenal: [57, 72], bone: [61, 150], lymph: [55, 38] };
    e.innerHTML = svg(w, h, `<path class="ol" d="${outline}" fill="${c}10" stroke="${c}" stroke-width="${u * .25}" style="filter:drop-shadow(0 0 ${u * .8}px ${c}88)"/>
      <path class="sp" d="M${P(50, 34)} L${P(50, 108)}" stroke="${c}66" stroke-width="${u * .5}" stroke-dasharray="${u * .6} ${u * .5}"/>
      <path d="M${P(44, 38)} C${P(32, 40)} ${P(32, 58)} ${P(40, 60)} C${P(47, 60)} ${P(48, 46)} ${P(46, 38)} Z M${P(56, 38)} C${P(68, 40)} ${P(68, 58)} ${P(60, 60)} C${P(53, 60)} ${P(52, 46)} ${P(54, 38)} Z"
        fill="${c}22" stroke="${c}aa" stroke-width="${u * .15}"/>`);
    const ol = e.querySelector(".ol"), L = ol.getTotalLength(); ol.style.strokeDasharray = L;
    tl.fromTo(ol, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.4, ease: E.io, immediateRender: true }, t);
    tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: .4, immediateRender: true }, t);
    const fx = (k) => [ORG[k][0] * sx, ORG[k][1] * sy], src = fx("lung");
    const tum = place(mk("div", "sm-dot", e), src[0] - u * 1.2, src[1] - u * 1.2, u * 2.4, u * 2.4); tum.style.background = K.em; tum.style.boxShadow = `0 0 ${u * 2}px ${K.em}`;
    tl.fromTo(tum, { scale: 0 }, { scale: 1, duration: .6, ease: E.pop, immediateRender: true }, o.tumor ?? t + .8);
    (o.spread || []).forEach(([k, tt, txt], i) => { const [ax, ay] = fx(k), mx = (src[0] + ax) / 2 + (i % 2 ? 1 : -1) * w * .25, my = (src[1] + ay) / 2;
      const g = mk("div", "sm-fx", e); g.innerHTML = svg(w, h, `<path d="M${src[0]},${src[1]} Q${mx},${my} ${ax},${ay}" fill="none" stroke="${K.em}" stroke-width="${u * .3}" stroke-dasharray="${u * .8} ${u * .5}"/>`);
      const p = g.querySelector("path"), PL = p.getTotalLength(); p.style.strokeDasharray = `${PL}`; tl.fromTo(p, { strokeDashoffset: PL }, { strokeDashoffset: 0, duration: .7, ease: E.io, immediateRender: true }, tt);
      const dt = place(mk("div", "sm-dot", e), ax - u * 1, ay - u * 1, u * 2, u * 2); dt.style.background = K.em; dt.style.boxShadow = `0 0 ${u * 1.6}px ${K.em}`;
      tl.fromTo(dt, { scale: 0 }, { scale: 1, duration: .45, ease: E.pop, immediateRender: true }, tt + .6);
      if (txt) { const side = ax > w / 2 ? 1 : -1, l = lab(e, txt, side > 0 ? ax + u * 2.5 : ax - u * 2.5, ay - u * 1.6, tt + .65, K.em); if (side < 0) l.style.transform = "translateX(-100%)"; } });
    e.pt = (k) => { const [a, b] = fx(k); return [x + a, y + b]; };
    if (o.until) out(e, o.until); return e;
  }
  /* cells: canvas sheet of cells in box. renew [t0,t1]: old cells fade, new ones pop; chaos t: one cell turns ember and divides out of control
     (cluster grows to n cells by t + grow). damage t: nuclei flicker ember. */
  function cells(box, t, o = {}) {
    const cv = place(mk("canvas", "sm-fx", o.parent), ...box); cv.width = Math.round(box[2]); cv.height = Math.round(box[3]); cv.style.zIndex = o.z ?? 6;
    const g = cv.getContext("2d"), cw = cv.width, ch = cv.height, s = (o.size ?? 7) * u, cols = Math.ceil(cw / s) + 1, rows = Math.ceil(ch / (s * .87)) + 1;
    const ice = K.ice, em = K.em, cx0 = cw * (o.cx ?? .5), cy0 = ch * (o.cy ?? .5), maxN = o.n ?? 160, grow = o.grow ?? 5;
    const sheet = []; for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) sheet.push([q * s + (r % 2) * s / 2, r * s * .87, R(r * 50 + q, 2)]);
    const draw = (tt) => {
      g.clearRect(0, 0, cw, ch);
      const k = o.chaos != null ? Math.max(0, Math.min(1, (tt - o.chaos) / grow)) : 0, nc = Math.floor(1 + (maxN - 1) * k * k);
      const rad = Math.sqrt(nc) * s * .5;
      sheet.forEach(([px, py, rn]) => {
        let a = 1, sc = 1;
        if (o.renew) { const ph = ((tt - o.renew[0]) / 1.6 + rn * 3) % 3; if (tt > o.renew[0] && tt < o.renew[1] && ph < 1) { a = ph < .5 ? 1 - ph * 2 : (ph - .5) * 2; sc = ph < .5 ? 1 : .5 + (ph - .5); } }
        const dist = Math.hypot(px - cx0, py - cy0); if (dist < rad) return;
        const dmg = o.damage != null && tt > o.damage && rn > .55 ? (Math.sin(tt * 9 + rn * 20) > 0 ? 1 : .4) : 0;
        g.globalAlpha = a * .9; g.strokeStyle = ice + "99"; g.lineWidth = u * .18; g.fillStyle = "#9cc4e412";
        g.beginPath(); g.arc(px, py, s * .44 * sc, 0, 6.283); g.fill(); g.stroke();
        g.fillStyle = dmg ? em : ice + "aa"; g.beginPath(); g.arc(px + s * .05, py - s * .04, s * .15 * sc, 0, 6.283); g.fill();
      });
      for (let i = 0; i < nc && k > 0; i++) { const ang = i * 2.39996, rr = Math.sqrt(i) * s * .5, px = cx0 + Math.cos(ang) * rr, py = cy0 + Math.sin(ang) * rr;
        const born = Math.min(1, (nc - i) / 3); g.globalAlpha = .95; g.fillStyle = "#ff6a2a40"; g.strokeStyle = em; g.lineWidth = u * .22;
        g.beginPath(); g.arc(px, py, s * .44 * born, 0, 6.283); g.fill(); g.stroke(); g.fillStyle = em; g.beginPath(); g.arc(px, py, s * .17 * born, 0, 6.283); g.fill(); }
      g.globalAlpha = 1;
    };
    const v = { t: 0 }; draw(0);
    tl.fromTo(v, { t: 0 }, { t: D, duration: D, ease: "none", immediateRender: true, onUpdate: () => draw(v.t) }, 0);
    tl.fromTo(cv, { opacity: 0 }, { opacity: 1, duration: .8, ease: E.soft, immediateRender: true }, t);
    if (o.until) out(cv, o.until, .5); return cv;
  }
  /* dna ladder across (x,y,w,h): draws on at t; snap at o.snap (centre rungs break ember, halves drift apart) */
  function dna(x, y, w, h, t, o = {}) {
    const e = place(mk("div", "sm-fx", o.parent), x, y, w, h); e.style.zIndex = o.z ?? 9; const n = 22, half = (side) => {
      let a = "", b = "", rungs = ""; for (let i = 0; i <= n; i++) { const px = i / n * w, ph = i / n * 6.283 * 2, y1 = h / 2 + Math.sin(ph) * h * .38, y2 = h / 2 - Math.sin(ph) * h * .38;
        if ((side === 0 && i > n / 2) || (side === 1 && i < n / 2)) continue;
        a += (a ? " L" : "M") + px.toFixed(1) + "," + y1.toFixed(1); b += (b ? " L" : "M") + px.toFixed(1) + "," + y2.toFixed(1);
        rungs += `<line class="${Math.abs(i - n / 2) < 2 ? "brk" : ""}" x1="${px}" y1="${y1}" x2="${px}" y2="${y2}" stroke="${i % 2 ? K.bone : K.ice}" stroke-width="${u * .35}" opacity=".8"/>`; }
      return `<g class="h${side}">${rungs}<path d="${a}" fill="none" stroke="${K.ice}" stroke-width="${u * .55}" style="filter:drop-shadow(0 0 ${u * .6}px ${K.ice})"/>
        <path d="${b}" fill="none" stroke="${K.ice}" stroke-width="${u * .55}" style="filter:drop-shadow(0 0 ${u * .6}px ${K.ice})"/></g>`; };
    e.innerHTML = svg(w, h, half(0) + half(1));
    tl.fromTo(e, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: E.io, immediateRender: true }, t);
    tl.to(e.querySelectorAll("line"), { opacity: .35, duration: .6, yoyo: true, repeat: Math.max(1, Math.floor(D / 1.2)), stagger: .05, ease: E.soft }, t + 1.2);
    if (o.snap != null) { const [h0, h1] = [e.querySelector(".h0"), e.querySelector(".h1")];
      tl.to(e.querySelectorAll(".brk"), { stroke: K.em, opacity: 1, duration: .2 }, o.snap - .3);
      tl.to(h0, { x: -u * 3, y: u * 2, rotation: -4, svgOrigin: `${w / 2} ${h / 2}`, duration: .6, ease: E.snap }, o.snap);
      tl.to(h1, { x: u * 3, y: -u * 2, rotation: 5, svgOrigin: `${w / 2} ${h / 2}`, duration: .6, ease: E.snap }, o.snap);
      tl.to(e.querySelectorAll(".brk"), { opacity: 0, duration: .4 }, o.snap + .2); SM.ring(x + w / 2, y + h / 2, o.snap, { r: h * .6, n: 2, parent: o.parent }); }
    if (o.until) out(e, o.until); return e;
  }
  /* people icons: n in cols inside box; lit coloured from t + lag one by one */
  function people(n, lit, cols, box, t, o = {}) {
    const e = place(mk("div", "sm-fx", o.parent), ...box), rows = Math.ceil(n / cols), s = Math.min(box[2] / cols, box[3] / rows); e.style.zIndex = o.z ?? 10;
    const ic = (c) => `<svg width="${s * .8}" height="${s * .8}" viewBox="0 0 20 20"><circle cx="10" cy="5.5" r="3.8" fill="${c}"/><path d="M3 19 C3 11 17 11 17 19 Z" fill="${c}"/></svg>`;
    const c = o.c || K.ice, ps = [], on = [];
    for (let i = 0; i < n; i++) { const p = place(mk("div", "sm-fx", e, ic("#4a403a")), (i % cols) * s + s * .1, Math.floor(i / cols) * s + s * .1, s * .8, s * .8); ps.push(p);
      if (i < lit) { const l = mk("div", "sm-fx", p, ic(c)); l.style.opacity = 0; on.push(l); } }
    tl.fromTo(ps, { opacity: 0, y: u }, { opacity: 1, y: 0, duration: .25, stagger: { each: Math.min(.015, .7 / n) }, immediateRender: true }, t);
    if (on.length) tl.to(on, { opacity: 1, duration: .15, stagger: Math.min(.03, 1.2 / on.length) }, t + (o.lag ?? .8));
    if (o.until) out(e, o.until); return e;
  }
  /* donut: parts [[pct, colour, label]] drawn from t; centre text o.mid */
  function donut(x, y, r, t, parts, o = {}) {
    const e = place(mk("div", "sm-fx", o.parent), x - r, y - r, r * 2, r * 2); e.style.zIndex = o.z ?? 10; const sw = r * .22, rr = r - sw / 2, C = 6.283 * rr; let acc = 0;
    e.innerHTML = svg(r * 2, r * 2, `<circle cx="${r}" cy="${r}" r="${rr}" fill="none" stroke="#2a231f" stroke-width="${sw}"/>` + parts.map(([p, c], i) => {
      const s = `<circle class="pt" cx="${r}" cy="${r}" r="${rr}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-dasharray="0 ${C}" transform="rotate(${-90 + acc * 3.6} ${r} ${r})" data-l="${p / 100 * C}"/>`; acc += p; return s; }).join(""));
    e.querySelectorAll(".pt").forEach((c, i) => { const L = +c.dataset.l; tl.fromTo(c, { attr: { "stroke-dasharray": `0 ${C}` } }, { attr: { "stroke-dasharray": `${L} ${C}` }, duration: .9, ease: E.io, immediateRender: true }, (parts[i][3] ?? t + i * .9)); });
    if (o.mid) { const m = mk("div", "sm-te", e, o.mid); Object.assign(m.style, { left: 0, width: r * 2 + "px", top: r - u * 3 + "px", textAlign: "center" }); show(m, t + .3, { opacity: 0 }, .4); }
    tl.fromTo(e, { opacity: 0, rotation: -30, scale: .8 }, { opacity: 1, rotation: 0, scale: 1, duration: .7, ease: E.in, immediateRender: true }, t);
    if (o.until) out(e, o.until); return e;
  }
  /* calendar strip: labels [] cells at (x,y,w,h); fill each from o.from + i * o.step in colour c; big label o.top */
  function cal(labels, x, y, w, h, t, o = {}) {
    const e = place(mk("div", "sm-cal", o.parent), x, y, w, h); e.style.zIndex = o.z ?? 11; if (o.c) e.style.setProperty("--c", o.c);
    const cs = labels.map((l) => mk("div", "c", e, `<div class="f"></div><span>${l}</span>`));
    tl.fromTo(cs, { opacity: 0, y: u * 3 }, { opacity: 1, y: 0, duration: .4, stagger: .06, ease: E.snap, immediateRender: true }, t);
    cs.forEach((c, i) => tl.fromTo(c.querySelector(".f"), { scaleX: 0 }, { scaleX: 1, duration: (o.step ?? .5) * .9, ease: "none", immediateRender: true }, (o.from ?? t + .6) + i * (o.step ?? .5)));
    if (o.until) out(e, o.until); return e;
  }
  /* dial gauge: semicircle at (x,y) radius r; needle from a0 to a1 (0-1) at t2; label; zone colour */
  function dial(x, y, r, t, o = {}) {
    const e = place(mk("div", "sm-fx", o.parent), x - r, y - r, r * 2, r * 1.3); e.style.zIndex = o.z ?? 11; const c = o.c || K.ice;
    const arc = (a0, a1) => { const p = (a) => [r + Math.cos(Math.PI * (1 + a)) * r * .85, r + Math.sin(Math.PI * (1 + a)) * r * .85]; const [x0, y0] = p(a0), [x1, y1] = p(a1);
      return `M${x0},${y0} A${r * .85},${r * .85} 0 0 1 ${x1},${y1}`; };
    e.innerHTML = svg(r * 2, r * 1.3, `<path d="${arc(0, .7)}" fill="none" stroke="#3a312b" stroke-width="${r * .14}"/><path d="${arc(.7, 1)}" fill="none" stroke="${K.em}" stroke-width="${r * .14}"/>
      <g class="nd"><line x1="${r}" y1="${r}" x2="${r - r * .72}" y2="${r}" stroke="${c}" stroke-width="${u * .5}" stroke-linecap="round"/><circle cx="${r}" cy="${r}" r="${u * 1.1}" fill="${c}"/></g>`);
    const nd = e.querySelector(".nd"); gsap.set(nd, { rotation: (o.a0 ?? .3) * 180, svgOrigin: `${r} ${r}` });
    if (o.label) { const l = lab(e, o.label, 0, r * 1.1, t + .2, c); l.style.left = r + "px"; l.style.transform = "translateX(-50%)"; }
    show(e, t, { opacity: 0, y: u * 3 }, .5, E.snap);
    if (o.t2 != null) tl.to(nd, { rotation: (o.a1 ?? 1) * 180, svgOrigin: `${r} ${r}`, duration: .7, ease: o.jam ? "back.out(3)" : E.io }, o.t2);
    if (o.until) out(e, o.until); return e;
  }
  Object.assign(SM, { lab, lungs, body, cells, dna, people, donut, cal, dial });
})();
