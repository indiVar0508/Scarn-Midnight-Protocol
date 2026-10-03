/**
 * "Do The Scarn" chart and judging. Pure functions (unit tested).
 * Song: 116 BPM, sections intro(4) verse(8) chorus(8) verse(8) chorus(8) bridge(4) chorus(8) outro(2) bars.
 */
export type Lane = 0 | 1 | 2 | 3 | 4; // left, down, SCARN, up, right
export interface Note {
  beat: number;
  lane: Lane;
}
export type Judgement = 'perfect' | 'good' | 'ok' | 'miss';

export const BPM = 116;
export const SPB = 60 / BPM;

export const SECTIONS: { name: string; bars: number }[] = [
  { name: 'intro', bars: 4 },
  { name: 'verse', bars: 8 },
  { name: 'chorus', bars: 8 },
  { name: 'verse', bars: 8 },
  { name: 'chorus', bars: 8 },
  { name: 'bridge', bars: 4 },
  { name: 'chorus', bars: 8 },
  { name: 'outro', bars: 2 },
];

export function sectionStarts(): { name: string; beat: number; index: number }[] {
  let b = 0;
  return SECTIONS.map((s, index) => {
    const out = { name: s.name, beat: b, index };
    b += s.bars * 4;
    return out;
  });
}

const L = 0, D = 1, S = 2, U = 3, R = 4;

// One-bar patterns: [beatOffset, lane]
const VERSE: [number, Lane][][] = [
  [[0, L], [1, R], [2, L], [3, R]],
  [[0, U], [1, D], [2, U], [3, S]],
  [[0, R], [1, L], [2, R], [3, L]],
  [[0, D], [1, U], [2, D], [3, S]],
];
const VERSE_HARD: [number, Lane][][] = [
  [[0, L], [1, R], [2, L], [2.5, L], [3, R]],
  [[0, U], [1, D], [1.5, D], [2, U], [3, S]],
  [[0, R], [0.5, R], [1, L], [2, R], [3, L]],
  [[0, D], [1, U], [2, D], [2.5, U], [3, S]],
];
const CHORUS: [number, Lane][][] = [
  [[0, S], [1, L], [1.5, L], [2, R], [2.5, R], [3, U]],
  [[0, D], [1, U], [2, L], [3, R]],
  [[0, S], [1, R], [1.5, R], [2, L], [2.5, L], [3, D]],
  [[0, U], [0.5, D], [1, U], [2, S], [3, S]],
];
const CHORUS_EASY: [number, Lane][][] = [
  [[0, S], [1, L], [2, R], [3, U]],
  [[0, D], [1, U], [2, L], [3, R]],
  [[0, S], [1, R], [2, L], [3, D]],
  [[0, U], [1, D], [2, S], [3, S]],
];
const BRIDGE: [number, Lane][][] = [
  [[0, L], [2, R]],
  [[0, U], [2, D]],
  [[0, L], [1, R], [2, U], [3, D]],
  [[0, S], [1, S], [2, S], [3, S]],
];

export function buildChart(assist = false): Note[] {
  const notes: Note[] = [];
  let bar = 0;
  let verseN = 0;
  for (const sec of SECTIONS) {
    for (let i = 0; i < sec.bars; i++) {
      const base = (bar + i) * 4;
      let pat: [number, Lane][] = [];
      if (sec.name === 'intro') {
        if (i === 3) pat = [[0, L], [1, R], [2, U], [3, D]];
      } else if (sec.name === 'verse') {
        const set = assist || verseN === 0 ? VERSE : VERSE_HARD;
        pat = set[i % 4];
      } else if (sec.name === 'chorus') {
        pat = (assist ? CHORUS_EASY : CHORUS)[i % 4];
      } else if (sec.name === 'bridge') {
        pat = BRIDGE[i % 4];
      } else if (sec.name === 'outro') {
        if (i === 0) pat = [[0, S]];
      }
      for (const [off, lane] of pat) notes.push({ beat: base + off, lane });
    }
    if (sec.name === 'verse') verseN++;
    bar += sec.bars;
  }
  return notes;
}

export function windows(assist = false): { perfect: number; good: number; ok: number } {
  const k = assist ? 1.6 : 1;
  return { perfect: 0.055 * k, good: 0.11 * k, ok: 0.16 * k };
}

export function judge(deltaSec: number, assist = false): Judgement {
  const w = windows(assist);
  const d = Math.abs(deltaSec);
  if (d <= w.perfect) return 'perfect';
  if (d <= w.good) return 'good';
  if (d <= w.ok) return 'ok';
  return 'miss';
}

export const WEIGHT: Record<Judgement, number> = { perfect: 1, good: 0.75, ok: 0.45, miss: 0 };

export function accuracyOf(judgements: Judgement[], total: number): number {
  if (total === 0) return 100;
  return (judgements.reduce((a, j) => a + WEIGHT[j], 0) / total) * 100;
}

export const TOTAL_BEATS = SECTIONS.reduce((a, s) => a + s.bars * 4, 0);
