import { useEffect, useRef, useSyncExternalStore } from 'react';
import { tape, record, playTape, stopTape, toggleReverse, setSpeed, answer, isDecoded, SECRET, TAPE_OPTIONS, TARGET_SPEED } from '../state/tape';
import { useUI } from './hooks';

/** Waveform: the letters of the message are hidden inside the wave. */
function Wave() {
  const s = useSyncExternalStore(tape.subscribe, tape.get);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const W = (c.width = c.clientWidth * 2);
    const H = (c.height = c.clientHeight * 2);
    const g = c.getContext('2d')!;
    g.fillStyle = '#07120c';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(80,255,150,0.12)';
    g.lineWidth = 1;
    for (let x = 0; x < W; x += W / 24) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H);
      g.stroke();
    }
    if (!s.recorded) {
      g.fillStyle = 'rgba(120,255,170,0.5)';
      g.font = `${H * 0.14}px "VT323", monospace`;
      g.textAlign = 'center';
      g.fillText('— NO SIGNAL —', W / 2, H / 2);
      return;
    }
    // pseudo-random speech envelope
    g.strokeStyle = '#4dff9a';
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x < W; x += 2) {
      const t = x / W;
      const env = Math.abs(Math.sin(t * 29) * Math.sin(t * 7.3 + 1) + Math.sin(t * 61) * 0.3);
      const a = env * H * 0.36 * (0.6 + 0.4 * Math.sin(x * 0.9));
      g.moveTo(x, H / 2 - a);
      g.lineTo(x, H / 2 + a);
    }
    g.stroke();
    // hidden letters
    const decoded = isDecoded(s);
    const off = Math.abs(s.speed - TARGET_SPEED);
    g.save();
    g.translate(W / 2, H / 2);
    const stretch = s.reversed ? TARGET_SPEED / s.speed : 1;
    g.scale((s.reversed ? 1 : -1) * stretch, 1);
    if (!decoded) g.transform(1, 0, s.reversed ? off * 1.2 : 0.4, 1, 0, 0);
    g.font = `bold ${H * 0.2}px "Bebas Neue", Impact, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = decoded ? '#ffffff' : `rgba(200,255,220,${s.reversed ? 0.55 - Math.min(0.35, off) : 0.4})`;
    g.shadowColor = decoded ? '#4dff9a' : 'transparent';
    g.shadowBlur = decoded ? 18 : 0;
    g.fillText(SECRET, 0, 0);
    g.restore();
    // playhead
    if (s.playing) {
      g.fillStyle = '#ffcf3a';
      g.fillRect(s.playhead * W - 2, 0, 4, H);
    }
  }, [s]);
  return <canvas ref={ref} aria-label={isDecoded(s) ? `Waveform reads: ${SECRET}` : 'Waveform with unreadable letters'} role="img" />;
}

export function TapeDeck() {
  const s = useSyncExternalStore(tape.subscribe, tape.get);
  const paused = useUI((u) => u.paused);
  useEffect(() => {
    if (!s.open || paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') record();
      else if (e.code === 'Space') {
        e.preventDefault();
        if (s.playing) stopTape();
        else void playTape();
      } else if (e.code === 'KeyB' || e.code === 'KeyV') toggleReverse();
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') setSpeed(Math.min(2, s.speed + 0.05));
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') setSpeed(Math.max(0.5, s.speed - 0.05));
      else if (/^Digit[1-4]$/.test(e.code) && s.heard) answer(parseInt(e.code.slice(5), 10) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s, paused]);
  if (!s.open) return null;
  return (
    <div className="deck" role="dialog" aria-label="Tape deck">
      <h3>
        DICTAPHONE 3000 <span>{s.playing ? '▶ PLAY' : '■ STOP'} · {s.reversed ? '◀◀ REVERSE' : 'FORWARD'} · ×{s.speed.toFixed(2)}</span>
      </h3>
      <Wave />
      <div className="row">
        <button className={`key rec ${s.recorded ? 'on' : ''}`} onClick={record}>
          ● RECORD <small>(R)</small>
        </button>
        <button className={`key ${s.playing ? 'on' : ''}`} onClick={() => (s.playing ? stopTape() : void playTape())}>
          {s.playing ? '■ STOP' : '▶ PLAY'} <small>(SPACE)</small>
        </button>
        <button className={`key ${s.reversed ? 'on' : ''}`} onClick={toggleReverse}>
          ◀◀ REVERSE <small>(B)</small>
        </button>
        <label>
          TAPE SPEED
          <input type="range" min={0.5} max={2} step={0.05} value={s.speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} aria-label="Tape speed" />
          <span className="osd" style={{ fontSize: '2cqw' }}>
            ×{s.speed.toFixed(2)}
          </span>
        </label>
      </div>
      <div className="status" aria-live="polite">
        {s.status}
      </div>
      {s.heard && !s.answered && (
        <>
          <div style={{ marginTop: '0.6cqw', fontSize: '1.6cqw' }}>Where are the hostages? (1–4)</div>
          <div className="answer">
            {TAPE_OPTIONS.map((o, i) => (
              <button key={o} className="chip" onClick={() => answer(i)}>
                {i + 1}. {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
