// One asset's detail view: large preview, facts, its own prompt (editable), upload / replace / save.
// The prompt shown is always the one stored for this asset id in visual-assets.json.
import { api } from "./api.js";

const $ = (id) => document.getElementById(id);
const VIDEO = /\.(mp4|mov|webm)$/i, OK = /\.(png|jpe?g|webp|mp4|mov|webm)$/i;
const MAX_IMG = 50 * 2 ** 20, MAX_VID = 1024 * 2 ** 20;
let ctx = null, cur = null, dirty = false, busy = false;

// preview element for a tile (thumb) or the modal; placeholder when there is no file yet
export function preview(pid, a, thumb) {
  if (a.preview) {
    const url = api.fileUrl(pid, a.preview, a.source_file || a.file);
    if (VIDEO.test(a.preview)) {
      const v = document.createElement("video");
      v.src = url; v.muted = true; v.playsInline = true; v.preload = "metadata";
      if (thumb) { v.className = "thumb"; v.addEventListener("loadeddata", () => { v.currentTime = Math.min(1, v.duration / 3 || 0); }); }
      else { v.controls = true; v.autoplay = true; v.loop = true; }
      return v;
    }
    const img = document.createElement("img");
    img.src = url; img.alt = a.name; img.loading = "lazy";
    if (thumb) img.className = "thumb" + (a.output.transparent || a.category === "logo" ? " contain" : "");
    return img;
  }
  const ph = document.createElement("div");
  ph.className = "ph";
  const label = a.method === "template" ? "Drawn by a template" : (a.prompt.text ? "Prompt ready, upload the file" : "Needed");
  ph.innerHTML = `<div><b></b><span></span></div>`;
  ph.querySelector("b").textContent = a.method === "template" ? "Aa" : a.category === "video_broll" ? "▶" : "+";
  ph.querySelector("span").textContent = label;
  return ph;
}

function info(a) {
  const scenes = a.timestamps.length
    ? a.timestamps.map((t) => `Scene ${t.scene} (${t.start.toFixed(2)}–${t.end.toFixed(2)} s)`).join(", ")
    : (a.role === "reference" ? "Reference sheet (not shown in the video)" : "—");
  const o = a.output, p = a.processing;
  const needs = [p.remove_background && "remove background", p.crop && "crop", p.extract_from && `extract from ${p.extract_from}`,
    p.resize && "resize", p.convert_to && `convert to ${p.convert_to}`].filter(Boolean).join(", ") || "none";
  const rows = [
    ["Asset ID", a.id], ["Category", a.category.replace(/_/g, " ") + (a.subcategory ? ` · ${a.subcategory}` : "")],
    ["Scene", scenes], ["Role", a.role + (a.role === "overlay" ? ` · ${a.placement.position}, ${a.placement.animation}` : "")],
    ["Method", a.method + (a.source_hint ? ` · ${a.source_hint}` : "")], ["Status", a.status.replace(/_/g, " ")],
    ["File path", a.file || a.source_file || "—"],
    ["Required", `${o.width}×${o.height} ${o.format.toUpperCase()}${o.transparent ? " · transparent background" : ""}`],
    ["Processing", needs + (p.log.length ? ` · done: ${p.log.join("; ")}` : "")],
  ];
  if (a.validation?.checks?.length) rows.push(["Validation", `${a.validation.status}: ${a.validation.checks.join("; ")}`]);
  if (a.credits?.license) rows.push(["Credits", `${a.credits.author || ""} · ${a.credits.license} · ${a.credits.source_url || ""}`]);
  $("d-info").replaceChildren(...rows.flatMap(([k, v]) => {
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = k; dd.textContent = v;
    return [dt, dd];
  }));
}

function msg(text, kind = "") { $("d-msg").textContent = text; $("d-msg").className = `msg ${kind}`; }

function setEditing(on) {
  $("d-prompt").readOnly = $("d-negative").readOnly = !on;
  $("d-edit").textContent = on ? "Editing…" : "Edit Prompt";
  $("d-edit").disabled = on;
  if (on) $("d-prompt").focus();
}

function buttons() {
  const tpl = cur.method === "template";
  $("d-upload").disabled = busy || tpl || cur.found;
  $("d-replace").disabled = busy || tpl || !cur.found;
  $("d-save").disabled = busy || !dirty;
  $("d-copy").disabled = !$("d-prompt").value.trim();
}

