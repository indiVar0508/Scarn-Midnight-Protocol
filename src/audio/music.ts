import { audio } from './engine';
import { noteHz, playInst, type InstName } from './synth';
import { SONGS, type SongDef } from './songs';

/**
 * Look-ahead step sequencer (the "A Tale of Two Clocks" pattern): a JS timer
 * wakes every 25 ms and schedules every note due within the next 120 ms on the
 * AudioContext clock, so timing stays sample-accurate even when frames drop.
 */

interface NoteEvent {
  step: number;
  freqs: number[];
  len: number; // in steps
  vel: number;
}

interface ParsedTrack {
  inst: InstName;
  vol: number;
  send: number;
  events: NoteEvent[][]; // per section index: events sorted by step
}

interface ParsedSong {
  def: SongDef;
  sectionSteps: number[]; // steps per section (by order index)
  tracks: ParsedTrack[];
  totalSteps: number;
}

const DRUMS: InstName[] = ['kick', 'snare', 'hat', 'ohat', 'clap', 'tom', 'crash', 'rim', 'shaker'];

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '5': [0, 7, 12],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  '9': [0, 4, 7, 10, 14],
  '13': [0, 4, 10, 14, 21],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  aug: [0, 4, 8],
  '7b9': [0, 4, 7, 10, 13],
};

/** "@Cm7:3" -> chord frequencies rooted at octave 3 */
function chordHz(sym: string): number[] {
  const m = /^@([A-G][b#]?)([a-z0-9#]*)(?::(\d))?$/.exec(sym);
  if (!m) return [];
  const root = noteHz(`${m[1]}${m[3] ?? '3'}`);
  const q = QUALITIES[m[2]] ?? QUALITIES[''];
  return q.map((semi) => root * Math.pow(2, semi / 12));
}

function parseMelodic(src: string): NoteEvent[] {
  const tokens = src.trim().split(/\s+/).filter((t) => t !== '|');
  const out: NoteEvent[] = [];
  let last: NoteEvent | null = null;
  tokens.forEach((tok, step) => {
    if (tok === '.') {
      last = null;
      return;
    }
    if (tok === '-') {
      if (last) last.len += 1;
      return;
    }
    let vel = 0.8;
    let t = tok;
    if (t.endsWith('!')) {
      vel = 1;
      t = t.slice(0, -1);
    } else if (t.endsWith('?')) {
      vel = 0.5;
      t = t.slice(0, -1);
    }
    const freqs = t.startsWith('@') ? chordHz(t) : t.split('+').map(noteHz);
    last = { step, freqs, len: 1, vel };
    out.push(last);
  });
  return out;
}

function parseDrum(src: string): NoteEvent[] {
  const chars = src.replace(/[\s|]/g, '');
  const out: NoteEvent[] = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === '.' || c === '-') continue;
    const vel = c === 'X' ? 1 : c === 'x' ? 0.8 : c === 'o' ? 0.45 : 0.25;
    out.push({ step: i, freqs: [0], len: 1, vel });
  }
  return out;
}

const parsedCache = new Map<string, ParsedSong>();

function parse(def: SongDef): ParsedSong {
  const cached = parsedCache.get(def.id);
  if (cached) return cached;
  const sectionSteps = def.order.map((name) => def.sections[name].bars * 16);
  const tracks: ParsedTrack[] = Object.entries(def.instruments).map(([name, cfg]) => {
    const isDrum = DRUMS.includes(cfg.inst);
    const events = def.order.map((secName) => {
      const src = def.sections[secName].tracks[name];
      if (!src) return [];
      const evs = isDrum ? parseDrum(src) : parseMelodic(src);
      const steps = def.sections[secName].bars * 16;
      // Patterns shorter than the section repeat.
      const patLen = isDrum ? src.replace(/[\s|]/g, '').length : src.trim().split(/\s+/).filter((t) => t !== '|').length;
      if (patLen > 0 && patLen < steps) {
        const rep: NoteEvent[] = [];
        for (let off = 0; off < steps; off += patLen) for (const e of evs) if (e.step + off < steps) rep.push({ ...e, step: e.step + off });
        return rep;
      }
      return evs;
    });
    return { inst: cfg.inst, vol: cfg.vol, send: cfg.send ?? 0, events };
  });
  const p = { def, sectionSteps, tracks, totalSteps: sectionSteps.reduce((a, b) => a + b, 0) };
  parsedCache.set(def.id, p);
  return p;
}

interface Playing {
  song: ParsedSong;
  out: GainNode;
  send: GainNode;
  startTime: number;
  stepDur: number;
  orderIndex: number;
  sectionStep: number;
  nextTime: number;
  globalStep: number;
  stopped: boolean;
  oneShot: boolean;
}

