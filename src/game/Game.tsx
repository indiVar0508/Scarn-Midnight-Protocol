import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage } from './Stage';
import { SCENES } from './scenes/registry.data';
import { SCENE_VIEWS } from './scenes/index';
import { resetSim, sim } from './systems/sim';
import { fx } from './systems/Effects';
import { captions, resetDialogue, skipLine } from './systems/dialogue';
import { coin, CoinUI, resetCoin } from './minigames/CoinFlip';
import { input } from './systems/input';
import { take, initialTake } from '../state/take';
import { recordTake } from '../state/save';
import { Hud, useTake } from '../ui/Hud';
import { Captions } from '../ui/Captions';
import { Prompt } from '../ui/Prompt';
import { Choices } from '../ui/Choices';
import { TakeCards, type TakeResult } from '../ui/TakeCards';
import { SceneWrap } from '../ui/SceneWrap';
import { music } from '@shared/audio/music';
import { sfx } from '@shared/audio/sfx';

/** One playable scene with the take loop around it: play → CUT/review → instant retake. */
export default function Game({ sceneIndex, onQuit: quitTo, onNext: nextTo }: { sceneIndex: number; onQuit: () => void; onNext: (index: number) => void }) {
  // Leaving the scene (title, next scene) explicitly stops its script and lines.
  const onQuit = useCallback(() => {
    resetDialogue();
    resetCoin();
    sim.busy = false;
    sim.shot = null;
    quitTo();
  }, [quitTo]);
  const onNext = useCallback(
    (i: number) => {
      resetDialogue();
      resetCoin();
      nextTo(i);
    },
    [nextTo],
  );
  const scene = SCENES[sceneIndex];
  const SCENE_ID = scene.id;
  const view = SCENE_VIEWS[scene.id];
  const [takeNo, setTakeNo] = useState(() => {
    resetSim();
    fx.clear();
    take.set(initialTake(1));
    return 1;
  });
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const resumeRef = useRef(() => {});
  const [result, setResult] = useState<TakeResult | null>(null);
  /** PRINT IT on the review moves on to the scene's ending (title slam, newspapers, end card). */
  const [wrapping, setWrapping] = useState(false);

  // Record exactly once, on the rolling → wrapped transition.
  useEffect(() => {
    let prev = take.get().status;
    return take.subscribe(() => {
      const t = take.get();
      if (prev === 'rolling' && t.status === 'wrapped') {
        sim.busy = false;
        sim.shot = null;
        setResult(recordTake(scene.id, { notes: t.notes, style: t.style, timeMs: t.endedAt - t.startedAt }));
        music.play('spy', { fade: 0.8 });
        sfx('stamp');
      }
      if (prev === 'rolling' && t.status === 'cut') sfx('slam');
      prev = t.status;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    music.play(scene.music, { fade: 0.6 });
    // QA hook for scripted Playwright runs (as v1's window.__TLM__).
    (window as unknown as { __TLM2__: unknown }).__TLM2__ = { take, sim, captions };
  }, []);

  const retake = useCallback(() => {
    resetDialogue();
    resetCoin();
    resetSim();
    fx.clear();
    input.clear();
    setResult(null);
    setPaused(false);
    setWrapping(false);
    // Store first, outside any setState updater: updaters run during render.
    const next = take.get().takeNo + 1;
    take.set(initialTake(next));
    setTakeNo(next);
    sfx('slam');
    music.play(scene.music, { fade: 0.3 });
  }, [scene.music]);

  // Esc pauses mid-take; R is an instant retake at any time (the core loop must be frictionless).
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (take.get().status !== 'rolling') return;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        // Esc also releases pointer lock (which pauses), so never toggle on it blindly.
        if (pausedRef.current) resumeRef.current();
        else setPaused(true);
      } else if (e.code === 'KeyR' && !e.repeat) retake();
      // Skip the current line during scripted moments (E is the coin's charge key while flipping).
      else if (!pausedRef.current && (e.code === 'Enter' || (e.code === 'KeyE' && sim.busy && coin.get().phase === 'idle'))) {
        // Claim it: if this skip ends the scene, the same Enter must not "click" the review card.
        e.preventDefault();
        skipLine();
      }
    };
    const click = () => {
      if (!pausedRef.current && sim.busy && coin.get().phase === 'idle' && take.get().status === 'rolling') skipLine();
    };
    window.addEventListener('mousedown', click);
    const hide = () => document.hidden && take.get().status === 'rolling' && setPaused(true);
    window.addEventListener('keydown', k);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('keydown', k);
      window.removeEventListener('mousedown', click);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [retake]);

  useEffect(() => {
    input.enabled = !paused;
    if (paused) input.unlock();
  }, [paused]);

  // Third-person mouse look uses pointer lock. The browser releases it on Esc, so losing it
  // mid-take means "pause"; cards and menus release it so the cursor is usable.
  useEffect(() => {
    let wasLocked = false;
    const change = () => {
      const locked = !!document.pointerLockElement;
      // A dialogue choice releases the mouse on purpose; that isn't a pause.
      if (wasLocked && !locked && take.get().status === 'rolling' && !captionsChoiceOpen()) setPaused(true);
      wasLocked = locked;
    };
    document.addEventListener('pointerlockchange', change);
    const unsub = take.subscribe(() => {
      if (take.get().status !== 'rolling') input.unlock();
    });
    return () => {
      document.removeEventListener('pointerlockchange', change);
      unsub();
      input.unlock();
      // No resetDialogue() here: React may run this cleanup while the scene is still alive
      // (hiding and reconnecting the subtree), and that cancelled the scene's script mid-line.
      // Leaving the scene goes through `leave()` instead.
    };
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
    input.lock();
  }, []);
  resumeRef.current = resume;

  const printOrQuit = useCallback(() => {
    if (take.get().status === 'wrapped') {
      resetDialogue();
      input.unlock();
      setWrapping(true);
    } else onQuit();
  }, [onQuit]);

  if (wrapping) {
    return <SceneWrap index={sceneIndex} onRetake={retake} onTitle={onQuit} onNext={onNext} />;
  }

  return (
    <div className="game">
      <Stage takeKey={takeNo} paused={paused} palette={view.palette}>
        <view.view key={takeNo} />
      </Stage>
      <Hud notes={scene.notes} combat={scene.combat} />
      <Prompt />
      <CoinUI />
      <Captions />
      <Choices />
      <Blackout />
      <TakeCards sceneId={SCENE_ID} title={`SCENE ${scene.num} · ${scene.title.toUpperCase()}`} notes={scene.notes} parSeconds={scene.par} result={result} onRetake={retake} onQuit={printOrQuit} />
      {paused && (
        <div className="card-layer">
          <div className="pause">
            <h2>PAUSED</h2>
            <p className="director">"Hold on. Hold on. I need a minute. Artistically."</p>
            <button className="btn primary" onClick={resume}>
              RESUME <kbd>Esc</kbd>
            </button>
            <button className="btn" onClick={retake}>
              RETAKE <kbd>R</kbd>
            </button>
            <button className="btn" onClick={onQuit}>
              QUIT TO TITLE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function captionsChoiceOpen(): boolean {
  return document.querySelector('.choices') !== null;
}

function Blackout() {
  const t = useTake();
  return <div className={`blackout ${t.blackout ? 'on' : ''}`} />;
}
