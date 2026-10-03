import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 * Shooting range: first-person test of the weapon that was built.
 * All numbers come from shooting-range/range-config.js (window.KITBUILDER_RANGE).
 */
const DEG = Math.PI / 180;
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const merge = (...src) => {
  const out = {};
  for (const s of src) for (const k in s || {}) out[k] = isObj(s[k]) ? merge(isObj(out[k]) ? out[k] : {}, s[k]) : s[k];
  return out;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = (a = -1, b = 1) => a + Math.random() * (b - a);
const MAX_BBS = 160, MAX_PUFF = 120;

/* ------------------------------------------------------------------ sound (Web Audio, nothing to download) */
class RangeAudio {
  constructor(cfg) {
    this.cfg = cfg;
    this.muted = false;
    this.buffers = {};
    this.lastTick = 0;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = AC ? new AC() : null;
    if (!this.ctx) return;
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = cfg.master;
    this.master.connect(c.destination);
    this.dry = c.createGain(); this.dry.connect(this.master);
    this.wet = c.createGain(); this.wet.gain.value = cfg.reverb.amount;
    const verb = c.createConvolver();
    verb.buffer = this.impulse(cfg.reverb.seconds);
    this.wet.connect(verb); verb.connect(this.master);
    // one second of white noise, reused by every synthesised sound
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ["shotFile", "reloadFile"].forEach((k) => cfg[k] && this.fetchBuffer(k, cfg[k]));
  }
  impulse(seconds) {
    const c = this.ctx, n = Math.floor(c.sampleRate * seconds), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
    }
    return b;
  }
  async fetchBuffer(key, url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      this.buffers[key] = await this.ctx.decodeAudioData(await res.arrayBuffer());
    } catch (e) { console.warn(`Sound not loaded (${url}), using the built-in sound`, e); }
  }
  resume() { if (this.ctx && this.ctx.state !== "running") this.ctx.resume().catch(() => {}); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : this.cfg.master; }

  out(node, pan = 0, send = 1) {
    const c = this.ctx;
    let end = node;
    if (c.createStereoPanner && pan) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); end = p; }
    end.connect(this.dry);
    if (send) { const s = c.createGain(); s.gain.value = send; end.connect(s); s.connect(this.wet); }
  }
  burst(t, { dur, freq, q = 0.7, type = "bandpass", gain, pan = 0, send = 1 }) {
    const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise; src.loop = true;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); this.out(g, pan, send);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  tone(t, { f0, f1 = f0, dur, gain, type = "sine", pan = 0, send = 1 }) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); this.out(g, pan, send);
    o.start(t); o.stop(t + dur + 0.05);
  }
  file(key, vol, rate = 1) {
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = this.buffers[key]; s.playbackRate.value = rate; g.gain.value = vol;
    s.connect(g); this.out(g, 0, 0.8); s.start();
  }

  shot(s, device) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.001, v = s.volume * device.volume, j = 1 + rnd(-s.pitchJitter, s.pitchJitter);
    if (this.buffers.shotFile) { this.file("shotFile", v, j); return; }
    const lp = device.lowpass;
    this.burst(t, { dur: s.duration, freq: s.noiseFreq * lp * j, q: s.noiseQ, gain: 0.9 * v });
    if (s.crack > 0) this.burst(t, { dur: 0.025, freq: 5200 * lp, q: 0.6, type: "highpass", gain: s.crack * v * (0.4 + 0.6 * lp) });
    this.tone(t, { f0: s.thumpFreq * 1.7 * j, f1: s.thumpFreq * 0.6, dur: s.thumpDecay + 0.04, gain: 0.8 * v });
  }
  tick(vol, pan, dist) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - this.lastTick < 40) return;   // many BBs landing at once should not turn into a hiss
    this.lastTick = now;
    const t = this.ctx.currentTime + dist / 340;   // sound takes time to travel
    this.burst(t, { dur: 0.012, freq: 3800 * rnd(0.8, 1.2), q: 1.2, gain: vol / (1 + dist * 0.12), pan, send: 0.5 });
  }
  ping(vol, pan, dist) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + dist / 340, g = vol / (1 + dist * 0.08), f = rnd(1500, 1900);
    this.tone(t, { f0: f, dur: 0.45, gain: g * 0.6, pan, send: 1 });
    this.tone(t, { f0: f * 2.76, dur: 0.25, gain: g * 0.3, pan, send: 1 });
    this.burst(t, { dur: 0.02, freq: 4500, q: 0.8, gain: g * 0.6, pan });
  }
  click(vol = 0.4, freq = 2400, delay = 0) {
    if (!this.ctx || this.muted) return;
    this.burst(this.ctx.currentTime + delay, { dur: 0.018, freq, q: 2, gain: vol, send: 0.3 });
  }
  reload(total) {
    if (!this.ctx || this.muted) return;
    if (this.buffers.reloadFile) { this.file("reloadFile", 0.8); return; }
    this.click(0.5, 1600, 0.12);                  // magazine out
    this.click(0.35, 900, 0.22);
    this.click(0.55, 2200, total * 0.62);         // magazine in
    this.click(0.45, 1300, total * 0.62 + 0.09);
    this.click(0.6, 1800, total - 0.1);           // action
  }
}

