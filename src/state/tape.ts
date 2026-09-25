import { Store } from './store';
import { audio } from '../audio/engine';
import { voice, reverseBuffer } from '../audio/voice';
import { sfx } from '../audio/sfx';

/**
 * The Funky Cat tape-deck puzzle. Jasmine's "gibberish" was recorded
 * backwards and slowed down. Players reverse the tape and fix the speed
 * (x1.25) until the message is audible and legible in the waveform.
 */
export const SECRET = 'THE HOSTAGES ARE UNDER THE STADIUM';
export const TARGET_SPEED = 1.25;
export const OPTIONS = ['UNDER THE STAPLER', 'UNDER THE STADIUM', 'UNDER THE SEA', 'UNDER BUDGET'];
const CORRECT = 1;

export interface TapeState {
  open: boolean;
  recorded: boolean;
  playing: boolean;
  reversed: boolean;
  speed: number;
  heard: boolean; // decoded at least once (audio or visual)
  status: string;
  answered: boolean;
  wrong: number;
  playhead: number; // 0..1
}

export const tape = new Store<TapeState>({
  open: false,
  recorded: false,
  playing: false,
  reversed: false,
  speed: 1,
  heard: false,
  status: '',
  answered: false,
  wrong: 0,
  playhead: 0,
});

export const SECRET_LINE = 'ch05_secret';

let src: AudioBufferSourceNode | null = null;
let startedAt = 0;
let dur = 1;
let raf = 0;
let resolveSolve: (() => void) | null = null;
let decodeTimer = 0;

export function isDecoded(s = tape.get()): boolean {
  return s.reversed && Math.abs(s.speed - TARGET_SPEED) <= 0.06;
}

export function openTape(): Promise<void> {
  tape.set({ open: true, recorded: false, playing: false, reversed: false, speed: 1, heard: false, answered: false, wrong: 0, playhead: 0, status: 'Press RECORD while Jasmine sings. (She will wait. She is a professional.)' });
  void voice.buffer(SECRET_LINE);
  return new Promise((r) => (resolveSolve = r));
}

export function closeTape(): void {
  stopTape();
  tape.set({ open: false });
}

export function record(): void {
  sfx('tape_click');
  tape.set({ recorded: true, status: 'Recorded 0:04 of "Jasmine\'s Song". Press PLAY.' });
}

export async function playTape(): Promise<void> {
  const s = tape.get();
  if (!s.recorded) {
    sfx('beep_bad');
    tape.set({ status: 'Nothing on the tape yet. RECORD first.' });
    return;
  }
  stopTape();
  voice.stop();
  sfx('tape_click');
  tape.set({ playing: true });
  audio.duck(true);
  const buf = await voice.buffer(SECRET_LINE);
  const ctx = audio.ctx;
  if (buf && ctx) {
    const node = ctx.createBufferSource();
    node.buffer = s.reversed ? reverseBuffer(ctx, buf) : buf;
    node.playbackRate.value = s.speed;
    node.connect(audio.voice);
    node.start();
    src = node;
    dur = buf.duration / s.speed;
    node.onended = () => {
      if (src === node) stopTape();
    };
  } else {
    dur = 3.2 / s.speed; // silent fallback: the visual clue still works
    window.setTimeout(() => {
      if (tape.get().playing) stopTape();
    }, dur * 1000);
  }
  startedAt = performance.now();
  cancelAnimationFrame(raf);
  const tick = () => {
    const p = Math.min(1, (performance.now() - startedAt) / 1000 / dur);
    tape.set({ playhead: p });
    if (tape.get().playing) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  describe();
}

export function stopTape(): void {
  cancelAnimationFrame(raf);
  audio.duck(false);
  if (src) {
    try {
      src.onended = null;
      src.stop();
    } catch {
      /* noop */
    }
    src = null;
  }
  if (tape.get().playing) tape.set({ playing: false, playhead: 0 });
}

export function toggleReverse(): void {
  sfx('rewind');
  tape.set({ reversed: !tape.get().reversed });
  describe();
  if (tape.get().playing) void playTape();
}

export function setSpeed(v: number): void {
  tape.set({ speed: Math.round(v * 100) / 100 });
  describe();
}

function describe(): void {
  const s = tape.get();
  let status: string;
  if (!s.recorded) status = 'Press RECORD while Jasmine sings.';
  else if (isDecoded(s)) status = `DECODED: "${SECRET}"`;
  else if (s.reversed && s.speed < TARGET_SPEED) status = 'Almost words... but slow and low. Like a sad giant. Speed it up.';
  else if (s.reversed) status = 'Chipmunk English. Too fast. Ease off the speed.';
  else status = 'Gibberish. Beautiful, haunting gibberish. The letters look mirrored...';
  tape.set({ status });
  window.clearTimeout(decodeTimer);
  if (isDecoded(s) && !s.heard) {
    decodeTimer = window.setTimeout(() => {
      if (isDecoded()) {
        tape.set({ heard: true });
        sfx('beep_ok');
      }
    }, 700);
  }
}

export function answer(i: number): boolean {
  if (i === CORRECT) {
    sfx('beep_ok');
    stopTape();
    tape.set({ answered: true, status: 'Location confirmed: UNDER THE STADIUM.' });
    window.setTimeout(() => {
      tape.set({ open: false });
      resolveSolve?.();
      resolveSolve = null;
    }, 900);
    return true;
  }
  sfx('beep_bad');
  const w = tape.get().wrong + 1;
  tape.set({ wrong: w, status: w > 1 ? 'No. Listen again — or read the waveform. It says STADIUM.' : 'That does not fit the message. Try again.' });
  return false;
}

/** QA/debug: solve instantly. */
export function autoSolve(): void {
  tape.set({ recorded: true, reversed: true, speed: TARGET_SPEED, heard: true });
  answer(CORRECT);
}

export function optionsVisible(): boolean {
  return tape.get().heard;
}

export { OPTIONS as TAPE_OPTIONS };
