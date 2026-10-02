/*
 * KitBuilder data. Edit this file to add weapons, slots and parts.
 *
 * 3D CONVENTIONS (glTF/GLB, units = metres, Y up)
 *   Weapon  : origin near the receiver, barrel pointing +X, top of weapon +Y, weapon's right side +Z.
 *   Part    : origin = its MOUNT POINT. It is placed at the slot anchor, so model each part
 *             with the mount point at (0,0,0) and the same axes as the weapon.
 *
 * CATEGORY (weapon class; also the folder under models/weapons/)
 *   id, name, folder, showStats (default true) -> false hides ergonomics/recoil/weight/price
 *
 * SLOT TYPE (part class; also the folder under models/parts/)
 *   slotTypes[id] = { name, folder }
 *
 * WEAPON
 *   id, name, category, caliber, base { ergo, recoil, weight, price }
 *   model  (optional) -> file name inside models/weapons/<category folder>/, e.g. "carbine.glb"
 *             (a value containing "/" is used as a path as-is)
 *             Anchors can live INSIDE the GLB as empty nodes named  slot_<slotId>  (e.g. slot_optic).
 *             A node found in the GLB wins over the `anchor` below.
 *   scale, rot [deg x3], offset [m x3], hide [node names]  (optional) -> fix size / direction / origin of the weapon GLB
 *   a slot may carry  rail: { min, max, extend? }  -> the part on it can be slid along X by the visitor.
 *             min/max = start/end of the rail (metres, weapon space); `extend: "handguard"` lets the rail grow
 *             to the end of the installed handguard. The part stays inside the rail, and never overlaps another
 *             installed attachment (its bounding box is used).
 *   slots[] -> { id, type, name, anchor: {pos:[x,y,z], rot:[deg,deg,deg], size:[x,y,z]}, default?: partId }
 *             `pos`/`rot` = fallback anchor; `size` = bounds used for the placeholder shape + click target.
 *
 * PART
 *   id, name, type (must equal a slot `type`), fits ("*" or list of weapon ids / category ids)
 *   ergo, recoil, weight (kg), price  -> deltas applied to the weapon base stats
 *   model  (optional) -> file name inside models/parts/<slot type folder>/, e.g. "red-dot.glb"
 *             (a value containing "/" is used as a path as-is)
 *   scale / rot / offset (optional) -> extra transform on the part model: scale number, rot [deg x3], offset [x,y,z] m
 *   size   (optional) -> [x, y] override of placeholder size
 *   color  (optional) -> placeholder colour when there is no model
 */
const RIFLES = ["assault-rifles", "dmrs", "sniper-rifles", "lmgs"];
const LONG   = [...RIFLES, "smgs", "shotguns"];

