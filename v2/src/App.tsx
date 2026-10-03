import { lazy, Suspense, useEffect, useState } from 'react';
import { audio } from '@v1/audio/engine';
import { music } from '@v1/audio/music';
import { sfx } from '@v1/audio/sfx';
import { sceneRecord } from './state/save';
import { SCENES } from './game/scenes/registry.data';

// three + r3f + rapier (WASM) load behind the title screen (TECH §5), prefetched once
// the title has painted so pressing Play is near-instant.
const loadGame = () => import('./game/Game');
const Game = lazy(loadGame);
const Lineup = lazy(() => import('./game/Lineup'));
const lineup = new URLSearchParams(location.search).get('lineup');
const VoiceAudition = lazy(() => import('./ui/VoiceAudition'));
const voices = new URLSearchParams(location.search).has('voices');

export default function App() {
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  const [sceneIndex, setSceneIndex] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => void loadGame(), 600);
    return () => window.clearTimeout(id);
  }, []);

  const play = (i: number) => {
    audio.resume();
    sfx('ui_select');
    setSceneIndex(i);
    setScreen('game');
  };

  if (voices) {
    return (
      <Suspense fallback={<Loading />}>
        <VoiceAudition />
      </Suspense>
    );
  }
  if (lineup !== null) {
    return (
      <Suspense fallback={<Loading />}>
        <Lineup only={lineup || undefined} />
      </Suspense>
    );
  }
  if (screen === 'game') {
    return (
      <Suspense fallback={<Loading />}>
        <Game
          key={sceneIndex}
          sceneIndex={sceneIndex}
          onQuit={() => {
            music.play('spy', { fade: 0.8 });
            setScreen('title');
          }}
          onNext={(i) => setSceneIndex(i)}
        />
      </Suspense>
    );
  }
  return <Title onPlay={play} />;
}

const unlockAll = new URLSearchParams(location.search).get('unlock') === 'all';

/** A scene is open once the one before it has been wrapped at least once. */
function unlocked(i: number): boolean {
  return unlockAll || i === 0 || sceneRecord(SCENES[i - 1].id).takes > 0;
}

function Title({ onPlay }: { onPlay: (i: number) => void }) {
  // Continue = the furthest open scene.
  let cont = 0;
  SCENES.forEach((_, i) => unlocked(i) && (cont = i));
  return (
    <div className="title">
      <div className="title-inner">
        <p className="kicker">A Michael Scott Production</p>
        <h1>
          THREAT LEVEL <span>MIDNIGHT</span>
        </h1>
        <p className="sub">THE DIRECTOR'S CUT</p>
        <button className="btn primary big" onClick={() => onPlay(cont)} autoFocus>
          ▶ {cont === 0 && sceneRecord(SCENES[0].id).takes === 0 ? 'PLAY' : 'CONTINUE'}: SCENE {SCENES[cont].num}
        </button>
        <ol className="scene-list">
          {SCENES.map((sc, i) => {
            const rec = sceneRecord(sc.id);
            const open = unlocked(i);
            return (
              <li key={sc.id}>
                <button className="scene-row" disabled={!open} onClick={() => onPlay(i)}>
                  <span className="num">{sc.num}</span>
                  <span className="name">{open ? sc.title : '???'}</span>
                  <span className="stars">
                    {'★'.repeat(rec.notes.length)}
                    {'☆'.repeat(sc.notes.length - rec.notes.length)}
                  </span>
                </button>
                {!open && <span className="locked">Wrap scene {SCENES[i - 1].num} to unlock</span>}
              </li>
            );
          })}
        </ol>
        <p className="controls">Click to capture the mouse · WASD move · mouse look · click shoot · E use · SPACE roll · F pose · R retake · Esc pause</p>
        <p className="disclaimer">
          Unofficial, non-commercial fan project. <i>The Office</i> and <i>Threat Level Midnight</i> belong to their rights holders. All art, music,
          sound and dialogue here are original.
        </p>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="title">
      <div className="title-inner">
        <p className="kicker">Loading the set…</p>
        <p className="sub">"Places, everyone. Places. Where is my hair gel?"</p>
      </div>
    </div>
  );
}
