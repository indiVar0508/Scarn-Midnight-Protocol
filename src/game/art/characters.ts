import { INK, LINE, blob, ellipse, inked, makeCanvas, mix, poly, rr, shade, text, within } from './canvas';

/**
 * Character reference sheet, in code. Every character is a spec rendered by
 * the same part painters, so proportions, line weight and shading stay
 * consistent across the whole cast.
 */
export type HairStyle =
  | 'slick'
  | 'center'
  | 'long'
  | 'curls'
  | 'bald'
  | 'short'
  | 'updo'
  | 'mask'
  | 'buzz'
  | 'bob'
  | 'wavy'
  | 'cap'
  | 'papercap'
  | 'ponytail'
  | 'none';

export type Outfit = 'suit' | 'butler' | 'jersey' | 'track' | 'gown' | 'vest' | 'cardigan' | 'apron' | 'hospital' | 'scrubs' | 'polo' | 'tee' | 'sheet';

export interface CharSpec {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  jaw?: number;
  nose?: number;
  brows?: 'heroic' | 'flat' | 'arched' | 'bushy' | 'worried';
  eyes?: 'normal' | 'smug' | 'wide' | 'tired' | 'led';
  glasses?: 'rect' | 'round' | 'sun';
  mustache?: string;
  beard?: string;
  lips?: string;
  gold?: boolean;
  headband?: string;
  outfit: Outfit;
  top: string;
  top2?: string;
  shirt?: string;
  tie?: string;
  tieStyle?: 'tie' | 'bow' | 'none';
  pants: string;
  shoes: string;
  gloves?: string;
  skates?: boolean;
  number?: string;
  scale?: number;
  bulk?: number;
  cape?: string;
  accessory?: 'whistle' | 'flagpin' | 'pearls' | 'lanyard' | 'towel' | 'bolt' | 'pocketsquare' | 'stethoscope';
  shortSleeves?: boolean;
  bareLegs?: boolean;
}

export const R = 2; // texture resolution multiplier (crisp on camera zoom)

const SKIN = { a: '#f2c29b', b: '#e0a877', c: '#c68a5e', d: '#9a6440', e: '#6e4428', f: '#f6d2b5' };

