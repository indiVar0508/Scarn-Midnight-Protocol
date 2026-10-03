import { useEffect, useRef } from 'react';
import { sim } from '../game/systems/sim';
import { input } from '../game/systems/input';
import { take } from '../state/take';

/** Centre-screen crosshair for the third-person camera: red over a target, ticks on a hit. */
export function Crosshair() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let hits = take.get().hits;
    let flash = 0;
    const tick = () => {
      const t = take.get();
      if (t.hits > hits) flash = performance.now();
      hits = t.hits;
      const e = el.current;
      if (e) {
        e.classList.toggle('on-target', sim.aimOnTarget);
        e.classList.toggle('hit', performance.now() - flash < 120);
        e.classList.toggle('idle', !input.locked && input.mode === 'kbm');
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div ref={el} className="crosshair">
      <span />
      <span />
      <span />
      <span />
      <i />
      <em>CLICK TO AIM</em>
    </div>
  );
}
