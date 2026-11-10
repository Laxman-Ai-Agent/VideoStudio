// Layout zones, ink centring, logo grid, overlays (subject panel, stamp words, cut-out treatments).
// Loaded before studio.js (render.build puts the two files into one studio.js); studio.js calls
// window.studioLayout({S, u, safe, html}) and uses the returned functions in finish().
window.studioLayout = function (env) {
  const { S, u, safe, html } = env;
  // ---- layout zones ----
  // Text zones are measured from the laid-out page (title, kinetic lines, the lower third, cards, tags);
  // the caption band is fixed at the bottom of the safe area. Overlays and the logo grid keep out of them.
  const TEXT = "#t, #title, #sub, #kicker, #q, .ln, .lower, .item, #stat, .label, .date, .tag, .memecap";
  function boxOf(el) {  // layout box in frame px, ignoring GSAP transforms (a tween may start at scale 0)
    if (!(el instanceof HTMLElement)) {  // an <svg> (map, arrow, trend line) has no offsetLeft: measure it against the root
      const r = el.getBoundingClientRect(), rr = document.getElementById("root").getBoundingClientRect();
      return { x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height };
    }
    let x = 0, y = 0;
    for (let e = el; e && e.id !== "root"; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }
  const CAP_BAND = 9;  // caption band height in u, matches .has-captions .safe in studio.css
  const capBand = () => ((S.captions || []).length
    ? [{ x: safe.l * S.w, y: S.h * (1 - safe.b) - u * CAP_BAND, w: S.w * (1 - safe.l - safe.r), h: u * CAP_BAND }] : []);
  const textBoxes = () => [...document.querySelectorAll(TEXT)]
    .filter(e => e.offsetWidth && e.textContent.trim()).map(boxOf).concat(capBand());
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
                            Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

  // Highlight boxes and labels: pad so the glyph ink (not the font's line box) sits in the middle.
  // Telugu fonts put the ink high or low in the line box, which clipped / off-centred boxed text.
  const INKED = ".st-box, .st-pill, .lower, .tag, .memecap";
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
  // Cut-out treatments (placement.outline / bw / backdrop, see docs/STYLE.md): sticker outline, black-and-white
  // subject, and a glow disc / concentric rings / sunburst rays behind it in the accent colour.
  function treatFilter(o) {
    const f = [], n = u * 0.55, c = o.outline === "accent" ? "var(--accent)" : "#fff";
    if (o.bw) f.push("grayscale(1) contrast(1.12)");
    if (o.outline) f.push(...[[n, 0], [-n, 0], [0, n], [0, -n]].map(([x, y]) => `drop-shadow(${x}px ${y}px 0 ${c})`));
    if (f.length) f.push(`drop-shadow(0 ${u * 0.7}px ${u * 1.6}px rgba(0,0,0,.45))`);
    return f.join(" ");
  }
  function backdrop(tl, o, at) {
    if (!["glow", "rings", "rays"].includes(o.backdrop)) return null;
    const bd = document.createElement("div");
    bd.className = "bd bd-" + o.backdrop;
    tl.fromTo(bd, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" }, at);
    if (o.backdrop === "rays") tl.to(bd, { rotation: 24, duration: Math.max(0.5, S.duration - at), ease: "none" }, at);
    return bd;
  }
  const placed = [], panels = [], reg = [];
  // Manual edits (Timeline "Visual Edit", pipeline/edits.py): o.manual = {x,y,w,h (fractions of the frame), rot, opacity, z}
  // overrides the automatic placement of that one element. reg = editable elements, read by the dashboard (__boxes).
  const mbox = m => ({ x: m.x * S.w, y: m.y * S.h, w: m.w * S.w, h: m.h * S.h });
  const op = o => (o.manual ? o.manual.opacity : 1);
  function fx(el, o, live) {  // rotation (CSS rotate: does not fight GSAP's transform), layer; opacity only when live-editing
    const m = o.manual;
    if (!m) return;
    if (el.dataset.z0 === undefined) el.dataset.z0 = parseInt(getComputedStyle(el).zIndex, 10) || 0;
    Object.assign(el.style, { rotate: m.rot + "deg", transformOrigin: "50% 50%", zIndex: +el.dataset.z0 + m.z });
    if (live) gsap.set(el, { opacity: m.opacity });
  }
  const add = (el, o, kind, place) => { el.dataset.eid = o.id || ""; reg.push({ el, o, kind, place }); };
  const area = () => ({ x: safe.l * S.w, y: safe.t * S.h, w: S.w * (1 - safe.l - safe.r),
                        h: S.h * (1 - safe.t - safe.b) - ((S.captions || []).length ? u * CAP_BAND : 0) });
  function placeOverlays() {
    const a = area(), busy = textBoxes().concat(panels);
    placed.forEach(([el, o, bd]) => {
      const auto = spot(o, a, busy), r = o.manual ? mbox(o.manual) : auto;
      o.auto = auto;  // the automatic box, kept for the editor (scale % and reset)
      busy.push(r);
      if (bd) {  // backdrop centred on the subject, a bit larger
        const d = Math.max(r.w, r.h) * 1.4;
        Object.assign(bd.style, { left: r.x + r.w / 2 - d / 2 + "px", top: r.y + r.h / 2 - d / 2 + "px", width: d + "px", height: d + "px" });
      }
      if (o.text) {  // typography: only the size changes (font-size follows the box height)
        Object.assign(el.style, { left: r.x + "px", top: r.y + "px", fontSize: parseFloat(el.dataset.fs) * r.h / o.h + "px" });
      } else Object.assign(el.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
      fx(el, o);
    });
  }

  // Subject panel: a person / character cut-out on a photo or footage scene stands large in a 9:16 panel
  // at the left or right edge (full height down to the caption band). Side = away from where the subject
  // stands in its own picture (o.cx = alpha centroid, 0..1), unless that side holds the lower third.
  const SUBJECT = ["character_expression", "reaction"];
  const isSubject = o => SUBJECT.includes(o.kind) && document.querySelector("#root .fill") && !html.contains("logo-mode");
  function subjectPanel(tl, o, at) {
    const bottom = S.h * (1 - safe.b) - ((S.captions || []).length ? u * CAP_BAND : 0), w = bottom * 9 / 16;
    const rect = side => ({ x: side === "right" ? S.w - w : 0, y: 0, w, h: bottom });
    const pref = (o.cx === undefined || o.cx >= 0.4) ? (o.cx > 0.6 ? "left" : "right") : "right";
    const texts = textBoxes().filter(b => b.y + b.h < bottom);
    const hit = side => texts.reduce((s, b) => s + overlap(rect(side), b), 0);
    const other = pref === "right" ? "left" : "right", side = hit(other) < hit(pref) * 0.5 ? other : pref;
    const r = o.manual ? mbox(o.manual) : rect(side), el = document.createElement("div"), img = document.createElement("img");
    el.className = "subject " + side;
    img.src = o.src;
    const tf = treatFilter(o), bd = backdrop(tl, o, at);
    if (tf) img.style.filter = tf;
    if (bd) {  // disc behind the head and chest, clipped by the panel
      const d = r.w * 1.7;
      Object.assign(bd.style, { left: r.w / 2 - d / 2 + "px", top: r.h * 0.4 - d / 2 + "px", width: d + "px", height: d + "px" });
      el.appendChild(bd);
    }
    el.appendChild(img);
    Object.assign(el.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
    add(el, o, "subject", () => { const q = mbox(o.manual); Object.assign(el.style, { left: q.x + "px", top: q.y + "px", width: q.w + "px", height: q.h + "px" }); });
    fx(el, o);
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
    tl.fromTo(el, { x: dir * r.w, opacity: 0 }, { x: 0, opacity: op(o), duration: 0.5, ease: "power3.out" }, at);
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
    add(el, o, "stamp");
    o.w = el.offsetWidth; o.h = el.offsetHeight; o.size = o.h / area().h;
    const flash = document.createElement("div");
    flash.className = "flash";
    flash.setAttribute("data-layout-allow-occlusion", "");  // a one-frame white pop over the stamp is intended
    document.getElementById("root").appendChild(flash);
    tl.fromTo(el, { scale: 3.2, opacity: 0, rotation: -16 }, { scale: 1, opacity: op(o), rotation: -6, duration: 0.16, ease: "power4.in" }, at);
    tl.fromTo(flash, { opacity: 0.55 }, { opacity: 0, duration: 0.25 }, at + 0.16);
    tl.fromTo(el, { x: -u * 0.8 }, { x: u * 0.8, duration: 0.035, yoyo: true, repeat: 5, ease: "none" }, at + 0.16);
    tl.set(el, { x: 0 }, at + 0.4);
    return el;
  }
  // Depth prop (placement.depth): a big, slightly blurred object cut by the frame corner, behind the text, drifting.
  function depthProp(tl, o, at) {
    const el = document.createElement("img"), h = Math.max(0.1, Math.min(0.9, +o.size || 0.4)) * S.h, w = h * (o.w && o.h ? o.w / o.h : 1);
    const [ax, fy] = ANCHOR[o.position] || ANCHOR["bottom-left"], root = document.getElementById("root");
    el.className = "ovl depth";
    el.src = o.src;
    Object.assign(el.style, { width: w + "px", height: h + "px", filter: `blur(${u * 0.7}px) drop-shadow(0 ${u}px ${u * 2}px rgba(0,0,0,.4))`,
      left: (ax < 0.5 ? -w * 0.18 : S.w - w * 0.82) + "px", top: (fy < 0.5 ? -h * 0.18 : S.h - h * 0.82) + "px" });
    root.insertBefore(el, document.querySelector("#root .safe"));
    const put = () => { const q = mbox(o.manual); Object.assign(el.style, { left: q.x + "px", top: q.y + "px", width: q.w + "px", height: q.h + "px" }); };
    add(el, o, "depth", put);
    if (o.manual) put();
    fx(el, o);
    tl.fromTo(el, { x: (ax < 0.5 ? -1 : 1) * w * 0.4, opacity: 0 }, { x: 0, opacity: op(o), duration: 0.6, ease: "power3.out" }, at);
    tl.to(el, { y: -u * 1.5, rotation: ax < 0.5 ? 2 : -2, duration: Math.max(1, S.duration - at - 0.6), ease: "sine.inOut" }, at + 0.6);
  }
  // ---- Generic layers: the background picture / footage and every text block of the template ("L:bg", "L:t1" ...).
  // S.layers[id] = manual {x,y,w,h (the wanted visual box, fractions of the frame), rot, opacity, z, hidden}. The box is
  // reached with CSS translate / scale / rotate and filter: opacity(), which GSAP (it only writes `transform`) leaves alone.
  const LTEXT = "#t, #title, #sub, #kicker, #q, .ln, .lower, .item, #stat .lab, #stat .val, .label, .date, .memecap";  // a stat card: its label and its value are separate layers
  const gl = [];
  // Every other visible part of a scene is a layer too (2026-11-10, user: each part of a scene must be editable): [name, selector, kind].
  // Ids are named (L:g-grid, L:g-card2 ...) so adding a part never renumbers the older L:tN / edits. A template can add its own
  // parts with window.LAYER_PARTS = [[name, selector, kind], ...]. "text" parts get the Words box in the editor.
  const PARTS = [
    ["Grid", ".grid", "graphic"], ["Shade", ".shade", "graphic"], ["Glow", "#glow", "graphic"], ["Big word", "#bgw", "text"],
    ["Animation", "#anim", "graphic"], ["Map", "#map", "graphic"], ["Bars", "#bars", "graphic"], ["Number", "#num", "text"],
    ["Source", "#src", "text"], ["Card", ".card", "graphic"], ["Tile", ".tile", "graphic"], ["Button", "#btn", "text"],
    ["Arrow", "#stat .arrow", "graphic"], ["Trend line", "#stat > svg", "graphic"], ["Accent bar", "#bar", "graphic"],
    ["Quote mark", "#qm", "text"], ["Name", "#by", "text"], ["Role", "#role", "text"], ["Timeline line", "#line", "graphic"],
    ["Dot", ".dot", "graphic"], ["Window", "#win", "graphic"], ["Cut-out", "#cut", "graphic"], ["Frame", "#frame", "graphic"],
    ["Corner", ".br", "graphic"], ["Foreground", "#fg", "graphic"], ["Logos", ".logo-grid", "graphic"], ["Sun", "#sun", "graphic"],
    ...(window.LAYER_PARTS || []),
  ];
  const shown = e => (e instanceof HTMLElement ? e.offsetWidth && e.offsetHeight : (() => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; })());
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  function findLayers() {
    const root = document.getElementById("root");
    let bg = [...document.querySelectorAll("#root .fill:not(.blurbg)")].filter(e => e.offsetWidth).pop();
    if (!bg) {  // scenes without a picture: the theme backdrop becomes its own "Background" layer
      bg = document.createElement("div");
      bg.className = "bgplate";
      root.insertBefore(bg, root.firstChild);
    }
    const txt = [...document.querySelectorAll(LTEXT)].filter(e => e.offsetWidth && e.textContent.trim());
    const outer = txt.filter(e => !txt.some(o => o !== e && o.contains(e)));  // a block inside another block is not its own layer
    const man = S.layers || {};
    if (bg) gl.push({ el: bg, kind: "background", o: { id: "L:bg", manual: man["L:bg"], name: "Background", src: bg.getAttribute("src") || "" } });
    outer.forEach((e, i) => gl.push({ el: e, kind: "text", o: { id: "L:t" + (i + 1), manual: man["L:t" + (i + 1)],
      name: e.textContent.trim().replace(/\s+/g, " ").slice(0, 28), src: "" } }));
    const used = new Set(gl.map(g => g.el)), textEls = gl.filter(g => g.kind === "text").map(g => g.el);
    for (const [name, sel, kind] of PARTS) {
      const els = [...document.querySelectorAll("#root " + sel)].filter(e => !used.has(e) && shown(e) &&
        (kind !== "text" || (e.textContent.trim() && !textEls.some(t => t.contains(e) || e.contains(t)))));
      els.forEach((e, i) => {
        used.add(e);
        const id = "L:g-" + slug(name) + (els.length > 1 ? i + 1 : "");
        gl.push({ el: e, kind, o: { id, manual: man[id], name: name + (els.length > 1 ? " " + (i + 1) : ""), src: "" } });
      });
    }
    gl.forEach(g => { g.f0 = getComputedStyle(g.el).filter; if (g.f0 === "none") g.f0 = ""; });
  }
  // Replacement words for a text block (manual.text): put them into the block's existing text nodes (word spans keep
  // their animation); fewer words than nodes -> the rest stay empty, more words -> the last node takes them.
  function applyText(g) {
    const el = g.el;
    if (!g.tn) {
      g.tn = [];
      const wk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n; (n = wk.nextNode());) if (n.nodeValue.trim()) g.tn.push({ n, t0: n.nodeValue });
    }
    const want = g.kind === "text" && g.o.manual && g.o.manual.text;
    if (!want) { g.tn.forEach(x => { x.n.nodeValue = x.t0; }); return; }
    const words = want.split(/\s+/).filter(Boolean), k = g.tn.length;
    g.tn.forEach((x, i) => {
      const lead = x.t0.match(/^\s*/)[0], trail = x.t0.match(/\s*$/)[0];
      x.n.nodeValue = lead + (i < k - 1 ? words[i] || "" : words.slice(i).join(" ")) + trail;
    });
  }
  function placeLayer(g) {
    const { el, o } = g, st = el.style;
    applyText(g);
    st.translate = st.scale = st.rotate = st.transformOrigin = "";
    st.zIndex = ""; st.visibility = ""; st.filter = "";
    g.nat = boxOf(el);
    const m = o.manual;
    if (!m) return;
    if (m.hidden) { st.visibility = "hidden"; return; }
    if (window.gsap) gsap.getProperty(el, "x");  // make GSAP read the element's own transform first
    const b = mbox(m), n = g.nat;
    st.transformOrigin = "50% 50%";
    st.translate = `${b.x + b.w / 2 - (n.x + n.w / 2)}px ${b.y + b.h / 2 - (n.y + n.h / 2)}px`;
    st.scale = `${b.w / Math.max(1, n.w)} ${b.h / Math.max(1, n.h)}`;
    st.rotate = m.rot + "deg";
    st.filter = (g.f0 ? g.f0 + " " : "") + `opacity(${m.opacity})`;
    if (m.z) st.zIndex = m.z;
  }
  const placeLayers = () => gl.forEach(placeLayer);
  function overlays(tl) {
    let panel = false;
    (S.overlays || []).forEach((o) => {
      const at = Math.min(Math.max(0, +o.at || 0), S.duration - 0.2), anim = o.animation || "pop";
      if (o.text) { placed.push([stamp(tl, o, at), o]); return; }
      if (o.depth) { depthProp(tl, o, at); return; }
      if (!panel && isSubject(o)) { panel = true; subjectPanel(tl, o, at); return; }
      const el = document.createElement("img");
      el.className = "ovl";
      el.src = o.src;
      const tf = treatFilter(o), bd = backdrop(tl, o, at);
      if (tf) el.style.filter = tf;
      if (bd) document.getElementById("root").insertBefore(bd, document.querySelector("#root .safe"));  // under the text
      document.getElementById("root").appendChild(el);
      placed.push([el, o, bd]);
      add(el, o, "image");
      const fx = (ANCHOR[o.position] || ANCHOR.center)[0];
      const from = { pop: { scale: 0, opacity: 0 }, fade: { opacity: 0 }, float: { scale: 0.6, opacity: 0 },
                     slide: { x: (fx < 0.5 ? -1 : 1) * u * 30, opacity: 0 }, none: { opacity: 0 } }[anim] || { scale: 0, opacity: 0 };
      const to = { scale: 1, x: 0, opacity: op(o), duration: anim === "none" ? 0.01 : 0.4,
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
  function layers() { findLayers(); placeLayers(); }
  // Fonts change text sizes: measure again once they are in (the render waits for fonts before frames).
  function relayout() { centreInk(); placeLayers(); placeOverlays(); }
  // Meme template: the scene's person / meme overlays stand in slots of #stage (1 = centred, 2 = side by side,
  // like a dialogue), bottom-anchored and large, with the cut-out treatments; each slides in from its side.
  const MEME_KINDS = ["character_expression", "reaction", "meme", "transparent_png"];
  function memeSlots(tl, stage) {
    const subs = (S.overlays || []).filter(o => MEME_KINDS.includes(o.kind)).slice(0, 2);
    S.overlays = (S.overlays || []).filter(o => !subs.includes(o));
    subs.forEach((o, i) => {
      const slot = document.createElement("div"), img = document.createElement("img"), at = Math.min(+o.at || 0.4, S.duration - 0.3);
      slot.className = "mslot";
      img.src = o.src;
      const tf = treatFilter(o), bd = backdrop(tl, o, at);
      if (tf) img.style.filter = tf;
      if (bd) { slot.appendChild(bd); gsap.set(bd, { xPercent: -50, yPercent: -50 }); }
      slot.appendChild(img);
      stage.appendChild(slot);
      const dir = subs.length === 1 ? 0 : (i === 0 ? -1 : 1);
      tl.fromTo(img, { x: dir * u * 25, y: u * 8, opacity: 0, scale: 0.9 }, { x: 0, y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)" }, at);
    });
    return subs.length;
  }
  // Dashboard editor hooks (same-origin iframe): boxes of editable elements, live apply, a time when all are on screen.
  const gbox = (g) => { const m = g.o.manual, b = m ? mbox(m) : g.nat;
    return { id: g.o.id, kind: g.kind, name: g.o.name, text: g.kind === "text" ? g.el.textContent.trim().replace(/\s+/g, " ") : "", src: g.o.src, x: b.x, y: b.y, w: b.w, h: b.h, rot: m ? m.rot : 0, base: 0,
             z: m ? m.z : 0, opacity: m ? m.opacity : 1, edited: !!m, auto: g.nat, hidden: !!(m && m.hidden) }; };
  window.__boxes = () => gl.map(gbox).concat(reg.map(({ el, o, kind }) => ({ id: o.id, kind, cat: o.kind, src: o.src, x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth,
    h: el.offsetHeight, rot: o.manual ? o.manual.rot : 0, base: kind === "stamp" ? -6 : 0, z: o.manual ? o.manual.z : 0,
    opacity: o.manual ? o.manual.opacity : 1, edited: !!o.manual, auto: o.auto || null })));
  window.__manual = (id, m) => {
    const g = gl.find(x => x.o.id === id);
    if (g) { if (m) g.o.manual = m; else delete g.o.manual; placeLayer(g); return; }
    const e = reg.find(x => x.o.id === id);
    if (!e || !m) return;
    e.o.manual = m;
    if (e.place) e.place(); else placeOverlays();
    fx(e.el, e.o, true);
  };
  window.__settle = () => Math.max(0.3, Math.min(S.duration - 0.05, Math.max(0, ...(S.overlays || []).map(o => +o.at || 0)) + 0.8));
  return { centreInk, logoGrid, overlays, relayout, memeSlots, layers };
};