export const SPECS: Record<string, CharSpec> = {
  scarn: {
    skin: SKIN.a, hair: '#3a2618', hairStyle: 'slick', jaw: 0.9, nose: 1.1, brows: 'heroic', eyes: 'smug',
    outfit: 'suit', top: '#1d1f2a', shirt: '#f5f5f0', tie: '#101010', tieStyle: 'tie', pants: '#1d1f2a', shoes: '#0d0d10',
    accessory: 'pocketsquare', bulk: 1.08, scale: 1,
  },
  scarn_hockey: {
    skin: SKIN.a, hair: '#3a2618', hairStyle: 'slick', jaw: 0.9, nose: 1.1, brows: 'heroic', eyes: 'smug',
    outfit: 'jersey', top: '#f4f4f4', top2: '#1f4fd1', number: '00', pants: '#1f4fd1', shoes: '#111111', skates: true, gloves: '#1f4fd1', bulk: 1.12,
  },
  scarn_gown: {
    skin: SKIN.a, hair: '#3a2618', hairStyle: 'slick', jaw: 0.9, nose: 1.1, brows: 'worried', eyes: 'tired',
    outfit: 'hospital', top: '#a9d4f0', top2: '#6fa8d6', pants: '#a9d4f0', shoes: '#e8e8e8', shortSleeves: true, bareLegs: true, bulk: 1.05,
  },
  scarn_disguise: {
    skin: '#f2c29b', hair: '#3a2618', hairStyle: 'cap', jaw: 0.9, nose: 1.1, brows: 'heroic', eyes: 'smug', mustache: '#3a2618',
    outfit: 'track', top: '#e07a2f', top2: '#2a2a2a', pants: '#3a4a2a', shoes: '#0d0d10', bulk: 1.08,
  },
  goldenface: {
    skin: '#e9b949', hair: '#101010', hairStyle: 'slick', jaw: 0.7, nose: 1.2, brows: 'arched', eyes: 'smug', gold: true,
    outfit: 'suit', top: '#121212', shirt: '#1e1e1e', tie: '#e8b83a', tieStyle: 'tie', pants: '#121212', shoes: '#050505', gloves: '#e9b949',
    cape: '#1a0f0f', scale: 1.08, bulk: 0.98,
  },
  samuel: {
    skin: SKIN.f, hair: '#5a3b22', hairStyle: 'center', jaw: 0.5, nose: 1, brows: 'flat', eyes: 'normal', glasses: 'rect',
    outfit: 'butler', top: '#15151c', shirt: '#fafafa', tie: '#fafafa', tieStyle: 'bow', pants: '#15151c', shoes: '#070707', gloves: '#fafafa',
    accessory: 'bolt', scale: 1.04, bulk: 0.95,
  },
  samuel_led: {
    skin: SKIN.f, hair: '#5a3b22', hairStyle: 'center', jaw: 0.5, nose: 1, brows: 'flat', eyes: 'led', glasses: 'rect',
    outfit: 'butler', top: '#15151c', shirt: '#fafafa', tie: '#fafafa', tieStyle: 'bow', pants: '#15151c', shoes: '#070707', gloves: '#fafafa',
    accessory: 'bolt', scale: 1.04, bulk: 0.95,
  },
  jack: {
    skin: SKIN.b, hair: '#d8d4cc', hairStyle: 'long', jaw: 0.6, nose: 1.3, brows: 'bushy', eyes: 'tired', beard: '#cfcac0', headband: '#c0392b',
    outfit: 'track', top: '#7a2a2a', top2: '#e8d9b0', pants: '#2c3a5a', shoes: '#e8e8e8', accessory: 'whistle', scale: 0.98, bulk: 1,
  },
  jack_ghost: {
    skin: '#dff6ff', hair: '#ffffff', hairStyle: 'long', jaw: 0.6, nose: 1.3, brows: 'bushy', eyes: 'tired', beard: '#ffffff', headband: '#a8e6ff',
    outfit: 'sheet', top: '#eefaff', top2: '#cdefff', pants: '#eefaff', shoes: '#eefaff', scale: 0.98,
  },
  jasmine: {
    skin: SKIN.c, hair: '#241411', hairStyle: 'curls', jaw: 0.3, nose: 0.85, brows: 'arched', eyes: 'smug', lips: '#b3122e',
    outfit: 'gown', top: '#c8102e', top2: '#ff6078', pants: '#c8102e', shoes: '#c8102e', gloves: '#1b1b1b', accessory: 'pearls', scale: 0.96, bulk: 0.9,
  },
  president: {
    skin: SKIN.d, hair: '#1a1410', hairStyle: 'buzz', jaw: 0.8, nose: 1.1, brows: 'heroic', eyes: 'normal', mustache: '#1a1410',
    outfit: 'suit', top: '#1c2b4a', shirt: '#ffffff', tie: '#c0152a', tieStyle: 'tie', pants: '#1c2b4a', shoes: '#0a0a0a', accessory: 'flagpin', scale: 1.1, bulk: 1.12,
  },
  billy: {
    skin: SKIN.a, hair: '#6b4a2b', hairStyle: 'wavy', jaw: 0.6, nose: 1, brows: 'arched', eyes: 'wide',
    outfit: 'vest', top: '#2d4a3a', shirt: '#f4efe4', tie: '#7a1030', tieStyle: 'bow', pants: '#3a3a40', shoes: '#2a1a10', accessory: 'towel', scale: 1.02,
  },
  catherine: {
    skin: SKIN.f, hair: '#8a3b1f', hairStyle: 'updo', jaw: 0.3, nose: 0.85, brows: 'arched', eyes: 'normal', lips: '#c24a6a',
    outfit: 'gown', top: '#b58ad8', top2: '#e3c9ff', pants: '#b58ad8', shoes: '#b58ad8', accessory: 'pearls', scale: 0.95, bulk: 0.88,
  },
  goon: {
    skin: SKIN.b, hair: '#111111', hairStyle: 'mask', jaw: 0.8, nose: 1, brows: 'flat', eyes: 'normal', glasses: 'sun',
    outfit: 'suit', top: '#16161a', shirt: '#dcdcdc', tie: '#e8b83a', tieStyle: 'tie', pants: '#16161a', shoes: '#050505', accessory: 'lanyard', bulk: 1.05,
  },
  goon_skater: {
    skin: SKIN.b, hair: '#111111', hairStyle: 'mask', jaw: 0.8, nose: 1, brows: 'flat', eyes: 'normal', glasses: 'sun',
    outfit: 'jersey', top: '#1a1a1a', top2: '#e8b83a', number: '24', pants: '#1a1a1a', shoes: '#050505', skates: true, gloves: '#e8b83a', bulk: 1.1,
  },
  allstar_red: {
    skin: SKIN.c, hair: '#2a1a10', hairStyle: 'short', jaw: 0.8, nose: 1, brows: 'flat', eyes: 'normal',
    outfit: 'jersey', top: '#c81d25', top2: '#ffffff', number: '19', pants: '#c81d25', shoes: '#111111', skates: true, gloves: '#c81d25', bulk: 1.1,
  },
  allstar_blue: {
    skin: SKIN.a, hair: '#7a5530', hairStyle: 'short', jaw: 0.8, nose: 1, brows: 'flat', eyes: 'normal',
    outfit: 'jersey', top: '#f4f4f4', top2: '#1f4fd1', number: '7', pants: '#1f4fd1', shoes: '#111111', skates: true, gloves: '#1f4fd1', bulk: 1.1,
  },
  goalie_red: {
    skin: '#c68a5e', hair: '#1a1a1a', hairStyle: 'short', jaw: 0.9, nose: 1, brows: 'bushy', eyes: 'normal',
    outfit: 'jersey', top: '#c81d25', top2: '#ffffff', number: '31', pants: '#c81d25', shoes: '#111111', skates: true, gloves: '#ffffff', bulk: 1.4,
  },
  goalie_blue: {
    skin: '#f2c29b', hair: '#8a5a30', hairStyle: 'short', jaw: 0.9, nose: 1, brows: 'bushy', eyes: 'normal',
    outfit: 'jersey', top: '#f4f4f4', top2: '#1f4fd1', number: '30', pants: '#1f4fd1', shoes: '#111111', skates: true, gloves: '#1f4fd1', bulk: 1.4,
  },
  goalie: {
    skin: SKIN.b, hair: '#111111', hairStyle: 'mask', jaw: 0.8, nose: 1, brows: 'flat', eyes: 'normal', glasses: 'sun',
    outfit: 'jersey', top: '#1a1a1a', top2: '#e8b83a', number: '1', pants: '#1a1a1a', shoes: '#050505', skates: true, gloves: '#e8b83a', bulk: 1.35,
  },
  cashier: {
    skin: SKIN.c, hair: '#3a1f12', hairStyle: 'ponytail', jaw: 0.3, nose: 0.9, brows: 'arched', eyes: 'tired',
    outfit: 'apron', top: '#e5e2da', top2: '#2e7d4f', pants: '#394150', shoes: '#222222', accessory: 'lanyard', scale: 0.94, bulk: 0.9,
  },
  coach: {
    skin: SKIN.a, hair: '#8a8580', hairStyle: 'cap', jaw: 0.9, nose: 1.2, brows: 'bushy', eyes: 'tired', mustache: '#6d655d',
    outfit: 'track', top: '#1b4d8c', top2: '#ffffff', pants: '#1b1b1b', shoes: '#ffffff', accessory: 'whistle', bulk: 1.2, scale: 1.02,
  },
  chad: {
    skin: SKIN.b, hair: '#e3c26b', hairStyle: 'short', jaw: 1, nose: 1, brows: 'flat', eyes: 'normal',
    outfit: 'jersey', top: '#f28c28', top2: '#1b1b1b', number: '99', pants: '#1b1b1b', shoes: '#111111', skates: true, gloves: '#f28c28', bulk: 1.3, scale: 1.1,
  },
  chad_towel: {
    skin: SKIN.b, hair: '#e3c26b', hairStyle: 'short', jaw: 1, nose: 1, brows: 'flat', eyes: 'tired',
    outfit: 'tee', top: '#f4f4f4', top2: '#dddddd', pants: '#6fa8d6', shoes: '#f0f0f0', bulk: 1.3, scale: 1.1,
  },
  skater_green: {
    skin: SKIN.e, hair: '#111111', hairStyle: 'buzz', jaw: 0.7, nose: 1, brows: 'flat', eyes: 'normal',
    outfit: 'jersey', top: '#2e9b4f', top2: '#ffffff', number: '42', pants: '#1b1b1b', shoes: '#111111', skates: true, gloves: '#2e9b4f', bulk: 1.05,
  },
  bouncer: {
    skin: SKIN.e, hair: '#111111', hairStyle: 'bald', jaw: 1, nose: 1.1, brows: 'flat', eyes: 'tired', glasses: 'sun',
    outfit: 'suit', top: '#2b2340', shirt: '#111111', tie: '#111111', tieStyle: 'none', pants: '#2b2340', shoes: '#050505', bulk: 1.4, scale: 1.12,
  },
  patron: {
    skin: SKIN.a, hair: '#222222', hairStyle: 'short', jaw: 0.6, nose: 1, brows: 'flat', eyes: 'smug', mustache: '#222222',
    outfit: 'suit', top: '#6b4a2b', shirt: '#f0e6c8', tie: '#1b3d6d', tieStyle: 'bow', pants: '#3a2a1a', shoes: '#1a1a1a',
  },
  patron2: {
    skin: SKIN.d, hair: '#101010', hairStyle: 'bob', jaw: 0.3, nose: 0.9, brows: 'arched', eyes: 'normal', lips: '#8a1c3a',
    outfit: 'vest', top: '#111111', shirt: '#f4efe4', tie: '#c0152a', tieStyle: 'bow', pants: '#111111', shoes: '#111111', scale: 0.95, bulk: 0.9,
  },
  nurse: {
    skin: SKIN.b, hair: '#5a2e1a', hairStyle: 'bob', jaw: 0.3, nose: 0.9, brows: 'worried', eyes: 'wide',
    outfit: 'scrubs', top: '#5fc2b5', top2: '#4aa89b', pants: '#5fc2b5', shoes: '#ffffff', accessory: 'stethoscope', scale: 0.95, bulk: 0.92,
  },
  hostage3: {
    skin: SKIN.a, hair: '#4a3a2e', hairStyle: 'papercap', jaw: 0.4, nose: 1, brows: 'worried', eyes: 'tired', beard: '#4a3a2e',
    outfit: 'cardigan', top: '#b9a887', top2: '#8a7a5e', shirt: '#dfe6ee', pants: '#5a5f6b', shoes: '#3a2a1a',
  },
  hostage: {
    skin: SKIN.c, hair: '#2a1a10', hairStyle: 'papercap', jaw: 0.4, nose: 0.9, brows: 'worried', eyes: 'wide',
    outfit: 'apron', top: '#ffffff', top2: '#d62828', pants: '#333a45', shoes: '#222222', scale: 0.96,
  },
  hostage_b: {
    skin: SKIN.e, hair: '#111111', hairStyle: 'papercap', jaw: 0.6, nose: 1, brows: 'worried', eyes: 'wide',
    outfit: 'apron', top: '#ffffff', top2: '#d62828', pants: '#333a45', shoes: '#222222', bulk: 1.15,
  },
  hostage_c: {
    skin: SKIN.f, hair: '#c9772f', hairStyle: 'papercap', jaw: 0.3, nose: 0.9, brows: 'worried', eyes: 'wide', lips: '#b04a5a',
    outfit: 'apron', top: '#ffffff', top2: '#d62828', pants: '#333a45', shoes: '#222222', scale: 0.93, bulk: 0.9,
  },
  bar1: {
    skin: SKIN.c, hair: '#1a1a1a', hairStyle: 'ponytail', jaw: 0.3, nose: 0.9, brows: 'arched', eyes: 'normal', lips: '#a3304a',
    outfit: 'tee', top: '#e25d8f', top2: '#b94472', pants: '#2b3350', shoes: '#111111', scale: 0.95, bulk: 0.9,
  },
  bar2: {
    skin: SKIN.a, hair: '#b88a4a', hairStyle: 'short', jaw: 0.9, nose: 1.1, brows: 'bushy', eyes: 'tired', beard: '#9a7040',
    outfit: 'polo', top: '#4a6fa5', top2: '#3a5a88', pants: '#6b5a44', shoes: '#2a1a10', bulk: 1.25,
  },
  bar3: {
    skin: SKIN.e, hair: '#2a1a10', hairStyle: 'wavy', jaw: 0.6, nose: 1, brows: 'flat', eyes: 'smug',
    outfit: 'polo', top: '#f0c040', top2: '#d0a020', pants: '#1f2a3a', shoes: '#111111',
  },
  bar4: {
    skin: SKIN.b, hair: '#6a6a6a', hairStyle: 'bald', jaw: 0.7, nose: 1.3, brows: 'bushy', eyes: 'tired',
    outfit: 'cardigan', top: '#6b8e5a', top2: '#4e6e40', shirt: '#f0f0e0', pants: '#4a4036', shoes: '#2a1a10', scale: 0.97,
  },
  bar5: {
    skin: SKIN.f, hair: '#e8c070', hairStyle: 'bob', jaw: 0.3, nose: 0.85, brows: 'arched', eyes: 'wide', lips: '#c24a6a',
    outfit: 'tee', top: '#7ad0c8', top2: '#5ab0a8', pants: '#3a3a55', shoes: '#ffffff', scale: 0.93, bulk: 0.88,
  },
  bar6: {
    skin: SKIN.d, hair: '#101010', hairStyle: 'buzz', jaw: 0.9, nose: 1.1, brows: 'flat', eyes: 'normal',
    outfit: 'suit', top: '#6a6a70', shirt: '#ffffff', tie: '#2a4a8a', tieStyle: 'tie', pants: '#6a6a70', shoes: '#111111', bulk: 1.1, scale: 1.05,
  },
  kid: {
    skin: SKIN.a, hair: '#6a4a2a', hairStyle: 'cap', jaw: 0.2, nose: 0.8, brows: 'arched', eyes: 'wide',
    outfit: 'tee', top: '#3a8ad0', top2: '#2a6aa8', pants: '#2a3040', shoes: '#ffffff', scale: 0.68, bulk: 0.85,
  },
  secret: {
    skin: SKIN.c, hair: '#111111', hairStyle: 'buzz', jaw: 0.9, nose: 1, brows: 'flat', eyes: 'normal', glasses: 'sun',
    outfit: 'suit', top: '#111111', shirt: '#ffffff', tie: '#e8b83a', tieStyle: 'tie', pants: '#111111', shoes: '#050505', accessory: 'lanyard', bulk: 1.15,
  },
};

