import { useEffect, useRef } from 'react';
import { sim } from '../game/systems/sim';
import { input } from '../game/systems/input';

/** "E · Inspect the portrait" when something usable is in reach. */
export function Prompt() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let last = '';
    const tick = () => {
      const f = sim.focus;
      const key = input.mode === 'pad' ? 'A' : 'E';
      const text = f ? `${key} · ${f.label}` : '';
      if (text !== last && el.current) {
        el.current.textContent = text;
        el.current.style.display = text ? 'block' : 'none';
        last = text;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div ref={el} className="prompt" style={{ display: 'none' }} />;
}
