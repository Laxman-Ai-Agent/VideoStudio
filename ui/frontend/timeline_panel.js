// Timeline right panel (tabs: Scene Details | Visual Edit | Animation | Effects), the "Scene N - Assets" strip and the
// undo / redo / delete toolbar. The editing logic lives in timeline_edit.js (ed, put, act, snap, commit ...).
const svg = (d) => `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC = {
  eye: '<path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z"/><circle cx="8" cy="8" r="2"/>',
  eyeoff: '<path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z"/><path d="M2 14L14 2"/>',
  trash: '<path d="M3 4h10M6 4V2.5h4V4M4.5 4l.6 9.5h5.8l.6-9.5"/>',
  lock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>',
  unlock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 014.8-1"/>',
  reset: '<path d="M3 8a5 5 0 105-5H5M5 1L3 3l2 2"/>',
  forward: '<rect x="2" y="6" width="7" height="7" rx="1"/><rect x="7" y="2.5" width="7" height="7" rx="1" fill="currentColor"/>',
  backward: '<rect x="7" y="6.5" width="7" height="7" rx="1"/><rect x="2" y="2.5" width="7" height="7" rx="1" fill="currentColor"/>',
  front: '<rect x="2" y="2" width="9" height="9" rx="1"/><rect x="5" y="5" width="9" height="9" rx="1" fill="currentColor"/>',
  back: '<rect x="5" y="5" width="9" height="9" rx="1"/><rect x="2" y="2" width="9" height="9" rx="1" fill="currentColor"/>',
  left: '<path d="M2 2v12"/><rect x="4" y="4" width="9" height="3"/><rect x="4" y="9" width="6" height="3"/>',
  center: '<path d="M8 2v12"/><rect x="3" y="4" width="10" height="3"/><rect x="5" y="9" width="6" height="3"/>',
  right: '<path d="M14 2v12"/><rect x="3" y="4" width="9" height="3"/><rect x="6" y="9" width="6" height="3"/>',
  top: '<path d="M2 2h12"/><rect x="4" y="4" width="3" height="9"/><rect x="9" y="4" width="3" height="6"/>',
  middle: '<path d="M2 8h12"/><rect x="4" y="3" width="3" height="10"/><rect x="9" y="5" width="3" height="6"/>',
  bottom: '<path d="M2 14h12"/><rect x="4" y="3" width="3" height="9"/><rect x="9" y="6" width="3" height="6"/>',
  fit: '<rect x="2" y="3" width="12" height="10" rx="1"/><path d="M5 6.5L3.5 8 5 9.5M11 6.5L12.5 8 11 9.5"/>',
};
const TABS = [["scene", "Scene"], ["details", "Scene Details"], ["edit", "Visual Edit"], ["anim", "Animation"], ["fx", "Effects"]];
const assetOf = (id) => (st.va || []).find((a) => a.id === id.split("#")[0]) || {};
const fileName = (id) => { const b = box(id); return b && b.name ? b.name : (assetOf(id).file || id).split("/").pop(); };
const KIND_LABEL = (b) => (b.kind === "background" ? "Background" : b.kind === "text" ? "Text Layer" : b.kind === "stamp" ? "Text Sticker" : "Image Layer");
const OVL_CATS = ["sticker", "character_expression", "reaction", "meme", "transparent_png", "graphic", "icon", "emoji"];
const LGROUP = (b) => (b.kind === "background" ? "Background" : b.kind === "text" || b.kind === "stamp" ? "Text"
  : b.cat === "logo" ? "Logos" : OVL_CATS.includes(b.cat) ? "Overlays" : "Images");
const isVid = (b) => /[.](mp4|webm|mov|mkv)$/i.test(b.src || "");
const srcUrl = (b) => (live.data && st.cur && live.data.map[st.cur.id] ? url(live.data.map[st.cur.id].dir + "/" + b.src) : "");
let fields = {};

async function loadMeta() {  // placement of each element as built (animation, start, treatments): read-only tabs
  const m = live.data && st.cur && live.data.map[st.cur.id];
  if (!m) return;
  const sc = await getJson(m.dir + "/scene.json");
  ed.meta = Object.fromEntries(((sc && sc.overlays) || []).map((o) => [o.id, o]));
  drawEdit();
}

function drawEdit() {
  const info = $("info");
  if (!st.cur) return;
  if (ed.scene !== sceneKey()) { ed.scene = sceneKey(); ed.boxes = []; ed.sel = null; ed.meta = {}; }
  let det = info.querySelector(".pane.details");
  if (!det) {  // first call after drawInfo: its content becomes the Scene Details tab
    det = el("div", "pane details");
    det.append(...info.childNodes);
    info.append(det);
  }
  const keepScene = ed.tab === "scene" ? info.querySelector(`.pane.scenepane[data-sid="${st.cur.id}"]`) : null;  // same scene: the playing frame stays
  info.querySelectorAll(".tabs, .pane:not(.details)").forEach((n) => { if (n !== keepScene) n.remove(); });
  const tabs = el("div", "tabs");
  for (const [k, label] of TABS) {
    tabs.append(Object.assign(el("button", ed.tab === k ? "on" : "", label), { onclick: () => { ed.tab = k; drawEdit(); } }));
  }
  info.prepend(tabs);
  det.classList.toggle("on", ed.tab === "details");
  fields = {};
  if (ed.tab === "scene") { if (!keepScene) info.append(scenePane()); }
  else if (ed.tab !== "details") info.append(Object.assign(pane(ed.tab), { className: "pane on " + ed.tab }));
  drawStrip();
  drawSceneSel();
  syncPanel();
}

function pane(tab) {
  const p = el("div"), s = live.data ? sel() : null;
  if (!live.data) { p.append(el("div", "hint", "Live preview needed.")); return p; }
  if (tab === "edit") return editPane(p, s);
  if (!s) { p.append(el("div", "hint", ed.on ? "Select an element in the preview." : "Press Edit (E) and select an element.")); return p; }
  const o = ed.meta[ed.sel] || {}, rows = tab === "anim"
    ? [["Animation", o.animation || "pop"], ["Starts at", (+o.at || 0) + " s"], ["Until", o.until ? o.until + " s" : "scene end"], ["Anchor", o.position || "center"], ["Size", Math.round((o.size || 0) * 100) + " % of height"]]
    : [["Outline", o.outline || "none"], ["Black & white", o.bw ? "yes" : "no"], ["Backdrop", o.backdrop || "none"], ["Depth prop", o.depth ? "yes" : "no"], ["Kind", o.kind || ""]];
  const l = el("div", "ro-list");
  for (const [a, b] of rows) { const r = el("div", "fr"); r.append(el("span", "", a), el("span", "", String(b))); l.append(r); }
  p.append(el("div", "lay", ""), l, el("div", "hint", "Set in visual-assets.json (placement); read-only here."));
  p.firstChild.replaceWith(layerHead(s, false));
  return p;
}

function layerHead(s, tools) {
  const b = box(ed.sel), h = el("div", "lay"), nm = el("div", "nm"), btn = (ic, tip, f, on) => Object.assign(el("button", "ib" + (on ? " on" : "")), { innerHTML: svg(IC[ic]), title: tip, onclick: f });
  nm.append(el("b", "", fileName(ed.sel)), el("span", "n", KIND_LABEL(b) + " (Selected)"));
  h.append(b.src && !isVid(b) ? Object.assign(el("img"), { src: srcUrl(b) }) : el("span", "lt", b.kind === "text" ? "T" : "▣"), nm);
  if (tools) h.append(btn(s.opacity > 0 ? "eye" : "eyeoff", "Show / hide", () => act((c) => { const v = c.opacity > 0 ? 0 : (ed.prevOp || 1); if (c.opacity > 0) ed.prevOp = c.opacity; return { ...c, opacity: v }; })), btn("trash", "Delete (Del)", del));
  return h;
}

function editPane(p, s) {
  if (!ed.on) p.append(el("div", "hint", "Press Edit (E), then click an element in the preview or pick one below."));
  else if (!s) p.append(el("div", "hint", "Click an element in the preview, or pick a card from the assets strip."));
  const hidden = Object.entries(getItems()).filter(([, m]) => m.hidden);
  if (hidden.length) {
    const r = el("div", "btns");
    for (const [id] of hidden) r.append(Object.assign(el("button", "", "↺ restore " + id), { onclick: () => { snap(); const it = { ...getItems() }; delete it[id]; setItems(it); commit(); } }));
    p.append(r);
  }
  if (!s) return p;
  const btn = (ic, tip, f, label, on) => Object.assign(el("button", "ib" + (on ? " on" : "") + (label ? " wide" : "")), { innerHTML: svg(IC[ic] || "") + (label ? " " + label : ""), title: tip, onclick: f });
  const num = (key, label, f) => {
    const i = Object.assign(el("input"), { type: "number", step: 1 }), l = el("label", "", label);
    fields[key] = i;
    i.onchange = () => act((c) => f(c, +i.value));
    l.append(i);
    return l;
  };
  const row = (name, ...c) => { const r = el("div", "fr"); r.append(el("span", "", name), ...c); return r; };
  p.append(layerHead(s, true), el("div", "sec", "Transform"));
  p.append(row("Position", num("x", "X", (c, v) => ({ ...c, x: v })), num("y", "Y", (c, v) => ({ ...c, y: v }))));
  const lk = btn(s.lock ? "lock" : "unlock", "Lock aspect ratio", () => act((c) => ({ ...c, lock: !c.lock })), "", s.lock);
  p.append(row("Size", num("w", "W", (c, v) => (c.lock ? { ...c, w: v, h: v * c.h / c.w } : { ...c, w: v })), lk,
               num("h", "H", (c, v) => (c.lock ? { ...c, h: v, w: v * c.w / c.h } : { ...c, h: v }))));
  const sc = Object.assign(el("input"), { type: "range", min: 10, max: 300 }), so = Object.assign(el("input"), { type: "range", min: 0, max: 100 });
  const scn = Object.assign(el("input", "pct"), { type: "number", step: 1 }), son = Object.assign(el("input", "pct"), { type: "number", step: 1 });
  Object.assign(fields, { scale: sc, scaleN: scn, opacity: so, opN: son });
  const setScale = (v) => { const c = sel(); if (c) put(ed.sel, { ...c, ...M.scaleTo(c, v, baseOf(ed.sel)) }); };
  const setOp = (v) => { const c = sel(); if (c) put(ed.sel, { ...c, opacity: Math.max(0, Math.min(1, v / 100)) }); };
  sc.oninput = () => setScale(+sc.value); so.oninput = () => setOp(+so.value);
  sc.onpointerdown = so.onpointerdown = snap;
  sc.onchange = so.onchange = commit;
  scn.onchange = () => { snap(); setScale(+scn.value); commit(); };
  son.onchange = () => { snap(); setOp(+son.value); commit(); };
  p.append(row("Scale", sc, scn), row("Rotation", num("rot", "°", (c, v) => ({ ...c, rot: v })),
    Object.assign(el("button", "ib"), { innerHTML: svg(IC.reset), title: "Reset rotation", onclick: () => act((c) => ({ ...c, rot: 0 })) })),
    row("Opacity", so, son));
  p.append(el("div", "sec", "Arrange"));
  const ar = el("div", "btns");
  for (const [k, t] of [["forward", "Bring forward"], ["backward", "Send backward"], ["front", "Bring to front"], ["back", "Send to back"]]) ar.append(btn(k, t, () => act(arrange[k])));
  p.append(ar, el("div", "sec", "Fit & Align"));
  const { W, H } = dims(), fa = el("div", "btns");
  for (const a of ["left", "center", "right", "top", "middle", "bottom"]) fa.append(btn(a, "Align " + a, () => act((c) => ({ ...c, ...M.align(c, a, W, H) }))));
  fa.append(btn("fit", "Fit to canvas", () => act((c) => ({ ...c, ...M.fit(c, W, H) }))));
  const ex = el("div", "btns");
  ex.append(btn("reset", "Reset transform", resetEl, "Reset Transform"));
  if (!ed.sel.startsWith("L:")) ex.append(btn("", "Duplicate (Ctrl+D)", dup, "Duplicate"));
  p.append(fa, ex);
  if (Object.keys(getItems()).length) p.append(Object.assign(el("button", "wide", "Reset scene edits"), { onclick: resetScene, style: "margin-top:8px;width:100%" }));
  return p;
}

function baseOf(id) {  // the automatic size (scale 100 %); duplicates and panels fall back to the size first seen
  const b = box(id);
  return b.auto || ed.base[id] || (ed.base[id] = { w: b.w, h: b.h });
}
function syncPanel() {
  const s = sel();
  if (!s || !fields.x) return;
  const set = (k, v) => { if (fields[k] && document.activeElement !== fields[k]) fields[k].value = v; };
  const sc = Math.round(s.w / baseOf(ed.sel).w * 100), op = Math.round(s.opacity * 100);
  set("x", Math.round(s.x)); set("y", Math.round(s.y)); set("w", Math.round(s.w)); set("h", Math.round(s.h));
  set("rot", Math.round(s.rot * 10) / 10); set("opacity", op); set("opN", op); set("scale", sc); set("scaleN", sc);
}
function setEdit(on) {
  ed.on = on;
  if (!on) { ed.sel = null; ed.drag = null; }
  ensureLayer().classList.toggle("on", on);
  document.body.classList.toggle("editing", on);  // Video Preview then shows the layer panel beside the picture
  if (on && !aud.paused) aud.pause();
  if (st.cur) liveSync(aud.currentTime || 0);
  setTimeout(() => { refresh(); drawEdit(); }, 80);
}

// ---- "Scene N - Assets" strip under the preview ----
const GROUP = (b) => (b.kind === "stamp" ? "graphics" : isVid(b) ? "video" : "images");
function sceneControls() {  // Play / Stop of the selected scene; they sit in the header of the card next to the Scene tab
  const tl = () => { try { return document.querySelector("#info .scenebox iframe").contentWindow.__timelines.root; } catch { return null; } };
  const ctl = el("div", "scctl");
  ctl.append(
    Object.assign(el("button", "ic", "▶ Play"), { title: "Play this scene (with its narration)", onclick: () => {
      const cur = st.cur; st.stopAt = cur.end; seek(cur.start); aud.play(); const x = tl(); if (x) x.repeat(-1).repeatDelay(0.8).play(0); } }),
    Object.assign(el("button", "ic", "■ Stop"), { title: "Stop and go back to the start of this scene", onclick: () => {
      const cur = st.cur; st.stopAt = 0; aud.pause(); seek(cur.start); const x = tl(); if (x) { x.pause(); x.seek(0, false); } } }));
  return ctl;
}
function drawSceneSel() {  // outline the picked element on the scene preview of the Scene tab
  const box = document.querySelector("#info .scenebox");
  if (!box || !live.data) return;
  box.querySelectorAll(".selmark").forEach((n) => n.remove());
  const b = sel();  // position incl. manual edits, same source as the canvas selection
  if (!b) return;
  const k = box.clientWidth / live.data.w;
  const g = el("div", "selmark");
  g.style.cssText = `left:${b.x * k}px;top:${b.y * k}px;width:${b.w * k}px;height:${b.h * k}px;transform:rotate(${b.rot || 0}deg)`;
  g.title = "Drag to move this layer";
  g.onclick = (e) => e.stopPropagation();  // a click on the outline is not "open the editor"
  g.onpointerdown = (e) => startSceneDrag(e, box, g);
  box.append(g);
}
// Drag the outlined element right on the Scene-tab preview: same put / commit as the canvas drag (undo, save, rebuild).
function startSceneDrag(e, box, g) {
  const s0 = sel();
  if (e.button || !s0) return;
  e.preventDefault(); e.stopPropagation();
  snap();
  const k = box.clientWidth / live.data.w, p0 = { x: e.clientX, y: e.clientY }, id = ed.sel;
  let moved = false;
  const inner = box.querySelector("iframe");
  const move = (ev) => {
    const dx = (ev.clientX - p0.x) / k, dy = (ev.clientY - p0.y) / k;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 2) return;
    moved = true;
    put(id, { ...s0, x: s0.x + dx, y: s0.y + dy });  // live in the hidden preview + memory
    try { inner.contentWindow.__manual(id, getItems()[id]); } catch { /* frame not ready */ }  // and in this preview
    const b = sel();
    if (b) Object.assign(g.style, { left: b.x * k + "px", top: b.y * k + "px" });
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    if (moved) commit(); else hist().u.pop();  // a plain click is no edit
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
function scenePane() {  // the "Scene" tab: this scene's own preview (click = edit layers) with Play / Stop
  const d = el("div", "pane on scenepane");
  d.dataset.sid = String(st.cur.id);
  d.append(live.data ? sceneBox() : el("div", "n", "Preview is loading..."), sceneControls());
  return d;
}
function sceneBox() {  // the selected scene's own build, looping, scaled to fit the card (the "Scene" tab)
  const m = live.data.map[st.cur.id];
  if (!m) return el("div", "n", "This scene is not built yet");
  const W = live.data.w, H = live.data.h, k = Math.min(260 / H, Math.max(180, $("info").clientWidth - 36) / W), box = el("div", "scenebox"), wrap = el("div", "scenewrap");
  wrap.dataset.sid = String(st.cur.id);
  box.style.cssText = `width:${Math.round(W * k)}px;height:${Math.round(H * k)}px`;
  const f = el("iframe");
  f.setAttribute("scrolling", "no");
  f.style.cssText = `width:${W}px;height:${H}px;transform:scale(${k})`;
  f.onload = () => { try { f.contentWindow.__timelines.root.repeat(-1).repeatDelay(0.8).play(0); } catch { /* static frame */ } };
  f.src = url(m.dir + "/index.html");
  const hint = el("div", "sbhint", "Click to edit layers");
  box.append(f, hint);
  box.title = "Click to edit this scene's layers";
  box.onclick = () => { setView("preview"); setEdit(true); ed.tab = "edit"; };  // the live preview + layer panel take over
  wrap.append(box);
  return wrap;
}
function drawStrip() {  // every element of the selected scene, below the preview; shares the selection with canvas + panel
  const root = $("assets");
  if (!st.cur || !live.data) { root.innerHTML = ""; return; }
  root.innerHTML = "";
  const all = ed.boxes, grp = (b) => (b.kind === "text" ? "text" : GROUP(b)), n = (g) => all.filter((b) => grp(b) === g).length;
  const head = el("div", "ah");
  head.append(el("b", "", `Scene ${st.cur.id} – Elements`), el("span", "grow"));
  for (const [k, label, c] of [["all", "All", all.length], ["images", "Images", n("images")], ["video", "Video", n("video")], ["graphics", "Graphics", n("graphics")], ["text", "Text", n("text")]]) {
    head.append(Object.assign(el("button", "chp" + (ed.filter === k ? " on" : ""), `${label} (${c})`), { onclick: () => { ed.filter = k; drawStrip(); } }));
  }
  const cards = el("div", "cards");
  for (const b of all.filter((x) => ed.filter === "all" || grp(x) === ed.filter)) {
    const m = getItems()[b.id] || {}, off = m.opacity === 0 || m.hidden;
    const c = el("button", "acard" + (b.id === ed.sel ? " on" : "") + (off ? " off" : "")), sz = el("span", "as", LGROUP(b));
    if (b.src && !isVid(b)) {
      const im = Object.assign(el("img"), { src: srcUrl(b) });
      im.onload = () => { sz.textContent = `${LGROUP(b)} · ${im.naturalWidth} × ${im.naturalHeight}`; };
      c.append(im);
    } else c.append(el("span", "tt", b.kind === "text" || b.kind === "stamp" ? (b.name || "T") : "▣"));
    c.append(el("i", "ck", "✓"), el("span", "an", fileName(b.id)), sz);
    c.onclick = () => { ed.sel = b.id; drawSel(); if (ed.on) drawEdit(); else { drawStrip(); drawSceneSel(); } };  // picks it on the scene preview
    cards.append(c);
  }
  const f = live.active, ready = f && f.dataset.ready && f.dataset.sid === String(st.cur.id);
  root.append(head, all.length ? cards : el("div", "n", ready ? "No separate elements in this scene (it is one drawn template)." : "Loading elements..."));
}

$("tUndo").onclick = undo;
$("tRedo").onclick = redo;
$("tDel").onclick = del;
window.drawEdit = drawEdit;
