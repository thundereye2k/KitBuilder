# KitBuilder

A static, dependency-free weapon kit configurator. Pick a weapon, click a slot (or use the side panel) and choose parts. Stats, price and a shareable link update live.

## Run / host

No build step. Serve the folder with anything:

```
python3 -m http.server 8080
```

or drop it on GitHub Pages / Netlify / Cloudflare Pages / any web host. (`index.html` also works opened directly.)

## Adding content — `data/data.js`

- **Weapons**: add to `weapons[]` with its `slots` (each slot has a `type` and a `box` on the 1000×400 board).
- **Parts**: add to `parts[]`. `type` must match a slot type; `fits` is `"*"`, or a list of weapon ids / category ids. `ergo`, `recoil`, `weight`, `price` are deltas.
- **Categories / slot types**: `categories[]`, `slotTypes{}`.

## Supplying models

Currently models are 2D side-view images layered on the board (transparent PNG/WebP/SVG):

- Weapon base image: set `image: "models/weapons/<file>.png"` on the weapon (drawn full board).
- Part image: set `image: "models/parts/<file>.png"` on the part; it is fitted inside the slot `box` (or the part's own `box` override). Align each part image's mount point to its slot box, and tweak `box` to taste.

Parts without an image render as labelled placeholder shapes.

Real 3D (GLB) is a natural next step: swap the SVG board for `<model-viewer>` / three.js and attach part models at slot anchor nodes.
