// Timeline "Visual Edit": click an overlay in the live preview, drag / resize / rotate it, or type numbers in the
// right panel. Edits go to <project>/edits.json (PUT /api/projects/<pid>/edits, pipeline/edits.py); the scene is rebuilt
// (POST /preview?layout=0) by the same code the render uses, so preview and final output carry the same transform.
// Boxes come from the scene iframe (layout.js __boxes / __manual). Math: edit_math.js. Globals of timeline.js / timeline_live.js.
const M = EditMath;
const ed = { on: false, all: {}, sel: null, boxes: [], hist: {}, drag: null, timer: 0, base: {}, scene: "", want: null };
const sceneKey = () => st.fmt + "/" + (st.cur ? st.cur.id : 0);
const dims = () => ({ W: live.data ? live.data.w : 1920, H: live.data ? live.data.h : 1080 });
const kScr = () => $("screen").clientWidth / dims().W;
const getItems = () => (ed.all[st.fmt] && ed.all[st.fmt][st.cur.id]) || {};
function setItems(o) {
  const per = (ed.all[st.fmt] = ed.all[st.fmt] || {});
  if (Object.keys(o).length) per[st.cur.id] = o; else delete per[st.cur.id];
}
const win = () => { try { return live.active && live.active.contentWindow; } catch { return null; } };
const box = (id) => ed.boxes.find((b) => b.id === id);
const hist = () => (ed.hist[sceneKey()] = ed.hist[sceneKey()] || { u: [], r: [] });
const zOf = (b) => (getItems()[b.id] ? getItems()[b.id].z : b.z);

function refresh() {  // read the element boxes of the active scene
  const w = win(), f = live.active;
  try { ed.boxes = (w && w.__boxes && f.dataset.ready && f.dataset.sid === String(st.cur && st.cur.id)) ? w.__boxes() : []; }
  catch { ed.boxes = []; }
  if (ed.sel && !box(ed.sel)) ed.sel = null;
  drawSel();
  syncPanel();
}
function editLoaded() {
  ensureLayer();
  refresh();
  if (ed.want && box(ed.want)) { ed.sel = ed.want; ed.want = null; }
  drawEdit();
}
function edLocal(f) {  // while editing a paused scene show the settled frame (all overlays in)
  try { return ed.on && aud.paused ? f.contentWindow.__settle() : null; } catch { return null; }
}

// ---- state of one element: its box + saved extras ----
function stateOf(id) {
  const b = box(id), m = getItems()[id] || {};
  return { x: b.x, y: b.y, w: b.w, h: b.h, rot: b.rot + b.base, base: b.base, opacity: m.opacity ?? b.opacity, z: m.z ?? b.z, lock: m.lock ?? true, dup: m.dup };
}
function put(id, s) {  // apply live in the iframe, keep in memory
  const { W, H } = dims(), m = { ...M.toFrac(s, W, H), opacity: s.opacity, z: s.z, lock: s.lock, hidden: false };
  m.rot = s.rot - s.base;
  if (s.dup) m.dup = s.dup;
  setItems({ ...getItems(), [id]: m });
  const w = win();
  if (w && w.__manual) w.__manual(id, m);
  refresh();
}
function snap() { const h = hist(); h.u.push(JSON.stringify(getItems())); h.r = []; if (h.u.length > 100) h.u.shift(); }
function commit() {  // save + rebuild this scene only
  clearTimeout(ed.timer);
  ed.timer = setTimeout(save, 250);
}
async function save() {
  const sid = st.cur.id, f = st.fmt, body = JSON.stringify({ fmt: f, scene: sid, items: (ed.all[f] || {})[sid] || {} });
  try {
    let r = await fetch(`/api/projects/${enc(st.pid)}/edits`, { method: "PUT", body });
    if (!r.ok) throw new Error((await r.json()).error);
    r = await fetch(`/api/projects/${enc(st.pid)}/preview?fmt=${enc(f)}&layout=0`, { method: "POST" });
    const d = await r.json();
    if (!r.ok || f !== st.fmt) return;
    for (const x of d.scenes) if (live.data.map[x.id]) live.data.map[x.id] = { ...live.data.map[x.id], ...x };
    if (st.cur && st.cur.id === sid && live.active) { live.active.dataset.sid = ""; loadInto(live.active, st.cur); }
    setMsg("");
  } catch (e) { setMsg("Edit not saved: " + e.message); }
}
function restore(js) {
  setItems(JSON.parse(js));
  ed.sel = null;
  commit();
  drawEdit();
}
function undo() { const h = hist(); if (!h.u.length) return; h.r.push(JSON.stringify(getItems())); restore(h.u.pop()); }
function redo() { const h = hist(); if (!h.r.length) return; h.u.push(JSON.stringify(getItems())); restore(h.r.pop()); }

