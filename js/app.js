(() => {
  const D = window.KITBUILDER_DATA;
  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";

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
  }

  function setPart(slotId, partId) {
    state.parts[slotId] = partId;
    state.slot = slotId;
    render();
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

  /* ---------- placeholder art ---------- */
  function el(name, attrs = {}, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function drawBody(g, w) {
    const c = w.category;
    const fill = "#2b313a", stroke = "#4a5360";
    const shapes = {
      rifle:  [[400, 150, 170, 70, 6], [560, 166, 330, 14, 3], [400, 140, 170, 14, 2]],
      smg:    [[420, 160, 150, 70, 6], [560, 176, 250, 14, 3], [420, 150, 150, 14, 2]],
      pistol: [[330, 180, 330, 24, 4]]
    }[c] || [];
    shapes.forEach(([x, y, ww, h, r]) => el("rect", { x, y, width: ww, height: h, rx: r, fill, stroke, "stroke-width": 2 }, g));
  }

  function drawPlaceholder(g, type, b, color, name) {
    const { x, y, w, h } = b;
    const f = { fill: color, stroke: "#0008", "stroke-width": 1.5 };
    switch (type) {
      case "optic":
        el("rect", { x: x + w * .2, y: y + h * .6, width: w * .6, height: h * .4, rx: 3, ...f }, g);
        el("rect", { x, y, width: w, height: h * .65, rx: h * .3, ...f }, g);
        el("circle", { cx: x + w - h * .3, cy: y + h * .32, r: h * .2, fill: "#0a0c0f" }, g);
        break;
      case "stock":
        el("path", { d: `M${x + w} ${y} L${x + w} ${y + h * .55} L${x + w * .25} ${y + h} L${x} ${y + h} L${x} ${y + h * .1} L${x + w * .3} ${y + h * .1} Z`, ...f }, g);
        break;
      case "grip":
        el("path", { d: `M${x + w * .2} ${y} L${x + w} ${y} L${x + w * .75} ${y + h} L${x} ${y + h} Z`, ...f }, g);
        break;
      case "magazine":
        el("path", { d: `M${x} ${y} L${x + w} ${y} L${x + w * .9} ${y + h} L${x - w * .1} ${y + h} Z`, ...f }, g);
        break;
      case "handguard":
      case "slide":
        el("rect", { x, y, width: w, height: h, rx: 6, ...f }, g);
        for (let i = 0; i < 5; i++) el("rect", { x: x + w * (.12 + i * .17), y: y + h * .35, width: w * .1, height: h * .3, rx: 3, fill: "#0006" }, g);
        break;
      case "muzzle":
        el("rect", { x, y: y + h * .15, width: w, height: h * .7, rx: 4, ...f }, g);
        for (let i = 1; i < 4; i++) el("line", { x1: x + w * i / 4, x2: x + w * i / 4, y1: y + h * .15, y2: y + h * .85, stroke: "#0008", "stroke-width": 2 }, g);
        break;
      case "underbarrel":
        el("rect", { x: x + w * .35, y, width: w * .3, height: h, rx: 6, ...f }, g);
        break;
      default: // tactical and anything else
        el("rect", { x, y, width: w, height: h, rx: h * .3, ...f }, g);
        el("circle", { cx: x + w - h * .3, cy: y + h / 2, r: h * .22, fill: "#fff6", stroke: "none" }, g);
    }
    const t = el("text", { x: x + w / 2, y: y + h / 2 + 4, "text-anchor": "middle", class: "ph-label" }, g);
    if (w >= 120) t.textContent = name;
  }

  /* ---------- board ---------- */
  function renderBoard() {
    const w = weapon();
    const svg = $("board");
    svg.innerHTML = "";
    svg.classList.toggle("labels", state.labels);
    const art = el("g", {}, svg);

    if (w.image) el("image", { href: w.image, x: 0, y: 0, width: 1000, height: 400, preserveAspectRatio: "xMidYMid meet" }, art);
    else drawBody(art, w);

    // parts first, then hit areas on top so slots stay clickable
    w.slots.forEach((s) => {
      const p = state.parts[s.id] && partById(state.parts[s.id]);
      if (!p) return;
      const b = p.box || s.box;
      const g = el("g", {}, art);
      if (p.image) el("image", { href: p.image, x: b.x, y: b.y, width: b.w, height: b.h, preserveAspectRatio: "xMidYMid meet" }, g);
      else drawPlaceholder(g, s.type, b, p.color || "#52525b", p.name);
    });

    w.slots.forEach((s) => {
      const filled = !!state.parts[s.id];
      const g = el("g", { class: `slot ${filled ? "" : "empty"} ${state.slot === s.id ? "active" : ""}`, tabindex: 0, role: "button", "aria-label": s.name }, svg);
      const b = s.box;
      el("rect", { class: "slot-hit", x: b.x, y: b.y, width: b.w, height: b.h, rx: 6 }, g);
      const t = el("text", { class: "slot-label", x: b.x + b.w / 2, y: Math.max(14, b.y - 6), "text-anchor": "middle" }, g);
      t.textContent = s.name;
      const pick = () => { state.slot = s.id; render(); };
      g.addEventListener("click", pick);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    });
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
        if (first) selectWeapon(first.id);
      };
      nav.appendChild(b);
    });

    const list = $("weapon-list");
    list.innerHTML = "";
    D.weapons.filter((w) => w.category === state.category).forEach((w) => {
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

  function renderStats() {
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
      const thumb = p ? (p.image ? `<img src="${p.image}" alt="">` : `<span style="background:${p.color || "#52525b"}"></span>`) : "";
      b.innerHTML = `<div class="thumb">${thumb}</div>
        <div><div class="nm">${p ? p.name : "None"}</div><div class="mods">${p ? modsHtml(p) : "Leave slot empty"}</div></div>
        <div class="pr">${p ? money(p.price || 0) : ""}</div>`;
      b.onclick = () => setPart(slot.id, p ? p.id : null);
      li.appendChild(b);
      list.appendChild(li);
    };
    addRow(null);
    partsFor(w, slot).forEach(addRow);
  }

  function render() {
    const w = weapon();
    $("weapon-name").textContent = w.name;
    $("weapon-meta").textContent = `${w.caliber} · ${D.categories.find((c) => c.id === w.category).name.toUpperCase()}`;
    renderTop();
    renderBoard();
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

  $("btn-reset").onclick = () => selectWeapon(state.weaponId);
  $("btn-labels").onclick = (e) => {
    state.labels = !state.labels;
    e.currentTarget.setAttribute("aria-pressed", state.labels);
    renderBoard();
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
