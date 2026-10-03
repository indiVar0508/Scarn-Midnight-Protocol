import { audio } from './engine';

/**
 * Synthesized sound effects. Every sound is generated from oscillators and
 * filtered noise at play time: no samples, no licensing questions.
 */

interface ToneOpts {
  type?: OscillatorType;
  f: number;
  to?: number;
  dur: number;
  vol?: number;
  delay?: number;
  attack?: number;
  curve?: 'exp' | 'lin';
  pan?: number;
  q?: number;
  filter?: number;
}

function out(pan = 0): AudioNode {
  const ctx = audio.ctx!;
  if (!pan) return audio.sfx;
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(audio.sfx);
  return p;
}

function tone(o: ToneOpts): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const t = ctx.currentTime + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.to !== undefined) {
    if (o.curve === 'lin') osc.frequency.linearRampToValueAtTime(o.to, t + o.dur);
    else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + o.dur);
  }
  const g = ctx.createGain();
  const v = o.vol ?? 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + (o.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  let node: AudioNode = osc;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.filter;
    f.Q.value = o.q ?? 1;
    node.connect(f);
    node = f;
  }
  node.connect(g).connect(out(o.pan));
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

interface NoiseOpts {
  dur: number;
  type?: BiquadFilterType;
  f?: number;
  to?: number;
  q?: number;
  vol?: number;
  delay?: number;
  attack?: number;
  pan?: number;
  reverb?: number;
}

