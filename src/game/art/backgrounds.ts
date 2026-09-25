import { INK, FONT_HAND, ellipse, inked, makeCanvas, poly, rng, rr, shade, speckle, text, within, blob } from './canvas';

/**
 * Environment painters. Each returns a canvas (world width x 720). The joke
 * is that every glamorous location is obviously an office, a warehouse or a
 * break room, dressed with printer-paper signs and tape.
 */
export const H = 720;
export const FLOOR_Y = 330; // wall/floor seam for most interiors

type G = CanvasRenderingContext2D;

// ---------------------------------------------------------------- helpers
function vgrad(g: G, x: number, y: number, w: number, h: number, stops: [number, string][]): void {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
}

function dropCeiling(g: G, w: number, h = 70, col = '#e9e6dc'): void {
  g.fillStyle = col;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = shade(col, 0.8);
  g.lineWidth = 2;
  for (let x = 0; x < w; x += 90) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  for (let y = 22; y < h; y += 24) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  speckle(g, 0, 0, w, h, 'rgba(0,0,0,0.08)', w / 3, 4, 1.5);
  for (let x = 120; x < w; x += 360) {
    rr(g, x, h - 30, 150, 18, 2);
    inked(g, '#fffef0', 2);
    g.fillStyle = 'rgba(255,255,230,0.12)';
    g.beginPath();
    g.moveTo(x, h - 12);
    g.lineTo(x + 150, h - 12);
    g.lineTo(x + 230, h + 120);
    g.lineTo(x - 80, h + 120);
    g.fill();
  }
  g.fillStyle = INK;
  g.fillRect(0, h - 2, w, 4);
}

function wall(g: G, w: number, top: number, bottom: number, col: string, stripes = false): void {
  vgrad(g, 0, top, w, bottom - top, [
    [0, shade(col, 1.05)],
    [1, shade(col, 0.88)],
  ]);
  if (stripes) {
    g.fillStyle = 'rgba(0,0,0,0.04)';
    for (let x = 0; x < w; x += 24) g.fillRect(x, top, 12, bottom - top);
  }
}

function baseboard(g: G, w: number, y: number, col = '#5a4a3a'): void {
  g.fillStyle = col;
  g.fillRect(0, y - 14, w, 14);
  g.fillStyle = INK;
  g.fillRect(0, y - 16, w, 3);
  g.fillRect(0, y - 1, w, 3);
}

function carpet(g: G, w: number, top: number, col: string, seed = 1): void {
  vgrad(g, 0, top, w, H - top, [
    [0, shade(col, 0.85)],
    [1, shade(col, 1.05)],
  ]);
  speckle(g, 0, top, w, H - top, 'rgba(0,0,0,0.08)', w * 2, seed, 2);
  speckle(g, 0, top, w, H - top, 'rgba(255,255,255,0.05)', w, seed + 1, 2);
}

function perspectiveFloor(g: G, w: number, top: number, col: string, lineCol: string, tile = 120): void {
  vgrad(g, 0, top, w, H - top, [
    [0, shade(col, 0.82)],
    [1, shade(col, 1.08)],
  ]);
  g.strokeStyle = lineCol;
  g.lineWidth = 2;
  let y = top;
  let step = 18;
  while (y < H) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
    y += step;
    step *= 1.25;
  }
  const vx = w / 2;
  for (let x = -w; x < w * 2; x += tile) {
    g.beginPath();
    g.moveTo(vx + (x - vx) * 0.35, top);
    g.lineTo(x, H);
    g.stroke();
  }
}

function woodFloor(g: G, w: number, top: number, col = '#a0703c'): void {
  vgrad(g, 0, top, w, H - top, [
    [0, shade(col, 0.75)],
    [1, shade(col, 1.05)],
  ]);
  const r = rng(12);
  let y = top;
  let hgt = 12;
  while (y < H) {
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, y, w, 1.5);
    for (let x = r() * 200; x < w; x += 160 + r() * 140) g.fillRect(x, y, 1.5, hgt);
    y += hgt;
    hgt *= 1.12;
  }
}

function printerSign(g: G, x: number, y: number, s: string, size = 26, rot = -0.03, w?: number): void {
  const tw = w ?? s.length * size * 0.62 + 40;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = '#fbfbf6';
  g.fillRect(-tw / 2, -size, tw, size * 2);
  g.strokeStyle = 'rgba(0,0,0,0.15)';
  g.lineWidth = 1;
  g.strokeRect(-tw / 2, -size, tw, size * 2);
  g.fillStyle = 'rgba(235,235,210,0.85)';
  g.fillRect(-tw / 2 - 6, -size - 6, 22, 10);
  g.fillRect(tw / 2 - 16, -size - 6, 22, 10);
  g.restore();
  text(g, s, x, y, { size, font: FONT_HAND, color: '#1b1b1b', rot, maxW: tw - 16 });
}