// ---------------------------------------------------------------------------
// Part painters. All coordinates are in "rig pixels" (R = 1); canvases are
// allocated at R x resolution.
// ---------------------------------------------------------------------------
export interface PartCanvas {
  canvas: HTMLCanvasElement;
  ox: number; // pivot in rig pixels
  oy: number;
}

function part(w: number, h: number, ox: number, oy: number, paint: (g: CanvasRenderingContext2D) => void): PartCanvas {
  const { c, g } = makeCanvas(w * R, h * R);
  g.scale(R, R);
  paint(g);
  return { canvas: c, ox, oy };
}

export type HeadFrame = 'idle' | 'talk' | 'blink' | 'hurt' | 'smile' | 'shock';

function goldFill(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, '#fff2a8');
  gr.addColorStop(0.35, '#f1c94a');
  gr.addColorStop(0.7, '#c8921f');
  gr.addColorStop(1, '#8a5a10');
  return gr;
}

export function drawHead(s: CharSpec, frame: HeadFrame): PartCanvas {
  return part(64, 72, 30, 64, (g) => {
    g.translate(2, 4);
    const skin = s.skin;
    const skinD = shade(skin, 0.82);
    const jaw = s.jaw ?? 0.6;
    const hair = s.hair;
    const hairD = shade(hair, 0.7);

    // back hair (behind head)
    if (s.hairStyle === 'long') {
      blob(g, [8, 20, 18, 6, 34, 4, 46, 14, 40, 40, 30, 66, 16, 68, 6, 50]);
      inked(g, hairD);
    }
    if (s.hairStyle === 'curls') {
      for (const [x, y, r] of [[10, 40, 11], [14, 56, 10], [8, 24, 11], [18, 12, 12], [34, 6, 12], [46, 12, 10], [26, 62, 9]]) {
        ellipse(g, x, y, r, r);
        inked(g, hairD);
      }
    }
    if (s.hairStyle === 'ponytail') {
      blob(g, [8, 26, 2, 36, 0, 50, 6, 58, 12, 44, 14, 30]);
      inked(g, hairD);
    }

    // neck
    rr(g, 22, 50, 14, 16, 3);
    inked(g, skinD);

    // head silhouette
    const pts = [30, 6, 45, 9, 52, 20, 53, 34, 51 + jaw * 2, 46, 45 + jaw * 3, 55, 32, 58, 19, 52, 11, 40, 11, 22, 18, 11];
    blob(g, pts);
    const face = s.gold ? goldFill(g, 50, 8, 16, 58) : skin;
    inked(g, face);
    // shading: back of the head / under jaw
    blob(g, pts);
    within(g, () => {
      g.fillStyle = s.gold ? 'rgba(120,70,0,0.35)' : skinD;
      ellipse(g, 12, 34, 14, 30);
      g.fill();
      g.fillStyle = s.gold ? 'rgba(120,70,0,0.25)' : shade(skin, 0.9);
      ellipse(g, 40, 62, 22, 8);
      g.fill();
      if (s.gold) {
        g.fillStyle = 'rgba(255,255,230,0.85)';
        ellipse(g, 40, 16, 5, 3, -0.4);
        g.fill();
        ellipse(g, 48, 36, 2, 5, 0.2);
        g.fill();
      }
    });

    // mask (goons): black knit over the head with an eye window
    if (s.hairStyle === 'mask') {
      blob(g, pts);
      within(g, () => {
        g.fillStyle = '#16161a';
        g.fillRect(0, 0, 64, 70);
        g.fillStyle = '#2a2a30';
        for (let y = 8; y < 60; y += 4) g.fillRect(8, y, 48, 1.5);
        g.fillStyle = skin;
        rr(g, 30, 22, 24, 13, 6);
        g.fill();
      });
      blob(g, pts);
      g.strokeStyle = INK;
      g.lineWidth = LINE;
      g.stroke();
    }

    // ear
    if (s.hairStyle !== 'mask') {
      ellipse(g, 20, 34, 4.5, 6.5);
      inked(g, s.gold ? '#d9a634' : skin, 2.2);
      g.strokeStyle = s.gold ? '#8a5a10' : skinD;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(20, 34, 2.5, -1.2, 1.2);
      g.stroke();
    }

    // nose
    const nz = s.nose ?? 1;
    g.beginPath();
    g.moveTo(51, 27);
    g.quadraticCurveTo(51 + 6 * nz, 34 + 2 * nz, 52 + 3 * nz, 38 + nz);
    g.quadraticCurveTo(50, 40, 48, 38);
    g.fillStyle = s.gold ? '#e8bb40' : s.hairStyle === 'mask' ? '#16161a' : skin;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(51, 27);
    g.quadraticCurveTo(51 + 6 * nz, 34 + 2 * nz, 52 + 3 * nz, 38 + nz);
    g.quadraticCurveTo(50, 40, 48, 38.5);
    g.stroke();

    // eyes
    const eyeY = 29;
    const drawEye = (x: number, w: number) => {
      if (frame === 'blink' || (frame === 'smile' && s.eyes !== 'led')) {
        g.strokeStyle = INK;
        g.lineWidth = 2.2;
        g.beginPath();
        if (frame === 'smile') g.arc(x, eyeY + 2, w * 0.9, Math.PI * 1.1, Math.PI * 1.9);
        else {
          g.moveTo(x - w, eyeY + 1);
          g.quadraticCurveTo(x, eyeY + 3, x + w, eyeY + 1);
        }
        g.stroke();
        return;
      }
      if (s.eyes === 'led') {
        ellipse(g, x, eyeY, w * 0.9, 3.5);
        g.fillStyle = '#5ff4ff';
        g.fill();
        g.fillStyle = 'rgba(95,244,255,0.35)';
        ellipse(g, x, eyeY, w * 1.8, 6);
        g.fill();
        return;
      }
      const big = frame === 'shock' || frame === 'hurt' || s.eyes === 'wide';
      ellipse(g, x, eyeY, w, big ? 5.8 : 5);
      inked(g, '#ffffff', 1.6);
      ellipse(g, x + w * 0.35, eyeY + 0.5, w * 0.55, big ? 2.4 : 3);
      g.fillStyle = frame === 'hurt' ? '#553' : '#2a1e1a';
      g.fill();
      g.fillStyle = '#fff';
      ellipse(g, x + w * 0.5, eyeY - 1, 0.9, 0.9);
      g.fill();
      if ((s.eyes === 'smug' || s.eyes === 'tired') && frame !== 'shock' && frame !== 'hurt') {
        g.fillStyle = s.hairStyle === 'mask' ? skin : s.gold ? '#e3b43d' : skin;
        g.beginPath();
        g.rect(x - w - 1, eyeY - 7, w * 2 + 2, s.eyes === 'tired' ? 5.5 : 4.5);
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(x - w, eyeY - (s.eyes === 'tired' ? 1.5 : 2.5));
        g.lineTo(x + w, eyeY - (s.eyes === 'tired' ? 1.5 : 2.5));
        g.stroke();
      }
    };
    drawEye(37, 4.2);
    drawEye(47.5, 3.3);

    // brows
    const browCol = s.gold ? '#6a4208' : s.hairStyle === 'mask' ? '#16161a' : hairD;
    g.strokeStyle = s.hairStyle === 'mask' ? 'transparent' : browCol;
    g.lineCap = 'round';
    const b = s.brows ?? 'flat';
    const bw = b === 'bushy' ? 4.5 : b === 'heroic' ? 3.6 : 2.6;
    g.lineWidth = bw;
    const browY = frame === 'shock' ? 19 : 21;
    g.beginPath();
    if (b === 'heroic') {
      g.moveTo(32, browY - 1);
      g.lineTo(42, browY + 1.5);
      g.moveTo(45, browY + 1);
      g.lineTo(51, browY);
    } else if (b === 'arched') {
      g.moveTo(32, browY + 1);
      g.quadraticCurveTo(37, browY - 3, 42, browY);
      g.moveTo(45, browY);
      g.quadraticCurveTo(48, browY - 3, 51, browY);
    } else if (b === 'worried' || frame === 'hurt') {
      g.moveTo(32, browY + 1);
      g.lineTo(41, browY - 2);
      g.moveTo(45, browY - 2);
      g.lineTo(51, browY + 1);
    } else {
      g.moveTo(32, browY);
      g.lineTo(42, browY);
      g.moveTo(45, browY);
      g.lineTo(51, browY);
    }
    g.stroke();

    // glasses
    if (s.glasses) {
      g.strokeStyle = INK;
      g.lineWidth = 2;
      if (s.glasses === 'sun') {
        g.fillStyle = '#0c0c10';
        rr(g, 31, 25, 12, 8, 3);
        g.fill();
        g.stroke();
        rr(g, 45, 25, 8, 8, 3);
        g.fill();
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.fillRect(34, 26.5, 4, 1.5);
      } else {
        g.fillStyle = 'rgba(200,230,255,0.25)';
        rr(g, 31, 24, 12, 10, s.glasses === 'round' ? 5 : 2);
        g.fill();
        g.stroke();
        rr(g, 45, 24, 8, 10, s.glasses === 'round' ? 4 : 2);
        g.fill();
        g.stroke();
      }
      g.beginPath();
      g.moveTo(43, 28);
      g.lineTo(45, 28);
      g.moveTo(31, 28);
      g.lineTo(22, 30);
      g.stroke();
    }

    // mustache / beard
    if (s.beard) {
      g.beginPath();
      g.moveTo(20, 42);
      g.quadraticCurveTo(24, 58, 34, 60);
      g.quadraticCurveTo(46, 60, 51, 48);
      g.quadraticCurveTo(46, 50, 44, 47);
      g.quadraticCurveTo(34, 52, 26, 44);
      g.closePath();
      inked(g, s.beard, 2);
    }
    if (s.mustache) {
      blob(g, [38, 42, 44, 39, 51, 40, 52, 44, 45, 44, 40, 45]);
      inked(g, s.mustache, 1.6);
    }

    // mouth
    const mouthCol = s.lips ?? (s.gold ? '#7a4a08' : '#6e2a22');
    g.strokeStyle = INK;
    g.lineWidth = 2;
    if (frame === 'talk' || frame === 'shock' || frame === 'hurt') {
      const open = frame === 'shock' ? 5 : frame === 'hurt' ? 3 : 3.8;
      ellipse(g, 45, 47, 4.2, open);
      inked(g, '#3a0e10', 1.8);
      g.fillStyle = '#d65a5a';
      ellipse(g, 45, 47 + open * 0.45, 2.6, open * 0.35);
      g.fill();
      if (frame !== 'hurt') {
        g.fillStyle = '#fff';
        g.fillRect(42, 47 - open + 0.8, 6, 1.6);
      }
    } else if (frame === 'smile') {
      g.beginPath();
      g.moveTo(39, 45);
      g.quadraticCurveTo(45, 52, 51, 44);
      g.closePath();
      inked(g, '#fff', 1.8);
    } else {
      g.beginPath();
      g.moveTo(39, 47);
      g.quadraticCurveTo(45, 48.5, 50, 45);
      g.stroke();
      if (s.lips) {
        g.strokeStyle = mouthCol;
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(40, 47);
        g.quadraticCurveTo(45, 48.5, 49, 45.5);
        g.stroke();
      }
    }

    // hair (front)
    const hs = s.hairStyle;
    const hairShape = (p: number[], col = hair) => {
      blob(g, p);
      inked(g, col);
    };
    if (hs === 'slick') {
      hairShape([10, 32, 9, 18, 16, 7, 30, 2, 45, 4, 54, 13, 52, 17, 42, 13, 32, 14, 24, 17, 18, 26, 16, 34]);
      g.strokeStyle = shade(hair, 1.6);
      g.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(16 + i * 6, 12 + i);
        g.quadraticCurveTo(30 + i * 3, 5, 46 + i, 9 + i);
        g.stroke();
      }
    } else if (hs === 'center') {
      hairShape([10, 32, 10, 14, 20, 5, 32, 3, 44, 6, 52, 16, 51, 21, 43, 15, 34, 13, 31, 9, 28, 13, 20, 17, 16, 30]);
      g.strokeStyle = hairD;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(31, 5);
      g.lineTo(31, 12);
      g.stroke();
    } else if (hs === 'long') {
      hairShape([12, 30, 10, 14, 20, 5, 34, 3, 46, 8, 52, 17, 44, 14, 32, 14, 22, 18, 18, 30]);
    } else if (hs === 'curls') {
      for (const [x, y, r] of [[18, 12, 9], [30, 6, 10], [42, 8, 9], [50, 16, 6], [12, 22, 8]]) {
        ellipse(g, x, y, r, r);
        inked(g, hair);
      }
    } else if (hs === 'short' || hs === 'buzz') {
      const p = hs === 'buzz' ? [12, 28, 11, 16, 20, 7, 32, 5, 44, 8, 51, 17, 44, 14, 30, 13, 20, 16, 16, 28] : [11, 30, 10, 15, 20, 5, 33, 3, 45, 7, 53, 16, 49, 18, 40, 14, 30, 15, 21, 18, 17, 30];
      hairShape(p);
    } else if (hs === 'bald') {
      g.strokeStyle = 'rgba(255,255,255,0.4)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(34, 18, 9, -2.4, -1.4);
      g.stroke();
      if (s.hair !== '#111111') hairShape([10, 36, 10, 26, 16, 24, 16, 36]);
    } else if (hs === 'updo') {
      ellipse(g, 20, 8, 11, 9);
      inked(g, hair);
      hairShape([10, 34, 9, 18, 18, 8, 32, 4, 46, 8, 53, 18, 48, 16, 38, 12, 28, 16, 18, 24, 15, 34]);
    } else if (hs === 'bob') {
      hairShape([8, 48, 6, 22, 14, 8, 30, 3, 46, 6, 54, 16, 54, 24, 46, 16, 32, 14, 24, 18, 20, 30, 18, 50]);
    } else if (hs === 'wavy') {
      hairShape([10, 32, 8, 16, 16, 6, 28, 2, 40, 4, 50, 10, 55, 18, 48, 18, 44, 13, 38, 16, 32, 12, 24, 17, 18, 26, 15, 33]);
    } else if (hs === 'ponytail') {
      hairShape([10, 32, 9, 16, 18, 6, 32, 3, 45, 6, 53, 16, 46, 14, 34, 13, 24, 17, 17, 30]);
    } else if (hs === 'cap') {
      hairShape([11, 34, 12, 26, 18, 30, 16, 36], hair);
      blob(g, [10, 24, 12, 10, 24, 3, 38, 3, 50, 10, 52, 20]);
      inked(g, s.top);
      poly(g, [46, 18, 64, 20, 62, 24, 46, 23]);
      inked(g, shade(s.top, 0.8));
      text(g, 'C', 32, 13, { size: 9, color: '#fff' });
    } else if (hs === 'papercap') {
      hairShape([11, 34, 10, 22, 18, 20, 16, 34]);
      poly(g, [10, 22, 14, 8, 50, 8, 54, 22]);
      inked(g, '#ffffff');
      g.fillStyle = '#d62828';
      g.fillRect(12, 17, 40, 3);
    }

    if (s.headband) {
      g.beginPath();
      g.moveTo(9, 22);
      g.quadraticCurveTo(30, 13, 53, 19);
      g.lineTo(53, 24);
      g.quadraticCurveTo(30, 18, 10, 28);
      g.closePath();
      inked(g, s.headband, 2);
    }

    // hurt stars/sweat
    if (frame === 'hurt') {
      g.fillStyle = '#8fd6ff';
      ellipse(g, 56, 20, 2, 3.5);
      g.fill();
    }
  });
}

