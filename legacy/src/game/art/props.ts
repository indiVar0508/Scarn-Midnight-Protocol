import Phaser from 'phaser';
import { INK, FONT_HAND, blob, ellipse, inked, makeCanvas, poly, rng, rr, shade, speckle, text, within } from './canvas';
import { R } from './characters';

/**
 * Prop library. Each entry: [width, height, pivotX, pivotY, painter] in world
 * pixels; canvases are allocated at R x for crisp zooms. Props that stand on
 * the floor pivot at their base so they depth-sort with characters.
 */
type Painter = (g: CanvasRenderingContext2D, w: number, h: number) => void;
type PropDef = [number, number, number, number, Painter];

const paperReam = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label = 'DM', col = '#f3efe4') => {
  rr(g, x, y, w, h, 2);
  inked(g, col, 2);
  g.fillStyle = '#2d5fa0';
  g.fillRect(x + 2, y + h * 0.35, w - 4, h * 0.3);
  text(g, label, x + w / 2, y + h / 2, { size: Math.min(10, h * 0.28), color: '#fff', font: 'Arial', weight: '900' });
};

function paintExplosion(g: CanvasRenderingContext2D, label: boolean): void {
    // Deliberately terrible clip-art explosion with a visible white cut-out border.
    const pts: number[] = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const r = i % 2 ? 90 : 140;
      pts.push(150 + Math.cos(a) * r, 150 + Math.sin(a) * r);
    }
    poly(g, pts);
    g.lineWidth = 14;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.fillStyle = '#ff5a1a';
    g.fill();
    const pts2: number[] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.2;
      const r = i % 2 ? 50 : 95;
      pts2.push(150 + Math.cos(a) * r, 150 + Math.sin(a) * r);
    }
    poly(g, pts2);
    g.fillStyle = '#ffd21a';
    g.fill();
    if (label) text(g, 'KA-BOOM', 150, 150, { size: 42, color: '#fff', stroke: '#b01010', strokeW: 6, rot: -0.12 });
  }

function paintMirror(g: CanvasRenderingContext2D, broken: boolean): void {
  rr(g, 4, 4, 82, 112, 3);
  inked(g, '#8a8f96', 3);
  const gr = g.createLinearGradient(8, 8, 80, 110);
  gr.addColorStop(0, '#dfeaf2');
  gr.addColorStop(0.5, '#b9cad8');
  gr.addColorStop(1, '#e8f0f6');
  g.fillStyle = gr;
  g.fillRect(10, 10, 70, 100);
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(18, 30);
  g.lineTo(34, 14);
  g.moveTo(20, 44);
  g.lineTo(46, 18);
  g.stroke();
  if (!broken) return;
  // the cracks radiate from where Scarn's elbow landed
  g.strokeStyle = 'rgba(40,50,60,0.85)';
  g.lineWidth = 1.5;
  const cx = 48;
  const cy = 56;
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.3;
    g.beginPath();
    g.moveTo(cx, cy);
    const r1 = 14 + (i % 3) * 8;
    g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    g.lineTo(cx + Math.cos(a + 0.12) * 60, cy + Math.sin(a + 0.12) * 60);
    g.stroke();
  }
  g.beginPath();
  g.arc(cx, cy, 10, 0, Math.PI * 2);
  g.stroke();
}