function poster(g: G, x: number, y: number, w: number, h: number, title: string, sub: string, col: string): void {
  rr(g, x, y, w, h, 2);
  inked(g, '#2a2a2a', 3);
  vgrad(g, x + 6, y + 6, w - 12, h - 12, [
    [0, col],
    [1, shade(col, 0.6)],
  ]);
  text(g, title, x + w / 2, y + h * 0.72, { size: Math.min(22, w / 7), color: '#fff' });
  text(g, sub, x + w / 2, y + h * 0.86, { size: Math.min(10, w / 16), color: '#eee', font: 'Georgia, serif', weight: '400' });
  ellipse(g, x + w / 2, y + h * 0.36, w * 0.18, w * 0.18);
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 3;
  g.stroke();
}

function fluorescentGlow(g: G, w: number): void {
  const gr = g.createLinearGradient(0, 0, 0, 260);
  gr.addColorStop(0, 'rgba(255,255,240,0.12)');
  gr.addColorStop(1, 'rgba(255,255,240,0)');
  g.fillStyle = gr;
  g.fillRect(0, 60, w, 260);
}

function windowBlinds(g: G, x: number, y: number, w: number, h: number, sky = '#8fc6ff'): void {
  rr(g, x, y, w, h, 2);
  inked(g, '#f0ede4', 3);
  vgrad(g, x + 8, y + 8, w - 16, h - 16, [
    [0, sky],
    [1, shade(sky, 1.3)],
  ]);
  g.fillStyle = 'rgba(240,240,230,0.85)';
  for (let yy = y + 10; yy < y + h * 0.55; yy += 9) g.fillRect(x + 8, yy, w - 16, 5);
}

function brick(g: G, x0: number, y0: number, w: number, h: number, col: string, seed = 3): void {
  const r = rng(seed);
  g.fillStyle = shade(col, 0.6);
  g.fillRect(x0, y0, w, h);
  for (let y = y0, row = 0; y < y0 + h; y += 22, row++) {
    for (let x = x0 - (row % 2) * 30; x < x0 + w; x += 60) {
      g.fillStyle = shade(col, 0.85 + r() * 0.3);
      g.fillRect(x + 2, y + 2, 56, 18);
    }
  }
}

function crowd(g: G, x0: number, y0: number, w: number, rows: number, seed = 1, scale = 1): void {
  // Visibly repeated fan sprites (the extras budget was one guy).
  const cols = ['#c81d25', '#1f4fd1', '#f4f4f4', '#e8b83a', '#2e9b4f'];
  const r = rng(seed);
  for (let row = 0; row < rows; row++) {
    const y = y0 + row * 34 * scale;
    for (let x = x0 + (row % 2) * 16 * scale, i = 0; x < x0 + w; x += 32 * scale, i++) {
      const c = cols[(i + row) % 3 === 0 ? 0 : Math.floor(r() * cols.length)];
      rr(g, x, y + 14 * scale, 26 * scale, 22 * scale, 6 * scale);
      inked(g, c, 1.5);
      ellipse(g, x + 13 * scale, y + 8 * scale, 8 * scale, 9 * scale);
      inked(g, i % 7 === 3 ? '#9a6440' : '#f2c29b', 1.5);
      g.fillStyle = INK;
      g.fillRect(x + 9 * scale, y + 7 * scale, 2 * scale, 2 * scale);
      g.fillRect(x + 15 * scale, y + 7 * scale, 2 * scale, 2 * scale);
      if (i % 11 === 5) {
        g.fillStyle = '#fff';
        g.fillRect(x + 4 * scale, y - 12 * scale, 22 * scale, 10 * scale);
        text(g, 'GO!', x + 15 * scale, y - 7 * scale, { size: 7 * scale, color: '#c81d25' });
      }
    }
  }
}

// ---------------------------------------------------------------- locations
export function paintMarket(w = 2400): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  wall(g, w, 0, FLOOR_Y, '#7d8a96', true);
  // corrugated metal
  g.fillStyle = 'rgba(0,0,0,0.07)';
  for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 6, FLOOR_Y);
  // steel beams + hanging lights
  g.fillStyle = '#4a525c';
  g.fillRect(0, 30, w, 14);
  for (let x = 100; x < w; x += 300) {
    g.fillStyle = '#333';
    g.fillRect(x + 60, 44, 2, 50);
    poly(g, [x + 30, 94, x + 94, 94, x + 80, 80, x + 44, 80]);
    inked(g, '#6a737c', 2);
    g.fillStyle = 'rgba(255,250,210,0.14)';
    poly(g, [x + 34, 94, x + 90, 94, x + 150, FLOOR_Y + 60, x - 26, FLOOR_Y + 60]);
    g.fill();
  }
  // Banners and jokes
  rr(g, 260, 110, 520, 64, 4);
  inked(g, '#c81d25', 3);
  text(g, 'SCRANTON SUPER MEGA MART', 520, 142, { size: 34, color: '#fff' });
  printerSign(g, 1100, 150, 'FOOD →', 24, 0.04);
  printerSign(g, 1500, 130, '0 DAYS SINCE LAST FORKLIFT INCIDENT', 16, -0.02, 420);
  printerSign(g, 2000, 160, 'PRODUCE (paper)', 20, 0.02);
  poster(g, 1780, 70, 120, 150, 'SALE', 'on 20lb bond', '#2d5fa0');
  // loading dock door
  rr(g, 1240, 150, 200, FLOOR_Y - 150, 2);
  inked(g, '#9aa3ad', 3);
  g.fillStyle = 'rgba(0,0,0,0.15)';
  for (let y = 160; y < FLOOR_Y; y += 14) g.fillRect(1244, y, 192, 3);
  text(g, 'DOCK 2', 1340, 180, { size: 16, color: '#333' });
  baseboard(g, w, FLOOR_Y, '#f2c200');
  perspectiveFloor(g, w, FLOOR_Y, '#a8a8a0', 'rgba(0,0,0,0.12)', 160);
  // yellow safety lines
  g.fillStyle = '#f2c200';
  g.fillRect(0, 440, w, 6);
  g.fillRect(0, 650, w, 6);
  speckle(g, 0, FLOOR_Y, w, H - FLOOR_Y, 'rgba(60,60,50,0.12)', 1800, 5, 3);
  return c;
}