function noise(o: NoiseOpts): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const t = ctx.currentTime + (o.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = audio.noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.f ?? 1000, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  const v = o.vol ?? 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + (o.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(f).connect(g).connect(out(o.pan));
  if (o.reverb) {
    const s = ctx.createGain();
    s.gain.value = o.reverb;
    g.connect(s).connect(audio.reverbSend);
  }
  src.start(t, Math.random());
  src.stop(t + o.dur + 0.05);
}

let lastPlayed: Record<string, number> = {};

const SFX: Record<string, (pan: number) => void> = {
  ui_move: (p) => tone({ type: 'square', f: 880, dur: 0.05, vol: 0.06, pan: p, filter: 3000 }),
  ui_select: (p) => {
    tone({ type: 'square', f: 660, dur: 0.07, vol: 0.08, pan: p, filter: 3000 });
    tone({ type: 'square', f: 990, dur: 0.09, vol: 0.08, delay: 0.06, pan: p, filter: 3000 });
  },
  ui_back: (p) => tone({ type: 'square', f: 520, to: 330, dur: 0.1, vol: 0.07, pan: p, filter: 2500 }),
  ui_blip: (p) => tone({ type: 'triangle', f: 1200 + Math.random() * 200, dur: 0.025, vol: 0.04, pan: p }),
  shoot: (p) => {
    noise({ dur: 0.12, type: 'bandpass', f: 2500, to: 600, q: 0.8, vol: 0.45, pan: p });
    tone({ type: 'square', f: 220, to: 60, dur: 0.12, vol: 0.25, pan: p, filter: 1200 });
    noise({ dur: 0.35, type: 'lowpass', f: 800, vol: 0.12, delay: 0.02, pan: p, reverb: 0.4 });
  },
  enemy_shoot: (p) => {
    noise({ dur: 0.1, type: 'bandpass', f: 1500, to: 500, q: 1, vol: 0.3, pan: p });
    tone({ type: 'sawtooth', f: 180, to: 70, dur: 0.1, vol: 0.15, pan: p, filter: 900 });
  },
  ricochet: (p) => tone({ type: 'sine', f: 2400, to: 900, dur: 0.25, vol: 0.12, pan: p }),
  hit: (p) => {
    noise({ dur: 0.08, type: 'lowpass', f: 1200, vol: 0.5, pan: p });
    tone({ type: 'sine', f: 140, to: 60, dur: 0.12, vol: 0.4, pan: p });
  },
  knockdown: (p) => {
    tone({ type: 'sine', f: 90, to: 40, dur: 0.3, vol: 0.5, pan: p });
    noise({ dur: 0.25, type: 'lowpass', f: 500, vol: 0.3, delay: 0.05, pan: p });
    tone({ type: 'triangle', f: 880, to: 1760, dur: 0.18, vol: 0.06, delay: 0.1, pan: p });
  },
  hurt: (p) => {
    tone({ type: 'square', f: 300, to: 120, dur: 0.18, vol: 0.2, pan: p, filter: 1500 });
    noise({ dur: 0.1, type: 'lowpass', f: 900, vol: 0.3, pan: p });
  },
  dodge: (p) => noise({ dur: 0.22, type: 'bandpass', f: 600, to: 2400, q: 1.4, vol: 0.25, pan: p }),
  step: (p) => noise({ dur: 0.05, type: 'lowpass', f: 400 + Math.random() * 200, vol: 0.12, pan: p }),
  chop: (p) => {
    noise({ dur: 0.12, type: 'bandpass', f: 1800, to: 400, vol: 0.35, pan: p });
    tone({ type: 'sine', f: 180, to: 80, dur: 0.1, vol: 0.35, pan: p });
  },
  door: (p) => {
    noise({ dur: 0.35, type: 'lowpass', f: 300, to: 150, vol: 0.3, pan: p });
    tone({ type: 'triangle', f: 90, dur: 0.2, vol: 0.2, delay: 0.25, pan: p });
  },
  locked: (p) => {
    tone({ type: 'square', f: 180, dur: 0.12, vol: 0.12, pan: p, filter: 800 });
    tone({ type: 'square', f: 150, dur: 0.16, vol: 0.12, delay: 0.14, pan: p, filter: 800 });
  },
  beep: (p) => tone({ type: 'square', f: 1320, dur: 0.08, vol: 0.08, pan: p, filter: 4000 }),
  beep_ok: (p) => {
    tone({ type: 'square', f: 988, dur: 0.07, vol: 0.08, pan: p, filter: 4000 });
    tone({ type: 'square', f: 1480, dur: 0.12, vol: 0.08, delay: 0.08, pan: p, filter: 4000 });
  },
  beep_bad: (p) => tone({ type: 'sawtooth', f: 200, dur: 0.25, vol: 0.12, pan: p, filter: 1200 }),
  spotted: (p) => {
    tone({ type: 'square', f: 1400, dur: 0.1, vol: 0.12, pan: p, filter: 5000 });
    tone({ type: 'square', f: 1400, dur: 0.1, vol: 0.12, delay: 0.14, pan: p, filter: 5000 });
  },
  suspicious: (p) => tone({ type: 'sine', f: 600, to: 900, dur: 0.2, vol: 0.1, pan: p }),
  alarm: (p) => {
    for (let i = 0; i < 3; i++) tone({ type: 'sawtooth', f: 700, to: 1100, dur: 0.3, vol: 0.12, delay: i * 0.32, pan: p, filter: 2500, curve: 'lin' });
  },
  coin_flip: (p) => {
    tone({ type: 'sine', f: 2600, dur: 0.3, vol: 0.15, pan: p });
    tone({ type: 'sine', f: 3900, dur: 0.2, vol: 0.08, pan: p });
  },
  coin_land: (p) => {
    for (let i = 0; i < 5; i++) tone({ type: 'sine', f: 2200 + i * 80, dur: 0.08, vol: 0.12 / (i + 1), delay: i * (0.09 - i * 0.012), pan: p });
  },
  puck: (p) => {
    tone({ type: 'square', f: 900, to: 300, dur: 0.05, vol: 0.2, pan: p, filter: 2500 });
    noise({ dur: 0.05, type: 'highpass', f: 2000, vol: 0.25, pan: p });
  },
  slapshot: (p) => {
    noise({ dur: 0.08, type: 'highpass', f: 1500, vol: 0.5, pan: p });
    tone({ type: 'square', f: 600, to: 150, dur: 0.1, vol: 0.3, pan: p, filter: 2000 });
    noise({ dur: 0.4, type: 'bandpass', f: 3000, to: 800, vol: 0.12, delay: 0.03, pan: p });
  },
  stick: (p) => noise({ dur: 0.12, type: 'bandpass', f: 1200, to: 3000, q: 2, vol: 0.18, pan: p }),
  skate: (p) => noise({ dur: 0.18, type: 'highpass', f: 3000, to: 5000, vol: 0.08, attack: 0.05, pan: p }),
  skate_stop: (p) => noise({ dur: 0.35, type: 'highpass', f: 2500, to: 1200, vol: 0.2, attack: 0.02, pan: p }),
  check: (p) => {
    noise({ dur: 0.2, type: 'lowpass', f: 700, vol: 0.5, pan: p });
    tone({ type: 'sine', f: 110, to: 50, dur: 0.25, vol: 0.45, pan: p });
    noise({ dur: 0.4, type: 'bandpass', f: 400, vol: 0.12, delay: 0.05, pan: p, reverb: 0.5 });
  },
  goal_horn: (p) => {
    for (const f of [220, 277, 330]) tone({ type: 'sawtooth', f, dur: 1.6, vol: 0.12, attack: 0.05, pan: p, filter: 1400 });
    noise({ dur: 2, type: 'bandpass', f: 900, q: 0.4, vol: 0.2, attack: 0.3, reverb: 0.5 });
  },
  whistle: (p) => {
    tone({ type: 'sine', f: 2800, dur: 0.5, vol: 0.12, attack: 0.02, pan: p });
    tone({ type: 'sine', f: 2900, dur: 0.5, vol: 0.06, attack: 0.02, pan: p });
  },
  buzzer: (p) => tone({ type: 'sawtooth', f: 110, dur: 0.9, vol: 0.18, pan: p, filter: 900 }),
  crowd_cheer: () => {
    noise({ dur: 2.2, type: 'bandpass', f: 1000, q: 0.5, vol: 0.28, attack: 0.25, reverb: 0.6 });
    noise({ dur: 2, type: 'bandpass', f: 2200, q: 0.8, vol: 0.12, attack: 0.3 });
  },
  crowd_ooh: () => {
    tone({ type: 'sawtooth', f: 220, to: 180, dur: 1.2, vol: 0.05, attack: 0.3, filter: 600 });
    noise({ dur: 1.3, type: 'bandpass', f: 500, q: 1, vol: 0.15, attack: 0.3 });
  },
  applause: () => {
    const ctx = audio.ctx;
    if (!ctx) return;
    for (let i = 0; i < 40; i++) noise({ dur: 0.04, type: 'bandpass', f: 1000 + Math.random() * 1500, q: 1.5, vol: 0.12 + Math.random() * 0.1, delay: Math.random() * 2.4, pan: Math.random() * 1.6 - 0.8 });
  },
  sparse_applause: () => {
    for (let i = 0; i < 9; i++) noise({ dur: 0.04, type: 'bandpass', f: 1200 + Math.random() * 800, q: 1.5, vol: 0.14, delay: i * 0.45 + Math.random() * 0.2, pan: Math.random() - 0.5 });
  },
  crickets: () => {
    for (let c = 0; c < 4; c++) for (let i = 0; i < 3; i++) tone({ type: 'sine', f: 4400, dur: 0.035, vol: 0.05, delay: c * 0.7 + i * 0.06 });
  },
  cough: (p) => {
    noise({ dur: 0.15, type: 'bandpass', f: 600, q: 1.2, vol: 0.25, pan: p });
    noise({ dur: 0.12, type: 'bandpass', f: 500, q: 1.2, vol: 0.2, delay: 0.2, pan: p });
  },
  explosion: (p) => {
    noise({ dur: 2.2, type: 'lowpass', f: 1800, to: 120, vol: 0.9, pan: p, reverb: 0.7 });
    tone({ type: 'sine', f: 90, to: 28, dur: 1.4, vol: 0.8, pan: p });
    noise({ dur: 0.3, type: 'highpass', f: 2000, vol: 0.3, pan: p });
  },
  small_boom: (p) => {
    noise({ dur: 0.6, type: 'lowpass', f: 1400, to: 200, vol: 0.5, pan: p, reverb: 0.3 });
    tone({ type: 'sine', f: 120, to: 40, dur: 0.4, vol: 0.4, pan: p });
  },
  fax: (p) => {
    tone({ type: 'sine', f: 1100, dur: 0.5, vol: 0.08, pan: p });
    tone({ type: 'sine', f: 2100, dur: 0.4, vol: 0.06, delay: 0.55, pan: p });
    for (let i = 0; i < 10; i++) noise({ dur: 0.08, type: 'bandpass', f: 1700 + (i % 3) * 400, q: 6, vol: 0.12, delay: 1 + i * 0.09, pan: p });
    tone({ type: 'square', f: 180, dur: 1.2, vol: 0.04, delay: 1.9, pan: p, filter: 500 });
  },
  phone_ring: (p) => {
    for (let r = 0; r < 2; r++)
      for (let i = 0; i < 12; i++) {
        tone({ type: 'sine', f: 480, dur: 0.035, vol: 0.12, delay: r * 0.9 + i * 0.04, pan: p });
        tone({ type: 'sine', f: 620, dur: 0.035, vol: 0.08, delay: r * 0.9 + i * 0.04 + 0.02, pan: p });
      }
  },
  pickup: (p) => noise({ dur: 0.1, type: 'lowpass', f: 900, vol: 0.3, pan: p }),
  tape_click: (p) => {
    noise({ dur: 0.03, type: 'highpass', f: 2000, vol: 0.4, pan: p });
    tone({ type: 'square', f: 120, dur: 0.05, vol: 0.12, pan: p, filter: 600 });
  },
  rewind: (p) => tone({ type: 'sawtooth', f: 300, to: 1400, dur: 0.8, vol: 0.05, pan: p, filter: 2400 }),
  scratch: (p) => {
    noise({ dur: 0.18, type: 'bandpass', f: 800, to: 2800, q: 3, vol: 0.35, pan: p });
    noise({ dur: 0.14, type: 'bandpass', f: 2600, to: 700, q: 3, vol: 0.3, delay: 0.16, pan: p });
  },
  projector: (p) => {
    for (let i = 0; i < 16; i++) noise({ dur: 0.02, type: 'highpass', f: 3000, vol: 0.06, delay: i * 0.083, pan: p });
    tone({ type: 'sawtooth', f: 60, dur: 1.4, vol: 0.02, pan: p, filter: 300 });
  },
  vhs: (p) => {
    noise({ dur: 0.5, type: 'bandpass', f: 200, to: 3000, q: 0.8, vol: 0.18, pan: p });
    tone({ type: 'sine', f: 15000, dur: 0.6, vol: 0.02, pan: p });
  },
  whoosh: (p) => noise({ dur: 0.4, type: 'bandpass', f: 400, to: 3000, q: 1, vol: 0.25, attack: 0.1, pan: p }),
  slam: (p) => {
    tone({ type: 'sine', f: 110, to: 35, dur: 0.6, vol: 0.7, pan: p });
    noise({ dur: 0.5, type: 'lowpass', f: 2500, to: 200, vol: 0.5, pan: p, reverb: 0.6 });
  },
  stamp: (p) => {
    noise({ dur: 0.1, type: 'lowpass', f: 900, vol: 0.6, pan: p });
    tone({ type: 'sine', f: 160, to: 70, dur: 0.15, vol: 0.4, pan: p });
  },
  shutter: (p) => {
    noise({ dur: 0.03, type: 'highpass', f: 3000, vol: 0.4, pan: p });
    noise({ dur: 0.04, type: 'highpass', f: 2500, vol: 0.3, delay: 0.06, pan: p });
  },
  freeze: (p) => {
    noise({ dur: 0.05, type: 'highpass', f: 3000, vol: 0.4, pan: p });
    tone({ type: 'sine', f: 1800, to: 900, dur: 0.3, vol: 0.12, pan: p });
  },
  dart: (p) => noise({ dur: 0.15, type: 'bandpass', f: 3000, to: 5000, q: 4, vol: 0.3, pan: p }),
  slide_down: (p) => tone({ type: 'sine', f: 1800, to: 300, dur: 0.9, vol: 0.18, curve: 'lin', pan: p }),
  slide_up: (p) => tone({ type: 'sine', f: 300, to: 1800, dur: 0.6, vol: 0.18, curve: 'lin', pan: p }),
  boing: (p) => tone({ type: 'sine', f: 220, to: 660, dur: 0.3, vol: 0.25, pan: p }),
  pose: (p) => {
    for (let i = 0; i < 4; i++) tone({ type: 'sine', f: 1568 * Math.pow(1.26, i), dur: 0.25, vol: 0.08, delay: i * 0.045, pan: p });
    noise({ dur: 0.5, type: 'highpass', f: 6000, vol: 0.06, attack: 0.05, pan: p, reverb: 0.5 });
  },
  sparkle: (p) => {
    for (let i = 0; i < 3; i++) tone({ type: 'sine', f: 2093 * (1 + i * 0.5), dur: 0.2, vol: 0.06, delay: i * 0.06, pan: p });
  },
  clink: (p) => {
    tone({ type: 'sine', f: 3200, dur: 0.3, vol: 0.12, pan: p });
    tone({ type: 'sine', f: 4700, dur: 0.2, vol: 0.06, pan: p });
  },
  mug_ting: (p) => {
    tone({ type: 'sine', f: 2637, dur: 1.2, vol: 0.25, pan: p });
    tone({ type: 'sine', f: 3950, dur: 0.8, vol: 0.12, pan: p });
    tone({ type: 'sine', f: 5274, dur: 0.5, vol: 0.06, pan: p });
  },
  jukebox: (p) => {
    tone({ type: 'sine', f: 1800, dur: 0.15, vol: 0.1, pan: p });
    noise({ dur: 0.3, type: 'lowpass', f: 600, vol: 0.2, delay: 0.3, pan: p });
    noise({ dur: 0.6, type: 'highpass', f: 4000, vol: 0.05, delay: 0.6, pan: p });
  },
  robot: (p) => {
    tone({ type: 'square', f: 1760, dur: 0.05, vol: 0.06, pan: p, filter: 5000 });
    tone({ type: 'square', f: 2350, dur: 0.05, vol: 0.06, delay: 0.07, pan: p, filter: 5000 });
  },
  ghost: (p) => {
    tone({ type: 'sine', f: 400, to: 800, dur: 1.4, vol: 0.12, attack: 0.3, pan: p, curve: 'lin' });
    noise({ dur: 1.4, type: 'bandpass', f: 900, to: 2400, q: 3, vol: 0.1, attack: 0.4, pan: p, reverb: 0.8 });
  },
  cannon: (p) => {
    noise({ dur: 0.25, type: 'lowpass', f: 1200, to: 300, vol: 0.6, pan: p });
    tone({ type: 'sine', f: 200, to: 60, dur: 0.25, vol: 0.4, pan: p });
  },
  heart: (p) => tone({ type: 'sine', f: 1050, dur: 0.12, vol: 0.12, pan: p }),
  heart_alarm: (p) => {
    tone({ type: 'square', f: 960, dur: 0.12, vol: 0.08, pan: p, filter: 3000 });
    tone({ type: 'square', f: 960, dur: 0.12, vol: 0.08, delay: 0.18, pan: p, filter: 3000 });
  },
  satellite: (p) => {
    for (let i = 0; i < 3; i++) tone({ type: 'sine', f: 1500, dur: 0.18, vol: 0.1, delay: i * 0.5, pan: p });
  },
  metal: (p) => {
    tone({ type: 'square', f: 523, dur: 0.4, vol: 0.12, pan: p, filter: 3000 });
    tone({ type: 'square', f: 1109, dur: 0.3, vol: 0.08, pan: p, filter: 3000 });
    noise({ dur: 0.1, type: 'highpass', f: 3000, vol: 0.2, pan: p });
  },
  rain: () => noise({ dur: 3, type: 'highpass', f: 2500, vol: 0.12, attack: 0.5, reverb: 0.3 }),
  typewriter: (p) => noise({ dur: 0.03, type: 'bandpass', f: 2500, q: 2, vol: 0.2, pan: p }),
  cheer_small: (p) => noise({ dur: 1.2, type: 'bandpass', f: 1300, q: 0.7, vol: 0.18, attack: 0.15, pan: p, reverb: 0.4 }),
  bottle: (p) => tone({ type: 'sine', f: 700, to: 900, dur: 0.15, vol: 0.12, pan: p }),
  hack_key: (p) => tone({ type: 'square', f: 600 + Math.random() * 900, dur: 0.03, vol: 0.05, pan: p, filter: 3000 }),
  miss: (p) => tone({ type: 'sawtooth', f: 160, to: 110, dur: 0.15, vol: 0.1, pan: p, filter: 700 }),
  perfect: (p) => {
    tone({ type: 'triangle', f: 1318, dur: 0.12, vol: 0.08, pan: p });
    tone({ type: 'triangle', f: 1976, dur: 0.16, vol: 0.06, delay: 0.04, pan: p });
  },
  charge: (p) => tone({ type: 'sawtooth', f: 110, to: 880, dur: 1.2, vol: 0.1, pan: p, filter: 2400, curve: 'lin' }),
  glass: (p) => {
    noise({ dur: 0.35, type: 'highpass', f: 4000, vol: 0.35, pan: p, reverb: 0.2 });
    for (let i = 0; i < 6; i++) tone({ type: 'sine', f: 2200 + Math.random() * 3200, dur: 0.12 + Math.random() * 0.2, vol: 0.05, delay: 0.03 + i * 0.05, pan: p });
  },
};

export type SfxName = keyof typeof SFX;

/** Play a named effect. `pan` is -1..1; `throttleMs` avoids machine-gun stacking. */
export function sfx(name: string, pan = 0, throttleMs = 30): void {
  if (!audio.ctx) return;
  const now = performance.now();
  if (now - (lastPlayed[name] ?? 0) < throttleMs) return;
  lastPlayed[name] = now;
  const f = SFX[name];
  if (f) f(pan);
}

export function resetSfxThrottle(): void {
  lastPlayed = {};
}

/** Continuous ambience (crowd, rain, projector). Returns a stop function. */
export function ambience(kind: 'crowd' | 'rain' | 'projector' | 'bar' | 'hum', vol = 1): () => void {
  const ctx = audio.ctx;
  if (!ctx) return () => undefined;
  const src = ctx.createBufferSource();
  src.buffer = audio.noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  const t = ctx.currentTime;
  const base = { crowd: 0.12, rain: 0.1, projector: 0.035, bar: 0.05, hum: 0.03 }[kind] * vol;
  f.type = kind === 'rain' ? 'highpass' : kind === 'hum' ? 'lowpass' : 'bandpass';
  f.frequency.value = { crowd: 900, rain: 2800, projector: 3200, bar: 700, hum: 180 }[kind];
  f.Q.value = kind === 'crowd' ? 0.4 : 0.7;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(base, t + 1);
  src.connect(f).connect(g).connect(audio.sfx);
  let lfo: OscillatorNode | null = null;
  if (kind === 'projector' || kind === 'crowd') {
    lfo = ctx.createOscillator();
    lfo.frequency.value = kind === 'projector' ? 12 : 0.3;
    const lg = ctx.createGain();
    lg.gain.value = base * 0.6;
    lfo.connect(lg).connect(g.gain);
    lfo.start();
  }
  src.start();
  let stopped = false;
  return () => {
    if (stopped || !audio.ctx) return;
    stopped = true;
    const now = audio.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0.0001, now + 0.6);
    src.stop(now + 0.7);
    lfo?.stop(now + 0.7);
  };
}
