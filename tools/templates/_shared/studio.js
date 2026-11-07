// Shared helpers for every HyperFrames template. Loaded after scene.js (window.SCENE) and gsap.
// window.SCENE = {id, format, w, h, fps, duration, text, query, narration, params, asset, fit,
//                 colors{background,accent,text,marker,panel,capbg}, theme, fonts{telugu,latin}, error}
// Scene params handled here for every template:
//   look: "sepia" | "bw" | "vintage" | "halftone"   photo/video filter
//   marks: [{type: "circle"|"underline"|"arrow"|"box"|"tag", x, y, w, h, at, text}]  (x/y/w/h = 0..1 of the frame)
//   marks_v: same list with 9:16 positions (the crop differs); falls back to marks
//   marker: true (last word) or ["word", ...]       highlighter swipe behind on-screen words
(function () {
  const S = window.SCENE, P = S.params || {}, C = S.colors || {};
  const r = document.documentElement.style, html = document.documentElement.classList;
  const u = Math.min(S.w, S.h) / 100;  // 1u = 1% of the short side, so layouts scale to any size
  // safe areas as fractions of width/height; 9:16 keeps clear of the Shorts/Reels UI top and bottom
  const safe = S.h > S.w ? { t: 0.14, b: 0.22, l: 0.07, r: 0.07 } : { t: 0.08, b: 0.08, l: 0.06, r: 0.06 };
  const vars = {
    "--u": u + "px", "--w": S.w + "px", "--h": S.h + "px",
    "--st": safe.t * S.h + "px", "--sb": safe.b * S.h + "px", "--sl": safe.l * S.w + "px", "--sr": safe.r * S.w + "px",
    "--bg": C.background || "#0E0E10", "--accent": C.accent || "#FFC400", "--text": C.text || "#FFFFFF",
    "--marker": C.marker || C.accent || "#FFC400", "--panel": C.panel || "rgba(14,14,16,.78)",
    "--capbg": C.capbg || "rgba(0,0,0,0)",
    "--font": `"${S.fonts.latin || "Inter"}", "${S.fonts.telugu || "Noto Sans Telugu"}", "Nirmala UI", sans-serif`,
  };
  Object.entries(vars).forEach(([k, v]) => r.setProperty(k, v));
  html.add(S.h > S.w ? "portrait" : "landscape", "theme-" + (S.theme || "dark"));
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
        tl.fromTo(s, { color: base, scale: 1 }, { color: hot, scale: 1.08, duration: 0.08, ease: "power1.out" }, w.s);
        tl.to(s, { color: base, scale: 1, duration: 0.1 }, Math.max(w.e, w.s + 0.1));
      });
    });
  }

  // Film grain (paper theme): a noise tile that jumps 12 times a second, deterministic per frame.
  function grain(tl) {
    if (S.theme !== "paper") return;
    const g = document.createElement("div");
    g.className = "grain";
    document.getElementById("root").appendChild(g);
    for (let k = 0, t = 0; t < S.duration; k++, t = k / 12) {
      const rx = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1, ry = Math.abs(Math.sin(k * 78.233) * 12345.678) % 1;
      tl.set(g, { backgroundPosition: `${Math.round(rx * 200)}px ${Math.round(ry * 200)}px` }, t);
    }
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

  window.finish = function (tl) {
    if (P.look === "halftone") {  // dot screen over the picture
      const d = document.createElement("div");
      d.className = "halftone";
      document.getElementById("root").insertBefore(d, document.querySelector("#root .safe"));
    }
    marks(tl);
    captions(tl);
    grain(tl);
    // pin the timeline length to the scene so the runtime never trims or pads it
    tl.set({}, {}, S.duration);
    window.__timelines = { root: tl };
  };
})();
