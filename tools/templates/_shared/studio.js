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
//   S.fonts {heading, telugu (body), latin (body), script}.
(function () {
  const S = window.SCENE, P = S.params || {}, C = S.colors || {};
  const ST = S.style || {}, BG = ST.background || {}, TX = ST.text || {};
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
  window.kinetic = function (el, text, tl, at, step) {
    el.textContent = "";
    const words = (text || "").split(/\s+/).filter(Boolean);
    words.forEach((w, i) => {
      const s = document.createElement("span");
      s.className = "word";
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      const t = at + i * (step || 0.12);
      tl.fromTo(s, { opacity: 0, y: u * 4, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(2)" }, t);
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
                 circle: [{ clipPath: shut }, { clipPath: open }] };
    const OUT = { blur: [{ filter: blur(0), scale: 1 }, { filter: blur(2), scale: 1.06 }],
                  zoom: [{ filter: blur(0), scale: 1 }, { filter: blur(1.5), scale: 1.25 }],
                  circle: [{ clipPath: open }, { clipPath: shut }] };
    if (IN[tin]) tl.fromTo(wrap, IN[tin][0], { ...IN[tin][1], duration: TIN, ease: "power2.out" }, 0);
    if (tin === "wipe") tl.fromTo(panel, { xPercent: 0 }, { xPercent: 101, duration: TIN, ease: "power2.in" }, 0);
    const at = Math.max(TIN, d - TOUT);
    if (OUT[tout]) tl.fromTo(wrap, OUT[tout][0], { ...OUT[tout][1], duration: TOUT, ease: "power2.in", immediateRender: false }, at);
    if (tout === "wipe") tl.fromTo(panel, { xPercent: -101 }, { xPercent: 0, duration: TOUT, ease: "power2.out", immediateRender: false }, at);
  }

  // ---- layout zones ----
  // Text zones are measured from the laid-out page (title, kinetic lines, the lower third, cards, tags);
  // the caption band is fixed at the bottom of the safe area. Overlays and the logo grid keep out of them.
  const TEXT = "#t, #title, #sub, #kicker, #q, .ln, .lower, .item, #stat, .label, .date, .tag";
  function boxOf(el) {  // layout box in frame px, ignoring GSAP transforms (a tween may start at scale 0)
    let x = 0, y = 0;
    for (let e = el; e && e.id !== "root"; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }
  const capBand = () => ((S.captions || []).length
    ? [{ x: safe.l * S.w, y: S.h * (1 - safe.b) - u * 16, w: S.w * (1 - safe.l - safe.r), h: u * 16 }] : []);
  const textBoxes = () => [...document.querySelectorAll(TEXT)]
    .filter(e => e.offsetWidth && e.textContent.trim()).map(boxOf).concat(capBand());
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
                            Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

  // Highlight boxes and labels: pad so the glyph ink (not the font's line box) sits in the middle.
  // Telugu fonts put the ink high or low in the line box, which clipped / off-centred boxed text.
  const INKED = ".st-box, .lower, .tag";
  let ctx;
  function centreInk() {
    ctx = ctx || document.createElement("canvas").getContext("2d");
    document.querySelectorAll(INKED).forEach(el => {
      const txt = el.textContent.trim();
      if (!txt) return;
      const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = ctx.measureText(txt), asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
      if (!asc || !m.actualBoundingBoxAscent) return;
      const lh = parseFloat(cs.lineHeight) || (asc + desc), half = (lh - asc - desc) / 2;
      const inkTop = half + asc - m.actualBoundingBoxAscent, inkBot = lh - (half + asc + m.actualBoundingBoxDescent);
      const pad = fs * (el.classList.contains("lower") ? 0.22 : 0.12);
      const top = pad - inkTop, bot = pad - inkBot, lift = Math.max(0, -top, -bot);  // never negative padding
      el.style.paddingTop = (top + lift).toFixed(1) + "px";
      el.style.paddingBottom = (bot + lift).toFixed(1) + "px";
    });
  }

  // Logo scenes with logo overlays: one row of same-size white cards, centred above the lower third,
  // instead of a huge main logo plus small pop-up cards. Cards pop in at their overlay's `at`.
  function logoGrid(tl) {
    const img = document.getElementById("img"), logos = (S.overlays || []).filter(o => o.kind === "logo");
    if (!html.contains("logo-mode") || !img || !logos.length) return;
    S.overlays = S.overlays.filter(o => o.kind !== "logo");
    const all = [{ src: img.getAttribute("src"), at: 0.3 }, ...logos].sort((a, b) => (+a.at || 0) - (+b.at || 0));
    const row = document.createElement("div");
    row.className = "logos";
    row.style.setProperty("--card", { 2: 44, 3: 32 }[all.length] || 24);
    all.forEach(o => {
      const c = document.createElement("div"), im = document.createElement("img");
      c.className = "logo-card";
      im.src = o.src;
      c.appendChild(im);
      row.appendChild(c);
      tl.fromTo(c, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" },
                Math.min(Math.max(0, +o.at || 0), S.duration - 0.5));
    });
    img.style.display = "none";
    document.querySelector("#root .safe").prepend(row);
    tl.fromTo(row, { scale: 1 }, { scale: 1.04, duration: S.duration, ease: "none" }, 0);
  }

  // Overlays from visual-assets.json (S.overlays: [{src, w, h, kind, position, size, at, until, animation}]):
  // stickers, reactions, character expressions inside the safe area and above the captions band.
  // size = height as a fraction of that area. An overlay that would cover text (or another overlay)
  // moves to the first free corner, then shrinks (down to MIN_OVL); the layout check reports what is left.
  const ANCHOR = { center: [0.5, 0.5, -50, -50], left: [0, 0.5, 0, -50], right: [1, 0.5, -100, -50],
                   top: [0.5, 0, -50, 0], bottom: [0.5, 1, -50, -100], "top-left": [0, 0, 0, 0],
                   "top-right": [1, 0, -100, 0], "bottom-left": [0, 1, 0, -100], "bottom-right": [1, 1, -100, -100] };
  const SPOTS = ["top-right", "top-left", "bottom-right", "bottom-left", "right", "left"], MIN_OVL = 0.2;
  function spot(o, area, busy) {
    const ar = o.w && o.h ? o.w / o.h : 1, spots = [o.position || "center", ...SPOTS.filter(s => s !== o.position)];
    let best = null;
    for (let k = Math.max(MIN_OVL, Math.min(1, +o.size || 0.4)); ; k = Math.max(MIN_OVL, k * 0.8)) {
      for (const pos of spots) {
        const [fx, fy, xp, yp] = ANCHOR[pos] || ANCHOR.center;
        let h = k * area.h, w = h * ar;
        if (w > area.w * 0.6) { w = area.w * 0.6; h = w / ar; }
        const r = { x: area.x + fx * area.w + xp / 100 * w, y: area.y + fy * area.h + yp / 100 * h, w, h };
        const hit = busy.reduce((s, b) => s + overlap(r, b), 0);
        if (!best || hit < best.hit) best = { r, hit };
        if (!hit) return r;
      }
      if (k <= MIN_OVL) return best.r;
    }
  }
  const placed = [], panels = [];
  const area = () => ({ x: safe.l * S.w, y: safe.t * S.h, w: S.w * (1 - safe.l - safe.r),
                        h: S.h * (1 - safe.t - safe.b) - ((S.captions || []).length ? u * 16 : 0) });
  function placeOverlays() {
    const a = area(), busy = textBoxes().concat(panels);
    placed.forEach(([el, o]) => {
      const r = spot(o, a, busy);
      busy.push(r);
      if (o.text) {  // typography: only the size changes (font-size follows the box height)
        Object.assign(el.style, { left: r.x + "px", top: r.y + "px", fontSize: parseFloat(el.dataset.fs) * r.h / o.h + "px" });
      } else Object.assign(el.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
    });
  }

  // Subject panel: a person / character cut-out on a photo or footage scene stands large in a 9:16 panel
  // at the left or right edge (full height down to the caption band). Side = away from where the subject
  // stands in its own picture (o.cx = alpha centroid, 0..1), unless that side holds the lower third.
  const SUBJECT = ["character_expression", "reaction"];
  const isSubject = o => SUBJECT.includes(o.kind) && document.querySelector("#root .fill") && !html.contains("logo-mode");
  function subjectPanel(tl, o, at) {
    const bottom = S.h * (1 - safe.b) - ((S.captions || []).length ? u * 16 : 0), w = bottom * 9 / 16;
    const rect = side => ({ x: side === "right" ? S.w - w : 0, y: 0, w, h: bottom });
    const pref = (o.cx === undefined || o.cx >= 0.4) ? (o.cx > 0.6 ? "left" : "right") : "right";
    const texts = textBoxes().filter(b => b.y + b.h < bottom);
    const hit = side => texts.reduce((s, b) => s + overlap(rect(side), b), 0);
    const other = pref === "right" ? "left" : "right", side = hit(other) < hit(pref) * 0.5 ? other : pref;
    const r = rect(side), el = document.createElement("div"), img = document.createElement("img");
    el.className = "subject " + side;
    img.src = o.src;
    el.appendChild(img);
    Object.assign(el.style, { left: r.x + "px", top: "0px", width: r.w + "px", height: r.h + "px" });
    const dim = document.createElement("div");
    dim.className = "dim";
    const root = document.getElementById("root");
    root.appendChild(dim);
    root.appendChild(el);
    panels.push(r);
    document.querySelectorAll(".lower").forEach(l => {  // the label wraps before the panel instead of under it
      const room = side === "right" ? r.x - safe.l * S.w - u * 2 : S.w * (1 - safe.r) - r.w - u * 2;
      l.style.maxWidth = Math.max(u * 20, room) + "px";
      if (side === "left") l.style.marginLeft = r.w - safe.l * S.w + u * 2 + "px";
    });
    const dir = side === "right" ? 1 : -1;
    tl.fromTo(dim, { opacity: 0 }, { opacity: 1, duration: 0.4 }, at);
    tl.fromTo(el, { x: dir * r.w, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, at);
    tl.fromTo(img, { scale: 1.08 }, { scale: 1, duration: Math.max(0.5, S.duration - at), ease: "none" }, at);
  }

  // Stamp word (overlay with o.text, e.g. LAYOFFS): drawn as big bold type that slams in, not as a picture.
  function stamp(tl, o, at) {
    const el = document.createElement("div");
    el.className = "stamp";
    el.setAttribute("data-layout-allow-occlusion", "");  // the rotated box corners are empty: false "hidden under video"
    el.textContent = o.text;
    el.style.fontSize = u * 13 + "px";
    el.dataset.fs = u * 13;
    document.getElementById("root").appendChild(el);
    o.w = el.offsetWidth; o.h = el.offsetHeight; o.size = o.h / area().h;
    const flash = document.createElement("div");
    flash.className = "flash";
    flash.setAttribute("data-layout-allow-occlusion", "");  // a one-frame white pop over the stamp is intended
    document.getElementById("root").appendChild(flash);
    tl.fromTo(el, { scale: 3.2, opacity: 0, rotation: -16 }, { scale: 1, opacity: 1, rotation: -6, duration: 0.16, ease: "power4.in" }, at);
    tl.fromTo(flash, { opacity: 0.55 }, { opacity: 0, duration: 0.25 }, at + 0.16);
    tl.fromTo(el, { x: -u * 0.8 }, { x: u * 0.8, duration: 0.035, yoyo: true, repeat: 5, ease: "none" }, at + 0.16);
    tl.set(el, { x: 0 }, at + 0.4);
    return el;
  }
  function overlays(tl) {
    let panel = false;
    (S.overlays || []).forEach((o) => {
      const at = Math.min(Math.max(0, +o.at || 0), S.duration - 0.2), anim = o.animation || "pop";
      if (o.text) { placed.push([stamp(tl, o, at), o]); return; }
      if (!panel && isSubject(o)) { panel = true; subjectPanel(tl, o, at); return; }
      const el = document.createElement("img");
      el.className = "ovl";
      el.src = o.src;
      document.getElementById("root").appendChild(el);
      placed.push([el, o]);
      const fx = (ANCHOR[o.position] || ANCHOR.center)[0];
      const from = { pop: { scale: 0, opacity: 0 }, fade: { opacity: 0 }, float: { scale: 0.6, opacity: 0 },
                     slide: { x: (fx < 0.5 ? -1 : 1) * u * 30, opacity: 0 }, none: { opacity: 0 } }[anim] || { scale: 0, opacity: 0 };
      const to = { scale: 1, x: 0, opacity: 1, duration: anim === "none" ? 0.01 : 0.4,
                   ease: anim === "pop" || anim === "float" ? "back.out(2)" : "power2.out" };
      tl.fromTo(el, from, to, at);
      const end = o.until ? Math.min(+o.until, S.duration) : S.duration;
      if (anim === "float" && end - at > 1) {
        tl.to(el, { y: -u * 1.2, duration: 0.9, yoyo: true, repeat: Math.max(0, Math.floor((end - at - 0.5) / 0.9) - 1),
                    ease: "sine.inOut" }, at + 0.4);
      }
      if (o.until && end < S.duration) tl.to(el, { opacity: 0, scale: 0.9, duration: 0.2 }, end);
    });
    placeOverlays();
  }
  // Fonts change text sizes: measure again once they are in (the render waits for fonts before frames).
  function relayout() { centreInk(); placeOverlays(); }

  window.finish = function (tl) {
    if (P.look === "halftone") {  // dot screen over the picture
      const d = document.createElement("div");
      d.className = "halftone";
      document.getElementById("root").insertBefore(d, document.querySelector("#root .safe"));
    }
    scaleText();
    centreInk();
    marks(tl);
    logoGrid(tl);
    overlays(tl);
    captions(tl);
    transitions(tl);
    texture(tl);
    if (document.fonts) document.fonts.ready.then(relayout);
    // pin the timeline length to the scene so the runtime never trims or pads it
    tl.set({}, {}, S.duration);
    window.__timelines = { root: tl };
  };
})();
