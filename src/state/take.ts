import { Store } from '@shared/state/store';

/** HUD-visible state for the take in progress. Gameplay writes, React reads. */
export interface TakeState {
  takeNo: number;
  status: 'rolling' | 'cut' | 'wrapped';
  hp: number;
  hpMax: number;
  goonsDown: number;
  goonsTotal: number;
  style: number;
  combo: number;
  shots: number;
  hits: number;
  startedAt: number;
  endedAt: number;
  /** Floating style callouts ("DRAMATIC POSE +150"). */
  popups: { id: number; text: string }[];
  /** Ids of Director's Notes completed this take. */
  notes: string[];
  objective: string | null;
  hint: string | null;
  /** Fade to black between rooms. */
  blackout: boolean;
  /** A running minigame: title, seconds left, live score text. */
  trial: { title: string; timeLeft: number; score: string } | null;
  /** Big lower-third establishing-shot caption ("Scranton."). */
  slate: string | null;
  /** A score sheet shown mid-scene (Cherokee Jack's report card). */
  report: { title: string; rows: [string, number][]; stamp: string } | null;
}

export const initialTake = (takeNo: number): TakeState => ({
  takeNo,
  status: 'rolling',
  hp: 5,
  hpMax: 5,
  goonsDown: 0,
  goonsTotal: 0,
  style: 0,
  combo: 1,
  shots: 0,
  hits: 0,
  startedAt: performance.now(),
  endedAt: 0,
  popups: [],
  notes: [],
  objective: null,
  hint: null,
  blackout: false,
  trial: null,
  slate: null,
  report: null,
});

export const take = new Store<TakeState>(initialTake(1));

let popupId = 0;

export function popup(text: string): void {
  const id = ++popupId;
  take.set((s) => ({ popups: [...s.popups.slice(-3), { id, text }] }));
  window.setTimeout(() => take.set((s) => ({ popups: s.popups.filter((p) => p.id !== id) })), 1400);
}

/** Style points with a combo multiplier that decays if you stop being stylish. */
let comboTimer = 0;
export function addStyle(label: string, base: number): void {
  const s = take.get();
  const pts = Math.round(base * s.combo);
  take.set({ style: s.style + pts, combo: Math.min(s.combo + 0.25, 4) });
  popup(`${label} +${pts}`);
  window.clearTimeout(comboTimer);
  comboTimer = window.setTimeout(() => take.set({ combo: 1 }), 3000);
}

export function completeNote(id: string, label: string): void {
  const s = take.get();
  if (s.notes.includes(id)) return;
  take.set({ notes: [...s.notes, id] });
  popup(`DIRECTOR'S NOTE ✓ ${label}`);
}