export function paintManor(w = 1600, night = false): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  // damask wallpaper
  wall(g, w, 0, FLOOR_Y, '#6b2f3a');
  g.fillStyle = 'rgba(255,215,140,0.12)';
  for (let y = 20; y < FLOOR_Y; y += 60)
    for (let x = (y / 60) % 2 ? 30 : 0; x < w; x += 60) {
      blob(g, [x, y - 12, x + 10, y, x, y + 12, x - 10, y]);
      g.fill();
    }
  // crown molding
  g.fillStyle = '#e8d8b0';
  g.fillRect(0, 0, w, 22);
  g.fillStyle = INK;
  g.fillRect(0, 22, w, 3);
  // wainscot
  g.fillStyle = '#4a2a1e';
  g.fillRect(0, FLOOR_Y - 110, w, 110);
  g.strokeStyle = '#2a160e';
  g.lineWidth = 3;
  for (let x = 20; x < w; x += 120) g.strokeRect(x, FLOOR_Y - 96, 96, 80);
  g.fillStyle = INK;
  g.fillRect(0, FLOOR_Y - 112, w, 3);
  // big window with Scranton at day/night
  const sky = night ? '#1b2440' : '#8fc6ff';
  windowBlinds(g, 980, 60, 280, 170, sky);
  // skyline in window
  g.save();
  g.beginPath();
  g.rect(988, 68, 264, 154);
  g.clip();
  g.fillStyle = night ? '#0e1426' : '#5a6f8a';
  const r = rng(22);
  for (let x = 988; x < 1260; x += 24) {
    const h = 30 + r() * 60;
    g.fillRect(x, 222 - h, 20, h);
    if (night) {
      g.fillStyle = '#ffd86a';
      for (let i = 0; i < 4; i++) g.fillRect(x + 4 + (i % 2) * 8, 222 - h + 8 + Math.floor(i / 2) * 12, 4, 5);
      g.fillStyle = '#0e1426';
    }
  }
  g.restore();
  text(g, '(it is a condo)', 1120, 250, { size: 11, color: '#e8d8b0', font: 'Georgia, serif', weight: '400' });
  woodFloor(g, w, FLOOR_Y, '#8a5a30');
  return c;
}

export function paintLake(w = 2000): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  vgrad(g, 0, 0, w, FLOOR_Y, [
    [0, '#6fa8ff'],
    [1, '#d8ecff'],
  ]);
  // painted mountain backdrop with visible seam and tape
  for (let panel = 0; panel < Math.ceil(w / 800); panel++) {
    const x0 = panel * 800;
    g.fillStyle = panel % 2 ? '#7a8fb0' : '#8096b8';
    poly(g, [x0, FLOOR_Y, x0 + 120, 140, x0 + 260, 230, x0 + 420, 90, x0 + 600, 210, x0 + 720, 150, x0 + 800, 230, x0 + 800, FLOOR_Y]);
    g.fill();
    g.fillStyle = '#f4f8ff';
    poly(g, [x0 + 380, 128, x0 + 420, 90, x0 + 462, 132, x0 + 440, 140, x0 + 420, 128, x0 + 400, 142]);
    g.fill();
    poly(g, [x0 + 96, 170, x0 + 120, 140, x0 + 150, 172, x0 + 120, 180]);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(x0 + 798, 40, 4, FLOOR_Y - 40);
    g.fillStyle = 'rgba(230,230,200,0.9)';
    g.fillRect(x0 + 790, 60, 20, 12);
    g.fillRect(x0 + 790, 250, 20, 12);
  }
  // pine trees (cardboard, with visible stands)
  const r = rng(8);
  for (let x = 40; x < w; x += 140 + r() * 100) {
    const h = 110 + r() * 70;
    poly(g, [x, FLOOR_Y - 4, x + 36, FLOOR_Y - h, x + 72, FLOOR_Y - 4]);
    inked(g, '#2f6a44', 3);
    g.fillStyle = '#c9a26b';
    g.fillRect(x + 30, FLOOR_Y - 8, 12, 10);
  }
  // cabin facade (plywood)
  rr(g, 1320, 110, 420, FLOOR_Y - 110, 2);
  inked(g, '#8a5a30', 3);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 124; y < FLOOR_Y; y += 22) g.fillRect(1324, y, 412, 4);
  poly(g, [1300, 116, 1530, 30, 1760, 116]);
  inked(g, '#5a3a20', 3);
  printerSign(g, 1530, 150, "CHEROKEE JACK'S", 20, -0.02, 280);
  g.fillStyle = '#c9a26b';
  g.fillRect(1740, 120, 30, FLOOR_Y - 120);
  text(g, '← back of set', 1810, 200, { size: 10, color: '#555', font: 'Arial', rot: 1.57 });
  // frozen "lake" = white tarp
  vgrad(g, 0, FLOOR_Y, w, H - FLOOR_Y, [
    [0, '#dfe8f0'],
    [1, '#f7fbff'],
  ]);
  g.strokeStyle = 'rgba(120,150,180,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const x = r() * w;
    const y = FLOOR_Y + 20 + r() * (H - FLOOR_Y - 40);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 40, y + 10 - r() * 20, x + 80 + r() * 60, y + r() * 10);
    g.stroke();
  }
  text(g, 'TARP', 300, 690, { size: 18, color: 'rgba(120,150,180,0.4)' });
  return c;
}