// ---- actions on the selected element ----
const sel = () => (ed.sel && box(ed.sel) ? stateOf(ed.sel) : null);
function act(fn) {  // one undoable change
  const s = sel();
  if (!s) return;
  snap();
  put(ed.sel, fn(s) || s);
  commit();
}
const zs = () => ed.boxes.map(zOf);
const arrange = {
  forward: (s) => ({ ...s, z: s.z + 1 }), backward: (s) => ({ ...s, z: s.z - 1 }),
  front: (s) => ({ ...s, z: Math.max(...zs()) + 1 }), back: (s) => ({ ...s, z: Math.min(...zs()) - 1 }),
};
function del() {
  if (!ed.sel) return;
  snap();
  const it = { ...getItems() }, m = it[ed.sel];
  if (m && m.dup) delete it[ed.sel];  // a duplicate just goes away
  else it[ed.sel] = { ...(m || { x: 0, y: 0, w: 0.2, h: 0.2 }), hidden: true };
  setItems(it);
  ed.sel = null;
  commit();
  drawSel(); drawEdit();
}
function dup() {
  const s = sel();
  if (!s) return;
  snap();
  const orig = ed.sel.split("#")[0], it = { ...getItems() }, { W, H } = dims();
  let n = 2;
  while (it[orig + "#" + n]) n++;
  const id = orig + "#" + n;
  it[id] = { ...M.toFrac({ ...s, x: s.x + W * 0.03, y: s.y + H * 0.03 }, W, H), rot: s.rot - s.base, opacity: s.opacity, z: s.z + 1, lock: s.lock, hidden: false, dup: orig };
  setItems(it);
  ed.want = id;  // selected once the rebuilt scene has it
  commit();
}
function resetEl() {
  const s = sel();
  if (!s) return;
  snap();
  const it = { ...getItems() }, m = it[ed.sel];
  if (m && m.dup) {  // a duplicate goes back onto its original
    const o = box(m.dup) || s;
    put(ed.sel, { ...s, x: o.x, y: o.y, w: o.w, h: o.h, rot: 0, opacity: 1 });
  } else { delete it[ed.sel]; setItems(it); }
  commit();
}
function resetScene() { snap(); setItems({}); ed.sel = null; commit(); drawEdit(); }

