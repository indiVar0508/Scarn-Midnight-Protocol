import { useRef } from 'react';
import { useSettings, useUI } from './hooks';
import { input, type Action } from '../game/systems/Input';

function TBtn({ a, label, primary }: { a: Action; label: string; primary?: boolean }) {
  return (
    <button
      className={`tbtn ${primary ? 'primary' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        input.setVirtual(a, true);
      }}
      onPointerUp={() => input.setVirtual(a, false)}
      onPointerCancel={() => input.setVirtual(a, false)}
      onPointerLeave={() => input.setVirtual(a, false)}
      aria-label={label}
    >
      {label}
    </button>
  );
}

function Stick() {
  const ref = useRef<HTMLDivElement>(null);
  const nub = useRef<HTMLDivElement>(null);
  const id = useRef<number | null>(null);
  const update = (cx: number, cy: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = cx - (r.left + r.width / 2);
    const dy = cy - (r.top + r.height / 2);
    const max = r.width / 2;
    const d = Math.hypot(dx, dy);
    const k = d > max ? max / d : 1;
    input.touchMove.x = (dx * k) / max;
    input.touchMove.y = (dy * k) / max;
    if (nub.current) nub.current.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  };
  const end = () => {
    id.current = null;
    input.touchMove.x = 0;
    input.touchMove.y = 0;
    if (nub.current) nub.current.style.transform = '';
  };
  return (
    <div
      className="stick"
      ref={ref}
      onPointerDown={(e) => {
        id.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (id.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="nub" ref={nub} />
    </div>
  );
}

export function TouchControls() {
  const mode = useUI((s) => s.inputMode);
  const layout = useUI((s) => s.touchLayout);
  const dialogue = useUI((s) => s.dialogue);
  const paused = useUI((s) => s.paused);
  const set = useSettings();
  const show = set.touchControls === 'on' || (set.touchControls === 'auto' && mode === 'touch');
  if (!show || paused || layout === 'none' || (dialogue && layout !== 'rhythm')) return null;
  return (
    <div className="layer touch">
      {(layout === 'move' || layout === 'action' || layout === 'hockey' || layout === 'buttons') && <Stick />}
      {layout === 'move' && (
        <div className="btns" style={{ gridTemplateColumns: '8.2cqw' }}>
          <TBtn a="interact" label="USE" primary />
        </div>
      )}
      {layout === 'action' && (
        <div className="btns">
          <TBtn a="pose" label="POSE" />
          <TBtn a="interact" label="USE" />
          <TBtn a="dodge" label="ROLL" />
          <TBtn a="fire" label="FIRE" primary />
        </div>
      )}
      {layout === 'buttons' && (
        <div className="btns">
          <TBtn a="gadget" label="GADGET" />
          <TBtn a="interact" label="USE" />
          <TBtn a="dodge" label="B" />
          <TBtn a="action" label="A" primary />
        </div>
      )}
      {layout === 'hockey' && (
        <div className="btns">
          <TBtn a="dodge" label="CHECK" />
          <TBtn a="interact" label="PASS" />
          <TBtn a="pose" label="POSE" />
          <TBtn a="fire" label="SHOOT" primary />
        </div>
      )}
      {layout === 'rhythm' && (
        <div className="lanes">
          <TBtn a="left" label="◀" />
          <TBtn a="down" label="▼" />
          <TBtn a="action" label="SCARN" primary />
          <TBtn a="up" label="▲" />
          <TBtn a="right" label="▶" />
        </div>
      )}
    </div>
  );
}
