import { useEffect } from 'react';
import { useTake } from './Hud';
import { sceneRecord } from '../state/save';
import { rng, pick } from '@runek/core';

/** Keys are ignored this long after a card appears, so mashing Enter through dialogue can't
 *  skip straight past the review. */
export const CARD_KEY_GUARD_MS = 700;

/** Michael never gives less than an A (v1 Mission Report joke). The stars carry the signal. */
const GRADES = ['A', 'A+', 'A++', 'A. Oscar-worthy.'];

// Original lines, in Michael's voice.
const REVIEWS = [
  ['That was perfect. Do it again, but perfecter.', 'Good. Good. Now do it like you mean it. Like Bruce Willis means it.', 'I believed it. My mom would believe it. Do one more for my mom.'],
  ['Now THAT is cinema. Lowercase c. Getting there.', 'Chills. Actual chills. Possibly the AC. Again!', 'You are making this look easy, which is my job. One more.'],
  ['Print it. Actually, one more for safety. Safety take!', 'If this movie had a trailer, that would be in it. It will have a trailer.', 'Somewhere, Sundance just felt something.'],
  ['Print it. Frame it. Send it to Sundance. Then to my mom.', 'That is a wrap! Except we are rolling again, because it is a montage.', 'I have no notes. I have one note: bravo. That is the note.'],
];

export interface TakeResult {
  newNotes: string[];
  bestStyle: boolean;
  bestTime: boolean;
}

interface CardProps {
  sceneId: string;
  /** "SCENE 1 · CLEANUP ON AISLE FIVE" */
  title: string;
  notes: readonly { id: string; label: string }[];
  parSeconds: number;
  result: TakeResult | null;
  onRetake: () => void;
  onQuit: () => void;
}

export function TakeCards({ sceneId, title, notes, parSeconds, result, onRetake, onQuit }: CardProps) {
  const t = useTake();

  useEffect(() => {
    if (t.status === 'rolling') return;
    const shownAt = performance.now();
    // R always retakes. On the review, Enter/Space/Esc continue (PRINT IT); on the CUT card
    // there's nothing to print, so Enter/Space retake and Esc leaves.
    const k = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (performance.now() - shownAt < CARD_KEY_GUARD_MS) {
        e.preventDefault();
        return;
      }
      const cut = t.status === 'cut';
      if (e.code === 'KeyR' || (cut && (e.code === 'Enter' || e.code === 'Space'))) {
        e.preventDefault();
        onRetake();
      } else if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onQuit();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [t.status, onRetake, onQuit]);

  if (t.status === 'cut') {
    return (
      <div className="card-layer">
        <div className="clapper">
          <div className="clapper-top" />
          <h1>CUT!</h1>
          <p className="director">"No, no, no. Scarn doesn't die in the first act. That's the third act."</p>
          <button className="btn primary" onClick={onRetake}>
            TAKE {t.takeNo + 1} <kbd>R</kbd>
          </button>
          <button className="btn" onClick={onQuit}>
            QUIT <kbd>Esc</kbd>
          </button>
        </div>
      </div>
    );
  }
  if (t.status === 'wrapped' && result) return <Review sceneId={sceneId} title={title} notes={notes} parSeconds={parSeconds} result={result} onRetake={onRetake} onQuit={onQuit} />;
  return null;
}

function Review({ sceneId, title, notes, parSeconds, result, onRetake, onQuit }: CardProps & { result: TakeResult }) {
  const t = useTake();
  const timeMs = t.endedAt - t.startedAt;
  const accuracy = t.shots ? Math.round((t.hits / t.shots) * 100) : 0;
  const underPar = timeMs / 1000 <= parSeconds;

  const rec = sceneRecord(sceneId);
  const stars = rec.notes.length;
  const line = pick(rng(t.takeNo * 977 + t.style), REVIEWS[Math.min(t.notes.length, 3)]);

  return (
    <div className="card-layer">
      <div className="review">
        <div className="review-head">
          <span>
            {title} · TAKE {t.takeNo}
          </span>
          <span className="stamp">{GRADES[Math.min(t.notes.length, 3)]}</span>
        </div>
        <p className="director">"{line}"</p>
        <div className="stats">
          <div>
            <b>{(timeMs / 1000).toFixed(1)}s</b> time {underPar ? <em>under par</em> : <span>par {parSeconds}s</span>}
            {result.bestTime && <em> · best!</em>}
          </div>
          <div>
            <b>{t.style}</b> style {result.bestStyle && <em>· best!</em>}
          </div>
          {t.shots > 0 && (
            <div>
              <b>{accuracy}%</b> accuracy
            </div>
          )}
        </div>
        <ul className="notes big">
          {notes.map((n) => {
            const now = t.notes.includes(n.id);
            const ever = rec.notes.includes(n.id);
            return (
              <li key={n.id} className={ever ? 'done' : ''}>
                {ever ? '★' : '☆'} {n.label}
                {now && result.newNotes.includes(n.id) && <em> NEW</em>}
              </li>
            );
          })}
        </ul>
        <div className="stars">
          {'★'.repeat(stars)}
          {'☆'.repeat(notes.length - stars)}
        </div>
        <div className="buttons">
          <button className="btn primary" onClick={onQuit}>
            PRINT IT <kbd>Enter</kbd>
          </button>
          <button className="btn" onClick={onRetake}>
            ONE MORE TAKE <kbd>R</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
