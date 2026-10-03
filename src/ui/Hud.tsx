import { useSyncExternalStore } from 'react';
import { take } from '../state/take';
import { Crosshair } from './Crosshair';

export function useTake() {
  return useSyncExternalStore(take.subscribe, take.get);
}

export function Hud({ notes, combat = true }: { notes: readonly { id: string; label: string }[]; combat?: boolean }) {
  const t = useTake();
  return (
    <div className="hud">
      <div className="hud-left">
        {combat && (
          <>
            <div className="hud-label">COOL</div>
            <div className="cool">
              {Array.from({ length: t.hpMax }, (_, i) => (
                <span key={i} className={i < t.hp ? 'pip on' : 'pip'} />
              ))}
            </div>
          </>
        )}
        <div className="hud-take">TAKE {t.takeNo}</div>
      </div>
      <div className="hud-center">
        {t.objective && <div className="objective">{t.objective}</div>}
        <div className="popups">
          {t.popups.map((p) => (
            <div key={p.id} className="popup">
              {p.text}
            </div>
          ))}
        </div>
      </div>
      <div className="hud-right">
        <div className="style">
          STYLE <b>{t.style}</b>
          {t.combo > 1 && <span className="combo">×{t.combo.toFixed(2)}</span>}
        </div>
        {combat && (
          <div className="goons">
            GOONS {t.goonsDown}/{t.goonsTotal}
          </div>
        )}
        <ul className="notes">
          {notes.map((n) => (
            <li key={n.id} className={t.notes.includes(n.id) ? 'done' : ''}>
              {t.notes.includes(n.id) ? '★' : '☆'} {n.label}
            </li>
          ))}
        </ul>
      </div>
      {t.trial && (
        <div className="trial">
          <div className="trial-title">{t.trial.title}</div>
          <div className="trial-time">{Math.max(0, t.trial.timeLeft).toFixed(1)}</div>
          <div className="trial-score">{t.trial.score}</div>
        </div>
      )}
      {t.report && (
        <div className="report">
          <div className="report-title">{t.report.title}</div>
          {t.report.rows.map(([name, n]) => (
            <div key={name} className="report-row">
              <span>{name}</span>
              <span className="dots" />
              <b>{n}</b>
            </div>
          ))}
          <div className="report-stamp">{t.report.stamp}</div>
        </div>
      )}
      {t.slate && (
        <div className="slate" key={t.slate}>
          {t.slate}
        </div>
      )}
      {(combat || t.trial?.title === 'TARGETS') && t.status === 'rolling' && <Crosshair />}
      {t.hint && <div className="hint">{t.hint}</div>}
    </div>
  );
}