export function paintRink(w = 2600, bigCrowd = false): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  vgrad(g, 0, 0, w, 260, [
    [0, '#10131c'],
    [1, '#232838'],
  ]);
  // stadium lights
  for (let x = 80; x < w; x += 260) {
    ellipse(g, x, 24, 22, 10);
    g.fillStyle = '#fffbe0';
    g.fill();
    g.fillStyle = 'rgba(255,250,210,0.06)';
    poly(g, [x - 20, 30, x + 20, 30, x + 160, 260, x - 160, 260]);
    g.fill();
  }
  crowd(g, 0, bigCrowd ? 60 : 110, w, bigCrowd ? 6 : 4, 3);
  // jumbotron / banner
  if (bigCrowd) {
    rr(g, w / 2 - 220, 10, 440, 50, 4);
    inked(g, '#111', 3);
    text(g, 'NHL ALL-STAR GAME', w / 2, 36, { size: 30, color: '#ffcf3a' });
  }
  // boards with sponsor ads
  const bTop = 270;
  g.fillStyle = '#f4f4f4';
  g.fillRect(0, bTop, w, 64);
  g.fillStyle = '#d62828';
  g.fillRect(0, bTop + 56, w, 8);
  const ads = [
    ['DUNDER MIFFLIN', 'Limitless Paper in a Paperless World', '#2d5fa0'],
    ['SCHRUTE FARMS', 'Beets • Bed • Breakfast', '#8a1848'],
    ['VANCE REFRIGERATION', 'We keep it cool', '#2e7d4f'],
    ['SERENITY BY JAN', 'Candles', '#9b59b6'],
    ["POOR RICHARD'S", 'Pub', '#6a4a2e'],
    ['WUPHF.COM', 'Woof!', '#e67e22'],
  ];
  for (let i = 0, x = 20; x < w; i++, x += 300) {
    const [t, s, col] = ads[i % ads.length];
    rr(g, x, bTop + 6, 260, 46, 3);
    inked(g, '#fff', 2);
    text(g, t, x + 130, bTop + 24, { size: 18, color: col });
    text(g, s, x + 130, bTop + 42, { size: 10, color: '#333', font: 'Arial', weight: '400' });
  }
  g.fillStyle = 'rgba(200,230,255,0.25)';
  g.fillRect(0, bTop - 90, w, 90);
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 2;
  for (let x = 0; x < w; x += 200) {
    g.beginPath();
    g.moveTo(x, bTop - 90);
    g.lineTo(x, bTop);
    g.stroke();
  }
  // ice
  const top = bTop + 64;
  vgrad(g, 0, top, w, H - top, [
    [0, '#cfe3f2'],
    [1, '#f2f8ff'],
  ]);
  g.fillStyle = 'rgba(214,40,40,0.8)';
  g.fillRect(w / 2 - 6, top, 12, H - top);
  g.fillStyle = 'rgba(31,79,209,0.7)';
  g.fillRect(w * 0.3 - 5, top, 10, H - top);
  g.fillRect(w * 0.7 - 5, top, 10, H - top);
  ellipse(g, w / 2, (top + H) / 2, 90, 44);
  g.strokeStyle = 'rgba(31,79,209,0.7)';
  g.lineWidth = 4;
  g.stroke();
  speckle(g, 0, top, w, H - top, 'rgba(255,255,255,0.5)', 900, 4, 3);
  g.strokeStyle = 'rgba(150,180,200,0.35)';
  const r = rng(6);
  for (let i = 0; i < 60; i++) {
    const x = r() * w;
    const y = top + r() * (H - top);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 30 + r() * 80, y + (r() - 0.5) * 10);
    g.stroke();
  }
  return c;
}

export function paintLocker(w = 1700): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  wall(g, w, 0, FLOOR_Y, '#cfd8dc');
  g.strokeStyle = 'rgba(0,0,0,0.1)';
  g.lineWidth = 1.5;
  for (let y = 0; y < FLOOR_Y; y += 30) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  for (let x = 0; x < w; x += 30) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, FLOOR_Y);
    g.stroke();
  }
  g.fillStyle = '#1f4fd1';
  g.fillRect(0, 150, w, 16);
  printerSign(g, 400, 90, 'HOME TEAM', 22, -0.02);
  printerSign(g, 1200, 90, 'NO SNAPPING TOWELS (this means you, Chad)', 14, 0.02, 360);
  poster(g, 800, 40, 110, 140, 'BELIEVE', 'in the puck', '#1f4fd1');
  baseboard(g, w, FLOOR_Y, '#555');
  perspectiveFloor(g, w, FLOOR_Y, '#9aa3ad', 'rgba(0,0,0,0.12)', 90);
  return c;
}

