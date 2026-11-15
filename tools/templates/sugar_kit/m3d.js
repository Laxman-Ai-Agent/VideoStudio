/* m3d (copied from moon_kit for 09_Sugar_Walk): three.js r147 3D for written scenes. HyperFrames protocol (skills/.../runtimes.md, types/3d.md):
   setup is one window.__hf.buildReady promise; every frame is drawn in the hf-seek listener from e.detail.time, no loops.
   view(o) -> {c, r, scene, cam, update(t)}; moon(v, colorFile, dispFile, r); gltf(v, file) -> Group (filled on load);
   toScreen(v, vec3) -> [x, y] px in stage space; M3.ready() once after building. State comes from GSAP proxies tweened on X.tl. */
(function () {
  const { W, H, tl } = X;
  window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
  const views = [], jobs = [];
  function view(o = {}) {
    const w = o.w || W, h = o.h || H, c = document.createElement("canvas");
    Object.assign(c.style, { position: "absolute", left: (o.x || 0) + "px", top: (o.y || 0) + "px", width: w + "px", height: h + "px" });
    (o.parent || document.getElementById("stage")).append(c);
    const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(w, h, false); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = o.exposure || 1.1;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(o.fov || 30, w / h, 0.01, 1000);
    const v = { c, r, scene, cam, w, h, x: o.x || 0, y: o.y || 0, update: () => {} };
    if (o.lights !== false) {
      const key = new THREE.DirectionalLight(0xfff1dc, o.key || 2.6); key.position.set(-4, 2.5, 5); scene.add(key);
      const rim = new THREE.DirectionalLight(0x9fc2ff, o.rim || 0.9); rim.position.set(5, 1, -4); scene.add(rim);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f4b, o.amb || 0.35)); v.key = key;
    }
    views.push(v); return v;
  }
  const tex = (f) => new Promise((ok, no) => new THREE.TextureLoader().load(f, (t) => { t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; ok(t); }, undefined, no));
  function moon(v, color, disp, rad = 1) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
    const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 256, 128), mat); v.scene.add(m);
    jobs.push(Promise.all([tex(color), disp ? tex(disp) : null]).then(([a, b]) => {
      mat.map = a; if (b) { b.encoding = THREE.LinearEncoding; mat.displacementMap = b; mat.displacementScale = rad * 0.012; mat.bumpMap = b; mat.bumpScale = rad * 0.02; }
      mat.needsUpdate = true; }));
    return m;
  }
  function gltf(v, file) {
    const g = new THREE.Group(); v.scene.add(g);
    jobs.push(new Promise((ok, no) => new THREE.GLTFLoader().load(file, (x) => { g.add(x.scene); ok(); }, undefined, no)));
    return g;
  }
  // centre + scale a loaded model to fit `size` (largest side), sitting on y = 0
  function frame(g, size = 2) {
    const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = size / Math.max(s.x, s.y, s.z);
    g.children.forEach((ch) => { ch.position.sub(new THREE.Vector3(c.x, b.min.y, c.z)); }); g.scale.setScalar(k); return g;
  }
  function toScreen(v, p) { const q = p.clone().project(v.cam); return [v.x + (q.x + 1) / 2 * v.w, v.y + (1 - q.y) / 2 * v.h, q.z < 1]; }
  function draw(t) { if (Math.abs(tl.time() - t) > 1e-4) tl.seek(t, true); views.forEach((v) => { v.update(t); v.r.render(v.scene, v.cam); }); }
  function ready(onBuilt) {
    window.__hf.buildReady.m3d = Promise.all(jobs).then(() => {
      if (onBuilt) onBuilt();
      views.forEach((v) => { v.r.compile(v.scene, v.cam); v.update(0); v.r.render(v.scene, v.cam);
        const gl = v.r.getContext(), px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); });
    });
    window.addEventListener("hf-seek", (e) => draw(e.detail.time));
  }
  window.M3 = { view, moon, gltf, frame, toScreen, ready, draw, tex };
})();
