// Timeline "Visual Edit": click an overlay in the live preview, drag / resize / rotate it, or type numbers in the
// right panel. Edits go to <project>/edits.json (PUT /api/projects/<pid>/edits, pipeline/edits.py); the scene is rebuilt
// (POST /preview?layout=0) by the same code the render uses, so preview and final output carry the same transform.
// Boxes come from the scene iframe (layout.js __boxes / __manual). Math: edit_math.js. Globals of timeline.js / timeline_live.js.
const M = EditMath;
const ed = { on: false, all: {}, sel: null, boxes: [], hist: {}, drag: null, timer: 0, base: {}, scene: "", want: null, tab: "elements", meta: {}, filter: "all" };
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
// multi-selection (Photoshop style): ed.sel is the primary element, ed.group all picked ones (Shift / Ctrl + click, drag a frame, Ctrl+A)
function group() {
  if (!ed.sel) { ed.group = []; return ed.group; }
  ed.group = (ed.group || []).filter(box);
  if (!ed.group.includes(ed.sel)) ed.group.push(ed.sel);
  return ed.group;
}
function setGroup(ids, primary) {
  ed.group = ids.filter(box);
  ed.sel = primary && ed.group.includes(primary) ? primary : ed.group[ed.group.length - 1] || null;
}
function actGroup(fn) {  // one undoable change applied to every picked element
  const g = group();
  if (!g.length) return;
  snap();
  for (const id of g) put(id, fn(stateOf(id)) || stateOf(id));
  commit();
}
const zOf = (b) => (getItems()[b.id] ? getItems()[b.id].z : b.z);

