import { useEffect, useState } from 'react';
import { useMenuNav, useSettings, useUI } from './hooks';
import { Dialogue } from './Dialogue';
import { TouchControls } from './TouchControls';
import { TapeDeck } from './TapeDeck';
import { skipCard, ui } from '../state/ui';
import { Director } from '../game/Director';
import { ControlsTable } from './Settings';
import { sfx } from '../audio/sfx';

function Cards() {
  const c = useUI((s) => s.card);
  useEffect(() => {
    if (!c || c.kind === 'stamp') return;
    const onKey = (e: KeyboardEvent) => {
      if (['Space', 'Enter', 'KeyE', 'Escape'].includes(e.code)) {
        e.preventDefault();
        skipCard();
      }
    };
    const t = window.setTimeout(() => window.addEventListener('keydown', onKey), 600);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [c]);
  if (!c) return null;
  if (c.kind === 'chapter')
    return (
      <div className="fill card-chapter" onClick={() => skipCard()}>
        <div>
          <div className="n">CHAPTER {c.num}</div>
          <div className="vhs-title t">{c.title.toUpperCase()}</div>
          {c.sub && <div className="b">{c.sub}</div>}
        </div>
      </div>
    );
  if (c.kind === 'mission')
    return (
      <div className="fill card-mission" onClick={() => skipCard()}>
        <div className="folder">
          <div className="label">CLASSIFIED · EYES ONLY · SCARN</div>
          <div className="mission">{c.title}</div>
          {c.sub && <div className="sub">{c.sub}</div>}
          <div className="stamp">TOP SECRET</div>
          <div className="coffee" />
        </div>
      </div>
    );
  return (
    <div className="fill card-stamp">
      <div className="s vhs-title">{c.title}</div>
    </div>
  );
}

function Hud() {
  const hud = useUI((s) => s.hud);
  const obj = useUI((s) => s.objective);
  return (
    <div className="hud-top">
      {obj && (
        <div className="objective" key={obj}>
          <small>OBJECTIVE</small>
          {obj}
        </div>
      )}
      {hud && (
        <div className="cool-meter" aria-label={`Coolness ${hud.hp} of ${hud.hpMax}`}>
          <label>{hud.label ?? 'COOL'}</label>
          {Array.from({ length: hud.hpMax }, (_, i) => (
            <i key={i} className={i < Math.ceil(hud.hp) ? 'on' : ''} />
          ))}
        </div>
      )}
    </div>
  );
}

function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <div className="medal">{t.kind === 'achievement' ? '★' : '!'}</div>
          <div>
            <b>{t.kind === 'achievement' ? `ACHIEVEMENT: ${t.title}` : t.title}</b>
            {t.desc && <span>{t.desc}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PauseMenu() {
  const [idx, setIdx] = useState(0);
  const items: [string, () => void][] = [
    ['RESUME', () => Director.resume()],
    ['RESTART CHECKPOINT', () => Director.restartCheckpoint()],
    ['SETTINGS', () => ui.set({ screen: 'settings', settingsReturn: 'game' })],
    ['QUIT TO MENU', () => Director.quitToMenu()],
  ];
  useMenuNav({
    count: items.length,
    index: idx,
    setIndex: setIdx,
    onSelect: (i) => {
      sfx('ui_select');
      items[i][1]();
    },
  });
  return (
    <div className="fill pause" role="dialog" aria-label="Paused">
      <div>
        <h2 className="vhs-title">PAUSED</h2>
        <div className="osd" style={{ fontSize: '2cqw', marginBottom: '1.4cqw' }}>
          ❚❚ PAUSE
        </div>
        <nav>
          {items.map(([label, act], i) => (
            <button
              key={label}
              className={`btn ${i === idx ? 'active' : ''}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => {
                sfx('ui_select');
                act();
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div className="aside">
        <h3>CONTROLS</h3>
        <ControlsTable />
      </div>
    </div>
  );
}

export function GameUI() {
  const paused = useUI((s) => s.paused);
  const hint = useUI((s) => s.hint);
  const cap = useUI((s) => s.caption);
  const dialogue = useUI((s) => s.dialogue);
  const set = useSettings();

  // Esc / P / Start toggles pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (ui.get().screen !== 'game') return;
        e.preventDefault();
        Director.togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    let raf = 0;
    let prev = true;
    const poll = () => {
      raf = requestAnimationFrame(poll);
      const gp = Array.from(navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
      const st = !!gp?.buttons[9]?.pressed;
      if (st && !prev && ui.get().screen === 'game') Director.togglePause();
      prev = st;
    };
    raf = requestAnimationFrame(poll);
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={`layer ${set.highContrast ? 'hc' : ''} ${set.textSize === 'large' ? 'large-text' : ''}`}>
      <Hud />
      {cap && set.subtitles && (
        <div className="caption" key={cap.id}>
          {cap.text}
        </div>
      )}
      {hint && !dialogue && <div className="hint">{hint}</div>}
      <TapeDeck />
      <Dialogue />
      <Cards />
      <Toasts />
      <TouchControls />
      {!paused && (
        <button className="pause-btn" aria-label="Pause" onClick={() => Director.pause()}>
          ❚❚
        </button>
      )}
      {paused && <PauseMenu />}
    </div>
  );
}
