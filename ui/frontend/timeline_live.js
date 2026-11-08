// Timeline live preview: the render's scene builds (work/preview/<fmt>/scene_NNN, pipeline/preview.py)
// played in the browser, so a video can be checked before it is rendered. Two iframes: the visible scene
// and the next one preloading, so cuts do not flash; only these two are loaded at a time (low RAM).
// The parent drives each scene's GSAP timeline and <video> elements from the narration clock.
// Uses the globals of timeline.js (st, aud, $, el, url, move, drawAll).
const live = { data: null, slots: [], active: null, token: 0 };

function chrome() {  // overlays on the preview box: scene badge, expand button, status line
  const scr = $("screen");
  if (!$("badge")) scr.append(Object.assign(el("div"), { id: "badge" }));
  if (!$("expand")) {
    const b = Object.assign(el("button", "", "⛶"), { id: "expand", title: "Expand (F)" });
    b.onclick = toggleBig;
    scr.append(b);
  }
  if (!scr.querySelector(".msg")) scr.append(el("div", "msg"));
}

function setMsg(text) { chrome(); $("screen").querySelector(".msg").textContent = text; }

function toggleBig() {
  document.body.classList.toggle("big");
  fitScreen();
}

function fitScreen() {
  const port = st.fmt === "9:16", scr = $("screen");
  const maxW = $("stage").clientWidth || 640;
  const maxH = Math.max(220, window.innerHeight * (document.body.classList.contains("big") ? 0.72 : 0.5));
  let w = maxW, h = w * (port ? 16 / 9 : 9 / 16);
  if (h > maxH) { h = maxH; w = h * (port ? 9 / 16 : 16 / 9); }
  scr.style.width = Math.round(w) + "px";
  scr.style.height = Math.round(h) + "px";
  live.slots.forEach((f) => f && live.data && scale(f));
  if (window.drawSel) drawSel();
}

function scale(f) {
  f.style.width = live.data.w + "px";
  f.style.height = live.data.h + "px";
  f.style.transform = `scale(${$("screen").clientWidth / live.data.w})`;
}

async function buildLive() {
  const tok = ++live.token;
  live.data = null;
  live.slots = [];
  live.active = null;
  $("screen").innerHTML = "";
  chrome();
  fitScreen();
  setMsg("Building live preview...");
  try {
    const r = await fetch(`/api/projects/${enc(st.pid)}/preview?fmt=${enc(st.fmt)}`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `${r.status}`);
    if (tok !== live.token) return;  // project or format changed meanwhile
    live.data = { w: d.width, h: d.height, map: Object.fromEntries(d.scenes.map((x) => [x.id, x])) };
    const bad = d.scenes.filter((x) => x.error).length;
    st.cur = null;
    drawAll();
    fetchThumbs(tok);
    setMsg(bad ? `${bad} scene(s) failed to build (shown as the missing tile)` : "");
  } catch (e) {
    if (tok !== live.token) return;
    setMsg("Live preview off: " + e.message);
    st.cur = null;
    drawAll();
  }
}

async function fetchOneThumb(s) {
  const m = live.data && live.data.map[s.id];
  if (!m || m.thumb) return;
  try {
    const r = await fetch(`/api/projects/${enc(st.pid)}/thumb?fmt=${enc(st.fmt)}&scene=${s.id}`, { method: "POST" });
    const d = await r.json();
    if (d.thumb && live.data && live.data.map[s.id] === m) { m.thumb = d.thumb; m.tv = Date.now(); }
  } catch { /* no thumbnail: the list keeps its empty tile */ }
}

async function fetchThumbs(tok) {  // one Chrome at a time, current scene first; the list and tracks refresh as stills arrive
  const todo = [st.cur, ...st.scenes].filter((s, i, a) => s && a.indexOf(s) === i);
  for (const s of todo) {
    if (tok !== live.token) return;
    await fetchOneThumb(s);
    if (tok === live.token) { drawList(); draw(); }
  }
}

function slot(i) {
  let f = live.slots[i];
  if (!f || !f.isConnected) {
    f = el("iframe");
    f.setAttribute("scrolling", "no");
    f.setAttribute("tabindex", "-1");
    $("screen").prepend(f);
    live.slots[i] = f;
    scale(f);
  }
  return f;
}

function loadInto(f, s) {
  const p = live.data.map[s.id];
  if (!p || f.dataset.sid === String(s.id)) return;
  f.dataset.sid = String(s.id);
  f.dataset.ready = "";
  f.onload = () => { f.dataset.ready = "1"; if (st.cur === s) { liveSync(aud.currentTime || 0); if (window.editLoaded) editLoaded(); } };
  f.src = url(p.dir + "/index.html");
}

function videosOf(f) {
  try { return [...f.contentDocument.querySelectorAll("video")]; } catch { return []; }
}

function liveShow(s) {  // true when the live preview took over the screen for scene s
  if (!live.data || !live.data.map[s.id]) return false;
  $("screen").querySelectorAll(":scope > img, :scope > video, :scope > .tpl").forEach((e) => e.remove());
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
    const hold = window.edLocal ? edLocal(f) : null;  // Visual Edit shows the settled frame
    const local = hold ?? Math.max(0, t - s.start);
    try {
      const tl = f.contentWindow.__timelines && f.contentWindow.__timelines.root;
      if (tl) tl.seek(Math.min(local, tl.duration()), false);
    } catch { /* frame still loading */ }
    for (const v of videosOf(f)) {
      const want = Math.min(local, (v.duration || 1e9) - 0.05);
      v.playbackRate = aud.playbackRate;
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
  const nx = st.loop ? s : st.scenes[st.scenes.indexOf(s) + 1];  // preload what plays next
  if (nx && nx !== s && live.data.map[nx.id] && s.end - t < 1.5) {
    const a = slot(0), b = slot(1);
    loadInto(f === a ? b : a, nx);
  }
}

new ResizeObserver(() => fitScreen()).observe($("stage"));