function outfitColors(s: CharSpec) {
  const top = s.top;
  return { top, topD: shade(top, 0.72), topL: shade(top, 1.15) };
}

export function drawTorso(s: CharSpec): PartCanvas {
  const skirt = s.outfit === 'gown';
  const tails = s.outfit === 'butler';
  const long = s.outfit === 'hospital' || s.outfit === 'sheet' || s.outfit === 'scrubs';
  const h = skirt ? 130 : tails ? 100 : long ? 86 : 70;
  const bulk = s.bulk ?? 1;
  return part(72, h, 36, 62, (g) => {
    const { top, topD, topL } = outfitColors(s);
    const cx = 36;
    const X = (dx: number) => cx + dx * bulk;
    // silhouette (hip at y=62)
    const hem = s.outfit === 'jersey' ? 66 : s.outfit === 'suit' ? 66 : 63;
    const body = [X(-17), 12, X(-8), 4, X(10), 4, X(19), 11, X(20), 26, X(16), 44, X(15), hem, X(-15), hem, X(-16), 44, X(-20), 26];

    if (tails) {
      poly(g, [X(-15), 50, X(-6), 52, X(-8), 96, X(-18), 92]);
      inked(g, topD);
    }
    if (skirt) {
      g.beginPath();
      g.moveTo(X(-14), 48);
      g.quadraticCurveTo(X(-26), 100, X(-30), 126);
      g.lineTo(X(30), 126);
      g.quadraticCurveTo(X(24), 100, X(14), 48);
      g.closePath();
      inked(g, top);
      within(g, () => {
        g.fillStyle = topD;
        g.beginPath();
        g.moveTo(X(-14), 48);
        g.quadraticCurveTo(X(-26), 100, X(-30), 126);
        g.lineTo(X(-10), 126);
        g.quadraticCurveTo(X(-6), 90, X(-4), 48);
        g.fill();
        g.fillStyle = s.top2 ?? topL;
        for (let i = 0; i < 40; i++) {
          const yy = 55 + ((i * 37) % 70);
          const xx = X(-20) + ((i * 53) % 44);
          g.fillRect(xx, yy, 1.8, 1.8);
        }
      });
    }
    if (long) {
      poly(g, [X(-16), 40, X(16), 40, X(19), 84, X(-19), 84]);
      inked(g, top);
      if (s.outfit === 'hospital') {
        g.fillStyle = s.top2 ?? topD;
        for (let y = 46; y < 82; y += 7) for (let x = -14; x < 16; x += 7) g.fillRect(X(x) + ((y / 7) % 2) * 3, y, 2.5, 2.5);
      }
      if (s.outfit === 'sheet') {
        g.strokeStyle = 'rgba(120,180,220,0.6)';
        g.lineWidth = 1.2;
        for (let x = -12; x < 16; x += 6) {
          g.beginPath();
          g.moveTo(X(x), 44);
          g.lineTo(X(x + 1), 82);
          g.stroke();
        }
      }
    }

    blob(g, body);
    inked(g, top);
    blob(g, body);
    within(g, () => {
      g.fillStyle = topD;
      g.fillRect(0, 0, X(-6), 90);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(X(8), 0, 30, 90);
    });

    const shirt = s.shirt ?? '#ffffff';
    switch (s.outfit) {
      case 'suit':
      case 'butler': {
        // shirt V + lapels
        poly(g, [X(-2), 4, X(12), 4, X(6), 34]);
        inked(g, shirt, 2);
        if (s.outfit === 'butler') {
          // white waistcoat
          poly(g, [X(-1), 20, X(13), 20, X(12), 48, X(0), 48]);
          inked(g, '#f4f4f0', 2);
          g.fillStyle = INK;
          for (const y of [26, 33, 40]) {
            ellipse(g, X(6), y, 1.2, 1.2);
            g.fill();
          }
        }
        if (s.tieStyle === 'tie') {
          poly(g, [X(4), 5, X(8), 5, X(9), 30, X(6), 35, X(3), 30]);
          inked(g, s.tie ?? '#111', 1.8);
        } else if (s.tieStyle === 'bow') {
          poly(g, [X(0), 3, X(6), 7, X(12), 3, X(12), 11, X(6), 7, X(0), 11]);
          inked(g, s.tie ?? '#111', 1.6);
        }
        g.fillStyle = shade(top, 0.55);
        poly(g, [X(-4), 4, X(4), 34, X(-2), 38, X(-8), 16]);
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 1.6;
        g.stroke();
        poly(g, [X(14), 4, X(7), 34, X(10), 36, X(18), 14]);
        g.fillStyle = shade(top, 1.25);
        g.fill();
        g.stroke();
        g.fillStyle = '#0a0a0a';
        for (const y of [44, 54]) {
          ellipse(g, X(9), y, 1.6, 1.6);
          g.fill();
        }
        break;
      }
      case 'jersey': {
        const t2 = s.top2 ?? '#1f4fd1';
        g.fillStyle = t2;
        blob(g, body);
        within(g, () => {
          g.fillStyle = t2;
          g.fillRect(0, 50, 80, 5);
          g.fillRect(0, 58, 80, 3);
          g.fillStyle = shade(top, 0.8);
          g.fillRect(0, 0, X(-8), 90);
        });
        poly(g, [X(-2), 3, X(12), 3, X(5), 12]);
        inked(g, t2, 2);
        if (s.number) text(g, s.number, X(7), 30, { size: 17, color: t2, stroke: INK, strokeW: 3 });
        break;
      }
      case 'track': {
        const t2 = s.top2 ?? '#fff';
        g.strokeStyle = INK;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(X(6), 6);
        g.lineTo(X(6), 64);
        g.stroke();
        g.fillStyle = t2;
        g.fillRect(X(-18), 22, 4, 36);
        poly(g, [X(-3), 3, X(14), 3, X(12), 9, X(0), 9]);
        inked(g, t2, 1.6);
        break;
      }
      case 'vest': {
        blob(g, body);
        within(g, () => {
          g.fillStyle = shirt;
          g.fillRect(0, 0, 80, 90);
          g.fillStyle = shade(shirt, 0.85);
          g.fillRect(0, 0, X(-8), 90);
          g.fillStyle = top;
          poly(g, [X(-17), 8, X(-2), 8, X(6), 40, X(16), 18, X(20), 26, X(16), 70, X(-16), 70]);
          g.fill();
          g.strokeStyle = INK;
          g.lineWidth = 1.6;
          g.stroke();
        });
        blob(g, body);
        g.strokeStyle = INK;
        g.lineWidth = LINE;
        g.stroke();
        poly(g, [X(0), 3, X(6), 7, X(12), 3, X(12), 11, X(6), 7, X(0), 11]);
        inked(g, s.tie ?? '#7a1030', 1.6);
        break;
      }
      case 'cardigan': {
        poly(g, [X(0), 4, X(12), 4, X(6), 20]);
        inked(g, shirt, 1.8);
        g.strokeStyle = INK;
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(X(6), 20);
        g.lineTo(X(8), 64);
        g.stroke();
        g.fillStyle = s.top2 ?? topD;
        for (const y of [28, 38, 48, 58]) {
          ellipse(g, X(9.5), y, 1.6, 1.6);
          g.fill();
        }
        break;
      }
      case 'apron': {
        poly(g, [X(-4), 20, X(16), 20, X(15), 66, X(-6), 66]);
        inked(g, s.top2 ?? '#2e7d4f', 2);
        g.strokeStyle = s.top2 ?? '#2e7d4f';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(X(-2), 20);
        g.lineTo(X(0), 4);
        g.moveTo(X(14), 20);
        g.lineTo(X(12), 4);
        g.stroke();
        break;
      }
      case 'polo':
      case 'tee': {
        poly(g, [X(-2), 3, X(12), 3, X(6), 10]);
        inked(g, s.top2 ?? topD, 1.6);
        if (s.outfit === 'polo') {
          g.fillStyle = '#fff';
          ellipse(g, X(6), 14, 1.2, 1.2);
          g.fill();
          ellipse(g, X(6), 19, 1.2, 1.2);
          g.fill();
        }
        break;
      }
      case 'gown': {
        g.fillStyle = s.top2 ?? topL;
        for (let i = 0; i < 18; i++) g.fillRect(X(-12) + ((i * 29) % 28), 10 + ((i * 17) % 40), 1.6, 1.6);
        break;
      }
      case 'scrubs': {
        poly(g, [X(-2), 3, X(12), 3, X(5), 16]);
        inked(g, s.top2 ?? topD, 1.6);
        rr(g, X(8), 26, 9, 8, 1);
        inked(g, s.top2 ?? topD, 1.4);
        break;
      }
      case 'hospital':
      case 'sheet':
        break;
    }

    // accessories
    switch (s.accessory) {
      case 'pocketsquare':
        poly(g, [X(11), 20, X(17), 18, X(16), 23]);
        inked(g, '#f5f5f0', 1.2);
        break;
      case 'flagpin':
        g.fillStyle = '#c0152a';
        g.fillRect(X(12), 16, 5, 3);
        g.fillStyle = '#1c2b8a';
        g.fillRect(X(12), 16, 2, 2);
        break;
      case 'pearls':
        g.fillStyle = '#fbf7ee';
        for (let i = 0; i < 7; i++) {
          ellipse(g, X(-2) + i * 2.2, 5 + Math.sin(i / 2) * 3, 1.3, 1.3);
          g.fill();
        }
        break;
      case 'whistle':
        g.strokeStyle = '#d0d0d0';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(X(-2), 4);
        g.lineTo(X(6), 22);
        g.lineTo(X(12), 4);
        g.stroke();
        rr(g, X(4), 21, 6, 4, 1);
        inked(g, '#c9c9c9', 1.2);
        break;
      case 'lanyard':
        g.strokeStyle = '#e8b83a';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(X(0), 4);
        g.lineTo(X(6), 30);
        g.lineTo(X(12), 4);
        g.stroke();
        rr(g, X(2), 30, 9, 11, 1);
        inked(g, '#ffffff', 1.2);
        g.fillStyle = '#e8b83a';
        g.fillRect(X(3.5), 32, 6, 2);
        break;
      case 'towel':
        poly(g, [X(10), 2, X(19), 8, X(20), 30, X(14), 28]);
        inked(g, '#f4f4f4', 1.6);
        break;
      case 'bolt':
        ellipse(g, X(-4), 3, 2.2, 2.2);
        inked(g, '#9aa3ad', 1.2);
        break;
      case 'stethoscope':
        g.strokeStyle = '#333';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(X(-2), 4);
        g.quadraticCurveTo(X(6), 30, X(14), 4);
        g.stroke();
        ellipse(g, X(8), 26, 2.4, 2.4);
        inked(g, '#bfc6cc', 1);
        break;
    }
  });
}

