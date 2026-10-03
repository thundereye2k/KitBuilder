/*
 * Photo-mode backdrops, painted in code at any size so they never look pixelated.
 * They are drawn as layers from far to near; after every layer the whole picture is blurred a little more,
 * which gives the soft, out-of-focus look of a real photo (far things are blurrier than near things).
 *
 *   drawBackdrop("forest", width, height, softness)  ->  <canvas>
 *
 * softness: 0 (sharper) .. 1 (very soft). To add a backdrop, add a painter to PAINTERS and use "scene:<name>"
 * as the `bg` of a look in viewer.js.
 */

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box blur x3 (≈ gaussian) on an opaque canvas. */
function blur(ctx, W, H, radius) {
  const r = Math.round(radius / 1.7);
  if (r < 1) return;
  const img = ctx.getImageData(0, 0, W, H), d = img.data, tmp = new Uint8ClampedArray(d.length);
  const pass = (src, dst, horizontal) => {
    const len = horizontal ? W : H, lines = horizontal ? H : W;
    const stride = horizontal ? 4 : W * 4, lineStride = horizontal ? W * 4 : 4;
    const div = 2 * r + 1;
    for (let l = 0; l < lines; l++) {
      const base = l * lineStride;
      for (let ch = 0; ch < 3; ch++) {
        let sum = 0;
        for (let i = -r; i <= r; i++) sum += src[base + Math.min(len - 1, Math.max(0, i)) * stride + ch];
        for (let i = 0; i < len; i++) {
          dst[base + i * stride + ch] = sum / div;
          sum += src[base + Math.min(len - 1, i + r + 1) * stride + ch] - src[base + Math.max(0, i - r) * stride + ch];
        }
      }
    }
  };
  for (let k = 0; k < 3; k++) { pass(d, tmp, true); pass(tmp, d, false); }
  for (let i = 3; i < d.length; i += 4) d[i] = 255;
  ctx.putImageData(img, 0, 0);
}

