// Read-only timeline of one project: built from work/scenes.json, work/resolved.json and visual-assets.json,
// played against input/audio.wav. Nothing here writes files (see ui/frontend/timeline.html).
const $ = (id) => document.getElementById(id);
const aud = $("aud");
const VID = /\.(mp4|mov|webm|mkv)$/i;
const st = { pid: "", scenes: [], res: {}, ovls: [], pps: 90, dur: 1, cur: null };

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
  scr.innerHTML = "";
  if (r.status === "template" || !rel) {
    const d = document.createElement("div");
    d.className = "tpl";
    d.textContent = (r.status === "template" ? "TEMPLATE" : "MISSING") + (s.on_screen_text ? "\n" + s.on_screen_text : "");
    d.style.whiteSpace = "pre-line";
    scr.append(d);
  } else {
    scr.append(media(rel, false));
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
}

aud.onplay = () => { $("play").textContent = "Pause"; loop(); };
aud.onpause = () => { $("play").textContent = "Play"; move(); };
aud.onloadedmetadata = () => { st.dur = Math.max(st.dur, aud.duration || 0); draw(); };
$("play").onclick = () => (aud.paused ? aud.play() : aud.pause());
document.onkeydown = (e) => {
  if (e.code === "Space" && e.target.tagName !== "SELECT") { e.preventDefault(); $("play").click(); }
};
$("ruler").onclick = (e) => seek((e.clientX - $("ruler").getBoundingClientRect().left) / st.pps);
$("zoom").oninput = (e) => { st.pps = +e.target.value; draw(); };
$("proj").onchange = () => load($("proj").value);

fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()).then((ps) => {
  const want = decodeURIComponent((location.hash.match(/p=([^&]+)/) || [])[1] || "");
  for (const p of ps) $("proj").append(new Option(p.title || p.name, p.id));
  if (ps.some((p) => p.id === want)) $("proj").value = want;
  if (ps.length) load($("proj").value);
});
