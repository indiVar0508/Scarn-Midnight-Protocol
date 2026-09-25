import { Store } from './store';
import { readJSON, writeJSON, removeKey } from './storage';
import { freshStats, type RunStats } from './stats';
import { ACHIEVEMENTS } from '../data/achievements';
import { CHAPTERS } from '../data/chapters';
import { pushToast } from './ui';

export interface SaveData {
  version: 1;
  started: boolean;
  chapter: number;
  beat: string | null;
  reached: number;
  completed: boolean;
  stats: RunStats;
  achievements: string[];
  beets: string[];
  flags: Record<string, boolean | number | string>;
}

const KEY = 'tlm.save.v1';
const META_KEY = 'tlm.meta.v1'; // survives "new game": unlocks + achievements

interface Meta {
  reached: number;
  completed: boolean;
  achievements: string[];
}

function blank(meta?: Meta): SaveData {
  return {
    version: 1,
    started: false,
    chapter: 1,
    beat: null,
    reached: meta?.reached ?? 1,
    completed: meta?.completed ?? false,
    stats: freshStats(),
    achievements: meta?.achievements ?? [],
    beets: [],
    flags: {},
  };
}

function loadMeta(): Meta {
  return readJSON<Meta>(META_KEY) ?? { reached: 1, completed: false, achievements: [] };
}

function load(): SaveData {
  const meta = loadMeta();
  const s = readJSON<SaveData>(KEY);
  if (!s || s.version !== 1) return blank(meta);
  return {
    ...blank(meta),
    ...s,
    stats: { ...freshStats(), ...s.stats },
    reached: Math.max(s.reached ?? 1, meta.reached),
    completed: s.completed || meta.completed,
    achievements: Array.from(new Set([...(s.achievements ?? []), ...meta.achievements])),
  };
}

export const save = new Store<SaveData>(typeof window === 'undefined' ? blank() : load());

let writeTimer: number | undefined;
save.subscribe(() => {
  // Debounce: stats update often during gameplay.
  if (typeof window === 'undefined') return;
  window.clearTimeout(writeTimer);
  writeTimer = window.setTimeout(persist, 250);
});

function persist(): void {
  const s = save.get();
  writeJSON(KEY, s);
  writeJSON(META_KEY, { reached: s.reached, completed: s.completed, achievements: s.achievements } satisfies Meta);
}

export function flushSave(): void {
  if (typeof window !== 'undefined') window.clearTimeout(writeTimer);
  persist();
}

export function hasProgress(): boolean {
  const s = save.get();
  return s.started && !(s.chapter === 1 && s.beat === null);
}

export function newGame(chapter = 1): void {
  const s = save.get();
  save.set({
    ...blank({ reached: s.reached, completed: s.completed, achievements: s.achievements }),
    started: true,
    chapter,
  });
  flushSave();
}

export function setCheckpoint(chapter: number, beat: string): void {
  const s = save.get();
  save.set({ chapter, beat, started: true, reached: Math.max(s.reached, chapter) });
  flushSave();
}

export function completeChapter(chapter: number): void {
  const s = save.get();
  const next = Math.min(CHAPTERS.length, chapter + 1);
  const isLast = chapter >= CHAPTERS.length;
  save.set({
    chapter: isLast ? chapter : next,
    beat: null,
    reached: Math.max(s.reached, isLast ? chapter : next),
    completed: s.completed || isLast,
  });
  flushSave();
}

export function isChapterUnlocked(chapter: number): boolean {
  const s = save.get();
  return s.completed || chapter <= s.reached;
}

export function addStat<K extends keyof RunStats>(key: K, delta: number): void {
  const s = save.get();
  save.set({ stats: { ...s.stats, [key]: (s.stats[key] as number) + delta } });
}

export function setStat<K extends keyof RunStats>(key: K, value: number): void {
  const s = save.get();
  save.set({ stats: { ...s.stats, [key]: value } });
}

export function setFlag(key: string, value: boolean | number | string): void {
  const s = save.get();
  save.set({ flags: { ...s.flags, [key]: value } });
}

export function getFlag<T extends boolean | number | string>(key: string, fallback: T): T {
  const v = save.get().flags[key];
  return (v === undefined ? fallback : v) as T;
}

export function unlockAchievement(id: string): void {
  const s = save.get();
  if (s.achievements.includes(id)) return;
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return;
  save.set({ achievements: [...s.achievements, id] });
  pushToast({ kind: 'achievement', title: def.title, desc: def.desc });
  flushSave();
}

export function findBeet(id: string): void {
  const s = save.get();
  if (s.beets.includes(id)) return;
  const beets = [...s.beets, id];
  save.set({ beets, stats: { ...s.stats, beetsFound: beets.length } });
  pushToast({ kind: 'item', title: `BEET FOUND (${beets.length}/5)`, desc: 'Samuel will be thrilled. Or will he.' });
  if (beets.length >= 5) unlockAchievement('beets');
}

export function wipeAll(): void {
  removeKey(KEY);
  removeKey(META_KEY);
  save.set(blank());
}

/** QA helper: ?unlock=all */
export function unlockAll(): void {
  save.set({ reached: CHAPTERS.length, completed: true });
  flushSave();
}
