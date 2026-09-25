import { ui } from '../../state/ui';

/**
 * One input facade for keyboard, mouse, gamepad and on-screen touch controls.
 * Game code asks for actions ("fire", "dodge"), never for keys.
 */
export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'fire'
  | 'dodge'
  | 'interact'
  | 'action'
  | 'pose'
  | 'gadget'
  | 'pause'
  | 'back';

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
  Space: ['dodge', 'action'],
  ShiftLeft: ['dodge'],
  ShiftRight: ['dodge'],
  KeyL: ['dodge'],
  KeyE: ['interact', 'action'],
  Enter: ['interact', 'action'],
  NumpadEnter: ['interact', 'action'],
  KeyF: ['pose'],
  KeyQ: ['gadget'],
  Escape: ['pause', 'back'],
  KeyP: ['pause'],
  Backspace: ['back'],
};

class InputManager {
  private held = new Set<Action>();
  private edge = new Set<Action>();
  /** performance.now() of the most recent press per action (precise rhythm timing). */
  private edgeTime = new Map<Action, number>();
  private virtualHeld = new Set<Action>();
  private padHeld = new Set<Action>();
  private prevPad = new Set<Action>();
  private attached = false;
  /** Pointer in game (logical) coordinates. */
  pointer = { x: 640, y: 360, down: false, moved: false, lastMove: 0 };
  touchMove = { x: 0, y: 0 };
  padMove = { x: 0, y: 0 };
  padAim = { x: 0, y: 0 };
  canvas: HTMLCanvasElement | null = null;
  enabled = true;
  /** Accumulated presses for mash games (reset by the reader). */
  mashCount = 0;
  lastKey = '';

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clear);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('contextmenu', (e) => {
      if (this.canvas && e.target === this.canvas) e.preventDefault();
    });
  }

  setCanvas(c: HTMLCanvasElement | null): void {
    this.canvas = c;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const acts = KEYMAP[e.code];
    if (!acts) return;
    const typing = (e.target as HTMLElement)?.tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'range';
    if (typing) return;
    if (ui.get().screen === 'game' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (ui.get().inputMode !== 'kbm') ui.set({ inputMode: 'kbm' });
    if (!e.repeat) {
      const now = performance.now();
      acts.forEach((a) => {
        this.edge.add(a);
        this.edgeTime.set(a, e.timeStamp || now);
      });
      this.mashCount++;
      this.lastKey = e.code;
    }
    acts.forEach((a) => this.held.add(a));
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const acts = KEYMAP[e.code];
    if (!acts) return;
    acts.forEach((a) => this.held.delete(a));
  };

  private toGame(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.canvas) return null;
    const r = this.canvas.getBoundingClientRect();
    if (r.width === 0) return null;
    return { x: ((clientX - r.left) / r.width) * 1280, y: ((clientY - r.top) / r.height) * 720 };
  }

  private onPointerMove = (e: PointerEvent) => {
    const p = this.toGame(e.clientX, e.clientY);
    if (!p) return;
    this.pointer.x = p.x;
    this.pointer.y = p.y;
    this.pointer.moved = true;
    this.pointer.lastMove = performance.now();
  };

  private onPointerDown = (e: PointerEvent) => {
    if (!this.canvas || e.target !== this.canvas) return;
    const p = this.toGame(e.clientX, e.clientY);
    if (p) {
      this.pointer.x = p.x;
      this.pointer.y = p.y;
    }
    if (e.pointerType === 'touch') {
      if (ui.get().inputMode !== 'touch') ui.set({ inputMode: 'touch' });
      return; // touch uses on-screen buttons
    }
    if (ui.get().inputMode !== 'kbm') ui.set({ inputMode: 'kbm' });
    if (e.button === 0) {
      this.pointer.down = true;
      this.edge.add('fire');
      this.edge.add('action');
      this.mashCount++;
    }
    if (e.button === 2) this.edge.add('dodge');
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.button === 0) this.pointer.down = false;
  };

  clear = () => {
    this.held.clear();
    this.virtualHeld.clear();
    this.pointer.down = false;
    this.touchMove.x = 0;
    this.touchMove.y = 0;
  };

  /** Called by touch controls. */
  setVirtual(a: Action, down: boolean): void {
    if (down) {
      if (!this.virtualHeld.has(a)) {
        this.edge.add(a);
        this.edgeTime.set(a, performance.now());
        if (a === 'fire' || a === 'action' || a === 'interact' || a === 'dodge') this.mashCount++;
      }
      this.virtualHeld.add(a);
    } else this.virtualHeld.delete(a);
  }

  pollGamepad(): void {
    const pads = navigator.getGamepads?.() ?? [];
    const gp = Array.from(pads).find((p) => p && p.connected);
    this.padHeld.clear();
    this.padMove.x = 0;
    this.padMove.y = 0;
    this.padAim.x = 0;
    this.padAim.y = 0;
    if (!gp) return;
    const dz = (v: number) => (Math.abs(v) < 0.2 ? 0 : v);
    this.padMove.x = dz(gp.axes[0] ?? 0);
    this.padMove.y = dz(gp.axes[1] ?? 0);
    this.padAim.x = dz(gp.axes[2] ?? 0);
    this.padAim.y = dz(gp.axes[3] ?? 0);
    const b = (i: number) => !!gp.buttons[i]?.pressed;
    if (b(0)) this.padHeld.add('action').add('interact');
    if (b(1)) this.padHeld.add('dodge').add('back');
    if (b(2) || b(7) || b(5)) this.padHeld.add('fire');
    if (b(3)) this.padHeld.add('pose');
    if (b(4) || b(6)) this.padHeld.add('gadget');
    if (b(9)) this.padHeld.add('pause');
    if (b(12)) this.padHeld.add('up');
    if (b(13)) this.padHeld.add('down');
    if (b(14)) this.padHeld.add('left');
    if (b(15)) this.padHeld.add('right');
    for (const a of this.padHeld) {
      if (!this.prevPad.has(a)) {
        this.edge.add(a);
        this.edgeTime.set(a, performance.now());
        this.mashCount++;
      }
    }
    if (this.padHeld.size && ui.get().inputMode !== 'pad') ui.set({ inputMode: 'pad' });
    this.prevPad = new Set(this.padHeld);
  }

  isDown(a: Action): boolean {
    if (!this.enabled) return false;
    return this.held.has(a) || this.virtualHeld.has(a) || this.padHeld.has(a) || (a === 'fire' && this.pointer.down);
  }

  pressed(a: Action): boolean {
    if (!this.enabled) return false;
    return this.edge.has(a);
  }

  /** When the last press of `a` happened (performance.now() clock). */
  pressTime(a: Action): number {
    return this.edgeTime.get(a) ?? performance.now();
  }

  /** Read and clear an edge (so two systems don't both react). */
  consume(a: Action): boolean {
    if (!this.enabled) return false;
    const had = this.edge.has(a);
    this.edge.delete(a);
    return had;
  }

  /** Movement vector, normalized to length <= 1. */
  move(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (!this.enabled) return { x, y };
    if (this.isDown('left')) x -= 1;
    if (this.isDown('right')) x += 1;
    if (this.isDown('up')) y -= 1;
    if (this.isDown('down')) y += 1;
    x += this.touchMove.x + this.padMove.x;
    y += this.touchMove.y + this.padMove.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  /** Clear edges at the end of a frame. */
  endFrame(): void {
    this.edge.clear();
  }

  resetMash(): number {
    const n = this.mashCount;
    this.mashCount = 0;
    return n;
  }
}

export const input = new InputManager();