export function drawCape(s: CharSpec): PartCanvas {
  return part(60, 110, 44, 8, (g) => {
    g.beginPath();
    g.moveTo(40, 4);
    g.quadraticCurveTo(24, 50, 6, 104);
    g.lineTo(34, 100);
    g.quadraticCurveTo(44, 60, 50, 8);
    g.closePath();
    inked(g, s.cape ?? '#200');
    g.fillStyle = '#7a0f18';
    g.beginPath();
    g.moveTo(44, 10);
    g.quadraticCurveTo(38, 60, 32, 98);
    g.lineTo(36, 98);
    g.quadraticCurveTo(44, 60, 48, 10);
    g.fill();
  });
}

function limbColor(s: CharSpec, which: 'arm' | 'leg'): string {
  if (which === 'arm') {
    if (s.outfit === 'vest') return s.shirt ?? '#fff';
    return s.top;
  }
  return s.pants;
}

export function drawUpperArm(s: CharSpec, back: boolean): PartCanvas {
  const k = back ? 0.82 : 1;
  const bulk = s.bulk ?? 1;
  const w = 13 * Math.min(1.25, bulk);
  return part(24, 36, 12, 5, (g) => {
    const col = shade(limbColor(s, 'arm'), k);
    rr(g, 12 - w / 2, 0, w, 32, w / 2);
    inked(g, col);
    if (s.shortSleeves) {
      rr(g, 12 - w / 2 + 1.5, 16, w - 3, 16, (w - 3) / 2);
      inked(g, shade(s.skin, k), 2);
    }
    if (s.outfit === 'jersey' && s.top2) {
      g.fillStyle = shade(s.top2, k);
      g.fillRect(12 - w / 2 + 1.5, 20, w - 3, 4);
    }
    if (s.outfit === 'track' && s.top2) {
      g.fillStyle = shade(s.top2, k);
      g.fillRect(12 - w / 2 + 1.5, 4, 3, 26);
    }
  });
}

