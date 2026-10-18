import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { range, rng } from '@runek/core';

/**
 * Procedural surface textures painted into canvases (no image files, like the rest of the
 * game). Each returns a color map and a matching roughness map, both tiling, cached by key so
 * every floor or wall that shares a finish shares the GPU texture.
 */
export interface SurfaceMaps {
  map: Texture;
  roughnessMap: Texture;
  /** Meters covered by one tile of the texture. */
  tile: number;
}

const cache = new Map<string, SurfaceMaps>();

function canvas(px: number) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  return c;
}

function finish(color: HTMLCanvasElement, rough: HTMLCanvasElement, tile: number): SurfaceMaps {
  const map = new CanvasTexture(color);
  map.colorSpace = SRGBColorSpace;
  const roughnessMap = new CanvasTexture(rough);
  roughnessMap.colorSpace = NoColorSpace;
  for (const t of [map, roughnessMap]) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 8;
  }
  return { map, roughnessMap, tile };
}

/** Speckle and blotch a canvas with a seeded hand: `n` soft stains of radius r in [r0, r1]. */
function blotches(g: CanvasRenderingContext2D, r: () => number, px: number, n: number, r0: number, r1: number, rgb: string, alpha: number) {
  for (let i = 0; i < n; i++) {
    const x = r() * px;
    const y = r() * px;
    const rad = range(r, r0, r1) * px;
    for (const [ox, oy] of [[0, 0], [px, 0], [-px, 0], [0, px], [0, -px]]) {
      const grad = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      grad.addColorStop(0, `rgba(${rgb},${alpha * range(r, 0.4, 1)})`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
}

function speckle(g: CanvasRenderingContext2D, r: () => number, px: number, n: number, light: string, dark: string) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() < 0.5 ? light : dark;
    const s = r() < 0.92 ? 1 : 2;
    g.fillRect(r() * px, r() * px, s, s);
  }
}

/**
 * Sealed warehouse concrete: aggregate speckle, mottled trowel marks, oil stains, forklift tyre
 * scuffs, and saw-cut control joints on the tile edges. One tile is `tile` meters (a 4 m bay).
 */
export function concrete(base = '#8f8c85', seed = 7, tile = 4): SurfaceMaps {
  const key = `concrete:${base}:${seed}:${tile}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const px = 1024;
  const r = rng(seed);
  const c = canvas(px);
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, px, px);
  blotches(g, r, px, 40, 0.05, 0.22, '255,255,250', 0.07);
  blotches(g, r, px, 40, 0.04, 0.2, '40,36,30', 0.08);
  speckle(g, r, px, 26000, 'rgba(255,255,255,0.18)', 'rgba(0,0,0,0.22)');
  // Oil stains: dark, soft, a few per bay.
  blotches(g, r, px, 5, 0.02, 0.07, '25,20,15', 0.32);
  // Forklift tyre scuffs: faint dark arcs.
  g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    g.strokeStyle = `rgba(20,18,16,${range(r, 0.05, 0.12)})`;
    g.lineWidth = range(r, 10, 22);
    g.beginPath();
    const x = r() * px;
    const y = r() * px;
    g.arc(x, y, range(r, 0.3, 0.9) * px, r() * Math.PI * 2, r() * Math.PI * 2 + range(r, 0.3, 0.9));
    g.stroke();
  }
  // Saw-cut joints on two edges (they tile into a grid).
  g.fillStyle = 'rgba(20,18,16,0.55)';
  g.fillRect(0, 0, px, 3);
  g.fillRect(0, 0, 3, px);
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(0, 3, px, 1);
  g.fillRect(3, 0, 1, px);

  const rc = canvas(256);
  const rg = rc.getContext('2d')!;
  rg.fillStyle = 'rgb(150,150,150)';
  rg.fillRect(0, 0, 256, 256);
  const rr = rng(seed + 1);
  blotches(rg, rr, 256, 30, 0.05, 0.25, '90,90,90', 0.5); // polished, shinier patches
  blotches(rg, rr, 256, 20, 0.05, 0.2, '230,230,230', 0.4); // dusty, dull patches
  const out = finish(c, rc, tile);
  cache.set(key, out);
  return out;
}

/**
 * Painted cinder block: 40 × 20 cm blocks in running bond, with a darker dado below `dado`
 * meters and a yellow safety stripe on top of it. One tile is 1.6 m wide by `height` tall,
 * so the paint bands land at the right height when the wall is `height` meters.
 */
export function blockWall(paint = '#d7d2c4', lower = '#7d8590', height = 6, dado = 1.2, seed = 3): SurfaceMaps {
  const key = `block:${paint}:${lower}:${height}:${dado}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 512;
  const H = Math.round((W * height) / 1.6);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const pxm = W / 1.6;
  const r = rng(seed);
  const dadoY = H - dado * pxm;
  g.fillStyle = paint;
  g.fillRect(0, 0, W, dadoY);
  g.fillStyle = lower;
  g.fillRect(0, dadoY, W, H - dadoY);
  // Block faces: each slightly different under the paint.
  const bw = 0.4 * pxm;
  const bh = 0.2 * pxm;
  for (let row = 0; row * bh < H; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let col = -1; col * bw < W; col++) {
      const x = col * bw + off;
      const y = H - (row + 1) * bh;
      g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${range(r, 0.01, 0.05)})`;
      g.fillRect(x, y, bw, bh);
    }
    // Mortar joints.
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(0, H - (row + 1) * bh, W, 2);
    for (let col = -1; col * bw < W; col++) g.fillRect(col * bw + off, H - (row + 1) * bh, 2, bh);
  }
  speckle(g, r, W, 9000, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.1)');
  // Safety stripe on the dado line, and scuffs where pallets hit the wall.
  g.fillStyle = '#e1b12c';
  g.fillRect(0, dadoY - 0.1 * pxm, W, 0.1 * pxm);
  blotches(g, r, W, 6, 0.04, 0.12, '30,26,22', 0.25);
  // Water streaks from the roof.
  for (let i = 0; i < 4; i++) {
    const x = r() * W;
    const grad = g.createLinearGradient(0, 0, 0, H * 0.5);
    grad.addColorStop(0, 'rgba(60,52,40,0.18)');
    grad.addColorStop(1, 'rgba(60,52,40,0)');
    g.fillStyle = grad;
    g.fillRect(x, 0, range(r, 3, 9), H * 0.5);
  }
  const rc = canvas(64);
  const rg = rc.getContext('2d')!;
  rg.fillStyle = 'rgb(225,225,225)';
  rg.fillRect(0, 0, 64, 64);
  const out = finish(c, rc, 1.6);
  cache.set(key, out);
  return out;
}

/** Corrugated steel (roll-up doors, cladding): ribs every 10 cm, light rust and grime. */
export function corrugated(paint = '#9aa3a8', seed = 5): SurfaceMaps {
  const key = `corrugated:${paint}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const px = 512;
  const r = rng(seed);
  const c = canvas(px);
  const g = c.getContext('2d')!;
  g.fillStyle = paint;
  g.fillRect(0, 0, px, px);
  const rib = px / 10;
  for (let i = 0; i < 10; i++) {
    const grad = g.createLinearGradient(0, i * rib, 0, (i + 1) * rib);
    grad.addColorStop(0, 'rgba(255,255,255,0.22)');
    grad.addColorStop(0.45, 'rgba(0,0,0,0.05)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.25)');
    grad.addColorStop(1, 'rgba(255,255,255,0.1)');
    g.fillStyle = grad;
    g.fillRect(0, i * rib, px, rib);
  }
  blotches(g, r, px, 10, 0.03, 0.1, '120,70,30', 0.18);
  speckle(g, r, px, 5000, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.15)');
  const rc = canvas(64);
  const rg = rc.getContext('2d')!;
  rg.fillStyle = 'rgb(120,120,120)';
  rg.fillRect(0, 0, 64, 64);
  const out = finish(c, rc, 1);
  cache.set(key, out);
  return out;
}
