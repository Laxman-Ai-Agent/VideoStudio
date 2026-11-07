// One asset's detail view. Left: live framing preview (aspect, fill/fit, crop focus, zoom, video trim)
// and a pending replacement next to the current file. Right: narration + why this visual + scene,
// facts, its own prompt (editable), upload / replace, history. Everything is stored per asset id.
import { api } from "./api.js";

const $ = (id) => document.getElementById(id);
const VIDEO = /\.(mp4|mov|webm)$/i, OK = /\.(png|jpe?g|webp|mp4|mov|webm)$/i;
const MAX_IMG = 50 * 2 ** 20, MAX_VID = 1024 * 2 ** 20;
const RATIO = { "16:9": 16 / 9, "9:16": 9 / 16, "4:5": 4 / 5, "1:1": 1 };
let ctx = null, cur = null, busy = false, promptDirty = false, mediaDirty = false, media = null;

const url = (rel, a) => api.fileUrl(ctx.pid, rel, (a && (a.pending_file || a.source_file || a.file)) || rel);
const fmtS = (s) => `${(+s || 0).toFixed(2)} s`;

// thumbnail / preview element (also used by the grid)
export function preview(pid, a, thumb) {
  if (a.preview) {
    const src = api.fileUrl(pid, a.preview, a.source_file || a.file);
    if (VIDEO.test(a.preview)) {
      const v = document.createElement("video");
      v.src = src; v.muted = true; v.playsInline = true; v.preload = "metadata";
      if (thumb) { v.className = "thumb"; v.addEventListener("loadeddata", () => { v.currentTime = Math.min(1, v.duration / 3 || 0); }); }
      return v;
    }
    const img = document.createElement("img");
    img.src = src; img.alt = a.name; img.loading = "lazy";
    if (thumb) img.className = "thumb" + (a.output.transparent || a.category === "logo" ? " contain" : "");
    return img;
  }
  const ph = document.createElement("div");
  ph.className = "ph";
  ph.innerHTML = `<div><b></b><span></span></div>`;
  ph.querySelector("b").textContent = a.method === "template" ? "Aa" : a.category === "video_broll" ? "▶" : "+";
  ph.querySelector("span").textContent = a.method === "template" ? "Drawn by a template"
    : (a.prompt.text ? "Prompt ready, upload the file" : "Needed");
  return ph;
}

function msg(text, kind = "") { $("d-msg").textContent = text; $("d-msg").className = `msg ${kind}`; }

// ---------- why this visual ----------
function why(a) {
  $("d-narr").textContent = a.narration || (a.scene_info[0] && a.scene_info[0].narration) || "—";
  $("d-context").textContent = a.context || a.description || "—";
  $("d-scene").textContent = a.scene_info.length
    ? a.scene_info.map((s) => `Scene ${s.id} · ${s.start.toFixed(2)}–${s.end.toFixed(2)} s · ${s.visual_type}`
      + (s.on_screen_text ? ` · on screen: “${s.on_screen_text}”` : "") + `\n${s.narration}`).join("\n\n")
    : (a.role === "reference" ? "Reference sheet: keeps a character identical in every image (not shown in the video)" : "—");
  $("d-scene").style.whiteSpace = "pre-line";
}

function info(a) {
  const o = a.output, p = a.processing;
  const rows = [  // user asked for the required size only; id/category/status etc. are dropped
    ["Required", `${o.width}×${o.height} ${o.format.toUpperCase()}${o.transparent ? " · transparent background" : ""}`],
  ];
  if (p.log.length) rows.push(["Processing", p.log.join("; ")]);
  if (a.validation?.checks?.length) rows.push(["Validation", `${a.validation.status}: ${a.validation.checks.join("; ")}`]);
  if (a.credits?.license) rows.push(["Credits", `${a.credits.author || ""} · ${a.credits.license} · ${a.credits.source_url || ""}`]);
  $("d-info").replaceChildren(...rows.flatMap(([k, v]) => {
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = k; dd.textContent = v;
    return [dt, dd];
  }));
}

// ---------- framing preview ----------
function frameSource(a) { return a.pending_file || a.original || a.preview; }

