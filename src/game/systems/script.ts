import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import type { Line } from '@shared/data/script/lines';
import { say as sayLines, choose as chooseOption, dialogueGen } from './dialogue';
import { input } from './input';
import { sim } from './sim';

/** Thrown into a scene script when the take is reset (retake, quit). */
export class Cancelled extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'Cancelled';
  }
}

/**
 * A scene script's verbs (v1's `await this.say(...)` style). Every await checks that the take
 * is still the same one and throws `Cancelled` if not, so a retake mid-conversation can't leave
 * a script running against the next take.
 */
export function makeScript() {
  const gen = dialogueGen();
  const check = () => {
    if (dialogueGen() !== gen) throw new Cancelled();
  };
  return {
    alive: () => dialogueGen() === gen,
    async say(...lines: Line[]) {
      check();
      await sayLines(...lines);
      check();
    },
    async choose(options: string[]) {
      check();
      input.unlock();
      const n = await chooseOption(options);
      check();
      return n;
    },
    async wait(ms: number) {
      check();
      await new Promise((r) => window.setTimeout(r, ms));
      check();
    },
    /** Take the controls for a scripted moment (and a camera shot, if given). */
    busy(on: boolean, shot?: { pos: [number, number, number]; look: [number, number, number] }) {
      sim.busy = on;
      sim.shot = on && shot ? { pos: new Vector3(...shot.pos), look: new Vector3(...shot.look) } : null;
    },
  };
}

export type Script = ReturnType<typeof makeScript>;

/** Run a script and swallow cancellation. */
export function run(fn: () => Promise<void>): void {
  fn().catch((e) => {
    if (!(e instanceof Cancelled)) console.error(e);
  });
}

/** Register a usable spot for the life of the component. `onUse` may change between renders. */
export function useInteractable(id: string, pos: [number, number, number], label: string, onUse: () => void, opts: { radius?: number; enabled?: boolean } = {}) {
  const cb = useRef(onUse);
  cb.current = onUse;
  const { radius = 1.3, enabled = true } = opts;
  useEffect(() => {
    sim.interactables.set(id, { id, pos: new Vector3(...pos), radius, label, enabled, onUse: () => cb.current() });
    return () => {
      sim.interactables.delete(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, label, radius, enabled, pos[0], pos[1], pos[2]]);
}

/**
 * Start a scene script once per mount. React StrictMode runs mount effects twice in dev, which
 * started every scene script twice and queued its lines twice; refs survive that replay.
 */
export function useSceneScript(fn: () => void): void {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
