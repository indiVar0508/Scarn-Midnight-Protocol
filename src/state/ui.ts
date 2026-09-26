import { Store } from './store';

export type Screen = 'boot' | 'menu' | 'chapters' | 'settings' | 'credits' | 'game' | 'stats' | 'achievements';

export type DialogueStyle = 'normal' | 'radio' | 'narrator' | 'ghost' | 'tv' | 'thought';

export interface DialogueView {
  id: number;
  speaker: string;
  name: string;
  color: string;
  portrait: string | null;
  text: string;
  style: DialogueStyle;
  choices: string[] | null;
  /** When set, the line auto-advances after this many ms (used for barks in gameplay). */
  autoMs: number | null;
}

export interface Toast {
  id: number;
  kind: 'achievement' | 'item' | 'info';
  title: string;
  desc?: string;
}

export interface Card {
  id: number;
  kind: 'mission' | 'chapter' | 'objective' | 'stamp';
  title: string;
  sub?: string;
  num?: number;
}

export type TouchLayout = 'none' | 'move' | 'action' | 'buttons' | 'rhythm' | 'hockey';

export interface UIState {
  screen: Screen;
  settingsReturn: Screen;
  inGame: boolean;
  paused: boolean;
  dialogue: DialogueView | null;
  caption: { id: number; text: string } | null;
  card: Card | null;
  objective: string | null;
  hint: string | null;
  hud: { hp: number; hpMax: number; label?: string } | null;
  /** Boss health (0..1), shown separately so it never fights with the player's COOL meter. */
  boss: { name: string; frac: number } | null;
  toasts: Toast[];
  loading: string | null;
  inputMode: 'kbm' | 'pad' | 'touch';
  touchLayout: TouchLayout;
  chapterTitle: string | null;
  fullscreen: boolean;
  letterbox: boolean;
  creditsNext: 'stats' | 'menu';
}

/** Phones/tablets without a mouse start with touch controls visible. */
function touchOnlyDevice(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches;
  } catch {
    return false;
  }
}

export const ui = new Store<UIState>({
  screen: 'boot',
  settingsReturn: 'menu',
  inGame: false,
  paused: false,
  dialogue: null,
  caption: null,
  card: null,
  objective: null,
  hint: null,
  hud: null,
  boss: null,
  toasts: [],
  loading: null,
  inputMode: touchOnlyDevice() ? 'touch' : 'kbm',
  touchLayout: 'none',
  chapterTitle: null,
  fullscreen: false,
  letterbox: false,
  creditsNext: 'menu',
});

let uid = 1;
export const nextId = (): number => uid++;

// ---------------------------------------------------------------------------
// Dialogue bridge: game code awaits, React resolves.
// ---------------------------------------------------------------------------
let dialogueResolve: ((choice: number) => void) | null = null;

export class Cancelled extends Error {
  constructor() {
    super('cancelled');
    this.name = 'Cancelled';
  }
}

export function showDialogue(view: Omit<DialogueView, 'id'>, signal?: AbortSignal): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    if (signal?.aborted) return reject(new Cancelled());
    const id = nextId();
    const finish = (choice: number) => {
      if (dialogueResolve !== finish) return;
      dialogueResolve = null;
      signal?.removeEventListener('abort', onAbort);
      if (ui.get().dialogue?.id === id) ui.set({ dialogue: null });
      resolve(choice);
    };
    const onAbort = () => {
      if (dialogueResolve === finish) dialogueResolve = null;
      if (ui.get().dialogue?.id === id) ui.set({ dialogue: null });
      reject(new Cancelled());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    dialogueResolve = finish;
    ui.set({ dialogue: { ...view, id } });
  });
}

export function advanceDialogue(choice = 0): void {
  dialogueResolve?.(choice);
}

export function clearDialogue(): void {
  dialogueResolve = null;
  ui.set({ dialogue: null });
}

// ---------------------------------------------------------------------------
// Cards / captions / toasts
// ---------------------------------------------------------------------------
let cardResolve: (() => void) | null = null;

export function showCard(card: Omit<Card, 'id'>, ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new Cancelled());
    const id = nextId();
    const done = () => {
      window.clearTimeout(t);
      signal?.removeEventListener('abort', onAbort);
      if (cardResolve === done) cardResolve = null;
      if (ui.get().card?.id === id) ui.set({ card: null });
      resolve();
    };
    const onAbort = () => {
      window.clearTimeout(t);
      if (cardResolve === done) cardResolve = null;
      if (ui.get().card?.id === id) ui.set({ card: null });
      reject(new Cancelled());
    };
    const t = window.setTimeout(done, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
    cardResolve = done;
    ui.set({ card: { ...card, id } });
  });
}

/** Lets the player skip a card early. */
export function skipCard(): void {
  cardResolve?.();
}

let captionTimer: number | undefined;
export function caption(text: string, ms = 2600): void {
  window.clearTimeout(captionTimer);
  ui.set({ caption: { id: nextId(), text } });
  captionTimer = window.setTimeout(() => ui.set({ caption: null }), ms);
}

export function pushToast(t: Omit<Toast, 'id'>): void {
  const toast = { ...t, id: nextId() };
  ui.set((s) => ({ toasts: [...s.toasts, toast] }));
  window.setTimeout(() => ui.set((s) => ({ toasts: s.toasts.filter((x) => x.id !== toast.id) })), 4200);
}

export function setObjective(text: string | null): void {
  ui.set({ objective: text });
}

export function setHint(text: string | null): void {
  if (ui.get().hint !== text) ui.set({ hint: text });
}

export function goScreen(screen: Screen): void {
  ui.set({ screen });
}
