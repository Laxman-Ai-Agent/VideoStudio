// Shared helpers for every HyperFrames template. Loaded after scene.js (window.SCENE) and gsap.
// window.SCENE = {id, format, w, h, fps, duration, text, query, narration, params, asset, fit,
//                 colors{background,accent,text,marker,panel,capbg}, theme, fonts{telugu,latin}, error}
// Scene params handled here for every template:
//   look: "sepia" | "bw" | "vintage" | "halftone"   photo/video filter
//   marks: [{type: "circle"|"underline"|"arrow"|"box"|"tag", x, y, w, h, at, text}]  (x/y/w/h = 0..1 of the frame)
//   marks_v: same list with 9:16 positions (the crop differs); falls back to marks
//   marker: true (last word) or ["word", ...]       highlighter swipe behind on-screen words
//   bg_level: 0..1                                  background pattern/texture intensity for this scene
// Video theme (work/theme.json via render): S.style.background {type, colors, angle, pattern, pattern_opacity,
//   texture, texture_opacity}, S.style.text {heading_weight, body_weight, shadow, tracking, scale},
//   S.fonts {heading, telugu (body), latin (body), script}, S.style.motion {text_in, camera, transitions}
//   (the video's motion language, theme.py TEXT_IN / CAMERA / TRANSITIONS; missing = pop / drift).
(function () {
  const S = window.SCENE, P = S.params || {}, C = S.colors || {};
  const ST = S.style || {}, BG = ST.background || {}, TX = ST.text || {}, MO = ST.motion || {};
  const r = document.documentElement.style, html = document.documentElement.classList;
  const u = Math.min(S.w, S.h) / 100;  // 1u = 1% of the short side, so layouts scale to any size
  // safe areas as fractions of width/height; 9:16 keeps clear of the Shorts/Reels UI top and bottom
  const safe = S.h > S.w ? { t: 0.14, b: 0.22, l: 0.07, r: 0.07 } : { t: 0.08, b: 0.08, l: 0.06, r: 0.06 };
  const lum = h => {  // relative luminance of #rgb / #rrggbb, for light/dark tone
    let x = String(h || "#000").replace("#", "");
    if (x.length === 3) x = x.split("").map(c => c + c).join("");
    const [R, G, B] = [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16) / 255)
      .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };
  const light = lum(C.background) > 0.35, level = P.bg_level === undefined ? 1 : Math.max(0, Math.min(1, +P.bg_level));
  const body = S.fonts.telugu || "Noto Sans Telugu", stack = `"${body}", "Noto Sans Telugu", "Nirmala UI", sans-serif`;
  const cols = (BG.colors && BG.colors.length ? BG.colors : [C.background || "#0E0E10"]).join(", ");
  const bgImg = { linear: `linear-gradient(${BG.angle || 180}deg, ${cols})`, multi: `linear-gradient(${BG.angle || 180}deg, ${cols})`,
                  radial: `radial-gradient(ellipse at 50% 40%, ${cols})` }[BG.type] || "none";
  const PAT = { grid: [`linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)`, `${u * 6}px ${u * 6}px`],
                dots: [`radial-gradient(circle, var(--text) ${u * 0.18}px, transparent ${u * 0.24}px)`, `${u * 3}px ${u * 3}px`],
                lines: [`repeating-linear-gradient(45deg, var(--text) 0 1px, transparent 1px ${u * 2.2}px)`, `auto`] }[BG.pattern || "grid"];
  const SHADOW = { soft: `0 ${u * 0.3}px ${u * 1.2}px rgba(0,0,0,${light ? 0.18 : 0.45})`, hard: `${u * 0.25}px ${u * 0.25}px 0 rgba(0,0,0,.55)`,
                   glow: `0 0 ${u * 1.4}px ${C.accent || "#FFC400"}`, none: "none" };
  const vars = {
    "--u": u + "px", "--w": S.w + "px", "--h": S.h + "px",
    "--st": safe.t * S.h + "px", "--sb": safe.b * S.h + "px", "--sl": safe.l * S.w + "px", "--sr": safe.r * S.w + "px",
    "--bg": C.background || "#0E0E10", "--accent": C.accent || "#FFC400", "--text": C.text || "#FFFFFF",
    "--text2": C.text2 || C.text || "#FFFFFF", "--warn": C.warning || C.accent || "#FF5A5A",
    "--marker": C.marker || C.accent || "#FFC400", "--panel": C.panel || "rgba(14,14,16,.78)",
    "--capbg": C.capbg || "rgba(0,0,0,0)",
    "--font": stack, "--font-head": `"${S.fonts.heading || body}", ${stack}`,
    "--font-script": `"${S.fonts.script || body}", ${stack}`,
    "--font-hero": `"${S.fonts.hero || S.fonts.heading || body}", ${stack}`,
    "--bg-img": bgImg, "--hw": TX.heading_weight || 800, "--bw": TX.body_weight || 600,
    "--tracking": (TX.tracking || 0) + "em", "--tshadow": SHADOW[TX.shadow] || "none", "--tscale": TX.scale || 1,
    "--outline": (u * (TX.outline || 0)).toFixed(2) + "px", "--outline-c": C.background || "#000",
    "--pat-img": PAT ? PAT[0] : "none", "--pat-size": PAT ? PAT[1] : "auto",
    "--pat-op": BG.pattern === "none" ? 0 : (BG.pattern_opacity === undefined ? 0.07 : BG.pattern_opacity) * level,
  };
  Object.entries(vars).forEach(([k, v]) => r.setProperty(k, v));
  html.add(S.h > S.w ? "portrait" : "landscape", "theme-" + (S.theme || "dark"), light ? "tone-light" : "tone-dark");
  if (P.look) html.add("look-" + P.look);
  window.U = u;

  const markWords = P.marker === true ? null : [].concat(P.marker || []).map(String);
  // Kinetic text: one span per word (spaces only, so Telugu conjuncts stay whole), staggered pop-in.
  const bl = k => `blur(${(u * k).toFixed(1)}px)`;
  const TEXT_IN = {  // word entrance per video (theme motion.text_in): [from, to]
    pop: [{ opacity: 0, y: u * 4, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(2)" }],
    rise: [{ opacity: 0, y: u * 6 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }],
    blur: [{ opacity: 0, filter: bl(1.2), scale: 1.04 }, { opacity: 1, filter: bl(0), scale: 1, duration: 0.45, ease: "power2.out" }],
    slide: [{ opacity: 0, x: -u * 5 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }],
    mask: [{ clipPath: "inset(-30% -10% 130% -10%)", y: u * 2 }, { clipPath: "inset(-30% -10% -30% -10%)", y: 0, duration: 0.45, ease: "power3.out" }],
    type: [{ opacity: 0 }, { opacity: 1, duration: 0.04, ease: "none" }],
    fade: [{ opacity: 0 }, { opacity: 1, duration: 0.6, ease: "sine.out" }],
  };
  window.kinetic = function (el, text, tl, at, step) {
    el.textContent = "";
    const words = (text || "").split(/\s+/).filter(Boolean);
    words.forEach((w, i) => {
      const s = document.createElement("span");
      s.className = "word";
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      const t = at + i * (step || 0.12), [from, to] = TEXT_IN[MO.text_in] || TEXT_IN.pop;
      tl.fromTo(s, { ...from }, { ...to }, t);
      const bare = w.replace(/[.,!?;:"'“”‘’]/g, "");
      if (P.marker && (markWords ? markWords.includes(bare) : i === words.length - 1)) {
        s.classList.add("mk");
        tl.fromTo(s, { backgroundSize: "0% 42%" }, { backgroundSize: "100% 42%", duration: 0.35, ease: "power2.out" }, t + 0.35);
      }
    });
    return words.length;
  };

  // Word-by-word captions (S.captions = pages of {t, s, e}, scene-relative seconds; empty = off).
  // One page at a time in the bottom third; the spoken word turns marker-coloured and pops.
  function captions(tl) {
    const pages = S.captions || [];
    if (!pages.length) return;
    html.add("has-captions");
    const box = document.createElement("div");
    box.className = "captions";
    document.getElementById("root").appendChild(box);
    const base = "#FFFFFF", hot = C.marker || C.accent || "#FFC400";  // on photos or the caption pill
    pages.forEach((page, i) => {
      const el = document.createElement("div");
      el.className = "cap-page";
      box.appendChild(el);
      const end = i + 1 < pages.length ? pages[i + 1][0].s : S.duration;
      tl.set(el, { autoAlpha: 0 }, 0);
      tl.set(el, { autoAlpha: 1 }, page[0].s);
      if (end < S.duration) tl.set(el, { autoAlpha: 0 }, end);
      page.forEach((w, j) => {
        const s = document.createElement("span");
        s.className = "word cap-word";
        s.textContent = w.t;
        el.appendChild(s);
        if (j < page.length - 1) el.appendChild(document.createTextNode(" "));
        tl.fromTo(s, { color: base, scale: 1 }, { color: hot, scale: 1.05, duration: 0.08, ease: "power1.out" }, w.s);
        tl.to(s, { color: base, scale: 1, duration: 0.1 }, Math.max(w.e, w.s + 0.1));
      });
    });
  }

  // Background texture from the theme. grain/paper: a noise tile that jumps 12 times a second
  // (deterministic per frame). smoke/particles/stars drift slowly and are skipped over real photos
  // and footage, so they never cover the picture.
  function texture(tl) {
    const kind = BG.texture || "none", op = (BG.texture_opacity || 0) * level;
    const media = S.asset && S.asset !== "cut.png";
    if (kind === "none" || op <= 0 || (media && kind !== "grain" && kind !== "paper")) return;
    const g = document.createElement("div");
    g.className = "tex tex-" + kind;
    g.style.opacity = op;
    document.getElementById("root").appendChild(g);
    if (kind === "grain" || kind === "paper") {
      g.classList.add("grain");
      for (let k = 0, t = 0; t < S.duration; k++, t = k / 12) {
        const rx = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1, ry = Math.abs(Math.sin(k * 78.233) * 12345.678) % 1;
        tl.set(g, { backgroundPosition: `${Math.round(rx * 200)}px ${Math.round(ry * 200)}px` }, t);
      }
    } else {
      tl.fromTo(g, { x: -u * 3, y: kind === "smoke" ? 0 : u * 2 }, { x: u * 3, y: kind === "smoke" ? -u * 2 : -u * 2,
                     duration: S.duration, ease: "none" }, 0);
    }
  }

  // Theme text scale for headings, lower thirds and on-screen titles (captions scale in CSS).
  const HEAD = "#t, #title, .ln, .item, #stat .val, .lower, .date, .label, #bgw";
  function scaleText() {
    const k = +(TX.scale || 1);
    if (Math.abs(k - 1) < 0.01) return;
    document.querySelectorAll(HEAD).forEach(el => {
      el.style.fontSize = parseFloat(getComputedStyle(el).fontSize) * k + "px";
    });
  }

  // Hand-drawn marks: a wobbly path that draws itself (stroke-dashoffset), or a sticker tag.
  const wob = (k, n) => Math.sin(k * 7.13 + n * 1.7) * 0.035;  // deterministic wobble
  function markPath(m) {
    const [x, y, w, h] = [m.x * S.w, m.y * S.h, (m.w || 0.1) * S.w, (m.h || 0.1) * S.h];
    if (m.type === "circle") {
      const cx = x + w / 2, cy = y + h / 2, pts = [];
      for (let k = 0; k <= 48; k++) {  // a bit more than a full turn, like a pen stroke
        const a = -0.6 + (k / 48) * (Math.PI * 2 + 0.9), f = 1 + wob(k, 1) + k / 48 * 0.06;
        pts.push(`${(cx + Math.cos(a) * w / 2 * f).toFixed(1)} ${(cy + Math.sin(a) * h / 2 * f).toFixed(1)}`);
      }
      return "M" + pts.join(" L");
    }
    if (m.type === "underline") return `M${x} ${y} Q${x + w * 0.3} ${y + u * 0.9} ${x + w * 0.55} ${y + u * 0.2} T${x + w} ${y + u * 0.4}`;
    if (m.type === "box") {
      const j = u * 0.6;
      return `M${x - j} ${y + j} L${x + w + j} ${y - j} L${x + w - j} ${y + h + j} L${x + j} ${y + h - j} Z`;
    }
    if (m.type === "arrow") {  // from (x, y) towards (x + w, y + h), curved, with a head
      const ex = x + w, ey = y + h, ang = Math.atan2(h, w), hl = u * 3;
      return `M${x} ${y} Q${x + w * 0.2} ${y + h * 0.8} ${ex} ${ey} M${ex - hl * Math.cos(ang - 0.5)} ${ey - hl * Math.sin(ang - 0.5)} L${ex} ${ey} ` +
             `L${ex - hl * Math.cos(ang + 0.5)} ${ey - hl * Math.sin(ang + 0.5)}`;
    }
    return "";
  }
  function marks(tl) {
    const list = [].concat((S.h > S.w && P.marks_v) || P.marks || []);  // marks_v: own positions for 9:16
    if (!list.length) return;
    const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "marks");
    svg.setAttribute("viewBox", `0 0 ${S.w} ${S.h}`);
    document.getElementById("root").appendChild(svg);
    list.forEach((m, i) => {
      const at = m.at !== undefined ? m.at : 0.6 + i * 0.3;
      if (m.type === "callout") {  // circle on a thing, then a label pops beside it (m.side: right | left)
        const [x, y, w, h] = [m.x * S.w, m.y * S.h, (m.w || 0.1) * S.w, (m.h || 0.1) * S.h];
        const left = m.side === "left", cy = y + h / 2, ex = left ? x : x + w, lx = ex + (left ? -1 : 1) * u * 5;
        const stroke = (d, t0, dur) => {
          const p = document.createElementNS(NS, "path");
          p.setAttribute("d", d);
          p.setAttribute("class", "mark");
          if (m.color) p.style.stroke = m.color;
          svg.appendChild(p);
          const len = p.getTotalLength();
          p.style.strokeDasharray = len;
          tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: dur, ease: "power1.inOut" }, t0);
        };
        stroke(markPath({ ...m, type: "circle" }), at, 0.45);
        stroke(`M${ex} ${cy} L${lx} ${cy}`, at + 0.4, 0.15);
        const t = document.createElement("div");
        t.className = "tag callout";
        t.textContent = m.text || "";
        Object.assign(t.style, { left: lx + "px", top: cy + "px", transformOrigin: left ? "100% 50%" : "0 50%" });
        document.getElementById("root").appendChild(t);
        gsap.set(t, { xPercent: left ? -100 : 0, yPercent: -50 });
        tl.fromTo(t, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2.5)" }, at + 0.5);
        return;
      }
      if (m.type === "tag") {
        const t = document.createElement("div");
        t.className = "tag";
        t.textContent = m.text || "";
        Object.assign(t.style, { left: m.x * S.w + "px", top: m.y * S.h + "px" });
        document.getElementById("root").appendChild(t);
        tl.fromTo(t, { scale: 0, rotation: -25 }, { scale: 1, rotation: -8, duration: 0.4, ease: "back.out(2.5)" }, at);
        return;
      }
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", markPath(m));
      p.setAttribute("class", "mark");
      if (m.color) p.style.stroke = m.color;
      svg.appendChild(p);
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.5, ease: "power1.inOut" }, at);
    });
  }

  // Transitions (S.trans_in / S.trans_out, set per cut by render.transitions): the whole frame moves
  // in over the first 0.25 s and out over the last 0.2 s; both sides of a cut use the same type.
  const TIN = 0.25, TOUT = 0.2;
  function transitions(tl) {
    const tin = S.trans_in, tout = S.trans_out, d = S.duration;
    if (!tin && !tout) return;
    const root = document.getElementById("root"), wrap = document.createElement("div");
    wrap.className = "tx";
    while (root.firstChild) wrap.appendChild(root.firstChild);
    root.appendChild(wrap);
    const panel = document.createElement("div");
    panel.className = "wipe";
    root.appendChild(panel);
    tl.set(panel, { xPercent: -101 }, 0);
    const blur = k => `blur(${(u * k).toFixed(1)}px)`, open = "circle(75% at 50% 50%)", shut = "circle(0% at 50% 50%)";
    const IN = { blur: [{ filter: blur(2), scale: 1.06 }, { filter: blur(0), scale: 1 }],
                 zoom: [{ filter: blur(1.5), scale: 0.82 }, { filter: blur(0), scale: 1 }],
                 circle: [{ clipPath: shut }, { clipPath: open }],
                 slide: [{ xPercent: 12, opacity: 0 }, { xPercent: 0, opacity: 1 }],
                 dip: [{ opacity: 0 }, { opacity: 1 }], flash: [{ scale: 1.08 }, { scale: 1 }] };
    const OUT = { blur: [{ filter: blur(0), scale: 1 }, { filter: blur(2), scale: 1.06 }],
                  zoom: [{ filter: blur(0), scale: 1 }, { filter: blur(1.5), scale: 1.25 }],
                  circle: [{ clipPath: open }, { clipPath: shut }],
                  slide: [{ xPercent: 0, opacity: 1 }, { xPercent: -12, opacity: 0 }],
                  dip: [{ opacity: 1 }, { opacity: 0 }], flash: [{ scale: 1 }, { scale: 1.08 }] };
    if (tin === "flash" || tout === "flash") {  // dramatic: a white flash over the cut (use sparingly)
      const f = document.createElement("div");
      f.className = "flash";
      root.appendChild(f);
      tl.set(f, { opacity: 0 }, 0);
      if (tin === "flash") tl.fromTo(f, { opacity: 0.9 }, { opacity: 0, duration: TIN, ease: "power2.out" }, 0);
      if (tout === "flash") tl.fromTo(f, { opacity: 0 }, { opacity: 0.9, duration: TOUT, ease: "power2.in", immediateRender: false },
                                      Math.max(TIN, d - TOUT));
    }
    if (IN[tin]) tl.fromTo(wrap, IN[tin][0], { ...IN[tin][1], duration: TIN, ease: "power2.out" }, 0);
    if (tin === "wipe") tl.fromTo(panel, { xPercent: 0 }, { xPercent: 101, duration: TIN, ease: "power2.in" }, 0);
    const at = Math.max(TIN, d - TOUT);
    if (OUT[tout]) tl.fromTo(wrap, OUT[tout][0], { ...OUT[tout][1], duration: TOUT, ease: "power2.in", immediateRender: false }, at);
    if (tout === "wipe") tl.fromTo(panel, { xPercent: -101 }, { xPercent: 0, duration: TOUT, ease: "power2.out", immediateRender: false }, at);
  }

  const L = window.studioL = window.studioLayout({ S, u, safe, html });
  window.finish = function (tl) {
    if (P.look === "halftone") {  // dot screen over the picture
      const d = document.createElement("div");
      d.className = "halftone";
      document.getElementById("root").insertBefore(d, document.querySelector("#root .safe"));
    }
    scaleText();
    L.centreInk();
    marks(tl);
    L.logoGrid(tl);
    L.layers();
    L.overlays(tl);
    captions(tl);
    transitions(tl);
    texture(tl);
    if (document.fonts) document.fonts.ready.then(L.relayout);
    // pin the timeline length to the scene so the runtime never trims or pads it
    tl.set({}, {}, S.duration);
    window.__timelines = { root: tl };
  };
})();