export function paintClub(w = 2000): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  vgrad(g, 0, 0, w, FLOOR_Y, [
    [0, '#1a0f24'],
    [1, '#3a1f48'],
  ]);
  brick(g, 0, 60, 700, FLOOR_Y - 60, '#5a2a3a', 5);
  // "break room" giveaways under the moody lighting
  rr(g, 90, 110, 110, 200, 4);
  inked(g, '#d8d8d0', 3);
  printerSign(g, 145, 150, 'PLEASE LABEL YOUR FOOD', 9, 0.02, 100);
  rr(g, 240, 150, 90, 60, 3);
  inked(g, '#cfcfc8', 3);
  rr(g, 250, 160, 56, 40, 2);
  inked(g, '#222', 2);
  text(g, 'microwave', 285, 225, { size: 9, color: '#bbb', font: 'Arial' });
  rr(g, 380, 90, 180, 110, 2);
  inked(g, '#b88a52', 3);
  printerSign(g, 470, 130, 'PRETZEL DAY: FRIDAY', 11, -0.04, 150);
  // Neon sign
  g.shadowColor = '#ff4fd8';
  g.shadowBlur = 20;
  text(g, 'THE FUNKY CAT', 1000, 90, { size: 60, color: '#ffc6f5', font: FONT_HAND });
  g.shadowBlur = 0;
  // cat head
  g.strokeStyle = '#6affff';
  g.lineWidth = 4;
  g.shadowColor = '#6affff';
  g.shadowBlur = 14;
  g.beginPath();
  g.moveTo(1230, 110);
  g.lineTo(1240, 60);
  g.lineTo(1262, 86);
  g.lineTo(1290, 86);
  g.lineTo(1312, 60);
  g.lineTo(1322, 110);
  g.quadraticCurveTo(1276, 150, 1230, 110);
  g.stroke();
  g.shadowBlur = 0;
  // stage
  rr(g, 1380, 40, 600, FLOOR_Y - 20, 4);
  inked(g, '#2a0a18', 3);
  for (let i = 0; i < 12; i++) {
    const x = 1390 + i * 50;
    vgrad(g, x, 44, 44, FLOOR_Y - 40, [
      [0, '#8a1030'],
      [0.5, '#b01840'],
      [1, '#6a0a20'],
    ]);
  }
  g.fillStyle = '#e8c14a';
  g.fillRect(1380, 36, 600, 10);
  g.fillStyle = 'rgba(255,240,200,0.12)';
  poly(g, [1640, 0, 1720, 0, 1800, FLOOR_Y + 200, 1560, FLOOR_Y + 200]);
  g.fill();
  // floor: checker dance floor to the right, carpet left
  carpet(g, w, FLOOR_Y, '#3a1a2a', 4);
  for (let y = FLOOR_Y + 10, row = 0; y < H; y += 40, row++)
    for (let x = 1200 + (row % 2) * 40; x < w; x += 80) {
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.fillRect(x, y, 40, 40);
    }
  // stage lip
  g.fillStyle = '#2a1018';
  g.fillRect(1380, FLOOR_Y - 10, 600, 50);
  g.fillStyle = '#e8c14a';
  g.fillRect(1380, FLOOR_Y + 36, 600, 4);
  return c;
}

export function paintKitchen(w = 2200): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  wall(g, w, 0, FLOOR_Y, '#e8e8e0');
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < FLOOR_Y; y += 26) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  for (let x = 0; x < w; x += 26) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, FLOOR_Y);
    g.stroke();
  }
  for (let x = 60; x < w; x += 420) {
    rr(g, x, 200, 320, 130, 3);
    inked(g, '#b8c0c8', 3);
    g.fillStyle = '#9aa3ad';
    g.fillRect(x + 10, 212, 300, 6);
    ellipse(g, x + 80, 196, 36, 14);
    inked(g, '#666', 2);
    rr(g, x + 180, 150, 70, 50, 6);
    inked(g, '#8a1a1a', 2);
    text(g, "KEVIN'S", x + 215, 168, { size: 10, color: '#fff' });
    text(g, 'CHILI', x + 215, 184, { size: 10, color: '#fff' });
  }
  printerSign(g, 900, 100, 'EMPLOYEES MUST WASH HANDS', 16, 0.02);
  printerSign(g, 1700, 90, 'EXIT →', 26, -0.03);
  baseboard(g, w, FLOOR_Y, '#666');
  perspectiveFloor(g, w, FLOOR_Y, '#b33a3a', 'rgba(255,255,255,0.2)', 80);
  return c;
}