export function drawForearm(s: CharSpec, back: boolean): PartCanvas {
  const k = back ? 0.82 : 1;
  const bulk = s.bulk ?? 1;
  const w = 12 * Math.min(1.2, bulk);
  return part(26, 42, 13, 4, (g) => {
    const col = shade(limbColor(s, 'arm'), k);
    const bare = s.shortSleeves || s.outfit === 'sheet';
    rr(g, 13 - w / 2, 0, w, 27, w / 2);
    inked(g, bare ? shade(s.skin, k) : col);
    if (s.outfit === 'suit' || s.outfit === 'butler') {
      rr(g, 13 - w / 2 + 0.5, 22, w - 1, 5, 2);
      inked(g, shade(s.shirt ?? '#fff', k), 1.5);
    }
    if (s.outfit === 'vest') {
      g.strokeStyle = shade('#d8d0c0', k);
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(13 - w / 2 + 2, 8);
      g.lineTo(13 + w / 2 - 2, 8);
      g.stroke();
    }
    const hand = s.gloves ?? (s.gold ? '#e9b949' : s.skin);
    ellipse(g, 13, 32, 6.4, 7.2);
    inked(g, shade(hand, k), 2.4);
    ellipse(g, 17.5, 30, 2.4, 3.6, 0.4);
    inked(g, shade(hand, k * 0.95), 1.6);
  });
}

