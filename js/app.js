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

  const state = { category: D.categories[0].id, weaponId: null, parts: {}, slot: null, labels: false };

  const weapon = () => D.weapons.find((w) => w.id === state.weaponId);
  const partById = (id) => D.parts.find((p) => p.id === id);
  const fits = (p, w) => p.fits === "*" || p.fits.includes(w.id) || p.fits.includes(w.category);
  const partsFor = (w, slot) => D.parts.filter((p) => p.type === slot.type && fits(p, w));
  const money = (n) => "$" + n.toLocaleString("en-US");
  const sign = (n, d = 0) => (n > 0 ? "+" : "") + n.toFixed(d);

  /* ---------- state ---------- */
  function selectWeapon(id, parts) {
    const w = D.weapons.find((x) => x.id === id) || D.weapons[0];
    state.weaponId = w.id;
    state.category = w.category;
    state.parts = {};
    w.slots.forEach((s) => {
      const wanted = parts && s.id in parts ? parts[s.id] : s.default;
      const p = wanted && partById(wanted);
      state.parts[s.id] = p && p.type === s.type && fits(p, w) ? p.id : null;
    });
    state.slot = w.slots[0].id;
    render();
    loadWeapon3D();
  }

  function setPart(slotId, partId) {
    state.parts[slotId] = partId;
    state.slot = slotId;
    render();
    viewer.setPart(slotId, partId ? partById(partId) : null);
  }

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
  viewer.onSlotClick = (id) => { state.slot = id; render(); };

  let loadSeq = 0;
  async function loadWeapon3D() {
    const seq = ++loadSeq, w = weapon();
    await viewer.setWeapon(w);
    if (seq !== loadSeq) return;
    await Promise.all(w.slots.map((s) => viewer.setPart(s.id, state.parts[s.id] ? partById(state.parts[s.id]) : null)));
    viewer.setActive(state.slot);
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
    writeHash();
  }

  /* ---------- share / export ---------- */
  function writeHash() {
    const q = new URLSearchParams({ w: state.weaponId });
    for (const k in state.parts) q.set(k, state.parts[k] || "none");
    history.replaceState(null, "", "#" + q.toString());
  }

  function readHash() {
    const q = new URLSearchParams(location.hash.slice(1));
    const id = q.get("w");
    if (!id || !D.weapons.some((w) => w.id === id)) return false;
    const parts = {};
    q.forEach((v, k) => { if (k !== "w") parts[k] = v === "none" ? null : v; });
    selectWeapon(id, parts);
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
  $("btn-reset").onclick = () => selectWeapon(state.weaponId);
  $("btn-labels").onclick = (e) => {
    state.labels = !state.labels;
    e.currentTarget.setAttribute("aria-pressed", state.labels);
    viewer.setLabels(state.labels);
  };
  $("btn-share").onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); toast("Link copied"); }
    catch { toast("Copy the address bar URL"); }
  };
  $("btn-export").onclick = () => {
    const w = weapon(), t = computeStats();
    const out = {
      weapon: w.name, caliber: w.caliber, stats: t,
      parts: w.slots.map((s) => ({ slot: s.name, part: state.parts[s.id] ? partById(state.parts[s.id]).name : null }))
    };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
    a.download = `${w.id}-build.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  window.addEventListener("hashchange", () => {
    if (location.hash.slice(1) !== new URLSearchParams(Object.assign({ w: state.weaponId }, Object.fromEntries(Object.entries(state.parts).map(([k, v]) => [k, v || "none"])))).toString()) readHash();
  });

  if (!readHash()) selectWeapon(D.weapons.find((w) => w.category === state.category).id);
})();