export function paintTunnel(w = 1800, seed = 1, variant: 'pipes' | 'storage' | 'boiler' = 'pipes'): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  wall(g, w, 0, FLOOR_Y, variant === 'boiler' ? '#4a3a30' : '#6c7178');
  const r = rng(seed * 13);
  // cinder blocks
  g.strokeStyle = 'rgba(0,0,0,0.15)';
  g.lineWidth = 2;
  for (let y = 40, row = 0; y < FLOOR_Y; y += 30, row++) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
    for (let x = (row % 2) * 40; x < w; x += 80) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + 30);
      g.stroke();
    }
  }
  // pipes = wrapping paper tubes (with visible candy-cane print)
  for (let i = 0; i < 3; i++) {
    const y = 50 + i * 38;
    rr(g, -10, y, w + 20, 20, 10);
    inked(g, i === 1 ? '#c8b88a' : '#b0b8c0', 2);
    if (i === 1) {
      g.fillStyle = 'rgba(214,40,40,0.5)';
      for (let x = 0; x < w; x += 40) {
        g.save();
        g.translate(x, y);
        g.rotate(0.6);
        g.fillRect(0, -4, 6, 26);
        g.restore();
      }
    }
  }
  // caution stripes and signs
  g.fillStyle = '#f2c200';
  g.fillRect(0, FLOOR_Y - 34, w, 18);
  g.fillStyle = '#111';
  for (let x = 0; x < w; x += 36) {
    poly(g, [x, FLOOR_Y - 16, x + 18, FLOOR_Y - 34, x + 30, FLOOR_Y - 34, x + 12, FLOOR_Y - 16]);
    g.fill();
  }
  const signs = ['SECRET TUNNEL', 'NOT A BASEMENT', 'HOSTAGES THIS WAY?', 'EVIL AUTHORIZED PERSONNEL ONLY', 'NO LOITERING (Creed)', 'SECTOR 7-G'];
  for (let x = 200; x < w; x += 520) printerSign(g, x + r() * 100, 190 + r() * 40, signs[Math.floor(r() * signs.length)], 16, (r() - 0.5) * 0.1, 260);
  if (variant === 'boiler') {
    for (let x = 100; x < w; x += 500) {
      rr(g, x, 120, 160, FLOOR_Y - 120, 30);
      inked(g, '#8a6a4a', 3);
      g.fillStyle = 'rgba(232,184,58,0.7)';
      g.fillRect(x + 20, 140, 30, FLOOR_Y - 150);
      text(g, 'GOLD', x + 80, 200, { size: 22, color: '#e8b83a', rot: -0.1 });
    }
    rr(g, w / 2 - 260, 60, 520, 70, 6);
    inked(g, '#1a0f0f', 3);
    text(g, 'GOLDENFACE HQ', w / 2, 96, { size: 44, color: '#f1c94a', stroke: '#6a4a08', strokeW: 4 });
    text(g, '(glitter glue)', w / 2 + 200, 122, { size: 10, color: '#c9a23a', font: 'Arial' });
  }
  if (variant === 'storage') {
    for (let x = 80; x < w; x += 300) {
      for (let s = 0; s < 3; s++) {
        rr(g, x, 150 + s * 50, 180, 44, 2);
        inked(g, '#c9a26b', 2);
        text(g, 'DUNDER MIFFLIN', x + 90, 172 + s * 50, { size: 12, color: '#6a4a20' });
      }
    }
  }
  baseboard(g, w, FLOOR_Y, '#3a3a3a');
  perspectiveFloor(g, w, FLOOR_Y, variant === 'boiler' ? '#5a4a3a' : '#7c8086', 'rgba(0,0,0,0.14)', 140);
  speckle(g, 0, FLOOR_Y, w, H - FLOOR_Y, 'rgba(0,0,0,0.12)', 1400, seed, 3);
  // puddles
  for (let i = 0; i < 4; i++) {
    ellipse(g, r() * w, FLOOR_Y + 60 + r() * 300, 60 + r() * 60, 12 + r() * 10);
    g.fillStyle = 'rgba(150,180,210,0.18)';
    g.fill();
  }
  return c;
}

export function paintHospital(w = 1400): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  dropCeiling(g, w, 60);
  wall(g, w, 60, FLOOR_Y, '#dfe9e4');
  fluorescentGlow(g, w);
  printerSign(g, 300, 120, 'HOSPITAL', 36, -0.04);
  printerSign(g, 900, 110, 'Please clean the microwave. — Mgmt', 12, 0.03, 260);
  rr(g, 1080, 90, 110, 240, 4);
  inked(g, '#f4f4f0', 3);
  g.fillStyle = '#bbb';
  g.fillRect(1180, 160, 6, 40);
  printerSign(g, 1135, 140, 'MEDICINE (yogurt)', 9, -0.02, 90);
  rr(g, 560, 160, 90, 60, 3);
  inked(g, '#cfcfc8', 3);
  text(g, 'X-RAY?', 605, 190, { size: 12, color: '#555' });
  baseboard(g, w, FLOOR_Y, '#8aa');
  perspectiveFloor(g, w, FLOOR_Y, '#cfd6d2', 'rgba(0,0,0,0.1)', 100);
  return c;
}

