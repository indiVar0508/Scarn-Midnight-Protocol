import { audio } from './engine';

/**
 * Small library of synthesized instruments. Every voice is built from raw
 * oscillators / noise so the game ships zero third-party audio.
 */
export type InstName =
  | 'kick'
  | 'snare'
  | 'hat'
  | 'ohat'
  | 'clap'
  | 'tom'
  | 'crash'
  | 'rim'
  | 'shaker'
  | 'bass'
  | 'subbass'
  | 'upright'
  | 'lead'
  | 'square'
  | 'surf'
  | 'pluck'
  | 'ep'
  | 'piano'
  | 'organ'
  | 'strings'
  | 'brass'
  | 'guitar'
  | 'sax'
  | 'vibes'
  | 'choir'
  | 'timpani'
  | 'bell'
  | 'synthpad'
  | 'stab';

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C4", "Eb3", "F#5" -> Hz */
export function noteHz(name: string): number {
  const m = /^([A-G])([b#]?)(-?\d)$/.exec(name);
  if (!m) return 440;
  let n = NOTE_INDEX[m[1]];
  if (m[2] === '#') n += 1;
  if (m[2] === 'b') n -= 1;
  const midi = (parseInt(m[3], 10) + 1) * 12 + n;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function env(g: GainNode, t: number, a: number, peak: number, d: number, s: number, rel: number, end: number): void {
  const p = g.gain;
  p.cancelScheduledValues(t);
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.setTargetAtTime(Math.max(0.0001, peak * s), t + a, Math.max(0.005, d / 3));
  p.setTargetAtTime(0.0001, end, Math.max(0.005, rel / 4));
}

function osc(ctx: AudioContext, type: OscillatorType, f: number, t: number, stop: number, detune = 0): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.detune.value = detune;
  o.start(t);
  o.stop(stop);
  return o;
}

function noiseSrc(ctx: AudioContext, t: number, stop: number): AudioBufferSourceNode {
  const n = ctx.createBufferSource();
  n.buffer = audio.noise;
  n.loop = true;
  n.start(t, Math.random() * 1.5);
  n.stop(stop);
  return n;
}

function filt(ctx: AudioContext, type: BiquadFilterType, f: number, q = 1): BiquadFilterNode {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  return b;
}

let distCurve: Float32Array<ArrayBuffer> | null = null;
function distortion(ctx: AudioContext, amount = 18): WaveShaperNode {
  const ws = ctx.createWaveShaper();
  if (!distCurve) {
    const n = 1024;
    distCurve = new Float32Array(new ArrayBuffer(n * 4));
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      distCurve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
    }
  }
  ws.curve = distCurve;
  ws.oversample = '2x';
  return ws;
}

export function playInst(inst: InstName, t: number, freq: number, dur: number, vel: number, out: AudioNode, send?: AudioNode): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const v = Math.max(0.0001, vel);
  switch (inst) {
    case 'kick': {
      const g = ctx.createGain();
      const o = osc(ctx, 'sine', 160, t, t + 0.5);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(v * 1.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      o.connect(g).connect(out);
      const c = osc(ctx, 'square', 900, t, t + 0.012);
      const cg = ctx.createGain();
      cg.gain.value = v * 0.12;
      c.connect(cg).connect(out);
      return;
    }
    case 'snare': {
      const n = noiseSrc(ctx, t, t + 0.3);
      const bp = filt(ctx, 'highpass', 1400, 0.7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(v * 0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      n.connect(bp).connect(g).connect(out);
      if (send) g.connect(send);
      const o = osc(ctx, 'triangle', 190, t, t + 0.12);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.1);
      const og = ctx.createGain();
      og.gain.setValueAtTime(v * 0.5, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(og).connect(out);
      return;
    }
    case 'rim': {
      const o = osc(ctx, 'square', 1700, t, t + 0.04);
      const g = ctx.createGain();
      g.gain.setValueAtTime(v * 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      o.connect(filt(ctx, 'bandpass', 1700, 4)).connect(g).connect(out);
      return;
    }
    case 'hat':
    case 'ohat':
    case 'shaker': {
      const len = inst === 'ohat' ? 0.28 : inst === 'shaker' ? 0.07 : 0.045;
      const n = noiseSrc(ctx, t, t + len + 0.05);
      const hp = filt(ctx, 'highpass', inst === 'shaker' ? 5000 : 7500, 0.8);
      const g = ctx.createGain();
      g.gain.setValueAtTime(v * (inst === 'shaker' ? 0.18 : 0.28), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      n.connect(hp).connect(g).connect(out);
      return;
    }
    case 'clap': {
      const n = noiseSrc(ctx, t, t + 0.3);
      const bp = filt(ctx, 'bandpass', 1300, 1.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      for (let i = 0; i < 3; i++) {
        g.gain.setValueAtTime(v * 0.8, t + i * 0.012);
        g.gain.exponentialRampToValueAtTime(0.05, t + i * 0.012 + 0.01);
      }
      g.gain.setValueAtTime(v * 0.7, t + 0.036);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      n.connect(bp).connect(g).connect(out);
      if (send) g.connect(send);
      return;
    }
    case 'tom': {
      const o = osc(ctx, 'sine', freq || 140, t, t + 0.4);
      o.frequency.exponentialRampToValueAtTime((freq || 140) * 0.55, t + 0.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(v * 0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(out);
      return;
    }
    case 'crash': {
      const n = noiseSrc(ctx, t, t + 1.8);
      const hp = filt(ctx, 'highpass', 4000, 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(v * 0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      n.connect(hp).connect(g).connect(out);
      if (send) g.connect(send);
      return;
    }
    case 'timpani': {
      const o = osc(ctx, 'sine', freq, t, t + 1.4);
      o.frequency.setValueAtTime(freq * 1.05, t);
      o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
      o.connect(g).connect(out);
      const n = noiseSrc(ctx, t, t + 0.2);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(v * 0.25, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      n.connect(filt(ctx, 'lowpass', 600)).connect(ng).connect(out);
      if (send) g.connect(send);
      return;
    }
    case 'bass':
    case 'subbass': {
      const end = t + dur;
      const o = osc(ctx, inst === 'bass' ? 'sawtooth' : 'sine', freq, t, end + 0.2);
      const lp = filt(ctx, 'lowpass', 900, 4);
      lp.frequency.setValueAtTime(inst === 'bass' ? 1400 : 600, t);
      lp.frequency.setTargetAtTime(inst === 'bass' ? 320 : 400, t + 0.01, 0.08);
      const g = ctx.createGain();
      env(g, t, 0.006, v * 0.55, 0.15, 0.7, 0.08, end);
      o.connect(lp).connect(g).connect(out);
      if (inst === 'subbass') {
        const o2 = osc(ctx, 'triangle', freq * 2, t, end + 0.2);
        const g2 = ctx.createGain();
        env(g2, t, 0.006, v * 0.12, 0.1, 0.4, 0.08, end);
        o2.connect(g2).connect(out);
      }
      return;
    }
    case 'upright': {
      const end = t + Math.max(dur, 0.2);
      const o = osc(ctx, 'triangle', freq, t, end + 0.3);
      const o2 = osc(ctx, 'sine', freq * 2, t, end + 0.3);
      const lp = filt(ctx, 'lowpass', 700, 1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v * 0.75, t + 0.01);
      g.gain.exponentialRampToValueAtTime(v * 0.25, t + 0.25);
      g.gain.setTargetAtTime(0.0001, end, 0.06);
      const g2 = ctx.createGain();
      g2.gain.value = 0.25;
      o.connect(lp);
      o2.connect(g2).connect(lp);
      lp.connect(g).connect(out);
      return;
    }
    case 'lead':
    case 'square':
    case 'surf': {
      const end = t + dur;
      const type: OscillatorType = inst === 'square' ? 'square' : 'sawtooth';
      const o1 = osc(ctx, type, freq, t, end + 0.3, -7);
      const o2 = osc(ctx, type, freq, t, end + 0.3, 7);
      const lfo = osc(ctx, 'sine', 5.5, t, end + 0.3);
      const lfoG = ctx.createGain();
      lfoG.gain.setValueAtTime(0, t);
      lfoG.gain.linearRampToValueAtTime(inst === 'surf' ? 18 : 10, t + 0.3);
      lfo.connect(lfoG);
      lfoG.connect(o1.detune);
      lfoG.connect(o2.detune);
      const lp = filt(ctx, 'lowpass', inst === 'surf' ? 2600 : 3200, 2);
      const g = ctx.createGain();
      env(g, t, 0.01, v * 0.22, 0.2, 0.75, 0.12, end);
      o1.connect(lp);
      o2.connect(lp);
      if (inst === 'surf') {
        const d = distortion(ctx, 8);
        lp.connect(d).connect(g);
      } else lp.connect(g);
      g.connect(out);
      if (send) g.connect(send);
      return;
    }
    case 'pluck': {
      const end = t + Math.max(0.15, dur);
      const o = osc(ctx, 'sawtooth', freq, t, end + 0.4);
      const lp = filt(ctx, 'lowpass', 4000, 3);
      lp.frequency.setValueAtTime(5000, t);
      lp.frequency.exponentialRampToValueAtTime(500, t + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(v * 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, end + 0.3);
      o.connect(lp).connect(g).connect(out);
      if (send) g.connect(send);
      return;
    }
    case 'ep':
    case 'piano':
    case 'vibes':
    case 'bell': {
      // Simple two-operator FM: electric piano / vibraphone / bell.
      const end = t + Math.max(0.2, dur);
      const ratio = inst === 'bell' ? 3.5 : inst === 'vibes' ? 4 : 1;
      const index = inst === 'bell' ? 600 : inst === 'vibes' ? 150 : inst === 'piano' ? 280 : 380;
      const car = osc(ctx, 'sine', freq, t, end + 1.2);
      const mod = osc(ctx, 'sine', freq * ratio, t, end + 1.2);
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(index, t);
      mg.gain.exponentialRampToValueAtTime(Math.max(1, index * 0.08), t + (inst === 'piano' ? 0.6 : 1.0));
      mod.connect(mg).connect(car.frequency);
      const g = ctx.createGain();
      const decay = inst === 'bell' ? 2.2 : inst === 'vibes' ? 1.6 : inst === 'piano' ? 1.2 : 1.0;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v * 0.32, t + 0.005);
      g.gain.exponentialRampToValueAtTime(v * 0.08, t + decay * 0.5);
      g.gain.setTargetAtTime(0.0001, end, inst === 'piano' ? 0.12 : 0.25);
      let node: AudioNode = car;
      if (inst === 'vibes') {
        const trem = ctx.createGain();
        const l = osc(ctx, 'sine', 5, t, end + 1.2);
        const lg = ctx.createGain();
        lg.gain.value = 0.3;
        l.connect(lg).connect(trem.gain);
        trem.gain.value = 0.7;
        car.connect(trem);
        node = trem;
      }
      node.connect(g).connect(out);
      if (send) g.connect(send);
      if (inst === 'piano') {
        const o3 = osc(ctx, 'triangle', freq * 2, t, end + 0.6);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(v * 0.06, t);
        g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        o3.connect(g3).connect(out);
      }
      return;
    }
    case 'organ': {
      const end = t + dur;
      const g = ctx.createGain();
      env(g, t, 0.01, v * 0.12, 0.05, 0.95, 0.05, end);
      const trem = ctx.createGain();
      trem.gain.value = 0.8;
      const l = osc(ctx, 'sine', 6.2, t, end + 0.3);
      const lg = ctx.createGain();
      lg.gain.value = 0.2;
      l.connect(lg).connect(trem.gain);
      const bars = [1, 2, 3, 4, 6, 8];
      const amps = [1, 0.8, 0.5, 0.35, 0.2, 0.25];
      bars.forEach((h, i) => {
        const o = osc(ctx, 'sine', freq * h, t, end + 0.3);
        const og = ctx.createGain();
        og.gain.value = amps[i];
        o.connect(og).connect(trem);
      });
      trem.connect(g).connect(out);
      if (send) g.connect(send);
      return;
    }
    case 'strings':
    case 'synthpad':
    case 'choir': {
      const end = t + dur;
      const g = ctx.createGain();
      const atk = inst === 'choir' ? 0.25 : inst === 'synthpad' ? 0.4 : 0.18;
      env(g, t, atk, v * (inst === 'choir' ? 0.12 : 0.1), 0.3, 0.85, 0.5, end);
      const lp = filt(ctx, inst === 'choir' ? 'bandpass' : 'lowpass', inst === 'choir' ? 900 : 2200, inst === 'choir' ? 2 : 0.7);
      for (const d of [-12, 0, 11]) {
        const o = osc(ctx, 'sawtooth', freq, t, end + 1, d);
        o.connect(lp);
      }
      if (inst === 'choir') {
        const f2 = filt(ctx, 'bandpass', 2600, 3);
        const o = osc(ctx, 'sawtooth', freq, t, end + 1, 4);
        o.connect(f2).connect(g);
      }
      lp.connect(g).connect(out);
      if (send) g.connect(send);
      return;
    }
    case 'brass':
    case 'stab': {
      const end = t + dur;
      const o1 = osc(ctx, 'sawtooth', freq * 0.985, t, end + 0.3, -5);
      o1.frequency.linearRampToValueAtTime(freq, t + 0.06);
      const o2 = osc(ctx, 'sawtooth', freq, t, end + 0.3, 6);
      const lp = filt(ctx, 'lowpass', 600, 1.5);
      lp.frequency.setValueAtTime(500, t);
      lp.frequency.linearRampToValueAtTime(inst === 'stab' ? 4000 : 2600, t + 0.05);
      lp.frequency.setTargetAtTime(1300, t + 0.08, 0.2);
      const g = ctx.createGain();
      env(g, t, 0.03, v * 0.2, 0.2, inst === 'stab' ? 0.3 : 0.8, 0.1, end);
      o1.connect(lp);
      o2.connect(lp);
      lp.connect(g).connect(out);
      if (send) g.connect(send);
      return;
    }
    case 'guitar': {
      // Overdriven power chord (root + fifth + octave) for the montage.
      const end = t + dur;
      const pre = ctx.createGain();
      pre.gain.value = 0.6;
      for (const m of [1, 1.4983, 2]) {
        const o = osc(ctx, 'sawtooth', freq * m, t, end + 0.2, (Math.random() - 0.5) * 8);
        o.connect(pre);
      }
      const d = distortion(ctx, 30);
      const lp = filt(ctx, 'lowpass', 2400, 0.8);
      const g = ctx.createGain();
      env(g, t, 0.005, v * 0.11, 0.3, 0.7, 0.06, end);
      pre.connect(d).connect(lp).connect(g).connect(out);
      return;
    }
    case 'sax': {
      const end = t + dur;
      const o = osc(ctx, 'sawtooth', freq, t, end + 0.3);
      o.frequency.setValueAtTime(freq * 0.97, t);
      o.frequency.linearRampToValueAtTime(freq, t + 0.07);
      const l = osc(ctx, 'sine', 5, t, end + 0.3);
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(14, t + Math.min(0.4, dur));
      l.connect(lg).connect(o.detune);
      const bp = filt(ctx, 'bandpass', 1200, 0.9);
      const lp = filt(ctx, 'lowpass', 2800, 1);
      const g = ctx.createGain();
      env(g, t, 0.04, v * 0.3, 0.2, 0.8, 0.1, end);
      o.connect(bp).connect(lp).connect(g).connect(out);
      const n = noiseSrc(ctx, t, end + 0.1);
      const ng = ctx.createGain();
      env(ng, t, 0.02, v * 0.03, 0.1, 0.5, 0.05, end);
      n.connect(filt(ctx, 'bandpass', 2000, 2)).connect(ng).connect(out);
      if (send) g.connect(send);
      return;
    }
  }
}