export function drawThigh(s: CharSpec, back: boolean): PartCanvas {
  const k = back ? 0.8 : 1;
  const bulk = s.bulk ?? 1;
  const w = 16 * Math.min(1.25, bulk);
  return part(28, 40, 14, 5, (g) => {
    const col = s.bareLegs ? shade(s.skin, k) : shade(limbColor(s, 'leg'), k);
    rr(g, 14 - w / 2, 0, w, 36, w / 2.2);
    inked(g, col);
    if (s.skates && !s.bareLegs) {
      g.fillStyle = shade(s.top2 ?? '#fff', k);
      g.fillRect(14 - w / 2 + 2, 26, w - 4, 3);
    }
  });
}

export function drawShin(s: CharSpec, back: boolean): PartCanvas {
  const k = back ? 0.8 : 1;
  const bulk = s.bulk ?? 1;
  const w = 14 * Math.min(1.2, bulk);
  return part(34, 48, 12, 4, (g) => {
    const col = s.bareLegs ? shade(s.skin, k) : shade(limbColor(s, 'leg'), k);
    if (s.skates) {
      rr(g, 12 - w / 2, 0, w, 24, w / 2.2);
      inked(g, shade(s.top2 && s.outfit === 'jersey' ? s.top2 : col, k));
      // skate boot
      blob(g, [4, 22, 18, 22, 20, 34, 30, 36, 30, 40, 4, 40]);
      inked(g, shade('#1a1a1a', k));
      g.fillStyle = '#e0e6ea';
      g.fillRect(3, 42, 29, 2.6);
      g.strokeStyle = INK;
      g.lineWidth = 1.5;
      g.strokeRect(3, 42, 29, 2.6);
      g.beginPath();
      g.moveTo(8, 40);
      g.lineTo(8, 42);
      g.moveTo(26, 40);
      g.lineTo(26, 42);
      g.stroke();
      return;
    }
    rr(g, 12 - w / 2, 0, w, 32, w / 2.2);
    inked(g, col);
    const shoe = shade(s.shoes, k);
    blob(g, [4, 30, 18, 29, 24, 33, 30, 36, 29, 41, 4, 41]);
    inked(g, shoe);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(18, 33, 6, 1.5);
  });
}