function linear(ctx, W, H, stops, x0 = 0, y0 = 0, x1 = 0, y1 = H) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function glow(ctx, x, y, radius, rgb, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.35})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function disc(ctx, x, y, radius, rgb, alpha) {   // flat bokeh disc with a slightly brighter rim
  ctx.fillStyle = `rgba(${rgb},${alpha})`;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(${rgb},${alpha * 0.8})`;
  ctx.lineWidth = Math.max(1, radius * 0.08);
  ctx.stroke();
}

function vignette(ctx, W, H, strength) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.55);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function ridge(ctx, W, H, baseY, amp, rand, fill) {
  const waves = [0, 1, 2, 3].map((i) => ({ a: amp / (i + 1), f: (1.5 + i * 2.3) * (0.7 + rand() * 0.6) * Math.PI * 2 / W, p: rand() * 6.28 }));
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) ctx.lineTo(x, baseY + waves.reduce((s, w) => s + Math.sin(x * w.f + w.p) * w.a, 0));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

const PAINTERS = {
  forest(ctx, W, H, R, k) {
    linear(ctx, W, H, [[0, "#14301a"], [0.3, "#37622b"], [0.55, "#86a64c"], [0.72, "#4d5b2b"], [1, "#2a2116"]]);
    glow(ctx, W * 0.66, H * 0.36, W * 0.55, "255,246,196", 0.6);
    blur(ctx, W, H, 10 * k);
    for (let i = 0; i < 18; i++) {   // far trunks, hazy
      const w = (0.012 + R() * 0.02) * W, x = R() * W;
      ctx.fillStyle = "rgba(22,42,24,0.5)"; ctx.fillRect(x, -5, w, H * 0.8);
    }
    for (let i = 0; i < 45; i++) disc(ctx, R() * W, R() * H * 0.62, (0.008 + R() * 0.03) * W, R() < 0.7 ? "255,240,170" : "190,230,120", 0.1 + R() * 0.2);
    blur(ctx, W, H, 7 * k);
    for (let i = 0; i < 9; i++) {   // mid trunks
      const w = (0.025 + R() * 0.03) * W, x = (i + R() * 0.8) / 9 * W;
      ctx.fillStyle = "rgba(14,26,14,0.78)"; ctx.fillRect(x, -5, w, H * 0.86);
    }
    ctx.fillStyle = "rgba(38,30,18,0.8)"; ctx.fillRect(0, H * 0.8, W, H * 0.2);
    for (let i = 0; i < 80; i++) { ctx.fillStyle = `rgba(${R() < 0.5 ? "120,84,40" : "70,92,36"},${0.15 + R() * 0.25})`; ctx.beginPath(); ctx.ellipse(R() * W, H * (0.82 + R() * 0.18), W * (0.01 + R() * 0.03), H * 0.012, 0, 0, 6.3); ctx.fill(); }
    blur(ctx, W, H, 5 * k);
    for (const x of [0.03, 0.93, 0.99]) { const w = (0.05 + R() * 0.04) * W; ctx.fillStyle = "rgba(8,14,9,0.82)"; ctx.fillRect(x * W - w / 2, -5, w, H + 10); }
    blur(ctx, W, H, 6 * k);
    vignette(ctx, W, H, 0.4);
  },

  sunset(ctx, W, H, R, k) {
    linear(ctx, W, H, [[0, "#141f45"], [0.3, "#4b3a78"], [0.5, "#c0586a"], [0.62, "#f08a4b"], [0.7, "#ffcf86"], [1, "#2b1d2c"]]);
    glow(ctx, W * 0.66, H * 0.64, W * 0.5, "255,226,150", 0.9);
    disc(ctx, W * 0.66, H * 0.64, W * 0.035, "255,248,220", 0.95);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = `rgba(255,${150 + R() * 60 | 0},${120 + R() * 50 | 0},${0.18 + R() * 0.2})`; ctx.beginPath(); ctx.ellipse(R() * W, H * (0.2 + R() * 0.35), W * (0.08 + R() * 0.14), H * 0.025, 0, 0, 6.3); ctx.fill(); }
    blur(ctx, W, H, 9 * k);
    ridge(ctx, W, H, H * 0.67, H * 0.05, R, "rgba(120,70,100,0.85)");
    blur(ctx, W, H, 6 * k);
    ridge(ctx, W, H, H * 0.74, H * 0.06, R, "rgba(60,36,70,0.92)");
    blur(ctx, W, H, 4 * k);
    ridge(ctx, W, H, H * 0.84, H * 0.04, R, "rgba(26,18,34,0.97)");
    blur(ctx, W, H, 2 * k);
    vignette(ctx, W, H, 0.35);
  },

  workshop(ctx, W, H, R, k) {
    linear(ctx, W, H, [[0, "#2b2622"], [0.55, "#51453a"], [0.78, "#3a3128"], [1, "#1a1714"]]);
    ctx.fillStyle = "rgba(207,227,245,0.85)"; ctx.fillRect(W * 0.06, H * 0.12, W * 0.2, H * 0.32);   // window
    glow(ctx, W * 0.16, H * 0.28, W * 0.3, "210,230,250", 0.5);
    blur(ctx, W, H, 9 * k);
    for (let i = 0; i < 4; i++) glow(ctx, W * (0.35 + i * 0.17 + R() * 0.05), H * 0.08, W * 0.12, "255,214,150", 0.55);
    const colors = ["150,60,50", "70,100,70", "190,160,100", "120,130,140", "80,70,60", "170,110,60"];
    for (let row = 0; row < 3; row++) {   // shelves with things on them
      const y = H * (0.34 + row * 0.19);
      for (let x = W * 0.34; x < W * 0.98; x += W * (0.025 + R() * 0.045)) {
        const w = W * (0.02 + R() * 0.04), h = H * (0.04 + R() * 0.1);
        ctx.fillStyle = `rgba(${colors[(R() * colors.length) | 0]},0.8)`; ctx.fillRect(x, y - h, w, h);
      }
      ctx.fillStyle = "rgba(105,74,44,0.95)"; ctx.fillRect(W * 0.32, y, W * 0.68, H * 0.022);
    }
    blur(ctx, W, H, 6 * k);
    ctx.fillStyle = "rgba(24,20,17,0.85)"; ctx.fillRect(0, H * 0.82, W, H * 0.18);
    for (let i = 0; i < 25; i++) disc(ctx, R() * W, H * (0.1 + R() * 0.7), (0.008 + R() * 0.02) * W, "255,200,120", 0.08 + R() * 0.1);
    blur(ctx, W, H, 4 * k);
    vignette(ctx, W, H, 0.45);
  },

  city(ctx, W, H, R, k) {
    linear(ctx, W, H, [[0, "#0d1730"], [0.35, "#2c4670"], [0.6, "#d58a67"], [0.7, "#f0b57f"], [1, "#161a24"]]);
    glow(ctx, W * 0.4, H * 0.62, W * 0.5, "255,190,130", 0.5);
    blur(ctx, W, H, 8 * k);
    const skyline = (baseY, minH, maxH, fill, win, count) => {
      for (let x = -10; x < W;) {
        const w = W * (0.025 + R() * 0.05), h = H * (minH + R() * (maxH - minH));
        ctx.fillStyle = fill; ctx.fillRect(x, baseY - h, w, h + H);
        for (let wy = baseY - h + 6; wy < baseY - 6; wy += W * 0.014)
          for (let wx = x + 4; wx < x + w - 4; wx += W * 0.012)
            if (R() < count) { ctx.fillStyle = `rgba(255,${190 + R() * 50 | 0},${110 + R() * 60 | 0},${win})`; ctx.fillRect(wx, wy, W * 0.006, W * 0.008); }
        x += w + R() * 6;
      }
    };
    skyline(H * 0.76, 0.12, 0.38, "rgba(60,72,104,0.9)", 0.5, 0.25);
    blur(ctx, W, H, 6 * k);
    skyline(H * 0.84, 0.08, 0.3, "rgba(22,26,40,0.96)", 0.85, 0.3);
    blur(ctx, W, H, 4 * k);
    for (let i = 0; i < 40; i++) {   // street lights and signs
      const c = ["255,190,110", "255,240,210", "255,90,80", "110,180,255", "255,170,90"][(R() * 5) | 0];
      disc(ctx, R() * W, H * (0.58 + R() * 0.38), (0.01 + R() * 0.025) * W, c, 0.22 + R() * 0.3);
    }
    blur(ctx, W, H, 3 * k);
    vignette(ctx, W, H, 0.4);
  }
};

export const BACKDROPS = Object.keys(PAINTERS);

export function drawBackdrop(name, W, H, softness = 0.5) {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const paint = PAINTERS[name] || PAINTERS.forest;
  paint(ctx, W, H, rng(1234), 0.25 + 1.75 * Math.min(1, Math.max(0, softness)) * (W / 768));
  return canvas;
}
