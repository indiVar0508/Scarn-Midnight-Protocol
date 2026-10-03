import { useEffect, useMemo, useRef, useState } from 'react';
import { paintNewspaper, type Paper } from '@v1/game/art/newspaper';
import { CH01 as L } from '@v1/data/script/ch01';
import type { Line } from '@v1/data/script/lines';
import { sfx } from '@v1/audio/sfx';
import { music } from '@v1/audio/music';
import { say, resetDialogue } from '../game/systems/dialogue';
import { Captions } from './Captions';
import { CARD_KEY_GUARD_MS } from './TakeCards';
import { sceneRecord } from '../state/save';
import { COMING_NEXT, SCENES } from '../game/scenes/registry.data';

// Same headlines as v1 Ch1's history beat (original copy, Stanley narrates).
const PAPERS: [Paper, Line | null][] = [
  [{ headline: 'SCARN SAVES NFL ALL-STAR GAME', sub: "Quarterback asks: 'Who was that handsome man?'", photo: 'scarn', date: 'SUNDAY, FEBRUARY 2' }, L.n1],
  [{ headline: 'SCARN SAVES MBA ALL-STAR GAME', sub: 'Business students "mostly fine," networking resumes', photo: 'mba', date: 'TUESDAY, MARCH 11' }, L.n2],
  [{ headline: 'SCARN SAVES NBA ALL-STAR GAME', sub: 'Also finds a very large lost sneaker', photo: 'stadium', date: 'SATURDAY, APRIL 5' }, null],
  [{ headline: "SPY'S WIFE TAKEN BY GOLDENFACE", sub: 'Catherine Zeta-Scarn remembered as "perfect, a great dancer"', photo: 'catherine', date: 'FRIDAY, JUNE 13' }, L.n3],
  [{ headline: "SCARN RETIRES: 'I WILL SELL PAPER NOW'", sub: "World's best agent becomes a mild-mannered paper salesman", photo: 'paper', date: 'MONDAY, JULY 21' }, L.n4],
];

type Step = { kind: 'slam' } | { kind: 'paper'; i: number } | { kind: 'mission' } | { kind: 'end' };

/**
 * What PRINT IT leads to: the scene's ending as in v1 (Ch1: THREAT / LEVEL / MIDNIGHT slam and
 * Stanley's newspaper montage; Ch2: the mission card), then the end card that plays the next
 * scene. Enter/Space/click advances, Esc skips straight to the card.
 */