function show(a) {
  cur = a;
  $("d-preview").replaceChildren(preview(ctx.pid, a, false));
  $("d-name").textContent = a.name;
  $("d-badge").textContent = a.found ? "Found" : "Missing";
  $("d-badge").className = `badge ${a.found ? "found" : "missing"}`;
  info(a);
  $("d-prompt").value = a.prompt.text || "";
  $("d-negative").value = a.prompt.negative || "";
  const pr = a.prompt;
  $("d-settings").textContent = a.prompt.text
    ? [pr.tool && `Tool: ${pr.tool}`, pr.aspect_ratio && `Aspect ${pr.aspect_ratio}`, pr.resolution && pr.resolution,
       pr.transparent && "transparent background", pr.text_in_image ? `Text in image: ${pr.text_in_image}` : "No text in image",
       ...Object.entries(pr.settings || {}).map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join(" · ")
    : (a.method === "template" ? "Drawn by a template: no prompt needed." : "No prompt stored for this asset; write one with Edit Prompt.");
  dirty = false;
  setEditing(false);
  $("d-drop-text").textContent = a.method === "template" ? "This asset is drawn by a template; nothing to upload"
    : a.found ? "Drop a file here to replace the current one" : "Drag & drop the generated file here, or use Upload";
  buttons();
}

async function reloadCurrent() {
  const data = await ctx.refresh();
  const fresh = data && data.assets.find((x) => x.id === cur.id);
  if (fresh) show(fresh);
}

async function save() {
  if (!dirty) return;
  busy = true; buttons(); msg("Saving…");
  try {
    await api.savePrompt(ctx.pid, cur.id, $("d-prompt").value, $("d-negative").value);
    dirty = false;
    await reloadCurrent();
    msg("Prompt saved to visual-assets.json", "ok");
  } catch (e) {
    msg(e.message, "err");
  } finally { busy = false; buttons(); }
}

async function send(file, replace) {
  if (!file) return;
  if (!OK.test(file.name)) return msg("Only PNG, JPG, JPEG, WEBP, MP4, MOV or WEBM files", "err");
  const max = VIDEO.test(file.name) ? MAX_VID : MAX_IMG;
  if (file.size > max) return msg(`File too large (max ${max / 2 ** 20} MB)`, "err");
  if (replace && !confirm(`Replace the current file of ${cur.id} with ${file.name}? The old upload is kept on disk.`)) return;
  const keep = dirty ? { text: $("d-prompt").value, neg: $("d-negative").value } : null;
  busy = true; buttons();
  const bar = $("d-progress"), fill = bar.querySelector("span");
  bar.hidden = false; fill.style.width = "0";
  msg(`Uploading ${file.name}…`);
  try {
    const res = await api.upload(ctx.pid, cur.id, file, replace, (f) => {
      fill.style.width = `${Math.round(f * 100)}%`;
      if (f >= 1) msg("Processing (background removal / resize / checks)…");
    });
    await reloadCurrent();
    if (keep) {  // an unsaved prompt edit is kept in the box, still unsaved
      $("d-prompt").value = keep.text; $("d-negative").value = keep.neg; dirty = true; setEditing(true);
    }
    const a = res.asset, v = a.validation || {};
    msg(a.status === "failed" ? `Uploaded, but it failed validation: ${(v.checks || []).join("; ")}`
      : `Uploaded and ${a.status}${v.status === "warn" ? ` (warning: ${v.checks.slice(-1)[0]})` : ""}`
      + (keep ? ". Your prompt edit is not saved yet." : ""),
      a.status === "failed" ? "err" : "ok");
  } catch (e) {
    msg(e.message, "err");
  } finally {
    busy = false; bar.hidden = true; $("d-file").value = ""; buttons();
  }
}

function close() {
  if (dirty && !confirm("You have unsaved prompt changes. Close and discard them?")) return;
  $("modal").hidden = true;
  $("d-preview").replaceChildren();  // stops a playing video
  cur = null; dirty = false;
}

export function openDetail(context, a) {
  ctx = context;
  msg("");
  show(a);
  $("modal").hidden = false;
  $("d-close").focus();
}

// wire once
let mode = "upload";
$("d-close").addEventListener("click", close);
$("modal").addEventListener("mousedown", (e) => { if (e.target === $("modal")) close(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modal").hidden) close(); });
$("d-edit").addEventListener("click", () => setEditing(true));
for (const id of ["d-prompt", "d-negative"]) {
  $(id).addEventListener("input", () => { dirty = true; buttons(); msg("Unsaved changes"); });
}
$("d-copy").addEventListener("click", async () => {
  const text = $("d-prompt").value + ($("d-negative").value ? `\n\nAvoid: ${$("d-negative").value}` : "");
  try { await navigator.clipboard.writeText(text); }
  catch { $("d-prompt").select(); document.execCommand("copy"); }
  msg("Prompt copied", "ok");
});
$("d-save").addEventListener("click", save);
$("d-upload").addEventListener("click", () => { mode = "upload"; $("d-file").click(); });
$("d-replace").addEventListener("click", () => { mode = "replace"; $("d-file").click(); });
$("d-file").addEventListener("change", () => send($("d-file").files[0], mode === "replace"));
const drop = $("d-drop");
drop.addEventListener("dragover", (e) => { e.preventDefault(); if (cur && cur.method !== "template") drop.classList.add("over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (e) => {
  e.preventDefault(); drop.classList.remove("over");
  if (!cur || busy || cur.method === "template") return;
  send(e.dataTransfer.files[0], cur.found);  // a found asset is only replaced after an explicit confirm
});
