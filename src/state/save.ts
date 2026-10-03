import { readJSON, writeJSON } from '@shared/state/storage';

/** Best result per scene. Stars persist as the union of notes ever completed, so a
 *  player can chase one note per take instead of needing a perfect run. */
export interface SceneRecord {
  notes: string[];
  bestStyle: number;
  bestTimeMs: number | null;
  takes: number;
}

export interface SaveV2 {
  version: 2;
  scenes: Record<string, SceneRecord>;
}

const KEY = 'tlm.v2.save';

export function loadSave(): SaveV2 {
  const s = readJSON<SaveV2>(KEY);
  return s && s.version === 2 ? s : { version: 2, scenes: {} };
}

export function sceneRecord(id: string): SceneRecord {
  return loadSave().scenes[id] ?? { notes: [], bestStyle: 0, bestTimeMs: null, takes: 0 };
}

/** Merge a finished take into the save. Returns what improved (for the review card). */
export function recordTake(id: string, r: { notes: string[]; style: number; timeMs: number | null }): { newNotes: string[]; bestStyle: boolean; bestTime: boolean } {
  const save = loadSave();
  const prev = save.scenes[id] ?? { notes: [], bestStyle: 0, bestTimeMs: null, takes: 0 };
  const newNotes = r.notes.filter((n) => !prev.notes.includes(n));
  const bestStyle = r.style > prev.bestStyle;
  const bestTime = r.timeMs !== null && (prev.bestTimeMs === null || r.timeMs < prev.bestTimeMs);
  save.scenes[id] = {
    notes: [...prev.notes, ...newNotes],
    bestStyle: Math.max(prev.bestStyle, r.style),
    bestTimeMs: bestTime ? r.timeMs : prev.bestTimeMs,
    takes: prev.takes + 1,
  };
  writeJSON(KEY, save);
  return { newNotes, bestStyle, bestTime };
}