function drawFrame() {
  const a = cur, fr = $("d-frame"), src = frameSource(a);
  const ratio = RATIO[media.aspect] || (a.out_size[0] / a.out_size[1]);
  fr.style.aspectRatio = String(ratio);
  fr.classList.toggle("portrait-frame", ratio < 1);
  if (!src) { fr.replaceChildren(preview(ctx.pid, a, false)); $("d-frame-note").textContent = ""; return; }
  let el = fr.firstElementChild;
  const isVid = VIDEO.test(src);
  const want = url(src, a);
  if (!el || el.dataset.src !== want) {
    el = document.createElement(isVid ? "video" : "img");
    el.dataset.src = want; el.src = want;
    if (isVid) {
      el.muted = true; el.autoplay = true; el.playsInline = true;
      el.addEventListener("timeupdate", () => {
        const s = +media.trim_start || 0, e = media.trim_end ? +media.trim_end : el.duration;
        if (el.currentTime < s - 0.05 || el.currentTime > e) el.currentTime = s;
      });
      el.addEventListener("loadedmetadata", () => { el.currentTime = +media.trim_start || 0; mediaText(); });
    }
    fr.replaceChildren(el);
  }
  const fill = media.fit !== "fit";
  el.style.objectFit = fill ? "cover" : "contain";
  el.style.objectPosition = `${media.crop_x * 100}% ${media.crop_y * 100}%`;
  el.style.transformOrigin = `${media.crop_x * 100}% ${media.crop_y * 100}%`;
  el.style.transform = fill ? `scale(${media.zoom})` : "none";
  $("d-frame-note").textContent = a.pending_file ? "Preview of the NEW file with these settings"
    : (src === a.original ? "Preview from the original upload with these settings" : "");
}

function mediaText() {
  const a = cur, ar = media.aspect || "output";
  const out = RATIO[media.aspect] ? outFor(a, media.aspect) : a.out_size;
  $("m-dims").textContent = `Original ${a.media.source_w ? `${a.media.source_w}×${a.media.source_h}` : "?"} · `
    + `required ${a.output.width}×${a.output.height} · final ${out[0]}×${out[1]} (${ar}, ${media.fit})`;
  const v = $("d-frame").querySelector("video");
  const src = v && isFinite(v.duration) ? v.duration : a.media.duration_source;
  const s = +media.trim_start || 0, e = media.trim_end ? +media.trim_end : src;
  $("m-dur").textContent = `Selected ${fmtS((e || 0) - s)} · required ${fmtS(a.media.duration_required)} · upload ${fmtS(src)}`;
}

function outFor(a, aspect) {
  const [rw, rh] = aspect.split(":").map(Number), L = Math.max(a.output.width, a.output.height);
  const [w, h] = rw >= rh ? [L, L * rh / rw] : [L * rw / rh, L];
  return [Math.round(w / 2) * 2, Math.round(h / 2) * 2];
}

function mediaControls(a) {
  const src = frameSource(a);
  const show = !!src && a.method !== "template";
  $("d-media").hidden = !show;
  if (!show) return;
  const sel = $("m-aspect");
  sel.replaceChildren(...[["", `Required (${a.output.width}×${a.output.height})`], ["16:9", "16:9"], ["9:16", "9:16"],
    ["4:5", "4:5"], ["1:1", "1:1"]].map(([v, t]) => Object.assign(document.createElement("option"), { value: v, textContent: t })));
  sel.value = media.aspect || "";
  document.querySelectorAll("[data-fit]").forEach((b) => b.classList.toggle("on", b.dataset.fit === media.fit));
  $("m-x").value = media.crop_x; $("m-y").value = media.crop_y; $("m-zoom").value = media.zoom;
  $("m-crop").classList.toggle("off", media.fit === "fit");
  const vid = VIDEO.test(src);
  $("m-video").hidden = !vid;
  $("m-start").value = media.trim_start || 0;
  $("m-end").value = media.trim_end ?? "";
  mediaText();
}

// ---------- the whole view ----------
function buttons() {
  const tpl = cur.method === "template";
  $("d-upload").disabled = busy || tpl;
  $("d-upload").textContent = cur.found ? "Upload replacement" : "Upload";
  $("d-save").disabled = busy || !(promptDirty || mediaDirty);
  $("d-copy").disabled = !$("d-prompt").value.trim();
  $("d-confirm").disabled = $("d-discard").disabled = busy;
}

