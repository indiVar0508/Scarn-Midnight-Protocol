import { useEffect } from 'react';
import { useSettings, useUI } from './hooks';
import { updateSettings, resetSettings, type Settings as S } from '../state/settings';
import { ui } from '../state/ui';
import { wipeAll } from '../state/save';
import { sfx } from '../audio/sfx';

function Toggle({ k, label, note }: { k: keyof S; label: string; note?: string }) {
  const s = useSettings();
  const on = !!s[k];
  const flip = () => {
    updateSettings({ [k]: !on } as Partial<S>);
    sfx('ui_move');
  };
  return (
    <div className="setting">
      {/* the whole label is a click target too; the switch stays the keyboard/AT control */}
      <div className="setting-label" onClick={flip}>
        {label}
        {note && <small>{note}</small>}
      </div>
      <button className="toggle" role="switch" aria-checked={on} aria-label={label} onClick={flip} />
    </div>
  );
}

function Slider({ k, label, min = 0, max = 1, step = 0.05, fmt }: { k: keyof S; label: string; min?: number; max?: number; step?: number; fmt?: (v: number) => string }) {
  const s = useSettings();
  const v = s[k] as number;
  return (
    <div className="setting">
      <label htmlFor={`set-${k}`}>{label}</label>
      <span style={{ display: 'flex', alignItems: 'center', gap: '1cqw' }}>
        <input
          id={`set-${k}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={v}
          onChange={(e) => updateSettings({ [k]: parseFloat(e.target.value) } as Partial<S>)}
          onPointerUp={() => sfx('ui_blip')}
        />
        <span className="osd" style={{ width: '5cqw', textAlign: 'right', fontSize: '1.7cqw' }}>
          {fmt ? fmt(v) : `${Math.round(v * 100)}%`}
        </span>
      </span>
    </div>
  );
}

export function ControlsTable() {
  return (
    <table className="controls-table">
      <tbody>
        <tr>
          <td>Move</td>
          <td>
            <kbd>WASD</kbd> / <kbd>Arrows</kbd> · Left stick · Touch stick
          </td>
        </tr>
        <tr>
          <td>Aim / Shoot</td>
          <td>
            Mouse + <kbd>Left click</kbd> or <kbd>J</kbd> (auto-aim) · Right stick + <kbd>RT</kbd>
          </td>
        </tr>
        <tr>
          <td>Dodge roll</td>
          <td>
            <kbd>Space</kbd> / <kbd>Shift</kbd> / <kbd>Right click</kbd> · <kbd>B</kbd>
          </td>
        </tr>
        <tr>
          <td>Interact / Talk</td>
          <td>
            <kbd>E</kbd> / <kbd>Enter</kbd> · <kbd>A</kbd>
          </td>
        </tr>
        <tr>
          <td>Dramatic pose</td>
          <td>
            <kbd>F</kbd> · <kbd>Y</kbd> (dazzles henchmen)
          </td>
        </tr>
        <tr>
          <td>Gadget</td>
          <td>
            <kbd>Q</kbd> · <kbd>LB</kbd>
          </td>
        </tr>
        <tr>
          <td>Advance dialogue</td>
          <td>
            <kbd>Space</kbd> / <kbd>Enter</kbd> / <kbd>E</kbd> / click · choices: <kbd>1-4</kbd>
          </td>
        </tr>
        <tr>
          <td>Pause</td>
          <td>
            <kbd>Esc</kbd> / <kbd>P</kbd> · <kbd>Start</kbd>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function Settings() {
  const back = useUI((s) => s.settingsReturn);
  const s = useSettings();
  const close = () => {
    sfx('ui_back');
    ui.set({ screen: back });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  const fs = !!document.fullscreenElement;
  return (
    <div className="panel" role="dialog" aria-label="Settings">
      <header>
        <h2>SETTINGS</h2>
        <span className="osd" style={{ fontSize: '1.6cqw' }}>
          Saved automatically
        </span>
      </header>
      <div className="body">
        <div className="settings-grid">
          <h3>AUDIO</h3>
          <Slider k="master" label="Master volume" />
          <Slider k="music" label="Music" />
          <Slider k="sfx" label="Sound effects" />
          <Slider k="voice" label="Voices" />
          <Toggle k="muted" label="Mute everything" />
          <Toggle k="voiceActing" label="Voice acting" note="Synthetic original voices" />
          <h3>TEXT</h3>
          <Toggle k="subtitles" label="Captions" note="Barks, radio, sound cues" />
          <div className="setting">
            <div>Text size</div>
            <div className="seg">
              {(['normal', 'large'] as const).map((v) => (
                <button key={v} className={`chip ${s.textSize === v ? 'active' : ''}`} onClick={() => updateSettings({ textSize: v })}>
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <Toggle k="autoAdvance" label="Auto-advance dialogue" />
          <h3>ACCESSIBILITY &amp; COMFORT</h3>
          <Toggle k="reducedFlashing" label="Reduced flashing" />
          <Toggle k="reducedShake" label="Reduced screen shake" />
          <Toggle k="highContrast" label="High-contrast indicators" />
          <Toggle k="assist" label="Assist mode" note="Half damage, slower bullets, wider timing" />
          <Slider k="filmEffects" label="VHS film effects" />
          <Slider k="rhythmOffsetMs" label="Rhythm offset" min={-150} max={150} step={5} fmt={(v) => `${v > 0 ? '+' : ''}${v}ms`} />
          <h3>GAME</h3>
          <Toggle k="screeningMode" label="Screening Mode" note="Office reactions between chapters" />
          <div className="setting">
            <div>Touch controls</div>
            <div className="seg">
              {(['auto', 'on', 'off'] as const).map((v) => (
                <button key={v} className={`chip ${s.touchControls === v ? 'active' : ''}`} onClick={() => updateSettings({ touchControls: v })}>
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="setting">
            <div>Fullscreen</div>
            <button
              className="chip"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void document.documentElement.requestFullscreen?.().catch(() => undefined);
              }}
            >
              {fs ? 'EXIT' : 'ENTER'}
            </button>
          </div>
          <h3>CONTROLS</h3>
          <div style={{ gridColumn: '1 / -1' }}>
            <ControlsTable />
          </div>
        </div>
      </div>
      <footer>
        <button className="chip" onClick={() => resetSettings()}>
          RESET SETTINGS
        </button>
        {back === 'menu' && (
          <button
            className="chip"
            onClick={() => {
              if (window.confirm('Erase all progress, unlocks and achievements?')) wipeAll();
            }}
          >
            ERASE SAVE DATA
          </button>
        )}
        <button className="chip primary" onClick={close} autoFocus>
          DONE
        </button>
      </footer>
    </div>
  );
}
