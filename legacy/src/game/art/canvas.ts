/** Canvas 2D drawing helpers shared by all procedural art. */

export const INK = '#1b1420';
export const FONT_TITLE = '"Bebas Neue", Impact, "Arial Narrow Bold", "Arial Black", sans-serif';
export const FONT_HAND = '"Permanent Marker", "Comic Sans MS", "Marker Felt", cursive';
export const LINE = 3;

export function makeCanvas(w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d')!;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  return { c, g };
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Multiply brightness (0.8 = 20% darker, 1.2 = lighter). */
export function shade(hex: string, k: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (k <= 1) return rgbToHex(r * k, g * k, b * k);
  const t = k - 1;
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function hexNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}

/** Fill + ink outline of the current path. */
export function inked(g: CanvasRenderingContext2D, fill: string | CanvasGradient | CanvasPattern, lw = LINE): void {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) {
    g.strokeStyle = INK;
    g.lineWidth = lw;
    g.stroke();
  }
}

export function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}

export function poly(g: CanvasRenderingContext2D, pts: number[]): void {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
}

/** Smooth closed shape through points (quadratic midpoints). */
export function blob(g: CanvasRenderingContext2D, pts: number[]): void {
  const n = pts.length / 2;
  g.beginPath();
  const mx = (i: number) => (pts[(i % n) * 2] + pts[((i + 1) % n) * 2]) / 2;
  const my = (i: number) => (pts[(i % n) * 2 + 1] + pts[((i + 1) % n) * 2 + 1]) / 2;
  g.moveTo(mx(0), my(0));
  for (let i = 1; i <= n; i++) g.quadraticCurveTo(pts[(i % n) * 2], pts[(i % n) * 2 + 1], mx(i), my(i));
  g.closePath();
}

/** Clip to current path, run fn (for inner shading), restore. */
export function within(g: CanvasRenderingContext2D, fn: () => void): void {
  g.save();
  g.clip();
  fn();
  g.restore();
}

export function text(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  opts: { size?: number; font?: string; color?: string; align?: CanvasTextAlign; weight?: string; stroke?: string; strokeW?: number; baseline?: CanvasTextBaseline; rot?: number; maxW?: number } = {},
): void {
  g.save();
  g.translate(x, y);
  if (opts.rot) g.rotate(opts.rot);
  g.font = `${opts.weight ?? '700'} ${opts.size ?? 16}px ${opts.font ?? FONT_TITLE}`;
  g.textAlign = opts.align ?? 'center';
  g.textBaseline = opts.baseline ?? 'middle';
  if (opts.stroke) {
    g.strokeStyle = opts.stroke;
    g.lineWidth = opts.strokeW ?? 3;
    g.strokeText(s, 0, 0, opts.maxW);
  }
  g.fillStyle = opts.color ?? INK;
  g.fillText(s, 0, 0, opts.maxW);
  g.restore();
}

/** Deterministic PRNG so procedural art is identical every run. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Paper-ish noise speckle over a region (cheap texture). */
export function speckle(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, count: number, seed = 7, size = 2): void {
  const r = rng(seed);
  g.fillStyle = color;
  for (let i = 0; i < count; i++) g.fillRect(x + r() * w, y + r() * h, size * (0.5 + r()), size * (0.5 + r()));
}
