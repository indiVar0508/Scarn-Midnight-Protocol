/**
 * Floor-plane world: characters live on (x, y) where y is depth on the floor.
 * Obstacles are axis-aligned footprint rectangles.
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class World {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  walls: Rect[] = [];

  constructor(width: number, floorTop = 372, floorBottom = 700, minX = 30) {
    this.minX = minX;
    this.maxX = width - 30;
    this.minY = floorTop;
    this.maxY = floorBottom;
  }

  addWall(x: number, y: number, w: number, h: number): Rect {
    const r = { x, y, w, h };
    this.walls.push(r);
    return r;
  }

  removeWall(r: Rect): void {
    this.walls = this.walls.filter((w) => w !== r);
  }

  /** Resolve a circle against bounds and walls. Mutates and returns p. */
  resolve(p: { x: number; y: number }, r: number): { x: number; y: number } {
    p.x = Math.max(this.minX + r * 0.5, Math.min(this.maxX - r * 0.5, p.x));
    p.y = Math.max(this.minY, Math.min(this.maxY, p.y));
    for (const w of this.walls) {
      const cx = Math.max(w.x, Math.min(w.x + w.w, p.x));
      const cy = Math.max(w.y, Math.min(w.y + w.h, p.y));
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          p.x = cx + (dx / d) * r;
          p.y = cy + (dy / d) * r;
        } else {
          // centre inside the rect: push out along the shortest axis
          const left = p.x - w.x;
          const right = w.x + w.w - p.x;
          const top = p.y - w.y;
          const bottom = w.y + w.h - p.y;
          const m = Math.min(left, right, top, bottom);
          if (m === left) p.x = w.x - r;
          else if (m === right) p.x = w.x + w.w + r;
          else if (m === top) p.y = w.y - r;
          else p.y = w.y + w.h + r;
        }
      }
    }
    return p;
  }

  pointBlocked(x: number, y: number): boolean {
    if (x < this.minX || x > this.maxX || y < this.minY - 40 || y > this.maxY + 40) return true;
    return this.walls.some((w) => x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h);
  }

  /** Does the segment cross any wall? (line of sight) */
  segmentBlocked(x1: number, y1: number, x2: number, y2: number): boolean {
    for (const w of this.walls) if (segRect(x1, y1, x2, y2, w)) return true;
    return false;
  }
}

function segRect(x1: number, y1: number, x2: number, y2: number, r: Rect): boolean {
  // Liang–Barsky clip test
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}
