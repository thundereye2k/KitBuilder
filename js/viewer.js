import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const DEG = Math.PI / 180;
const ACCENT = 0xe8a33d;
const OUTLINE_PX = 2.5; // thickness of the selection outline, in screen pixels

/* Looks for photo mode. bg: null = transparent (page colour), "#hex" = plain colour, "env" = the blurred environment photo.
 * light.az / el = where the key light is (degrees, az 0 = from the side the camera starts on), key / env = light and
 * ambient strength, warm = -1 (cool) .. 1 (warm), blur = background blur. */
export const LOOKS = {
  default:  { name: "Default",  bg: null,      env: "room",     grid: true,  shadow: false, light: { az: 37, el: 45, key: 1.6, env: 1,    exposure: 1, warm: 0,    blur: 0 } },
  studio:   { name: "Studio",   bg: "#f2f2f2", env: "room",     grid: false, shadow: true,  light: { az: 40, el: 55, key: 2.6, env: 1.15, exposure: 1, warm: 0,    blur: 0 } },
  forest:   { name: "Forest",   bg: "env",     env: "forest",   grid: false, shadow: true,  light: { az: 30, el: 50, key: 2.2, env: 1.2,  exposure: 1, warm: 0.15, blur: 0.05 } },
  sunset:   { name: "Sunset",   bg: "env",     env: "sunset",   grid: false, shadow: true,  light: { az: 60, el: 20, key: 2.8, env: 1,    exposure: 1, warm: 0.6,  blur: 0.06 } },
  workshop: { name: "Workshop", bg: "env",     env: "workshop", grid: false, shadow: true,  light: { az: 20, el: 60, key: 1.8, env: 1.1,  exposure: 1, warm: 0.1,  blur: 0.1 } },
  city:     { name: "City",     bg: "env",     env: "city",     grid: false, shadow: true,  light: { az: 50, el: 45, key: 2,   env: 1,    exposure: 1, warm: 0,    blur: 0.08 } }
};

/* Which way a placeholder grows from its mount point (anchor origin). */
const GROW = {
  barrel: [1, 0, 0], muzzle: [1, 0, 0], handguard: [1, 0, 0], slide: [1, 0, 0],
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


/* ---------- material clean-up ----------
 * Many downloaded models (e.g. Sketchfab exports) mark every material as alphaMode BLEND even when the
 * texture has no transparency. Blended materials do not write depth, so triangles are drawn in the wrong
 * order and the model flickers / shows inner parts through the outside ("glitching texture").
 * Fix: a BLEND material whose texture is fully opaque is made opaque - except on flat quads
 * (reticles, decals, glass), which are kept blended and drawn last.
 */
const opaqueCache = new WeakMap();
function textureIsOpaque(tex) {
  const img = tex && tex.image;
  if (!img) return false;
  if (opaqueCache.has(img)) return opaqueCache.get(img);
  let opaque = false;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 64, 64);
    const d = ctx.getImageData(0, 0, 64, 64).data;
    opaque = true;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { opaque = false; break; }
  } catch (e) { opaque = false; }
  opaqueCache.set(img, opaque);
  return opaque;
}

function isFlat(geometry) {
  geometry.computeBoundingBox();
  const s = geometry.boundingBox.getSize(new THREE.Vector3()).toArray().sort((a, b) => a - b);
  return s[2] > 0 && s[0] / s[2] < 0.03;
}

const outlineGeoCache = new WeakMap();
function outlineGeometry(src) {
  if (outlineGeoCache.has(src)) return outlineGeoCache.get(src);
  let g = new THREE.BufferGeometry();
  g.setAttribute("position", src.attributes.position);
  if (src.index) g.setIndex(src.index);
  g = mergeVertices(g, 1e-3);   // weld vertices that were split for hard edges / UVs
  g.computeVertexNormals();     // then smooth normals: the inflated copy stays closed
  outlineGeoCache.set(src, g);
  return g;
}

function fixBlendMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map((m) => {
      if (!m.transparent || m.opacity < 1 || m.alphaMap || !textureIsOpaque(m.map)) return m;
      const c = m.clone();
      if (isFlat(o.geometry)) { c.depthWrite = false; o.renderOrder = 1; }
      else { c.transparent = false; c.depthWrite = true; c.alphaTest = 0; }
      return c;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
}

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
    this.onEmptyClick = () => {};   // click on free space (nothing hit)
    this.token = 0;
    this.inset = { left: 0, bottom: 0, right: 0 };      // screen area covered by the parts drawer (px)
    this.insetCur = { left: 0, bottom: 0, right: 0 };
    this.outlineRes = new THREE.Vector2(1, 1); // CSS pixel size of the view, shared by all outline materials

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true }));
    r.setPixelRatio(Math.min(devicePixelRatio, matchMedia("(hover: none)").matches ? 1.75 : 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    this.pmrem = new THREE.PMREMGenerator(r);
    this.roomEnv = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.roomEnv;
    const key = (this.key = new THREE.DirectionalLight(0xffffff, 1.6));
    key.position.set(0.6, 1, 0.8);
    this.scene.add(key);
    this.scene.add(key.target);
    // shadows are only cast in photo looks (key.castShadow is switched by setLook)
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.002;
    key.shadow.radius = 3;
    this.light = { ...LOOKS.default.light };
    this.lookName = "default";
    this.photo = false;
    this.envCache = new Map();
    this.exr = new EXRLoader();
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.38 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.visible = false;
    this.scene.add(this.ground);

    this.camera = new THREE.PerspectiveCamera(32, 2, 0.01, 20);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true;
    // moving the view: right mouse button / Shift+left drag on PC, two-finger drag on touch screens
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.minDistance = 0.25;
    this.controls.maxDistance = 3;

    const grid = (this.grid = new THREE.GridHelper(2, 40, 0x3a4350, 0x262c35));
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
    } else body.add(this.placeholderBody(weapon.category, weapon.slots.some((s) => s.type === "barrel")));
    this.markShadows(body);
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

      this.slots[def.id] = { def, anchor, marker, label, part: null, partObj: null, baseX: anchor.position.x };
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
      this.markShadows(obj);
      s.anchor.add(obj);
      s.partObj = obj;
      this.addOutline(s);
    }
    this.applyFollowers();
    this.fitMarker(s);
    this.refreshMarkers();
  }

  /**
   * Slots with `follows` (the muzzle) move along X to the far end of another slot's part (the barrel),
   * or sit at their default position when that slot is empty.
   */
  applyFollowers() {
    this.body.updateMatrixWorld(true);
    for (const id in this.slots) {
      const s = this.slots[id], f = s.def.follows;
      if (!f) continue;
      const src = this.slots[f.slot];
      s.anchor.position.x = src && src.partObj ? new THREE.Box3().setFromObject(src.partObj).max.x + (f.offset || 0) : s.baseX;
    }
  }


  /**
   * Selection outline that follows the part's real shape: every mesh gets a copy drawn "inside out" and
   * pushed outwards by a few screen pixels. It only shows where it sticks out past the part itself.
   */
  addOutline(s) {
    if (!s.outlineMat) {
      s.outlineMat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(ACCENT) }, uOpacity: { value: 0 }, uPx: { value: OUTLINE_PX }, uRes: { value: this.outlineRes } },
        vertexShader: `
          uniform vec2 uRes; uniform float uPx;
          void main() {
            vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vec3 n = normalize(normalMatrix * normal);
            vec2 dir = (projectionMatrix * vec4(n, 0.0)).xy;
            dir = length(dir) > 1e-5 ? normalize(dir) : vec2(0.0);
            clip.xy += dir * uPx * 2.0 / uRes * clip.w;
            gl_Position = clip;
          }`,
        fragmentShader: `uniform vec3 uColor; uniform float uOpacity; void main() { gl_FragColor = vec4(uColor, uOpacity); }`,
        side: THREE.BackSide, transparent: true, depthWrite: false,
        // only draw where the part itself did not (see mask meshes below): a clean outer silhouette, no inner lines
        stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc,
        stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp
      });
      s.maskMat = new THREE.MeshBasicMaterial({
        colorWrite: false, depthWrite: false,
        stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc,
        stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.ReplaceStencilOp
      });
    }
    const meshes = [];
    s.partObj.traverse((o) => { if (o.isMesh && o.visible && !o.material.transparent) meshes.push(o); });
    for (const m of meshes) {
      const ol = new THREE.Mesh(outlineGeometry(m.geometry), s.outlineMat);
      ol.raycast = () => {};
      ol.renderOrder = 2;
      ol.visible = false;
      ol.userData.isOutline = true;
      m.add(ol);
      const mask = new THREE.Mesh(m.geometry, s.maskMat);   // marks the part's own pixels in the stencil buffer
      mask.raycast = () => {};
      mask.renderOrder = 1;
      mask.visible = false;
      mask.userData.isOutline = true;
      m.add(mask);
    }
  }

  setOutline(s, on) {
    s.outlineMat.uniforms.uOpacity.value = on ? 1 : 0;
    s.partObj.traverse((o) => { if (o.userData.isOutline) o.visible = on; });
  }

  /** Bounding box of an object in the local space of `anchor` (not axis-aligned in the world if the anchor is rotated). */
  localBounds(obj, anchor) {
    this.body.updateMatrixWorld(true);
    const inv = anchor.matrixWorld.clone().invert();
    const box = new THREE.Box3();
    obj.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      o.geometry.computeBoundingBox();
      box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld.clone().premultiply(inv)));
    });
    return box.isEmpty() ? null : box;
  }

  /** Outline box: the slot's default zone while empty, the part's own bounding box once something is installed. */
  fitMarker(s) {
    const m = s.marker, d = m.userData.defaultBox;
    let size = d.size, center = d.center;
    const b = s.partObj && this.localBounds(s.partObj, s.anchor);
    if (b) {
      size = b.getSize(new THREE.Vector3()).addScalar(0.002); // 1 mm of breathing room per side
      center = b.getCenter(new THREE.Vector3());
    }
    m.geometry.dispose();
    m.geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    m.position.copy(center);
    const edges = m.userData.edges;
    edges.geometry.dispose();
    edges.geometry = new THREE.EdgesGeometry(m.geometry);
    // with a part installed the outline follows the part itself, so the box is no longer clickable
    m.raycast = s.partObj ? () => {} : THREE.Mesh.prototype.raycast;
  }


  /* ---------- sliding along a rail ----------
   * All numbers are "shifts" in metres relative to the slot's default position along X. */
  shiftSlot(slotId, dx) {
    const s = this.slots[slotId];
    if (s) s.anchor.position.x = s.baseX + dx;
  }

  /**
   * Where may the part in `slotId` sit? Bounded by the rail (receiver + installed handguard) and by every
   * other installed attachment whose bounding box would overlap it. Returns null if the slot has no rail
   * or no part. `allowed` is a list of [from, to] shift ranges (empty when there is no room at all).
   */
  railInfo(slotId) {
    const s = this.slots[slotId];
    const rail = s && s.def.rail;
    if (!rail || !s.partObj) return null;
    this.body.updateMatrixWorld(true);
    const box = (o) => new THREE.Box3().setFromObject(o);
    const A = box(s.partObj);
    const mx = s.anchor.position.x, base = s.baseX;
    const relMin = A.min.x - mx, relMax = A.max.x - mx;

    let railMax = rail.max;
    const ext = rail.extend && this.slots[rail.extend];
    if (ext && ext.partObj) railMax = Math.max(railMax, box(ext.partObj).max.x);
    const lo = rail.min - relMin - base, hi = railMax - relMax - base;

    const EPS = 0.001; // 1 mm: touching is fine, overlapping is not
    const blocked = [];
    for (const id in this.slots) {
      if (id === slotId || id === rail.extend) continue;
      const o = this.slots[id];
      if (!o.partObj || o.def.noBlock) continue;   // noBlock slots (the barrel) never get in the way
      const B = box(o.partObj);
      const overlapYZ = A.min.y < B.max.y - EPS && A.max.y > B.min.y + EPS && A.min.z < B.max.z - EPS && A.max.z > B.min.z + EPS;
      if (overlapYZ) blocked.push([B.min.x - relMax - base, B.max.x - relMin - base, o.def.name]);
    }
    blocked.sort((a, b) => a[0] - b[0]);

    let allowed = hi >= lo ? [[lo, hi]] : [];
    for (const [a, b] of blocked) {
      allowed = allowed.flatMap(([x, y]) => {
        if (b <= x || a >= y) return [[x, y]];
        const out = [];
        if (a > x) out.push([x, a]);
        if (b < y) out.push([b, y]);
        return out;
      });
    }
    return { lo, hi, cur: mx - base, blocked, allowed };
  }

  setActive(slotId) { this.activeSlot = slotId; this.refreshMarkers(); }
  setLabels(on) { this.showLabels = on; }
  resetView() { this.fit(); }


  /* ---------- photo mode: looks, light, saving ---------- */
  markShadows(obj) {
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  async loadEnv(name) {
    if (!this.envCache.has(name)) {
      const url = new URL(`../assets/env/${name}.exr`, import.meta.url).href;
      this.envCache.set(name, this.exr.loadAsync(url).then((tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        return { env: this.pmrem.fromEquirectangular(tex).texture, bg: tex };
      }));
    }
    return this.envCache.get(name);
  }

  /** Switch the environment. Resolves with the look's default light settings (null if superseded by a newer call). */
  async setLook(name) {
    const look = LOOKS[name] || LOOKS.default;
    const token = (this.lookToken = (this.lookToken || 0) + 1);
    let envTex = this.roomEnv, bgTex = null;
    if (look.env !== "room") {
      this.status.textContent = "Loading…";
      this.status.style.display = "block";
      try { const e = await this.loadEnv(look.env); envTex = e.env; bgTex = e.bg; }
      catch (err) { console.warn(`Environment failed: ${look.env}`, err); }
      this.status.style.display = "none";
      if (token !== this.lookToken) return null;
    }
    this.lookName = name;
    this.scene.environment = envTex;
    this.scene.background = look.bg === "env" ? bgTex : look.bg ? new THREE.Color(look.bg) : null;
    this.grid.visible = look.grid;
    this.ground.visible = look.shadow;
    this.key.castShadow = look.shadow;
    this.light = { ...look.light };
    this.applyLight();
    return { ...this.light };
  }

  /** Change any of az, el (key light direction, degrees), key, env, exposure, warm, blur. */
  setLight(partial) {
    Object.assign(this.light, partial);
    this.applyLight();
  }

  applyLight() {
    const L = this.light, a = L.az * DEG, e = L.el * DEG;
    let ctr = new THREE.Vector3(), rad = 0.5, minY = -0.2;
    if (this.body) {
      this.body.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(this.body);
      if (!box.isEmpty()) { ctr = box.getCenter(new THREE.Vector3()); rad = box.getBoundingSphere(new THREE.Sphere()).radius; minY = box.min.y; }
    }
    const dist = 2;
    this.key.position.set(ctr.x + dist * Math.sin(a) * Math.cos(e), ctr.y + dist * Math.sin(e), ctr.z + dist * Math.cos(a) * Math.cos(e));
    this.key.target.position.copy(ctr);
    this.key.target.updateMatrixWorld();
    const cam = this.key.shadow.camera, r = rad * 1.15;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.near = dist - r * 1.3; cam.far = dist + r * 1.3;
    cam.updateProjectionMatrix();
    this.key.intensity = L.key;
    const c = new THREE.Color(0xffffff);
    c.lerp(new THREE.Color(L.warm >= 0 ? 0xffc48f : 0xb9d4ff), Math.abs(L.warm));
    this.key.color.copy(c);
    this.scene.environmentIntensity = L.env;
    this.scene.backgroundBlurriness = L.blur;
    this.renderer.toneMappingExposure = L.exposure;
    this.ground.position.y = minY - 0.02;
  }

  /** Photo mode hides every selection aid (outlines, hint boxes, labels) and ignores clicks on parts. */
  setPhoto(on) {
    this.photo = on;
    this.refreshMarkers();
  }

  /** PNG of the current view; scale > 1 renders at higher resolution (capped at 4096 px on the long side). */
  savePhoto(scale = 1) {
    const r = this.renderer, w = this.container.clientWidth, h = this.container.clientHeight, pr = r.getPixelRatio();
    const k = Math.min(scale, 4096 / (Math.max(w, h) * pr));
    return new Promise((resolve) => {
      r.setPixelRatio(pr * k);
      r.setSize(w, h, false);
      r.render(this.scene, this.camera);
      r.domElement.toBlob((blob) => { r.setPixelRatio(pr); r.setSize(w, h, false); resolve(blob); }, "image/png");
    });
  }

  /** Keep the weapon centred in the part of the view that is not covered by the parts drawer. */
  setInset(left, bottom, right = 0) { this.inset = { left, bottom, right }; }

  applyInset(force) {
    const c = this.insetCur, t = this.inset;
    const step = (a, b) => (Math.abs(b - a) < 0.5 ? b : a + (b - a) * 0.25);   // glide instead of jumping
    const left = step(c.left, t.left), bottom = step(c.bottom, t.bottom), right = step(c.right, t.right);
    if (!force && left === c.left && bottom === c.bottom && right === c.right) return;
    c.left = left; c.bottom = bottom; c.right = right;
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.zoom = (w - left - right) / w;   // a side drawer also makes the weapon a bit smaller so it still fits
    if (left < 0.5 && bottom < 0.5 && right < 0.5) { this.camera.zoom = 1; this.camera.clearViewOffset(); }
    else this.camera.setViewOffset(w, h, (right - left) / 2, bottom / 2, w, h);
  }

  /* ---------- internals ---------- */
  clear() {
    this.slots = {};
    this.labelLayer.innerHTML = "";
    while (this.root.children.length) this.root.remove(this.root.children[0]);
  }

  async load(url) {
    if (!this.cache.has(url)) this.cache.set(url, this.loader.loadAsync(url).then((g) => { fixBlendMaterials(g.scene); return g.scene; }));
    return this.cache.get(url);
  }

  mat(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35, ...extra });
  }

  placeholderBody(cat, skipBarrel) {
    const g = new THREE.Group();
    const spec = BODY[cat] || RIFLE_BODY;
    const m = this.mat("#2f3640");
    const [w, h, d, x, y] = spec.recv;
    const recv = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    recv.position.set(x, y, 0);
    g.add(recv);
    if (spec.barrel && !skipBarrel) {   // weapons with a barrel slot get their barrel from the installed part
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
      case "barrel": add(cylX(sx, sy / 2)); break;
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
    mesh.userData.defaultBox = { size: new THREE.Vector3(sx, sy, sz), center: mesh.position.clone() };
    return mesh;
  }

  refreshMarkers() {
    const activeId = this.photo ? null : this.activeSlot, hoverId = this.photo ? null : this.hovered;
    const clean = activeId == null;   // nothing selected: hide the hint boxes of empty slots too
    for (const id in this.slots) {
      const s = this.slots[id];
      const active = id === activeId, hover = id === hoverId, empty = !s.part;
      const filled = !!s.partObj;
      const fill = filled ? 0 : active ? 0.12 : hover ? 0.18 : 0;
      const line = filled ? 0 : active || hover ? 1 : clean ? 0 : 0.45;
      s.marker.material.opacity = fill;
      s.marker.userData.edges.material.opacity = line;
      // invisible boxes must not catch clicks (a click on free space has to reach "deselect")
      s.marker.raycast = filled || (clean && !hover) ? () => {} : THREE.Mesh.prototype.raycast;
      if (filled && s.outlineMat) this.setOutline(s, active || hover);
      s.label.classList.toggle("on", active);
    }
  }

  fit() {
    const box = new THREE.Box3().setFromObject(this.root);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const dist = (Math.max(size.x / this.camera.aspect, size.y) / 2 / Math.tan(this.camera.fov * DEG / 2)) * 1.25 + size.z;
    this.panBox = box.clone().expandByScalar(0.3);   // the view can be moved this far from the weapon, no further
    this.controls.target.copy(ctr);
    this.camera.position.set(ctr.x + dist * 0.25, ctr.y + dist * 0.18, ctr.z + dist);
    this.controls.update();
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.outlineRes.set(w, h);
    const aspect = w / h;
    // layout changed a lot (rotation, breakpoint): reframe so the weapon is not cropped
    const reframe = this.lastAspect && Math.abs(aspect - this.lastAspect) / this.lastAspect > 0.15 && this.root.children.length;
    this.lastAspect = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.applyInset(true);
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
    let down = null, multi = false;
    const pointers = new Set();
    el.addEventListener("pointerdown", (e) => {
      pointers.add(e.pointerId);
      if (pointers.size > 1) multi = true;            // pinch / two-finger move is never a click
      down = e.button === 0 ? [e.clientX, e.clientY] : null;   // right / middle button only move the view
    });
    const end = (e) => { pointers.delete(e.pointerId); if (!pointers.size) multi = false; };
    el.addEventListener("pointercancel", end);
    el.addEventListener("pointerup", (e) => {
      if (down && !multi && !this.photo && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) {
        const id = this.pick(e);
        if (id) this.onSlotClick(id); else this.onEmptyClick();
      }
      down = null;
      end(e);
    });
    el.addEventListener("pointermove", (e) => {
      if (e.buttons || this.photo) return;
      const id = this.pick(e);
      if (id !== this.hovered) {
        this.hovered = id;
        el.style.cursor = id ? "pointer" : "grab";
        this.refreshMarkers();
      }
    });
  }

  frame() {
    this.applyInset(false);
    this.controls.update();
    if (this.panBox) {   // keep the point we look at near the weapon so it cannot be lost off screen
      const t = this.controls.target, c = t.clone().clamp(this.panBox.min, this.panBox.max);
      if (!c.equals(t)) { c.sub(t); this.controls.target.add(c); this.camera.position.add(c); }
    }
    this.renderer.render(this.scene, this.camera);
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const v = new THREE.Vector3();
    for (const id in this.slots) {
      const s = this.slots[id];
      s.anchor.getWorldPosition(v);
      // label sits at the middle of the slot marker
      s.marker.getWorldPosition(v);
      v.project(this.camera);
      const visible = !this.photo && v.z < 1 && (this.showLabels || id === this.activeSlot || id === this.hovered);
      s.label.style.opacity = visible ? 1 : 0;
      s.label.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -140%)`;
    }
  }
}
