/* night_kit science parts (17_Sleep_Apnea): trace (respiration waveform: calm / snore / apnea / gasp), spo2 (monitor readout),
   airway (2D throat tube that narrows / vibrates / closes, air particles), night (11 PM - 6 AM strip with apnea ticks),
   ahi (ruler with mild / moderate / severe bands + needle), tank (capsule fill %), mult (risk capsules 1x vs 2.5x), clock. Needs nw.js. */
(function () {
  const { W, H, D, V, u, K, tl, E, R, mk, place, out, show, svg } = NW;
  const css = document.createElement("style");
  css.textContent = `
  .nw-box { position: absolute; background: #0d0912d8; border-radius: ${u * .8}px; border: ${Math.max(1, u * .12)}px solid #ffffff1c; box-shadow: 0 ${u}px ${u * 4}px #00000090; }
  .nw-lab { position: absolute; font: 500 ${u * (V ? 2.7 : 1.9)}px var(--font-script); letter-spacing: .18em; text-transform: uppercase; color: ${K.mute}; white-space: nowrap; }
  .nw-big { position: absolute; font: 800 ${u * (V ? 13 : 10)}px var(--font-head); line-height: 1; letter-spacing: -.04em; white-space: nowrap; }
  .nw-big small { font-size: .32em; margin-left: .1em; font-weight: 600; }
  .nw-band { position: absolute; top: 0; height: 100%; border-radius: ${u * .4}px; }
  .nw-cap { position: absolute; border-radius: ${u * 3}px; overflow: hidden; background: #ffffff10; border: ${Math.max(1, u * .14)}px solid #ffffff30; }`;
  document.head.append(css);
  const keyv = (keys, t) => { let v = keys[0][1]; for (let i = 0; i < keys.length; i++) if (t >= keys[i][0]) { const n = keys[i + 1];
    v = n ? keys[i][1] + (n[1] - keys[i][1]) * Math.min(1, (t - keys[i][0]) / Math.max(.01, n[0] - keys[i][0])) : keys[i][1]; } return v; };
  const clockOn = (draw, t0) => { const v = { t: 0 }; draw(0); tl.fromTo(v, { t: 0 }, { t: D, duration: D, ease: "none", immediateRender: true, onUpdate: () => draw(v.t) }, 0); };
  const box = (x, y, w, h, o) => { const e = place(mk("div", o.bare ? "" : "nw-box", o.parent), x, y, w, h); e.style.position = "absolute"; e.style.zIndex = o.z ?? 14; return e; };

  /* trace: respiration waveform strip. o.ev [[t0, t1, "calm"|"snore"|"apnea"|"gasp"]] (scene seconds), o.win seconds shown, o.label */
  function trace(x, y, w, h, t, o = {}) {
    const e = box(x, y, w, h, o), cv = mk("canvas", "", e); cv.width = Math.round(w); cv.height = Math.round(h); Object.assign(cv.style, { position: "absolute", left: 0, top: 0 });
    if (!o.bare) { const lb = place(mk("div", "nw-lab", e, o.label || "AIRFLOW · BREATHING"), u, u * .6); lb.style.zIndex = 2; }
    const g = cv.getContext("2d"), ev = o.ev || [[0, D, "calm"]], win = o.win ?? 7;
    const mode = (s) => { let m = "calm"; ev.forEach(([a, b, k]) => { if (s >= a && s < b) m = k; }); return m; };
    const sig = (s) => { const m = mode(s); if (m === "apnea") return .03 * Math.sin(s * 9);
      if (o.wave === "ecg") { const p = (s * 1.2) % 1; return p < .04 ? -.2 : p < .07 ? 1.3 : p < .1 ? -.5 : p > .3 && p < .42 ? .25 * Math.sin((p - .3) / .12 * Math.PI) : 0; }
      if (o.wave === "eeg") return .35 * Math.sin(s * 23) + .25 * Math.sin(s * 41 + 1) + .2 * Math.sin(s * 9.7) + .15 * Math.sin(s * 67);
      if (m === "gasp") return 1.35 * Math.sin(s * 6.283 / 1.3) * (1 + .2 * Math.sin(s * 31));
      const b = Math.sin(s * 6.283 / 3.6); return m === "snore" ? b * (.9 + .35 * Math.sin(s * 70) * (b > 0 ? 1 : .3)) : b * .8; };
    const draw = (now) => {
      g.clearRect(0, 0, cv.width, cv.height); const mid = h * .58, amp = h * .3, x0 = u * 1, x1 = w - u * 1.5;
      g.strokeStyle = "#ffffff12"; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x0, h * k / 4); g.lineTo(x1, h * k / 4); g.stroke(); }
      const steps = Math.round((x1 - x0) / 2); let prev = null;
      for (let i = 0; i <= steps; i++) { const px = x0 + (x1 - x0) * i / steps, s = now - win + win * i / steps; if (s < t) continue;
        const py = mid - sig(s) * amp, m = mode(s), c = m === "apnea" ? K.co : m === "gasp" ? K.moon : K.mint;
        if (prev) { g.strokeStyle = c; g.lineWidth = u * (V ? .45 : .32); g.shadowColor = c; g.shadowBlur = u * 1.2; g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(px, py); g.stroke(); }
        prev = [px, py]; }
      if (prev && now >= t) { g.fillStyle = mode(now) === "apnea" ? K.co : K.mint; g.beginPath(); g.arc(prev[0], prev[1], u * .6, 0, 6.283); g.fill(); }
      g.shadowBlur = 0;
      if (mode(now) === "apnea" && now >= t && !o.nowarn) { g.fillStyle = K.co; g.font = `600 ${u * (V ? 2.4 : 1.6)}px Lexend, sans-serif`; g.textAlign = "right";
        g.fillText(o.warn || "NO AIRFLOW", x1, u * (V ? 3 : 2.2)); g.textAlign = "left"; }
    };
    clockOn(draw); show(e, t, { opacity: 0, y: u * 3 }, .5, E.snap); if (o.until) out(e, o.until); return e;
  }
  /* spo2: monitor readout. keys [[t, value]], o.label */
  function spo2(x, y, t, keys, o = {}) {
    const w = u * (V ? 30 : 22), h = u * (V ? 18 : 14), e = box(x, y, w, h, o);
    place(mk("div", "nw-lab", e, o.label || "SpO₂ · BLOOD OXYGEN"), u * 1.4, u * 1.1);
    const n = place(mk("div", "nw-big", e), u * 1.4, h * .32), hb = place(mk("div", "nw-lab", e, "♥"), w - u * 4, u * .9); hb.style.fontSize = u * (V ? 3.4 : 2.4) + "px";
    const draw = (s) => { const v = keyv(keys, s), c = v < 90 ? K.co : K.mint; n.innerHTML = `${Math.round(v)}<small>%</small>`; n.style.color = c; n.style.textShadow = `0 0 ${u * 2}px ${c}80`;
      hb.style.color = c; hb.style.opacity = .4 + .6 * Math.max(0, Math.sin(s * (v < 90 ? 9 : 7))); };
    clockOn(draw); show(e, t, { opacity: 0, scale: .9 }, .5, E.pop); if (o.until) out(e, o.until); return e;
  }
  /* airway: 2D throat tube (side view, left = nose / mouth, right = lungs). o.g [[t, gap 0-1]], o.vib [[t0, t1]] snore vibration */
  function airway(x, y, w, h, t, o = {}) {
    const e = box(x, y, w, h, o), cv = mk("canvas", "", e); cv.width = Math.round(w); cv.height = Math.round(h); Object.assign(cv.style, { position: "absolute", left: 0, top: 0 });
    const g = cv.getContext("2d"), gk = o.g || [[0, 1]], vib = o.vib || [], n = 90;
    if (!o.nolab) { place(mk("div", "nw-lab", e, o.l || "NOSE · MOUTH"), u * 1.2, h - u * (V ? 3.6 : 2.6)); const r = place(mk("div", "nw-lab", e, o.r || "→ LUNGS"), 0, h - u * (V ? 3.6 : 2.6)); r.style.left = "auto"; r.style.right = u * 1.2 + "px";
      const m = place(mk("div", "nw-lab", e, o.m || "THROAT"), 0, u * 1); m.style.left = "50%"; m.style.transform = "translateX(-50%)"; m.style.color = K.lil; }
    const draw = (s) => {
      g.clearRect(0, 0, w, h); const gap = keyv(gk, s), vb = vib.some(([a, b]) => s >= a && s < b) ? Math.sin(s * 55) * u * .5 : 0;
      const cy = h * .52, half = h * .27, bump = (px) => Math.exp(-Math.pow((px / w - .5) / .13, 2));
      const wall = (px, sgn) => cy + sgn * half * (1 - (1 - gap) * bump(px) * 1.02) + (sgn < 0 ? vb : -vb) * bump(px);
      const tissue = g.createLinearGradient(0, 0, 0, h); tissue.addColorStop(0, "#5a2c4a"); tissue.addColorStop(.5, "#c46a86"); tissue.addColorStop(1, "#5a2c4a");
      g.fillStyle = tissue; g.beginPath(); g.moveTo(0, 0); for (let px = 0; px <= w; px += 4) g.lineTo(px, wall(px, -1)); g.lineTo(w, 0); g.fill();
      g.beginPath(); g.moveTo(0, h); for (let px = 0; px <= w; px += 4) g.lineTo(px, wall(px, 1)); g.lineTo(w, h); g.fill();
      g.strokeStyle = "#ffd6e2aa"; g.lineWidth = u * .25; [-1, 1].forEach((sg) => { g.beginPath(); for (let px = 0; px <= w; px += 4) g.lineTo(px, wall(px, sg)); g.stroke(); });
      const block = gap < .06;
      for (let i = 0; i < n; i++) {
        const sp = .12 + R(i, 2) * .1; let f = (R(i, 3) + s * sp * (.25 + gap)) % 1;
        if (block && f > .38) f = .3 + R(i, 7) * .08;
        const px = f * w, open = (wall(px, 1) - wall(px, -1)) / 2, py = cy + (R(i, 4) * 2 - 1) * Math.max(0, open - u * .6);
        g.fillStyle = block ? K.co : K.mint; g.globalAlpha = .55 + .45 * R(i, 5); g.beginPath(); g.arc(px, py, u * (.18 + R(i, 6) * .22), 0, 6.283); g.fill();
      }
      g.globalAlpha = 1;
    };
    clockOn(draw); show(e, t, { opacity: 0, scale: .94 }, .6, E.snap); if (o.until) out(e, o.until); return e;
  }
  /* night: 11 PM - 6 AM strip, moon-gold progress from t over o.d, n apnea ticks appear as it passes, live counter */
  function night(x, y, w, t, o = {}) {
    const h = u * (V ? 13 : 9.5), e = box(x, y, w, h, o), hrs = ["11 PM", "12", "1 AM", "2", "3", "4", "5", "6 AM"], n = o.n ?? 30, d = o.d ?? 4, pad = u * 2;
    const tw = w - pad * 2, ty = h * .55;
    hrs.forEach((s, i) => { const l = place(mk("div", "nw-lab", e, s), pad + tw * i / 7, ty + u * 1.2); l.style.transform = "translateX(-50%)"; });
    const base = place(mk("div", "", e), pad, ty, tw, Math.max(2, u * .2)); base.style.position = "absolute"; base.style.background = "#ffffff30";
    const pr = place(mk("div", "", e), pad, ty - u * .1, tw, u * .4); Object.assign(pr.style, { position: "absolute", background: K.moon, boxShadow: `0 0 ${u}px ${K.moon}`, transformOrigin: "0 50%" });
    tl.fromTo(pr, { scaleX: 0 }, { scaleX: 1, duration: d, ease: "none", immediateRender: true }, t + .3);
    const cnt = place(mk("div", "nw-lab", e, ""), pad, u * 1); cnt.style.color = K.co; cnt.style.fontSize = u * (V ? 3 : 2) + "px";
    const c = { v: 0 }; tl.fromTo(c, { v: 0 }, { v: n, duration: d, ease: "none", immediateRender: true, onUpdate: () => { cnt.textContent = `${o.label || "BREATHING PAUSES"} · ${Math.round(c.v)}`; } }, t + .3);
    for (let i = 0; i < n; i++) { const f = (i + .5 + (R(i, 9) - .5) * .8) / n, tk = place(mk("div", "", e), pad + tw * f, ty - u * (V ? 5 : 3.6), Math.max(2, u * .3), u * (1.6 + R(i, 8) * (V ? 3 : 2)));
      Object.assign(tk.style, { position: "absolute", background: K.co, borderRadius: u + "px", transformOrigin: "50% 100%", top: "auto", bottom: h - ty + "px" });
      gsap.set(tk, { scaleY: 0 }); tl.to(tk, { scaleY: 1, duration: .2, ease: E.pop }, t + .3 + d * f); }
    show(e, t, { opacity: 0, y: u * 3 }, .5, E.snap); if (o.until) out(e, o.until); return e;
  }
  /* ahi: ruler 0-40 events / hour with bands, needle keys [[t, value]], bands lit at o.bt [t_mild, t_mod, t_sev] */
  function ahi(x, y, w, t, keys, o = {}) {
    const h = u * (V ? 15 : 11), e = box(x, y, w, h, o), pad = u * 2, tw = w - pad * 2, by = h * .42, bh = u * (V ? 4.2 : 3.4), mx = 40;
    const bands = [[0, 5, "#ffffff22", "NORMAL"], [5, 15, K.moon, "MILD 5-14"], [15, 30, "#FF9A5A", "MODERATE 15-29"], [30, 40, K.co, "SEVERE 30+"]];
    bands.forEach(([a, b, c, l], i) => { const bd = place(mk("div", "nw-band", e), pad + tw * a / mx + 2, by, tw * (b - a) / mx - 4, bh); bd.style.top = by + "px"; bd.style.background = c;
      const lb = place(mk("div", "nw-lab", e, l), pad + tw * (a + b) / 2 / mx, by + bh + u * .9); lb.style.transform = "translateX(-50%)"; lb.style.color = i ? c : K.mute;
      if (i && o.bt) { gsap.set([bd, lb], { opacity: .18 }); tl.to([bd, lb], { opacity: 1, duration: .35, ease: E.soft }, o.bt[i - 1]); } });
    place(mk("div", "nw-lab", e, o.label || "AHI · PAUSES PER HOUR OF SLEEP"), pad, u * .9);
    const nd = place(mk("div", "", e), pad, by - u * 2.4, u * 2, u * 2); nd.innerHTML = svg(u * 2, u * 2, `<path d="M0,0 L${u * 2},0 L${u},${u * 1.8}Z" fill="${K.txt}"/>`);
    nd.style.position = "absolute"; nd.style.marginLeft = -u + "px";
    const draw = (s) => { nd.style.left = pad + tw * Math.min(mx, keyv(keys, s)) / mx + "px"; };
    clockOn(draw); show(e, t, { opacity: 0, y: u * 3 }, .5, E.snap); if (o.until) out(e, o.until); return e;
  }
  /* tank: vertical capsule filling to v %, big number under it */
  function tank(x, y, w, h, t, v, o = {}) {
    const c = o.c || K.co, cp = place(mk("div", "nw-cap", o.parent), x, y, w, h); cp.style.zIndex = o.z ?? 14;
    const f = mk("div", "", cp); Object.assign(f.style, { position: "absolute", left: 0, right: 0, bottom: 0, height: v + "%", background: `linear-gradient(0deg, ${c}, ${c}99)`, boxShadow: `0 0 ${u * 2}px ${c}`, transformOrigin: "50% 100%" });
    const nb = place(mk("div", "nw-big", o.parent), x + w / 2, y + h + u * 1.2); nb.style.transform = "translateX(-50%)"; nb.style.color = c; nb.style.zIndex = o.z ?? 14; nb.style.fontSize = u * (V ? 8 : 6) + "px";
    const lb = place(mk("div", "nw-lab", o.parent, o.label || ""), x + w / 2, y + h + u * (V ? 10 : 8)); lb.style.transform = "translateX(-50%)"; lb.style.color = K.txt; lb.style.zIndex = o.z ?? 14;
    show(cp, t, { opacity: 0, y: u * 4 }, .5, E.snap); tl.fromTo(f, { scaleY: 0 }, { scaleY: 1, duration: 1.2, ease: "power2.out", immediateRender: true }, t + .3);
    const k = { v: 0 }; tl.fromTo(k, { v: 0 }, { v, duration: 1.2, ease: "power2.out", immediateRender: true, onUpdate: () => { nb.innerHTML = `${Math.round(k.v)}<small>%</small>`; } }, t + .3);
    show(nb, t + .3, { opacity: 0 }, .4); show(lb, t + .5, { opacity: 0 }, .4);
    if (o.until) [cp, nb, lb].forEach((q) => out(q, o.until)); return cp;
  }
  /* mult: risk capsules, rows [[label, value, colour, t]], scale max */
  function mult(rows, x, y, w, o = {}) {
    const mx = o.max ?? 3, rh = u * (V ? 5 : 3.8), e = place(mk("div", "", o.parent), x, y, w, rows.length * rh * 2); e.style.position = "absolute"; e.style.zIndex = o.z ?? 14;
    rows.forEach(([l, v, c, t], i) => { const lb = place(mk("div", "nw-lab", e, l), 0, i * rh * 2); lb.style.color = K.txt;
      const cp = place(mk("div", "nw-cap", e), 0, i * rh * 2 + u * (V ? 3.4 : 2.4), w * v / mx, rh); cp.style.background = `linear-gradient(90deg, ${c}55, ${c})`; cp.style.boxShadow = `0 0 ${u * 2}px ${c}80`;
      const nb = place(mk("div", "nw-big", e, `${v}×`), w * v / mx + u * 1.5, i * rh * 2 + u * (V ? 2.4 : 1.6)); nb.style.color = c; nb.style.fontSize = rh * 1.3 + "px";
      show(lb, t, { opacity: 0, x: -u * 3 }, .4, E.snap); tl.fromTo(cp, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .9, ease: E.io, immediateRender: true }, t + .15);
      show(nb, t + .8, { opacity: 0, scale: .6 }, .45, E.pop); });
    if (o.until) out(e, o.until); return e;
  }
  /* clock: analog moon-gold clock, hands run from h0 to h1 (hours) over d */
  function clock(x, y, r, t, o = {}) {
    const e = place(mk("div", "", o.parent), x - r, y - r, r * 2, r * 2); e.style.position = "absolute"; e.style.zIndex = o.z ?? 14;
    e.innerHTML = svg(r * 2, r * 2, `<circle cx="${r}" cy="${r}" r="${r * .96}" fill="#0d0912d8" stroke="${K.moon}" stroke-width="${u * .3}"/>` +
      Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<line x1="${r + Math.sin(a) * r * .78}" y1="${r - Math.cos(a) * r * .78}" x2="${r + Math.sin(a) * r * .88}" y2="${r - Math.cos(a) * r * .88}" stroke="${K.moon}" stroke-width="${u * (i % 3 ? .2 : .4)}"/>`; }).join("") +
      `<line class="hh" x1="${r}" y1="${r}" x2="${r}" y2="${r * .5}" stroke="${K.txt}" stroke-width="${u * .55}" stroke-linecap="round"/><line class="mh" x1="${r}" y1="${r}" x2="${r}" y2="${r * .22}" stroke="${K.moon}" stroke-width="${u * .3}" stroke-linecap="round"/><circle cx="${r}" cy="${r}" r="${u * .6}" fill="${K.moon}"/>`);
    const hh = e.querySelector(".hh"), mh = e.querySelector(".mh"), h0 = o.h0 ?? 23, h1 = o.h1 ?? 30, d = o.d ?? 3;
    [hh, mh].forEach((q) => gsap.set(q, { transformOrigin: `${r}px ${r}px`, svgOrigin: `${r} ${r}` }));
    const k = { h: h0 }; const set = () => { hh.setAttribute("transform", `rotate(${k.h * 30} ${r} ${r})`); mh.setAttribute("transform", `rotate(${k.h * 360} ${r} ${r})`); }; set();
    tl.fromTo(k, { h: h0 }, { h: h1, duration: d, ease: E.io, immediateRender: true, onUpdate: set }, t + .2);
    show(e, t, { opacity: 0, scale: .7 }, .5, E.pop); if (o.until) out(e, o.until); return e;
  }
  Object.assign(NW, { trace, spo2, airway, night, ahi, tank, mult, clock, keyv });
})();
