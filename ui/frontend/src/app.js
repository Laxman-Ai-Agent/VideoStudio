// Visual Assets page: project picker, Total / Found / Missing, image grid. Clicking a tile opens
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
  st.textContent = a.found ? "Found" : "Missing";
  // the card is only the image / video plus its category; scene, id and name show on hover
  const cat = document.createElement("span");
  cat.className = "cat";
  cat.dataset.cat = a.category;
  cat.textContent = a.category.replace(/_/g, " ");
  const cap = document.createElement("span");
  cap.className = "cap";
  cap.textContent = `${sceneLabel(a)} · ${a.id} · ${a.name}`;
  b.title = cap.textContent;
  b.append(st, cat, cap);
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

// "Projects" in the sidebar: every project as a table row (title, duration, assets, render state); a row opens its assets
function showView(name) {
  const p = name === "projects";
  document.querySelectorAll(".stats, #grid").forEach((e) => { e.hidden = p; });
  $("projects").hidden = !p;
  $("prep").hidden = p;
  document.querySelector(".picker").hidden = p;
  document.querySelector(".top h1").textContent = p ? "Projects" : "Visual Assets";
  document.querySelector(".top p").textContent = p ? "Click a project to open its visual assets" : "Project wise visual assets";
  $("nav-projects").classList.toggle("active", p);
  $("nav-assets").classList.toggle("active", !p);
}

async function showProjects() {
  showView("projects");
  try { projectList = await api.projects(); } catch (e) { return notice(`Cannot reach the dashboard server: ${e.message}`); }
  $("ptbody").replaceChildren(...projectList.map((p) => {
    const tr = document.createElement("tr");
    const cell = (...nodes) => { const td = document.createElement("td"); td.append(...nodes); tr.append(td); return td; };
    const t = document.createElement("div"); t.className = "pt"; t.textContent = p.title;
    const i = document.createElement("div"); i.className = "pid"; i.textContent = p.name;
    cell(t, i);
    cell(p.duration ? mmss(p.duration) : "-");
    cell(p.has_assets ? `${p.found} / ${p.total} found` : "no assets yet");
    const badges = (p.renders.length ? p.renders : [{ mode: "pending", fmt: "" }]).map((r) => {
      const b = document.createElement("span");
      b.className = `rbadge ${r.mode}`;
      b.textContent = r.mode === "pending" ? "Render pending" : `${r.mode === "final" ? "Final" : "Preview"} ${r.fmt}`.trim();
      return b;
    });
    cell(...badges);
    tr.onclick = async () => { showView("assets"); $("project").value = p.id; await select(p.id); };
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
  const sel = $("project");
  sel.replaceChildren(...projects.map((p) => {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = p.name.replace(/_/g, " ") + (p.has_assets ? "" : " (no assets yet)");
    return o;
  }));
  if (!projects.length) return notice('No projects yet. Create one with studio.cmd new "Name".');
  const fromHash = decodeURIComponent((location.hash.match(/p=([^&]+)/) || [])[1] || "");
  const saved = localStorage.getItem("va-project");
  const ids = projects.map((p) => p.id);
  const pid = [fromHash, saved].find((x) => ids.includes(x)) || (projects.find((p) => p.has_assets) || projects[0]).id;
  sel.value = pid;
  sel.addEventListener("change", () => select(sel.value));
  $("nav-projects").addEventListener("click", showProjects);
  document.querySelectorAll("[data-nav='assets']").forEach((n) =>
    n.addEventListener("click", () => { showView("assets"); window.scrollTo({ top: 0, behavior: "smooth" }); }));
  await select(pid);
}

init();

// Live update: a frontend file changed -> reload the page; visual-assets.json changed -> reload the data
// (and the open popup) in place. Unsaved edits in the popup are never thrown away.
let seen = null, liveFails = 0;
setInterval(async () => {
  if (document.hidden || !state.pid) return;
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
