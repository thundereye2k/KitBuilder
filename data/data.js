/*
 * KitBuilder data. Edit this file to add weapons, slots and parts.
 *
 * 3D CONVENTIONS (glTF/GLB, units = metres, Y up)
 *   Weapon  : origin near the receiver, barrel pointing +X, top of weapon +Y, weapon's right side +Z.
 *   Part    : origin = its MOUNT POINT. It is placed at the slot anchor, so model each part
 *             with the mount point at (0,0,0) and the same axes as the weapon.
 *
 * CATEGORY
 *   id, name, showStats (default true) -> set false to hide ergonomics/recoil/weight/price for that category
 *
 * WEAPON
 *   id, name, category, caliber, base { ergo, recoil, weight, price }
 *   model  (optional) -> models/weapons/<file>.glb
 *             Anchors can live INSIDE the GLB as empty nodes named  slot_<slotId>  (e.g. slot_optic).
 *             A node found in the GLB wins over the `anchor` below.
 *   slots[] -> { id, type, name, anchor: {pos:[x,y,z], rot:[deg,deg,deg], size:[x,y,z]}, default?: partId }
 *             `pos`/`rot` = fallback anchor; `size` = bounds used for the placeholder shape + click target.
 *
 * PART
 *   id, name, type (must equal a slot `type`), fits ("*" or list of weapon ids / category ids)
 *   ergo, recoil, weight (kg), price  -> deltas applied to the weapon base stats
 *   model  (optional) -> models/parts/<file>.glb
 *   scale / rot / offset (optional) -> extra transform on the part model: scale number, rot [deg x3], offset [x,y,z] m
 *   size   (optional) -> [x, y] override of placeholder size
 *   color  (optional) -> placeholder colour when there is no model
 */
