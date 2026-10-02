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

## Supplying 3D models (GLB)

Conventions: metres, Y up, barrel pointing **+X**, weapon's right side **+Z**.

**Weapon GLB** → `models/weapons/<file>.glb`, then set `model: "models/weapons/<file>.glb"` on the weapon.
Put an *empty node* in the GLB for every attachment point and name it `slot_<slotId>` (e.g. `slot_optic`, `slot_muzzle`, `slot_magazine`). Position/rotate the empty where the part's mount point should sit. In Blender, an Empty with that name exports as a glTF node. Slots with no node in the GLB fall back to the `anchor` in `data.js`.

**Part GLB** → `models/parts/<file>.glb`, then set `model: "models/parts/<file>.glb"` on the part.
Model each part with its **mount point at the origin (0,0,0)** and the same axes as the weapon; it is dropped onto the slot anchor. Optional per-part tweaks: `scale`, `rot: [x,y,z]` (degrees), `offset: [x,y,z]` (metres).

Anything without a model renders as a placeholder shape sized from the slot's `anchor.size`, so models can be added gradually. Optional `thumb: "path.png"` on a part sets its list thumbnail.

Draco/meshopt-compressed GLBs are not wired up yet.