const P: Record<string, PropDef> = {
  // ------------------------------------------------------------ weapons/hand items
  pistol: [34, 22, 6, 10, (g) => {
    poly(g, [4, 6, 30, 6, 32, 11, 12, 11, 11, 20, 4, 20]);
    inked(g, '#2a2a30', 2);
    g.fillStyle = '#56565e';
    g.fillRect(6, 7, 22, 2);
  }],
  goldgun: [34, 22, 6, 10, (g) => {
    poly(g, [4, 6, 30, 6, 32, 11, 12, 11, 11, 20, 4, 20]);
    inked(g, '#e8b83a', 2);
    g.fillStyle = '#fff3b0';
    g.fillRect(6, 7, 22, 2);
  }],
  stick: [20, 90, 6, 6, (g) => {
    rr(g, 3, 2, 6, 78, 3);
    inked(g, '#c8955a', 2);
    g.fillStyle = '#222';
    g.fillRect(3.5, 10, 5, 10);
    poly(g, [3, 76, 9, 76, 18, 84, 18, 88, 3, 88]);
    inked(g, '#2a2a2a', 2);
  }],
  mic: [14, 30, 7, 20, (g) => {
    rr(g, 4, 10, 6, 18, 2);
    inked(g, '#333', 1.5);
    ellipse(g, 7, 8, 6, 7);
    inked(g, '#c0c0c0', 1.5);
    g.strokeStyle = '#777';
    g.lineWidth = 1;
    for (let i = 3; i < 13; i += 3) {
      g.beginPath();
      g.moveTo(2, i);
      g.lineTo(12, i);
      g.stroke();
    }
  }],
  coin: [16, 16, 8, 8, (g) => {
    ellipse(g, 8, 8, 6.5, 6.5);
    inked(g, '#e8c14a', 1.6);
    text(g, 'S', 8, 8.5, { size: 8, color: '#9a7410' });
  }],
  phone_handset: [30, 14, 8, 7, (g) => {
    blob(g, [2, 4, 8, 2, 22, 2, 28, 4, 28, 11, 22, 9, 8, 9, 2, 11]);
    inked(g, '#2b2b2b', 1.6);
  }],
  mop: [30, 100, 6, 20, (g) => {
    rr(g, 4, 2, 5, 84, 2);
    inked(g, '#c9a064', 1.6);
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = i % 2 ? '#d8d2c0' : '#bfb8a4';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(6, 84);
      g.quadraticCurveTo(2 + i * 3, 92, -2 + i * 3.6, 98);
      g.stroke();
    }
  }],
  dictaphone: [18, 28, 9, 14, (g) => {
    rr(g, 2, 2, 14, 24, 3);
    inked(g, '#3a3a44', 1.6);
    rr(g, 4, 6, 10, 7, 1);
    inked(g, '#9ab', 1);
    g.fillStyle = '#e33';
    ellipse(g, 6, 19, 1.6, 1.6);
    g.fill();
  }],
  flowers: [26, 40, 8, 30, (g) => {
    rr(g, 5, 22, 8, 16, 2);
    inked(g, '#9fd3ff', 1.4);
    for (const [x, y, c] of [[6, 10, '#ff5a7a'], [14, 6, '#ffd24a'], [20, 14, '#b57aff'], [10, 16, '#ff9a3a']] as const) {
      ellipse(g, x, y, 4, 4);
      inked(g, c, 1.2);
    }
  }],
  puck: [20, 12, 10, 6, (g) => {
    ellipse(g, 10, 7, 8, 4);
    inked(g, '#111', 1.4);
    ellipse(g, 10, 5, 8, 3.2);
    inked(g, '#2a2a2a', 1.2);
  }],
  bombpuck: [24, 16, 12, 8, (g) => {
    ellipse(g, 12, 9, 10, 5);
    inked(g, '#111', 1.4);
    ellipse(g, 12, 6.5, 10, 4);
    inked(g, '#2a2a2a', 1.2);
    g.fillStyle = '#ff3030';
    ellipse(g, 12, 6.5, 2.2, 1.4);
    g.fill();
  }],
  chatterteeth: [22, 18, 11, 9, (g) => {
    rr(g, 2, 3, 18, 12, 5);
    inked(g, '#ff7aa0', 1.4);
    g.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) g.fillRect(4 + i * 3, 6, 2, 3);
  }],
  keycard: [20, 14, 10, 7, (g) => {
    rr(g, 1, 1, 18, 12, 2);
    inked(g, '#ffffff', 1.4);
    g.fillStyle = '#2d5fa0';
    g.fillRect(2, 2, 16, 3);
    text(g, 'DM', 10, 9, { size: 5, font: 'Arial' });
  }],
  pass: [22, 30, 11, 4, (g) => {
    g.strokeStyle = '#1f4fd1';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(11, 0);
    g.lineTo(11, 6);
    g.stroke();
    rr(g, 2, 6, 18, 22, 2);
    inked(g, '#fff', 1.4);
    g.fillStyle = '#1f4fd1';
    g.fillRect(3, 7, 16, 5);
    text(g, 'ALL-STAR', 11, 9.5, { size: 3.6, color: '#fff', font: 'Arial' });
    rr(g, 6, 14, 10, 10, 1);
    inked(g, '#ddd', 1);
  }],
  mug: [22, 22, 11, 20, (g) => {
    rr(g, 3, 3, 14, 17, 2);
    inked(g, '#ffffff', 1.6);
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(18, 11, 4, -1.4, 1.4);
    g.stroke();
    text(g, "WORLD'S", 10, 8, { size: 3.2, font: 'Arial' });
    text(g, 'BEST', 10, 12, { size: 3.6, font: 'Arial' });
    text(g, 'AGENT', 10, 16, { size: 3.2, font: 'Arial' });
  }],
  beet: [22, 26, 11, 24, (g) => {
    g.strokeStyle = '#3f8a3a';
    g.lineWidth = 2.5;
    for (const dx of [-5, 0, 5]) {
      g.beginPath();
      g.moveTo(11, 10);
      g.quadraticCurveTo(11 + dx, 4, 11 + dx * 1.6, 1);
      g.stroke();
    }
    blob(g, [11, 9, 18, 13, 16, 21, 11, 25, 6, 21, 4, 13]);
    inked(g, '#8a1848', 1.6);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    ellipse(g, 8, 14, 1.5, 2.5);
    g.fill();
  }],
  hairgel: [18, 26, 9, 25, (g) => {
    rr(g, 3, 7, 12, 18, 3);
    inked(g, '#4ac0ff', 1.6);
    rr(g, 5, 2, 8, 6, 1);
    inked(g, '#222', 1.4);
    text(g, 'GEL', 9, 17, { size: 5, color: '#fff' });
  }],

  // ------------------------------------------------------------ supermarket / warehouse
  shelf: [230, 200, 115, 196, (g) => {
    g.fillStyle = '#8b939c';
    g.fillRect(4, 0, 8, 196);
    g.fillRect(218, 0, 8, 196);
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.strokeRect(4, 0, 8, 196);
    g.strokeRect(218, 0, 8, 196);
    const r = rng(11);
    for (let s = 0; s < 4; s++) {
      const y = 36 + s * 48;
      g.fillStyle = '#e07a2f';
      g.fillRect(4, y, 222, 7);
      g.strokeRect(4, y, 222, 7);
      let x = 14;
      while (x < 212) {
        const w = 22 + r() * 8;
        const h = 18 + r() * 14;
        paperReam(g, x, y - h, Math.min(w, 214 - x), h, r() > 0.8 ? 'FOOD' : 'DM', r() > 0.7 ? '#e9f1f7' : '#f3efe4');
        x += w + 2;
      }
    }
  }],
  pallet: [120, 80, 60, 76, (g) => {
    for (let i = 0; i < 3; i++) {
      rr(g, 6, 58 + i * 0, 108, 16, 2);
    }
    inked(g, '#b88a52', 2);
    const r = rng(3);
    for (let row = 0; row < 3; row++) for (let c = 0; c < 4; c++) paperReam(g, 8 + c * 26, 40 - row * 18, 25, 18, r() > 0.5 ? 'DM' : 'PAPER');
  }],
  forklift: [150, 130, 75, 126, (g) => {
    rr(g, 20, 60, 90, 50, 8);
    inked(g, '#f2b400');
    rr(g, 40, 20, 50, 44, 4);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = 'rgba(160,210,255,0.35)';
    g.fill();
    ellipse(g, 40, 112, 14, 14);
    inked(g, '#222');
    ellipse(g, 94, 112, 14, 14);
    inked(g, '#222');
    g.fillStyle = '#555';
    g.fillRect(112, 10, 6, 110);
    g.fillRect(118, 104, 30, 6);
    text(g, 'NOT A TOY', 65, 88, { size: 11, color: '#222' });
  }],
  register: [150, 90, 75, 86, (g) => {
    rr(g, 4, 30, 142, 56, 4);
    inked(g, '#6d7680');
    g.fillStyle = '#2b2b2b';
    g.fillRect(10, 36, 130, 8);
    rr(g, 90, 4, 40, 30, 3);
    inked(g, '#3a3f45');
    g.fillStyle = '#6cff9a';
    g.fillRect(96, 10, 28, 9);
    text(g, 'CHECKOUT', 50, 64, { size: 14, color: '#fff' });
  }],
  aislesign: [100, 60, 50, 58, (g) => {
    g.strokeStyle = '#555';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(30, 0);
    g.lineTo(30, 10);
    g.moveTo(70, 0);
    g.lineTo(70, 10);
    g.stroke();
    rr(g, 4, 10, 92, 44, 3);
    inked(g, '#f8f8f0', 2);
    text(g, 'AISLE 5', 50, 26, { size: 15, font: FONT_HAND, color: '#1a3fb0', rot: -0.05 });
    text(g, 'hair gel / "food"', 50, 44, { size: 9, font: FONT_HAND, color: '#333', rot: 0.03 });
  }],
  cart: [80, 70, 40, 66, (g) => {
    g.strokeStyle = '#9aa3ad';
    g.lineWidth = 2;
    for (let x = 10; x < 70; x += 8) {
      g.beginPath();
      g.moveTo(x, 10);
      g.lineTo(x + 4, 44);
      g.stroke();
    }
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(4, 8);
    g.lineTo(74, 8);
    g.lineTo(70, 46);
    g.lineTo(14, 46);
    g.closePath();
    g.stroke();
    ellipse(g, 20, 60, 6, 6);
    inked(g, '#333');
    ellipse(g, 62, 60, 6, 6);
    inked(g, '#333');
  }],
  crate: [70, 60, 35, 58, (g) => {
    rr(g, 3, 3, 64, 54, 3);
    inked(g, '#b98c52');
    g.strokeStyle = shade('#b98c52', 0.7);
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(6, 6);
    g.lineTo(64, 54);
    g.moveTo(64, 6);
    g.lineTo(6, 54);
    g.stroke();
    text(g, 'STADIUM SUPPLIES', 35, 30, { size: 7, color: '#3a2a10', rot: -0.05 });
  }],
  boxstack: [80, 90, 40, 88, (g) => {
    const r = rng(9);
    for (let i = 0; i < 3; i++) {
      const y = 60 - i * 28;
      rr(g, 6 + r() * 6, y, 64, 28, 2);
      inked(g, '#c9a26b', 2);
      text(g, 'DUNDER MIFFLIN', 40, y + 14, { size: 7, color: '#6a4a20' });
    }
  }],

  // ------------------------------------------------------------ manor / home
  couch: [210, 100, 105, 96, (g) => {
    rr(g, 8, 20, 194, 60, 18);
    inked(g, '#7a3b2e');
    rr(g, 0, 44, 36, 50, 12);
    inked(g, '#6a3226');
    rr(g, 174, 44, 36, 50, 12);
    inked(g, '#6a3226');
    rr(g, 30, 54, 150, 30, 8);
    inked(g, '#8c4636');
    g.fillStyle = '#3a1a10';
    g.fillRect(20, 90, 8, 8);
    g.fillRect(182, 90, 8, 8);
  }],
  armchair: [110, 110, 55, 106, (g) => {
    rr(g, 16, 4, 78, 74, 16);
    inked(g, '#6b2f3a');
    rr(g, 2, 50, 30, 46, 10);
    inked(g, '#5a2530');
    rr(g, 78, 50, 30, 46, 10);
    inked(g, '#5a2530');
    rr(g, 26, 62, 58, 30, 8);
    inked(g, '#7d3a46');
    g.fillStyle = '#2a120a';
    g.fillRect(18, 98, 7, 10);
    g.fillRect(86, 98, 7, 10);
  }],
  fireplaceTV: [150, 130, 75, 126, (g) => {
    rr(g, 4, 20, 142, 104, 4);
    inked(g, '#b9a58a');
    rr(g, 20, 36, 110, 70, 3);
    inked(g, '#141414');
    const gr = g.createLinearGradient(0, 100, 0, 50);
    gr.addColorStop(0, '#ffcc33');
    gr.addColorStop(1, '#ff4d1a');
    g.fillStyle = gr;
    for (let i = 0; i < 5; i++) {
      blob(g, [34 + i * 18, 102, 42 + i * 18, 70 - (i % 2) * 12, 50 + i * 18, 102]);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.fillRect(24, 40, 26, 4);
    text(g, '▶ FIREPLACE_HD.mpg', 75, 98, { size: 7, color: '#fff', font: 'monospace' });
    rr(g, 0, 10, 150, 14, 2);
    inked(g, '#8a6a4a');
  }],
  portrait: [110, 130, 55, 126, (g) => {
    rr(g, 4, 4, 102, 122, 3);
    inked(g, '#c9962f', 3);
    rr(g, 12, 12, 86, 106, 2);
    inked(g, '#2a3a5a', 2);
    // Scarn painted in oils (badly)
    ellipse(g, 55, 52, 20, 24);
    inked(g, '#f2c29b', 2);
    blob(g, [34, 46, 38, 30, 56, 26, 74, 32, 76, 44, 64, 38, 46, 38, 38, 48]);
    inked(g, '#3a2618', 2);
    poly(g, [30, 118, 36, 82, 55, 76, 74, 82, 80, 118]);
    inked(g, '#1d1f2a', 2);
    g.fillStyle = '#fff';
    poly(g, [50, 78, 60, 78, 55, 96]);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(47, 60);
    g.quadraticCurveTo(56, 64, 63, 58);
    g.stroke();
    text(g, 'M. SCARN', 55, 110, { size: 8, color: '#e8c14a' });
  }],
  trophyshelf: [120, 150, 60, 146, (g) => {
    rr(g, 4, 4, 112, 142, 3);
    inked(g, '#6a4a2e');
    for (let s = 0; s < 3; s++) {
      g.fillStyle = '#4a321e';
      g.fillRect(8, 46 + s * 46, 104, 5);
      for (let i = 0; i < 3; i++) {
        const x = 22 + i * 36;
        const y = 44 + s * 46;
        poly(g, [x - 8, y - 22, x + 8, y - 22, x + 4, y - 10, x - 4, y - 10]);
        inked(g, '#f1c94a', 1.6);
        g.fillStyle = '#c8921f';
        g.fillRect(x - 2, y - 10, 4, 6);
        g.fillRect(x - 6, y - 4, 12, 4);
      }
    }
    text(g, 'BEST SPY 2003', 60, 14, { size: 7, color: '#f1c94a' });
  }],
  lamp: [40, 120, 20, 118, (g) => {
    poly(g, [6, 4, 34, 4, 38, 34, 2, 34]);
    inked(g, '#f5e6b8');
    g.fillStyle = '#6a5a4a';
    g.fillRect(18, 34, 4, 78);
    rr(g, 8, 110, 24, 8, 3);
    inked(g, '#6a5a4a');
  }],
  laptop: [70, 50, 35, 48, (g) => {
    poly(g, [10, 4, 60, 4, 62, 38, 8, 38]);
    inked(g, '#3a3f46');
    rr(g, 13, 7, 44, 28, 2);
    inked(g, '#1a2a4a', 1.4);
    poly(g, [2, 38, 68, 38, 64, 46, 6, 46]);
    inked(g, '#9aa3ad');
  }],
  laptopECG: [90, 80, 45, 78, (g) => {
    poly(g, [12, 6, 78, 6, 80, 56, 10, 56]);
    inked(g, '#3a3f46');
    rr(g, 15, 9, 60, 44, 2);
    inked(g, '#021a0a', 1.4);
    g.strokeStyle = '#3cff6a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(18, 34);
    const pts = [26, 34, 30, 34, 33, 20, 36, 44, 39, 30, 44, 34, 58, 34, 61, 24, 64, 40, 67, 34, 72, 34];
    for (let i = 0; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.stroke();
    text(g, 'Windows XP', 45, 14, { size: 5, color: '#8fd', font: 'Arial' });
    poly(g, [2, 56, 88, 56, 84, 66, 6, 66]);
    inked(g, '#9aa3ad');
    g.fillStyle = '#333';
    g.fillRect(40, 66, 10, 12);
  }],
  plant: [60, 110, 30, 108, (g) => {
    rr(g, 14, 76, 32, 32, 4);
    inked(g, '#b0643a');
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.35;
      g.beginPath();
      g.ellipse(30 + Math.cos(a) * 18, 60 + Math.sin(a) * 34, 7, 20, a + Math.PI / 2, 0, Math.PI * 2);
      inked(g, i % 2 ? '#3f9a4a' : '#2f7a3a', 2);
    }
  }],
  rug: [300, 90, 150, 45, (g) => {
    ellipse(g, 150, 45, 146, 40);
    inked(g, '#8a2a2a', 2);
    ellipse(g, 150, 45, 120, 30);
    g.strokeStyle = '#e8c14a';
    g.lineWidth = 3;
    g.stroke();
  }],
  photo_catherine: [50, 60, 25, 58, (g) => {
    rr(g, 3, 3, 44, 54, 2);
    inked(g, '#e8c14a', 2);
    rr(g, 8, 8, 34, 40, 1);
    const gr = g.createRadialGradient(25, 26, 2, 25, 26, 26);
    gr.addColorStop(0, '#ffe6ff');
    gr.addColorStop(1, '#b58ad8');
    inked(g, gr, 1);
    ellipse(g, 25, 24, 8, 10);
    g.fillStyle = '#f6d2b5';
    g.fill();
    ellipse(g, 22, 15, 9, 6);
    g.fillStyle = '#8a3b1f';
    g.fill();
    text(g, '♥', 25, 52, { size: 7, color: '#c24a6a' });
  }],
  doorsign: [120, 40, 60, 20, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(4, 4, 112, 32);
    g.strokeStyle = '#bbb';
    g.strokeRect(4, 4, 112, 32);
    text(g, 'SCARN MANOR', 60, 20, { size: 14, font: '"Times New Roman", serif', color: '#222' });
    g.fillStyle = 'rgba(230,230,200,0.8)';
    g.fillRect(0, 0, 14, 8);
    g.fillRect(106, 0, 14, 8);
  }],
  window: [140, 120, 70, 60, (g) => {
    rr(g, 4, 4, 132, 112, 3);
    inked(g, '#f0ede4');
    const gr = g.createLinearGradient(0, 10, 0, 110);
    gr.addColorStop(0, '#8fc6ff');
    gr.addColorStop(1, '#d9eeff');
    rr(g, 12, 12, 116, 96, 2);
    inked(g, gr, 2);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(70, 12);
    g.lineTo(70, 108);
    g.moveTo(12, 60);
    g.lineTo(128, 60);
    g.stroke();
  }],
  door: [90, 170, 45, 168, (g) => {
    rr(g, 4, 4, 82, 164, 3);
    inked(g, '#8a6a4a');
    rr(g, 14, 16, 62, 60, 3);
    g.strokeStyle = shade('#8a6a4a', 0.7);
    g.lineWidth = 2;
    g.stroke();
    rr(g, 14, 90, 62, 64, 3);
    g.stroke();
    ellipse(g, 72, 90, 4, 4);
    inked(g, '#e8c14a', 1.5);
  }],
  metaldoor: [100, 180, 50, 178, (g) => {
    rr(g, 4, 4, 92, 174, 2);
    inked(g, '#6f7a84');
    g.fillStyle = '#56606a';
    g.fillRect(12, 12, 76, 24);
    rr(g, 70, 90, 16, 6, 2);
    inked(g, '#c9c9c9', 1.5);
    text(g, 'AUTHORIZED', 50, 60, { size: 9, color: '#fff' });
    text(g, 'PERSONNEL ONLY', 50, 72, { size: 7, color: '#fff' });
  }],
  phone: [44, 30, 22, 28, (g) => {
    rr(g, 4, 10, 36, 18, 4);
    inked(g, '#2b2b2b');
    blob(g, [2, 8, 10, 2, 34, 2, 42, 8, 36, 12, 8, 12]);
    inked(g, '#3a3a3a');
    g.fillStyle = '#9ab';
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) g.fillRect(10 + c * 6, 15 + r * 5, 3, 3);
  }],
  sidetable: [70, 70, 35, 68, (g) => {
    rr(g, 2, 4, 66, 10, 2);
    inked(g, '#6a4a2e');
    g.fillStyle = '#4a321e';
    g.fillRect(10, 14, 6, 54);
    g.fillRect(54, 14, 6, 54);
  }],

  // ------------------------------------------------------------ hockey / training
  cone: [30, 34, 15, 32, (g) => {
    poly(g, [15, 2, 24, 28, 6, 28]);
    inked(g, '#ff7a1a', 2);
    g.fillStyle = '#fff';
    g.fillRect(9, 16, 12, 4);
    rr(g, 2, 27, 26, 5, 1);
    inked(g, '#ff7a1a', 2);
  }],
  officechair: [60, 80, 30, 78, (g) => {
    rr(g, 12, 2, 36, 40, 8);
    inked(g, '#2a2a30');
    rr(g, 8, 40, 44, 12, 5);
    inked(g, '#2a2a30');
    g.fillStyle = '#777';
    g.fillRect(28, 52, 4, 16);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(8, 72);
    g.lineTo(52, 72);
    g.stroke();
    for (const x of [8, 30, 52]) {
      ellipse(g, x, 75, 3.5, 3.5);
      inked(g, '#111', 1.5);
    }
  }],
  goldchair: [70, 96, 35, 94, (g) => {
    rr(g, 12, 2, 46, 52, 10);
    inked(g, '#e8b83a');
    rr(g, 8, 50, 54, 14, 6);
    inked(g, '#d6a430');
    g.fillStyle = '#b8862a';
    g.fillRect(33, 64, 5, 18);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(8, 86);
    g.lineTo(62, 86);
    g.stroke();
    for (const x of [8, 35, 62]) {
      ellipse(g, x, 89, 4, 4);
      inked(g, '#b8862a', 1.5);
    }
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.fillRect(20, 8, 6, 30);
    text(g, 'spray paint', 35, 58, { size: 5, color: '#7a5a10', font: 'Arial' });
  }],
  target: [70, 90, 35, 88, (g) => {
    g.fillStyle = '#6a4a2e';
    g.fillRect(32, 50, 6, 38);
    for (let i = 0; i < 4; i++) {
      ellipse(g, 35, 34, 30 - i * 7, 30 - i * 7);
      inked(g, i % 2 ? '#ffffff' : '#d62828', 2);
    }
    ellipse(g, 35, 34, 5, 5);
    inked(g, '#f1c94a', 1.5);
  }],
  goldtarget: [70, 100, 35, 98, (g) => {
    g.fillStyle = '#6a4a2e';
    g.fillRect(32, 60, 6, 38);
    rr(g, 6, 4, 58, 62, 6);
    inked(g, '#f4f4f0', 2);
    ellipse(g, 35, 32, 18, 22);
    inked(g, '#f1c94a', 2);
    g.fillStyle = INK;
    ellipse(g, 30, 28, 2, 2);
    g.fill();
    ellipse(g, 40, 28, 2, 2);
    g.fill();
    g.beginPath();
    g.arc(35, 38, 7, 0.2, Math.PI - 0.2);
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.stroke();
    text(g, 'GOLDENFACE', 35, 60, { size: 6 });
  }],
  tire: [60, 40, 30, 38, (g) => {
    ellipse(g, 30, 20, 27, 17);
    inked(g, '#222');
    ellipse(g, 30, 20, 12, 7);
    inked(g, '#6a8a5a', 2);
  }],
  goal: [110, 90, 55, 88, (g) => {
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 1;
    for (let x = 10; x < 100; x += 8) {
      g.beginPath();
      g.moveTo(x, 10);
      g.lineTo(x + 6, 80);
      g.stroke();
    }
    for (let y = 14; y < 80; y += 8) {
      g.beginPath();
      g.moveTo(8, y);
      g.lineTo(102, y);
      g.stroke();
    }
    g.strokeStyle = '#d62828';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(6, 86);
    g.lineTo(6, 8);
    g.lineTo(104, 8);
    g.lineTo(104, 86);
    g.stroke();
  }],
  // Eggs a la Scarn
  fryingpan: [90, 34, 10, 17, (g) => {
    g.fillStyle = '#2a2a2a';
    g.fillRect(44, 14, 44, 7);
    ellipse(g, 26, 17, 24, 14);
    inked(g, '#3a3a3a', 3);
    ellipse(g, 20, 16, 8, 6);
    inked(g, '#ffffff', 1.5);
    ellipse(g, 20, 16, 3, 3);
    inked(g, '#ffc21a', 1);
    ellipse(g, 32, 19, 7, 5);
    inked(g, '#ffffff', 1.5);
    ellipse(g, 32, 19, 2.5, 2.5);
    inked(g, '#ffc21a', 1);
  }],
  mirror: [90, 120, 45, 118, (g) => paintMirror(g, false)],
  mirror_broken: [90, 120, 45, 118, (g) => paintMirror(g, true)],
  // Chad, rolled up in the American flag. Tasteful. Patriotic.
  flagburrito: [150, 60, 75, 58, (g) => {
    rr(g, 10, 10, 130, 44, 20);
    g.save();
    g.clip();
    for (let i = 0; i < 7; i++) {
      g.fillStyle = i % 2 ? '#f4f4f4' : '#c8242c';
      g.fillRect(10, 10 + i * 6.3, 130, 6.3);
    }
    g.fillStyle = '#1f3a8a';
    g.fillRect(10, 10, 46, 22);
    g.fillStyle = '#ffffff';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) g.fillRect(14 + c * 8, 13 + r * 6, 2, 2);
    g.restore();
    rr(g, 10, 10, 130, 44, 20);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.stroke();
    // Chad's feet sticking out, still in sauna socks
    ellipse(g, 140, 26, 8, 6);
    inked(g, '#f2c29b', 2);
    ellipse(g, 140, 40, 8, 6);
    inked(g, '#f2c29b', 2);
  }],
  locker: [60, 170, 30, 168, (g) => {
    rr(g, 3, 3, 54, 164, 2);
    inked(g, '#3d6fb0');
    g.strokeStyle = shade('#3d6fb0', 0.7);
    g.lineWidth = 2;
    for (let y = 16; y < 40; y += 6) {
      g.beginPath();
      g.moveTo(14, y);
      g.lineTo(46, y);
      g.stroke();
    }
    rr(g, 44, 80, 6, 18, 2);
    inked(g, '#c9c9c9', 1.5);
  }],
  lockerOpen: [60, 170, 30, 168, (g) => {
    rr(g, 3, 3, 54, 164, 2);
    inked(g, '#1a2530');
    poly(g, [3, 3, -8, 10, -8, 160, 3, 167]);
    inked(g, '#3d6fb0');
  }],
  bench: [160, 50, 80, 48, (g) => {
    rr(g, 2, 10, 156, 14, 3);
    inked(g, '#b88a52');
    g.fillStyle = '#555';
    g.fillRect(14, 24, 6, 24);
    g.fillRect(140, 24, 6, 24);
  }],
  heater: [60, 70, 30, 68, (g) => {
    rr(g, 8, 20, 44, 46, 4);
    inked(g, '#7a7a7a');
    g.fillStyle = '#ff6a1a';
    for (let i = 0; i < 4; i++) g.fillRect(14, 28 + i * 8, 32, 3);
    poly(g, [2, 24, 58, 18, 56, 32, 6, 36]);
    inked(g, '#f4f4f4', 2);
    text(g, 'SAUNA', 30, 50, { size: 9, color: '#fff', stroke: INK, strokeW: 2 });
  }],
  boommic: [200, 60, 190, 30, (g) => {
    g.fillStyle = '#444';
    g.fillRect(0, 26, 170, 5);
    blob(g, [168, 18, 196, 18, 199, 30, 196, 42, 168, 42, 164, 30]);
    inked(g, '#5a5a5a', 2);
    g.fillStyle = '#6a6a6a';
    for (let i = 0; i < 12; i++) g.fillRect(168 + (i % 6) * 5, 20 + Math.floor(i / 6) * 12, 2, 8);
  }],
  instacam: [60, 50, 30, 48, (g) => {
    rr(g, 4, 10, 52, 36, 5);
    inked(g, '#f4f4f0');
    ellipse(g, 30, 28, 12, 12);
    inked(g, '#222');
    ellipse(g, 30, 28, 6, 6);
    inked(g, '#4a6a9a', 1.5);
    g.fillStyle = '#e33';
    g.fillRect(10, 14, 8, 5);
    g.fillStyle = '#ffcf3a';
    for (let i = 0; i < 4; i++) g.fillRect(4 + i * 13, 42, 13, 4);
  }],
  polaroid: [24, 28, 12, 14, (g) => {
    rr(g, 1, 1, 22, 26, 1);
    inked(g, '#ffffff', 1.4);
    g.fillStyle = '#3a4a5a';
    g.fillRect(4, 4, 16, 16);
    ellipse(g, 12, 11, 4, 5);
    g.fillStyle = '#f2c29b';
    g.fill();
  }],
  wateringcan: [140, 90, 70, 10, (g) => {
    g.fillStyle = '#f2c29b';
    rr(g, 0, 0, 40, 30, 10);
    inked(g, '#f2c29b', 2);
    rr(g, 30, 20, 70, 50, 10);
    inked(g, '#3fae5a');
    poly(g, [96, 40, 138, 62, 134, 72, 96, 60]);
    inked(g, '#3fae5a', 2);
    text(g, 'RAIN', 64, 46, { size: 14, color: '#fff' });
  }],
  mustache: [30, 12, 15, 6, (g) => {
    blob(g, [2, 6, 8, 2, 15, 5, 22, 2, 28, 6, 22, 10, 15, 8, 8, 10]);
    inked(g, '#3a2618', 1.4);
  }],

  // ------------------------------------------------------------ Funky Cat
  fax: [80, 60, 40, 58, (g) => {
    rr(g, 4, 20, 72, 36, 4);
    inked(g, '#d8d4c8');
    rr(g, 16, 6, 48, 18, 2);
    inked(g, '#f4f4f0', 2);
    g.fillStyle = '#333';
    g.fillRect(12, 30, 40, 4);
    g.fillStyle = '#6cff9a';
    g.fillRect(56, 28, 14, 7);
  }],
  piano: [200, 150, 100, 146, (g) => {
    poly(g, [10, 40, 150, 30, 196, 60, 190, 100, 10, 100]);
    inked(g, '#141418');
    g.fillStyle = '#fff';
    g.fillRect(14, 96, 176, 12);
    g.fillStyle = '#111';
    for (let x = 18; x < 186; x += 7) g.fillRect(x, 96, 3, 7);
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.strokeRect(14, 96, 176, 12);
    g.fillStyle = '#222';
    g.fillRect(24, 108, 6, 38);
    g.fillRect(170, 108, 6, 38);
  }],
  micstand: [40, 140, 20, 138, (g) => {
    g.fillStyle = '#777';
    g.fillRect(18, 20, 4, 110);
    ellipse(g, 20, 134, 16, 4);
    inked(g, '#555', 2);
    ellipse(g, 20, 14, 6, 9);
    inked(g, '#c0c0c0', 2);
  }],
  stool: [40, 70, 20, 68, (g) => {
    ellipse(g, 20, 10, 18, 6);
    inked(g, '#b0283a');
    g.fillStyle = '#999';
    g.fillRect(18, 14, 4, 46);
    ellipse(g, 20, 64, 12, 3);
    inked(g, '#777', 2);
  }],
  cafetable: [80, 80, 40, 78, (g) => {
    ellipse(g, 40, 30, 36, 10);
    inked(g, '#2a1a24');
    g.fillStyle = '#555';
    g.fillRect(37, 36, 6, 36);
    ellipse(g, 40, 74, 16, 4);
    inked(g, '#444', 2);
    rr(g, 34, 10, 10, 16, 3);
    inked(g, '#fff6c8', 1.5);
    g.fillStyle = 'rgba(255,200,80,0.6)';
    ellipse(g, 39, 8, 3, 5);
    g.fill();
  }],
  vending: [100, 190, 50, 188, (g) => {
    rr(g, 4, 4, 92, 182, 4);
    inked(g, '#a01830');
    rr(g, 14, 14, 56, 130, 2);
    inked(g, '#1a1a24', 2);
    const r = rng(5);
    for (let row = 0; row < 5; row++)
      for (let c = 0; c < 4; c++) {
        g.fillStyle = ['#ffcc33', '#33ccff', '#ff6699', '#99ff66'][Math.floor(r() * 4)];
        g.fillRect(18 + c * 13, 20 + row * 25, 9, 14);
      }
    rr(g, 76, 40, 14, 40, 2);
    inked(g, '#ccc', 1.5);
    text(g, 'BAR', 50, 160, { size: 16, color: '#fff' });
  }],
  discoball: [60, 120, 30, 118, (g) => {
    g.strokeStyle = '#999';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(30, 0);
    g.lineTo(30, 70);
    g.stroke();
    ellipse(g, 30, 94, 24, 24);
    inked(g, '#c9d2dc', 2);
    within(g, () => {
      for (let y = 70; y < 120; y += 6)
        for (let x = 6; x < 56; x += 6) {
          g.fillStyle = (x + y) % 12 === 0 ? '#ffffff' : '#9aa6b4';
          g.fillRect(x, y, 5, 5);
        }
    });
    text(g, 'CDs', 30, 94, { size: 7, color: '#445' });
  }],
  rope: [140, 60, 70, 58, (g) => {
    for (const x of [10, 130]) {
      g.fillStyle = '#c9a23a';
      g.fillRect(x - 3, 10, 6, 44);
      ellipse(g, x, 56, 10, 3);
      inked(g, '#c9a23a', 2);
      ellipse(g, x, 10, 5, 5);
      inked(g, '#e8c14a', 2);
    }
    g.strokeStyle = '#d8d8d8';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(10, 14);
    for (let i = 0; i <= 20; i++) g.lineTo(10 + i * 6, 14 + Math.sin(i * 1.3) * 3 + Math.sin((i / 20) * Math.PI) * 12);
    g.stroke();
    text(g, 'phone cord', 70, 40, { size: 7, color: '#bbb', font: 'Arial' });
  }],
  napkin: [30, 24, 15, 12, (g) => {
    poly(g, [2, 4, 28, 2, 26, 22, 4, 20]);
    inked(g, '#fffdf0', 1.4);
    text(g, 'desrever', 15, 12, { size: 5, color: '#1a3fb0', font: FONT_HAND });
  }],
  setlist: [30, 34, 15, 17, (g) => {
    poly(g, [2, 2, 28, 3, 27, 32, 3, 31]);
    inked(g, '#fffdf0', 1.4);
    g.fillStyle = '#444';
    for (let i = 0; i < 5; i++) g.fillRect(6, 8 + i * 5, 12 + (i % 3) * 3, 1.6);
  }],

  // ------------------------------------------------------------ stadium tunnels
  camera: [50, 40, 10, 10, (g) => {
    g.fillStyle = '#666';
    g.fillRect(4, 4, 10, 8);
    rr(g, 10, 8, 34, 18, 4);
    inked(g, '#e8e8e8', 2);
    rr(g, 40, 11, 8, 12, 2);
    inked(g, '#333', 2);
    g.fillStyle = '#ff2020';
    ellipse(g, 18, 14, 2, 2);
    g.fill();
  }],
  terminal: [80, 110, 40, 108, (g) => {
    rr(g, 10, 4, 60, 44, 3);
    inked(g, '#2a2a30');
    rr(g, 15, 9, 50, 34, 2);
    inked(g, '#0a2a14', 1.5);
    text(g, 'MAINFRAME', 40, 26, { size: 8, color: '#6cff9a', font: 'monospace' });
    g.fillStyle = '#e8e2d0';
    rr(g, 4, 56, 72, 18, 2);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = 'rgba(210,200,160,0.9)';
    g.fillRect(0, 54, 12, 6);
    g.fillRect(68, 54, 12, 6);
    g.fillStyle = '#999';
    g.fillRect(38, 74, 4, 32);
  }],
  vent: [90, 60, 45, 58, (g) => {
    rr(g, 4, 4, 82, 52, 3);
    inked(g, '#c9a26b');
    g.fillStyle = '#6a4a20';
    for (let y = 12; y < 50; y += 8) g.fillRect(12, y, 66, 3);
    text(g, 'VENT (BOX)', 45, 50, { size: 6, color: '#3a2a10' });
  }],
  cage: [240, 170, 120, 168, (g) => {
    g.strokeStyle = '#8a8f96';
    g.lineWidth = 4;
    for (let x = 6; x <= 234; x += 18) {
      g.beginPath();
      g.moveTo(x, 6);
      g.lineTo(x, 166);
      g.stroke();
    }
    g.lineWidth = 6;
    g.strokeStyle = '#6a6f76';
    g.strokeRect(4, 4, 232, 162);
    text(g, 'CONCESSION STAFF ONLY', 120, 20, { size: 11, color: '#fff', stroke: INK, strokeW: 3 });
  }],
  trophy: [50, 80, 25, 78, (g) => {
    poly(g, [6, 4, 44, 4, 38, 38, 12, 38]);
    inked(g, '#f1c94a', 2);
    g.strokeStyle = INK;
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(8, 16, 8, 1.5, 4.7);
    g.stroke();
    g.beginPath();
    g.arc(42, 16, 8, -1.6, 1.6);
    g.stroke();
    rr(g, 20, 38, 10, 20, 2);
    inked(g, '#d6a430', 2);
    rr(g, 8, 58, 34, 18, 2);
    inked(g, '#6a4a2e', 2);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(14, 8, 4, 22);
  }],
  pipe: [300, 30, 0, 15, (g) => {
    rr(g, 0, 4, 300, 22, 10);
    inked(g, '#c8b88a', 2);
    for (let x = 30; x < 300; x += 60) {
      g.fillStyle = '#a89868';
      g.fillRect(x, 4, 6, 22);
    }
    text(g, 'WRAPPING PAPER TUBE', 150, 15, { size: 7, color: '#6a5a3a' });
  }],
  fogmachine: [60, 40, 30, 38, (g) => {
    rr(g, 4, 10, 52, 26, 4);
    inked(g, '#333');
    rr(g, 50, 16, 10, 8, 2);
    inked(g, '#555', 2);
    text(g, 'FOG 3000', 28, 24, { size: 7, color: '#ddd' });
  }],

  // ------------------------------------------------------------ hospital / oval office
  bed: [220, 110, 110, 106, (g) => {
    g.fillStyle = '#9aa3ad';
    g.fillRect(10, 60, 200, 10);
    g.fillRect(14, 70, 6, 36);
    g.fillRect(200, 70, 6, 36);
    rr(g, 6, 40, 208, 24, 6);
    inked(g, '#f4f4f4');
    rr(g, 10, 28, 50, 20, 8);
    inked(g, '#ffffff');
    text(g, 'CORPORATE WELLNESS COT', 110, 88, { size: 7, color: '#666' });
  }],
  iv: [50, 170, 25, 168, (g) => {
    g.fillStyle = '#aab';
    g.fillRect(23, 20, 4, 140);
    ellipse(g, 25, 164, 16, 4);
    inked(g, '#889', 2);
    g.fillRect(10, 18, 30, 3);
    rr(g, 12, 22, 22, 32, 4);
    inked(g, '#ffb347', 2);
    text(g, 'JUICE', 23, 36, { size: 6, color: '#fff' });
    text(g, 'POUCH', 23, 44, { size: 5, color: '#fff' });
    g.strokeStyle = '#ddd';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(23, 54);
    g.quadraticCurveTo(10, 100, 0, 120);
    g.stroke();
  }],
  clipboard: [34, 44, 17, 22, (g) => {
    rr(g, 2, 4, 30, 38, 2);
    inked(g, '#b88a52', 1.6);
    rr(g, 5, 8, 24, 30, 1);
    inked(g, '#fff', 1);
    rr(g, 11, 1, 12, 6, 2);
    inked(g, '#aaa', 1.2);
    g.fillStyle = '#555';
    for (let i = 0; i < 5; i++) g.fillRect(8, 13 + i * 5, 16, 1.4);
  }],
  flag: [80, 200, 40, 198, (g) => {
    g.fillStyle = '#c9a23a';
    g.fillRect(12, 10, 5, 186);
    ellipse(g, 14, 8, 5, 5);
    inked(g, '#e8c14a', 2);
    ellipse(g, 14, 194, 16, 4);
    inked(g, '#6a4a2e', 2);
    g.beginPath();
    g.moveTo(17, 16);
    for (let i = 0; i <= 10; i++) g.lineTo(17 + i * 6, 16 + Math.sin(i * 0.8) * 5);
    for (let i = 10; i >= 0; i--) g.lineTo(17 + i * 6, 96 + Math.sin(i * 0.8) * 5);
    g.closePath();
    within(g, () => {
      for (let s = 0; s < 13; s++) {
        g.fillStyle = s % 2 ? '#ffffff' : '#c0152a';
        g.fillRect(10, 12 + s * 6.6, 80, 6.6);
      }
      g.fillStyle = '#1c2b6a';
      g.fillRect(10, 10, 32, 40);
      g.fillStyle = '#fff';
      for (let i = 0; i < 12; i++) g.fillRect(20 + (i % 4) * 5, 18 + Math.floor(i / 4) * 9, 2, 2);
    });
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.stroke();
  }],
  seal: [120, 120, 60, 60, (g) => {
    ellipse(g, 60, 60, 54, 54);
    inked(g, '#1c2b6a', 3);
    ellipse(g, 60, 60, 44, 44);
    inked(g, '#f3efe4', 2);
    text(g, 'SEAL OF THE', 60, 34, { size: 9, color: '#1c2b6a' });
    text(g, 'PRESIDENT', 60, 46, { size: 11, color: '#1c2b6a' });
    blob(g, [60, 56, 76, 64, 72, 84, 60, 90, 48, 84, 44, 64]);
    inked(g, '#b88a52', 2);
    text(g, '(printed @ Kinko\'s)', 60, 100, { size: 6, color: '#555', font: 'Arial' });
  }],
  desk: [240, 100, 120, 96, (g) => {
    rr(g, 4, 10, 232, 20, 3);
    inked(g, '#6a4a2e');
    rr(g, 12, 30, 216, 62, 3);
    inked(g, '#7d5a3a');
    g.strokeStyle = shade('#7d5a3a', 0.7);
    g.lineWidth = 2;
    rr(g, 24, 40, 80, 42, 3);
    g.stroke();
    rr(g, 136, 40, 80, 42, 3);
    g.stroke();
    text(g, '(folding table + tablecloth)', 120, 88, { size: 6, color: '#3a2a1a', font: 'Arial' });
  }],
  filing: [70, 150, 35, 148, (g) => {
    rr(g, 4, 4, 62, 142, 3);
    inked(g, '#8a939c');
    for (let i = 0; i < 4; i++) {
      rr(g, 10, 12 + i * 33, 50, 28, 2);
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.stroke();
      rr(g, 26, 22 + i * 33, 18, 5, 2);
      inked(g, '#ccc', 1.2);
    }
  }],
  stapler: [40, 20, 20, 18, (g) => {
    blob(g, [2, 14, 6, 6, 34, 4, 38, 10, 36, 16, 4, 18]);
    inked(g, '#d62828', 1.6);
  }],
  confchair: [60, 90, 30, 88, (g) => {
    rr(g, 10, 2, 40, 46, 8);
    inked(g, '#3a3a44');
    rr(g, 6, 46, 48, 14, 5);
    inked(g, '#3a3a44');
    g.fillStyle = '#888';
    g.fillRect(28, 60, 4, 20);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(8, 84);
    g.lineTo(52, 84);
    g.stroke();
  }],

  // ------------------------------------------------------------ Billy's bar
  bar: [420, 120, 210, 116, (g) => {
    rr(g, 2, 10, 416, 20, 4);
    inked(g, '#5a3420');
    rr(g, 10, 30, 400, 84, 3);
    inked(g, '#4a2a18');
    g.strokeStyle = shade('#4a2a18', 0.7);
    g.lineWidth = 2;
    for (let x = 40; x < 400; x += 60) {
      rr(g, x, 42, 44, 60, 3);
      g.stroke();
    }
    g.fillStyle = '#c9a23a';
    g.fillRect(10, 106, 400, 4);
  }],
  jukebox: [110, 170, 55, 168, (g) => {
    g.beginPath();
    g.moveTo(6, 166);
    g.lineTo(6, 60);
    g.arc(55, 60, 49, Math.PI, 0);
    g.lineTo(104, 166);
    g.closePath();
    inked(g, '#b0283a');
    const gr = g.createLinearGradient(0, 20, 0, 110);
    gr.addColorStop(0, '#ffcc33');
    gr.addColorStop(0.5, '#ff6a9a');
    gr.addColorStop(1, '#6affff');
    g.beginPath();
    g.moveTo(18, 110);
    g.lineTo(18, 62);
    g.arc(55, 62, 37, Math.PI, 0);
    g.lineTo(92, 110);
    g.closePath();
    inked(g, gr, 2);
    rr(g, 22, 116, 66, 30, 3);
    inked(g, '#1a1a24', 2);
    g.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) g.fillRect(26 + (i % 3) * 21, 120 + Math.floor(i / 3) * 13, 17, 9);
    text(g, 'G9', 55, 156, { size: 10, color: '#fff' });
  }],
  tv: [120, 90, 60, 88, (g) => {
    rr(g, 4, 4, 112, 76, 6);
    inked(g, '#2a2a2a');
    rr(g, 12, 12, 96, 60, 4);
    inked(g, '#bbb', 2);
    const r = rng(4);
    within(g, () => {
      for (let i = 0; i < 700; i++) {
        const v = Math.floor(r() * 255);
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(12 + r() * 96, 12 + r() * 60, 2, 2);
      }
    });
    text(g, 'NO SIGNAL', 60, 42, { size: 12, color: '#fff', stroke: INK, strokeW: 3 });
    g.fillStyle = '#555';
    g.fillRect(54, 80, 12, 8);
  }],
  neon: [260, 80, 130, 40, (g) => {
    g.shadowColor = '#ff4fb0';
    g.shadowBlur = 12;
    text(g, "BILLY'S", 130, 34, { size: 46, color: '#ffd1ef', font: FONT_HAND });
    g.shadowBlur = 0;
    text(g, '(glow sticks + tape)', 130, 70, { size: 8, color: '#b88', font: 'Arial' });
  }],

  // ------------------------------------------------------------ arena / finale
  satellite: [220, 120, 110, 60, (g) => {
    for (const x of [4, 146]) {
      rr(g, x, 36, 70, 48, 2);
      inked(g, '#3b6fd6');
      g.strokeStyle = '#9ec0ff';
      g.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        g.beginPath();
        g.moveTo(x + i * 14, 36);
        g.lineTo(x + i * 14, 84);
        g.stroke();
      }
    }
    rr(g, 76, 26, 68, 68, 6);
    inked(g, '#c9a26b');
    g.fillStyle = 'rgba(220,220,230,0.85)';
    g.fillRect(80, 30, 60, 20);
    text(g, 'FRAGILE', 110, 72, { size: 10, color: '#8a1a1a' });
    text(g, 'THIS SIDE UP', 110, 84, { size: 6, color: '#3a2a10' });
    g.strokeStyle = '#ccc';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(110, 26);
    g.lineTo(110, 6);
    g.stroke();
    ellipse(g, 110, 6, 5, 5);
    inked(g, '#e33', 1.5);
  }],
  golfcart: [190, 130, 95, 126, (g) => {
    rr(g, 10, 60, 170, 46, 10);
    inked(g, '#e8b83a');
    g.fillStyle = '#c89a2a';
    g.fillRect(20, 10, 6, 54);
    g.fillRect(160, 10, 6, 54);
    rr(g, 10, 4, 170, 10, 3);
    inked(g, '#e8b83a');
    ellipse(g, 44, 110, 16, 16);
    inked(g, '#222');
    ellipse(g, 148, 110, 16, 16);
    inked(g, '#222');
    text(g, 'GETAWAY VEHICLE', 95, 84, { size: 11, color: '#3a2a08' });
  }],
  explosion: [300, 300, 150, 150, (g) => paintExplosion(g, true)],
  // Same clip-art burst without the lettering, for sitting behind titles.
  explosion_plain: [300, 300, 150, 150, (g) => paintExplosion(g, false)],
  muzzle: [40, 30, 4, 15, (g) => {
    poly(g, [2, 15, 16, 4, 20, 10, 38, 15, 20, 20, 16, 26]);
    g.fillStyle = '#fff3a0';
    g.fill();
    g.strokeStyle = '#ff9a1a';
    g.lineWidth = 2;
    g.stroke();
  }],
  jackcutout: [70, 100, 35, 98, (g) => {
    g.fillStyle = '#c9a26b';
    g.fillRect(32, 66, 5, 32);
    poly(g, [8, 70, 14, 42, 56, 42, 62, 70]);
    inked(g, '#7a2a2a', 2);
    ellipse(g, 35, 26, 15, 17);
    inked(g, '#e0a877', 2);
    blob(g, [18, 22, 22, 8, 35, 5, 50, 10, 54, 24, 58, 44, 50, 30, 20, 30, 12, 44]);
    inked(g, '#d8d4cc', 2);
    g.fillStyle = '#c0392b';
    g.fillRect(19, 16, 33, 5);
    rr(g, 2, 74, 66, 20, 3);
    inked(g, '#ffffff', 2);
    text(g, "DON'T SHOOT", 35, 84, { size: 11, color: '#c0152a' });
  }],
  cutout: [60, 90, 30, 88, (g) => {
    g.fillStyle = '#c9a26b';
    g.fillRect(28, 60, 4, 28);
    ellipse(g, 30, 22, 14, 16);
    inked(g, '#f2c29b', 2);
    poly(g, [10, 64, 16, 38, 44, 38, 50, 64]);
    inked(g, '#1f4fd1', 2);
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(30, 25, 6, 0.2, Math.PI - 0.2);
    g.stroke();
  }],
  cardboard: [120, 60, 60, 58, (g) => {
    rr(g, 4, 4, 112, 52, 2);
    inked(g, '#c9a26b');
    text(g, 'SCRANTON', 60, 30, { size: 16, color: '#3a2a10' });
  }],
  dundie: [30, 50, 15, 48, (g) => {
    ellipse(g, 15, 10, 6, 7);
    inked(g, '#f1c94a', 1.5);
    poly(g, [8, 16, 22, 16, 20, 34, 10, 34]);
    inked(g, '#f1c94a', 1.5);
    rr(g, 5, 34, 20, 12, 2);
    inked(g, '#1a1a1a', 1.5);
  }],
  sparkle: [24, 24, 12, 12, (g) => {
    poly(g, [12, 0, 14, 10, 24, 12, 14, 14, 12, 24, 10, 14, 0, 12, 10, 10]);
    g.fillStyle = '#ffffff';
    g.fill();
  }],
  star: [16, 16, 8, 8, (g) => {
    poly(g, [8, 0, 10, 6, 16, 8, 10, 10, 8, 16, 6, 10, 0, 8, 6, 6]);
    g.fillStyle = '#fff6a0';
    g.fill();
  }],
  snow: [8, 8, 4, 4, (g) => {
    ellipse(g, 4, 4, 3, 3);
    g.fillStyle = '#ffffff';
    g.fill();
  }],
  raindrop: [4, 18, 2, 9, (g) => {
    g.fillStyle = 'rgba(180,210,255,0.8)';
    g.fillRect(1, 0, 2, 18);
  }],
  dust: [16, 16, 8, 8, (g) => {
    ellipse(g, 8, 8, 7, 7);
    g.fillStyle = 'rgba(230,220,200,0.8)';
    g.fill();
  }],
  bullet: [28, 10, 14, 5, (g) => {
    rr(g, 2, 2, 24, 6, 3);
    g.fillStyle = '#fff6b0';
    g.fill();
    g.strokeStyle = '#ffb030';
    g.lineWidth = 2;
    g.stroke();
  }],
  ebullet: [22, 22, 11, 11, (g) => {
    ellipse(g, 11, 11, 8, 8);
    g.fillStyle = '#ff4d6d';
    g.fill();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3;
    g.stroke();
  }],
  goldbullet: [26, 26, 13, 13, (g) => {
    ellipse(g, 13, 13, 9, 9);
    g.fillStyle = '#ffd24a';
    g.fill();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3;
    g.stroke();
    ellipse(g, 10, 10, 3, 3);
    g.fillStyle = '#fff';
    g.fill();
  }],
  flare: [256, 256, 128, 128, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.12, 'rgba(255,240,200,0.8)');
    gr.addColorStop(0.4, 'rgba(255,180,90,0.18)');
    gr.addColorStop(1, 'rgba(255,160,60,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillRect(0, 126, 256, 4);
  }],
  flarering: [80, 80, 40, 40, (g) => {
    ellipse(g, 40, 40, 34, 34);
    g.strokeStyle = 'rgba(160,220,255,0.55)';
    g.lineWidth = 4;
    g.stroke();
    ellipse(g, 40, 40, 20, 20);
    g.fillStyle = 'rgba(255,200,120,0.18)';
    g.fill();
  }],
  exclaim: [26, 40, 13, 38, (g) => {
    rr(g, 3, 2, 20, 36, 6);
    inked(g, '#ff2a2a', 2);
    text(g, '!', 13, 19, { size: 28, color: '#fff' });
  }],
  question: [26, 40, 13, 38, (g) => {
    rr(g, 3, 2, 20, 36, 6);
    inked(g, '#ffcf3a', 2);
    text(g, '?', 13, 19, { size: 26, color: INK });
  }],
  zzz: [40, 30, 20, 15, (g) => {
    text(g, 'Z z z', 20, 15, { size: 16, color: '#fff', stroke: INK, strokeW: 3 });
  }],
  heart: [20, 18, 10, 9, (g) => {
    g.beginPath();
    g.moveTo(10, 16);
    g.bezierCurveTo(0, 8, 2, 0, 10, 5);
    g.bezierCurveTo(18, 0, 20, 8, 10, 16);
    inked(g, '#ff3b5c', 2);
  }],
};