export function paintOval(w = 1600): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  dropCeiling(g, w, 60);
  wall(g, w, 60, FLOOR_Y, '#e8e0cc');
  fluorescentGlow(g, w);
  // whiteboard: "OVAL OFFICE" over half-erased Q3 sales
  rr(g, 180, 100, 360, 170, 3);
  inked(g, '#fbfbfb', 4);
  g.strokeStyle = 'rgba(40,120,200,0.25)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(200, 240);
  g.lineTo(280, 190);
  g.lineTo(340, 220);
  g.lineTo(420, 150);
  g.stroke();
  text(g, 'Q3 SALES', 460, 245, { size: 14, color: 'rgba(40,120,200,0.25)', font: 'Arial' });
  text(g, 'OVAL OFFICE', 360, 160, { size: 36, color: '#1c2b8a', font: FONT_HAND, rot: -0.03 });
  text(g, '(the white house)', 360, 196, { size: 14, color: '#c0152a', font: FONT_HAND });
  windowBlinds(g, 1020, 90, 340, 190);
  printerSign(g, 760, 110, 'TOP SECRET MEETING — DO NOT BOOK', 12, 0.02, 280);
  baseboard(g, w, FLOOR_Y, '#6a5a4a');
  carpet(g, w, FLOOR_Y, '#5a6a7a', 9);
  // oval rug of carpet samples
  ellipse(g, w / 2, 520, 420, 120);
  g.fillStyle = '#1c2b6a';
  g.fill();
  within(g, () => {
    const r = rng(2);
    for (let y = 390; y < 650; y += 40)
      for (let x = w / 2 - 440; x < w / 2 + 440; x += 60) {
        g.fillStyle = ['#1c2b6a', '#243a8a', '#2a3060', '#34408a'][Math.floor(r() * 4)];
        g.fillRect(x, y, 58, 38);
      }
  });
  g.strokeStyle = '#e8c14a';
  g.lineWidth = 5;
  ellipse(g, w / 2, 520, 420, 120);
  g.stroke();
  return c;
}

export function paintHallway(w = 4000): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  dropCeiling(g, w, 60);
  wall(g, w, 60, FLOOR_Y, '#d8d2c0');
  fluorescentGlow(g, w);
  const r = rng(31);
  for (let x = 150; x < w; x += 380) {
    rr(g, x, 110, 110, FLOOR_Y - 110, 2);
    inked(g, '#8a6a4a', 3);
    ellipse(g, x + 94, 230, 5, 5);
    inked(g, '#e8c14a', 1.5);
    rr(g, x + 20, 126, 70, 30, 2);
    inked(g, '#f4f4f0', 2);
    text(g, ['SITUATION RM', 'PRESS', 'SUPPLY', 'LINCOLN BDRM', 'ANNEX', 'VICE PRES'][Math.floor(r() * 6)], x + 55, 141, { size: 8 });
    if (r() > 0.4) {
      const px = x + 200;
      rr(g, px, 130, 80, 100, 2);
      inked(g, '#6a4a2e', 3);
      ellipse(g, px + 40, 170, 18, 22);
      inked(g, '#f2c29b', 2);
      blob(g, [px + 22, 164, px + 26, 150, px + 40, 146, px + 56, 152, px + 58, 162, px + 40, 158]);
      inked(g, '#3a2618', 2);
      text(g, 'EMPLOYEE OF THE MONTH', px + 40, 212, { size: 6, color: '#fff' });
      text(g, 'MICHAEL S.', px + 40, 222, { size: 7, color: '#f1c94a' });
    }
  }
  baseboard(g, w, FLOOR_Y, '#5a4a3a');
  carpet(g, w, FLOOR_Y, '#6a2a2a', 3);
  g.fillStyle = 'rgba(232,193,74,0.4)';
  g.fillRect(0, 470, w, 8);
  g.fillRect(0, 610, w, 8);
  return c;
}

export function paintStreet(w = 1800): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  vgrad(g, 0, 0, w, FLOOR_Y, [
    [0, '#060812'],
    [1, '#1a2036'],
  ]);
  brick(g, 0, 90, w, FLOOR_Y - 90, '#4a2a26', 9);
  for (let x = 200; x < w; x += 600) {
    rr(g, x, 150, 160, 120, 2);
    inked(g, '#1a1a24', 3);
    g.fillStyle = 'rgba(255,210,120,0.4)';
    g.fillRect(x + 8, 158, 144, 104);
  }
  printerSign(g, 900, 120, 'SCRANTON (probably)', 18, 0.03);
  // streetlamp
  g.fillStyle = '#222';
  g.fillRect(1400, 60, 8, FLOOR_Y + 40);
  ellipse(g, 1404, 60, 22, 10);
  inked(g, '#ffe8a0', 3);
  g.fillStyle = 'rgba(255,232,160,0.12)';
  poly(g, [1384, 64, 1424, 64, 1560, 620, 1250, 620]);
  g.fill();
  vgrad(g, 0, FLOOR_Y, w, H - FLOOR_Y, [
    [0, '#1a1a22'],
    [1, '#2a2a34'],
  ]);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  for (let x = 0; x < w; x += 120) g.fillRect(x, 520, 60, 6);
  return c;
}

