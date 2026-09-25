import { useEffect, useRef, useSyncExternalStore } from 'react';
import { ui, type UIState } from '../state/ui';
import { settings, type Settings } from '../state/settings';
import { save, type SaveData } from '../state/save';
import { sfx } from '../audio/sfx';

export function useUI<T>(sel: (s: UIState) => T): T {
  return useSyncExternalStore(ui.subscribe, () => sel(ui.get()));
}

export function useSettings(): Settings {
  return useSyncExternalStore(settings.subscribe, settings.get);
}

export function useSave(): SaveData {
  return useSyncExternalStore(save.subscribe, save.get);
}

/**
 * Keyboard + gamepad navigation for vertical/grid menus.
 * Returns nothing; calls setIndex/onSelect/onBack.
 */
export function useMenuNav(opts: {
  count: number;
  index: number;
  setIndex: (i: number) => void;
  onSelect: (i: number) => void;
  onBack?: () => void;
  columns?: number;
  enabled?: boolean;
}): void {
  const ref = useRef(opts);
  ref.current = opts;
  useEffect(() => {
    const move = (d: number) => {
      const o = ref.current;
      if (!o.count) return;
      o.setIndex((o.index + d + o.count) % o.count);
      sfx('ui_move');
    };
    const onKey = (e: KeyboardEvent) => {
      const o = ref.current;
      if (o.enabled === false) return;
      const cols = o.columns ?? 1;
      switch (e.code) {
        case 'ArrowDown':
        case 'KeyS':
          move(cols);
          e.preventDefault();
          break;
        case 'ArrowUp':
        case 'KeyW':
          move(-cols);
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (cols > 1) {
            move(1);
            e.preventDefault();
          }
          break;
        case 'ArrowLeft':
        case 'KeyA':
          if (cols > 1) {
            move(-1);
            e.preventDefault();
          }
          break;
        case 'Enter':
        case 'Space':
        case 'KeyE':
          if ((e.target as HTMLElement)?.tagName === 'BUTTON' && e.code !== 'KeyE') return; // native click
          e.preventDefault();
          o.onSelect(o.index);
          break;
        case 'Escape':
        case 'Backspace':
          if (o.onBack) {
            e.preventDefault();
            sfx('ui_back');
            o.onBack();
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    // gamepad polling
    let raf = 0;
    let prev: Record<string, boolean> = {};
    let repeatAt = 0;
    const poll = () => {
      raf = requestAnimationFrame(poll);
      const o = ref.current;
      if (o.enabled === false) return;
      const gp = Array.from(navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
      if (!gp) return;
      const cols = o.columns ?? 1;
      const st = {
        up: !!gp.buttons[12]?.pressed || (gp.axes[1] ?? 0) < -0.5,
        down: !!gp.buttons[13]?.pressed || (gp.axes[1] ?? 0) > 0.5,
        left: !!gp.buttons[14]?.pressed || (gp.axes[0] ?? 0) < -0.5,
        right: !!gp.buttons[15]?.pressed || (gp.axes[0] ?? 0) > 0.5,
        a: !!gp.buttons[0]?.pressed,
        b: !!gp.buttons[1]?.pressed,
      };
      const now = performance.now();
      const edge = (k: keyof typeof st) => st[k] && (!prev[k] || now > repeatAt);
      if (edge('down')) {
        move(cols);
        repeatAt = now + 250;
      } else if (edge('up')) {
        move(-cols);
        repeatAt = now + 250;
      } else if (cols > 1 && edge('right')) {
        move(1);
        repeatAt = now + 250;
      } else if (cols > 1 && edge('left')) {
        move(-1);
        repeatAt = now + 250;
      }
      if (st.a && !prev.a) o.onSelect(o.index);
      if (st.b && !prev.b) o.onBack?.();
      prev = st;
    };
    raf = requestAnimationFrame(poll);
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  }, []);
}
