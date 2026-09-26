import { useEffect, useRef, useState } from 'react';
import { useUI } from './hooks';
import { advanceDialogue } from '../state/ui';
import { sfx } from '../audio/sfx';

/** Typewriter dialogue box with portrait, choices and auto-advance. */
export function Dialogue() {
  const d = useUI((s) => s.dialogue);
  const paused = useUI((s) => s.paused);
  const [shown, setShown] = useState(0);
  const [sel, setSel] = useState(0);
  const idRef = useRef<number | null>(null);
  const done = !!d && shown >= d.text.length;

  // reset on new line
  useEffect(() => {
    if (!d) return;
    if (idRef.current !== d.id) {
      idRef.current = d.id;
      setShown(0);
      setSel(0);
    }
  }, [d]);

  // typewriter
  useEffect(() => {
    if (!d || paused || shown >= d.text.length) return;
    const t = window.setTimeout(() => {
      setShown((n) => Math.min(d.text.length, n + 2));
      if (shown % 6 === 0) sfx('ui_blip', 0, 40);
    }, 22);
    return () => window.clearTimeout(t);
  }, [d, shown, paused]);

  // auto-advance
  useEffect(() => {
    if (!d || !d.autoMs || d.choices || paused) return;
    const t = window.setTimeout(() => advanceDialogue(0), d.autoMs);
    return () => window.clearTimeout(t);
  }, [d, paused]);

  // input
  useEffect(() => {
    if (!d) return;
    const onKey = (e: KeyboardEvent) => {
      if (paused) return;
      if (d.choices) {
        if (!done) {
          if (['Space', 'Enter', 'KeyE'].includes(e.code)) {
            e.preventDefault();
            setShown(d.text.length);
          }
          return;
        }
        const n = d.choices.length;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          setSel((i) => (i + 1) % n);
          sfx('ui_move');
          e.preventDefault();
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          setSel((i) => (i - 1 + n) % n);
          sfx('ui_move');
          e.preventDefault();
        } else if (['Space', 'Enter', 'KeyE'].includes(e.code)) {
          e.preventDefault();
          advanceDialogue(sel);
        } else if (/^Digit[1-9]$/.test(e.code)) {
          const k = parseInt(e.code.slice(5), 10) - 1;
          if (k < n) advanceDialogue(k);
        }
        return;
      }
      if (['Space', 'Enter', 'KeyE', 'NumpadEnter'].includes(e.code) && !e.repeat) {
        e.preventDefault();
        if (!done) setShown(d.text.length);
        else advanceDialogue(0);
      }
    };
    window.addEventListener('keydown', onKey);
    // gamepad A
    let raf = 0;
    let prevA = true;
    let prevUD = 0;
    const poll = () => {
      raf = requestAnimationFrame(poll);
      const gp = Array.from(navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
      if (!gp || paused) return;
      const a = !!gp.buttons[0]?.pressed;
      const ud = gp.buttons[13]?.pressed || (gp.axes[1] ?? 0) > 0.5 ? 1 : gp.buttons[12]?.pressed || (gp.axes[1] ?? 0) < -0.5 ? -1 : 0;
      if (d.choices && ud !== 0 && ud !== prevUD) setSel((i) => (i + ud + d.choices!.length) % d.choices!.length);
      prevUD = ud;
      if (a && !prevA) {
        if (!done) setShown(d.text.length);
        else advanceDialogue(d.choices ? sel : 0);
      }
      prevA = a;
    };
    raf = requestAnimationFrame(poll);
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  }, [d, done, sel, paused]);

  if (!d) return null;
  const cls = `dialogue ${d.style}`;
  return (
    <div
      className={cls}
      style={{ ['--c' as string]: d.color }}
      role="dialog"
      aria-live="polite"
      onClick={() => {
        if (d.choices) {
          if (!done) setShown(d.text.length);
          return;
        }
        if (!done) setShown(d.text.length);
        else advanceDialogue(0);
      }}
    >
      {d.portrait && d.style !== 'narrator' && <img className="portrait" src={d.portrait} alt="" />}
      <div style={{ flex: 1, minWidth: 0 }}>
        {d.style !== 'narrator' && (
          <div className="who">
            {d.name}
            {d.actor && <span className="actor">played by {d.actor}</span>}
          </div>
        )}
        <div className="text">
          {d.text.slice(0, shown)}
          <span style={{ opacity: 0 }}>{d.text.slice(shown)}</span>
        </div>
        {d.choices && done && (
          <div className="choices" role="listbox">
            {d.choices.map((c, i) => (
              <button
                key={i}
                className={`choice ${i === sel ? 'active' : ''}`}
                onMouseEnter={() => setSel(i)}
                onClick={(e) => {
                  e.stopPropagation();
                  advanceDialogue(i);
                }}
              >
                <span className="k">{i + 1}</span>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      {!d.choices && done && <div className="more blink">▼</div>}
    </div>
  );
}
