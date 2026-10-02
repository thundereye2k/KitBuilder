import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const DEG = Math.PI / 180;
const ACCENT = 0xe8a33d;

/* Which way a placeholder grows from its mount point (anchor origin). */
const GROW = {
  muzzle: [1, 0, 0], handguard: [1, 0, 0], slide: [1, 0, 0],
  stock: [-1, 0, 0],
  grip: [0, -1, 0], magazine: [0, -1, 0], underbarrel: [0, -1, 0],
  optic: [0, 1, 0], flashlight: [0, 1, 0], laser: [0, 1, 0]
};

const RIFLE_BODY = { recv: [0.136, 0.056, 0.04, -0.012, 0.012], barrel: [0.26, 0.007, 0.18, 0.0215] };
const SMG_BODY = { recv: [0.12, 0.056, 0.04, 0.0, 0.0], barrel: [0.2, 0.007, 0.14, 0.012] };
const BODY = {
  "assault-rifles": RIFLE_BODY, dmrs: RIFLE_BODY, "sniper-rifles": RIFLE_BODY, lmgs: RIFLE_BODY, shotguns: RIFLE_BODY,
  smgs: SMG_BODY,
  pistols: { recv: [0.264, 0.02, 0.03, -0.004, 0.006] }
};

export class Viewer {
  constructor(container, labelLayer) {
    this.container = container;
    this.labelLayer = labelLayer;
    // GLBs exported with Draco or meshopt compression are supported
    const draco = new DRACOLoader().setDecoderPath(new URL("./vendor/addons/libs/draco/gltf/", import.meta.url).href);
    this.loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
    this.cache = new Map();
    this.slots = {};          // slotId -> { def, anchor, marker, label, part }
    this.activeSlot = null;
    this.showLabels = false;
    this.hovered = null;
    this.onSlotClick = () => {};
    this.token = 0;

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(devicePixelRatio, matchMedia("(hover: none)").matches ? 1.75 : 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(0.6, 1, 0.8);
    this.scene.add(key);

    this.camera = new THREE.PerspectiveCamera(32, 2, 0.01, 20);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 0.25;
    this.controls.maxDistance = 3;

    const grid = new THREE.GridHelper(2, 40, 0x3a4350, 0x262c35);
    grid.position.y = -0.2;
    this.scene.add(grid);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.ray = new THREE.Raycaster();

    this.status = document.createElement("div");
    this.status.className = "viewer-status";
    container.appendChild(this.status);

    new ResizeObserver(() => this.resize()).observe(container);
    this.bindPointer();
    this.resize();
    r.setAnimationLoop(() => this.frame());
  }

  /* ---------- public API ---------- */
  async setWeapon(weapon) {
    const token = ++this.token;
    this.clear();
    this.weapon = weapon;
    this.status.textContent = "Loading…";
    this.status.style.display = "block";

    const body = new THREE.Group();
    this.root.add(body);
    this.body = body;

    let gltfRoot = null;
    if (weapon.model) {
      try { gltfRoot = (await this.load(weapon.model)).clone(true); }
      catch (e) { console.warn(`Weapon model failed: ${weapon.model}`, e); }
    }
    if (token !== this.token) return;
    if (gltfRoot) {
      // optional weapon-level fix-ups: scale, rot (deg), offset (m), hide (node names)
      const wrap = new THREE.Group();
      wrap.add(gltfRoot);
      if (weapon.scale) wrap.scale.setScalar(weapon.scale);
      if (weapon.rot) wrap.rotation.set(weapon.rot[0] * DEG, weapon.rot[1] * DEG, weapon.rot[2] * DEG);
      if (weapon.offset) wrap.position.fromArray(weapon.offset);
      (weapon.hide || []).forEach((name) => { const n = gltfRoot.getObjectByName(name); if (n) n.visible = false; });
      body.add(wrap);
    } else body.add(this.placeholderBody(weapon.category));
    body.updateMatrixWorld(true);

    weapon.slots.forEach((def) => {
      const a = def.anchor || { pos: [0, 0, 0], rot: [0, 0, 0], size: [0.05, 0.05, 0.05] };
      const anchor = new THREE.Group();
      body.add(anchor);
      // an anchor empty from the GLB wins over data.js (position + rotation only, so parts keep real-world scale)
      const node = gltfRoot && gltfRoot.getObjectByName(`slot_${def.id}`);
      if (node) {
        const m = new THREE.Matrix4().copy(body.matrixWorld).invert().multiply(node.matrixWorld);
        const s = new THREE.Vector3();
        m.decompose(anchor.position, anchor.quaternion, s);
      } else {
        anchor.position.fromArray(a.pos);
        anchor.rotation.set(a.rot[0] * DEG, a.rot[1] * DEG, a.rot[2] * DEG);
      }
      const marker = this.makeMarker(def.type, a.size);
      marker.userData.slotId = def.id;
      anchor.add(marker);

      const label = document.createElement("span");
      label.className = "slot-tag";
      label.textContent = def.name;
      this.labelLayer.appendChild(label);

      this.slots[def.id] = { def, anchor, marker, label, part: null, partObj: null };
    });

    this.fit();
    this.refreshMarkers();
    this.status.style.display = "none";
  }

  /** part: part definition or null. Resolves when the model (if any) is in the scene. */
  async setPart(slotId, part) {
    const s = this.slots[slotId];
    if (!s) return;
    const stamp = (s.stamp = (s.stamp || 0) + 1);
    s.part = part;
    if (s.partObj) { s.anchor.remove(s.partObj); s.partObj = null; }
    if (part) {
      let obj = null;
      if (part.model) {
        try {
          obj = (await this.load(part.model)).clone(true);
          const g = new THREE.Group();
          g.add(obj);
          if (part.scale) g.scale.setScalar(part.scale);
          if (part.rot) g.rotation.set(part.rot[0] * DEG, part.rot[1] * DEG, part.rot[2] * DEG);
          if (part.offset) g.position.fromArray(part.offset);
          obj = g;
        } catch (e) { console.warn(`Part model failed: ${part.model}`, e); obj = null; }
      }
      if (stamp !== s.stamp) return;
      if (!obj) {
        const size = [...(s.def.anchor.size)];
        if (part.size) { size[0] = part.size[0]; size[1] = part.size[1]; }
        obj = this.placeholder(s.def.type, size, part.color || "#52525b");
      }
      obj.traverse((o) => { if (o.isMesh) o.userData.slotId = slotId; });
      s.anchor.add(obj);
      s.partObj = obj;
    }
    this.refreshMarkers();
  }

  setActive(slotId) { this.activeSlot = slotId; this.refreshMarkers(); }
  setLabels(on) { this.showLabels = on; }
  resetView() { this.fit(); }

  /* ---------- internals ---------- */
  clear() {
    this.slots = {};
    this.labelLayer.innerHTML = "";
    while (this.root.children.length) this.root.remove(this.root.children[0]);
  }

  async load(url) {
    if (!this.cache.has(url)) this.cache.set(url, this.loader.loadAsync(url).then((g) => g.scene));
    return this.cache.get(url);
  }

  mat(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35, ...extra });
  }

  placeholderBody(cat) {
    const g = new THREE.Group();
    const spec = BODY[cat] || RIFLE_BODY;
    const m = this.mat("#2f3640");
    const [w, h, d, x, y] = spec.recv;
    const recv = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    recv.position.set(x, y, 0);
    g.add(recv);
    if (spec.barrel) {
      const [len, rad, bx, by] = spec.barrel;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 20), m);
      b.rotation.z = Math.PI / 2;
      b.position.set(bx, by, 0);
      g.add(b);
    }
    return g;
  }

  /** Placeholder part. Local origin = mount point, grows along GROW[type]. */
  placeholder(type, [sx, sy, sz], color) {
    const g = new THREE.Group();
    const m = this.mat(color);
    const dir = GROW[type] || [0, 1, 0];
    const c = new THREE.Vector3(dir[0] * sx / 2, dir[1] * sy / 2, 0);
    const add = (mesh, pos = c) => { mesh.position.copy(pos); g.add(mesh); return mesh; };
    const cylX = (len, rad) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 24), m);
      mesh.rotation.z = Math.PI / 2;
      return mesh;
    };
    switch (type) {
      case "muzzle": add(cylX(sx, Math.min(sy, sz) / 2)); break;
      case "flashlight": case "laser": add(cylX(sx, Math.min(sx, sy) * 0.4)); break;
      case "optic": {
        add(cylX(sx, sy * 0.3), new THREE.Vector3(0, sy * 0.7, 0));
        add(new THREE.Mesh(new THREE.BoxGeometry(sx * 0.4, sy * 0.4, sz * 0.5), m), new THREE.Vector3(0, sy * 0.2, 0));
        break;
      }
      case "grip": {
        const mesh = add(new THREE.Mesh(new THREE.BoxGeometry(sx * 0.7, sy, sz), m), new THREE.Vector3(0, 0, 0));
        mesh.geometry.translate(0, -sy / 2, 0);
        mesh.rotation.z = 0.28;
        break;
      }
      case "underbarrel": add(new THREE.Mesh(new THREE.CylinderGeometry(sx * 0.2, sx * 0.25, sy, 16), m)); break;
      default: add(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m));
    }
    return g;
  }

  makeMarker(type, [sx, sy, sz]) {
    const dir = GROW[type] || [0, 1, 0];
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthWrite: false }));
    mesh.position.set(dir[0] * sx / 2, dir[1] * sy / 2, 0);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 }));
    mesh.add(edges);
    mesh.userData.edges = edges;
    return mesh;
  }

  refreshMarkers() {
    for (const id in this.slots) {
      const s = this.slots[id];
      const active = id === this.activeSlot, hover = id === this.hovered, empty = !s.part;
      const fill = active ? 0.12 : hover ? 0.18 : 0;
      const line = active || hover ? 1 : empty ? 0.45 : 0;
      s.marker.material.opacity = fill;
      s.marker.userData.edges.material.opacity = line;
      s.label.classList.toggle("on", active);
    }
  }

  fit() {
    const box = new THREE.Box3().setFromObject(this.root);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const dist = (Math.max(size.x / this.camera.aspect, size.y) / 2 / Math.tan(this.camera.fov * DEG / 2)) * 1.25 + size.z;
    this.controls.target.copy(ctr);
    this.camera.position.set(ctr.x + dist * 0.25, ctr.y + dist * 0.18, ctr.z + dist);
    this.controls.update();
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    // layout changed a lot (rotation, breakpoint): reframe so the weapon is not cropped
    const reframe = this.lastAspect && Math.abs(aspect - this.lastAspect) / this.lastAspect > 0.15 && this.root.children.length;
    this.lastAspect = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    if (reframe) this.fit();
  }

  pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const hits = this.ray.intersectObjects(this.root.children, true);
    const hit = hits.find((h) => h.object.userData.slotId);
    return hit ? hit.object.userData.slotId : null;
  }

  bindPointer() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
    el.addEventListener("pointerup", (e) => {
      if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) {
        const id = this.pick(e);
        if (id) this.onSlotClick(id);
      }
      down = null;
    });
    el.addEventListener("pointermove", (e) => {
      if (e.buttons) return;
      const id = this.pick(e);
      if (id !== this.hovered) {
        this.hovered = id;
        el.style.cursor = id ? "pointer" : "grab";
        this.refreshMarkers();
      }
    });
  }

  frame() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const v = new THREE.Vector3();
    for (const id in this.slots) {
      const s = this.slots[id];
      s.anchor.getWorldPosition(v);
      // label sits at the middle of the slot marker
      s.marker.getWorldPosition(v);
      v.project(this.camera);
      const visible = v.z < 1 && (this.showLabels || id === this.activeSlot || id === this.hovered);
      s.label.style.opacity = visible ? 1 : 0;
      s.label.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -140%)`;
    }
  }
}
