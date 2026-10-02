#!/usr/bin/env node
/*
 * Convert OBJ (+ MTL and textures) to GLB for KitBuilder.
 *
 *   cd tools && npm install            (once)
 *   node convert.js <file.obj | folder> [more...] [--scale 0.001] [--up Z] [--out dir]
 *
 *   --scale  multiply the model size. OBJ has no units, KitBuilder uses metres:
 *            millimetres -> 0.001, centimetres -> 0.01, inches -> 0.0254
 *   --up     which axis your OBJ treats as "up" (X, Y or Z). Default Y. CAD/Blender-style exports are often Z.
 *   --out    output folder (default: next to each .obj, same name, .glb)
 *
 * The .mtl is picked up automatically when it sits next to the .obj (and is named in its `mtllib` line);
 * textures are embedded in the GLB.
 */
const fs = require("fs");
const path = require("path");
const obj2gltf = require("obj2gltf");

const args = process.argv.slice(2);
const opt = { scale: 1, up: "Y", out: null };
const inputs = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--scale") opt.scale = parseFloat(args[++i]);
  else if (a === "--up") opt.up = args[++i].toUpperCase();
  else if (a === "--out") opt.out = args[++i];
  else inputs.push(a);
}
if (!inputs.length || !(opt.scale > 0) || !["X", "Y", "Z"].includes(opt.up)) {
  console.error("Usage: node convert.js <file.obj | folder> [...] [--scale 0.001] [--up Z] [--out dir]");
  process.exit(1);
}

function collect(p) {
  const st = fs.statSync(p);
  if (st.isFile()) return /\.obj$/i.test(p) ? [p] : [];
  return fs.readdirSync(p).flatMap((f) => collect(path.join(p, f)));
}

/** Apply a uniform scale to the root nodes of a binary glTF without touching the mesh data. */
function scaleGlb(buf, s) {
  if (s === 1) return buf;
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString("utf8"));
  const roots = json.scenes[json.scene || 0].nodes;
  json.nodes.push({ name: "scaled_root", children: roots, scale: [s, s, s] });
  json.scenes[json.scene || 0].nodes = [json.nodes.length - 1];
  let j = Buffer.from(JSON.stringify(json), "utf8");
  j = Buffer.concat([j, Buffer.alloc((4 - (j.length % 4)) % 4, 0x20)]);
  const rest = buf.slice(20 + jsonLen);
  const out = Buffer.alloc(20);
  buf.copy(out, 0, 0, 12);
  out.writeUInt32LE(j.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  const all = Buffer.concat([out, j, rest]);
  all.writeUInt32LE(all.length, 8);
  return all;
}

(async () => {
  const files = inputs.flatMap(collect);
  if (!files.length) { console.error("No .obj files found."); process.exit(1); }
  let failed = 0;
  for (const f of files) {
    const outFile = path.join(opt.out || path.dirname(f), path.basename(f).replace(/\.obj$/i, ".glb"));
    try {
      const glb = await obj2gltf(f, { binary: true, inputUpAxis: opt.up, outputUpAxis: "Y" });
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, scaleGlb(glb, opt.scale));
      console.log(`ok   ${f} -> ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`);
    } catch (e) {
      failed++;
      console.error(`FAIL ${f}: ${e.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
})();