function show(a, keepEdits = false) {
  cur = a;
  if (!keepEdits || !mediaDirty) { media = { ...a.media }; mediaDirty = false; }
  $("d-name").textContent = a.name;
  $("d-badge").textContent = a.found ? "Found" : "Missing";
  $("d-badge").className = `badge ${a.found ? "found" : "missing"}`;
  why(a);
  info(a);
  if (!keepEdits || !promptDirty) {
    $("d-prompt").value = a.prompt.text || "";
    $("d-negative").value = a.prompt.negative || "";
    promptDirty = false;
    setEditing(false);
  }
  const pr = a.prompt;
  $("d-settings").textContent = pr.text
    ? [pr.tool && `Tool: ${pr.tool}`, pr.aspect_ratio && `Aspect ${pr.aspect_ratio}`, pr.resolution,
       pr.transparent && "transparent background", pr.text_in_image ? `Text in image: ${pr.text_in_image}` : "No text in image",
       ...Object.entries(pr.settings || {}).map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join(" · ")
    : (a.method === "template" ? "Drawn by a template: no prompt needed." : "No prompt stored yet; write one with Edit Prompt.");
  $("d-orig-box").hidden = !a.prompt_original || a.prompt_original === a.prompt.text;
  $("d-orig").textContent = a.prompt_original || "";
  $("d-file-box").hidden = a.method === "template";
  $("d-file-title").textContent = a.found ? "Replace with a new file" : "Upload the generated file";
  $("d-drop-text").textContent = a.found
    ? "Drop a new image or video here: you will see it next to the current one before anything changes"
    : "Drag & drop the generated file here, or use Upload";
  // pending replacement: current vs new
  const pend = !!a.pending_file;
  $("d-pending").hidden = !pend;
  if (pend) {
    $("d-cur").replaceChildren(preview(ctx.pid, a, false));
    const nv = a.pending_preview || a.pending_file, el = document.createElement(VIDEO.test(nv) ? "video" : "img");
    el.src = url(nv, a); if (el.tagName === "VIDEO") { el.muted = true; el.autoplay = true; el.loop = true; }
    $("d-new").replaceChildren(el);
  }
  $("d-hist-box").hidden = !a.history.length;
  $("d-hist").replaceChildren(...a.history.slice().reverse().map((h) => {
    const li = document.createElement("li");
    li.textContent = `${h.time.replace("T", " ")} · ${h.action.replace(/_/g, " ")}${h.file ? ` · ${h.file}` : ""}`;
    return li;
  }));
  drawFrame();
  mediaControls(a);
  buttons();
}

function setEditing(on) {
  $("d-prompt").readOnly = $("d-negative").readOnly = !on;
  $("d-edit").textContent = on ? "Editing…" : "Edit Prompt";
  $("d-edit").disabled = on;
  if (on) $("d-prompt").focus();
}

async function reload(keepEdits) {
  const data = await ctx.refresh();
  const fresh = data && data.assets.find((x) => x.id === cur.id);
  if (fresh) show(fresh, keepEdits);
}

async function saveAll() {
  if (!(promptDirty || mediaDirty)) return;
  busy = true; buttons();
  try {
    if (promptDirty) {
      msg("Saving prompt…");
      await api.savePrompt(ctx.pid, cur.id, $("d-prompt").value, $("d-negative").value);
      promptDirty = false;
    }
    if (mediaDirty) {
      msg("Re-processing from the original (framing / trim)…");
      const s = { aspect: media.aspect || "", fit: media.fit, crop_x: +media.crop_x, crop_y: +media.crop_y, zoom: +media.zoom,
                  trim_start: +media.trim_start || 0, trim_end: media.trim_end === "" || media.trim_end == null ? null : +media.trim_end };
      await api.saveMedia(ctx.pid, cur.id, s);
      mediaDirty = false;
    }
    await reload(false);
    msg("Saved to visual-assets.json", "ok");
  } catch (e) {
    msg(e.message, "err");
  } finally { busy = false; buttons(); }
}

async function send(file) {
  if (!file) return;
  if (!OK.test(file.name)) return msg("Only PNG, JPG, JPEG, WEBP, MP4, MOV or WEBM files", "err");
  const max = VIDEO.test(file.name) ? MAX_VID : MAX_IMG;
  if (file.size > max) return msg(`File too large (max ${max / 2 ** 20} MB)`, "err");
  busy = true; buttons();
  const bar = $("d-progress"), fill = bar.querySelector("span");
  bar.hidden = false; fill.style.width = "0";
  msg(`Uploading ${file.name}…`);
  try {
    const res = await api.upload(ctx.pid, cur.id, file, cur.found, (f) => {
      fill.style.width = `${Math.round(f * 100)}%`;
      if (f >= 1) msg("Processing (background removal / framing / checks)…");
    });
    await reload(true);
    const a = res.asset, v = a.validation || {};
    if (a.pending_file) msg("New file ready: compare it with the current one, then Confirm replacement or Discard", "ok");
    else msg(a.status === "failed" ? `Uploaded, but it failed validation: ${(v.checks || []).join("; ")}`
      : `Uploaded and ${a.status}${v.status === "warn" ? ` (warning: ${v.checks.slice(-1)[0]})` : ""}`, a.status === "failed" ? "err" : "ok");
  } catch (e) {
    msg(e.message, "err");
  } finally {
    busy = false; bar.hidden = true; $("d-file").value = ""; buttons();
  }
}

async function confirmReplace() {
  busy = true; buttons(); msg("Validating the new file…");
  try { await api.confirmReplace(ctx.pid, cur.id); await reload(false); msg("Replaced. The previous file is kept on disk.", "ok"); }
  catch (e) { msg(e.message, "err"); }
  finally { busy = false; buttons(); }
}

async function discard() {
  busy = true; buttons();
  try { await api.cancelReplace(ctx.pid, cur.id); await reload(true); msg("New file discarded; the current one stays.", "ok"); }
  catch (e) { msg(e.message, "err"); }
  finally { busy = false; buttons(); }
}

function close() {
  if ((promptDirty || mediaDirty) && !confirm("You have unsaved changes. Close and discard them?")) return;
  $("modal").hidden = true;
  $("d-frame").replaceChildren(); $("d-new").replaceChildren(); $("d-cur").replaceChildren();
  cur = null; promptDirty = mediaDirty = false;
}

export function openDetail(context, a) {
  ctx = context;
  promptDirty = mediaDirty = false;
  msg("");
  show(a);
  $("modal").hidden = false;
  $("d-close").focus();
}

// ---------- wiring (once) ----------
const setMedia = (k, v) => { media[k] = v; mediaDirty = true; drawFrame(); mediaText(); buttons(); msg("Unsaved changes"); };
$("m-aspect").addEventListener("change", (e) => { setMedia("aspect", e.target.value); });
document.querySelectorAll("[data-fit]").forEach((b) => b.addEventListener("click", () => {
  setMedia("fit", b.dataset.fit);
  document.querySelectorAll("[data-fit]").forEach((x) => x.classList.toggle("on", x === b));
  $("m-crop").classList.toggle("off", b.dataset.fit === "fit");
}));
$("m-x").addEventListener("input", (e) => setMedia("crop_x", +e.target.value));
$("m-y").addEventListener("input", (e) => setMedia("crop_y", +e.target.value));
$("m-zoom").addEventListener("input", (e) => setMedia("zoom", +e.target.value));
$("m-start").addEventListener("input", (e) => setMedia("trim_start", +e.target.value || 0));
$("m-end").addEventListener("input", (e) => setMedia("trim_end", e.target.value === "" ? null : +e.target.value));
$("m-fit-dur").addEventListener("click", () => {
  const req = cur.media.duration_required;
  if (!req) return msg("No required length for this asset", "err");
  const s = +media.trim_start || 0;
  $("m-end").value = (s + req).toFixed(2);
  setMedia("trim_end", +(s + req).toFixed(2));
});
$("d-close").addEventListener("click", close);
$("d-cancel").addEventListener("click", close);
$("modal").addEventListener("mousedown", (e) => { if (e.target === $("modal")) close(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modal").hidden) close(); });
$("d-edit").addEventListener("click", () => setEditing(true));
for (const id of ["d-prompt", "d-negative"]) {
  $(id).addEventListener("input", () => { promptDirty = true; buttons(); msg("Unsaved changes"); });
}
$("d-copy").addEventListener("click", async () => {
  const text = $("d-prompt").value + ($("d-negative").value ? `\n\nAvoid: ${$("d-negative").value}` : "");
  try { await navigator.clipboard.writeText(text); } catch { $("d-prompt").select(); document.execCommand("copy"); }
  msg("Prompt copied", "ok");
});
$("d-save").addEventListener("click", saveAll);
$("d-upload").addEventListener("click", () => $("d-file").click());
$("d-file").addEventListener("change", () => send($("d-file").files[0]));
$("d-confirm").addEventListener("click", confirmReplace);
$("d-discard").addEventListener("click", discard);
const drop = $("d-drop");
drop.addEventListener("dragover", (e) => { e.preventDefault(); if (cur && cur.method !== "template") drop.classList.add("over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (e) => {
  e.preventDefault(); drop.classList.remove("over");
  if (cur && !busy && cur.method !== "template") send(e.dataTransfer.files[0]);
});
