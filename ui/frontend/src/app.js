// Visual Assets page: project picker, Total / Found / Missing, image grid. Clicking a tile opens
// that asset's detail view (detail.js). The selected project survives a page refresh (#p=01).
import { api } from "./api.js";
import { hasUnsaved, liveSync, openDetail, preview } from "./detail.js";

const $ = (id) => document.getElementById(id);
const state = { pid: "", data: null, token: 0 };

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
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `<div class="scene"></div><div class="name"></div><span class="chip"></span>`;
  meta.querySelector(".scene").textContent = `${sceneLabel(a)} · ${a.id}`;
  meta.querySelector(".name").textContent = a.name;
  meta.querySelector(".chip").textContent = a.category.replace(/_/g, " ");
  b.append(st, meta);
  b.classList.toggle("active", a.id === state.active);   // last opened card stays highlighted
  b.addEventListener("click", () => {
    state.active = a.id;
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
  $("grid").replaceChildren(...(d ? d.assets.map(tile) : []));
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
  document.querySelectorAll("[data-nav='projects']").forEach((n) =>
    n.addEventListener("click", () => { sel.focus(); sel.showPicker?.(); }));
  document.querySelectorAll("[data-nav='assets']").forEach((n) =>
    n.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" })));
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
