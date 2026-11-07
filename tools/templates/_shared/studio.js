// Shared helpers for every HyperFrames template. Loaded after scene.js (window.SCENE) and gsap.
// window.SCENE = {id, format, w, h, fps, duration, text, query, narration, params, asset, fit,
//                 colors{background,accent,text}, fonts{telugu,latin}, error}
(function () {
  const S = window.SCENE;
  const r = document.documentElement.style;
  const u = Math.min(S.w, S.h) / 100;  // 1u = 1% of the short side, so layouts scale to any size
  // safe areas as fractions of width/height; 9:16 keeps clear of the Shorts/Reels UI top and bottom
  const safe = S.h > S.w ? { t: 0.14, b: 0.22, l: 0.07, r: 0.07 } : { t: 0.08, b: 0.08, l: 0.06, r: 0.06 };
  r.setProperty("--u", u + "px");
  r.setProperty("--w", S.w + "px");
  r.setProperty("--h", S.h + "px");
  r.setProperty("--st", safe.t * S.h + "px");
  r.setProperty("--sb", safe.b * S.h + "px");
  r.setProperty("--sl", safe.l * S.w + "px");
  r.setProperty("--sr", safe.r * S.w + "px");
  r.setProperty("--bg", S.colors.background || "#0E0E10");
  r.setProperty("--accent", S.colors.accent || "#FFC400");
  r.setProperty("--text", S.colors.text || "#FFFFFF");
  r.setProperty("--font", `"${S.fonts.latin || "Inter"}", "${S.fonts.telugu || "Noto Sans Telugu"}", "Nirmala UI", sans-serif`);
  document.documentElement.classList.add(S.h > S.w ? "portrait" : "landscape");
  window.U = u;

  // Kinetic text: one span per word (spaces only, so Telugu conjuncts stay whole), staggered pop-in.
  window.kinetic = function (el, text, tl, at, step) {
    el.textContent = "";
    const words = (text || "").split(/\s+/).filter(Boolean);
    words.forEach((w, i) => {
      const s = document.createElement("span");
      s.className = "word";
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      tl.fromTo(s, { opacity: 0, y: u * 4, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(2)" }, at + i * (step || 0.12));
    });
    return words.length;
  };

  window.finish = function (tl) {
    // pin the timeline length to the scene so the runtime never trims or pads it
    tl.set({}, {}, S.duration);
    window.__timelines = { root: tl };
  };
})();
