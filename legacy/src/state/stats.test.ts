import { describe, expect, it } from 'vitest';
import { freshStats, scarnRating, accuracy, formatTime, confidenceLevel } from './stats';
import { Store } from './store';

describe('Scarn Rating (designed by Michael)', () => {
  it('never gives less than an A', () => {
    const terrible = { ...freshStats(), shotsFired: 500, shotsHit: 1, danceAccuracy: 0, trainingScore: 0 };
    expect(scarnRating(terrible).grade.startsWith('A')).toBe(true);
  });

  it('gives S+++ for a great run', () => {
    const great = { ...freshStats(), shotsFired: 100, shotsHit: 95, danceAccuracy: 98, trainingScore: 95, goals: 5, checks: 10, steals: 5, enemiesDefeated: 40, dramaticPoses: 12 };
    expect(scarnRating(great).grade).toBe('S+++');
  });

  it('is deterministic and monotonic-ish', () => {
    const a = { ...freshStats(), danceAccuracy: 50 };
    const b = { ...freshStats(), danceAccuracy: 90 };
    expect(scarnRating(a)).toEqual(scarnRating(a));
    const order = ['A', 'A+', 'A++', 'S', 'S+++'];
    expect(order.indexOf(scarnRating(b).grade)).toBeGreaterThanOrEqual(order.indexOf(scarnRating(a).grade));
  });

  it('formats stats', () => {
    expect(accuracy({ ...freshStats(), shotsFired: 0 })).toBe(100);
    expect(accuracy({ ...freshStats(), shotsFired: 4, shotsHit: 1 })).toBe(25);
    expect(formatTime(65_000)).toBe('01:05');
    expect(formatTime(3_725_000)).toBe('1:02:05');
    expect(confidenceLevel({ ...freshStats(), dramaticPoses: 30 })).toBe('BEYOND MIDNIGHT');
  });
});

describe('Store', () => {
  it('notifies only on change', () => {
    const s = new Store({ a: 1, b: 'x' });
    let n = 0;
    s.subscribe(() => n++);
    s.set({ a: 1 });
    expect(n).toBe(0);
    s.set({ a: 2 });
    expect(n).toBe(1);
    s.set((st) => ({ b: st.b + 'y' }));
    expect(s.get()).toEqual({ a: 2, b: 'xy' });
    expect(n).toBe(2);
  });
});