/** Everything a rig needs, keyed by part name. */
export interface CharacterParts {
  heads: Record<HeadFrame, PartCanvas>;
  torso: PartCanvas;
  cape: PartCanvas | null;
  uarmF: PartCanvas;
  uarmB: PartCanvas;
  farmF: PartCanvas;
  farmB: PartCanvas;
  thighF: PartCanvas;
  thighB: PartCanvas;
  shinF: PartCanvas;
  shinB: PartCanvas;
}

export function drawCharacter(s: CharSpec): CharacterParts {
  const frames: HeadFrame[] = ['idle', 'talk', 'blink', 'hurt', 'smile', 'shock'];
  const heads = {} as Record<HeadFrame, PartCanvas>;
  for (const f of frames) heads[f] = drawHead(s, f);
  return {
    heads,
    torso: drawTorso(s),
    cape: s.cape ? drawCape(s) : null,
    uarmF: drawUpperArm(s, false),
    uarmB: drawUpperArm(s, true),
    farmF: drawForearm(s, false),
    farmB: drawForearm(s, true),
    thighF: drawThigh(s, false),
    thighB: drawThigh(s, true),
    shinF: drawShin(s, false),
    shinB: drawShin(s, true),
  };
}

/** Dialogue portrait: head + shoulders on a tinted card, returned as a data URL. */
export function drawPortrait(s: CharSpec, accent: string): string {
  const parts = drawCharacter(s);
  const W = 160;
  const H = 160;
  const { c, g } = makeCanvas(W, H);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mix(accent, '#101018', 0.55));
  bg.addColorStop(1, '#0b0b12');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // cheap lens flare in the corner, naturally
  const fl = g.createRadialGradient(W * 0.82, H * 0.18, 0, W * 0.82, H * 0.18, 60);
  fl.addColorStop(0, 'rgba(255,255,255,0.45)');
  fl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = fl;
  g.fillRect(0, 0, W, H);
  const sc = 1.7;
  const place = (p: PartCanvas, x: number, y: number) => {
    g.drawImage(p.canvas, x - p.ox * sc, y - p.oy * sc, (p.canvas.width / R) * sc, (p.canvas.height / R) * sc);
  };
  place(parts.torso, 78, 250);
  place(parts.heads.idle, 76, 158);
  g.strokeStyle = 'rgba(255,255,255,0.15)';
  g.lineWidth = 4;
  g.strokeRect(2, 2, W - 4, H - 4);
  return c.toDataURL('image/png');
}