/* ------------------------------------------------------------------ the range */
export class Range {
  constructor(viewer, root) {
    this.viewer = viewer;
    this.root = root;
    this.cfg = window.KITBUILDER_RANGE;
    this.$ = (id) => root.querySelector(`[data-r="${id}"]`);
    this.running = false;
    this.onExit = () => {};
    this.ready = null;
    this.look = { yaw: 0, pitch: 0 };
    this.kick = { x: 0, v: 0, camPitch: 0, camYaw: 0, side: 0 };
    this.ads = 0; this.adsHeld = false; this.adsToggle = false;
    this.trigger = false; this.pending = false; this.heldShot = false;
    this.nextShot = 0; this.reloadT = -1; this.pumpT = -1;
    this.flash = 0; this.flashT = 0;
    this.shots = 0; this.platesHit = 0;
    this.bbs = []; this.bbCount = 0;
    this.pointers = new Map();
    this.locked = false;
    this.fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    this.bindUi();
  }

  /* ---------- set up (first visit) ---------- */
  async init() {
    const cfg = this.cfg, L = cfg.lighting;
    const view = this.$("view");
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }));
    r.setPixelRatio(Math.min(devicePixelRatio, matchMedia("(hover: none)").matches ? 1.5 : 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = L.exposure;
    r.autoClear = false;
    view.appendChild(r.domElement);
    r.domElement.style.touchAction = "none";

    this.scene = new THREE.Scene();
    this.vmScene = new THREE.Scene();                    // the weapon is drawn on top, so it never pokes into the bench or walls
    const pm = new THREE.PMREMGenerator(r);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.scene.environment = env; this.scene.environmentIntensity = L.envIntensity;
    this.vmScene.environment = env; this.vmScene.environmentIntensity = L.envIntensity * 1.1;
    if (L.fog) this.scene.fog = new THREE.Fog(L.fog.color, L.fog.near, L.fog.far);
    const hemi = () => new THREE.HemisphereLight(L.hemisphere.sky, L.hemisphere.ground, L.hemisphere.intensity);
    this.scene.add(hemi()); this.vmScene.add(hemi());
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(0.4, 1, 0.6);
    this.vmScene.add(sun);
    (L.fill || []).forEach((f) => {
      const p = new THREE.PointLight(f.color, f.intensity, f.distance, 2);
      p.position.fromArray(f.pos);
      this.scene.add(p);
    });

    this.camera = new THREE.PerspectiveCamera(cfg.camera.fov, 1.6, cfg.camera.near, cfg.camera.far);
    this.camera.rotation.order = "YXZ";
    this.camera.position.fromArray(cfg.camera.position);
    this.scene.add(this.camera);
    this.vmCam = new THREE.PerspectiveCamera(cfg.camera.fov, 1.6, cfg.viewmodel.near, 5);

    this.vm = new THREE.Group();                         // placed relative to the camera
    this.vm.rotation.order = "YXZ";
    this.vmScene.add(this.vm);

    // BBs: one instanced mesh, stretched along their flight direction
    this.bbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_BBS);
    this.bbMesh.frustumCulled = false; this.bbMesh.count = 0;
    this.scene.add(this.bbMesh);

    // BB marks
    const D = cfg.impact.decals;
    this.decals = null;
    if (D.enabled) {
      const cv = document.createElement("canvas"); cv.width = cv.height = 64;
      const g = cv.getContext("2d");
      g.fillStyle = D.color; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
      g.fillStyle = "rgba(20,18,14,.95)"; g.beginPath(); g.arc(32, 32, 14, 0, 7); g.fill();
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: D.opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      this.decals = new THREE.InstancedMesh(new THREE.CircleGeometry(0.5, 14), m, D.max);
      this.decals.frustumCulled = false;
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < D.max; i++) this.decals.setMatrixAt(i, zero);
      this.decalIdx = 0;
      this.scene.add(this.decals);
    }

    // puffs where a BB lands
    const P = cfg.impact.puff;
    this.puffs = null;
    if (P.enabled) {
      const pos = new Float32Array(MAX_PUFF * 3).fill(-999);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.puffs = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd8d2c4, size: P.size, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false }));
      this.puffs.frustumCulled = false;
      this.puffData = Array.from({ length: MAX_PUFF }, () => ({ v: new THREE.Vector3(), life: 0 }));
      this.puffIdx = 0;
      this.scene.add(this.puffs);
    }

    // muzzle flash: star sprite + short light
    const F = cfg.muzzleFlash;
    const fc = document.createElement("canvas"); fc.width = fc.height = 128;
    const fg = fc.getContext("2d");
    const grad = fg.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.25, "rgba(255,225,160,.9)"); grad.addColorStop(1, "rgba(255,160,60,0)");
    fg.fillStyle = grad; fg.fillRect(0, 0, 128, 128);
    fg.translate(64, 64); fg.fillStyle = "rgba(255,240,200,.9)";
    for (let i = 0; i < 6; i++) { fg.rotate(Math.PI / 3); fg.beginPath(); fg.moveTo(0, -3); fg.lineTo(62, 0); fg.lineTo(0, 3); fg.fill(); }
    this.flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(fc), color: F.color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false }));
    this.flashSprite.visible = false;
    this.flashSprite.renderOrder = 10;
    this.flashLightVm = new THREE.PointLight(F.light.color, 0, F.light.distance, 2);
    this.flashLightMain = new THREE.PointLight(F.light.color, 0, F.light.distance * 1.6, 2);
    this.scene.add(this.flashLightMain);
    this.vmScene.add(this.flashLightVm);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(view);
    this.resize();
    this.status("Loading the shooting range…");
    const m = cfg.modelFix || {};
    const gltf = await this.viewer.load(cfg.model);
    const wrap = new THREE.Group();
    wrap.add(gltf);
    if (m.scale) wrap.scale.setScalar(m.scale);
    if (m.rot) wrap.rotation.set(m.rot[0] * DEG, m.rot[1] * DEG, m.rot[2] * DEG);
    if (m.offset) wrap.position.fromArray(m.offset);
    this.scene.add(wrap);
    wrap.updateMatrixWorld(true);
    this.rangeRoot = wrap;
    this.buildPlates();
    this.ray = new THREE.Raycaster();
  }

  buildPlates() {
    const P = this.cfg.plates;
    this.plates = [];
    this.plateMeshes = [];
    this.plateGroup = new THREE.Group();
    this.scene.add(this.plateGroup);
    if (!P.enabled) return;
    const steel = new THREE.MeshStandardMaterial({ color: P.color, metalness: 0.85, roughness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: "#2a2d33", metalness: 0.6, roughness: 0.6 });
    P.items.forEach((it) => {
      const g = new THREE.Group();
      g.position.set(it.pos[0], 0, it.pos[2]);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, it.pos[1] + P.radius, 8), dark);
      post.position.y = (it.pos[1] + P.radius) / 2 - 0.0;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.3), dark);
      base.position.y = 0.015;
      // the plate hangs from a hinge at its top edge, so it can fall backwards
      const hinge = new THREE.Group();
      hinge.position.set(0, it.pos[1] + P.radius, 0.02);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(P.radius, P.radius, 0.012, 32), steel);
      plate.rotation.x = Math.PI / 2;
      plate.position.y = -P.radius;
      plate.userData.plate = { fallen: false, angle: 0, vel: 0, target: 0, hinge, pivotMesh: plate };
      hinge.add(plate);
      g.add(post, base, hinge);
      this.plateGroup.add(g);
      this.plates.push(plate.userData.plate);
    });
    this.plateMeshes = this.plates.map((p) => p.pivotMesh);
    this.plateGroup.updateMatrixWorld(true);
  }

  /* ---------- enter / leave ---------- */
  async enter(build) {
    this.build = build;
    this.root.hidden = false;
    document.documentElement.classList.add("range-open");
    this.viewer.setPaused(true);
    if (!this.audio) this.audio = new RangeAudio(this.cfg.sound);
    this.audio.resume();
    try {
      if (!this.ready) this.ready = this.init();
      await this.ready;
    } catch (e) {
      console.warn("Shooting range failed to load", e);
      this.status("The shooting range could not be loaded.");
      this.ready = null;
      return;
    }
    this.status("");
    this.setWeapon(build);
    const c = this.cfg.camera;
    this.look.yaw = c.yaw * DEG; this.look.pitch = c.pitch * DEG;
    this.kick = { x: 0, v: 0, camPitch: 0, camYaw: 0, side: 0 };
    this.shots = 0; this.platesHit = 0;
    this.plates.forEach((p) => this.resetPlate(p));
    this.resize();
    this.running = true;
    this.last = performance.now();
    this.renderer.setAnimationLoop((t) => this.frame(t));
    this.updateHud();
    this.root.querySelector(".rh-click").hidden = !this.fine;
  }

  exit() {
    if (!this.root || this.root.hidden) return;
    this.running = false;
    this.trigger = false; this.adsHeld = false; this.adsToggle = false;
    this.pointers.clear();
    if (this.renderer) this.renderer.setAnimationLoop(null);
    if (document.pointerLockElement) document.exitPointerLock();
    this.root.hidden = true;
    document.documentElement.classList.remove("range-open");
    this.viewer.setPaused(false);
    this.onExit();
  }

  status(text) {
    const el = this.$("loading");
    el.textContent = text;
    el.hidden = !text;
  }

  /* ---------- weapon ---------- */
  profileFor(w) {
    const P = this.cfg.profiles;
    return merge(P.default, P[w.category], P[w.id]);
  }

  setWeapon(build) {
    const w = build.weapon;
    this.prof = this.profileFor(w);
    if (this.wepObj) { this.vm.remove(this.wepPivot); this.wepPivot = this.wepObj = null; }
    const piv = new THREE.Group();
    piv.rotation.y = Math.PI / 2;                       // barrel (+X in the model) points forward (-Z)
    piv.scale.setScalar(this.cfg.viewmodel.scale);
    piv.add(build.object);
    this.vm.add(piv);
    this.wepPivot = piv; this.wepObj = build.object;
    this.muzzleLocal = new THREE.Vector3().fromArray(build.muzzle);
    // aiming: with an optic installed the eye is lined up with it automatically (config: viewmodel ads.eyeRelief)
    const ads = this.prof.viewmodel.ads || (this.prof.viewmodel.ads = {});
    this.adsPos = ads.position;
    if (ads.auto !== false && build.sight) {
      const s = build.sight, sc = this.cfg.viewmodel.scale;
      const y = s.ymin + (ads.sightHeight ?? 0.6) * (s.ymax - s.ymin);
      this.adsPos = [-s.z * sc, -y * sc, s.x * sc - (ads.eyeRelief ?? 0.3)];
    }
    // the optic turns see-through while aiming (its own model has a dark window), so the target stays visible
    this.opticMats = [];
    build.object.traverse((o) => {
      if (!o.isMesh || !o.userData.isOptic) return;
      o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => this.opticMats.push({ m, opacity: m.opacity, transparent: m.transparent }));
    });
    piv.add(this.flashSprite, this.flashLightVm);
    this.flashSprite.position.copy(this.muzzleLocal);
    this.flashLightVm.position.copy(this.muzzleLocal).add(new THREE.Vector3(0.06, 0.02, 0));
    const dev = this.cfg.muzzleDevices;
    this.device = dev[build.muzzleDevice] || dev.none;
    const F = this.prof.fire;
    this.modes = F.modes; this.modeIdx = 0;
    this.ammo = F.magazine || Infinity;
    this.reloadT = -1; this.pumpT = -1;
    const stat = build.stats && build.stats.recoil != null ? build.stats.recoil : this.prof.recoil.statRef;
    const R = this.prof.recoil;
    this.recoilMult = clamp(stat / R.statRef, R.statMin, R.statMax);
    this.bbMesh.material.color.set(this.prof.bb.color);
    this.bbs.length = 0;
    this.$("title").textContent = w.name;
  }

  get mode() { return this.modes[this.modeIdx]; }

  /* ---------- input ---------- */
  bindUi() {
    const el = this.root;
    const press = (name, down, up) => {
      const b = this.$(name);
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add("down"); down(); });
      const end = (e) => { if (b.classList.contains("down")) { b.classList.remove("down"); up && up(); } };
      b.addEventListener("pointerup", end); b.addEventListener("pointercancel", end);
    };
    press("fire", () => this.pull(true), () => this.pull(false));
    press("aim", () => { this.adsToggle = !this.adsToggle; this.$("aim").setAttribute("aria-pressed", this.adsToggle); });
    press("reload", () => this.reload());
    press("modebtn", () => this.cycleMode());
    this.$("exit").addEventListener("click", () => this.exit());
    this.$("sound").addEventListener("click", (e) => {
      const m = e.currentTarget.getAttribute("aria-pressed") !== "true";
      e.currentTarget.setAttribute("aria-pressed", m);
      this.audio && this.audio.setMuted(m);
    });
    this.$("reset").addEventListener("click", () => this.plates.forEach((p) => this.resetPlate(p)));

    const view = this.$("view");
    view.addEventListener("contextmenu", (e) => e.preventDefault());
    view.addEventListener("pointerdown", (e) => {
      this.audio && this.audio.resume();
      if (e.pointerType === "mouse") {
        if (this.fine && !this.locked && view.requestPointerLock) { view.requestPointerLock(); return; }
        if (e.button === 0) this.pull(true);
        if (e.button === 2) this.adsHeld = true;
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, drag: !this.locked });
        view.setPointerCapture(e.pointerId);
      } else {
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, drag: true });
        view.setPointerCapture(e.pointerId);
      }
    });
    view.addEventListener("pointermove", (e) => {
      const p = this.pointers.get(e.pointerId);
      if (p && p.drag) {
        const k = this.cfg.camera.sensitivity[e.pointerType === "mouse" ? "mouse" : "touch"];
        this.turn((e.clientX - p.x) * k, (e.clientY - p.y) * k);
        p.x = e.clientX; p.y = e.clientY;
      }
    });
    const up = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      this.pointers.delete(e.pointerId);
      if (e.pointerType === "mouse") { if (e.button === 0) this.pull(false); if (e.button === 2) this.adsHeld = false; }
    };
    view.addEventListener("pointerup", up); view.addEventListener("pointercancel", up);
    // mouse look while the pointer is locked
    document.addEventListener("mousemove", (e) => { if (this.locked && this.running) this.turn(e.movementX * this.cfg.camera.sensitivity.mouse, e.movementY * this.cfg.camera.sensitivity.mouse); });
    document.addEventListener("mousedown", (e) => {
      if (!this.locked || !this.running) return;
      if (e.button === 0) this.pull(true);
      if (e.button === 2) this.adsHeld = true;
    });
    document.addEventListener("mouseup", (e) => {
      if (!this.running) return;
      if (e.button === 0) this.pull(false);
      if (e.button === 2) this.adsHeld = false;
    });
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === view;
      this.root.querySelector(".rh-click").hidden = this.locked || !this.fine || !this.running;
      if (!this.locked) { this.trigger = false; this.adsHeld = false; }
    });
    document.addEventListener("keydown", (e) => {
      if (!this.running || e.repeat) return;
      if (e.code === "KeyR") this.reload();
      else if (e.code === "KeyB" || e.code === "KeyV") this.cycleMode();
      else if (e.code === "KeyE") this.adsToggle = !this.adsToggle;
      else if (e.code === "Escape" && !this.locked) this.exit();
      else if (e.code === "Space") { e.preventDefault(); this.pull(true); }
    });
    document.addEventListener("keyup", (e) => { if (this.running && e.code === "Space") this.pull(false); });
  }

  turn(dx, dy) {
    const c = this.cfg.camera, f = this.ads > 0.5 ? c.sensitivity.adsFactor : 1, lim = c.limits;
    this.look.yaw = clamp(this.look.yaw - dx * f, c.yaw * DEG + lim.yaw[0] * DEG, c.yaw * DEG + lim.yaw[1] * DEG);
    this.look.pitch = clamp(this.look.pitch - dy * f, c.pitch * DEG + lim.pitch[0] * DEG, c.pitch * DEG + lim.pitch[1] * DEG);
  }

  pull(down) {
    if (!this.running) return;
    this.trigger = down;
    if (down) this.pending = true; else { this.heldShot = false; this.pending = false; }
  }

  cycleMode() {
    if (this.modes.length < 2) return;
    this.modeIdx = (this.modeIdx + 1) % this.modes.length;
    this.audio && this.audio.click(0.3, 1800);
    this.updateHud();
  }

  reload() {
    const F = this.prof.fire;
    if (!F.magazine || this.reloadT >= 0 || this.ammo === F.magazine) return;
    this.reloadT = 0;
    this.audio && this.audio.reload(F.reloadTime);
    this.updateHud();
  }

  /* ---------- shooting ---------- */
  tryFire(now) {
    const F = this.prof.fire;
    if (this.reloadT >= 0 || now < this.nextShot) return;
    if (!this.trigger && !this.pending) return;
    const auto = this.mode === "auto";
    if (!auto && this.heldShot && !this.pending) return;
    if (this.ammo <= 0) {
      this.audio && this.audio.click(0.5, 1500);   // empty: dry click, then reload
      this.nextShot = now + 0.25; this.pending = false; this.heldShot = true;
      if (F.magazine) this.reload();
      return;
    }
    this.pending = false;
    if (!auto) this.heldShot = true;
    this.nextShot = now + 60 / F.rpm;
    this.fire();
  }

  aimRay() {
    this.camera.updateMatrixWorld(true);
    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const dir = new THREE.Vector3(0, 0, -1).transformDirection(this.camera.matrixWorld);
    this.ray.set(origin, dir); this.ray.far = 200;
    const hit = this.ray.intersectObjects([this.rangeRoot, ...this.plateMeshes], true)[0];
    const d = hit && hit.distance > 1.2 ? hit.distance : this.prof.bb.convergence;
    return origin.addScaledVector(dir, d);
  }

  muzzleWorld() {
    this.vm.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    return this.camera.localToWorld(this.wepObj.localToWorld(this.muzzleLocal.clone()));
  }

  fire() {
    const B = this.prof.bb, R = this.prof.recoil;
    const muzzle = this.muzzleWorld(), aim = this.aimRay();
    const base = aim.sub(muzzle).normalize();
    const side = new THREE.Vector3().crossVectors(base, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(side, base).normalize();
    for (let i = 0; i < Math.max(1, B.pellets); i++) {
      if (this.bbs.length >= MAX_BBS) this.bbs.shift();
      const cone = (B.spreadDeg + (B.pellets > 1 ? B.pelletSpreadDeg : 0)) * DEG;
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * cone;
      const dir = base.clone().addScaledVector(side, Math.cos(a) * Math.tan(r)).addScaledVector(up, Math.sin(a) * Math.tan(r)).normalize();
      const speed = B.velocity * (1 + rnd(-0.015, 0.015));
      this.bbs.push({ p: muzzle.clone(), v: dir.multiplyScalar(speed), age: 0, spin: 1, bounces: 0, v0: speed });
    }
    // recoil: weapon spring + view climb (stronger for a heavier-kicking build, weaker while aiming)
    const m = this.recoilMult * (1 - this.ads * (1 - R.adsFactor));
    const k = this.kick;
    k.v += Math.sqrt(R.stiffness) * 1.35 * m;
    k.x = Math.min(k.x, 2.5);
    k.side += rnd(-1, 1) * R.kickSide * m;
    k.camPitch += R.cameraPitch * m * DEG;
    k.camYaw += rnd(-1, 1) * R.cameraYaw * m * DEG;
    // flash + sound
    const F = this.cfg.muzzleFlash;
    if (F.enabled && this.device.flash > 0.02) {
      this.flash = F.duration_ms / 1000; this.flashT = this.flash;
      this.flashStrength = this.device.flash;
      this.flashSprite.material.rotation = Math.random() * 6.28;
    }
    this.audio && this.audio.shot(this.prof.sound, this.device);
    if (this.prof.fire.pump) this.pumpT = 0;
    this.shots++; this.ammo--;
    this.updateHud();
  }

  /* ---------- per frame ---------- */
  frame(t) {
    const now = t / 1000, dt = Math.min(0.05, Math.max(0.001, (t - this.last) / 1000));
    this.last = t;
    const C = this.cfg.camera, V = this.cfg.viewmodel, R = this.prof.recoil, F = this.prof.fire;

    // aim state
    const wantAds = this.adsHeld || this.adsToggle;
    this.ads += (clamp(wantAds ? 1 : 0, 0, 1) - this.ads) * Math.min(1, V.aimSpeed * dt);

    // spring + recovery
    const k = this.kick;
    k.v += (-R.stiffness * k.x - R.damping * k.v) * dt;
    k.x += k.v * dt;
    const rec = Math.min(1, R.cameraRecovery * dt);
    k.camPitch -= k.camPitch * rec; k.camYaw -= k.camYaw * rec; k.side -= k.side * Math.min(1, 9 * dt);

    // reload / pump animation
    let dip = 0, dipRot = 0, pump = 0;
    if (this.reloadT >= 0) {
      this.reloadT += dt;
      const u = clamp(this.reloadT / F.reloadTime, 0, 1);
      const s = Math.sin(Math.PI * Math.min(1, u * 1.08));
      dip = s; dipRot = s;
      if (u >= 1) { this.reloadT = -1; this.ammo = F.magazine; this.updateHud(); }
    }
    if (this.pumpT >= 0) {
      this.pumpT += dt;
      const u = this.pumpT / Math.min(0.45, 60 / F.rpm * 0.7);
      pump = Math.sin(Math.PI * clamp(u, 0, 1));
      if (u >= 1) { this.pumpT = -1; this.audio && this.audio.click(0.35, 1100); this.audio && this.audio.click(0.3, 1700, 0.14); }
    }

    // view
    const sw = C.sway, sf = 1 - this.ads * (1 - sw.adsFactor);
    const sy = Math.sin(now * Math.PI * 2 * sw.breatheHz) * sw.breathe * sf * DEG;
    const sx = Math.sin(now * Math.PI * 2 * sw.breatheHz * 1.7 + 1.3) * sw.breathe * 0.6 * sf * DEG;
    this.camera.rotation.set(this.look.pitch + k.camPitch + sy, this.look.yaw + k.camYaw + sx, 0);
    const fov = THREE.MathUtils.lerp(C.fov, C.adsFov, this.ads);
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = this.vmCam.fov = fov; this.camera.updateProjectionMatrix(); this.vmCam.updateProjectionMatrix(); }

    if (this.opticMats.length) {
      const fade = 1 - this.ads * (1 - (this.prof.viewmodel.ads.opticOpacity ?? 0.3));
      for (const o of this.opticMats) { o.m.opacity = o.opacity * fade; o.m.transparent = o.transparent || this.ads > 0.02; }
    }

    // weapon in the view
    const vp = this.prof.viewmodel, hip = vp.position, ads = this.adsPos || hip;
    const hr = vp.rotation || [0, 0, 0], ar = (vp.ads && vp.ads.rotation) || hr, a = this.ads;
    const lerp = (x, y) => x + (y - x) * a;
    this.vm.position.set(
      lerp(hip[0], ads[0]) - k.side * 0.002,
      lerp(hip[1], ads[1]) - dip * 0.16 + k.x * R.kickUp * 0.0012,
      lerp(hip[2], ads[2]) + k.x * R.kickBack * (1 - 0.35 * a) + pump * 0.07);
    this.vm.rotation.set(
      (lerp(hr[0], ar[0]) + k.x * R.kickUp * (1 - 0.3 * a) - dipRot * 18) * DEG,
      (lerp(hr[1], ar[1]) + k.side * 0.6 + dipRot * 6) * DEG,
      (lerp(hr[2], ar[2]) + k.side * 0.8 + dipRot * 12) * DEG);

    // flash
    if (this.flash > 0) {
      this.flash -= dt;
      const u = clamp(this.flash / this.flashT, 0, 1), F2 = this.cfg.muzzleFlash;
      this.flashSprite.visible = this.flash > 0;
      this.flashSprite.scale.setScalar(F2.size * this.flashStrength * (0.7 + 0.5 * u));
      this.flashSprite.material.opacity = u;
      const li = F2.light.intensity * this.flashStrength * u;
      this.flashLightVm.intensity = li; this.flashLightMain.intensity = li;
      this.flashLightMain.position.copy(this.muzzleWorld());
    } else if (this.flashSprite.visible) {
      this.flashSprite.visible = false; this.flashLightVm.intensity = 0; this.flashLightMain.intensity = 0;
    }

    this.tryFire(now);
    this.camera.updateMatrixWorld(true);
    this.updatePlates(dt, now);
    this.stepBBs(dt);
    this.stepPuffs(dt);

    const r = this.renderer;
    r.clear();
    r.render(this.scene, this.camera);
    r.clearDepth();
    r.render(this.vmScene, this.vmCam);
  }

  stepBBs(dt) {
    const B = this.prof.bb, I = this.cfg.impact;
    const area = Math.PI * Math.pow(B.diameter_mm / 2000, 2), mass = B.mass_g / 1000;
    const kDrag = (0.5 * B.airDensity * B.dragCoefficient * area) / mass;
    const steps = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / steps;
    const camPos = this.camera.position;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), z = new THREE.Vector3(0, 0, 1);
    const d = B.diameter_mm / 1000 * B.visualScale;
    const targets = [this.rangeRoot, ...(this.plateMeshes || [])];
    const p0 = new THREE.Vector3(), dir = new THREE.Vector3(), nrm = new THREE.Vector3();
    let n = 0;
    for (let i = this.bbs.length - 1; i >= 0; i--) {
      const b = this.bbs[i];
      p0.copy(b.p);
      for (let s = 0; s < steps; s++) {
        const sp = b.v.length();
        // drag, gravity and the lift from the hop-up backspin
        b.v.multiplyScalar(Math.max(0, 1 - kDrag * sp * h));
        b.v.y -= B.gravity * h;
        if (B.hopUp > 0 && b.spin > 0.01) b.v.y += B.hopUp * b.spin * Math.min(1, sp / b.v0) * h;
        b.spin *= Math.exp(-B.spinDecay * h);
        b.p.addScaledVector(b.v, h);
      }
      b.age += dt;
      dir.copy(b.p).sub(p0);
      const len = dir.length();
      let hit = null;
      if (len > 1e-6) {
        dir.multiplyScalar(1 / len);
        this.ray.set(p0, dir); this.ray.far = len;
        hit = this.ray.intersectObjects(targets, true)[0] || null;
      }
      if (hit) {
        const plate = hit.object.userData.plate;
        const impact = b.v.length();
        nrm.set(0, 1, 0);
        if (hit.face) nrm.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
        if (nrm.dot(dir) > 0) nrm.negate();
        const dist = hit.point.distanceTo(camPos);
        const pan = clamp(new THREE.Vector3().subVectors(hit.point, camPos).dot(new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion)) / Math.max(dist, 1), -1, 1);
        if (plate) {
          this.hitPlate(plate, dir, impact);
          this.audio && this.audio.ping(this.cfg.sound.plateHit, pan, dist);
        } else if (impact > 4) {
          this.audio && this.audio.tick(this.cfg.sound.impactTick, pan, dist);
          if (b.bounces === 0) this.addDecal(hit.point, nrm);
        }
        if (impact > 4) this.addPuff(hit.point, nrm, impact);
        // bounce or stop
        const bn = I.bounce;
        if (bn.enabled && !plate && b.bounces < 4) {
          const vn = b.v.dot(nrm);
          const vt = b.v.clone().addScaledVector(nrm, -vn).multiplyScalar(1 - bn.friction * 0.5);
          b.v.copy(vt).addScaledVector(nrm, -vn * bn.restitution);
          b.p.copy(hit.point).addScaledVector(nrm, 0.003);
          b.spin = 0; b.bounces++;
          if (b.v.length() < bn.minSpeed) b.dead = true;
        } else b.dead = true;
      }
      if (b.dead || b.age > B.life || b.p.y < -1) { this.bbs.splice(i, 1); continue; }
    }
    for (const b of this.bbs) {
      const sp = b.v.length();
      dir.copy(b.v).multiplyScalar(1 / Math.max(sp, 1e-6));
      q.setFromUnitVectors(z, dir);
      const streak = Math.max(d, sp * dt * B.streak);
      sc.set(d, d, streak);
      m.compose(b.p, q, sc);
      this.bbMesh.setMatrixAt(n++, m);
    }
    this.bbMesh.count = n;
    this.bbMesh.instanceMatrix.needsUpdate = true;
  }

  addDecal(point, n) {
    if (!this.decals) return;
    const D = this.cfg.impact.decals, m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    const s = (D.diameter_mm / 1000) * rnd(0.8, 1.2);
    m.compose(point.clone().addScaledVector(n, 0.002), q, new THREE.Vector3(s, s, s));
    this.decals.setMatrixAt(this.decalIdx, m);
    this.decalIdx = (this.decalIdx + 1) % D.max;
    this.decals.instanceMatrix.needsUpdate = true;
  }

  addPuff(point, n, speed) {
    if (!this.puffs) return;
    const P = this.cfg.impact.puff, pos = this.puffs.geometry.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const j = this.puffIdx; this.puffIdx = (j + 1) % MAX_PUFF;
      const d = this.puffData[j];
      d.life = P.life * rnd(0.6, 1);
      d.v.set(rnd(), rnd(), rnd()).multiplyScalar(0.5).addScaledVector(n, rnd(0.4, 1.2) * Math.min(1, speed / 60));
      pos.setXYZ(j, point.x + n.x * 0.004, point.y + n.y * 0.004, point.z + n.z * 0.004);
    }
    pos.needsUpdate = true;
  }

  stepPuffs(dt) {
    if (!this.puffs) return;
    const pos = this.puffs.geometry.attributes.position;
    let dirty = false;
    for (let i = 0; i < MAX_PUFF; i++) {
      const d = this.puffData[i];
      if (d.life <= 0) continue;
      d.life -= dt;
      if (d.life <= 0) pos.setXYZ(i, 0, -999, 0);
      else pos.setXYZ(i, pos.getX(i) + d.v.x * dt, pos.getY(i) + d.v.y * dt, pos.getZ(i) + d.v.z * dt);
      dirty = true;
    }
    if (dirty) pos.needsUpdate = true;
  }

  /* ---------- steel plates ---------- */
  hitPlate(p, dir, speed) {
    if (!p.fallen) {
      p.fallen = true; p.target = 1.45; p.vel = 3;
      this.platesHit++;
      this.updateHud();
      const x = this.$("cross"); x.classList.remove("hit"); void x.offsetWidth; x.classList.add("hit");
    } else p.vel += 1.2 * Math.min(1, speed / 80);   // already down: just a wobble
  }

  resetPlate(p) { p.fallen = false; p.target = 0; p.vel = 0; p.angle = 0; p.hinge.rotation.x = 0; }

  updatePlates(dt, now) {
    if (!this.plates.length) return;
    let down = 0;
    for (const p of this.plates) {
      const goal = p.fallen ? p.target : 0;
      // critically-damped-ish swing towards the fallen / standing angle, with a little bounce
      p.vel += ((goal - p.angle) * 90 - p.vel * 9) * dt;
      p.angle += p.vel * dt;
      p.hinge.rotation.x = p.angle;   // falls backwards (away from the shooter)
      if (p.fallen) down++;
    }
    const all = down === this.plates.length;
    if (all && this.allDownAt == null) this.allDownAt = now;
    if (!all) this.allDownAt = null;
    if (all && now - this.allDownAt > this.cfg.plates.resetAfter) { this.plates.forEach((p) => this.resetPlate(p)); this.allDownAt = null; this.updateHud(); }
    this.plateGroup.updateMatrixWorld(true);
  }

  /* ---------- hud / size ---------- */
  updateHud() {
    const F = this.prof ? this.prof.fire : null;
    if (!F) return;
    const mag = F.magazine ? `${this.reloadT >= 0 ? "…" : this.ammo}<small> / ${F.magazine}</small>` : "∞";
    this.$("ammo").innerHTML = mag;
    this.$("mode").textContent = this.mode.toUpperCase();
    this.$("mode").title = this.modes.length > 1 ? "Fire mode (B)" : "";
    this.$("modebtn").hidden = this.modes.length < 2;
    this.$("shots").textContent = this.shots;
    this.$("plates").textContent = `${this.platesHit}`;
  }

  resize() {
    if (!this.renderer) return;
    const v = this.$("view"), w = v.clientWidth, h = v.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.cssText += "width:100%;height:100%;display:block";
    this.camera.aspect = this.vmCam.aspect = w / h;
    this.camera.updateProjectionMatrix(); this.vmCam.updateProjectionMatrix();
  }
}
