// Visual Assets page: Total / Found / Missing, image grid. Clicking a tile opens
// that asset's detail view (detail.js). The selected project survives a page refresh (#p=01).
import { api } from "./api.js";
import { hasUnsaved, liveSync, openDetail, preview } from "./detail.js";

const $ = (id) => document.getElementById(id);
const state = { pid: "", data: null, token: 0, filter: "all" };

const pad = (n) => String(n).padStart(2, "0");
export function sceneLabel(a) {
  if (a.role === "reference") return "Reference";
  if (!a.scenes.length) return "No scene";
  return `Scene ${pad(a.scenes[0])}` + (a.scenes.length > 1 ? ` +${a.scenes.length - 1}` : "");
}

function tile(a) {
  const b = document.createElement("button");
  b.className = "tile";
  b.type = "button";
  b.dataset.id = a.id;
  b.setAttribute("aria-label", `${a.id} ${a.name}, ${a.found ? "found" : "missing"}`);
  b.append(preview(state.pid, a, true));
  const st = document.createElement("span");
  st.className = `status ${a.found ? "found" : "missing"}`;
  st.title = a.found ? "Found" : "Missing";  // icon only
  // the card is the image / video, a status icon and the scene number; id and name show on hover
  const scn = document.createElement("span");
  scn.className = "scn";
  scn.textContent = a.role === "reference" ? "Reference" : a.scenes.length ? `Scene-${pad(a.scenes[0])}` : "No scene";
  const cap = document.createElement("span");
  cap.className = "cap";
  cap.textContent = `${sceneLabel(a)} · ${a.id} · ${a.name}`;
  b.title = cap.textContent;
  b.append(st, scn, cap);
  b.classList.toggle("active", a.id === state.active);   // last opened card stays highlighted
  b.addEventListener("click", () => {
    state.active = a.id;
    $("grid").classList.add("has-active");
    document.querySelectorAll(".tile.active").forEach((t) => t.classList.remove("active"));
    b.classList.add("active");
    openDetail({ pid: state.pid, refresh }, a);
  });
  return b;
}

function render() {
  const d = state.data;
  $("c-total").textContent = d ? d.counts.total : 0;
  $("c-found").textContent = d ? d.counts.found : 0;
  $("c-missing").textContent = d ? d.counts.missing : 0;
  document.querySelectorAll(".stat").forEach((b) => b.classList.toggle("on", b.dataset.filter === state.filter));
  const list = d ? d.assets.filter((x) => state.filter === "all" || (state.filter === "found") === x.found) : [];
  if (d && !list.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = `No ${state.filter} assets.`;
    return $("grid").replaceChildren(p);
  }
  $("grid").classList.toggle("has-active", list.some((x) => x.id === state.active));
  $("grid").classList.toggle("portrait", list.filter((x) => x.out_size[1] > x.out_size[0]).length * 2 > list.length);  // a 9:16 project shows 9:16 tiles
  $("grid").replaceChildren(...list.map(tile));
}

function notice(text) {
  $("notice").hidden = !text;
  $("notice").textContent = text || "";
}

// reload the current project from disk; returns the fresh data (the modal uses it)
export async function refresh() {
  const pid = state.pid, my = ++state.token;
  try {
    const data = await api.assets(pid);
    if (my !== state.token || pid !== state.pid) return null;  // the user switched projects meanwhile
    state.data = data;
    notice("");
  } catch (e) {
    if (my !== state.token) return null;
    state.data = null;
    notice(e.message);
  }
  render();
  return state.data;
}

async function select(pid) {
  state.pid = pid;
  state.data = null;
  render();
  localStorage.setItem("va-project", pid);
  history.replaceState(null, "", `#p=${encodeURIComponent(pid)}`);
  await refresh();
}

document.querySelectorAll(".stat").forEach((b) => b.addEventListener("click", () => {
  state.filter = b.dataset.filter;
  render();
}));

