/**
 * One input facade for keyboard, mouse and gamepad (touch arrives in Phase 2).
 * Game code asks for actions, never keys. Presses are buffered until a consumer
 * takes them with `consume()`, so a press is never lost when a render frame runs
 * zero physics steps (high-refresh displays) or two.
 */
export type Action = 'up' | 'down' | 'left' | 'right' | 'fire' | 'dodge' | 'interact' | 'pose' | 'pause' | 'retake';

const KEYMAP: Record<string, Action[]> = {
  KeyW: ['up'],
  ArrowUp: ['up'],
  KeyS: ['down'],
  ArrowDown: ['down'],
  KeyA: ['left'],
  ArrowLeft: ['left'],
  KeyD: ['right'],
  ArrowRight: ['right'],
  KeyJ: ['fire'],
  KeyK: ['fire'],
  Space: ['dodge'],
  ShiftLeft: ['dodge'],
  ShiftRight: ['dodge'],
  KeyE: ['interact'],
  Enter: ['interact'],
  KeyF: ['pose'],
  Escape: ['pause'],
  KeyP: ['pause'],
  KeyR: ['retake'],
};

const PAD_BUTTONS: [number, Action][] = [
  [7, 'fire'], // RT
  [1, 'dodge'], // B
  [0, 'interact'], // A
  [3, 'pose'], // Y
  [9, 'pause'], // Start
  [8, 'retake'], // Back/Select
];

/** Presses stay usable for this many physics steps (~150 ms of game time at 60 Hz). The step
 *  that sees the press first ages it, so it always gets at least BUFFER_STEPS - 1 chances. */
const BUFFER_STEPS = 10;

class Input {
  private held = new Set<Action>();
  private padHeld = new Set<Action>();
  /** Buffered presses: physics steps left before each one expires (counted in game time, so a
   *  slow render frame can't eat a press before any step has had the chance to use it). */
  private pending = new Map<Action, number>();
  private attached = false;
  /** Pointer in normalized device coords (-1..1), for ground-plane aiming. */
  pointer = { x: 0, y: 0, active: false };
  pad = { move: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, connected: false };
  /** Mouse-look deltas (px) accumulated since the camera last consumed them. */
  look = { dx: 0, dy: 0 };
  /** Pointer lock is held (mouse look active). */
  locked = false;
  private target: HTMLElement | null = null;
  mode: 'kbm' | 'pad' = 'kbm';
  enabled = true;

  attach(target: HTMLElement): () => void {
    if (this.attached) return () => {};
    this.attached = true;
    const down = (e: KeyboardEvent) => {
      const acts = KEYMAP[e.code];
      if (!acts || e.repeat) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      this.mode = 'kbm';
      for (const a of acts) {
        if (!this.held.has(a)) this.pending.set(a, BUFFER_STEPS);
        this.held.add(a);
      }
    };
    const up = (e: KeyboardEvent) => {
      for (const a of KEYMAP[e.code] ?? []) this.held.delete(a);
    };
    const move = (e: PointerEvent) => {
      if (this.locked) {
        this.look.dx += e.movementX;
        this.look.dy += e.movementY;
      }
      const r = target.getBoundingClientRect();
      this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      this.pointer.active = true;
      this.mode = 'kbm';
    };
    const pdown = (e: PointerEvent) => {
      move(e);
      if (!this.locked && this.enabled && e.pointerType === 'mouse') this.lock();
      if (e.button === 0) {
        if (!this.held.has('fire')) this.pending.set('fire', BUFFER_STEPS);
        this.held.add('fire');
      } else if (e.button === 2) {
        this.pending.set('dodge', BUFFER_STEPS);
      }
    };
    const pup = (e: PointerEvent) => {
      if (e.button === 0) this.held.delete('fire');
    };
    const blur = () => this.clear();
    const lockChange = () => {
      this.locked = document.pointerLockElement === target;
      this.look.dx = this.look.dy = 0;
    };
    this.target = target;
    document.addEventListener('pointerlockchange', lockChange);
    const ctx = (e: Event) => e.preventDefault();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerdown', pdown);
    window.addEventListener('pointerup', pup);
    target.addEventListener('contextmenu', ctx);
    window.addEventListener('blur', blur);
    return () => {
      this.attached = false;
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerdown', pdown);
      window.removeEventListener('pointerup', pup);
      target.removeEventListener('contextmenu', ctx);
      window.removeEventListener('blur', blur);
      document.removeEventListener('pointerlockchange', lockChange);
      this.target = null;
    };
  }

  /** Call once per frame before gameplay reads input. */
  pollPad(): void {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const p = Array.from(pads).find((g) => g && g.connected);
    this.pad.connected = !!p;
    if (!p) return;
    const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
    this.pad.move.x = dz(p.axes[0] ?? 0);
    this.pad.move.y = dz(p.axes[1] ?? 0);
    this.pad.aim.x = dz(p.axes[2] ?? 0);
    this.pad.aim.y = dz(p.axes[3] ?? 0);
    const now = new Set<Action>();
    for (const [i, a] of PAD_BUTTONS) if (p.buttons[i]?.pressed) now.add(a);
    if ((p.buttons[6]?.value ?? 0) > 0.5) now.add('dodge'); // LT
    for (const a of now) if (!this.padHeld.has(a)) this.pending.set(a, BUFFER_STEPS);
    if (now.size || Math.hypot(this.pad.move.x, this.pad.move.y) > 0) this.mode = 'pad';
    this.padHeld = now;
  }

  isDown(a: Action): boolean {
    return this.enabled && (this.held.has(a) || this.padHeld.has(a));
  }

  /** True once per press, buffered for BUFFER_STEPS physics steps (v1 bible: ~100 ms buffer). */
  consume(a: Action): boolean {
    if (!this.pending.has(a)) return false;
    this.pending.delete(a);
    return this.enabled;
  }

  /** Peek without consuming (UI that only reacts to some presses). */
  peek(a: Action): boolean {
    return this.pending.has(a);
  }

  /** Age buffered presses by one physics step (SimTicker calls this before actors run). */
  stepTick(): void {
    for (const [a, n] of this.pending) {
      if (n <= 1) this.pending.delete(a);
      else this.pending.set(a, n - 1);
    }
  }

  /** Movement intent on the floor plane: x = right, y = "up" on screen (away from camera). */
  move(): { x: number; y: number } {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0);
    let y = (this.held.has('up') ? 1 : 0) - (this.held.has('down') ? 1 : 0);
    if (this.pad.connected && (this.pad.move.x || this.pad.move.y)) {
      x = this.pad.move.x;
      y = -this.pad.move.y;
    }
    const l = Math.hypot(x, y);
    return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }

  /** Capture the mouse for third-person look (needs a user gesture). */
  lock(): void {
    const t = this.target;
    if (!t || document.pointerLockElement === t) return;
    try {
      const r = t.requestPointerLock() as unknown as Promise<void> | undefined;
      r?.catch?.(() => undefined);
    } catch {
      /* not allowed outside a gesture; the next click retries */
    }
  }

  unlock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Take the accumulated mouse-look delta. */
  takeLook(): { dx: number; dy: number } {
    const l = { dx: this.look.dx, dy: this.look.dy };
    this.look.dx = this.look.dy = 0;
    return this.enabled ? l : { dx: 0, dy: 0 };
  }

  /** Poll the gamepad (once per render frame). */
  beginFrame(): void {
    this.pollPad();
  }

  clear(): void {
    this.held.clear();
    this.padHeld.clear();
    this.pending.clear();
  }
}

export const input = new Input();
