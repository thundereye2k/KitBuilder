# KitBuilder

A static, dependency-free weapon kit configurator. Pick a weapon, click a slot (or use the side panel) and choose parts. Stats, price and a shareable link update live.

## Run / host

No build step, no npm. three.js is vendored in `js/vendor/`. Because it uses ES modules, serve over HTTP (opening `index.html` via `file://` won't work):

```
python3 -m http.server 8080
```

Or deploy the folder as-is to GitHub Pages / Netlify / Cloudflare Pages / any static host.

## Adding content — `data/data.js`

- **Weapons**: add to `weapons[]` with `slots` (each slot has a `type` and an `anchor`).
- **Parts**: add to `parts[]`. `type` must match a slot type; `fits` is `"*"` or a list of weapon ids / category ids. `ergo`, `recoil`, `weight`, `price` are deltas.
- **Categories / slot types**: `categories[]`, `slotTypes{}`.

## Model folders

Models are organised by category. The same categories are the tabs / slot names in the site (defined in `categories` and `slotTypes` in `data/data.js`).

```
models/
├── weapons/
│   ├── assault-rifles/   dmrs/   smgs/   sniper-rifles/   pistols/   lmgs/   shotguns/
└── parts/
    ├── muzzle/   handguard/   optic/   stock/   pistol-grip/   magazine/
    └── flashlight/   laser/   underbarrel/   slide/
```

Add a new category by adding an entry to `categories` / `slotTypes` and creating the matching folder.

## Supplying 3D models (GLB)

Conventions: metres, Y up, barrel pointing **+X**, weapon's right side **+Z**.

**Weapon GLB** → `models/weapons/<category>/<file>.glb`, then set `model: "<file>.glb"` on the weapon in `data/data.js` (the category folder is added for you; a value containing `/` is used as a full path).
Put an *empty node* in the GLB for every attachment point and name it `slot_<slotId>`: `slot_muzzle`, `slot_handguard`, `slot_optic`, `slot_flashlight`, `slot_laser`, `slot_underbarrel`, `slot_grip`, `slot_magazine`, `slot_stock`, `slot_slide`. Position/rotate the empty where the part's mount point should sit. In Blender, an Empty with that name exports as a glTF node. Slots with no node in the GLB fall back to the `anchor` in `data.js`.

**Part GLB** → `models/parts/<slot type>/<file>.glb`, then set `model: "<file>.glb"` on the part (folder is added from the part's `type`).
Model each part with its **mount point at the origin (0,0,0)** and the same axes as the weapon; it is dropped onto the slot anchor. Optional per-part tweaks: `scale`, `rot: [x,y,z]` (degrees), `offset: [x,y,z]` (metres).

Every weapon and part already has `model: "<id>.glb"` filled in, so the quickest way to add a model is to save it under that exact name in the right folder (e.g. `models/parts/optic/red-dot.glb`). Rename the file or edit `model` if you prefer another name. A missing file is not an error: the placeholder is shown (the browser console logs a 404 for it).

Anything without a model renders as a placeholder shape sized from the slot's `anchor.size`, so models can be added gradually. Optional `thumb: "path.png"` on a part sets its list thumbnail.

### Converting OBJ + MTL to GLB

```
cd tools && npm install            # once
node convert.js path/to/model.obj  # writes model.glb next to it, MTL colours/textures included
node convert.js path/to/folder --scale 0.001 --up Z
```

`--scale` converts units to metres (mm `0.001`, cm `0.01`, inch `0.0254`); `--up` sets the source up axis. OBJ cannot carry the `slot_*` empties, so add those in Blender (import the OBJ, add Empties, export GLB) or rely on the `anchor` values in `data.js`.

Draco/meshopt-compressed GLBs are not wired up yet.
