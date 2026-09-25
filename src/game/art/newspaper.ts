import { INK, ellipse, inked, makeCanvas, rng, rr, text, blob, poly } from './canvas';

export type PhotoKind = 'scarn' | 'catherine' | 'goldenface' | 'paper' | 'stadium' | 'mba';

export interface Paper {
  headline: string;
  sub: string;
  photo: PhotoKind;
  date: string;
  masthead?: string;
}

function photo(g: CanvasRenderingContext2D, kind: PhotoKind, x: number, y: number, w: number, h: number): void {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, kind === 'catherine' ? '#e8e0ee' : '#9a9a9a');
  gr.addColorStop(1, kind === 'catherine' ? '#b8a8c8' : '#5a5a5a');
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const skin = kind === 'goldenface' ? '#d8b040' : '#cfcfcf';
  if (kind === 'stadium') {
    g.fillStyle = '#444';
    ellipse(g, cx, cy + h * 0.3, w * 0.6, h * 0.35);
    g.fill();
    g.fillStyle = '#777';
    ellipse(g, cx, cy + h * 0.3, w * 0.4, h * 0.2);
    g.fill();
  } else if (kind === 'paper') {
    for (let i = 0; i < 5; i++) {
      rr(g, x + 20 + i * 18, y + h - 40 - i * 22, w * 0.5, 20, 2);
      inked(g, '#ddd', 2);
    }
    ellipse(g, cx + w * 0.2, cy - 10, 26, 30);
    inked(g, skin, 3);
    blob(g, [cx + w * 0.2 - 28, cy - 18, cx + w * 0.2 - 20, cy - 40, cx + w * 0.2 + 10, cy - 44, cx + w * 0.2 + 30, cy - 30, cx + w * 0.2 + 10, cy - 30]);
    inked(g, '#333', 3);
  } else {
    // head-and-shoulders
    poly(g, [cx - w * 0.36, y + h, cx - w * 0.28, cy + h * 0.2, cx + w * 0.28, cy + h * 0.2, cx + w * 0.36, y + h]);
    inked(g, kind === 'catherine' ? '#a080b8' : '#2a2a2a', 3);
    ellipse(g, cx, cy - h * 0.06, w * 0.17, h * 0.24);
    inked(g, skin, 3);
    if (kind === 'catherine') {
      ellipse(g, cx - 6, cy - h * 0.26, w * 0.2, h * 0.12);
      inked(g, '#6a4a3a', 3);
      ellipse(g, cx - w * 0.12, cy - h * 0.32, w * 0.08, h * 0.08);
      inked(g, '#6a4a3a', 3);
    } else if (kind === 'goldenface') {
      blob(g, [cx - w * 0.18, cy - h * 0.12, cx - w * 0.12, cy - h * 0.3, cx + w * 0.1, cy - h * 0.32, cx + w * 0.19, cy - h * 0.16]);
      inked(g, '#111', 3);
      text(g, '?', cx, cy + 4, { size: h * 0.25, color: '#3a2a00' });
    } else {
      blob(g, [cx - w * 0.19, cy - h * 0.08, cx - w * 0.16, cy - h * 0.3, cx + w * 0.02, cy - h * 0.36, cx + w * 0.2, cy - h * 0.26, cx + w * 0.06, cy - h * 0.24, cx - w * 0.1, cy - h * 0.16]);
      inked(g, '#333', 3);
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(cx - 14, cy + h * 0.06);
      g.quadraticCurveTo(cx + 2, cy + h * 0.12, cx + 16, cy + h * 0.03);
      g.stroke();
      if (kind === 'mba') {
        poly(g, [cx - w * 0.22, cy - h * 0.3, cx, cy - h * 0.42, cx + w * 0.22, cy - h * 0.3, cx, cy - h * 0.2]);
        inked(g, '#111', 2);
      }
    }
  }
  if (kind === 'catherine') {
    // soft focus
    const sf = g.createRadialGradient(cx, cy, h * 0.2, cx, cy, h * 0.8);
    sf.addColorStop(0, 'rgba(255,255,255,0)');
    sf.addColorStop(1, 'rgba(255,245,255,0.85)');
    g.fillStyle = sf;
    g.fillRect(x, y, w, h);
  }
  // halftone dots
  g.fillStyle = 'rgba(0,0,0,0.08)';
  for (let yy = y; yy < y + h; yy += 5) for (let xx = x + ((yy / 5) % 2) * 2.5; xx < x + w; xx += 5) g.fillRect(xx, yy, 1.6, 1.6);
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.strokeRect(x, y, w, h);
  text(g, 'Photo: M. Scott', x + w - 4, y + h + 12, { size: 11, align: 'right', font: 'Georgia, serif', weight: '400', color: '#333' });
}

export function paintNewspaper(p: Paper, seed = 1): HTMLCanvasElement {
  const W = 880;
  const H = 600;
  const { c, g } = makeCanvas(W, H);
  const r = rng(seed);
  g.fillStyle = '#efe8d4';
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(160,130,80,0.10)';
  for (let i = 0; i < 400; i++) g.fillRect(r() * W, r() * H, 2, 2);
  // masthead
  text(g, p.masthead ?? 'The Scranton Daily Scarnicle', W / 2, 52, { size: 50, font: '"Playfair Display", "Old English Text MT", Georgia, serif', weight: '700', color: '#111' });
  g.fillStyle = '#111';
  g.fillRect(24, 86, W - 48, 3);
  g.fillRect(24, 110, W - 48, 1.5);
  text(g, `${p.date}   ·   PRINTED ON DUNDER MIFFLIN 20LB BOND   ·   25¢`, W / 2, 99, { size: 12, font: 'Georgia, serif', weight: '400', color: '#222' });
  // headline
  text(g, p.headline, W / 2, 160, { size: 56, font: '"Bebas Neue", Impact, sans-serif', weight: '400', color: '#0b0b0b', maxW: W - 60 });
  text(g, p.sub, W / 2, 206, { size: 22, font: '"Playfair Display", Georgia, serif', weight: '400', color: '#222', maxW: W - 80 });
  photo(g, p.photo, 40, 236, 400, 300);
  // body columns of fake text
  g.fillStyle = 'rgba(0,0,0,0.55)';
  for (let col = 0; col < 2; col++) {
    for (let i = 0; i < 22; i++) {
      const w = 180 - (r() > 0.85 ? 60 : 0) - r() * 12;
      g.fillRect(470 + col * 200, 244 + i * 14, w, 5);
    }
  }
  text(g, 'continued on A12 (there is no A12)', 660, 560, { size: 12, font: 'Georgia, serif', weight: '400', color: '#333' });
  // tape on the corners — Michael made these himself
  g.fillStyle = 'rgba(240,235,200,0.75)';
  g.save();
  g.translate(20, 14);
  g.rotate(-0.5);
  g.fillRect(-20, -8, 70, 18);
  g.restore();
  g.save();
  g.translate(W - 20, H - 14);
  g.rotate(-0.5);
  g.fillRect(-50, -8, 70, 18);
  g.restore();
  return c;
}
