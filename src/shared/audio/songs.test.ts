import { describe, expect, it } from 'vitest';
import { SONGS } from './songs';
import { noteHz } from './synth';

const DRUMS = ['kick', 'snare', 'hat', 'ohat', 'clap', 'tom', 'crash', 'rim', 'shaker'];

describe('music patterns', () => {
  for (const [id, song] of Object.entries(SONGS)) {
    it(`${id}: every track fits its section`, () => {
      for (const secName of song.order) expect(song.sections[secName]).toBeDefined();
      for (const [secName, sec] of Object.entries(song.sections)) {
        const steps = sec.bars * 16;
        for (const [track, src] of Object.entries(sec.tracks)) {
          const inst = song.instruments[track];
          expect(inst, `${id}.${secName}.${track} has an instrument`).toBeDefined();
          const isDrum = DRUMS.includes(inst.inst);
          const len = isDrum ? src.replace(/[\s|]/g, '').length : src.trim().split(/\s+/).filter((t) => t !== '|').length;
          // Patterns may be shorter and repeat, but must tile the section exactly.
          expect(len, `${id}.${secName}.${track} length ${len} vs ${steps}`).toBeGreaterThan(0);
          expect(steps % len, `${id}.${secName}.${track} length ${len} must divide ${steps}`).toBe(0);
          if (!isDrum) {
            for (const tok of src.trim().split(/\s+/)) {
              if (tok === '.' || tok === '-' || tok === '|') continue;
              const t = tok.replace(/[!?]$/, '');
              if (t.startsWith('@')) expect(t).toMatch(/^@[A-G][b#]?[a-z0-9#]*(:\d)?$/);
              else for (const n of t.split('+')) expect(n, `${id} bad note ${n}`).toMatch(/^[A-G][b#]?-?\d$/);
            }
          }
        }
      }
    });
  }

  it('converts notes', () => {
    expect(noteHz('A4')).toBeCloseTo(440);
    expect(noteHz('A3')).toBeCloseTo(220);
    expect(noteHz('C4')).toBeCloseTo(261.63, 1);
  });
});
