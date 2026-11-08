// Timeline page: scene list, live preview (timeline_live.js), details, transport bar and tracks.
// Data: work/scenes.json, work/resolved.json, visual-assets.json, plus POST /api/projects/<pid>/preview
// (scene builds, captions, warnings). The clock is the narration (input/audio.wav). View only: the one
// action is Render, which runs `studio run` in the background exactly like the command line.
const $ = (id) => document.getElementById(id);
const aud = $("aud");
const VID = /\.(mp4|mov|webm|mkv)$/i;
const IMAGE_T = new Set(["photo", "photo_parallax", "screenshot", "cutout_title"]);
const FPS = 30;
const st = { pid: "", scenes: [], res: {}, ovls: [], pps: 60, dur: 1, cur: null, fmt: "16:9", loop: false, onlyWarn: false };

const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const enc = encodeURIComponent;
const url = (rel) => `/files/${enc(st.pid)}/${rel.split("/").map(enc).join("/")}`;
const getJson = (rel) => fetch(url(rel), { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
// resolved.json paths start at the repo root ("projects/01_AI_Agents/..."); the file route wants project-relative paths
const inProject = (p) => (p ? p.replace(/^projects\/[^/]+\//, "") : "");
const el = (tag, cls, text) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, text != null ? { textContent: text } : {});

// ---- what each scene is (colour + label), and its problems ----
function kindOf(s) {
  const p = live.data && live.data.map[s.id], r = st.res[s.id] || {};
  const t = p ? p.template
    : r.status === "template" ? "template"
    : r.status === "missing" || !r.asset ? "missing"
    : VID.test(r.asset) ? "video_clip" : "photo";
  const cls = t === "missing" ? "k-miss" : t === "video_clip" ? "k-video" : IMAGE_T.has(t) ? "k-image" : "k-tpl";
  return { t, cls, label: t.replace(/_clip$/, "").replace(/_/g, " ") };
}
function warnsOf(s) {
  const p = live.data && live.data.map[s.id];
  if (p) return p.warnings || [];
  return (st.res[s.id] || {}).status === "missing" ? ["no visual found (missing tile)"] : [];
}
const errOf = (s) => (live.data && live.data.map[s.id] && live.data.map[s.id].error) || "";

// ---- scene list (left) ----
function drawList() {
  const box = $("list");
  box.innerHTML = "";
  box.append(el("div", "ttl", st.onlyWarn ? "Scenes with warnings" : `Scenes (${st.scenes.length})`));
  for (const s of st.scenes) {
    const w = warnsOf(s);
    if (st.onlyWarn && !w.length) continue;
    const k = kindOf(s), b = el("button", "sc" + (st.cur === s ? " sel" : ""));
    b.dataset.id = s.id;
    const dot = el("i", "dot " + k.cls);
    b.append(dot, el("b", "", `${s.id} · ${k.label}`), el("span", "n", fmt(s.start)));
    if (w.length) b.append(Object.assign(el("em", "", "!"), { title: w.join("\n") }));
    b.onclick = () => seek(s.start + 0.01);
    box.append(b);
  }
  const n = st.scenes.filter((s) => warnsOf(s).length).length;
  $("warnBtn").hidden = !n;
  $("warnBtn").textContent = `⚠ ${n} scene${n > 1 ? "s" : ""} with warnings`;
  $("warnBtn").classList.toggle("on", st.onlyWarn);
}

// ---- details (right) ----
function drawInfo(s) {
  const info = $("info"), r = st.res[s.id] || {}, k = kindOf(s);
  info.innerHTML = "";
  info.append(el("h3", "", `Scene ${s.id}`),
              el("div", "n", `${s.start.toFixed(1)} - ${s.end.toFixed(1)} s · ${(s.end - s.start).toFixed(1)} s · ${k.label}`));
  const row = (label, value) => {
    const d = el("div", "row");
    d.append(el("span", "", label), el("span", "", value || "-"));
    info.append(d);
  };
  row("Narration", s.narration);
  row("Visual", inProject(r.asset) || (r.status === "template" ? "template (" + k.label + ")" : r.status));
  row("On-screen text", s.on_screen_text);
  row("Overlays", st.ovls.filter((x) => x.scene === s.id).map((x) => x.label).join(", "));
  for (const w of warnsOf(s)) info.append(el("div", w.startsWith("build failed") ? "e" : "w", "⚠ " + w));
  if (window.drawEdit) drawEdit();
}

// ---- tracks ----
function clip(laneId, a, b, cls, label, onClick, title) {
  const c = el("div", "clip " + cls);
  c.style.left = a * st.pps + "px";
  c.style.width = Math.max(4, (b - a) * st.pps - 2) + "px";
  c.title = title || label;
  c.append(el("span", "", label));
  c.onclick = (e) => { e.stopPropagation(); onClick(); };
  $(laneId).append(c);
  return c;
}

function drawRuler() {
  const ruler = $("ruler");
  ruler.innerHTML = "";
  const step = [0.5, 1, 2, 5, 10, 30, 60].find((x) => x * st.pps >= 45) || 120;
  for (let t = 0; t <= st.dur + 1e-6; t += step) {
    const tick = el("i");
    tick.style.left = t * st.pps + "px";
    const lab = el("span", "", fmt(t).replace(/\.0$/, ""));
    lab.style.left = t * st.pps + "px";
    ruler.append(tick, lab);
  }
}

function draw() {
  for (const l of ["L-cap", "L-text", "L-ovl", "L-vis", "L-aud"]) $(l).innerHTML = "";
  $("inner").style.width = st.dur * st.pps + 40 + "px";
  drawRuler();
  for (const s of st.scenes) {
    const k = kindOf(s), w = warnsOf(s), go = () => seek(s.start + 0.01);
    const cls = k.cls + (errOf(s) ? " err" : w.length ? " warn" : "") + (st.cur === s ? " sel" : "");
    s.el = clip("L-vis", s.start, s.end, cls, `${s.id} ${k.label}`, go, [`Scene ${s.id}: ${k.label}`, ...w].join("\n"));
    if (s.on_screen_text) clip("L-text", s.start, s.end, "t-text", s.on_screen_text, go);
    const p = live.data && live.data.map[s.id];
    for (const [a, b, text] of (p && p.captions) || []) clip("L-cap", a, b, "t-cap", text, () => seek(a + 0.01));
  }
  for (const o of st.ovls) clip("L-ovl", o.a, o.b, "o-ovl", o.label, () => seek(o.a + 0.01));
  clip("L-aud", 0, st.dur, "a-aud", "Narration · input/audio.wav", () => {});
  move();
}

function drawAll() { drawList(); draw(); if (st.cur) drawInfo(st.cur); }

// ---- playback ----
function sceneAt(t) { return st.scenes.find((s) => t >= s.start && t < s.end) || st.scenes[st.scenes.length - 1]; }

function showScene(s) {
  if (!s || st.cur === s) return;
  st.cur = s;
  st.scenes.forEach((x) => x.el && x.el.classList.toggle("sel", x === s));
  document.querySelectorAll("#list .sc").forEach((b) => {
    b.classList.toggle("sel", b.dataset.id === String(s.id));
    if (b.dataset.id === String(s.id)) b.scrollIntoView({ block: "nearest" });
  });
  drawInfo(s);
  if (!liveShow(s)) showAsset(s);
}

function showAsset(s) {  // no live preview (yet): the asset itself, or a tile for template scenes
  const scr = $("screen"), r = st.res[s.id] || {}, rel = inProject(r.asset);
  scr.querySelectorAll("iframe, img, video, .tpl").forEach((e) => e.remove());
  live.slots = [];
  live.active = null;
  if (r.status === "template" || !rel) {
    scr.append(el("div", "tpl", (r.status === "template" ? "TEMPLATE" : "MISSING") + (s.on_screen_text ? "\n" + s.on_screen_text : "")));
  } else {
    const m = el(VID.test(rel) ? "video" : "img");
    m.src = url(rel);
    if (m.tagName === "VIDEO") m.muted = true;
    scr.append(m);
  }
}

function move() {
  let t = aud.currentTime || 0;
  if (st.loop && st.cur && !aud.paused && t >= st.cur.end - 0.02) {  // loop the selected scene
    t = st.cur.start;
    aud.currentTime = t;
  }
  $("ph").style.left = t * st.pps + "px";
  $("time").textContent = `${fmt(t)} / ${fmt(st.dur)}`;
  const s = st.loop && st.cur ? st.cur : sceneAt(t);
  showScene(s);
  const b = $("badge");
  if (b && s) b.textContent = `Scene ${s.id} · ${fmt(t)}`;
  liveSync(t);
  const sc = $("scroll"), x = t * st.pps;
  if (!aud.paused && (x < sc.scrollLeft || x > sc.scrollLeft + sc.clientWidth - 40)) sc.scrollLeft = x - 60;
}

function seek(t) {
  aud.currentTime = Math.max(0, Math.min(st.dur - 0.01, t));
  if (st.loop) st.cur = null;  // jumping elsewhere re-picks the looped scene
  if (st.loop) showScene(sceneAt(aud.currentTime));
  move();
}

function stepScene(d) {
  const i = st.scenes.indexOf(st.cur) + d;
  if (st.scenes[i]) seek(st.scenes[i].start + 0.01);
}

function loop() { move(); if (!aud.paused) requestAnimationFrame(loop); }

function setZoom(pps) {
  st.pps = Math.max(5, Math.min(300, pps));
  $("zoom").value = Math.round(st.pps);
  draw();
}

// ---- render (the same command as `studio.cmd run <id> [--final]`) ----
let renderTimer = 0;
const mmss = (n) => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, "0")}`;
let tick = 0, shown = null;
function paintRender() {  // big clock: elapsed since the render started (ticks every second between polls)
  const d = shown;
  if (!d) return;
  const el_ = d.state === "running" ? d.elapsed + Math.round((Date.now() - d.at) / 1000) : d.elapsed || 0;
  $("rtime").textContent = mmss(el_);
  $("rprog").style.width = d.last ? Math.min(100, (100 * el_) / d.last) + "%" : "0";
  if (d.state === "running" && d.last) {
    const left = d.last - el_;
    $("rlab").textContent = left > 0 ? `Elapsed · about ${mmss(left)} left` : "Elapsed · taking longer than last time";
  }
}
function showRender(d) {
  const last = (d.tail || []).filter((x) => x.trim()).slice(-1)[0] || "";
  const names = { running: "Rendering", done: "Render finished", failed: "Render failed", waiting: "Waiting for you" };
  const box = $("rbar");
  box.className = d.state === "idle" ? "" : "show " + d.state;
  shown = { ...d, at: Date.now() };
  $("rlab").textContent = d.state === "running" ? "Elapsed" : (names[d.state] || "") + " in";
  $("rlast").textContent = d.last ? mmss(d.last) : "first run: unknown";
  $("rstep").textContent = d.state === "done" ? "Done: see the project's output folder" : last.trim();
  $("rstep").title = (d.tail || []).join("\n");
  $("rstate").textContent = "";
  $("render").disabled = d.state === "running";
  $("render").textContent = d.state === "running" ? "Rendering..." : "Render";
  clearInterval(tick);
  paintRender();
  if (d.state === "running") tick = setInterval(paintRender, 1000);
}
async function renderStatus() {
  clearTimeout(renderTimer);
  const d = await fetch(`/api/projects/${enc(st.pid)}/render`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
  if (!d) return;
  showRender(d);
  if (d.state === "running") renderTimer = setTimeout(renderStatus, 3000);
}
async function startRender() {
  const final = $("rmode").value === "final";
  const ask = final ? "Start the FINAL (full resolution) render now? It runs in the background and takes several minutes."
                    : "Start a 720p preview render now? It runs in the background.";
  if (!confirm(ask)) return;
  const r = await fetch(`/api/projects/${enc(st.pid)}/render${final ? "?final=1" : ""}`, { method: "POST" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { $("rstate").textContent = "Render did not start: " + (d.error || r.status); return; }
  showRender(d);
  renderStatus();
}

// ---- load a project ----
async function load(pid) {
  st.pid = pid;
  location.hash = "p=" + enc(pid);
  st.cur = null;
  await loadEdits();
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
      st.ovls.push({ scene: id, a: s.start + (+pl.at || 0), b: pl.until ? Math.min(s.end, s.start + +pl.until) : s.end,
                     label: `${a.id} ${a.name || ""}`.trim() });
    }
  }
  st.dur = st.scenes.length ? st.scenes[st.scenes.length - 1].end : 1;
  $("sum").textContent = st.scenes.length ? `${st.scenes.length} scenes · ${fmt(st.dur)}` : "no work/scenes.json yet: run the project first";
  aud.pause();
  aud.src = url("input/audio.wav");
  setZoom(($("scroll").clientWidth - 40) / st.dur);  // start fitted
  drawList();
  buildLive();
  renderStatus();
}

// ---- controls ----
aud.onplay = () => { $("play").textContent = "Pause"; loop(); };
aud.onpause = () => { $("play").textContent = "Play"; move(); };
aud.ontimeupdate = () => { if (!aud.paused) move(); };  // keeps cuts on time when rAF is throttled (hidden tab)
aud.onloadedmetadata = () => { st.dur = Math.max(st.dur, aud.duration || 0); draw(); };
$("play").onclick = () => (aud.paused ? aud.play() : aud.pause());
$("prev").onclick = () => stepScene(-1);
$("next").onclick = () => stepScene(1);
$("loop").onclick = () => { st.loop = !st.loop; $("loop").classList.toggle("on", st.loop); };
$("speed").onchange = () => { aud.playbackRate = +$("speed").value; };
$("zoom").oninput = (e) => setZoom(+e.target.value);
$("zin").onclick = () => setZoom(st.pps * 1.25);
$("zout").onclick = () => setZoom(st.pps / 1.25);
$("fit").onclick = () => setZoom(($("scroll").clientWidth - 40) / st.dur);
$("ruler").onclick = (e) => seek((e.clientX - $("ruler").getBoundingClientRect().left) / st.pps);
$("warnBtn").onclick = () => { st.onlyWarn = !st.onlyWarn; drawList(); };
$("render").onclick = startRender;
$("proj").onchange = () => load($("proj").value);
document.querySelectorAll("#fmtSeg button").forEach((b) => (b.onclick = () => {
  st.fmt = b.dataset.f;
  document.querySelectorAll("#fmtSeg button").forEach((x) => x.classList.toggle("on", x === b));
  buildLive();
}));
document.onkeydown = (e) => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName) && e.code !== "Space") return;
  const t = aud.currentTime || 0, big = e.shiftKey ? 1 : 1 / FPS;
  const keys = {
    Space: () => $("play").click(), ArrowLeft: () => seek(t - big), ArrowRight: () => seek(t + big),
    ArrowUp: () => stepScene(-1), ArrowDown: () => stepScene(1), KeyL: () => $("loop").click(), KeyF: () => toggleBig(),
    Home: () => seek(0), End: () => seek(st.dur),
  };
  if (keys[e.code]) { e.preventDefault(); keys[e.code](); }
};

document.addEventListener("DOMContentLoaded", () => fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()).then((ps) => {
  const want = decodeURIComponent((location.hash.match(/p=([^&]+)/) || [])[1] || "");
  for (const p of ps) $("proj").append(new Option(p.title || p.name, p.id));
  if (ps.some((p) => p.id === want)) $("proj").value = want;
  if (ps.length) load($("proj").value);
}));
