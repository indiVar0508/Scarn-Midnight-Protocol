import { Store } from '@v1/state/store';
import { CAST, type CastMember } from '@v1/data/cast';
import type { Line } from '@v1/data/script/lines';
import { voice } from '@v1/audio/voice';

/** What the caption bar shows. */
export interface Caption {
  id: number;
  name: string;
  /** The Dunder Mifflin employee playing the part. */
  actor: string | null;
  color: string;
  text: string;
  style: Line['style'];
}

export interface ChoiceView {
  id: number;
  options: string[];
}

export const captions = new Store<{ caption: Caption | null; choice: ChoiceView | null }>({ caption: null, choice: null });

let choiceId = 0;
let choiceResolve: ((n: number) => void) | null = null;

/** Offer dialogue choices; resolves with the picked index (UI: Choices.tsx). */
export function choose(options: string[]): Promise<number> {
  const id = ++choiceId;
  captions.set({ choice: { id, options } });
  return new Promise((resolve) => {
    choiceResolve = (n) => {
      if (captions.get().choice?.id === id) captions.set({ choice: null });
      choiceResolve = null;
      resolve(n);
    };
  });
}

export function pickChoice(n: number): void {
  choiceResolve?.(n);
}

let gen = 0;
let captionId = 0;
let busyUntil = 0;
let chain: Promise<void> = Promise.resolve();

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** Reading time when there's no voice file (or voice is off): ~14 chars/s, 1.4 s minimum. */
const readMs = (text: string) => Math.max(1400, (text.length / 14) * 1000);

async function speak(line: Line, myGen: number): Promise<void> {
  if (myGen !== gen) return;
  const who = (CAST as Record<string, CastMember>)[line.who];
  const id = ++captionId;
  captions.set({
    caption: { id, name: who?.name ?? line.who.toUpperCase(), actor: who?.actor ?? null, color: who?.color ?? '#fff', text: line.text, style: line.style ?? 'normal' },
  });
  const dur = voice.duration(line.id);
  const playing = line.silent ? Promise.resolve() : voice.play(line.id);
  busyUntil = performance.now() + Math.max(dur, readMs(line.text));
  const skipped = new Promise<void>((r) => (skipCurrent = r));
  await Promise.race([Promise.all([playing, sleep(dur ? dur + 250 : readMs(line.text))]), skipped]);
  skipCurrent = null;
  if (captions.get().caption?.id === id) captions.set({ caption: null });
}

let skipCurrent: (() => void) | null = null;

/** Cut the current line short (Enter / E / click during a scripted moment). */
export function skipLine(): void {
  if (!skipCurrent) return;
  voice.stop();
  busyUntil = 0;
  skipCurrent();
}

/**
 * Queue lines to be spoken in order while play continues (dialogue never takes the
 * controls away during a take). Resolves when the last one finishes or the take resets.
 */
export function say(...lines: Line[]): Promise<void> {
  const myGen = gen;
  chain = chain.then(async () => {
    for (const l of lines) await speak(l, myGen);
  });
  return chain;
}

/** A combat bark: dropped if someone is already talking, so barks never pile up. */
export function bark(line: Line): void {
  if (performance.now() < busyUntil) return;
  void say(line);
}

/** Pick one of several barks, deterministically per call count (no Math.random in gameplay). */
let barkN = 0;
export function barkOne(lines: Line[]): void {
  if (performance.now() < busyUntil) return;
  bark(lines[barkN++ % lines.length]);
}

/** Bumped by every reset: scripts compare it to know they were cancelled. */
export const dialogueGen = () => gen;

/** Stop everything (retake, quit). */
export function resetDialogue(): void {
  gen++;
  chain = Promise.resolve();
  busyUntil = 0;
  voice.stop();
  choiceResolve = null;
  captions.set({ caption: null, choice: null });
}

/** Warm the voice cache for a scene's lines. */
export function preloadLines(lines: Line[]): void {
  void voice.loadManifest().then(() => voice.preload(lines.map((l) => l.id)));
}
