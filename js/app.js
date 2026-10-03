import { Viewer } from "./viewer.js";

(() => {
  const D = window.KITBUILDER_DATA;

  // A bare file name ("red-dot.glb") resolves into the folder of its category / slot type.
  const inFolder = (base, folder, file) => (file && !file.includes("/") ? `${base}/${folder}/${file}` : file);
  D.weapons.forEach((w) => {
    const cat = D.categories.find((c) => c.id === w.category);
    w.model = inFolder("models/weapons", cat.folder, w.model);
  });
  D.parts.forEach((p) => { p.model = inFolder("models/parts", D.slotTypes[p.type].folder, p.model); });
  const $ = (id) => document.getElementById(id);

  const state = { category: D.categories[0].id, weaponId: null, parts: {}, shift: {}, slot: null, labels: false };

  const weapon = () => D.weapons.find((w) => w.id === state.weaponId);
  const partById = (id) => D.parts.find((p) => p.id === id);
  const fits = (p, w) => p.fits === "*" || p.fits.includes(w.id) || p.fits.includes(w.category);
  const partsFor = (w, slot) => D.parts.filter((p) => p.type === slot.type && fits(p, w));
  const money = (n) => "$" + n.toLocaleString("en-US");
  const sign = (n, d = 0) => (n > 0 ? "+" : "") + n.toFixed(d);

  /* ---------- state ---------- */
  function selectWeapon(id, parts, shifts) {
    const w = D.weapons.find((x) => x.id === id) || D.weapons[0];
    state.weaponId = w.id;
    state.category = w.category;
    state.parts = {};
    w.slots.forEach((s) => {
      const wanted = parts && s.id in parts ? parts[s.id] : s.default;
      const p = wanted && partById(wanted);
      state.parts[s.id] = p && p.type === s.type && fits(p, w) ? p.id : null;
    });
    state.shift = {};
    w.slots.forEach((s) => { if (s.rail && shifts && shifts[s.id]) state.shift[s.id] = shifts[s.id]; });
    state.slot = w.slots[0].id;
    render();
    loadWeapon3D();
  }

  // Parts are changed one at a time so a slow model download cannot overlap the next click.
  let queue = Promise.resolve();
  function setPart(slotId, partId) {
    queue = queue.then(() => applyPart(slotId, partId)).catch((e) => console.warn(e));
  }

  async function applyPart(slotId, partId) {
    const prev = state.parts[slotId] || null;
    const wasShift = { ...state.shift };
    state.parts[slotId] = partId;
    state.slot = slotId;
    render();
    await viewer.setPart(slotId, partId ? partById(partId) : null);
    const r = reflow();
    const noBlock = (weapon().slots.find((s) => s.id === slotId) || {}).noBlock;   // e.g. the barrel: never refused
    if (!r.ok && !noBlock) {
      // no room on the rail: put the previous part back
      state.parts[slotId] = prev;
      state.shift = wasShift;
      await viewer.setPart(slotId, prev ? partById(prev) : null);
      reflow();
      toast(`No room for ${partById(partId).name}: it would overlap another part or not fit the rail`);
    } else if (r.moved.length && !(weapon().slots.find((s) => s.id === slotId) || {}).rail) {
      toast(`${r.moved.join(", ")} moved to make room`);
    }
    render();
  }

  /* ---------- rail sliders ---------- */
  const MM = 0.001;

  /** Closest allowed shift to x. dir > 0 / < 0 means "keep moving that way past blocked zones". */
  function snap(info, x, dir) {
    const al = info.allowed;
    if (!al.length) return null;
    for (const [a, b] of al) if (x >= a - 1e-9 && x <= b + 1e-9) return Math.min(b, Math.max(a, x));
    if (dir > 0) { for (const [a] of al) if (a > x) return a; }
    if (dir < 0) { for (let i = al.length - 1; i >= 0; i--) if (al[i][1] < x) return al[i][1]; }
    let best = null, bd = Infinity;
    for (const [a, b] of al) for (const e of [a, b]) if (Math.abs(e - x) < bd) { bd = Math.abs(e - x); best = e; }
    return best;
  }

  /** Re-check every sliding part against the rail and its neighbours; nudge it if it no longer fits. */
  function reflow() {
    const moved = [];
    let ok = true;
    weapon().slots.filter((s) => s.rail).forEach((s) => {
      const info = viewer.railInfo(s.id);
      if (!info) { delete state.shift[s.id]; return; }
      const target = snap(info, state.shift[s.id] || 0, 0);
      if (target === null) { ok = false; return; }
      if (Math.abs(target - info.cur) > 0.5 * MM) {
        if (Math.abs(target - (state.shift[s.id] || 0)) > 1.5 * MM) moved.push(s.name);
        viewer.shiftSlot(s.id, target);
      }
      if (Math.abs(target) > 0.5 * MM) state.shift[s.id] = target; else delete state.shift[s.id];
    });
    return { ok, moved };
  }

  const rail = { slot: null, info: null };

  function renderRail() {
    const box = $("rail-ctl");
    const w = weapon();
    const slot = w.slots.find((s) => s.id === state.slot);
    const info = slot && slot.rail && state.parts[slot.id] ? viewer.railInfo(slot.id) : null;
    rail.slot = info ? slot : null;
    rail.info = info;
    box.hidden = !info;
    if (!info) return;

    const range = $("rail-range");
    const lo = Math.ceil(info.lo / MM - 1e-6), hi = Math.floor(info.hi / MM + 1e-6);
    range.min = lo;
    range.max = Math.max(lo, hi);
    range.value = Math.round(info.cur / MM);
    range.disabled = !info.allowed.length || info.allowed.every(([a, b]) => b - a < MM);
    // red stripes = where another attachment is in the way
    const span = Math.max(info.hi - info.lo, 1e-6);
    $("rail-blocked").innerHTML = info.blocked.map(([a, b, name]) => {
      const l = Math.max(0, (a - info.lo) / span), r = Math.min(1, (b - info.lo) / span);
      return r > l ? `<i style="left:${l * 100}%;width:${(r - l) * 100}%" title="${name}"></i>` : "";
    }).join("");
    const crowd = info.blocked.filter(([a, b]) => b > info.lo && a < info.hi).map((x) => x[2]);
    $("rail-note").textContent = range.disabled
      ? "This part fits in one spot only."
      : crowd.length ? `Red areas are blocked by: ${[...new Set(crowd)].join(", ")}.` : "Slides along the receiver and handguard rail.";
    updateRailLabel(info.cur);
  }

  function updateRailLabel(x) {
    const mm = Math.round(x / MM);
    $("rail-val").textContent = mm === 0 ? "Default" : `${mm > 0 ? "+" : ""}${mm} mm`;
  }

  function moveRail(x, dir) {
    if (!rail.info) return;
    const t = snap(rail.info, x, dir);
    if (t === null) return;
    $("rail-range").value = Math.round(t / MM);
    rail.info.cur = t;
    if (Math.abs(t) > 0.5 * MM) state.shift[rail.slot.id] = t; else delete state.shift[rail.slot.id];
    viewer.shiftSlot(rail.slot.id, t);
    updateRailLabel(t);
    writeHash();
  }

  $("rail-range").addEventListener("input", (e) => moveRail(e.target.value * MM, 0));
  $("rail-back").onclick = () => moveRail(rail.info.cur - 5 * MM, -1);
  $("rail-fwd").onclick = () => moveRail(rail.info.cur + 5 * MM, 1);
  $("rail-center").onclick = () => moveRail(0, 0);

  /* ---------- stats ---------- */
  function computeStats() {
    const w = weapon();
    const t = { ...w.base };
    const chosen = Object.values(state.parts).filter(Boolean).map(partById);
    chosen.forEach((p) => {
      t.ergo += p.ergo || 0;
      t.recoil += p.recoil || 0;
      t.weight += p.weight || 0;
      t.price += p.price || 0;
    });
    return t;
  }

  /* ---------- 3D board ---------- */
  const viewer = new Viewer($("viewport"), $("labels"));
  window.kitbuilderViewer = viewer; // handy for debugging in the console
  viewer.onSlotClick = (id) => { state.slot = id; render(); if (enlarged) setDrawer(true); };

  let loadSeq = 0;
  async function loadWeapon3D() {
    const seq = ++loadSeq, w = weapon();
    await viewer.setWeapon(w);
    if (seq !== loadSeq) return;
    await Promise.all(w.slots.map((s) => viewer.setPart(s.id, state.parts[s.id] ? partById(state.parts[s.id]) : null)));
    if (seq !== loadSeq) return;
    reflow();
    viewer.setActive(state.slot);
    renderRail();
    writeHash();
  }

  /* ---------- panels ---------- */
  function renderTop() {
    const nav = $("categories");
    nav.innerHTML = "";
    D.categories.forEach((c) => {
      const b = document.createElement("button");
      b.className = "tab" + (c.id === state.category ? " on" : "");
      b.textContent = c.name;
      b.onclick = () => {
        state.category = c.id;
        const first = D.weapons.find((w) => w.category === c.id);
        if (first) selectWeapon(first.id); else renderTop();
      };
      nav.appendChild(b);
    });

    const list = $("weapon-list");
    list.innerHTML = "";
    const inCat = D.weapons.filter((w) => w.category === state.category);
    if (!inCat.length) {
      const folder = D.categories.find((c) => c.id === state.category).folder;
      list.innerHTML = `<li class="empty">No weapons yet.<small>Add them in data/data.js and put models in models/weapons/${folder}/</small></li>`;
    }
    inCat.forEach((w) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.className = w.id === state.weaponId ? "on" : "";
      b.innerHTML = `${w.name}<small>${w.caliber}</small>`;
      b.onclick = () => selectWeapon(w.id);
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  function statCard(label, val, base, fmt, lowerIsBetter, barMax) {
    const d = val - base;
    const cls = d === 0 ? "" : (d < 0) === lowerIsBetter ? "good" : "bad";
    const pct = Math.max(0, Math.min(100, (val / barMax) * 100));
    return `<div class="stat"><div class="k">${label}</div>
      <div class="v">${fmt(val)}<span class="d ${cls}">${d === 0 ? "" : (d > 0 ? "+" : "") + fmt(d).replace(/^\$-/, "-$")}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }

  const showStats = () => D.categories.find((c) => c.id === weapon().category).showStats !== false;

  function renderStats() {
    $("stats").hidden = !showStats();
    if (!showStats()) return;
    const w = weapon(), t = computeStats(), b = w.base;
    $("stats").innerHTML =
      statCard("Ergonomics", t.ergo, b.ergo, (n) => n.toFixed(0), false, 100) +
      statCard("Recoil", t.recoil, b.recoil, (n) => n.toFixed(0), true, 400) +
      statCard("Weight kg", t.weight, b.weight, (n) => n.toFixed(2), true, 8) +
      statCard("Price", t.price, b.price, money, true, 6000);
  }

  function renderBuildList() {
    const w = weapon();
    $("build-list").innerHTML = w.slots.map((s) => {
      const p = state.parts[s.id] && partById(state.parts[s.id]);
      return `<div class="build-row" data-slot="${s.id}"><span class="t">${s.name}</span>
        <span class="n ${p ? "" : "none"}">${p ? p.name : "— empty —"}</span></div>`;
    }).join("");
    $("build-list").querySelectorAll(".build-row").forEach((r) => {
      r.onclick = () => { state.slot = r.dataset.slot; render(); };
    });
  }

  function modsHtml(p) {
    const bits = [];
    const add = (v, label, lowerBetter, digits = 0) => {
      if (!v) return;
      const good = (v < 0) === lowerBetter;
      bits.push(`<span class="${good ? "good" : "bad"}">${sign(v, digits)} ${label}</span>`);
    };
    add(p.ergo, "ERG", false);
    add(p.recoil, "REC", true);
    add(p.weight, "kg", true, 2);
    return bits.join(" · ") || "no modifiers";
  }

  function renderParts() {
    const w = weapon();
    const slot = w.slots.find((s) => s.id === state.slot) || w.slots[0];
    $("parts-title").textContent = slot.name;
    $("parts-title").title = `models/parts/${D.slotTypes[slot.type].folder}/`;

    const tabs = $("slot-tabs");
    tabs.innerHTML = "";
    w.slots.forEach((s) => {
      const c = document.createElement("button");
      c.className = "chip" + (s.id === slot.id ? " on" : "") + (state.parts[s.id] ? " filled" : "");
      c.textContent = s.name;
      c.onclick = () => { state.slot = s.id; render(); };
      tabs.appendChild(c);
    });

    const list = $("part-list");
    list.innerHTML = "";
    const addRow = (p) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      const on = (state.parts[slot.id] || null) === (p ? p.id : null);
      b.className = "part" + (on ? " on" : "");
      const thumb = p ? (p.thumb ? `<img src="${p.thumb}" alt="">` : `<span style="background:${p.color || "#52525b"}"></span>`) : "";
      b.innerHTML = `<div class="thumb">${thumb}</div>
        <div><div class="nm">${p ? p.name : "None"}</div><div class="mods">${p ? (showStats() ? modsHtml(p) : "") : "Leave slot empty"}</div></div>
        <div class="pr">${p && showStats() ? money(p.price || 0) : ""}</div>`;
      b.onclick = () => setPart(slot.id, p ? p.id : null);
      li.appendChild(b);
      list.appendChild(li);
    };
    addRow(null);
    const avail = partsFor(w, slot);
    avail.forEach(addRow);
    if (!avail.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.innerHTML = `No ${D.slotTypes[slot.type].name.toLowerCase()} parts for this weapon yet.<small>Models go in models/parts/${D.slotTypes[slot.type].folder}/</small>`;
      list.appendChild(li);
    }
  }

  function render() {
    const w = weapon();
    $("weapon-name").textContent = w.name;
    $("weapon-meta").textContent = `${w.caliber} · ${D.categories.find((c) => c.id === w.category).name.toUpperCase()}`;
    renderTop();
    viewer.setActive(state.slot);
    renderStats();
    renderBuildList();
    renderParts();
    renderRail();
    writeHash();
  }

  /* ---------- share / export ---------- */
  let lastHash = "";
  function writeHash() {
    const q = new URLSearchParams({ w: state.weaponId });
    for (const k in state.parts) q.set(k, state.parts[k] || "none");
    for (const k in state.shift) q.set("pos_" + k, Math.round(state.shift[k] / MM));
    lastHash = q.toString();
    history.replaceState(null, "", "#" + lastHash);
  }

  function readHash() {
    const q = new URLSearchParams(location.hash.slice(1));
    const id = q.get("w");
    if (!id || !D.weapons.some((w) => w.id === id)) return false;
    const parts = {}, shifts = {};
    q.forEach((v, k) => {
      if (k === "w") return;
      if (k.startsWith("pos_")) shifts[k.slice(4)] = (parseFloat(v) || 0) * MM;
      else parts[k] = v === "none" ? null : v;
    });
    selectWeapon(id, parts, shifts);
    return true;
  }

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove("show"), 1600);
  }

  $("btn-view").onclick = () => viewer.resetView();
  const setMode = (m) => {
    viewer.setMode(m);
    $("mode-rotate").classList.toggle("on", m === "rotate"); $("mode-rotate").setAttribute("aria-pressed", m === "rotate");
    $("mode-move").classList.toggle("on", m === "move");     $("mode-move").setAttribute("aria-pressed", m === "move");
  };
  $("mode-rotate").onclick = () => setMode("rotate");
  $("mode-move").onclick = () => setMode("move");
  $("btn-reset").onclick = () => selectWeapon(state.weaponId);
  const toggleLabels = () => {
    state.labels = !state.labels;
    ["btn-labels", "tool-labels"].forEach((id) => $(id).setAttribute("aria-pressed", state.labels));
    viewer.setLabels(state.labels);
  };
  $("btn-labels").onclick = toggleLabels;
  $("tool-labels").onclick = toggleLabels;
  $("tool-reset").onclick = () => viewer.resetView();

  /* ---------- enlarge / fullscreen ----------
   * The 3D view fills the whole window (works everywhere, including iPhones). Where the browser allows it,
   * the real Fullscreen API is used on top of that so the browser's own bars disappear as well. */
  const stage = document.querySelector(".stage");
  const reqFs = stage.requestFullscreen || stage.webkitRequestFullscreen;
  const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  let enlarged = false;

  /* While enlarged, the parts panel moves into the view and becomes a drawer:
   * slides up from the bottom on portrait screens (phones), in from the left otherwise (PC, landscape). */
  const partsEl = document.querySelector(".parts");
  let partsHome = null;
  function dockParts(on) {
    if (on && !partsHome) { partsHome = { parent: partsEl.parentNode, next: partsEl.nextSibling }; stage.appendChild(partsEl); }
    else if (!on && partsHome) { partsHome.parent.insertBefore(partsEl, partsHome.next); partsHome = null; }
  }
  function updateInset() {
    const open = enlarged && stage.classList.contains("drawer-open");
    const portrait = matchMedia("(orientation: portrait)").matches;
    viewer.setInset(open && !portrait ? partsEl.offsetWidth : 0, open && portrait ? partsEl.offsetHeight : 0);
    stage.style.setProperty("--sheet-h", open && portrait ? partsEl.offsetHeight + "px" : "0px");
  }
  function setDrawer(open) {
    stage.classList.toggle("drawer-open", open);
    $("tool-parts").setAttribute("aria-pressed", open);
    updateInset();
  }
  $("tool-parts").onclick = () => setDrawer(!stage.classList.contains("drawer-open"));
  new ResizeObserver(updateInset).observe(partsEl);   // drawer content changes size (e.g. the rail slider appears)
  window.addEventListener("resize", updateInset);
  async function setEnlarged(on) {
    enlarged = on;
    stage.classList.toggle("expanded", on);
    document.documentElement.classList.toggle("stage-open", on);
    $("btn-full").setAttribute("aria-pressed", on);
    $("btn-full").title = $("btn-full").ariaLabel = on ? "Exit fullscreen" : "Fullscreen";
    dockParts(on);
    if (!on) setDrawer(false);
    try {
      if (on && reqFs && !fsElement()) await reqFs.call(stage, { navigationUI: "hide" });
      else if (!on && fsElement() && exitFs) await exitFs.call(document);
    } catch (e) { /* the full-window view still works */ }
    viewer.resize();
  }
  $("btn-full").onclick = () => setEnlarged(!enlarged);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && enlarged) setEnlarged(false); });
  ["fullscreenchange", "webkitfullscreenchange"].forEach((ev) => document.addEventListener(ev, () => { if (enlarged && !fsElement()) setEnlarged(false); }));
  $("btn-share").onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); toast("Link copied"); }
    catch { toast("Copy the address bar URL"); }
  };
  $("btn-export").onclick = () => {
    const w = weapon(), t = computeStats();
    const out = {
      weapon: w.name, caliber: w.caliber, stats: t,
      parts: w.slots.map((s) => ({
        slot: s.name,
        part: state.parts[s.id] ? partById(state.parts[s.id]).name : null,
        ...(state.shift[s.id] ? { shiftMm: Math.round(state.shift[s.id] / MM) } : {})
      }))
    };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
    a.download = `${w.id}-build.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  window.addEventListener("hashchange", () => { if (location.hash.slice(1) !== lastHash) readHash(); });

  if (!readHash()) selectWeapon(D.weapons.find((w) => w.category === state.category).id);
})();
