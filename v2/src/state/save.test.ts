import { beforeEach, describe, expect, it } from 'vitest';
import { recordTake, sceneRecord } from './save';

// Minimal localStorage for the node test environment.
beforeEach(() => {
  const mem = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    },
  };
});

describe('recordTake', () => {
  it('keeps the union of notes across takes, so stars never go backwards', () => {
    recordTake('s', { notes: ['pyramid'], style: 100, timeMs: 60_000 });
    const r = recordTake('s', { notes: ['pose-combo'], style: 50, timeMs: 70_000 });
    expect(r.newNotes).toEqual(['pose-combo']);
    expect(sceneRecord('s').notes.sort()).toEqual(['pose-combo', 'pyramid']);
  });

  it('tracks best style and best (lowest) time independently', () => {
    recordTake('s', { notes: [], style: 300, timeMs: 80_000 });
    const r = recordTake('s', { notes: [], style: 200, timeMs: 50_000 });
    expect(r.bestStyle).toBe(false);
    expect(r.bestTime).toBe(true);
    const rec = sceneRecord('s');
    expect(rec).toMatchObject({ bestStyle: 300, bestTimeMs: 50_000, takes: 2 });
  });

  it('reports no new notes when a take repeats old ones', () => {
    recordTake('s', { notes: ['pyramid'], style: 0, timeMs: null });
    expect(recordTake('s', { notes: ['pyramid'], style: 0, timeMs: null }).newNotes).toEqual([]);
  });
});
