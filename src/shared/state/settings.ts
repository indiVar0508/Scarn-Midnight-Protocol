import { Store } from './store';
import { readJSON, writeJSON } from './storage';

export interface Settings {
  master: number; // 0..1
  music: number;
  sfx: number;
  voice: number;
  muted: boolean;
  voiceActing: boolean;
  subtitles: boolean; // captions for barks / radio / important sounds
  textSize: 'normal' | 'large';
  autoAdvance: boolean;
  reducedFlashing: boolean;
  reducedShake: boolean;
  filmEffects: number; // 0..1 VHS grain/scanline intensity
  highContrast: boolean;
  screeningMode: boolean;
  assist: boolean; // halves damage, widens timing windows
  rhythmOffsetMs: number;
  touchControls: 'auto' | 'on' | 'off';
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.6,
  sfx: 0.8,
  voice: 0.9,
  muted: false,
  voiceActing: true,
  subtitles: true,
  textSize: 'normal',
  autoAdvance: false,
  reducedFlashing: false,
  reducedShake: false,
  filmEffects: 0.7,
  highContrast: false,
  screeningMode: true,
  assist: false,
  rhythmOffsetMs: 0,
  touchControls: 'auto',
};

const KEY = 'tlm.settings.v1';

function load(): Settings {
  const saved = readJSON<Partial<Settings>>(KEY) ?? {};
  const merged = { ...DEFAULT_SETTINGS, ...saved };
  // Respect OS-level reduced motion on first run.
  if (!readJSON(KEY)) {
    try {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        merged.reducedShake = true;
        merged.reducedFlashing = true;
      }
    } catch {
      /* ignore */
    }
  }
  return merged;
}

export const settings = new Store<Settings>(typeof window === 'undefined' ? DEFAULT_SETTINGS : load());

settings.subscribe(() => writeJSON(KEY, settings.get()));

export function updateSettings(patch: Partial<Settings>): void {
  settings.set(patch);
}

export function resetSettings(): void {
  settings.set({ ...DEFAULT_SETTINGS });
}

/** Shake multiplier honouring accessibility. */
export function shakeScale(): number {
  return settings.get().reducedShake ? 0.15 : 1;
}
