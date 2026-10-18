import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Backdrop } from '../../tlm/LakeProps';
import { Scarn } from '../actors/Scarn';
import { CastFigure } from '../actors/CastFigure';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { SetPiece } from '../../sets/SetPiece';
import { SETS } from '../../sets';
import { MopTrial, ObstacleTrial, ReflexTrial, StickTrial, TargetTrial, type TrialProps } from '../minigames/Training';
import { sim } from '../systems/sim';
import { makeScript, run, useInteractable, useSceneScript, type Script } from '../systems/script';
import { preloadLines } from '../systems/dialogue';
import { take, addStyle } from '../../state/take';
import { CH03 as L } from '@shared/data/script/ch03';
import type { Line } from '@shared/data/script/lines';
import { music } from '@shared/audio/music';
import { sfx } from '@shared/audio/sfx';

type Vec3 = [number, number, number];
type Phase = 'drive' | 'lake';

/** Cherokee Jack's spot, in front of the van. */
const JACK: Vec3 = [7.4, 0, -2.4];
/** Over Scarn's shoulder, at Jack. */
const TALK = { pos: [5.0, 1.75, -0.5] as Vec3, look: [7.4, 1.5, -2.4] as Vec3 };
/** Where Scarn stands to talk to Jack. */
const TALK_SPOT: Vec3 = [6.0, 0.85, -1.4];

/** Where the training happens on the tarp. */
const RINK: Vec3 = [0, 0, 1];

interface TrialDef {
  name: string;
  pre: Line;
  post: Line;
  start: Vec3;
  yaw: number;
  armed?: boolean;
  view: (p: TrialProps) => ReactElement;
}

const TRIALS: TrialDef[] = [
  { name: 'The Mop', pre: L.pre1, post: L.post1, start: [RINK[0] - 4, 0.85, RINK[2]], yaw: -Math.PI / 2, view: (p) => <MopTrial {...p} center={RINK} /> },
  { name: 'The Stick', pre: L.pre2, post: L.post2, start: [RINK[0] - 7.6, 0.85, RINK[2]], yaw: -Math.PI / 2, view: (p) => <StickTrial {...p} center={RINK} /> },
  { name: 'The Target', pre: L.pre3, post: L.post3, start: [RINK[0] - 2, 0.85, RINK[2]], yaw: -Math.PI / 2, armed: true, view: (p) => <TargetTrial {...p} center={RINK} /> },
  { name: 'The Obstacles', pre: L.pre4, post: L.post4, start: [RINK[0] - 7.5, 0.85, RINK[2]], yaw: -Math.PI / 2, view: (p) => <ObstacleTrial {...p} center={RINK} /> },
  { name: 'The Reflexes', pre: L.pre5, post: L.post5, start: [RINK[0] - 1, 0.85, RINK[2]], yaw: -Math.PI / 2, view: (p) => <ReflexTrial {...p} center={RINK} /> },
];