const origins = new Map<string, [number, number]>();

export function propOrigin(key: string): [number, number] | null {
  const d = P[key];
  if (d) return [d[2] / d[0], d[3] / d[1]];
  return origins.get(key) ?? null;
}

export function hasProp(key: string): boolean {
  return key in P;
}

export function ensureProp(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;
  const d = P[key];
  if (!d) throw new Error(`Unknown prop ${key}`);
  const [w, h, , , paint] = d;
  const { c, g } = makeCanvas(w * R, h * R);
  g.scale(R, R);
  paint(g, w, h);
  scene.textures.addCanvas(key, c);
}

export function ensureProps(scene: Phaser.Scene, keys: string[]): void {
  keys.forEach((k) => ensureProp(scene, k));
}

/** Add a prop image at world position, pivoted & scaled, depth-sorted by y. */
export function addProp(scene: Phaser.Scene, key: string, x: number, y: number, scale = 1): Phaser.GameObjects.Image {
  ensureProp(scene, key);
  const o = propOrigin(key)!;
  const im = scene.add.image(x, y, key).setOrigin(o[0], o[1]).setScale(scale / R);
  im.setDepth(y);
  return im;
}

/** Register a canvas-backed texture with a custom origin (used by backgrounds). */
export function registerCanvas(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, origin?: [number, number]): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
  if (origin) origins.set(key, origin);
}

export { speckle };