export function SceneWrap({ index, onRetake, onTitle, onNext }: { index: number; onRetake: () => void; onTitle: () => void; onNext: (index: number) => void }) {
  const scene = SCENES[index];
  const nextScene = SCENES[index + 1];
  const [step, setStep] = useState<Step>(scene.ending === 'titleSlam' ? { kind: 'slam' } : scene.ending === 'missionCard' ? { kind: 'mission' } : { kind: 'end' });
  const [words, setWords] = useState(0);
  const token = useRef(0);
  const papers = useMemo(() => PAPERS.map(([p], i) => paintNewspaper(p, i + 3).toDataURL('image/jpeg', 0.85)), []);

  const next = () => {
    token.current++;
    resetDialogue();
    setStep((s) => (s.kind === 'slam' ? { kind: 'paper', i: 0 } : s.kind === 'paper' && s.i + 1 < PAPERS.length ? { kind: 'paper', i: s.i + 1 } : { kind: 'end' }));
  };
  const skip = () => {
    token.current++;
    resetDialogue();
    setStep({ kind: 'end' });
  };

  // Drive each step: slam the three words, narrate each paper, then auto-advance.
  useEffect(() => {
    const my = ++token.current;
    const alive = () => token.current === my;
    const timers: number[] = [];
    if (step.kind === 'slam') {
      music.play('spy', { fade: 0.4 });
      [0, 1, 2].forEach((n) =>
        timers.push(
          window.setTimeout(() => {
            setWords(n + 1);
            sfx('slam');
          }, 250 + n * 650),
        ),
      );
      timers.push(window.setTimeout(() => alive() && next(), 3300));
    } else if (step.kind === 'mission') {
      music.play('spy', { fade: 0.4 });
      sfx('stamp');
      timers.push(window.setTimeout(() => alive() && next(), 4200));
    } else if (step.kind === 'paper') {
      sfx('whoosh');
      const line = PAPERS[step.i][1];
      if (line) void say(line).then(() => alive() && window.setTimeout(() => alive() && next(), 500));
      else timers.push(window.setTimeout(() => alive() && next(), 2600));
    } else {
      sfx('stamp');
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    const shownAt = performance.now();
    const k = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (step.kind === 'end' && performance.now() - shownAt < CARD_KEY_GUARD_MS) {
        e.preventDefault();
        return;
      }
      // Claim the key so the browser doesn't also "click" whatever is focused once the screen
      // changes underneath (Enter here was starting a new take from the title's Play button).
      if (['Enter', 'Space', 'Escape', 'KeyR'].includes(e.code)) e.preventDefault();
      if (step.kind === 'end') {
        if (e.code === 'KeyR') onRetake();
        else if (e.code === 'Enter' || e.code === 'Space') primary();
        else if (e.code === 'Escape') onTitle();
        return;
      }
      if (e.code === 'Escape') skip();
      else if (e.code === 'Enter' || e.code === 'Space') next();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, onRetake, onTitle, onNext]);

  useEffect(() => () => resetDialogue(), []);

  const rec = sceneRecord(scene.id);
  const notesTotal = scene.notes.length;
  const primary = () => (nextScene ? onNext(index + 1) : onTitle());
  return (
    <div className="wrap" onClick={() => step.kind !== 'end' && next()}>
      {step.kind === 'slam' && (
        <div className="slam">
          {['THREAT', 'LEVEL', 'MIDNIGHT'].slice(0, words).map((w) => (
            <div key={w} className={`slam-word ${w === 'MIDNIGHT' ? 'gold' : ''}`}>
              {w}
            </div>
          ))}
        </div>
      )}
      {step.kind === 'mission' && (
        <div className="mission-card">
          <div className="tab">TOP SECRET · EYES ONLY</div>
          <h2>MISSION:</h2>
          <h1>SAVE THE NHL ALL-STAR GAME</h1>
          <p>Hostages: the concession stand workers (incl. the nacho lady).</p>
          <p className="threat">
            THREAT LEVEL: <b>MIDNIGHT</b>
          </p>
        </div>
      )}
      {step.kind === 'paper' && <img key={step.i} className="paper" src={papers[step.i]} alt={PAPERS[step.i][0].headline} />}
      {step.kind === 'end' && (
        <div className="review end-card" onClick={(e) => e.stopPropagation()}>
          <div className="review-head">
            <span>
              END OF SCENE {scene.num} · {scene.title.toUpperCase()}
            </span>
            <span className="stamp">PRINTED</span>
          </div>
          <div className="stars">
            {'★'.repeat(rec.notes.length)}
            {'☆'.repeat(notesTotal - rec.notes.length)}
          </div>
          {nextScene ? (
            <p className="director">
              Next up: <b>Scene {nextScene.num} · {nextScene.title}</b>. {nextScene.teaser}
            </p>
          ) : (
            <p className="director">
              That's everything in the can so far. Next to shoot: <b>Scene {COMING_NEXT.num} · {COMING_NEXT.title}</b>. {COMING_NEXT.teaser}
            </p>
          )}
          <div className="buttons">
            <button className="btn primary" onClick={primary}>
              {nextScene ? `PLAY SCENE ${nextScene.num}` : 'BACK TO TITLE'} <kbd>Enter</kbd>
            </button>
            <button className="btn" onClick={onRetake}>
              RESHOOT <kbd>R</kbd>
            </button>
            {nextScene && (
              <button className="btn" onClick={onTitle}>
                TITLE <kbd>Esc</kbd>
              </button>
            )}
          </div>
        </div>
      )}
      {step.kind !== 'end' && <div className="wrap-skip">Enter / click: next · Esc: skip</div>}
      <Captions />
    </div>
  );
}
