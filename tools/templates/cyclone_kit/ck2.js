/* cyclone_kit weather parts (10 Cyclone_Akwan). Needs ck.js (CK) and ck_geo.js (CKGEO: Natural Earth countries + India states, public domain).
   swirl  - canvas satellite cyclone: cloud arms turning anticlockwise, organisation keys (0 = loose blob, 1 = tight storm with an eye)
   bay    - weather map in a box: land, coast, India states; go (camera to a lon/lat view), pin, track, cone, ruler, arrow, state fill, scr
   cards  - row of dated cards on a timeline (three storms)
   ladder - intensity steps bottom -> top, marker climbs on the spoken stage names
   dial   - wind-speed dial with a danger band and a needle on keys
   xsec   - ocean cross-section: warm sea, rising moist air, L at the surface, inflow arrows, spinning cloud tower
   gauge  - fuel gauge (E..F) with needle keys
   wheel  - name drum that rolls and lands on one name
   mast   - port signal mast, signal hoisted at a time
   clock24 - clock face whose hand runs round (24 hours) */
(function () {
  const { W, H, D, V, u, K, tl, E, R, mk, place, out, show, svg, key, run, canvas } = CK;
  const G = window.CKGEO || { c: [], s: [] };

  function swirl(x, y, r, t, o = {}) {
    const b = [x - r * 1.25, y - r * 1.25, r * 2.5, r * 2.5], cv = canvas(b, o.z ?? 6, o.parent, .5), g = cv.getContext("2d");
    const cw = cv.width, c = cw / 2, rr = cw / 2.5, n = o.n ?? 380, ks = o.k || [[0, 1]], sp = o.spin ?? .5;
    cv.style.mixBlendMode = o.blend ?? "screen";
    run((tt) => { g.clearRect(0, 0, cw, cw); const org = key(ks, tt), eye = rr * .09 * Math.max(0, org - .35) / .65;
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < n; i++) { const d0 = Math.pow(R(i, 1), .8), arm = i % 4, w = (1 - org) * (R(i, 2) - .5) * 6.283;
        const ang = arm * 1.571 + Math.log(.05 + d0) * 2.4 * org + w - tt * sp * (1.4 / (.35 + d0)) + R(i, 3) * .5;
        const d = eye + d0 * (rr - eye) * (.55 + .45 * org), px = c + Math.cos(ang) * d, py = c + Math.sin(ang) * d * (o.flat ?? 1);
        const s = rr * (.05 + R(i, 4) * .11) * (1.2 - d0 * .5), a = (.11 + .1 * org) * (1 - d0 * .55);
        const gr = g.createRadialGradient(px, py, 0, px, py, s); gr.addColorStop(0, `rgba(235,246,252,${a})`); gr.addColorStop(1, "rgba(235,246,252,0)");
        g.fillStyle = gr; g.fillRect(px - s, py - s, s * 2, s * 2); }
      g.globalCompositeOperation = "source-over";
      if (eye > 1) { const gr = g.createRadialGradient(c, c, 0, c, c, eye * 1.6); gr.addColorStop(0, "rgba(3,10,16,.95)"); gr.addColorStop(.6, "rgba(3,10,16,.6)"); gr.addColorStop(1, "rgba(3,10,16,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(c, c, eye * 1.6, 0, 6.283); g.fill(); } });
    show(cv, t, { opacity: 0, scale: .4, rotation: 40 }, 1.2, E.in);
    if (o.until) out(cv, o.until, .5); return cv;
  }

  /* bay map. box [x,y,w,h]; o.view [lon0,lat0,lon1,lat1]; o.states true = India state lines; o.t */
  function bay(box, t, o = {}) {
    const [bx, by, bw, bh] = box, vw = o.view || [77, 6, 97, 23.5], kx = Math.cos((vw[1] + vw[3]) / 2 * Math.PI / 180);
    const s = Math.min(bw / ((vw[2] - vw[0]) * kx), bh / (vw[3] - vw[1])), ox = (bw - (vw[2] - vw[0]) * kx * s) / 2, oy = (bh - (vw[3] - vw[1]) * s) / 2;
    const px = (lon, lat) => [ox + (lon - vw[0]) * kx * s, oy + (vw[3] - lat) * s];
    const path = (rings) => rings.map((r) => { let d = ""; for (let i = 0; i < r.length; i += 2) { const [a, b2] = px(r[i], r[i + 1]); d += (i ? "L" : "M") + a.toFixed(1) + " " + b2.toFixed(1); } return d + "Z"; }).join("");
    const el = place(mk("div", "ck-map", o.parent), bx, by, bw, bh); el.style.position = "absolute"; el.style.overflow = "hidden"; el.style.zIndex = o.z ?? 4;
    if (o.frame !== false) { el.style.background = "radial-gradient(ellipse at 40% 60%, #0b2a3a, #051019 80%)"; el.style.boxShadow = `0 0 0 ${Math.max(1, u * .12)}px #3FE0FF40, 0 ${u * 2}px ${u * 6}px #000000b0`; el.style.borderRadius = u * .4 + "px"; }
    const sw = Math.max(1, u * .14);
    let grid = ""; for (let lo = Math.ceil(vw[0] / 5) * 5; lo <= vw[2]; lo += 5) { const [a] = px(lo, 0); grid += `<path d="M${a} -9999V9999" stroke="#3FE0FF" stroke-opacity=".08" stroke-width="${sw}"/>`; }
    for (let la = Math.ceil(vw[1] / 5) * 5; la <= vw[3]; la += 5) { const [, b2] = px(0, la); grid += `<path d="M-9999 ${b2}H9999" stroke="#3FE0FF" stroke-opacity=".08" stroke-width="${sw}"/>`; }
    const land = G.c.map((c) => `<path d="${path(c.r)}" fill="${K.land}" stroke="${K.cy}" stroke-opacity=".75" stroke-width="${sw * 1.2}" stroke-linejoin="round"/>`).join("");
    const st = o.states === false ? "" : G.s.map((c) => `<path data-n="${c.n}" d="${path(c.r)}" fill="transparent" stroke="#89A4B4" stroke-opacity=".35" stroke-width="${sw * .7}"/>`).join("");
    el.innerHTML = `<svg width="${bw}" height="${bh}" style="position:absolute;left:0;top:0;overflow:hidden"><g class="cam">${grid}${land}<g class="st">${st}</g><g class="fx"></g></g></svg>`;
    const cg = el.querySelector(".cam"), fx = el.querySelector(".fx"), NS = "http://www.w3.org/2000/svg";
    const m = { el, px, cur: { z: 1, tx: 0, ty: 0 } };
    const apply = (v) => cg.setAttribute("transform", `translate(${v.tx} ${v.ty}) scale(${v.z})`);
    m.view = (v2) => { const a = px(v2[0], v2[3]), b2 = px(v2[2], v2[1]), z = Math.min(bw / (b2[0] - a[0]), bh / (b2[1] - a[1]));
      return { z, tx: bw / 2 - z * (a[0] + b2[0]) / 2, ty: bh / 2 - z * (a[1] + b2[1]) / 2 }; };
    m.go = (v2, t2, d = 1.4) => { const to = m.view(v2), from = { ...m.cur }, v = { ...from };
      if (t2 <= 0) { Object.assign(v, to); apply(v); } else tl.fromTo(v, from, { ...to, duration: d, ease: E.io, immediateRender: false, onUpdate: () => apply(v) }, t2);
      m.cur = to; return m; };
    m.scr = (lon, lat, c = m.cur) => { const [a, b2] = px(lon, lat); return [bx + c.tx + a * c.z, by + c.ty + b2 * c.z]; };
    const add = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); fx.append(e); return e; };
    const k = () => 1 / m.cur.z;
    const label = (x, y, txt, c, sz, anchor = "start") => { const e = add("text", { x, y, fill: c, "font-family": "var(--font-script)", "font-weight": 700, "font-size": sz, "letter-spacing": sz * .08, "text-anchor": anchor,
      "paint-order": "stroke", stroke: "#030A10", "stroke-width": sz * .22 }); e.textContent = txt; return e; };
    m.pin = (lon, lat, txt, t2, o2 = {}) => { const [x, y] = px(lon, lat), c = o2.c || K.cy, f = k() * (o2.s ?? 1), sz = u * (V ? 3.6 : 3) * f;
      const g = document.createElementNS(NS, "g"); fx.append(g);
      const dot = add("circle", { cx: x, cy: y, r: u * .65 * f, fill: c }), ring = add("circle", { cx: x, cy: y, r: u * 2.2 * f, fill: "none", stroke: c, "stroke-width": u * .25 * f });
      g.append(dot, ring); let lb = null; if (txt) { lb = label(x + (o2.dx ?? 1.6) * u * f, y + (o2.dy ?? .8) * u * f, txt, o2.lc || K.ink, sz, o2.anchor); g.append(lb); }
      gsap.set(g, { opacity: 0 }); tl.fromTo(g, { opacity: 0 }, { opacity: 1, duration: .3, immediateRender: false }, t2);
      tl.fromTo(ring, { attr: { r: 0 }, opacity: 1 }, { attr: { r: u * 3.2 * f }, opacity: 0, duration: 1.4, ease: "power1.out", repeat: o2.pulse === false ? 0 : 3, immediateRender: false }, t2);
      if (o2.until) out(g, o2.until); return g; };
    /* track: pts [[lon, lat, label, t]], drawn segment by segment */
    m.track = (pts, o2 = {}) => { const c = o2.c || K.cy, f = k(), els = [];
      pts.forEach(([lon, lat, txt, t2], i) => { const [x, y] = px(lon, lat);
        if (i) { const [x0, y0] = px(pts[i - 1][0], pts[i - 1][1]), len = Math.hypot(x - x0, y - y0);
          const ln = add("path", { d: `M${x0} ${y0}L${x} ${y}`, stroke: c, "stroke-width": u * .35 * f, fill: "none", "stroke-dasharray": o2.dash ? `${u * f} ${u * .7 * f}` : `${len} ${len}`, "stroke-dashoffset": o2.dash ? 0 : len });
          if (!o2.dash) tl.fromTo(ln, { attr: { "stroke-dashoffset": len } }, { attr: { "stroke-dashoffset": 0 }, duration: .6, ease: E.io, immediateRender: true }, t2 - .6);
          else { gsap.set(ln, { opacity: 0 }); tl.to(ln, { opacity: 1, duration: .5 }, t2 - .5); } els.push(ln); }
        const dot = add("circle", { cx: x, cy: y, r: u * .8 * f, fill: K.deep, stroke: c, "stroke-width": u * .3 * f }); gsap.set(dot, { opacity: 0 });
        tl.to(dot, { opacity: 1, duration: .25 }, t2); els.push(dot);
        if (txt) { const lb = label(x + u * 1.6 * f, y - u * .9 * f, txt, c, u * (V ? 3.4 : 2.7) * f); gsap.set(lb, { opacity: 0 }); tl.to(lb, { opacity: 1, duration: .3 }, t2 + .1); els.push(lb); } });
      if (o2.until) els.forEach((e) => out(e, o2.until)); return els; };
    m.cone = (poly, t2, o2 = {}) => { const d = "M" + poly.map(([lo, la]) => px(lo, la).map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
      const e = add("path", { d, fill: o2.c || K.cy, "fill-opacity": .14, stroke: o2.c || K.cy, "stroke-opacity": .6, "stroke-width": u * .2 * k(), "stroke-dasharray": `${u * k()} ${u * .6 * k()}` });
      tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: .8, ease: E.soft, immediateRender: true }, t2); if (o2.until) out(e, o2.until); return e; };
    m.ruler = (a, b2, txt, t2, o2 = {}) => { const [x0, y0] = px(...a), [x1, y1] = px(...b2), f = k(), c = o2.c || K.yl, len = Math.hypot(x1 - x0, y1 - y0);
      const ln = add("path", { d: `M${x0} ${y0}L${x1} ${y1}`, stroke: c, "stroke-width": u * .25 * f, fill: "none", "stroke-dasharray": `${len} ${len}`, "stroke-dashoffset": len });
      tl.fromTo(ln, { attr: { "stroke-dashoffset": len } }, { attr: { "stroke-dashoffset": 0 }, duration: .8, ease: E.io, immediateRender: true }, t2);
      const lb = label((x0 + x1) / 2 + (o2.dx ?? 0) * u * f, (y0 + y1) / 2 + (o2.dy ?? -1) * u * f, txt, c, u * (V ? 4 : 3.2) * f, "middle"); gsap.set(lb, { opacity: 0 });
      tl.to(lb, { opacity: 1, duration: .3 }, t2 + .6); if (o2.until) { out(ln, o2.until); out(lb, o2.until); } return [ln, lb]; };
    m.arrow = (lon, lat, deg, len, txt, t2, o2 = {}) => { const [x, y] = px(lon, lat), f = k(), c = o2.c || K.yl, L = len * u * f, a = (deg - 90) * Math.PI / 180;
      const x1 = x + Math.cos(a) * L, y1 = y + Math.sin(a) * L, h = u * 1.4 * f, a1 = a + 2.6, a2 = a - 2.6;
      const e = add("path", { d: `M${x} ${y}L${x1} ${y1}M${x1 + Math.cos(a1) * h} ${y1 + Math.sin(a1) * h}L${x1} ${y1}L${x1 + Math.cos(a2) * h} ${y1 + Math.sin(a2) * h}`,
        stroke: c, "stroke-width": u * .45 * f, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" });
      let lb = null; if (txt) { lb = label(x1 + u * f, y1, txt, c, u * (V ? 3.6 : 3) * f); gsap.set(lb, { opacity: 0 }); tl.to(lb, { opacity: 1, duration: .3 }, t2 + .4); }
      tl.fromTo(e, { opacity: 0, scale: .3, svgOrigin: `${x} ${y}` }, { opacity: 1, scale: 1, duration: .6, ease: E.snap, immediateRender: true }, t2);
      if (o2.until) { out(e, o2.until); if (lb) out(lb, o2.until); } return e; };
    m.state = (name, t2, o2 = {}) => { const p = el.querySelector(`.st path[data-n="${name}"]`); if (!p) return null; const c = o2.c || K.red;
      tl.fromTo(p, { attr: { fill: "rgba(0,0,0,0)" } }, { attr: { fill: c }, fillOpacity: o2.a ?? .55, duration: .5, ease: E.soft, immediateRender: false }, t2);
      tl.to(p, { attr: { stroke: c }, strokeOpacity: 1, duration: .3 }, t2);
      if (o2.until) tl.to(p, { attr: { fill: "rgba(0,0,0,0)" }, duration: .3 }, o2.until); return p; };
    if (o.start) m.go(o.start, 0);
    tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: .6, ease: E.soft, immediateRender: true }, t);
    if (o.until) out(el, o.until); return m;
  }

  /* cards: [[top, big, sub, t, c]] across width w on a timeline line */
  function cards(items, x, y, w, h, o = {}) {
    const n = items.length, gap = u * 2, cw = (w - gap * (n - 1)) / n, line = place(mk("div", "", o.parent), x, y + h / 2, w, Math.max(2, u * .25));
    line.style.background = K.mute; line.style.position = "absolute"; line.style.zIndex = 11; line.style.transformOrigin = "0 50%";
    tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: E.io, immediateRender: true }, items[0][3] - .3);
    const els = items.map(([top, big, sub, t, c], i) => { const e = place(mk("div", "", o.parent), x + i * (cw + gap), y, cw, h);
      Object.assign(e.style, { position: "absolute", zIndex: 12, background: K.panel, borderTop: `${u * .6}px solid ${c || K.cy}`, padding: `${u * 1.4}px ${u * 1.6}px`, boxSizing: "border-box",
        boxShadow: `0 ${u * 1.5}px ${u * 5}px #000000b0`, color: K.ink, overflow: "hidden" });
      e.innerHTML = `<div style="font:700 ${u * (V ? 3 : 2.4)}px var(--font-script);letter-spacing:.16em;color:${c || K.cy}">${top}</div>` +
        `<div style="font:600 ${u * (V ? 10 : 8.4)}px var(--font-head);line-height:.95;text-transform:uppercase">${big}</div>` +
        `<div style="font:400 ${u * (V ? 4 : 3.4)}px var(--font);line-height:1.4;color:${K.mute}">${sub}</div>`;
      show(e, t, { opacity: 0, y: u * 8, scale: .9 }, .6, E.snap); return e; });
    if (o.until) [line, ...els].forEach((e) => out(e, o.until)); return els;
  }

  /* ladder: stages [[name, sub, t]] bottom -> top in box; the active step glows, marker climbs */
  function ladder(stages, x, y, w, h, o = {}) {
    const n = stages.length, sh = h / n, wrap = place(mk("div", "", o.parent), x, y, w, h); wrap.style.position = "absolute"; wrap.style.zIndex = o.z ?? 12;
    const cols = o.cols || [K.cy, "#5FD0E8", K.yl, K.or, K.red, "#C2185B"];
    const rows = stages.map(([nm, sub, t], i) => { const r = mk("div", "", wrap), c = cols[i % cols.length];
      Object.assign(r.style, { position: "absolute", left: (n - 1 - i) * w * .03 + "px", right: "0", top: (n - 1 - i) * sh + "px", height: sh - u * .8 + "px", display: "flex", alignItems: "center", gap: u * 1.4 + "px",
        background: K.panel, borderLeft: `${u * .6}px solid ${c}`, padding: `0 ${u * 1.6}px`, boxSizing: "border-box", opacity: .35 });
      r.innerHTML = `<span style="font:600 ${u * (V ? 6 : 5)}px var(--font-head);text-transform:uppercase;color:${K.ink};white-space:nowrap">${nm}</span>` +
        `<span style="font:700 ${u * (V ? 3 : 2.4)}px var(--font-script);letter-spacing:.1em;color:${c};white-space:nowrap">${sub || ""}</span>`;
      gsap.set(r, { opacity: 0 }); tl.to(r, { opacity: .35, duration: .3 }, (o.t ?? stages[0][2]) + i * .08);
      tl.to(r, { opacity: 1, boxShadow: `0 0 ${u * 3}px ${c}90`, duration: .4, ease: E.snap }, t);
      if (i < n - 1) tl.to(r, { boxShadow: "0 0 0 transparent", opacity: .7, duration: .3 }, stages[i + 1][2]); return r; });
    if (o.until) out(wrap, o.until); return { wrap, rows };
  }

  /* dial: wind speed. o.max, o.band [a,b], o.k [[t, v]], o.unit */
  function dial(x, y, r, t, o = {}) {
    const max = o.max || 200, band = o.band || [110, 130], a0 = -220, a1 = 40, ang = (v) => a0 + (a1 - a0) * v / max, rad = (d) => d * Math.PI / 180;
    const P2 = (d, rr) => [r + Math.cos(rad(d)) * rr, r + Math.sin(rad(d)) * rr], arc = (d0, d1, rr) => { const [xa, ya] = P2(d0, rr), [xb, yb] = P2(d1, rr); return `M${xa} ${ya}A${rr} ${rr} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${xb} ${yb}`; };
    let ticks = ""; for (let v = 0; v <= max; v += 10) { const [xa, ya] = P2(ang(v), r * .86), [xb, yb] = P2(ang(v), r * (v % 50 ? .8 : .74));
      ticks += `<path d="M${xa} ${ya}L${xb} ${yb}" stroke="${K.mute}" stroke-width="${u * (v % 50 ? .15 : .3)}"/>`;
      if (v % 50 === 0) { const [xt, yt] = P2(ang(v), r * .6); ticks += `<text x="${xt}" y="${yt + u}" fill="${K.mute}" font-family="var(--font-script)" font-weight="700" font-size="${u * 2.4}" text-anchor="middle">${v}</text>`; } }
    const e = place(mk("div", "", o.parent), x - r, y - r, r * 2, r * 2); e.style.position = "absolute"; e.style.zIndex = o.z ?? 12;
    e.innerHTML = svg(r * 2, r * 2, `<circle cx="${r}" cy="${r}" r="${r}" fill="${K.panel}" stroke="#3FE0FF40" stroke-width="${u * .2}"/>` +
      `<path d="${arc(a0, a1, r * .9)}" stroke="#ffffff20" stroke-width="${u * 1.2}" fill="none"/>` +
      `<path class="bd" d="${arc(ang(band[0]), ang(band[1]), r * .9)}" stroke="${K.red}" stroke-width="${u * 1.6}" fill="none"/>${ticks}` +
      `<g class="nd"><path d="M${r} ${r}L${r + r * .78} ${r}" stroke="${K.yl}" stroke-width="${u * .6}" stroke-linecap="round"/><circle cx="${r}" cy="${r}" r="${u * 1.4}" fill="${K.yl}"/></g>`);
    const ro = mk("div", "", e); Object.assign(ro.style, { position: "absolute", left: 0, right: 0, top: r * 1.3 + "px", textAlign: "center", font: `600 ${r * .3}px var(--font-head)`, color: K.ink });
    const un = `<span style="font:700 ${r * .09}px var(--font-script);color:${K.cy};letter-spacing:.1em"> ${o.unit || "KM/H"}</span>`;
    const nd = e.querySelector(".nd"), ks = o.k || [[t, 0]], v = { v: 0 }, set = () => { gsap.set(nd, { rotation: ang(v.v), svgOrigin: `${r} ${r}` }); ro.innerHTML = Math.round(v.v) + un; };
    set(); ks.forEach(([tt, vv], i) => tl.to(v, { v: vv, duration: i ? .9 : 1.2, ease: E.io, onUpdate: set }, tt));
    show(e, t, { opacity: 0, scale: .7 }, .7, E.snap); if (o.until) out(e, o.until); return e;
  }

  /* xsec: ocean cross-section in box. o.k = { heat, rise, low, inflow, spin } times */
  function xsec(box, t, o = {}) {
    const [x, y, w, h] = box, k = o.k || {}, cv = canvas(box, o.z ?? 8, o.parent, .5), g = cv.getContext("2d"), cw = cv.width, ch = cv.height, sea = ch * .7;
    const on = (tt, k2, d = 1) => (k[k2] == null ? 0 : Math.max(0, Math.min(1, (tt - k[k2]) / d)));
    run((tt) => { g.clearRect(0, 0, cw, ch); const ht = on(tt, "heat", 1.5), ri = on(tt, "rise", 1.5), lo = on(tt, "low"), inf = on(tt, "inflow"), spn = on(tt, "spin", 1.5);
      const sk = g.createLinearGradient(0, 0, 0, sea); sk.addColorStop(0, "#071a26"); sk.addColorStop(1, "#0d2c3c"); g.fillStyle = sk; g.fillRect(0, 0, cw, sea);
      const sg = g.createLinearGradient(0, sea, 0, ch); sg.addColorStop(0, `rgb(${30 + 200 * ht},${90 + 40 * ht},${140 - 90 * ht})`); sg.addColorStop(1, "#04121c"); g.fillStyle = sg;
      g.beginPath(); g.moveTo(0, ch); for (let i = 0; i <= 60; i++) g.lineTo(i / 60 * cw, sea + Math.sin(i * .7 + tt * 2) * ch * .008); g.lineTo(cw, ch); g.fill();
      for (let i = 0; i < 70; i++) { const p = ((R(i, 2) + tt * (.08 + R(i, 3) * .06)) % 1), px2 = cw * (.3 + R(i, 1) * .4) + Math.sin(tt + i) * cw * .02, py = sea - p * sea * (.25 + .6 * ri);
        const a = ri * (1 - p) * .7 + ht * .15 * (1 - p); if (a < .01) continue; g.fillStyle = `rgba(255,${170 - p * 60},${90 + p * 140},${a})`; g.beginPath(); g.arc(px2, py, cw * .004 * (1 + p * 2), 0, 6.283); g.fill(); }
      if (ri > 0) { const tw = cw * .26 * ri, top = sea - sea * .82 * ri; const cg = g.createRadialGradient(cw / 2, top + sea * .1, 0, cw / 2, top + sea * .2, tw);
        cg.addColorStop(0, `rgba(225,240,248,${.55 * ri})`); cg.addColorStop(1, "rgba(225,240,248,0)"); g.fillStyle = cg; g.fillRect(cw / 2 - tw, top - sea * .1, tw * 2, sea * .6); }
      if (inf > 0) for (let sd = -1; sd <= 1; sd += 2) for (let j = 0; j < 3; j++) { const ph = ((tt * .6 + j / 3) % 1), x0 = cw / 2 + sd * cw * (.48 - ph * .3), yy = sea - ch * (.03 + j * .05);
        g.strokeStyle = `rgba(63,224,255,${inf * (1 - ph) * .9})`; g.lineWidth = cw * .006; g.beginPath(); g.moveTo(x0 + sd * cw * .06, yy); g.lineTo(x0, yy);
        g.lineTo(x0 + sd * cw * .02, yy - cw * .015); g.moveTo(x0, yy); g.lineTo(x0 + sd * cw * .02, yy + cw * .015); g.stroke(); }
      if (lo > 0) { g.fillStyle = `rgba(255,59,59,${lo})`; g.font = `600 ${cw * .07}px Teko, sans-serif`; g.textAlign = "center"; g.fillText("L", cw / 2, sea - ch * .02); }
      if (spn > 0) { const cy2 = sea * .2, rx = cw * .22, ry = sea * .07; g.strokeStyle = `rgba(63,224,255,${spn * .9})`; g.lineWidth = cw * .005;
        for (let j = 0; j < 3; j++) { const a0 = -tt * 2.2 + j * 2.09; g.beginPath(); g.ellipse(cw / 2, cy2, rx * (.5 + j * .25), ry * (.5 + j * .25), 0, a0, a0 + 1.6); g.stroke(); } } });
    show(cv, t, { opacity: 0 }, .7, E.soft); if (o.until) out(cv, o.until); return cv;
  }

  /* gauge: fuel gauge E..F, o.k [[t, 0-1]], o.label */
  function gauge(x, y, r, t, o = {}) {
    const e = place(mk("div", "", o.parent), x - r, y - r, r * 2, r * 1.3); e.style.position = "absolute"; e.style.zIndex = o.z ?? 12;
    const ang = (v) => -150 + 120 * v, P2 = (d, rr) => [r + Math.cos(d * Math.PI / 180) * rr, r + Math.sin(d * Math.PI / 180) * rr];
    const [xa, ya] = P2(-150, r * .85), [xb, yb] = P2(-30, r * .85), [xe, ye] = P2(-158, r * .62), [xf, yf] = P2(-22, r * .62);
    e.innerHTML = svg(r * 2, r * 1.3, `<path d="M${xa} ${ya}A${r * .85} ${r * .85} 0 0 1 ${xb} ${yb}" stroke="url(#gg)" stroke-width="${u * 1.6}" fill="none" stroke-linecap="round"/>` +
      `<defs><linearGradient id="gg"><stop offset="0" stop-color="${K.cy}"/><stop offset="1" stop-color="${K.red}"/></linearGradient></defs>` +
      `<text x="${xe}" y="${ye}" fill="${K.mute}" font-family="var(--font-head)" font-size="${r * .2}" text-anchor="middle">${o.lo || "COOL"}</text>` +
      `<text x="${xf}" y="${yf}" fill="${K.mute}" font-family="var(--font-head)" font-size="${r * .2}" text-anchor="middle">${o.hi || "HOT"}</text>` +
      `<g class="nd"><path d="M${r} ${r}L${r + r * .75} ${r}" stroke="${K.ink}" stroke-width="${u * .55}" stroke-linecap="round"/><circle cx="${r}" cy="${r}" r="${u * 1.3}" fill="${K.ink}"/></g>` +
      (o.label ? `<text x="${r}" y="${r * 1.28}" fill="${K.ink}" font-family="var(--font-script)" font-weight="700" letter-spacing="${u * .3}" font-size="${r * .14}" text-anchor="middle">${o.label}</text>` : ""));
    const nd = e.querySelector(".nd"), v = { v: 0 }, set = () => gsap.set(nd, { rotation: ang(v.v), svgOrigin: `${r} ${r}` }); set();
    (o.k || [[t, 1]]).forEach(([tt, vv]) => tl.to(v, { v: vv, duration: 1, ease: E.io, onUpdate: set }, tt));
    show(e, t, { opacity: 0, scale: .8 }, .6, E.snap); if (o.until) out(e, o.until); return e;
  }

  /* wheel: names roll vertically and land on names[hi] at tl2 */
  function wheel(names, hi, x, y, w, h, t, tl2, o = {}) {
    const e = place(mk("div", "", o.parent), x, y, w, h), rh = h / 5; Object.assign(e.style, { position: "absolute", overflow: "hidden", zIndex: o.z ?? 12, background: K.panel,
      boxShadow: `0 0 0 ${Math.max(1, u * .12)}px #3FE0FF40`, borderRadius: u * .4 + "px",
      webkitMaskImage: "linear-gradient(transparent, #000 30%, #000 70%, transparent)", maskImage: "linear-gradient(transparent, #000 30%, #000 70%, transparent)" });
    const reel = mk("div", "", e), list2 = [...names, ...names, ...names]; reel.style.position = "absolute"; reel.style.left = 0; reel.style.right = 0;
    reel.innerHTML = list2.map((n, i) => `<div style="height:${rh}px;display:flex;align-items:center;justify-content:center;font:600 ${rh * .62}px var(--font-head);text-transform:uppercase;color:${i % names.length === hi ? K.yl : K.ink}">${n}</div>`).join("");
    const bar = mk("div", "", e); Object.assign(bar.style, { position: "absolute", left: 0, right: 0, top: rh * 2 + "px", height: rh + "px", borderTop: `${u * .2}px solid ${K.cy}`, borderBottom: `${u * .2}px solid ${K.cy}` });
    const yEnd = -(names.length + hi - 2) * rh;
    tl.fromTo(reel, { y: 0 }, { y: yEnd, duration: tl2 - t, ease: "power3.out", immediateRender: true }, t);
    show(e, t, { opacity: 0, scale: .9 }, .5, E.snap); if (o.until) out(e, o.until); return e;
  }

  /* mast: port signal mast; signal (black cone + red ball) hoisted at t2; o.label */
  function mast(x, y, h, t, t2, o = {}) {
    const w = h * .5, e = place(mk("div", "", o.parent), x - w / 2, y, w, h); e.style.position = "absolute"; e.style.zIndex = o.z ?? 12;
    e.innerHTML = svg(w, h, `<path d="M${w / 2} ${h}V0M${w * .12} ${h * .14}H${w * .88}" stroke="${K.ink}" stroke-width="${u * .7}" stroke-linecap="round"/>` +
      `<path d="M${w / 2} 0L${w * .12} ${h * .14}M${w / 2} 0L${w * .88} ${h * .14}" stroke="${K.mute}" stroke-width="${u * .2}"/>` +
      `<g class="sg"><path d="M${w * .8} ${h * .2}L${w * .92} ${h * .32}H${w * .68}Z" fill="${K.red}"/><circle cx="${w * .8}" cy="${h * .38}" r="${w * .07}" fill="${K.red}"/></g>`);
    const sg = e.querySelector(".sg"); tl.fromTo(sg, { y: h * .55 }, { y: 0, duration: 1.2, ease: E.io, immediateRender: true }, t2);
    if (o.label) { const lb = mk("div", "", e, o.label); Object.assign(lb.style, { position: "absolute", left: w * .95 + "px", top: h * .2 + "px", font: `700 ${u * (V ? 3.4 : 2.8)}px var(--font-script)`,
      letterSpacing: ".14em", color: K.deep, background: K.red, padding: `${u * .3}px ${u}px`, whiteSpace: "nowrap" }); show(lb, t2 + 1, { opacity: 0, x: -u * 3 }, .4, E.snap); }
    show(e, t, { opacity: 0, y: u * 10 }, .7, E.snap); if (o.until) out(e, o.until); return e;
  }

  function clock24(x, y, r, t, o = {}) {
    const e = place(mk("div", "", o.parent), x - r, y - r, r * 2, r * 2); e.style.position = "absolute"; e.style.zIndex = o.z ?? 12;
    let tk = ""; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283 - 1.571; tk += `<path d="M${r + Math.cos(a) * r * .82} ${r + Math.sin(a) * r * .82}L${r + Math.cos(a) * r * (i % 6 ? .9 : .72)} ${r + Math.sin(a) * r * (i % 6 ? .9 : .72)}" stroke="${K.mute}" stroke-width="${u * (i % 6 ? .15 : .35)}"/>`; }
    e.innerHTML = svg(r * 2, r * 2, `<circle cx="${r}" cy="${r}" r="${r}" fill="${K.panel}" stroke="${K.cy}" stroke-width="${u * .3}"/>${tk}<path class="sw" d="" fill="${K.cy}" fill-opacity=".25"/>` +
      `<path class="hd" d="M${r} ${r}V${r * .2}" stroke="${K.yl}" stroke-width="${u * .5}" stroke-linecap="round"/><circle cx="${r}" cy="${r}" r="${u}" fill="${K.yl}"/>` +
      `<text x="${r}" y="${r * 1.45}" fill="${K.ink}" font-family="var(--font-head)" font-size="${r * .34}" text-anchor="middle">${o.label || "24 HRS"}</text>`);
    const hd = e.querySelector(".hd"), sw2 = e.querySelector(".sw"), v = { a: 0 };
    const set = () => { gsap.set(hd, { rotation: v.a, svgOrigin: `${r} ${r}` }); const a = Math.min(v.a, 359.9) * Math.PI / 180 - 1.571;
      sw2.setAttribute("d", `M${r} ${r}V${r * .18}A${r * .82} ${r * .82} 0 ${v.a > 180 ? 1 : 0} 1 ${r + Math.cos(a) * r * .82} ${r + Math.sin(a) * r * .82}Z`); };
    set(); tl.to(v, { a: 360, duration: o.d || 2.5, ease: E.io, onUpdate: set }, t + .3);
    show(e, t, { opacity: 0, scale: .6 }, .6, E.pop); if (o.until) out(e, o.until); return e;
  }

  Object.assign(CK, { swirl, bay, cards, ladder, dial, xsec, gauge, wheel, mast, clock24 });
})();
