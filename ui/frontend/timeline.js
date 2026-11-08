// Read-only timeline of one project: built from work/scenes.json, work/resolved.json and visual-assets.json,
// played against input/audio.wav. Nothing here writes files (see ui/frontend/timeline.html).
const $ = (id) => document.getElementById(id);
const aud = $("aud");
const VID = /\.(mp4|mov|webm|mkv)$/i;
const st = { pid: "", scenes: [], res: {}, ovls: [], pps: 90, dur: 1, cur: null, fmt: "16:9" };
const live = { data: null, slots: [], active: null, token: 0 };  // live preview state (see the block below)

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const url = (rel) => `/files/${encodeURIComponent(st.pid)}/${rel.split("/").map(encodeURIComponent).join("/")}`;
const getJson = (rel) => fetch(url(rel), { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
// resolved.json paths start at the repo root ("projects/01_AI_Agents/..."); the file route wants project-relative paths
const inProject = (p) => (p ? p.replace(/^projects\/[^/]+\//, "") : "");

function media(rel, small) {
  const el = document.createElement(VID.test(rel) ? "video" : "img");
  el.src = url(rel);
  if (el.tagName === "VIDEO") {
    el.muted = true;
    el.preload = "metadata";
    if (!small) el.playsInline = true;
  }
  return el;
}

function clip(laneId, a, b, cls, label, onClick) {
  const c = document.createElement("div");
  c.className = "clip " + cls;
  c.style.left = a * st.pps + "px";
  c.style.width = Math.max(4, (b - a) * st.pps - 2) + "px";
  c.title = label;
  c.append(Object.assign(document.createElement("span"), { textContent: label }));
  c.onclick = (e) => { e.stopPropagation(); onClick(); };
  $(laneId).append(c);
  return c;
}

function drawRuler() {
  const ruler = $("ruler");
  ruler.innerHTML = "";
  const step = st.pps > 150 ? 0.5 : st.pps > 60 ? 1 : st.pps > 30 ? 2 : 5;
  const labelEvery = st.pps > 60 ? 1 : 2;
  let k = 0;
  for (let t = 0; t <= st.dur + 1e-6; t += step, k++) {
    const tick = document.createElement("i");
    tick.style.left = t * st.pps + "px";
    ruler.append(tick);
    if (k % labelEvery === 0) {
      const lab = document.createElement("span");
      lab.style.left = t * st.pps + "px";
      lab.textContent = fmt(t);
      ruler.append(lab);
    }
  }
}

function draw() {
  for (const l of ["L-text", "L-ovl", "L-vis", "L-aud"]) $(l).innerHTML = "";
  $("inner").style.width = st.dur * st.pps + 40 + "px";
  drawRuler();
  for (const s of st.scenes) {
    const r = st.res[s.id] || {};
    const rel = inProject(r.asset);
    const kind = r.status === "template" ? "v-tpl" : !rel ? "v-miss" : VID.test(rel) ? "v-video" : "v-image";
    const label = `#${s.id} ` + (r.status === "template" ? "Template · " + s.visual_type : rel ? rel.split("/").pop() : "MISSING");
    s.el = clip("L-vis", s.start, s.end, kind, label, () => seek(s.start + 0.01));
    if (s.on_screen_text) clip("L-text", s.start, s.end, "t-text", "T  " + s.on_screen_text, () => seek(s.start + 0.01));
  }
  for (const o of st.ovls) clip("L-ovl", o.a, o.b, "o-ovl", o.label, () => seek(o.a));
  clip("L-aud", 0, st.dur, "a-aud", "Narration · input/audio.wav", () => seek(0));
  move();
}

function sceneAt(t) {
  return st.scenes.find((s) => t >= s.start && t < s.end) || st.scenes[st.scenes.length - 1];
}

function showScene(s) {
  if (!s || st.cur === s) return;
  st.cur = s;
  st.scenes.forEach((x) => x.el && x.el.classList.toggle("sel", x === s));
  const r = st.res[s.id] || {};
  const rel = inProject(r.asset);
  const scr = $("screen");
  if (!liveShow(s)) {  // no live preview (yet): the asset itself, or a tile for template scenes
    scr.innerHTML = "";
    live.slots = [];
    live.active = null;
    if (r.status === "template" || !rel) {
      const d = document.createElement("div");
      d.className = "tpl";
      d.textContent = (r.status === "template" ? "TEMPLATE" : "MISSING") + (s.on_screen_text ? "\n" + s.on_screen_text : "");
      d.style.whiteSpace = "pre-line";
      scr.append(d);
    } else {
      scr.append(media(rel, false));
    }
  }
  const ov = st.ovls.filter((x) => x.scene === s.id).map((x) => x.label).join(", ");
  const info = $("info");
  info.innerHTML = "";
  const head = document.createElement("div");
  head.innerHTML = `<b>Scene ${s.id}</b> <span class="n">${s.start.toFixed(1)}-${s.end.toFixed(1)}s · ${(s.end - s.start).toFixed(1)}s · ${s.visual_type}</span>`;
  info.append(head);
  const rows = [["Narration", s.narration], ["Visual", rel || r.status || "-"], ["Text", s.on_screen_text || "-"],
                ["Overlays", ov || "-"], ["Query", s.query || "-"]];
  for (const [k, v] of rows) {
    const row = document.createElement("div");
    const key = document.createElement("span");
    key.className = "n";
    key.textContent = k + ": ";
    row.append(key, document.createTextNode(v));
    info.append(row);
  }
}

function move() {
  const t = aud.currentTime || 0;
  $("ph").style.left = t * st.pps + "px";
  $("time").textContent = `${fmt(t)} / ${fmt(st.dur)}`;
  showScene(sceneAt(t));
  liveSync(t);
  const sc = $("scroll"), x = t * st.pps;
  if (!aud.paused && (x < sc.scrollLeft || x > sc.scrollLeft + sc.clientWidth - 40)) sc.scrollLeft = x - 60;
}

function seek(t) {
  aud.currentTime = Math.max(0, Math.min(st.dur, t));
  move();
}

function loop() {
  move();
  if (!aud.paused) requestAnimationFrame(loop);
}

async function load(pid) {
  st.pid = pid;
  location.hash = "p=" + encodeURIComponent(pid);
  st.cur = null;
  const [sj, rj, va] = await Promise.all([getJson("work/scenes.json"), getJson("work/resolved.json"), getJson("visual-assets.json")]);
  st.scenes = (sj && sj.scenes) || [];
  st.res = {};
  ((rj && rj.scenes) || []).forEach((r) => (st.res[r.id] = r));
  st.ovls = [];
  for (const a of (va && va.assets) || []) {
    if (a.role !== "overlay" || !a.file) continue;
    for (const id of a.scenes || []) {
      const s = st.scenes.find((x) => x.id === id);
      if (!s) continue;
      const pl = a.placement || {};
      const start = s.start + (+pl.at || 0);
      const end = pl.until ? Math.min(s.end, s.start + +pl.until) : s.end;
      st.ovls.push({ scene: id, a: start, b: end, label: `${a.id} ${a.name || ""}`.trim() });
    }
  }
  st.dur = st.scenes.length ? st.scenes[st.scenes.length - 1].end : 1;
  $("sum").textContent = st.scenes.length
    ? `${st.scenes.length} scenes · ${st.ovls.length} overlay(s)`
    : "no work/scenes.json yet (run the project first)";
  aud.pause();
  aud.src = url("input/audio.wav");
  draw();
  buildLive();
}

// ---- live preview: the render's scene builds (work/preview/<fmt>/scene_NNN, pipeline/preview.py) played
// in the browser. Two iframes: the visible scene and the next one preloading, so cuts do not flash.
// Only these two scenes are loaded at a time (low RAM). The parent drives each scene's GSAP timeline
// and <video> elements from the narration clock.
function setMsg(text) {
  let m = $("screen").querySelector(".msg");
  if (!m) { m = Object.assign(document.createElement("div"), { className: "msg" }); $("screen").append(m); }
  m.textContent = text;
}

function fitScreen() {
  const port = st.fmt === "9:16", scr = $("screen");
  scr.style.width = (port ? 270 : 640) + "px";
  scr.style.height = (port ? 480 : 360) + "px";
}

async function buildLive() {
  const tok = ++live.token;
  live.data = null;
  live.slots = [];
  live.active = null;
  $("screen").innerHTML = "";
  fitScreen();
  setMsg("building live preview...");
  try {
    const r = await fetch(`/api/projects/${encodeURIComponent(st.pid)}/preview?fmt=${encodeURIComponent(st.fmt)}`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `${r.status}`);
    if (tok !== live.token) return;  // project or format changed meanwhile
    live.data = { w: d.width, h: d.height, map: Object.fromEntries(d.scenes.map((x) => [x.id, x])) };
    const bad = d.scenes.filter((x) => x.error).length;
    st.cur = null;
    move();
    setMsg(bad ? `${bad} scene(s) failed to build (shown as the missing tile)` : "");
  } catch (e) {
    if (tok === live.token) setMsg("live preview off: " + e.message);
  }
}

function slot(i) {
  let f = live.slots[i];
  if (!f || !f.isConnected) {
    f = document.createElement("iframe");
    f.setAttribute("scrolling", "no");
    f.setAttribute("tabindex", "-1");
    $("screen").append(f);
    live.slots[i] = f;
  }
  const k = $("screen").clientWidth / live.data.w;
  f.style.width = live.data.w + "px";
  f.style.height = live.data.h + "px";
  f.style.transform = `scale(${k})`;
  return f;
}

function loadInto(f, s) {
  const p = live.data.map[s.id];
  if (!p || f.dataset.sid === String(s.id)) return;
  f.dataset.sid = String(s.id);
  f.dataset.ready = "";
  f.onload = () => { f.dataset.ready = "1"; if (st.cur === s) liveSync(aud.currentTime || 0); };
  f.src = url(p.dir + "/index.html");
}

function videosOf(f) {
  try { return [...f.contentDocument.querySelectorAll("video")]; } catch { return []; }
}

function liveShow(s) {  // true when the live preview took over the screen for scene s
  if (!live.data || !live.data.map[s.id]) return false;
  $("screen").querySelectorAll(":scope > :not(iframe):not(.msg)").forEach((e) => e.remove());
  const a = slot(0), b = slot(1), id = String(s.id);
  const f = a.dataset.sid === id ? a : b.dataset.sid === id ? b : live.active === a ? b : a;
  loadInto(f, s);
  live.active = f;
  for (const x of [a, b]) {
    x.style.visibility = x === f ? "visible" : "hidden";
    if (x !== f) videosOf(x).forEach((v) => v.pause());
  }
  return true;
}

function liveSync(t) {
  const s = st.cur, f = live.active;
  if (!live.data || !s || !f) return;
  if (f.dataset.ready && f.dataset.sid === String(s.id)) {
    const local = Math.max(0, t - s.start);
    try {
      const tl = f.contentWindow.__timelines && f.contentWindow.__timelines.root;
      if (tl) tl.seek(Math.min(local, tl.duration()), false);
    } catch { /* frame still loading */ }
    for (const v of videosOf(f)) {
      const want = Math.min(local, (v.duration || 1e9) - 0.05);
      if (aud.paused) {
        v.pause();
        if (Math.abs(v.currentTime - want) > 0.04) v.currentTime = want;
      } else if (v.paused) {
        v.currentTime = want;
        v.play().catch(() => {});
      } else if (Math.abs(v.currentTime - want) > 0.25) {
        v.currentTime = want;
      }
    }
  }
  const nx = st.scenes[st.scenes.indexOf(s) + 1];  // preload the next scene into the hidden frame
  if (nx && live.data.map[nx.id] && s.end - t < 1.5) {
    const a = slot(0), b = slot(1);
    loadInto(f === a ? b : a, nx);
  }
}

aud.onplay = () => { $("play").textContent = "Pause"; loop(); };
aud.onpause = () => { $("play").textContent = "Play"; move(); };
aud.ontimeupdate = () => { if (!aud.paused) move(); };  // keeps cuts on time when rAF is throttled (hidden tab)
aud.onloadedmetadata = () => { st.dur = Math.max(st.dur, aud.duration || 0); draw(); };
$("play").onclick = () => (aud.paused ? aud.play() : aud.pause());
document.onkeydown = (e) => {
  if (e.code === "Space" && e.target.tagName !== "SELECT") { e.preventDefault(); $("play").click(); }
};
$("ruler").onclick = (e) => seek((e.clientX - $("ruler").getBoundingClientRect().left) / st.pps);
$("zoom").oninput = (e) => { st.pps = +e.target.value; draw(); };
$("proj").onchange = () => load($("proj").value);
$("fmt").onchange = () => { st.fmt = $("fmt").value; buildLive(); };

fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()).then((ps) => {
  const want = decodeURIComponent((location.hash.match(/p=([^&]+)/) || [])[1] || "");
  for (const p of ps) $("proj").append(new Option(p.title || p.name, p.id));
  if (ps.some((p) => p.id === want)) $("proj").value = want;
  if (ps.length) load($("proj").value);
});
