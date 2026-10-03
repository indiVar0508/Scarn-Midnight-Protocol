import { useEffect, useRef, useState } from 'react';

interface Candidate {
  voice: string;
  speed: number;
  pitch?: number;
  eq?: string;
  file: string;
  ms: number;
}
interface Role {
  who: string;
  direction: string;
  line: string;
  candidates: Candidate[];
}

const KEY = 'tlm.v2.voicePicks';

function loadPicks(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * Voice-casting audition (`?voices`). Renders come from tools/voice/audition.py. Pick by ear,
 * then copy the picks back so the chosen settings go into src/data/cast.ts.
 */
export default function VoiceAudition() {
  const [roles, setRoles] = useState<Record<string, Role> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, number>>(loadPicks);
  const [playing, setPlaying] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/voice-audition/index.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then(setRoles)
      .catch(() => setError('No renders yet. Run tools/voice/audition.py first (see its header).'));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(picks));
    } catch {
      /* private mode */
    }
  }, [picks]);

  const play = (file: string) => {
    audio.current?.pause();
    const a = new Audio(file);
    audio.current = a;
    setPlaying(file);
    a.onended = () => setPlaying((p) => (p === file ? null : p));
    void a.play();
  };

  const summary = roles
    ? Object.fromEntries(
        Object.entries(picks)
          .filter(([who]) => roles[who])
          .map(([who, n]) => {
            const { voice, speed, pitch, eq } = roles[who].candidates[n];
            return [who, { option: String.fromCharCode(65 + n), voice, speed, pitch, eq }];
          }),
      )
    : {};

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(summary, null, 1));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the JSON is shown below to select by hand */
    }
  };

  return (
    <div className="audition">
      <h1>Voice audition</h1>
      <p className="lede">
        One signature line per character, several castings each. <b>A</b> is the current voice. All of them are stock Kokoro TTS voices, shaped toward each actor's register,
        pace and energy. None is cloned from a recording.
      </p>
      {error && <p className="err">{error}</p>}
      {roles &&
        Object.entries(roles).map(([id, r]) => (
          <section key={id}>
            <h2>{r.who}</h2>
            <p className="dir">{r.direction}</p>
            <blockquote>"{r.line}"</blockquote>
            <div className="opts">
              {r.candidates.map((c, n) => {
                const label = String.fromCharCode(65 + n);
                return (
                  <div key={c.file} className={`opt ${picks[id] === n ? 'picked' : ''}`}>
                    <button className={`btn ${playing === c.file ? 'primary' : ''}`} onClick={() => play(c.file)} title={`${c.voice} · speed ${c.speed} · pitch ${c.pitch ?? 0}`}>
                      ▶ {label}
                    </button>
                    <label>
                      <input type="radio" name={id} checked={picks[id] === n} onChange={() => setPicks((p) => ({ ...p, [id]: n }))} /> pick
                    </label>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      {roles && (
        <div className="summary">
          <button className="btn primary" onClick={copy} disabled={!Object.keys(summary).length}>
            {copied ? 'COPIED' : 'COPY MY PICKS'}
          </button>
          <pre>{JSON.stringify(summary, null, 1)}</pre>
        </div>
      )}
    </div>
  );
}
