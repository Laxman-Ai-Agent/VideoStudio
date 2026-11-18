/* acid_kit science parts (18 Acidity_GERD), on top of ac.js:
   tract (2D esophagus + LES ring + stomach with sloshing acid, reflux column, burn glow, food bolus), phScale (litmus 0-14 strip, band, sliding needle),
   shield (wall cross-section: mucus layer bounces acid drops / bare lining burns), people (grid, 1 in k lit), clock3 (dinner -> bed arc),
   bed (side-view bed, head end lifts on blocks), chain (damage stages), tubes (test-tube chart), flags (red-flag grid), radiate (pain spreads to arm / neck / jaw). */
(function () {
  const { W, H, V, u, K, tl, E, R, mk, place, out, show, svg } = AC;
  const key = (ks, t) => { if (!ks || !ks.length) return 0; let v = ks[0][1]; for (let i = 0; i < ks.length; i++) if (t >= ks[i][0]) { const n = ks[i + 1];
    v = n ? ks[i][1] + (n[1] - ks[i][1]) * Math.min(1, (t - ks[i][0]) / Math.max(.01, n[0] - ks[i][0])) : ks[i][1]; } return v; };
  const clock = (fn, t0) => { const v = { t: 0 }; fn(0); tl.fromTo(v, { t: 0 }, { t: AC.D, duration: AC.D, ease: "none", immediateRender: true, onUpdate: () => fn(v.t) }, 0); };
  const mixc = (a, b, f) => { const p = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)), x = p(a), y = p(b);
    return "#" + x.map((c, i) => Math.round(c + (y[i] - c) * f).toString(16).padStart(2, "0")).join(""); };
  const lab = (x, y, txt, c, sz, anchor = "middle") => `<text x="${x}" y="${y}" fill="${c}" font-family="var(--font-script)" font-weight="600" font-size="${sz}" letter-spacing="${sz * .12}" text-anchor="${anchor}">${txt}</text>`;
  const appear = (e, t, o) => { tl.fromTo(e, { autoAlpha: 0, scale: .92 }, { autoAlpha: 1, scale: 1, duration: .6, ease: E.snap, immediateRender: true }, t); if (o.until) out(e, o.until); if (o.z) e.style.zIndex = o.z; };

  /* tract: box (x,y,w,h). o.les [[t, open 0-1]], o.acid [[t, level 0-1 of stomach]], o.reflux [[t, 0-1 up the tube]], o.food [t,...], o.labels [[text, t]] */
  function tract(x, y, w, h, t, o = {}) {
    const e = place(mk("div", "ac-tr", o.parent), x, y, w, h); e.style.position = "absolute"; e.style.zIndex = o.z ?? 10;
    const X = (v) => v * w, Y = (v) => v * h, tw = .12, tx = .42, sw = Math.max(2, u * .45);
    const st = `M${X(.54)} ${Y(.5)} C${X(.62)} ${Y(.38)} ${X(.88)} ${Y(.38)} ${X(.9)} ${Y(.58)} C${X(.92)} ${Y(.82)} ${X(.7)} ${Y(.99)} ${X(.48)} ${Y(.96)} C${X(.3)} ${Y(.94)} ${X(.16)} ${Y(.87)} ${X(.11)} ${Y(.75)} L${X(.05)} ${Y(.72)} L${X(.07)} ${Y(.64)} L${X(.14)} ${Y(.67)} C${X(.22)} ${Y(.75)} ${X(.34)} ${Y(.78)} ${X(.4)} ${Y(.68)} C${X(.43)} ${Y(.62)} ${X(.43)} ${Y(.55)} ${X(.42)} ${Y(.5)}`;
    const id = "tr" + Math.round(R(x + y, 7) * 1e6);
    e.innerHTML = svg(w, h, `<defs><clipPath id="${id}s"><path d="${st} Z"/></clipPath><clipPath id="${id}t"><rect x="${X(tx)}" y="${-h}" width="${X(tw)}" height="${Y(.52) + h}"/></clipPath>
      <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.acid}"/><stop offset="1" stop-color="#8fae1e"/></linearGradient>
      <filter id="${id}b"><feGaussianBlur stdDeviation="${u * 1.2}"/></filter></defs>
      <rect class="tin" x="${X(tx)}" y="${-h * .2}" width="${X(tw)}" height="${Y(.5) + h * .2}" fill="#1b2a22"/>
      <radialGradient id="${id}f" cx=".55" cy=".45" r=".7"><stop offset="0" stop-color="#8a4038"/><stop offset="1" stop-color="#3d1916"/></radialGradient><path d="${st} Z" fill="url(#${id}f)" opacity=".95"/>
      <g clip-path="url(#${id}s)"><path class="liq" fill="url(#${id}g)" opacity=".92"/></g>
      <g clip-path="url(#${id}t)"><path class="ref" fill="url(#${id}g)" opacity=".95"/></g>
      <rect class="glow" x="${X(tx - .05)}" y="0" width="${X(tw + .1)}" height="${Y(.5)}" fill="${K.fl}" filter="url(#${id}b)" opacity="0"/>
      <line class="wl" x1="${X(tx)}" y1="${-h * .2}" x2="${X(tx)}" y2="${Y(.5)}" stroke="${K.por}" stroke-width="${sw}"/>
      <line class="wr" x1="${X(tx + tw)}" y1="${-h * .2}" x2="${X(tx + tw)}" y2="${Y(.5)}" stroke="${K.por}" stroke-width="${sw}"/>
      <path d="${st}" fill="none" stroke="${K.por}" stroke-width="${sw}"/>
      <circle class="food" r="${X(tw * .36)}" cx="${X(tx + tw / 2)}" cy="-100" fill="#c98b4e" stroke="${K.por}" stroke-width="${sw * .6}"/>
      <rect class="ll" y="${Y(.465)}" width="${X(tw * .55)}" height="${Y(.07)}" rx="${Y(.035)}" fill="#e08a74" stroke="${K.por}" stroke-width="${sw * .6}"/>
      <rect class="lr" y="${Y(.465)}" width="${X(tw * .55)}" height="${Y(.07)}" rx="${Y(.035)}" fill="#e08a74" stroke="${K.por}" stroke-width="${sw * .6}"/>`);
    const q = (s) => e.querySelector(s), liq = q(".liq"), ref = q(".ref"), ll = q(".ll"), lr = q(".lr"), glow = q(".glow"), food = q(".food"), wl = q(".wl"), wr = q(".wr");
    const foods = o.food || [];
    clock((tt) => {
      const lv = key(o.acid || [[0, .35]], tt), op = key(o.les || [[0, 0]], tt), rf = key(o.reflux || [[0, 0]], tt), ph = tt * 2.4;
      const sy = Y(1 - lv * .6), pts = []; for (let i = 0; i <= 20; i++) { const xx = X(.03 + i / 20 * .94); pts.push(`${xx} ${sy + Math.sin(i * .9 + ph) * u * .6}`); }
      liq.setAttribute("data-y", sy);
      liq.setAttribute("d", `M${pts.join(" L")} L${X(.98)} ${Y(1.1)} L${X(.03)} ${Y(1.1)} Z`);
      const ry = Y(.52) - rf * Y(.62), rp = []; for (let i = 0; i <= 6; i++) rp.push(`${X(tx + tw * i / 6)} ${ry + Math.sin(i * 1.4 + ph * 1.6) * u * .5}`);
      ref.setAttribute("d", `M${rp.join(" L")} L${X(tx + tw)} ${Y(.56)} L${X(tx)} ${Y(.56)} Z`); ref.style.opacity = rf > .01 ? .95 : 0;
      const half = X(tw * .55), gap = op * X(tw * .45);
      ll.setAttribute("x", X(tx) - gap * .5 - half * .05); lr.setAttribute("x", X(tx + tw) - half + gap * .5 + half * .05);
      const burn = Math.max(0, Math.min(1, (rf - .25) / .4)); glow.setAttribute("opacity", burn * (.55 + .2 * Math.sin(tt * 9)));
      const wc = mixc(K.por, K.fl, burn); wl.setAttribute("stroke", wc); wr.setAttribute("stroke", wc);
      let fy = -100; foods.forEach((ft) => { if (tt >= ft && tt < ft + 1.6) fy = -h * .15 + (tt - ft) / 1.6 * (Y(.72) + h * .15); }); food.setAttribute("cy", fy); food.style.opacity = fy < -50 ? 0 : 1;
    }, t);
    appear(e, t, o);
    (o.labels || []).forEach(([txt, lt, px, py, dx, dy, c]) => AC.callout(x + X(px), y + Y(py), dx, dy, txt, lt, { c, z: (o.z ?? 10) + 2, until: o.until }));
    return e;
  }

  /* pH scale: x,y,w; o.band [a,b,label], o.marks [[value, t, label]], o.tags (ACID / NEUTRAL / BASE) */
  const PH = ["#E5322D", "#EE4B2B", "#F26A23", "#F7911E", "#FBB117", "#F5D21C", "#D9E021", "#8CC63F", "#3DB64A", "#1AA39A", "#1E86C6", "#2A5DAE", "#3B3F98", "#5A2C8A", "#6E2477"];
  function phScale(x, y, w, t, o = {}) {
    const sh = u * (V ? 6 : 6.5), cw = w / 15, e = place(mk("div", "ac-ph", o.parent), x, y, w, sh * 4); e.style.position = "absolute"; e.style.zIndex = o.z ?? 12;
    const fs = u * (V ? 3 : 2.6);
    e.innerHTML = svg(w, sh * 4, PH.map((c, i) => `<rect class="sg" x="${i * cw}" y="${sh}" width="${cw - 2}" height="${sh}" fill="${c}"/>` + lab(i * cw + cw / 2, sh * 2 + fs * 1.3, i, K.txt, fs)).join("") +
      lab(0, sh * .6, "◀ STRONG ACID", K.fl, fs, "start") + lab(w / 2, sh * .6, "NEUTRAL", K.txt, fs) + lab(w, sh * .6, "BASE ▶", "#7fa8ff", fs, "end") +
      (o.band ? `<g class="bd"><rect x="${o.band[0] * cw + cw / 2}" y="${sh * .85}" width="${(o.band[1] - o.band[0]) * cw}" height="${sh * 1.3}" fill="none" stroke="${K.acid}" stroke-width="${u * .4}"/>` +
        lab((o.band[0] + o.band[1]) / 2 * cw + cw / 2, sh * 3.4, o.band[2] || "", K.acid, fs * 1.15) + "</g>" : "") +
      `<g class="nd"><path d="M0 ${sh * .9} L${-u} ${sh * .2} L${u} ${sh * .2} Z" fill="${K.txt}"/><line x1="0" y1="${sh * .9}" x2="0" y2="${sh * 2.1}" stroke="${K.txt}" stroke-width="${u * .3}"/></g>`);
    const sg = e.querySelectorAll(".sg"), nd = e.querySelector(".nd"), bd = e.querySelector(".bd");
    tl.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    tl.fromTo(sg, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: .35, stagger: .03, ease: E.snap, immediateRender: true }, t);
    if (bd) tl.fromTo(bd, { opacity: 0 }, { opacity: 1, duration: .4, immediateRender: true }, o.bandAt ?? t + .7);
    const m = o.marks || []; gsap.set(nd, { x: (m[0] ? m[0][0] : 7) * cw + cw / 2, opacity: 0 });
    m.forEach(([v, mt, l], i) => { tl.to(nd, { x: v * cw + cw / 2, opacity: 1, duration: .7, ease: E.io }, mt);
      if (l) { const lb = place(mk("div", "ac-tag", e, `<i></i><span>${l}</span>`), v * cw + cw / 2 - u * 2, -sh * (1.1 + (i % 2) * .9)); lb.style.setProperty("--c", PH[Math.round(v)]);
        show(lb, mt + .3, { opacity: 0, y: u * 2 }, .4, E.snap); if (m[i + 1]) out(lb, m[i + 1][1]); } });
    if (o.until) out(e, o.until); return e;
  }

  /* shield: wall cross-section in box; o.mucus true (drops bounce) / false (drops burn the lining); drops from t0 every .3 s */
  function shield(x, y, w, h, t, o = {}) {
    const cv = place(mk("canvas", "ac-fx", o.parent), x, y, w, h); cv.width = Math.round(w / 1.5); cv.height = Math.round(h / 1.5); cv.style.width = w + "px"; cv.style.height = h + "px";
    cv.style.zIndex = o.z ?? 11; const g = cv.getContext("2d"), cw = cv.width, ch = cv.height, s = cw / w * u, muc = o.mucus !== false, t0 = o.drops ?? t + .6;
    const cellY = ch * .72, mucY = muc ? ch * .55 : cellY;
    const draw = (tt) => { g.clearRect(0, 0, cw, ch);
      let hurt = 0;
      for (let i = 0; i < 40; i++) { const st = t0 + i * .3; if (tt < st) continue; const k = (tt - st) / .7, dx = (R(i, 9) * .86 + .07) * cw;
        if (k < 1) { const yy = -s * 2 + k * k * (mucY + s * 2); g.fillStyle = K.acid; g.beginPath(); g.ellipse(dx, yy, s * 2, s * 2.9, 0, 0, 6.283); g.fill(); }
        else if (k < 1.9) { const p = k - 1;
          if (muc) { const by = mucY - Math.sin(p / .9 * Math.PI) * s * 8, bx = dx + p * s * 7 * (R(i, 4) > .5 ? 1 : -1); g.fillStyle = `rgba(217,242,63,${1 - p / .9})`;
            g.beginPath(); g.arc(bx, by, s * 1.8, 0, 6.283); g.fill(); }
          else { hurt = Math.max(hurt, 1 - p / .9); g.fillStyle = `rgba(255,106,43,${.9 - p})`; g.beginPath(); g.ellipse(dx, cellY, s * (2 + p * 6), s * (1 + p * 2), 0, 0, 6.283); g.fill(); } } }
      for (let i = 0; i < 14; i++) { const cx = (i + .5) / 14 * cw; g.fillStyle = muc ? "#d98f80" : mixc("#d98f80", "#ff5a2a", Math.min(1, hurt + (tt > t0 + 2 ? .4 : 0)));
        g.beginPath(); g.roundRect(cx - cw / 30, cellY, cw / 15.5, ch * .26, s * 1.5); g.fill(); g.fillStyle = "#7a3f3a"; g.beginPath(); g.arc(cx, cellY + ch * .12, s * 1.2, 0, 6.283); g.fill(); }
      if (muc) { const gr = g.createLinearGradient(0, mucY, 0, cellY); gr.addColorStop(0, "rgba(234,223,200,.95)"); gr.addColorStop(1, "rgba(234,223,200,.55)"); g.fillStyle = gr;
        g.beginPath(); g.moveTo(0, cellY); for (let i = 0; i <= 30; i++) g.lineTo(i / 30 * cw, mucY + Math.sin(i * .8 + tt * 2) * s * .7); g.lineTo(cw, cellY); g.fill(); } };
    clock(draw, t); appear(cv, t, o); return cv;
  }

  /* people grid: n icons in cols, every k-th lit acid at tl2 */
  function people(n, k, x, y, w, t, o = {}) {
    const cols = o.cols || 14, cs = w / cols, e = place(mk("div", "ac-pp", o.parent), x, y, w, Math.ceil(n / cols) * cs * 1.3); e.style.position = "absolute"; e.style.zIndex = o.z ?? 12;
    let s = ""; for (let i = 0; i < n; i++) { const cx = (i % cols + .5) * cs, cy = Math.floor(i / cols) * cs * 1.3, lit = i % k === (o.off ?? 3);
      s += `<g class="${lit ? "lit" : "pp"}" transform="translate(${cx} ${cy})"><circle cy="${cs * .25}" r="${cs * .17}"/><path d="M${-cs * .3} ${cs * 1.05} Q${-cs * .3} ${cs * .48} 0 ${cs * .48} Q${cs * .3} ${cs * .48} ${cs * .3} ${cs * 1.05} Z"/></g>`; }
    e.innerHTML = svg(w, 10, s); const pp = e.querySelectorAll("g"); gsap.set(pp, { fill: K.mute, opacity: .55 });
    tl.fromTo(pp, { opacity: 0, y: u * 2 }, { opacity: .55, y: 0, duration: .3, stagger: .6 / n, ease: E.snap, immediateRender: true }, t);
    tl.to(e.querySelectorAll(".lit"), { fill: o.c || K.acid, opacity: 1, duration: .4, stagger: .03, ease: E.soft }, o.lit ?? t + 1);
    if (o.until) out(e, o.until); return e;
  }

  /* clock3: dial at (x,y) radius r, arc from h0 to h1 (hours) fills at t2 */
  function clock3(x, y, r, t, o = {}) {
    const h0 = o.h0 ?? 8, h1 = o.h1 ?? 11, e = place(mk("div", "ac-ck", o.parent), x - r, y - r, r * 2, r * 2); e.style.position = "absolute"; e.style.zIndex = o.z ?? 12;
    const pt = (hh, rr) => [r + Math.sin(hh / 12 * 6.283) * rr, r - Math.cos(hh / 12 * 6.283) * rr];
    const [ax, ay] = pt(h0, r * .78), [bx, by] = pt(h1, r * .78), big = (h1 - h0) > 6 ? 1 : 0, len = (h1 - h0) / 12 * 6.283 * r * .78;
    e.innerHTML = svg(r * 2, r * 2, `<circle cx="${r}" cy="${r}" r="${r * .98}" fill="${K.panel}" stroke="${K.por}" stroke-width="${u * .3}"/>` +
      Array.from({ length: 12 }, (_, i) => { const [a, b] = pt(i, r * .9), [c, d] = pt(i, r * .8); return `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${K.txt}" stroke-width="${u * .3}"/>`; }).join("") +
      `<path class="arc" d="M${ax} ${ay} A${r * .78} ${r * .78} 0 ${big} 1 ${bx} ${by}" fill="none" stroke="${o.c || K.acid}" stroke-width="${r * .16}" stroke-dasharray="${len}" stroke-dashoffset="${len}" stroke-linecap="round"/>` +
      `<line class="hh" x1="${r}" y1="${r}" x2="${r}" y2="${r * .45}" stroke="${K.txt}" stroke-width="${u * .7}" stroke-linecap="round"/><circle cx="${r}" cy="${r}" r="${u * .9}" fill="${K.txt}"/>` +
      lab(r, r * 1.45, o.label || "3 HOURS", o.c || K.acid, r * .17));
    appear(e, t, o); const t2 = o.t2 ?? t + .6;
    gsap.set(e.querySelector(".hh"), { rotation: h0 * 30, svgOrigin: `${r} ${r}` });
    tl.to(e.querySelector(".hh"), { rotation: h1 * 30, duration: 1.6, ease: E.io }, t2); tl.to(e.querySelector(".arc"), { strokeDashoffset: 0, duration: 1.6, ease: E.io }, t2);
    return e;
  }

  /* bed: side view, width w at (x,y); head end lifts at t2 on blocks, "10-20 cm" */
  function bed(x, y, w, t, o = {}) {
    const h = w * .42, e = place(mk("div", "ac-bed", o.parent), x, y, w, h); e.style.position = "absolute"; e.style.zIndex = o.z ?? 12; const s = w / 100, sw = Math.max(2, u * .3);
    e.innerHTML = svg(w, h, `<g class="bl" opacity="0"><rect x="${s * 5}" y="${s * 34}" width="${s * 9}" height="${s * 8}" fill="#9a6b3e" stroke="${K.por}" stroke-width="${sw * .6}"/>
      <path d="M${s * 1} ${s * 34} L${s * 1} ${s * 42}" stroke="${K.acid}" stroke-width="${sw}"/>${lab(s * 0, s * 31, o.label || "10–20 CM", K.acid, s * 3.6, "start")}</g>
      <g class="bd"><rect x="${s * 6}" y="${s * 26}" width="${s * 86}" height="${s * 4}" fill="#5c3d24"/><rect x="${s * 6}" y="${s * 30}" width="${s * 3}" height="${s * 12}" fill="#5c3d24"/>
      <rect x="${s * 89}" y="${s * 30}" width="${s * 3}" height="${s * 12}" fill="#5c3d24"/><rect x="${s * 6}" y="${s * 12}" width="${s * 3}" height="${s * 16}" fill="#5c3d24"/>
      <rect x="${s * 9}" y="${s * 19}" width="${s * 83}" height="${s * 7}" rx="${s * 2}" fill="${K.por}"/><rect x="${s * 11}" y="${s * 14}" width="${s * 14}" height="${s * 5}" rx="${s * 2.4}" fill="#fffaf0"/>
      <circle cx="${s * 18}" cy="${s * 11.5}" r="${s * 3.6}" fill="#c58f6a"/><rect x="${s * 22}" y="${s * 12}" width="${s * 56}" height="${s * 7}" rx="${s * 3.4}" fill="#2f6a55"/>
      <ellipse cx="${s * 36}" cy="${s * 15.5}" rx="${s * 5}" ry="${s * 2.8}" fill="#20160f" stroke="${K.por}" stroke-width="${sw * .5}"/>
      <path class="lq" d="M${s * 31.5} ${s * 16} L${s * 40.5} ${s * 16} L${s * 40.5} ${s * 18.2} L${s * 31.5} ${s * 18.2} Z" fill="${K.acid}"/></g>`);
    appear(e, t, o); const t2 = o.t2 ?? t + 1, bd = e.querySelector(".bd");
    gsap.set(bd, { svgOrigin: `${s * 90} ${s * 42}` });
    tl.to(bd, { rotation: 7, duration: 1, ease: E.io }, t2); tl.to(bd, { y: -s * 2, duration: 1, ease: E.io }, t2);
    tl.to(e.querySelector(".lq"), { rotation: -7, svgOrigin: `${s * 36} ${s * 17}`, duration: 1, ease: E.io }, t2);
    tl.to(e.querySelector(".bl"), { opacity: 1, duration: .5 }, t2 + .6);
    return e;
  }

  /* chain: damage stages [[label, t, colour]] along a line at (x,y) width w */
  function chain(items, x, y, w, t, o = {}) {
    const n = items.length, sp = w / (n - .2), r = u * (V ? 3.4 : 3), e = place(mk("div", "ac-ch", o.parent), x, y, w, r * 6); e.style.position = "absolute"; e.style.zIndex = o.z ?? 12;
    const fs = u * (V ? 5 : 4.4);
    e.innerHTML = svg(w, r * 6, `<line class="ln" x1="${r}" y1="${r * 1.5}" x2="${(n - 1) * sp + r}" y2="${r * 1.5}" stroke="${K.mute}" stroke-width="${u * .35}" stroke-dasharray="${w}" stroke-dashoffset="${w}"/>` +
      items.map(([l, , c], i) => `<g class="nd" opacity="0"><circle cx="${i * sp + r}" cy="${r * 1.5}" r="${r}" fill="${c || K.fl}"/><circle cx="${i * sp + r}" cy="${r * 1.5}" r="${r * 1.6}" fill="none" stroke="${c || K.fl}" stroke-width="${u * .25}" opacity=".6"/>` +
        `<text x="${i * sp + r}" y="${r * 4.6}" fill="${K.txt}" font-family="var(--font)" font-size="${fs}" text-anchor="${i === 0 ? "start" : i === n - 1 ? "end" : "middle"}">${l}</text></g>`).join(""));
    tl.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: true }, t);
    tl.to(e.querySelector(".ln"), { strokeDashoffset: 0, duration: (items[n - 1][1] - t) || 1, ease: "none" }, t);
    e.querySelectorAll(".nd").forEach((g, i) => tl.fromTo(g, { opacity: 0, scale: .3, transformOrigin: `${i * sp + r}px ${r * 1.5}px` }, { opacity: 1, scale: 1, duration: .45, ease: E.pop, immediateRender: true }, items[i][1]));
    if (o.until) out(e, o.until); return e;
  }

  /* tubes: test-tube chart, items [[label, level 0-1, t, value text, colour]] in box (x,y,w,h) */
  function tubes(items, x, y, w, h, o = {}) {
    const n = items.length, sp = w / n, tw = Math.min(sp * .38, u * 7), e = place(mk("div", "ac-tb", o.parent), x, y, w, h); e.style.position = "absolute"; e.style.zIndex = o.z ?? 12;
    const th = h * .66, fs = u * (V ? 3.8 : 3.2);
    e.innerHTML = svg(w, h, items.map(([l, , , val, c], i) => { const cx = i * sp + sp / 2, x0 = cx - tw / 2;
      return `<rect x="${x0}" y="${h * .08}" width="${tw}" height="${th}" rx="${tw / 2}" fill="#ffffff10" stroke="${K.por}" stroke-width="${u * .25}"/>` +
        `<rect class="fl" x="${x0 + u * .5}" y="${h * .08 + u * .5}" width="${tw - u}" height="${th - u}" rx="${(tw - u) / 2}" fill="${c || K.acid}"/>` +
        `<text x="${cx}" y="${h * .08 + th + fs * 1.6}" fill="${K.txt}" font-family="var(--font-script)" font-weight="700" font-size="${fs}" letter-spacing="${fs * .08}" text-anchor="middle">${l}</text>` +
        `<text class="vl" x="${cx}" y="${h * .08 + th + fs * 3}" fill="${c || K.acid}" font-family="var(--font)" font-size="${fs * .95}" text-anchor="middle">${val || ""}</text>`; }).join(""));
    const fl = e.querySelectorAll(".fl"), vl = e.querySelectorAll(".vl");
    tl.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: .4, immediateRender: true }, items[0][2] - .3);
    items.forEach(([, lv, it], i) => { const hh = th - u; tl.fromTo(fl[i], { attr: { y: h * .08 + u * .5 + hh, height: 0 } }, { attr: { y: h * .08 + u * .5 + hh * (1 - lv), height: hh * lv }, duration: 1.1, ease: E.io, immediateRender: true }, it);
      tl.fromTo(vl[i], { opacity: 0 }, { opacity: 1, duration: .4, immediateRender: true }, it + .8); });
    if (o.until) out(e, o.until); return e;
  }

  /* flags: red-flag cards [[html, t]] in a grid at (x,y) width w, cols */
  function flags(items, x, y, w, o = {}) {
    const cols = o.cols || 3, gap = u * 1.2, cw = (w - gap * (cols - 1)) / cols, ch = u * (V ? 12 : 10.5), e = place(mk("div", "ac-fg", o.parent), x, y, w, 1); e.style.position = "absolute"; e.style.zIndex = o.z ?? 12;
    items.forEach(([h, t], i) => { const c = place(mk("div", "", e), (i % cols) * (cw + gap), Math.floor(i / cols) * (ch + gap), cw, ch);
      Object.assign(c.style, { position: "absolute", display: "flex", alignItems: "center", gap: u * 1.2 + "px", padding: `0 ${u * 1.4}px`, background: K.panel, boxSizing: "border-box",
        borderTop: `${u * .45}px solid ${K.fl}`, font: `400 ${u * (V ? 4.8 : 4.2)}px var(--font)`, color: K.txt, lineHeight: 1.25 });
      c.innerHTML = `<b style="flex:none;width:${u * 4}px;height:${u * 4}px;display:flex;align-items:center;justify-content:center;background:${K.fl};color:${K.deep};font:900 ${u * 2.6}px var(--font-head)">!</b><span>${h}</span>`;
      show(c, t, { opacity: 0, y: u * 4, scale: .9 }, .45, E.snap); });
    if (o.until) out(e, o.until); return e;
  }

  /* radiate: upper-body silhouette (height h) at (x,y); chest glow at t, pain runs to arm / neck / jaw at o.arm / o.neck / o.jaw */
  function radiate(x, y, h, t, o = {}) {
    const s = h / 100, w = s * 80, e = place(mk("div", "ac-rd", o.parent), x, y, w, h); e.style.position = "absolute"; e.style.zIndex = o.z ?? 12;
    const c = o.c || K.red, sw = s * 1.6;
    const body = `M${s * 30} ${s * 34} Q${s * 40} ${s * 30} ${s * 40} ${s * 30} L${s * 40} ${s * 26} Q${s * 40} ${s * 24} ${s * 40} ${s * 24}`;
    e.innerHTML = svg(w, h, `<circle cx="${s * 40}" cy="${s * 14}" r="${s * 10}" fill="#16271f" stroke="${K.por}" stroke-width="${sw}"/>
      <path d="M${s * 34} ${s * 23} L${s * 34} ${s * 29} Q${s * 14} ${s * 31} ${s * 10} ${s * 44} L${s * 6} ${s * 86} L${s * 15} ${s * 87} L${s * 19} ${s * 52} L${s * 21} ${s * 100} L${s * 59} ${s * 100} L${s * 61} ${s * 52} L${s * 65} ${s * 87} L${s * 74} ${s * 86} L${s * 70} ${s * 44} Q${s * 66} ${s * 31} ${s * 46} ${s * 29} L${s * 46} ${s * 23} Z" fill="#16271f" stroke="${K.por}" stroke-width="${sw}"/>
      <circle class="hg" cx="${s * 46}" cy="${s * 46}" r="${s * 9}" fill="${c}" opacity="0" style="filter:blur(${s * 2}px)"/>
      <path class="pa" d="M${s * 46} ${s * 46} Q${s * 62} ${s * 40} ${s * 66} ${s * 56} L${s * 70} ${s * 84}" fill="none" stroke="${c}" stroke-width="${sw * 2}" stroke-linecap="round"/>
      <path class="pn" d="M${s * 46} ${s * 46} Q${s * 43} ${s * 34} ${s * 41} ${s * 26}" fill="none" stroke="${c}" stroke-width="${sw * 2}" stroke-linecap="round"/>
      <path class="pj" d="M${s * 41} ${s * 26} Q${s * 46} ${s * 22} ${s * 47} ${s * 18}" fill="none" stroke="${c}" stroke-width="${sw * 2}" stroke-linecap="round"/>` + `<path d="${body}" fill="none"/>`);
    appear(e, t, o);
    const hg = e.querySelector(".hg"); tl.to(hg, { opacity: .95, duration: .5 }, t + .3); tl.to(hg, { scale: 1.3, transformOrigin: "50% 50%", duration: .4, yoyo: true, repeat: 7, ease: E.soft }, t + .8);
    [[".pa", o.arm], [".pn", o.neck], [".pj", o.jaw]].forEach(([k, tt]) => { const p = e.querySelector(k), L = p.getTotalLength ? p.getTotalLength() || 200 : 200;
      gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); if (tt != null) tl.to(p, { strokeDashoffset: 0, duration: .8, ease: E.io }, tt); });
    return e;
  }
  Object.assign(AC, { key, tract, phScale, shield, people, clock3, bed, chain, tubes, flags, radiate, PH });
})();