let projectList = [];
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`;

// "Projects" tab: every project as a table row (title, duration, assets, render state); a row opens its assets
function showView(name) {
  const p = name === "projects";
  document.querySelectorAll(".stats, #grid").forEach((e) => { e.hidden = p; });
  $("projects").hidden = !p;
  $("prep").hidden = p;
  $("nav-projects").classList.toggle("active", p);
  $("nav-assets").classList.toggle("active", !p);
}

async function showProjects() {
  showView("projects");
  await drawProjects();
}

// red confirmation popup (instead of the browser's plain confirm box); resolves true on Delete, false on Cancel / Esc / backdrop
function askDelete(p, run) {
  const box = $("confirm"), ok = $("c-ok"), cancel = $("c-cancel"), err = $("c-err");
  $("c-text").textContent = `"${p.title}" (${p.name}) will be removed from the project list. Its folder is moved to projects/_deleted/, nothing is erased.`;
  err.hidden = true;
  ok.disabled = false;
  box.hidden = false;
  ok.focus();
  return new Promise((resolve) => {
    const close = (v) => { box.hidden = true; ok.onclick = cancel.onclick = box.onclick = null; document.removeEventListener("keydown", key); resolve(v); };
    const key = (e) => { if (e.key === "Escape") close(false); };
    document.addEventListener("keydown", key);
    cancel.onclick = () => close(false);
    box.onclick = (e) => { if (e.target === box) close(false); };
    ok.onclick = async () => {
      ok.disabled = true;
      try { await run(); close(true); } catch (e) { err.textContent = "Delete failed: " + e.message + " (restart the dashboard if it is an old server)"; err.hidden = false; ok.disabled = false; }
    };
  });
}

async function removeProject(p) {
  const done = await askDelete(p, () => api.deleteProject(p.id));
  if (!done) return;
  if (state.pid === p.id) { state.pid = ""; state.data = null; }
  projectList = [];
  await drawProjects();
}

async function drawProjects() {
  let fresh;
  try { fresh = await api.projects(); } catch (e) { return notice(`Cannot reach the dashboard server: ${e.message}`); }
  if (JSON.stringify(fresh) === JSON.stringify(projectList) && $("ptbody").children.length) return;  // unchanged: keep the rows
  projectList = fresh;
  $("ptbody").replaceChildren(...projectList.map((p, n) => {
    const tr = document.createElement("tr");
    const cell = (...nodes) => { const td = document.createElement("td"); td.append(...nodes); tr.append(td); return td; };
    cell(String(n + 1));
    const t = document.createElement("div"); t.className = "pt"; t.textContent = p.title;
    const i = document.createElement("div"); i.className = "pid"; i.textContent = p.name;
    cell(t, i);
    cell(p.duration ? mmss(p.duration) : "-");
    cell(p.has_assets ? `${p.found}/${p.total}` : "-");
    const miss = cell(p.has_assets ? String(p.missing) : "-");
    if (p.missing) miss.className = "miss";
    const TICK = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7"/></svg>', WAIT = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>';
    const badge = (mode, label) => {
      const fm = (p.renders || []).filter((r) => r.mode === mode).map((r) => r.fmt).filter(Boolean);
      const el = document.createElement("span");
      el.className = `rbadge ${fm.length || (p.renders || []).some((r) => r.mode === mode) ? "done" : "wait"}`;
      el.innerHTML = (el.className.includes("done") ? TICK : WAIT) + `<span></span>`;
      el.lastChild.textContent = el.className.includes("done") ? fm.join(" · ") || "done" : "pending";
      return el;
    };
    cell(badge("preview", ""));  // Preview column: the 480p / 720p check videos
    cell(badge("final", ""));    // Render column: the final full-size video
    const open = async () => { showView("assets"); await select(p.id); };
    const btn = (svg, tip, cls, fn) => Object.assign(document.createElement("button"), { type: "button", className: `ico ${cls}`, title: tip,
      innerHTML: `<svg viewBox="0 0 24 24">${svg}</svg>`, onclick: (e) => { e.stopPropagation(); fn(); } });
    cell(btn('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', "View: open this project's assets", "", open),
         btn('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>', "Delete this project", "danger", () => removeProject(p)));
    tr.onclick = open;
    return tr;
  }));
}

async function init() {
  let projects = [];
  try {
    projects = await api.projects();
  } catch (e) {
    notice(`Cannot reach the dashboard server: ${e.message}`);
    return;
  }
  if (!projects.length) return notice('No projects yet. Create one with studio.cmd new "Name".');
  const wantProjects = /view=projects/.test(location.hash);
  const fromHash = decodeURIComponent((location.hash.match(/p=([^&]+)/) || [])[1] || "");
  const saved = localStorage.getItem("va-project");
  const ids = projects.map((p) => p.id);
  const pid = [fromHash, saved].find((x) => ids.includes(x)) || (projects.find((p) => p.has_assets) || projects[0]).id;
  $("nav-projects").addEventListener("click", showProjects);
  $("nav-assets").addEventListener("click", () => { showView("assets"); window.scrollTo({ top: 0, behavior: "smooth" }); });
  $("nav-timeline").addEventListener("click", () => { location.href = `/timeline.html#p=${encodeURIComponent(state.pid)}`; });
  await select(pid);
  if (wantProjects) showProjects();  // coming back from the Timeline's Projects tab
}

init();

// Live update: a frontend file changed -> reload the page; visual-assets.json changed -> reload the data
// (and the open popup) in place. Unsaved edits in the popup are never thrown away.
let seen = null, liveFails = 0;
setInterval(async () => {
  if (document.hidden || !state.pid) return;
  if (!$("projects").hidden) drawProjects();  // the Projects table follows new renders / assets while it is open
  try {
    const v = await api.version(state.pid);
    if (seen && v.ui !== seen.ui && !hasUnsaved()) return location.reload();
    if (seen && v.data !== seen.data) await liveSync(refresh);
    seen = v;
    if (liveFails) { liveFails = 0; notice(""); }
  } catch {
    // an old server has no /api/version, a stopped one does not answer: say so instead of failing silently
    if (++liveFails === 3) notice("Live update is off: restart the dashboard (close its window, run start-dashboard.bat).");
  }
}, 1500);

// "Prepare & open Timeline": `studio run <pid> --review` (match uploads, process, resolve, storyboard; no render),
// then the Timeline page, so everything can be checked there before rendering.
$("prep").onclick = async () => {
  const b = $("prep"), pid = state.pid, label = b.innerHTML;
  b.disabled = true;
  try {
    let s = await api.prepare(pid);
    while (s.state === "running") {
      b.textContent = `Preparing... ${s.elapsed || 0} s`;
      await new Promise((r) => setTimeout(r, 2000));
      s = await api.runStatus(pid);
    }
    if (s.state === "done") { location.href = `/timeline.html#p=${encodeURIComponent(pid)}`; return; }
    notice(`Prepare stopped (${s.state}): ${(s.tail || []).slice(-2).join(" ")}`);
  } catch (e) {
    notice("Prepare failed: " + e.message);
  }
  b.disabled = false;
  b.innerHTML = label;
};
