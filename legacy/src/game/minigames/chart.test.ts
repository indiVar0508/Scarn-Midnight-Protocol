import { describe, expect, it } from 'vitest';
import { buildChart, judge, accuracyOf, windows, TOTAL_BEATS, SPB, sectionStarts } from './chart';

describe('Do The Scarn chart', () => {
  it('has notes, sorted, inside the song, on half-beat grid', () => {
    for (const assist of [false, true]) {
      const c = buildChart(assist);
      expect(c.length).toBeGreaterThan(100);
      for (let i = 1; i < c.length; i++) expect(c[i].beat).toBeGreaterThanOrEqual(c[i - 1].beat);
      for (const n of c) {
        expect(n.beat).toBeGreaterThanOrEqual(0);
        expect(n.beat).toBeLessThan(TOTAL_BEATS);
        expect((n.beat * 2) % 1).toBe(0);
        expect(n.lane).toBeGreaterThanOrEqual(0);
        expect(n.lane).toBeLessThanOrEqual(4);
      }
    }
  });

  it('assist chart is easier (fewer notes)', () => {
    expect(buildChart(true).length).toBeLessThan(buildChart(false).length);
  });

  it('never has two notes in the same lane at the same time', () => {
    const c = buildChart(false);
    const seen = new Set(c.map((n) => `${n.beat}:${n.lane}`));
    expect(seen.size).toBe(c.length);
  });

  it('song is ~100 seconds at 116 bpm', () => {
    expect(TOTAL_BEATS * SPB).toBeGreaterThan(95);
    expect(TOTAL_BEATS * SPB).toBeLessThan(110);
    expect(sectionStarts()[0].beat).toBe(0);
  });
});

describe('judging', () => {
  it('uses symmetric windows', () => {
    const w = windows(false);
    expect(judge(0)).toBe('perfect');
    expect(judge(w.perfect - 0.001)).toBe('perfect');
    expect(judge(-(w.perfect - 0.001))).toBe('perfect');
    expect(judge(w.good - 0.001)).toBe('good');
    expect(judge(w.ok - 0.001)).toBe('ok');
    expect(judge(w.ok + 0.01)).toBe('miss');
  });

  it('assist widens windows', () => {
    expect(windows(true).ok).toBeGreaterThan(windows(false).ok);
    expect(judge(0.2, true)).not.toBe('miss');
  });

  it('computes accuracy', () => {
    expect(accuracyOf(['perfect', 'perfect'], 2)).toBe(100);
    expect(accuracyOf(['miss', 'miss'], 2)).toBe(0);
    expect(accuracyOf([], 0)).toBe(100);
  });
});