export function paintBar(w = 1800): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  wall(g, w, 0, FLOOR_Y, '#5a3420');
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 0; x < w; x += 40) g.fillRect(x, 0, 3, FLOOR_Y);
  // back bar shelves with bottles
  for (let s = 0; s < 3; s++) {
    const y = 110 + s * 60;
    g.fillStyle = '#3a2010';
    g.fillRect(500, y, 800, 8);
    const r = rng(s + 40);
    for (let x = 510; x < 1290; x += 22) {
      const h = 24 + r() * 20;
      rr(g, x, y - h, 14, h, 3);
      inked(g, ['#2e7d4f', '#a0522d', '#d4a017', '#6a1b9a', '#ddd'][Math.floor(r() * 5)], 1.5);
    }
  }
  // mirror
  rr(g, 520, 20, 760, 60, 4);
  inked(g, 'rgba(200,220,240,0.35)', 3);
  // dartboard + posters
  ellipse(g, 200, 150, 50, 50);
  inked(g, '#222', 3);
  ellipse(g, 200, 150, 34, 34);
  inked(g, '#c0392b', 2);
  ellipse(g, 200, 150, 12, 12);
  inked(g, '#2e7d4f', 2);
  poster(g, 1450, 60, 130, 170, 'KARAOKE', 'tuesdays', '#6a1b9a');
  printerSign(g, 1660, 110, 'NO DANCING*', 16, 0.05);
  text(g, '*unless it is the Scarn', 1660, 150, { size: 11, color: '#f1c94a', font: 'Arial' });
  baseboard(g, w, FLOOR_Y, '#2a1a10');
  woodFloor(g, w, FLOOR_Y, '#6a4020');
  return c;
}

export function paintSky(w = 1280): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  vgrad(g, 0, 0, w, H, [
    [0, '#3a7bd5'],
    [1, '#bde0ff'],
  ]);
  const r = rng(77);
  for (let i = 0; i < 9; i++) {
    const x = r() * w;
    const y = 80 + r() * 520;
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, y - 20);
    g.stroke();
    for (let k = 0; k < 5; k++) {
      ellipse(g, x + (k - 2) * 22, y + (k % 2) * -10, 26, 20);
      inked(g, '#ffffff', 2);
    }
    text(g, 'cotton', x, y + 26, { size: 9, color: '#9ab', font: 'Arial' });
  }
  return c;
}

export function paintSpace(w = 1280): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  vgrad(g, 0, 0, w, H, [
    [0, '#02010a'],
    [1, '#120a2a'],
  ]);
  const r = rng(99);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = ['#ffffff', '#ffd6f5', '#d6f0ff', '#fff6b0'][Math.floor(r() * 4)];
    const s = r() * 2.5 + 0.5;
    g.fillRect(r() * w, r() * H, s, s);
  }
  // earth made of a blue exercise ball
  ellipse(g, 200, 720, 380, 220);
  inked(g, '#2d6fd6', 4);
  g.fillStyle = '#3f9a4a';
  blob(g, [80, 600, 180, 560, 260, 610, 220, 680, 120, 690]);
  g.fill();
  text(g, 'glitter', 1100, 60, { size: 10, color: '#aaa', font: 'Arial' });
  return c;
}

export function paintSkyline(w = 1280): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  vgrad(g, 0, 0, w, H, [
    [0, '#ff9a5a'],
    [0.6, '#ffcf8a'],
    [1, '#4a3a5a'],
  ]);
  const r = rng(5);
  g.fillStyle = '#2a2238';
  for (let x = 0; x < w; x += 40 + r() * 30) {
    const h = 120 + r() * 240;
    g.fillRect(x, H - h, 36 + r() * 30, h);
  }
  rr(g, w / 2 - 160, 90, 320, 60, 4);
  inked(g, '#ffffff', 3);
  text(g, 'SCRANTON, PA', w / 2, 120, { size: 36, color: '#1b1b1b' });
  text(g, '(stock photo)', w / 2 + 140, 160, { size: 10, color: '#fff', font: 'Arial' });
  return c;
}

export function paintAttract(w = 1280): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  const gr = g.createRadialGradient(w * 0.62, H * 0.45, 20, w * 0.62, H * 0.45, 700);
  gr.addColorStop(0, '#3a1016');
  gr.addColorStop(0.5, '#140810');
  gr.addColorStop(1, '#050306');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, H);
  // gun-barrel-ish rings (a very legally distinct spiral)
  for (let i = 0; i < 9; i++) {
    ellipse(g, w * 0.62, H * 0.45, 60 + i * 60, 60 + i * 60);
    g.strokeStyle = `rgba(255,190,80,${0.08 - i * 0.007})`;
    g.lineWidth = 10;
    g.stroke();
  }
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(0, H - 120, w, 120);
  return c;
}

export function paintScreening(w = 1280): HTMLCanvasElement {
  const { c, g } = makeCanvas(w, H);
  vgrad(g, 0, 0, w, H, [
    [0, '#0b0c10'],
    [1, '#16181e'],
  ]);
  // projector screen
  rr(g, 280, 40, 720, 380, 4);
  inked(g, '#d8d8d0', 4);
  g.fillStyle = '#888';
  g.fillRect(630, 0, 20, 40);
  // conference table edge
  g.fillStyle = '#3a2a1a';
  poly(g, [0, 560, w, 560, w, H, 0, H]);
  g.fill();
  g.fillStyle = '#4a3624';
  g.fillRect(0, 556, w, 10);
  printerSign(g, 1150, 120, 'CONFERENCE RM', 12, 0.02, 150);
  return c;
}
