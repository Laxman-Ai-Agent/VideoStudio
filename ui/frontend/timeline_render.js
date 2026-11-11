// render popup: opens on Render, live clock + scenes done + estimate; a green tick when it finishes
let popRun = false;  // this page started / watched the run: only then a "complete" popup
function paintPop(d, el_) {
  const box = $("rpop"), card = box.querySelector(".rbox"), q = d.final ? "1080p" : "480p";
  if (d.state === "running") popRun = true;
  if (!popRun || d.review) return;
  const done = d.state === "done";
  card.classList.toggle("done", done);
  $("rp-title").textContent = done ? "Render complete" : d.state === "running" ? `Rendering ${q}...` : "Render stopped";
  $("rp-time").textContent = mmss(el_);
  const eta = d.eta || d.last, part = d.total ? `Scene ${d.done} / ${d.total}` : "Preparing";
  const after = { assemble: "All scenes rendered · joining video, voice and music...", qa: "Joined · final quality check..." }[d.phase];
  $("rp-eta").textContent = done ? `${q} done in ${mmss(el_)}` : d.state !== "running" ? "" : after ||
    part + (eta ? (eta > el_ ? ` · about ${mmss(eta - el_)} left (total ~${mmss(eta)})` : " · almost done") : " · estimating...");
  $("rp-prog").style.width = done ? "100%" : d.total ? Math.round((100 * d.done) / d.total) + "%" : eta ? Math.min(95, (100 * el_) / eta) + "%" : "3%";
  $("rp-step").textContent = done ? "Saved in the project's output folder" : ((d.tail || []).filter((x) => x.trim()).slice(-1)[0] || "").trim();
  $("rp-ok").textContent = done ? "OK" : "Hide";
  if (d.state === "failed" || d.state === "waiting") { box.hidden = true; popRun = false; return; }  // the red error popup takes over
  if (done && !box.dataset.shown) { box.hidden = false; box.dataset.shown = "1"; popRun = false; $("rp-ok").focus(); }
}
$("rp-ok").onclick = () => { $("rpop").hidden = true; };
