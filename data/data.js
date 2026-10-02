/*
 * KitBuilder data. Edit this file to add weapons, slots and parts.
 *
 * Canvas: every weapon is drawn on a 1000 x 400 board.
 *
 * WEAPON
 *   id, name, category, caliber, base { ergo, recoil, weight, price }
 *   image  (optional) -> models/weapons/<file>.png|svg|webp, drawn full-board
 *   slots[] -> { id, type, name, box: {x, y, w, h}, default?: partId, required?: bool }
 *              `box` is where the chosen part is drawn on the board.
 *
 * PART
 *   id, name, type (must equal a slot `type`), fits ("*" or list of weapon ids / category ids)
 *   ergo, recoil, weight (kg), price  -> deltas applied to the weapon base stats
 *   image  (optional) -> models/parts/<file>.png|svg|webp, fitted into the slot box
 *   box    (optional) -> per-part override of the slot box (useful for longer/shorter parts)
 *   color  (optional) -> placeholder colour when there is no image
 */
window.KITBUILDER_DATA = {
  categories: [
    { id: "rifle",  name: "Rifles" },
    { id: "smg",    name: "SMGs" },
    { id: "pistol", name: "Pistols" }
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
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      box: { x: 860, y: 150, w: 110, h: 40 }, default: "flash-hider" },
        { id: "handguard",type: "handguard", name: "Handguard",   box: { x: 560, y: 150, w: 300, h: 60 }, default: "hg-polymer" },
        { id: "optic",    type: "optic",     name: "Optic",       box: { x: 380, y: 70,  w: 190, h: 80 } },
        { id: "tactical", type: "tactical",  name: "Light/Laser", box: { x: 700, y: 120, w: 90,  h: 36 } },
        { id: "under",    type: "underbarrel", name: "Underbarrel", box: { x: 640, y: 210, w: 80, h: 100 } },
        { id: "grip",     type: "grip",      name: "Pistol Grip", box: { x: 400, y: 215, w: 80,  h: 110 }, default: "grip-a2" },
        { id: "magazine", type: "magazine",  name: "Magazine",    box: { x: 480, y: 215, w: 80,  h: 140 }, default: "mag-30" },
        { id: "stock",    type: "stock",     name: "Stock",       box: { x: 120, y: 150, w: 270, h: 110 }, default: "stock-fixed" }
      ]
    },
    {
      id: "dmr-762", name: "Marksman 7.62", category: "rifle", caliber: "7.62x51",
      base: { ergo: 38, recoil: 260, weight: 4.3, price: 1800 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      box: { x: 880, y: 150, w: 100, h: 40 }, default: "flash-hider" },
        { id: "handguard",type: "handguard", name: "Handguard",   box: { x: 570, y: 150, w: 310, h: 60 }, default: "hg-polymer" },
        { id: "optic",    type: "optic",     name: "Optic",       box: { x: 380, y: 66,  w: 210, h: 84 } },
        { id: "tactical", type: "tactical",  name: "Light/Laser", box: { x: 720, y: 120, w: 90,  h: 36 } },
        { id: "under",    type: "underbarrel", name: "Underbarrel", box: { x: 660, y: 210, w: 80, h: 100 } },
        { id: "grip",     type: "grip",      name: "Pistol Grip", box: { x: 400, y: 215, w: 80,  h: 110 }, default: "grip-a2" },
        { id: "magazine", type: "magazine",  name: "Magazine",    box: { x: 480, y: 215, w: 90,  h: 130 }, default: "mag-20-762" },
        { id: "stock",    type: "stock",     name: "Stock",       box: { x: 110, y: 150, w: 280, h: 120 }, default: "stock-fixed" }
      ]
    },
    {
      id: "smg-9", name: "SMG 9mm", category: "smg", caliber: "9x19",
      base: { ergo: 55, recoil: 110, weight: 2.4, price: 700 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      box: { x: 800, y: 160, w: 110, h: 40 }, default: "flash-hider" },
        { id: "handguard",type: "handguard", name: "Handguard",   box: { x: 560, y: 160, w: 240, h: 60 }, default: "hg-polymer" },
        { id: "optic",    type: "optic",     name: "Optic",       box: { x: 400, y: 80,  w: 180, h: 80 } },
        { id: "tactical", type: "tactical",  name: "Light/Laser", box: { x: 680, y: 130, w: 90,  h: 36 } },
        { id: "under",    type: "underbarrel", name: "Underbarrel", box: { x: 620, y: 220, w: 80, h: 100 } },
        { id: "grip",     type: "grip",      name: "Pistol Grip", box: { x: 420, y: 225, w: 80,  h: 110 }, default: "grip-a2" },
        { id: "magazine", type: "magazine",  name: "Magazine",    box: { x: 510, y: 225, w: 70,  h: 140 }, default: "mag-30-9" },
        { id: "stock",    type: "stock",     name: "Stock",       box: { x: 150, y: 160, w: 250, h: 100 }, default: "stock-collapsible" }
      ]
    },
    {
      id: "pistol-9", name: "Service Pistol 9mm", category: "pistol", caliber: "9x19",
      base: { ergo: 60, recoil: 120, weight: 0.8, price: 450 },
      slots: [
        { id: "muzzle",   type: "muzzle",    name: "Muzzle",      box: { x: 780, y: 130, w: 100, h: 40 } },
        { id: "slide",    type: "slide",     name: "Slide",       box: { x: 330, y: 110, w: 450, h: 70 }, default: "slide-std" },
        { id: "optic",    type: "optic",     name: "Optic",       box: { x: 440, y: 55,  w: 150, h: 60 } },
        { id: "tactical", type: "tactical",  name: "Light/Laser", box: { x: 620, y: 185, w: 140, h: 60 } },
        { id: "grip",     type: "grip",      name: "Grip Frame",  box: { x: 330, y: 180, w: 140, h: 150 }, default: "grip-pistol" },
        { id: "magazine", type: "magazine",  name: "Magazine",    box: { x: 350, y: 250, w: 100, h: 130 }, default: "mag-15-9" }
      ]
    }
  ],

  parts: [
    /* ---- Muzzle ---- */
    { id: "flash-hider", name: "Flash Hider", type: "muzzle", fits: "*", ergo: -1, recoil: -4, weight: 0.10, price: 60, color: "#4b5563" },
    { id: "compensator", name: "Compensator", type: "muzzle", fits: "*", ergo: -2, recoil: -18, weight: 0.18, price: 140, color: "#374151" },
    { id: "suppressor",  name: "Suppressor",  type: "muzzle", fits: "*", ergo: -6, recoil: -12, weight: 0.55, price: 650, color: "#1f2937",
      box: { x: 840, y: 140, w: 170, h: 60 } },

    /* ---- Handguard ---- */
    { id: "hg-polymer", name: "Polymer Handguard", type: "handguard", fits: ["rifle", "smg"], ergo: 0, recoil: 0, weight: 0.30, price: 50, color: "#3f3f46" },
    { id: "hg-mlok",    name: "M-LOK Handguard",   type: "handguard", fits: ["rifle", "smg"], ergo: 4, recoil: -3, weight: 0.42, price: 220, color: "#52525b" },
    { id: "hg-short",   name: "Short Rail",        type: "handguard", fits: ["rifle", "smg"], ergo: 6, recoil: 4, weight: 0.22, price: 160, color: "#52525b",
      box: { x: 600, y: 150, w: 200, h: 56 } },

    /* ---- Optics ---- */
    { id: "red-dot",  name: "Red Dot Sight",  type: "optic", fits: "*", ergo: -1, recoil: 0, weight: 0.15, price: 280, color: "#b45309" },
    { id: "holo",     name: "Holographic",    type: "optic", fits: "*", ergo: -2, recoil: 0, weight: 0.32, price: 520, color: "#92400e" },
    { id: "lpvo",     name: "1-6x LPVO",      type: "optic", fits: ["rifle"], ergo: -6, recoil: 0, weight: 0.65, price: 1100, color: "#292524" },
    { id: "scope-12", name: "3-12x Scope",    type: "optic", fits: ["dmr-762"], ergo: -9, recoil: 0, weight: 0.85, price: 1500, color: "#1c1917" },

    /* ---- Stocks ---- */
    { id: "stock-fixed",       name: "Fixed Stock",       type: "stock", fits: ["rifle"], ergo: 0, recoil: 0, weight: 0.35, price: 60, color: "#3f3f46" },
    { id: "stock-collapsible", name: "Collapsible Stock", type: "stock", fits: ["rifle", "smg"], ergo: 3, recoil: 6, weight: 0.28, price: 110, color: "#52525b" },
    { id: "stock-skeleton",    name: "Skeleton Stock",    type: "stock", fits: ["rifle", "smg"], ergo: 6, recoil: 12, weight: 0.20, price: 190, color: "#6b7280" },
    { id: "stock-none",        name: "Brace Delete",      type: "stock", fits: ["smg"], ergo: 8, recoil: 40, weight: 0.0, price: 0, color: "#000000",
      box: { x: 380, y: 170, w: 20, h: 40 } },

    /* ---- Grips ---- */
    { id: "grip-a2",     name: "Standard Grip", type: "grip", fits: ["rifle", "smg"], ergo: 0, recoil: 0, weight: 0.10, price: 20, color: "#3f3f46" },
    { id: "grip-ergo",   name: "Ergo Grip",     type: "grip", fits: ["rifle", "smg"], ergo: 4, recoil: -2, weight: 0.12, price: 45, color: "#52525b" },
    { id: "grip-pistol", name: "Standard Frame", type: "grip", fits: ["pistol"], ergo: 0, recoil: 0, weight: 0.0, price: 0, color: "#3f3f46" },
    { id: "grip-stipple",name: "Stippled Frame", type: "grip", fits: ["pistol"], ergo: 5, recoil: -4, weight: 0.0, price: 90, color: "#52525b" },

    /* ---- Magazines ---- */
    { id: "mag-30",     name: "30rnd STANAG",    type: "magazine", fits: ["carbine-556"], ergo: 0, recoil: 0, weight: 0.45, price: 25, color: "#3f3f46" },
    { id: "mag-20",     name: "20rnd Short",     type: "magazine", fits: ["carbine-556"], ergo: 3, recoil: 0, weight: 0.32, price: 22, color: "#52525b",
      box: { x: 480, y: 215, w: 80, h: 100 } },
    { id: "mag-40",     name: "40rnd Extended",  type: "magazine", fits: ["carbine-556"], ergo: -5, recoil: 0, weight: 0.62, price: 70, color: "#27272a",
      box: { x: 480, y: 215, w: 80, h: 175 } },
    { id: "mag-20-762", name: "20rnd 7.62",      type: "magazine", fits: ["dmr-762"], ergo: 0, recoil: 0, weight: 0.65, price: 35, color: "#3f3f46" },
    { id: "mag-30-9",   name: "30rnd 9mm",       type: "magazine", fits: ["smg-9"], ergo: 0, recoil: 0, weight: 0.45, price: 25, color: "#3f3f46" },
    { id: "mag-15-9",   name: "15rnd 9mm",       type: "magazine", fits: ["pistol-9"], ergo: 0, recoil: 0, weight: 0.25, price: 25, color: "#3f3f46" },
    { id: "mag-21-9",   name: "21rnd Extended",  type: "magazine", fits: ["pistol-9"], ergo: -3, recoil: 0, weight: 0.32, price: 45, color: "#27272a",
      box: { x: 350, y: 250, w: 100, h: 170 } },

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
