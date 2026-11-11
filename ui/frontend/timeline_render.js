// render popup (reference design 2026-11-11): opens on Render; every number is real (log, status, this PC), nothing is invented.
// Overall % = scenes 0-90, joining 90-96, quality check 96-99, finished 100 (a weighting, not a measurement).
let popRun = false;  // this page started / watched the run: only then a "complete" popup
let popScene = 0, popDone = false;
const PHASES = ["prepare", "scenes", "assemble", "qa"], STAGES = ["Prepare", "Render scenes", "Join video + audio", "Quality check", "Finalize"];
const pad2 = (n) => String(n).padStart(2, "0");
function paintPop(d, el_) {
  const box = $("rpop"), card = box.querySelector(".rp");
  if (d.state === "running") popRun = true;
  if (!popRun || d.review) return;
  const done = d.state === "done", q = d.final ? "1080p" : "480p", side = d.final ? [1920, 1080] : [854, 480];
  const [W, H] = d.fmt === "9:16" ? [side[1], side[0]] : side, total = d.total || 0, n = d.done || 0, ph = done ? 4 : Math.max(0, PHASES.indexOf(d.phase));
  const pct = done ? 100 : ph === 1 ? Math.round((90 * n) / (total || 1)) : [0, 0, 93, 98][ph];
  const eta = d.eta || d.last || 0, left = Math.max(0, eta - el_), tail = (d.tail || []).filter((x) => x.trim());
  card.classList.toggle("done", done);
  $("rp-title").textContent = done ? "Render complete" : d.state === "running" ? "Video Rendering in Progress" : "Render stopped";
  $("rp-sub").textContent = `Project: ${$("ptitle").textContent} | ${total ? `Scene ${n} / ${total}` : "Preparing"} | Output: ${W} × ${H} (${d.fmt || "16:9"})`;
  $("rs-prog").textContent = total ? `${n} / ${total}` : "-";
  $("rs-done").textContent = total ? n : "-"; $("rs-donep").textContent = total ? `(${((100 * n) / total).toFixed(1)}%)` : "";
  $("rs-left").textContent = total ? total - n : "-"; $("rs-leftp").textContent = total ? `(${((100 * (total - n)) / total).toFixed(1)}%)` : "";
  $("rs-el").textContent = mmss(el_);
  $("rs-eta").textContent = done ? "0:00" : eta ? (eta > el_ ? "~ " + mmss(left) : "any moment") : "estimating...";
  const at = new Date(Date.now() + left * 1000);
  $("rs-at").textContent = done ? "Finished" : eta ? at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "-";
  $("rp-pct").textContent = pct + "%"; $("rp-donut").style.setProperty("--p", pct);
  $("rp-pctl").textContent = done ? "Done" : "Complete";
  $("rp-what").textContent = done ? `${q} render finished` : `Rendering ${q}...`;
  const after = { assemble: "All scenes rendered · joining video, voice and music...", qa: "Joined · final quality check..." }[d.phase];
  $("rp-eta").textContent = done ? `Done in ${mmss(el_)} · saved in the project's output folder` : d.state !== "running" ? "" :
    after || (total ? `Scene ${n} / ${total}` : "Preparing") + (eta ? (eta > el_ ? ` – about ${mmss(left)} left (total ~${mmss(eta)})` : " – almost done") : "");
  $("rp-prog").style.width = pct + "%";
  $("rp-b1").textContent = `Elapsed: ${mmss(el_)}`; $("rp-b2").textContent = done ? "" : eta ? `Remaining: ${mmss(left)}` : "";
  $("rp-b3").textContent = eta ? `Total (est.): ${mmss(done ? el_ : Math.max(eta, el_))}` : "";
  $("rp-stages").innerHTML = STAGES.map((s, i) => {
    const st = i < ph || done ? "done" : i === ph ? "on" : "";
    const sub = st === "done" ? "100%" : st === "on" ? (i === 1 && total ? Math.round((100 * n) / total) + "%" : "running") : "waiting";
    return `<div class="rp-stage ${st}"><b>${st === "done" ? "✓ " : ""}${s}</b><small>${sub}</small></div>`;
  }).join("");
  $("rp-log").innerHTML = (d.activity || []).map((a) => `<li class="${a.status === "failed" ? "bad" : ""}">Scene ${a.id} · ${a.template} · ${a.status} in ${a.seconds}s</li>`).join("")
    || `<li class="none">${(tail.slice(-1)[0] || "Waiting for the first scene").trim()}</li>`;
  const sy = d.system;
  if (sy) {
    $("sy-cpu").textContent = sy.cpu + "%"; $("sy-cpub").style.width = sy.cpu + "%";
    $("sy-ram").textContent = `${sy.ram_used} GB / ${sy.ram_total} GB`; $("sy-ramb").style.width = (100 * sy.ram_used) / (sy.ram_total || 1) + "%";
    $("sy-disk").textContent = `${sy.disk_free} GB free / ${sy.disk_total} GB`; $("sy-diskb").style.width = (100 * (sy.disk_total - sy.disk_free)) / (sy.disk_total || 1) + "%";
  }
  $("st-q").textContent = `${q} (${W} × ${H})`; $("st-r").textContent = d.fmt || "16:9";
  $("rp-note").textContent = done ? "" : "You can hide this window; the render keeps running and the clock stays in the bar above.";
  $("rp-ok").textContent = done ? "OK" : "Hide";
  const ls = d.last_scene;
  if (ls && ls.id !== popScene) {  // a still of the newest finished scene, taken from its rendered clip
    popScene = ls.id;
    const sc = (st.scenes || []).find((s) => s.id === ls.id);
    $("rp-cap").textContent = `Last finished: scene ${ls.id}` + (sc ? ` · ${mmss(sc.start)} – ${mmss(sc.end)}` : "");
    fetch(`/api/projects/${enc(st.pid)}/frame?scene=${ls.id}&fmt=${enc(d.fmt || "16:9")}${d.final ? "&final=1" : ""}`, { cache: "no-store" })
      .then((r) => r.json()).then((j) => { if (j.frame && popScene === ls.id) $("rp-img").src = url(j.frame) + "?t=" + Date.now(); }).catch(() => {});
  }
  if (d.state === "failed" || d.state === "waiting") { box.hidden = true; popRun = false; return; }  // the red error popup takes over
  if (done && !popDone) { popDone = true; box.hidden = false; popRun = false; $("rp-ok").focus(); }
}
const hidePop = () => { $("rpop").hidden = true; };
$("rp-ok").onclick = hidePop; $("rp-x").onclick = hidePop; $("rp-tl").onclick = hidePop;