/** Ch3: the drive (three establishing shots, one backdrop), Cherokee Jack's van, five trials. */
export function CherokeeJack() {
  const [phase, setPhase] = useState<Phase>('drive');

  useEffect(() => {
    preloadLines(Object.values(L));
    music.play('montage', { fade: 0.8 });
    return () => take.set({ trial: null, slate: null, report: null });
  }, []);

  return (
    <>
      <ThirdPersonCamera />
      <color attach="background" args={['#0d0b0a']} />
      {phase === 'drive' ? <Drive onArrive={() => setPhase('lake')} /> : <Lake />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// The drive: Scarn and Samuel in a cardboard car, three captions, the same painted backdrop

function Drive({ onArrive }: { onArrive: () => void }) {
  const scroll = useRef<Group>(null);
  useFrame((_, dt) => {
    if (scroll.current) scroll.current.position.x = ((scroll.current.position.x - dt * 1.8 + 12) % 24) - 12;
  });
  useSceneScript(() => {
    run(async () => {
      const s = makeScript();
      s.busy(true, { pos: [3.2, 1.5, 3.6], look: [0, 1.0, 0.4] });
      take.set({ slate: 'Scranton.' });
      await s.say(L.d1, L.d2);
      take.set({ slate: 'The mountains.' });
      sfx('whoosh');
      await s.say(L.d3, L.d4);
      take.set({ slate: 'The actual mountains.' });
      sfx('whoosh');
      await s.say(L.d5);
      await s.wait(900);
      take.set({ slate: null, blackout: true });
      await s.wait(600);
      onArrive();
    });
  });
  return (
    <>
      <hemisphereLight args={['#fff6e0', '#3a3530', 0.8]} />
      <directionalLight position={[3, 6, 5]} intensity={1.3} />
      {/* The drive is runek world data (src/sets/drive.world.json); only the backdrop moves. */}
      <SetPiece data={SETS.drive} />
      {/* The backdrop slides past the car. It is the same backdrop for every location. */}
      <group ref={scroll}>
        <Backdrop position={[0, 0, -3]} width={48} height={6} seed={3} />
      </group>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// The lake: a white tarp, a painted backdrop with a seam, a desk fan, and a van

function Lake() {
  const [stage, setStage] = useState<'find' | 'talk' | 'train' | 'done'>('find');
  const [trial, setTrial] = useState(-1);
  const resolveTrial = useRef<((n: number) => void) | null>(null);
  const [armed, setArmed] = useState(false);

  // A new set: its shaders (every material now shadowed, the drive has no shadow light) compile
  // behind the loading card before the first frame draws it.
  useLayoutEffect(() => take.set({ location: 'lake' }), []);
  useEffect(() => {
    sim.busy = false;
    sim.shot = null;
    take.set({ blackout: false, objective: 'Find Cherokee Jack. He lives in a van. Down by the lake.', hint: 'You are on ice now: you glide. E: knock / talk' });
  }, []);
  // The ice hint shows for 8 s of play: frames, so the lake's loading card doesn't use it up (the
  // first frame after the card has a long delta, hence the cap).
  const hintLeft = useRef(8);
  useFrame((_, dt) => {
    if (hintLeft.current > 0 && (hintLeft.current -= Math.min(dt, 0.1)) <= 0) take.set({ hint: null });
  });

  const playTrial = (i: number) =>
    new Promise<number>((resolve) => {
      resolveTrial.current = resolve;
      setTrial(i);
    });

  const meet = () =>
    run(async () => {
      const s = makeScript();
      setStage('talk');
      take.set({ objective: null });
      sim.player.body?.setTranslation({ x: TALK_SPOT[0], y: TALK_SPOT[1], z: TALK_SPOT[2] }, true);
      sim.cam.yaw = Math.atan2(-(JACK[0] - TALK_SPOT[0]), -(JACK[2] - TALK_SPOT[2]));
      s.busy(true, TALK);
      await s.say(L.door, L.j1, L.m1, L.j2, L.j3, L.m2, L.j4);
      const asks: [string, Line, Line][] = [
        ['"Is that a Zamboni in your cabin?"', L.q1, L.a1],
        ['"Are you the real Cherokee Jack?"', L.q2, L.a2],
        ['"What is your fee?"', L.q3, L.a3],
      ];
      for (;;) {
        const n = await s.choose([...asks.map((a) => a[0]), '"Teach me hockey."']);
        if (n >= asks.length) break;
        const [, q, a] = asks.splice(n, 1)[0];
        await s.say(q, a);
        addStyle('CURIOUS', 15);
        if (!asks.length) break;
      }
      await s.say(L.j5);
      setStage('train');
      await training(s);
    });

  const training = async (s: Script) => {
    const scores: number[] = [];
    for (let i = 0; i < TRIALS.length; i++) {
      const t = TRIALS[i];
      // Montage cut: fade, put Scarn on his mark, Jack sets it up, then play.
      take.set({ blackout: true });
      await s.wait(450);
      s.busy(true);
      setArmed(!!t.armed);
      sim.player.body?.setTranslation({ x: t.start[0], y: t.start[1], z: t.start[2] }, true);
      sim.cam.yaw = t.yaw;
      sim.cam.pitch = 0.18;
      take.set({ blackout: false, slate: `Trial ${i + 1}: ${t.name}` });
      await s.say(t.pre);
      take.set({ slate: null });
      s.busy(false);
      const score = await playTrial(i);
      scores.push(score);
      setTrial(-1);
      s.busy(true);
      addStyle(t.name.toUpperCase(), Math.round(score / 2));
      await s.say(t.post);
    }
    setArmed(false);
    // The report card: Scarn declares himself elite whatever it says.
    take.set({
      report: {
        title: "CHEROKEE JACK'S REPORT CARD",
        rows: TRIALS.map((t, i) => [t.name, scores[i]] as [string, number]),
        stamp: 'ELITE',
      },
    });
    sfx('stamp');
    take.set({ blackout: true });
    await s.wait(400);
    sim.player.body?.setTranslation({ x: TALK_SPOT[0], y: TALK_SPOT[1], z: TALK_SPOT[2] }, true);
    sim.cam.yaw = Math.atan2(-(JACK[0] - TALK_SPOT[0]), -(JACK[2] - TALK_SPOT[2]));
    s.busy(true, TALK);
    take.set({ blackout: false });
    await s.say(L.m3, L.j6, L.m4);
    take.set({ report: null });
    await s.say(L.j7, L.m5, L.j8);
    setStage('done');
    take.set({ status: 'wrapped', endedAt: performance.now() });
  };

  useInteractable('van', [6.6, 0, -1.6], 'Knock on the van', meet, { enabled: stage === 'find', radius: 1.6 });

  const T = trial >= 0 ? TRIALS[trial] : null;
  return (
    <>
      <hemisphereLight args={['#eef6ff', '#5a6470', 0.9]} />
      <directionalLight position={[4, 12, 8]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0004} />
      {/* The lake (a tarp, a painted backdrop, a desk fan, a van, the crew) is runek world data:
          src/sets/lake.world.json. Jack steps off his mark for two of the trials. */}
      <SetPiece data={SETS.lake} />
      <group position={JACK} rotation={[0, -2.2, 0]}>
        {trial !== 2 && trial !== 4 && <CastFigure who="jack" />}
      </group>

      {T && <T.view key={trial} onDone={(n) => resolveTrial.current?.(n)} />}
      <Scarn start={[-9, 0.85, 3]} armed={armed} movement="skate" yaw={-0.9} />
    </>
  );
}