window.KITBUILDER_DATA = {
  // `folder` = sub-folder under models/weapons/
  categories: [
    { id: "assault-rifles", name: "Assault Rifles", folder: "assault-rifles", showStats: false },
    { id: "dmrs",           name: "DMRs",           folder: "dmrs",           showStats: false },
    { id: "smgs",           name: "SMGs",           folder: "smgs",           showStats: false },
    { id: "sniper-rifles",  name: "Sniper Rifles",  folder: "sniper-rifles",  showStats: false },
    { id: "pistols",        name: "Pistols",        folder: "pistols",        showStats: false },
    { id: "lmgs",           name: "LMGs",           folder: "lmgs",           showStats: false },
    { id: "shotguns",       name: "Shotguns",       folder: "shotguns",       showStats: false }
  ],

  // `folder` = sub-folder under models/parts/
  slotTypes: {
    muzzle:      { name: "Muzzle",      folder: "muzzle" },
    handguard:   { name: "Handguard",   folder: "handguard" },
    optic:       { name: "Optic",       folder: "optic" },
    stock:       { name: "Stock",       folder: "stock" },
    grip:        { name: "Pistol Grip", folder: "pistol-grip" },
    magazine:    { name: "Magazine",    folder: "magazine" },
    flashlight:  { name: "Flashlight",  folder: "flashlight" },
    laser:       { name: "Laser",       folder: "laser" },
    underbarrel: { name: "Underbarrel", folder: "underbarrel" },
    slide:       { name: "Slide",       folder: "slide" }
  },

  weapons: [
    {
      id: "carbine-556", model: "AR_15_receiver.glb", scale: 0.01, rot: [0, -90, 0], offset: [0.132, 0, 0], hide: ["Cube"], name: "Carbine 5.56", category: "assault-rifles", caliber: "5.56x45",
      base: { ergo: 45, recoil: 150, weight: 2.9, price: 900 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      anchor: { pos: [0.34, 0.006, 0], rot: [0, 0, 0], size: [0.088, 0.032, 0.04] }, default: "flash-hider" },
        { id: "handguard",type: "handguard", name: "Handguard",   anchor: { pos: [0.1, 0.006, 0], rot: [0, 0, 0], size: [0.24, 0.048, 0.06] }, default: "hg-polymer" },
        { id: "optic",    type: "optic",     name: "Optic",       anchor: { pos: [0, 0.03, 0], rot: [0, 0, 0], size: [0.152, 0.064, 0.045] }, rail: { min: -0.097, max: 0.1, extend: "handguard" } },
        { id: "flashlight", type: "flashlight",  name: "Flashlight", anchor: { pos: [0.2, 0.02, 0.03], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "laser", type: "laser",  name: "Laser", anchor: { pos: [0.2, 0.02, -0.03], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "underbarrel", type: "underbarrel", name: "Underbarrel", anchor: { pos: [0.2, -0.018, 0], rot: [0, 0, 0], size: [0.064, 0.08, 0.03] } },
        { id: "grip",     type: "grip",      name: "Pistol Grip", anchor: { pos: [-0.046, -0.045, 0], rot: [0, 0, 0], size: [0.064, 0.088, 0.04] }, default: "grip-a2" },
        { id: "magazine", type: "magazine",  name: "Magazine",    anchor: { pos: [0.035, -0.01, 0], rot: [0, 0, 0], size: [0.064, 0.112, 0.035] }, default: "mag-30" },
        { id: "stock",    type: "stock",     name: "Stock",       anchor: { pos: [-0.104, 0.002, 0], rot: [0, 0, 0], size: [0.216, 0.088, 0.05] }, default: "stock-fixed" }
      ]
    },
    {
      id: "dmr-762", model: "dmr-762.glb", name: "Marksman 7.62", category: "dmrs", caliber: "7.62x51",
      base: { ergo: 38, recoil: 260, weight: 4.3, price: 1800 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      anchor: { pos: [0.304, 0.024, 0], rot: [0, 0, 0], size: [0.08, 0.032, 0.04] }, default: "flash-hider" },
        { id: "handguard",type: "handguard", name: "Handguard",   anchor: { pos: [0.056, 0.016, 0], rot: [0, 0, 0], size: [0.248, 0.048, 0.06] }, default: "hg-polymer" },
        { id: "optic",    type: "optic",     name: "Optic",       anchor: { pos: [-0.012, 0.04, 0], rot: [0, 0, 0], size: [0.168, 0.0672, 0.045] }, rail: { min: -0.07, max: 0.056, extend: "handguard" } },
        { id: "flashlight", type: "flashlight",  name: "Flashlight", anchor: { pos: [0.212, 0.0352, 0.03], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "laser", type: "laser",  name: "Laser", anchor: { pos: [0.212, 0.0352, -0.03], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "underbarrel", type: "underbarrel", name: "Underbarrel", anchor: { pos: [0.16, -0.008, 0], rot: [0, 0, 0], size: [0.064, 0.08, 0.03] } },
        { id: "grip",     type: "grip",      name: "Pistol Grip", anchor: { pos: [-0.048, -0.012, 0], rot: [0, 0, 0], size: [0.064, 0.088, 0.04] }, default: "grip-a2" },
        { id: "magazine", type: "magazine",  name: "Magazine",    anchor: { pos: [0.02, -0.012, 0], rot: [0, 0, 0], size: [0.072, 0.104, 0.035] }, default: "mag-20-762" },
        { id: "stock",    type: "stock",     name: "Stock",       anchor: { pos: [-0.088, -0.008, 0], rot: [0, 0, 0], size: [0.224, 0.096, 0.05] }, default: "stock-fixed" }
      ]
    },
    {
      id: "smg-9", model: "smg-9.glb", name: "SMG 9mm", category: "smgs", caliber: "9x19",
      base: { ergo: 55, recoil: 110, weight: 2.4, price: 700 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      anchor: { pos: [0.24, 0.016, 0], rot: [0, 0, 0], size: [0.088, 0.032, 0.04] }, default: "flash-hider" },
        { id: "handguard",type: "handguard", name: "Handguard",   anchor: { pos: [0.048, 0.008, 0], rot: [0, 0, 0], size: [0.192, 0.048, 0.06] }, default: "hg-polymer" },
        { id: "optic",    type: "optic",     name: "Optic",       anchor: { pos: [-0.008, 0.032, 0], rot: [0, 0, 0], size: [0.144, 0.064, 0.045] }, rail: { min: -0.05, max: 0.048, extend: "handguard" } },
        { id: "flashlight", type: "flashlight",  name: "Flashlight", anchor: { pos: [0.18, 0.0272, 0.03], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "laser", type: "laser",  name: "Laser", anchor: { pos: [0.18, 0.0272, -0.03], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "underbarrel", type: "underbarrel", name: "Underbarrel", anchor: { pos: [0.128, -0.016, 0], rot: [0, 0, 0], size: [0.064, 0.08, 0.03] } },
        { id: "grip",     type: "grip",      name: "Pistol Grip", anchor: { pos: [-0.032, -0.02, 0], rot: [0, 0, 0], size: [0.064, 0.088, 0.04] }, default: "grip-a2" },
        { id: "magazine", type: "magazine",  name: "Magazine",    anchor: { pos: [0.036, -0.02, 0], rot: [0, 0, 0], size: [0.056, 0.112, 0.035] }, default: "mag-30-9" },
        { id: "stock",    type: "stock",     name: "Stock",       anchor: { pos: [-0.08, -0.008, 0], rot: [0, 0, 0], size: [0.2, 0.08, 0.05] }, default: "stock-collapsible" }
      ]
    },
    {
      id: "sniper-308", model: "sniper-308.glb", name: "Bolt Sniper .308", category: "sniper-rifles", caliber: "7.62x51",
      base: { ergo: 30, recoil: 220, weight: 5.2, price: 2600 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      anchor: { pos: [0.288, 0.024, 0], rot: [0, 0, 0], size: [0.088, 0.032, 0.04] }, default: "compensator" },
        { id: "handguard",type: "handguard", name: "Handguard",   anchor: { pos: [0.048, 0.016, 0], rot: [0, 0, 0], size: [0.24, 0.048, 0.06] }, default: "hg-polymer" },
        { id: "optic",    type: "optic",     name: "Optic",       anchor: { pos: [-0.02, 0.04, 0], rot: [0, 0, 0], size: [0.152, 0.064, 0.045] }, rail: { min: -0.07, max: 0.048, extend: "handguard" }, default: "scope-12" },
        { id: "flashlight", type: "flashlight",  name: "Flashlight", anchor: { pos: [0.196, 0.0352, 0.03], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "laser", type: "laser",  name: "Laser", anchor: { pos: [0.196, 0.0352, -0.03], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "underbarrel", type: "underbarrel", name: "Underbarrel", anchor: { pos: [0.144, -0.008, 0], rot: [0, 0, 0], size: [0.064, 0.08, 0.03] }, default: "bipod" },
        { id: "grip",     type: "grip",      name: "Pistol Grip", anchor: { pos: [-0.048, -0.012, 0], rot: [0, 0, 0], size: [0.064, 0.088, 0.04] }, default: "grip-a2" },
        { id: "magazine", type: "magazine",  name: "Magazine",    anchor: { pos: [0.016, -0.012, 0], rot: [0, 0, 0], size: [0.064, 0.112, 0.035] }, default: "mag-10-308" },
        { id: "stock",    type: "stock",     name: "Stock",       anchor: { pos: [-0.088, -0.004, 0], rot: [0, 0, 0], size: [0.216, 0.088, 0.05] }, default: "stock-fixed" }
      ]
    },
    {
      id: "pistol-9", model: "pistol-9.glb", name: "Service Pistol 9mm", category: "pistols", caliber: "9x19",
      base: { ergo: 60, recoil: 120, weight: 0.8, price: 450 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      anchor: { pos: [0.224, 0.04, 0], rot: [0, 0, 0], size: [0.08, 0.032, 0.04] } },
        { id: "slide",    type: "slide",     name: "Slide",       anchor: { pos: [-0.136, 0.044, 0], rot: [0, 0, 0], size: [0.36, 0.056, 0.03] }, default: "slide-std" },
        { id: "optic",    type: "optic",     name: "Optic",       anchor: { pos: [0.012, 0.068, 0], rot: [0, 0, 0], size: [0.12, 0.048, 0.045] }, rail: { min: -0.13, max: 0.22 } },
        { id: "flashlight", type: "flashlight",  name: "Flashlight", anchor: { pos: [0.152, -0.036, 0.03], rot: [0, 0, 0], size: [0.112, 0.048, 0.03] } },
        { id: "laser", type: "laser",  name: "Laser", anchor: { pos: [0.152, -0.036, -0.03], rot: [0, 0, 0], size: [0.112, 0.048, 0.03] } },
        { id: "grip",     type: "grip",      name: "Grip Frame",  anchor: { pos: [-0.08, 0.016, 0], rot: [0, 0, 0], size: [0.112, 0.12, 0.04] }, default: "grip-pistol" },
        { id: "magazine", type: "magazine",  name: "Magazine",    anchor: { pos: [-0.08, -0.04, 0], rot: [0, 0, 0], size: [0.08, 0.104, 0.035] }, default: "mag-15-9" }
      ]
    },
    {
      id: "lmg-556", model: "lmg-556.glb", name: "LMG 5.56", category: "lmgs", caliber: "5.56x45",
      base: { ergo: 25, recoil: 180, weight: 7.1, price: 3200 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      anchor: { pos: [0.288, 0.024, 0], rot: [0, 0, 0], size: [0.088, 0.032, 0.04] }, default: "flash-hider" },
        { id: "handguard",type: "handguard", name: "Handguard",   anchor: { pos: [0.048, 0.016, 0], rot: [0, 0, 0], size: [0.24, 0.048, 0.06] }, default: "hg-polymer" },
        { id: "optic",    type: "optic",     name: "Optic",       anchor: { pos: [-0.02, 0.04, 0], rot: [0, 0, 0], size: [0.152, 0.064, 0.045] }, rail: { min: -0.07, max: 0.048, extend: "handguard" } },
        { id: "flashlight", type: "flashlight",  name: "Flashlight", anchor: { pos: [0.196, 0.0352, 0.03], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "laser", type: "laser",  name: "Laser", anchor: { pos: [0.196, 0.0352, -0.03], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "underbarrel", type: "underbarrel", name: "Underbarrel", anchor: { pos: [0.144, -0.008, 0], rot: [0, 0, 0], size: [0.064, 0.08, 0.03] }, default: "bipod" },
        { id: "grip",     type: "grip",      name: "Pistol Grip", anchor: { pos: [-0.048, -0.012, 0], rot: [0, 0, 0], size: [0.064, 0.088, 0.04] }, default: "grip-a2" },
        { id: "magazine", type: "magazine",  name: "Magazine",    anchor: { pos: [0.016, -0.012, 0], rot: [0, 0, 0], size: [0.09, 0.12, 0.08] }, default: "belt-100" },
        { id: "stock",    type: "stock",     name: "Stock",       anchor: { pos: [-0.088, -0.004, 0], rot: [0, 0, 0], size: [0.216, 0.088, 0.05] }, default: "stock-fixed" }
      ]
    },
    {
      id: "shotgun-12", model: "shotgun-12.glb", name: "Pump Shotgun 12ga", category: "shotguns", caliber: "12 gauge",
      base: { ergo: 50, recoil: 300, weight: 3.4, price: 600 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      anchor: { pos: [0.288, 0.024, 0], rot: [0, 0, 0], size: [0.088, 0.032, 0.04] }, default: "flash-hider" },
        { id: "handguard",type: "handguard", name: "Handguard",   anchor: { pos: [0.048, 0.016, 0], rot: [0, 0, 0], size: [0.24, 0.048, 0.06] }, default: "hg-polymer" },
        { id: "optic",    type: "optic",     name: "Optic",       anchor: { pos: [-0.02, 0.04, 0], rot: [0, 0, 0], size: [0.152, 0.064, 0.045] }, rail: { min: -0.07, max: 0.048, extend: "handguard" } },
        { id: "flashlight", type: "flashlight",  name: "Flashlight", anchor: { pos: [0.196, 0.0352, 0.03], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "laser", type: "laser",  name: "Laser", anchor: { pos: [0.196, 0.0352, -0.03], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "underbarrel", type: "underbarrel", name: "Underbarrel", anchor: { pos: [0.144, -0.008, 0], rot: [0, 0, 0], size: [0.064, 0.08, 0.03] } },
        { id: "grip",     type: "grip",      name: "Pistol Grip", anchor: { pos: [-0.048, -0.012, 0], rot: [0, 0, 0], size: [0.064, 0.088, 0.04] }, default: "grip-a2" },
        { id: "magazine", type: "magazine",  name: "Magazine",    anchor: { pos: [0.016, -0.012, 0], rot: [0, 0, 0], size: [0.064, 0.112, 0.035] }, default: "tube-6" },
        { id: "stock",    type: "stock",     name: "Stock",       anchor: { pos: [-0.088, -0.004, 0], rot: [0, 0, 0], size: [0.216, 0.088, 0.05] }, default: "stock-fixed" }
      ]
    }
  ],

  parts: [
    /* ---- Muzzle ---- */
    { id: "flash-hider", model: "flash-hider.glb", name: "Flash Hider", type: "muzzle", fits: "*", ergo: -1, recoil: -4, weight: 0.10, price: 60, color: "#4b5563" },
    { id: "compensator", model: "compensator.glb", name: "Compensator", type: "muzzle", fits: "*", ergo: -2, recoil: -18, weight: 0.18, price: 140, color: "#374151" },
    { id: "suppressor", model: "suppressor.glb",  name: "Suppressor",  type: "muzzle", fits: "*", ergo: -6, recoil: -12, weight: 0.55, price: 650, color: "#1f2937", size: [0.136, 0.048] },

    /* ---- Handguard ---- */
    { id: "hg-polymer", model: "hg-polymer.glb", name: "Polymer Handguard", type: "handguard", fits: LONG, ergo: 0, recoil: 0, weight: 0.30, price: 50, color: "#3f3f46" },
    { id: "hg-mlok", model: "AR_15_mlok_handguard.glb", scale: 0.01, rot: [0, -90, 0], offset: [0.032, -0.006, 0],    name: "M-LOK Handguard",   type: "handguard", fits: LONG, ergo: 4, recoil: -3, weight: 0.42, price: 220, color: "#52525b" },
    { id: "hg-short", model: "hg-short.glb",   name: "Short Rail",        type: "handguard", fits: LONG, ergo: 6, recoil: 4, weight: 0.22, price: 160, color: "#52525b", size: [0.16, 0.0448] },

    /* ---- Optics ---- */
    { id: "red-dot", model: "red-dot.glb",  name: "Red Dot Sight",  type: "optic", fits: "*", ergo: -1, recoil: 0, weight: 0.15, price: 280, color: "#b45309" },
    { id: "holo", model: "eotech_hws_exps_3.glb", scale: 0.01, offset: [0, 0.0368, 0],     name: "Eotech EXPS 3",    type: "optic", fits: "*", ergo: -2, recoil: 0, weight: 0.32, price: 520, color: "#92400e" },
    { id: "lpvo", model: "lpvo.glb",     name: "1-6x LPVO",      type: "optic", fits: RIFLES, ergo: -6, recoil: 0, weight: 0.65, price: 1100, color: "#292524" },
    { id: "scope-12", model: "scope-12.glb", name: "3-12x Scope",    type: "optic", fits: ["dmr-762", "sniper-rifles"], ergo: -9, recoil: 0, weight: 0.85, price: 1500, color: "#1c1917" },

    /* ---- Stocks ---- */
    { id: "stock-fixed", model: "stock-fixed.glb",       name: "Fixed Stock",       type: "stock", fits: LONG, ergo: 0, recoil: 0, weight: 0.35, price: 60, color: "#3f3f46" },
    { id: "stock-collapsible", model: "stock-collapsible.glb", name: "Collapsible Stock", type: "stock", fits: LONG, ergo: 3, recoil: 6, weight: 0.28, price: 110, color: "#52525b" },
    { id: "stock-skeleton", model: "stock-skeleton.glb",    name: "Skeleton Stock",    type: "stock", fits: LONG, ergo: 6, recoil: 12, weight: 0.20, price: 190, color: "#6b7280" },
    { id: "stock-none", model: "stock-none.glb",        name: "Brace Delete",      type: "stock", fits: ["smgs"], ergo: 8, recoil: 40, weight: 0.0, price: 0, color: "#000000", size: [0.016, 0.032] },

    /* ---- Grips ---- */
    { id: "grip-a2", model: "grip-a2.glb",     name: "Standard Grip", type: "grip", fits: LONG, ergo: 0, recoil: 0, weight: 0.10, price: 20, color: "#3f3f46" },
    { id: "grip-ergo", model: "grip-ergo.glb",   name: "Ergo Grip",     type: "grip", fits: LONG, ergo: 4, recoil: -2, weight: 0.12, price: 45, color: "#52525b" },
    { id: "grip-pistol", model: "grip-pistol.glb", name: "Standard Frame", type: "grip", fits: ["pistols"], ergo: 0, recoil: 0, weight: 0.0, price: 0, color: "#3f3f46" },
    { id: "grip-stipple", model: "grip-stipple.glb", name: "Stippled Frame", type: "grip", fits: ["pistols"], ergo: 5, recoil: -4, weight: 0.0, price: 90, color: "#52525b" },

    /* ---- Magazines ---- */
    { id: "mag-30", model: "mag-30.glb",     name: "30rnd STANAG",    type: "magazine", fits: ["carbine-556"], ergo: 0, recoil: 0, weight: 0.45, price: 25, color: "#3f3f46" },
    { id: "mag-20", model: "mag-20.glb",     name: "20rnd Short",     type: "magazine", fits: ["carbine-556"], ergo: 3, recoil: 0, weight: 0.32, price: 22, color: "#52525b", size: [0.064, 0.08] },
    { id: "mag-40", model: "mag-40.glb",     name: "40rnd Extended",  type: "magazine", fits: ["carbine-556"], ergo: -5, recoil: 0, weight: 0.62, price: 70, color: "#27272a", size: [0.064, 0.14] },
    { id: "mag-20-762", model: "mag-20-762.glb", name: "20rnd 7.62",      type: "magazine", fits: ["dmr-762", "sniper-rifles"], ergo: 0, recoil: 0, weight: 0.65, price: 35, color: "#3f3f46" },
    { id: "mag-10-308", model: "mag-10-308.glb", name: "10rnd .308",         type: "magazine", fits: ["sniper-308"], ergo: 0, recoil: 0, weight: 0.45, price: 40, color: "#3f3f46" },
    { id: "belt-100", model: "belt-100.glb",   name: "100rnd Belt Box",    type: "magazine", fits: ["lmg-556"], ergo: -4, recoil: 0, weight: 1.9, price: 120, color: "#3f3f46" },
    { id: "tube-6", model: "tube-6.glb",     name: "6rnd Tube",          type: "magazine", fits: ["shotgun-12"], ergo: 0, recoil: 0, weight: 0.3, price: 20, color: "#3f3f46" },
    { id: "tube-8", model: "tube-8.glb",     name: "8rnd Extended Tube", type: "magazine", fits: ["shotgun-12"], ergo: -2, recoil: 0, weight: 0.45, price: 60, color: "#27272a" },
    { id: "mag-30-9", model: "mag-30-9.glb",   name: "30rnd 9mm",       type: "magazine", fits: ["smg-9"], ergo: 0, recoil: 0, weight: 0.45, price: 25, color: "#3f3f46" },
    { id: "mag-15-9", model: "mag-15-9.glb",   name: "15rnd 9mm",       type: "magazine", fits: ["pistol-9"], ergo: 0, recoil: 0, weight: 0.25, price: 25, color: "#3f3f46" },
    { id: "mag-21-9", model: "mag-21-9.glb",   name: "21rnd Extended",  type: "magazine", fits: ["pistol-9"], ergo: -3, recoil: 0, weight: 0.32, price: 45, color: "#27272a", size: [0.08, 0.136] },

    /* ---- Flashlight / Laser ---- */
    { id: "flashlight", model: "flashlight.glb", name: "Weapon Light", type: "flashlight", fits: "*", ergo: -1, recoil: 0, weight: 0.12, price: 160, color: "#ca8a04" },
    { id: "laser", model: "laser.glb",      name: "Red Laser",    type: "laser", fits: "*", ergo: -1, recoil: 0, weight: 0.08, price: 190, color: "#b91c1c" },

    /* ---- Underbarrel ---- */
    { id: "vfg", model: "vfg.glb",    name: "Vertical Foregrip", type: "underbarrel", fits: LONG, ergo: 5, recoil: -10, weight: 0.12, price: 40, color: "#3f3f46" },
    { id: "angled", model: "angled.glb", name: "Angled Foregrip",   type: "underbarrel", fits: LONG, ergo: 4, recoil: -7,  weight: 0.10, price: 55, color: "#52525b" },
    { id: "bipod", model: "bipod.glb",  name: "Bipod",             type: "underbarrel", fits: RIFLES, ergo: -4, recoil: -22, weight: 0.45, price: 210, color: "#292524" },

    /* ---- Pistol slide ---- */
    { id: "slide-std", model: "slide-std.glb",   name: "Standard Slide",   type: "slide", fits: ["pistols"], ergo: 0, recoil: 0, weight: 0.0, price: 0, color: "#3f3f46" },
    { id: "slide-ported", model: "slide-ported.glb", name: "Ported Slide",     type: "slide", fits: ["pistols"], ergo: 0, recoil: -8, weight: 0.0, price: 180, color: "#52525b" }
  ]
};
