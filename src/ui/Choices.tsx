import { useEffect, useSyncExternalStore } from 'react';
import { captions, pickChoice } from '../game/systems/dialogue';
import { input } from '../game/systems/input';
import { sfx } from '@shared/audio/sfx';

/** Dialogue choices: click, or press 1/2/3. Re-captures the mouse on pick (a user gesture). */
export function Choices() {
  const { choice } = useSyncExternalStore(captions.subscribe, captions.get);
  useEffect(() => {
    if (!choice) return;
    const k = (e: KeyboardEvent) => {
      const n = Number(e.key) - 1;
      if (n >= 0 && n < choice.options.length) {
        e.preventDefault();
        pick(n);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [choice]);
  if (!choice) return null;
  return (
    <div className="choices">
      {choice.options.map((o, i) => (
        <button key={o} className="btn choice" onClick={() => pick(i)}>
          <kbd>{i + 1}</kbd> {o}
        </button>
      ))}
    </div>
  );
}

function pick(n: number) {
  sfx('ui_select');
  pickChoice(n);
  input.lock();
}