class MusicPlayer {
  private current: Playing | null = null;
  private stingers: Playing[] = [];
  private timer: number | undefined;
  currentId: string | null = null;

  private ensureTimer(): void {
    if (this.timer !== undefined) return;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  play(id: string, opts: { fade?: number; force?: boolean } = {}): void {
    const ctx = audio.ctx;
    if (!ctx) {
      this.currentId = id;
      return;
    }
    if (!opts.force && this.currentId === id && this.current && !this.current.stopped) return;
    const def = SONGS[id];
    if (!def) return;
    this.stop(opts.fade ?? 0.6);
    this.current = this.start(def, false, opts.fade ?? 0.3);
    this.currentId = id;
    this.ensureTimer();
  }

  /** One-shot musical phrase over the current music. */
  stinger(id: string): void {
    const def = SONGS[id];
    if (!def || !audio.ctx) return;
    this.stingers.push(this.start(def, true, 0));
    this.ensureTimer();
  }

  private start(def: SongDef, oneShot: boolean, fade: number): Playing {
    const ctx = audio.ctx!;
    const out = ctx.createGain();
    const t = ctx.currentTime + 0.06;
    out.gain.setValueAtTime(fade > 0 ? 0.0001 : def.gain ?? 1, t);
    if (fade > 0) out.gain.linearRampToValueAtTime(def.gain ?? 1, t + fade);
    out.connect(oneShot ? audio.sfx : audio.music);
    const send = ctx.createGain();
    send.gain.value = 1;
    send.connect(audio.reverbSend);
    return {
      song: parse(def),
      out,
      send,
      startTime: t,
      stepDur: 60 / def.bpm / 4,
      orderIndex: 0,
      sectionStep: 0,
      nextTime: t,
      globalStep: 0,
      stopped: false,
      oneShot,
    };
  }

  stop(fade = 0.6): void {
    const c = this.current;
    if (!c) return;
    c.stopped = true;
    const ctx = audio.ctx;
    if (ctx) {
      const t = ctx.currentTime;
      c.out.gain.cancelScheduledValues(t);
      c.out.gain.setValueAtTime(c.out.gain.value, t);
      c.out.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.02, fade));
      window.setTimeout(() => c.out.disconnect(), (fade + 1.5) * 1000);
    }
    this.current = null;
    this.currentId = null;
  }

  /** Seconds since the current song started (audio clock). */
  songTime(): number {
    if (!this.current || !audio.ctx) return 0;
    return audio.ctx.currentTime - this.current.startTime;
  }

  songStart(): number {
    return this.current?.startTime ?? 0;
  }

  bpm(): number {
    return this.current?.song.def.bpm ?? 120;
  }

  private tick(): void {
    const ctx = audio.ctx;
    if (!ctx) return;
    if (ctx.state !== 'running') return;
    const horizon = ctx.currentTime + 0.12;
    if (this.current) this.schedule(this.current, horizon);
    this.stingers = this.stingers.filter((s) => {
      this.schedule(s, horizon);
      return !s.stopped;
    });
  }

  private schedule(p: Playing, horizon: number): void {
    const ctx = audio.ctx!;
    const def = p.song.def;
    // If we fell far behind (tab throttled), jump forward instead of bursting.
    if (p.nextTime < ctx.currentTime - 0.25) {
      const skip = Math.ceil((ctx.currentTime - p.nextTime) / p.stepDur);
      for (let i = 0; i < skip; i++) this.advance(p);
      p.nextTime += skip * p.stepDur;
    }
    while (!p.stopped && p.nextTime < horizon) {
      const swing = def.swing && p.sectionStep % 2 === 1 ? def.swing * p.stepDur : 0;
      const t = p.nextTime + swing;
      for (const tr of p.song.tracks) {
        const evs = tr.events[p.orderIndex];
        for (const e of evs) {
          if (e.step !== p.sectionStep) continue;
          for (const f of e.freqs) {
            playInst(tr.inst, t, f, e.len * p.stepDur * 0.95, e.vel * tr.vol, p.out, tr.send > 0 ? p.send : undefined);
          }
        }
      }
      p.nextTime += p.stepDur;
      this.advance(p);
    }
  }

  private advance(p: Playing): void {
    p.sectionStep++;
    p.globalStep++;
    if (p.sectionStep >= p.song.sectionSteps[p.orderIndex]) {
      p.sectionStep = 0;
      p.orderIndex++;
      if (p.orderIndex >= p.song.def.order.length) {
        if (p.oneShot || p.song.def.loop === false) {
          p.stopped = true;
          window.setTimeout(() => p.out.disconnect(), 4000);
          if (p === this.current) {
            this.current = null;
            this.currentId = null;
          }
        } else {
          p.orderIndex = p.song.def.loopFrom ?? 0;
        }
      }
    }
  }
}

export const music = new MusicPlayer();