// ---- canvas: layer, selection box, pointer handling ----
function ensureLayer() {
  let l = $("editlayer");
  if (l && l.isConnected) return l;
  l = Object.assign(el("div"), { id: "editlayer" });
  const sb = Object.assign(el("div"), { id: "selbox" });
  for (const h of [...Object.keys(M.HANDLES), "rot"]) sb.append(Object.assign(el("i", "hd " + h), { }));
  for (const i of sb.querySelectorAll(".hd")) i.dataset.h = [...i.classList].find((c) => c !== "hd");
  sb.append(el("div", "ro"));
  l.append(sb);
  $("screen").append(l);
  l.onpointerdown = down; l.onpointermove = moveDrag; l.onpointerup = up; l.onpointercancel = up;
  l.classList.toggle("on", ed.on);
  return l;
}
function pt(e) { const r = $("screen").getBoundingClientRect(), k = kScr(); return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; }
const vis = (b) => ({ x: b.x, y: b.y, w: b.w, h: b.h, rot: b.rot + b.base });
function down(e) {
  if (!ed.on || e.button) return;
  const p = pt(e), h = e.target.dataset && e.target.dataset.h;
  e.preventDefault();
  if (h && sel()) {
    snap();
    ed.drag = { h, s0: stateOf(ed.sel), moved: false };
  } else {
    const hit = ed.boxes.filter((b) => M.hit(vis(b), p)).sort((a, b) => zOf(a) - zOf(b)).pop();
    ed.sel = hit ? hit.id : null;
    drawSel(); drawEdit();
    if (!hit) return;
    snap();
    ed.drag = { h: "move", s0: stateOf(ed.sel), p0: p, moved: false };
  }
  try { $("editlayer").setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
}
function applyDrag(d) {
  d.raf = 0;
  if (!d.pending) return;
  const p = d.pending, s = d.s0;
  d.pending = null;
  let n;
  if (d.h === "move") n = { ...s, x: s.x + p.x - d.p0.x, y: s.y + p.y - d.p0.y };
  else if (d.h === "rot") n = { ...s, rot: M.rotate(s, p, d.shift ? 15 : 0).rot };
  else n = { ...s, ...M.resize(s, d.h, p, s.lock !== d.shift) };  // Shift flips the aspect lock while dragging
  d.moved = true;
  put(ed.sel, n);
}
function moveDrag(e) {
  const d = ed.drag;
  if (!d) return;
  d.pending = pt(e); d.shift = e.shiftKey;
  if (!d.raf) d.raf = requestAnimationFrame(() => applyDrag(d));  // one update per frame
}
function up() {
  const d = ed.drag;
  ed.drag = null;
  if (!d) return;
  if (d.raf) cancelAnimationFrame(d.raf);
  applyDrag(d);
  if (d.moved) commit(); else hist().u.pop();  // a plain click is no edit
}
function drawSel() {
  const sb = $("selbox"), s = sel();
  if (!sb) return;
  sb.style.display = ed.on && s ? "block" : "none";
  if (!s) return;
  const k = kScr();
  Object.assign(sb.style, { left: s.x * k + "px", top: s.y * k + "px", width: s.w * k + "px", height: s.h * k + "px", transform: `rotate(${s.rot}deg)` });
  sb.querySelector(".ro").textContent = `X ${Math.round(s.x)}  Y ${Math.round(s.y)}  W ${Math.round(s.w)}  H ${Math.round(s.h)}  ${Math.round(s.rot)}°`;
}

// ---- right panel ----
let fields = {};
function drawEdit() {
  const info = $("info");
  info.querySelector(".ed") && info.querySelector(".ed").remove();
  if (!st.cur) return;
  if (ed.scene !== sceneKey()) { ed.scene = sceneKey(); ed.boxes = []; ed.sel = null; }
  const p = el("div", "ed");
  fields = {};
  const row = (...c) => { const d = el("div", "er"); d.append(...c); p.append(d); return d; };
  const btn = (t, f, tip) => Object.assign(el("button", "", t), { onclick: f, title: tip || t });
  row(el("b", "", "Visual Edit"), btn(ed.on ? "Editing" : "Edit", () => setEdit(!ed.on), "Toggle edit mode (E)"),
      btn("↶", undo, "Undo (Ctrl+Z)"), btn("↷", redo, "Redo (Ctrl+Y)")).classList.add("hdr");
  if (!live.data) { p.append(el("div", "n", "Live preview needed.")); info.append(p); return; }
  if (ed.on) {
    const list = el("div", "chips");
    for (const b of ed.boxes) {
      const c = el("button", "chip" + (b.id === ed.sel ? " on" : ""), b.id + (b.kind === "stamp" ? " T" : ""));
      c.onclick = () => { ed.sel = b.id; drawSel(); drawEdit(); };
      list.append(c);
    }
    for (const [id, m] of Object.entries(getItems())) if (m.hidden) list.append(Object.assign(el("button", "chip del", "↺ " + id),
      { title: "Restore", onclick: () => { snap(); const it = { ...getItems() }; delete it[id]; setItems(it); commit(); } }));
    p.append(list.children.length ? list : el("div", "n", "No editable elements in this scene."));
  } else p.append(el("div", "n", "Press Edit (E), then click an element in the preview."));
  const s = ed.on ? sel() : null;
  if (s) {
    const num = (name, key, f) => {
      const i = Object.assign(el("input"), { type: "number", step: 1 }), l = el("label", "", name);
      fields[key] = i;
      i.onchange = () => act((c) => f(c, +i.value));
      l.append(i);
      return l;
    };
    p.append(el("div", "sec", "Transform"));
    row(num("X", "x", (c, v) => ({ ...c, x: v })), num("Y", "y", (c, v) => ({ ...c, y: v })));
    row(num("W", "w", (c, v) => (c.lock ? { ...c, w: v, h: v * c.h / c.w } : { ...c, w: v })),
        num("H", "h", (c, v) => (c.lock ? { ...c, h: v, w: v * c.w / c.h } : { ...c, h: v })));
    const sc = Object.assign(el("input"), { type: "range", min: 10, max: 300 }), so = Object.assign(el("input"), { type: "range", min: 0, max: 100 });
    fields.scale = sc; fields.opacity = so;
    sc.onpointerdown = so.onpointerdown = snap;
    sc.oninput = () => { const c = sel(); if (c) put(ed.sel, { ...c, ...M.scaleTo(c, +sc.value, baseOf(ed.sel)) }); };
    so.oninput = () => { const c = sel(); if (c) put(ed.sel, { ...c, opacity: +so.value / 100 }); };
    sc.onchange = so.onchange = commit;
    row(el("label", "", "Scale %"), sc);
    row(num("Rotation", "rot", (c, v) => ({ ...c, rot: v })));
    row(el("label", "", "Opacity"), so);
    const lk = Object.assign(el("input"), { type: "checkbox", onchange: () => act((c) => ({ ...c, lock: lk.checked })) }), ll = el("label", "", "Lock aspect ratio");
    fields.lock = lk;
    ll.append(lk);
    row(ll);
    p.append(el("div", "sec", "Arrange"));
    row(...[["Forward", "forward"], ["Backward", "backward"], ["To front", "front"], ["To back", "back"]].map(([t, k]) => btn(t, () => act(arrange[k]))));
    p.append(el("div", "sec", "Fit & Align"));
    const { W, H } = dims();
    row(...["left", "center", "right", "top", "middle", "bottom"].map((a) => btn(a[0].toUpperCase() + a.slice(1), () => act((c) => ({ ...c, ...M.align(c, a, W, H) })))));
    row(btn("Fit to canvas", () => act((c) => ({ ...c, ...M.fit(c, W, H) }))), btn("Reset transform", resetEl));
    row(btn("Duplicate", dup, "Ctrl+D"), btn("Delete", del, "Delete"));
  }
  if (ed.on && Object.keys(getItems()).length) row(btn("Reset scene edits", resetScene));
  info.append(p);
  syncPanel();
}
function baseOf(id) {  // the automatic size (scale 100 %); duplicates and panels fall back to the size first seen
  const b = box(id);
  return b.auto || ed.base[id] || (ed.base[id] = { w: b.w, h: b.h });
}
function syncPanel() {
  const s = ed.on ? sel() : null;
  if (!s || !fields.x) return;
  const set = (k, v) => { if (fields[k] && document.activeElement !== fields[k]) fields[k].value = v; };
  set("x", Math.round(s.x)); set("y", Math.round(s.y)); set("w", Math.round(s.w)); set("h", Math.round(s.h));
  set("rot", Math.round(s.rot * 10) / 10); set("opacity", Math.round(s.opacity * 100));
  set("scale", Math.round(s.w / baseOf(ed.sel).w * 100));
  fields.lock.checked = s.lock;
}
function setEdit(on) {
  ed.on = on;
  if (!on) { ed.sel = null; ed.drag = null; }
  ensureLayer().classList.toggle("on", on);
  if (on && !aud.paused) aud.pause();
  if (st.cur) liveSync(aud.currentTime || 0);
  setTimeout(() => { refresh(); drawEdit(); }, 80);
}

// ---- keys (captured before the timeline's own shortcuts) ----
window.addEventListener("keydown", (e) => {
  const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) && !["range", "checkbox"].includes(e.target.type);
  if (typing || e.altKey) return;
  const ctrl = e.ctrlKey || e.metaKey, step = e.shiftKey ? 10 : 1, nd = (dx, dy) => () => act((s) => ({ ...s, x: s.x + dx, y: s.y + dy }));
  let f;
  if (e.code === "KeyE" && !ctrl) f = () => setEdit(!ed.on);
  else if (ed.on && ctrl) f = { KeyZ: () => (e.shiftKey ? redo() : undo()), KeyY: redo, KeyD: dup }[e.code];
  else if (ed.on && (ed.sel || e.code === "Escape")) f = { Delete: del, Backspace: del, Escape: () => { ed.sel = null; drawSel(); drawEdit(); },
    ArrowLeft: nd(-step, 0), ArrowRight: nd(step, 0), ArrowUp: nd(0, -step), ArrowDown: nd(0, step) }[e.code];
  if (!f) return;
  e.preventDefault(); e.stopImmediatePropagation();
  f();
}, true);
window.drawEdit = drawEdit;
window.editLoaded = editLoaded;
async function loadEdits() { ed.all = (await getJson("edits.json")) || {}; ed.sel = null; ed.hist = {}; ed.base = {}; }