function refresh() {  // read the element boxes of the active scene
  const w = win(), f = live.active;
  try {  // measure at the settled frame, never mid-animation (a stale box sat 43 px off the picture and clicks missed)
    const hold = f && f.dataset.ready ? edLocal(f) : null, tl = hold != null && w.__timelines.root;
    if (tl) tl.seek(Math.min(hold, tl.duration()), false);
  } catch { /* frame not ready */ }
  try { ed.boxes = (w && w.__boxes && f.dataset.ready && f.dataset.sid === String(st.cur && st.cur.id)) ? w.__boxes() : []; }
  catch { ed.boxes = []; }
  if (ed.sel && !box(ed.sel)) ed.sel = null;
  group();
  drawSel();
  syncPanel();
}
function editLoaded() {
  ensureLayer();
  refresh();
  if (ed.want && box(ed.want)) { ed.sel = ed.want; ed.want = null; ed.tab = "edit"; }
  loadMeta();
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
  if (!id || !box(id)) return;
  const { W, H } = dims(), m = { ...M.toFrac(s, W, H), opacity: s.opacity, z: s.z, lock: s.lock, hidden: false };
  m.rot = s.rot - s.base;
  if (s.dup) m.dup = s.dup;
  setItems({ ...getItems(), [id]: m });
  const w = win();
  if (w && w.__manual) w.__manual(id, m);
  refresh();
}
function snap() { const h = hist(); h.u.push(JSON.stringify(getItems())); h.r = []; if (h.u.length > 100) h.u.shift(); }
function commit() {  // the edit is live in the picture and in memory; it reaches the disk only when Save is pressed
  ed.dirty = true;
  const n = $("edNote");
  if (n) n.textContent = "Unsaved changes: press Save to keep them";
}
async function discardEdits(reloadFrame = true) {  // leaving without Save: everything goes back to what is on disk
  if (!ed.dirty) return;
  ed.dirty = false;
  clearTimeout(ed.timer);
  await loadEdits();
  const n = $("edNote");
  if (n) n.textContent = "";
  if (reloadFrame && st.cur && live.active) { live.active.dataset.sid = ""; loadInto(live.active, st.cur); }
}
async function save() {
  const sid = st.cur.id, f = st.fmt, body = JSON.stringify({ fmt: f, scene: sid, items: (ed.all[f] || {})[sid] || {} });
  try {
    let r = await fetch(`/api/projects/${enc(st.pid)}/edits`, { method: "PUT", body });
    if (!r.ok) throw new Error((await r.json()).error);
    ed.dirty = false;
    r = await fetch(`/api/projects/${enc(st.pid)}/preview?fmt=${enc(f)}&layout=0`, { method: "POST" });
    const d = await r.json();
    if (!r.ok || f !== st.fmt) return;
    for (const x of d.scenes) if (live.data.map[x.id]) live.data.map[x.id] = { ...live.data.map[x.id], ...x };
    if (st.cur && st.cur.id === sid && live.active) { live.active.dataset.sid = ""; loadInto(live.active, st.cur); }
    setMsg("");
    fetchOneThumb(st.cur).then(() => { drawList(); draw(); });  // the edited scene gets a new still
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
  const it = { ...getItems() };
  for (const id of group()) {
    const m = it[id];
    if (m && m.dup) delete it[id];  // a duplicate just goes away
    else it[id] = { ...(m || { x: 0, y: 0, w: 0.2, h: 0.2 }), hidden: true };
  }
  setItems(it);
  ed.sel = null; ed.group = [];
  commit();
  drawSel(); drawEdit();
}
function dup() {
  const s = sel();
  if (!s || ed.sel.startsWith("L:")) return;  // background and text blocks belong to the template: no copies
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
  refresh();  // boxes are re-read at the settled frame right before the hit test: never click against stale numbers
  const p = pt(e), h = e.target.dataset && e.target.dataset.h;
  e.preventDefault();
  if (h && sel()) {
    snap();
    ed.drag = { h, s0: stateOf(ed.sel), moved: false };
  } else {
    const rank = (b) => (b.kind === "text" ? 1 : 2) * 1000 + zOf(b);  // pictures over text; the background is picked from the list only
    const hit = ed.boxes.filter((b) => b.kind !== "background" && M.hit(vis(b), p)).sort((a, b) => rank(a) - rank(b)).pop();
    const add = e.shiftKey || e.ctrlKey || e.metaKey, g = group();
    if (hit) {
      if (add) {  // Shift / Ctrl + click adds or removes one element
        const on = g.includes(hit.id);
        setGroup(on ? g.filter((i) => i !== hit.id) : [...g, hit.id], on ? null : hit.id);
        drawSel(); drawEdit();
        return;
      }
      if (!g.includes(hit.id)) setGroup([hit.id], hit.id); else ed.sel = hit.id;  // inside the group: the whole group is dragged
      ed.tab = "edit";
      drawSel(); drawEdit();
      snap();
      ed.drag = { h: "move", p0: p, moved: false, s0s: Object.fromEntries(group().map((id) => [id, stateOf(id)])) };
    } else {  // empty space: draw a frame to pick everything it touches (Shift / Ctrl keeps the current picks)
      const base = add ? g.slice() : [];
      if (!add) setGroup([], null);
      drawSel(); drawEdit();
      ed.drag = { h: "band", p0: p, base, moved: false };
    }
  }
  try { $("editlayer").setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
}
function applyDrag(d) {
  d.raf = 0;
  if (!d.pending) return;
  const p = d.pending, s = d.s0;
  d.pending = null;
  if (d.h === "band") return bandTo(d, p);
  if (d.h === "move") {  // every picked element moves by the same distance
    for (const [id, s0] of Object.entries(d.s0s)) put(id, { ...s0, x: s0.x + p.x - d.p0.x, y: s0.y + p.y - d.p0.y });
    d.moved = true;
    return;
  }
  let n;
  if (d.h === "rot") n = { ...s, rot: M.rotate(s, p, d.shift ? 15 : 0).rot };
  else n = { ...s, ...M.resize(s, d.h, p, s.lock !== d.shift) };  // Shift flips the aspect lock while dragging
  d.moved = true;
  put(ed.sel, n);
}
function bandTo(d, p) {  // the picking frame
  const x1 = Math.min(d.p0.x, p.x), x2 = Math.max(d.p0.x, p.x), y1 = Math.min(d.p0.y, p.y), y2 = Math.max(d.p0.y, p.y), k = kScr();
  let bd = $("band");
  if (!bd) { bd = Object.assign(el("div"), { id: "band" }); $("editlayer").append(bd); }
  Object.assign(bd.style, { display: "block", left: x1 * k + "px", top: y1 * k + "px", width: (x2 - x1) * k + "px", height: (y2 - y1) * k + "px" });
  if (x2 - x1 + y2 - y1 > 4) d.moved = true;
  const ids = ed.boxes.filter((b) => b.kind !== "background").filter((b) => { const a = M.bounds(vis(b)); return a.l < x2 && a.r > x1 && a.t < y2 && a.b > y1; }).map((b) => b.id);
  setGroup([...new Set([...d.base, ...ids])]);
  drawSel();
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
  if (d.h === "band") { const bd = $("band"); if (bd) bd.style.display = "none"; drawEdit(); return; }  // picking changes nothing in the scene
  if (d.moved) commit(); else hist().u.pop();  // a plain click is no edit
}
function drawSel() {
  const sb = $("selbox"), s = sel(), g = ed.on ? group() : [], layer = $("editlayer"), multi = g.length > 1;
  if (layer) layer.querySelectorAll(".msel").forEach((n) => n.remove());
  if (!sb) return;
  sb.style.display = ed.on && s && !multi ? "block" : "none";
  const k = kScr();
  if (multi) {  // several picked: an outline each, no handles
    for (const id of g) {
      const b = stateOf(id);
      layer.append(Object.assign(el("div", "msel" + (id === ed.sel ? " main" : "")), { style: `left:${b.x * k}px;top:${b.y * k}px;width:${b.w * k}px;height:${b.h * k}px;transform:rotate(${b.rot}deg)` }));
    }
    return;
  }
  if (!s) return;
  Object.assign(sb.style, { left: s.x * k + "px", top: s.y * k + "px", width: s.w * k + "px", height: s.h * k + "px", transform: `rotate(${s.rot}deg)` });
  sb.querySelector(".ro").textContent = `${Math.round(s.x)}, ${Math.round(s.y)}  ${Math.round(s.w)} × ${Math.round(s.h)}`;
}

function selectAll() { setGroup(ed.boxes.filter((b) => b.kind !== "background").map((b) => b.id)); drawSel(); drawEdit(); }

// ---- keys (captured before the timeline's own shortcuts) ----
window.addEventListener("keydown", (e) => {
  const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) && !["range", "checkbox"].includes(e.target.type);
  if (typing || e.altKey) return;
  const ctrl = e.ctrlKey || e.metaKey, step = e.shiftKey ? 10 : 1, nd = (dx, dy) => () => actGroup((s) => ({ ...s, x: s.x + dx, y: s.y + dy }));
  let f;
  if (e.code === "KeyE" && !ctrl) f = () => setEdit(!ed.on);
  else if (ctrl && st.cur && (ed.on || document.body.dataset.view === "timeline")) f = { KeyZ: () => (e.shiftKey ? redo() : undo()), KeyY: redo, KeyD: () => ed.on && dup(), KeyA: () => ed.on && selectAll() }[e.code];  // undo / redo also work on the Scene-tab preview
  else if (ed.on && (ed.sel || e.code === "Escape")) f = { Delete: del, Backspace: del, Escape: () => { ed.sel = null; ed.group = []; drawSel(); drawEdit(); },
    ArrowLeft: nd(-step, 0), ArrowRight: nd(step, 0), ArrowUp: nd(0, -step), ArrowDown: nd(0, step) }[e.code];
  if (!f) return;
  e.preventDefault(); e.stopImmediatePropagation();
  f();
}, true);
window.editLoaded = editLoaded;
async function loadEdits() { ed.all = (await getJson("edits.json")) || {}; ed.sel = null; ed.hist = {}; ed.base = {}; }
