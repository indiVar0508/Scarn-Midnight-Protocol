import { CanvasTexture, SRGBColorSpace } from 'three';

export type LabelFont = 'marker' | 'bebas' | 'type' | 'serif' | 'sans';

export const LABEL_FONTS: Record<LabelFont, string> = {
  marker: '"Permanent Marker", "Comic Sans MS", cursive',
  bebas: '"Bebas Neue", Impact, sans-serif',
  type: '"Special Elite", "Courier New", monospace',
  serif: '"Playfair Display", Georgia, serif',
  sans: '"Barlow Condensed", "Arial Narrow", sans-serif',
};

export interface LabelLine {
  text: string;
  /** Relative size (1 = default). */
  size?: number;
  color?: string;
  font?: LabelFont;
}

export interface LabelArt {
  lines: LabelLine[];
  background: string;
  color: string;
  font: LabelFont;
  border?: number;
  borderColor?: string;
}

/**
 * Paint printed text (signs, flyers, box logos) into a canvas texture: procedural art, no
 * image files. Redraws once the page's self-hosted fonts finish loading.
 */
export function labelTexture(art: LabelArt, aspect: number, px = 512): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(aspect >= 1 ? px : px * aspect);
  canvas.height = Math.round(aspect >= 1 ? px / aspect : px);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const draw = () => {
    const g = canvas.getContext('2d');
    if (!g) return;
    const W = canvas.width;
    const H = canvas.height;
    g.fillStyle = art.background;
    g.fillRect(0, 0, W, H);
    if (art.border) {
      const b = Math.min(W, H) * art.border;
      g.strokeStyle = art.borderColor ?? art.color;
      g.lineWidth = b * 0.45;
      g.strokeRect(b, b, W - b * 2, H - b * 2);
    }
    const total = art.lines.reduce((n, l) => n + (l.size ?? 1), 0);
    const unitH = (H * 0.78) / Math.max(total, 1);
    let y = H * 0.11;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const l of art.lines) {
      const lh = unitH * (l.size ?? 1);
      const family = LABEL_FONTS[l.font ?? art.font];
      let fs = lh * 0.82;
      g.font = `${fs}px ${family}`;
      const mw = g.measureText(l.text).width;
      if (mw > W * 0.88) {
        fs *= (W * 0.88) / mw;
        g.font = `${fs}px ${family}`;
      }
      g.fillStyle = l.color ?? art.color;
      g.fillText(l.text, W / 2, y + lh / 2);
      y += lh;
    }
    tex.needsUpdate = true;
  };
  draw();
  void document.fonts?.ready.then(draw);
  return tex;
}