window.KITBUILDER_DATA = {
  categories: [
    { id: "rifle",  name: "Rifles",  showStats: false },
    { id: "smg",    name: "SMGs",    showStats: false },
    { id: "pistol", name: "Pistols", showStats: false }
  ],

  slotTypes: {
    muzzle:      "Muzzle Device",
    handguard:   "Handguard",
    optic:       "Optic",
    stock:       "Stock",
    grip:        "Pistol Grip",
    magazine:    "Magazine",
    tactical:    "Light / Laser",
    underbarrel: "Underbarrel",
    slide:       "Slide / Sights"
  },

  weapons: [
    {
      id: "carbine-556", name: "Carbine 5.56", category: "rifle", caliber: "5.56x45",
      base: { ergo: 45, recoil: 150, weight: 2.9, price: 900 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      anchor: { pos: [0.288, 0.024, 0], rot: [0, 0, 0], size: [0.088, 0.032, 0.04] }, default: "flash-hider" },
        { id: "handguard",type: "handguard", name: "Handguard",   anchor: { pos: [0.048, 0.016, 0], rot: [0, 0, 0], size: [0.24, 0.048, 0.06] }, default: "hg-polymer" },
        { id: "optic",    type: "optic",     name: "Optic",       anchor: { pos: [-0.02, 0.04, 0], rot: [0, 0, 0], size: [0.152, 0.064, 0.045] } },
        { id: "tactical", type: "tactical",  name: "Light/Laser", anchor: { pos: [0.196, 0.0352, 0], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "under",    type: "underbarrel", name: "Underbarrel", anchor: { pos: [0.144, -0.008, 0], rot: [0, 0, 0], size: [0.064, 0.08, 0.03] } },
        { id: "grip",     type: "grip",      name: "Pistol Grip", anchor: { pos: [-0.048, -0.012, 0], rot: [0, 0, 0], size: [0.064, 0.088, 0.04] }, default: "grip-a2" },
        { id: "magazine", type: "magazine",  name: "Magazine",    anchor: { pos: [0.016, -0.012, 0], rot: [0, 0, 0], size: [0.064, 0.112, 0.035] }, default: "mag-30" },
        { id: "stock",    type: "stock",     name: "Stock",       anchor: { pos: [-0.088, -0.004, 0], rot: [0, 0, 0], size: [0.216, 0.088, 0.05] }, default: "stock-fixed" }
      ]
    },
    {
      id: "dmr-762", name: "Marksman 7.62", category: "rifle", caliber: "7.62x51",
      base: { ergo: 38, recoil: 260, weight: 4.3, price: 1800 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      anchor: { pos: [0.304, 0.024, 0], rot: [0, 0, 0], size: [0.08, 0.032, 0.04] }, default: "flash-hider" },
        { id: "handguard",type: "handguard", name: "Handguard",   anchor: { pos: [0.056, 0.016, 0], rot: [0, 0, 0], size: [0.248, 0.048, 0.06] }, default: "hg-polymer" },
        { id: "optic",    type: "optic",     name: "Optic",       anchor: { pos: [-0.012, 0.04, 0], rot: [0, 0, 0], size: [0.168, 0.0672, 0.045] } },
        { id: "tactical", type: "tactical",  name: "Light/Laser", anchor: { pos: [0.212, 0.0352, 0], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "under",    type: "underbarrel", name: "Underbarrel", anchor: { pos: [0.16, -0.008, 0], rot: [0, 0, 0], size: [0.064, 0.08, 0.03] } },
        { id: "grip",     type: "grip",      name: "Pistol Grip", anchor: { pos: [-0.048, -0.012, 0], rot: [0, 0, 0], size: [0.064, 0.088, 0.04] }, default: "grip-a2" },
        { id: "magazine", type: "magazine",  name: "Magazine",    anchor: { pos: [0.02, -0.012, 0], rot: [0, 0, 0], size: [0.072, 0.104, 0.035] }, default: "mag-20-762" },
        { id: "stock",    type: "stock",     name: "Stock",       anchor: { pos: [-0.088, -0.008, 0], rot: [0, 0, 0], size: [0.224, 0.096, 0.05] }, default: "stock-fixed" }
      ]
    },
    {
      id: "smg-9", name: "SMG 9mm", category: "smg", caliber: "9x19",
      base: { ergo: 55, recoil: 110, weight: 2.4, price: 700 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      anchor: { pos: [0.24, 0.016, 0], rot: [0, 0, 0], size: [0.088, 0.032, 0.04] }, default: "flash-hider" },
        { id: "handguard",type: "handguard", name: "Handguard",   anchor: { pos: [0.048, 0.008, 0], rot: [0, 0, 0], size: [0.192, 0.048, 0.06] }, default: "hg-polymer" },
        { id: "optic",    type: "optic",     name: "Optic",       anchor: { pos: [-0.008, 0.032, 0], rot: [0, 0, 0], size: [0.144, 0.064, 0.045] } },
        { id: "tactical", type: "tactical",  name: "Light/Laser", anchor: { pos: [0.18, 0.0272, 0], rot: [0, 0, 0], size: [0.072, 0.0288, 0.03] } },
        { id: "under",    type: "underbarrel", name: "Underbarrel", anchor: { pos: [0.128, -0.016, 0], rot: [0, 0, 0], size: [0.064, 0.08, 0.03] } },
        { id: "grip",     type: "grip",      name: "Pistol Grip", anchor: { pos: [-0.032, -0.02, 0], rot: [0, 0, 0], size: [0.064, 0.088, 0.04] }, default: "grip-a2" },
        { id: "magazine", type: "magazine",  name: "Magazine",    anchor: { pos: [0.036, -0.02, 0], rot: [0, 0, 0], size: [0.056, 0.112, 0.035] }, default: "mag-30-9" },
        { id: "stock",    type: "stock",     name: "Stock",       anchor: { pos: [-0.08, -0.008, 0], rot: [0, 0, 0], size: [0.2, 0.08, 0.05] }, default: "stock-collapsible" }
      ]
    },
    {
      id: "pistol-9", name: "Service Pistol 9mm", category: "pistol", caliber: "9x19",
      base: { ergo: 60, recoil: 120, weight: 0.8, price: 450 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      anchor: { pos: [0.224, 0.04, 0], rot: [0, 0, 0], size: [0.08, 0.032, 0.04] } },
        { id: "slide",    type: "slide",     name: "Slide",       anchor: { pos: [-0.136, 0.044, 0], rot: [0, 0, 0], size: [0.36, 0.056, 0.03] }, default: "slide-std" },
        { id: "optic",    type: "optic",     name: "Optic",       anchor: { pos: [0.012, 0.068, 0], rot: [0, 0, 0], size: [0.12, 0.048, 0.045] } },
        { id: "tactical", type: "tactical",  name: "Light/Laser", anchor: { pos: [0.152, -0.036, 0], rot: [0, 0, 0], size: [0.112, 0.048, 0.03] } },
        { id: "grip",     type: "grip",      name: "Grip Frame",  anchor: { pos: [-0.08, 0.016, 0], rot: [0, 0, 0], size: [0.112, 0.12, 0.04] }, default: "grip-pistol" },
        { id: "magazine", type: "magazine",  name: "Magazine",    anchor: { pos: [-0.08, -0.04, 0], rot: [0, 0, 0], size: [0.08, 0.104, 0.035] }, default: "mag-15-9" }
      ]
    }
  ],

  parts: [
    /* ---- Muzzle ---- */
    { id: "flash-hider", name: "Flash Hider", type: "muzzle", fits: "*", ergo: -1, recoil: -4, weight: 0.10, price: 60, color: "#4b5563" },
    { id: "compensator", name: "Compensator", type: "muzzle", fits: "*", ergo: -2, recoil: -18, weight: 0.18, price: 140, color: "#374151" },
    { id: "suppressor",  name: "Suppressor",  type: "muzzle", fits: "*", ergo: -6, recoil: -12, weight: 0.55, price: 650, color: "#1f2937", size: [0.136, 0.048] },

    /* ---- Handguard ---- */
    { id: "hg-polymer", name: "Polymer Handguard", type: "handguard", fits: ["rifle", "smg"], ergo: 0, recoil: 0, weight: 0.30, price: 50, color: "#3f3f46" },
    { id: "hg-mlok",    name: "M-LOK Handguard",   type: "handguard", fits: ["rifle", "smg"], ergo: 4, recoil: -3, weight: 0.42, price: 220, color: "#52525b" },
    { id: "hg-short",   name: "Short Rail",        type: "handguard", fits: ["rifle", "smg"], ergo: 6, recoil: 4, weight: 0.22, price: 160, color: "#52525b", size: [0.16, 0.0448] },

    /* ---- Optics ---- */
    { id: "red-dot",  name: "Red Dot Sight",  type: "optic", fits: "*", ergo: -1, recoil: 0, weight: 0.15, price: 280, color: "#b45309" },
    { id: "holo",     name: "Holographic",    type: "optic", fits: "*", ergo: -2, recoil: 0, weight: 0.32, price: 520, color: "#92400e" },
    { id: "lpvo",     name: "1-6x LPVO",      type: "optic", fits: ["rifle"], ergo: -6, recoil: 0, weight: 0.65, price: 1100, color: "#292524" },
    { id: "scope-12", name: "3-12x Scope",    type: "optic", fits: ["dmr-762"], ergo: -9, recoil: 0, weight: 0.85, price: 1500, color: "#1c1917" },

    /* ---- Stocks ---- */
    { id: "stock-fixed",       name: "Fixed Stock",       type: "stock", fits: ["rifle"], ergo: 0, recoil: 0, weight: 0.35, price: 60, color: "#3f3f46" },
    { id: "stock-collapsible", name: "Collapsible Stock", type: "stock", fits: ["rifle", "smg"], ergo: 3, recoil: 6, weight: 0.28, price: 110, color: "#52525b" },
    { id: "stock-skeleton",    name: "Skeleton Stock",    type: "stock", fits: ["rifle", "smg"], ergo: 6, recoil: 12, weight: 0.20, price: 190, color: "#6b7280" },
    { id: "stock-none",        name: "Brace Delete",      type: "stock", fits: ["smg"], ergo: 8, recoil: 40, weight: 0.0, price: 0, color: "#000000", size: [0.016, 0.032] },

    /* ---- Grips ---- */
    { id: "grip-a2",     name: "Standard Grip", type: "grip", fits: ["rifle", "smg"], ergo: 0, recoil: 0, weight: 0.10, price: 20, color: "#3f3f46" },
    { id: "grip-ergo",   name: "Ergo Grip",     type: "grip", fits: ["rifle", "smg"], ergo: 4, recoil: -2, weight: 0.12, price: 45, color: "#52525b" },
    { id: "grip-pistol", name: "Standard Frame", type: "grip", fits: ["pistol"], ergo: 0, recoil: 0, weight: 0.0, price: 0, color: "#3f3f46" },
    { id: "grip-stipple",name: "Stippled Frame", type: "grip", fits: ["pistol"], ergo: 5, recoil: -4, weight: 0.0, price: 90, color: "#52525b" },

    /* ---- Magazines ---- */
    { id: "mag-30",     name: "30rnd STANAG",    type: "magazine", fits: ["carbine-556"], ergo: 0, recoil: 0, weight: 0.45, price: 25, color: "#3f3f46" },
    { id: "mag-20",     name: "20rnd Short",     type: "magazine", fits: ["carbine-556"], ergo: 3, recoil: 0, weight: 0.32, price: 22, color: "#52525b", size: [0.064, 0.08] },
    { id: "mag-40",     name: "40rnd Extended",  type: "magazine", fits: ["carbine-556"], ergo: -5, recoil: 0, weight: 0.62, price: 70, color: "#27272a", size: [0.064, 0.14] },
    { id: "mag-20-762", name: "20rnd 7.62",      type: "magazine", fits: ["dmr-762"], ergo: 0, recoil: 0, weight: 0.65, price: 35, color: "#3f3f46" },
    { id: "mag-30-9",   name: "30rnd 9mm",       type: "magazine", fits: ["smg-9"], ergo: 0, recoil: 0, weight: 0.45, price: 25, color: "#3f3f46" },
    { id: "mag-15-9",   name: "15rnd 9mm",       type: "magazine", fits: ["pistol-9"], ergo: 0, recoil: 0, weight: 0.25, price: 25, color: "#3f3f46" },
    { id: "mag-21-9",   name: "21rnd Extended",  type: "magazine", fits: ["pistol-9"], ergo: -3, recoil: 0, weight: 0.32, price: 45, color: "#27272a", size: [0.08, 0.136] },

    /* ---- Light / Laser ---- */
    { id: "flashlight", name: "Weapon Light", type: "tactical", fits: "*", ergo: -1, recoil: 0, weight: 0.12, price: 160, color: "#ca8a04" },
    { id: "laser",      name: "Red Laser",    type: "tactical", fits: "*", ergo: -1, recoil: 0, weight: 0.08, price: 190, color: "#b91c1c" },
    { id: "combo",      name: "Light + Laser", type: "tactical", fits: "*", ergo: -2, recoil: 0, weight: 0.20, price: 340, color: "#7c2d12" },

    /* ---- Underbarrel ---- */
    { id: "vfg",    name: "Vertical Foregrip", type: "underbarrel", fits: ["rifle", "smg"], ergo: 5, recoil: -10, weight: 0.12, price: 40, color: "#3f3f46" },
    { id: "angled", name: "Angled Foregrip",   type: "underbarrel", fits: ["rifle", "smg"], ergo: 4, recoil: -7,  weight: 0.10, price: 55, color: "#52525b" },
    { id: "bipod",  name: "Bipod",             type: "underbarrel", fits: ["rifle"], ergo: -4, recoil: -22, weight: 0.45, price: 210, color: "#292524" },

    /* ---- Pistol slide ---- */
    { id: "slide-std",   name: "Standard Slide",   type: "slide", fits: ["pistol"], ergo: 0, recoil: 0, weight: 0.0, price: 0, color: "#3f3f46" },
    { id: "slide-ported",name: "Ported Slide",     type: "slide", fits: ["pistol"], ergo: 0, recoil: -8, weight: 0.0, price: 180, color: "#52525b" }
  ]
};
