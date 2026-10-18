import { useMemo, useRef, useState } from 'react';
import { PaperShelf } from '../../tlm/PaperShelf';
import { ReamPyramid } from '../../tlm/ReamPyramid';
import { Scarn } from '../actors/Scarn';
import { Goon } from '../actors/Goon';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { SetPiece } from '../../sets/SetPiece';
import { useFxTier } from '../systems/tier';
import { useEnvironmentIntensity } from '../systems/SceneEnvironment';
import { SETS } from '../../sets';
import { sim } from '../systems/sim';
import { take, addStyle, completeNote } from '../../state/take';
import { sfx } from '@shared/audio/sfx';
import { CH01 as L } from '@shared/data/script/ch01';
import { say, barkOne, preloadLines } from '../systems/dialogue';
import { makeScript, run, useSceneScript } from '../systems/script';

type Vec3 = [number, number, number];

const WAVES: { start: Vec3; hp: number; delay: number }[][] = [
  [
    { start: [-5, 0.85, -4], hp: 2, delay: 0.4 },
    { start: [-3, 0.85, 3.5], hp: 2, delay: 0.9 },
    { start: [-1, 0.85, -0.5], hp: 2, delay: 1.4 },
  ],
  [
    { start: [5, 0.85, -4.5], hp: 2, delay: 0.3 },
    { start: [8, 0.85, 4], hp: 3, delay: 0.8 },
    { start: [11, 0.85, -1], hp: 2, delay: 1.2 },
    { start: [12.5, 0.85, 3], hp: 3, delay: 1.8 },
  ],
];

const SHELF_ROW_X = [-15.5, -13.2, -10.9, -8.6, -6.3, -4, -1.7, 3.4, 5.7, 8, 10.3, 12.6];

/** Ch1 Take 1: the aisle five shoot-out, shot in the Dunder Mifflin warehouse dressed as a supermarket. */
export function AisleFive() {
  const [wave, setWave] = useState(0);
  const down = useRef(0);

  useSceneScript(() => {
    sim.cam.yaw = -Math.PI / 2; // look down the aisle (+X)
    take.set({
      goonsTotal: WAVES.reduce((n, w) => n + w.length, 0),
      objective: 'Clean up aisle five',
      hint: 'Click to aim with the mouse · WASD move · click shoot · SPACE roll · F pose',
    });
    // Lines play over gameplay: the player is never waiting on dialogue to move. The script
    // is cancelled by a retake, so a pending taunt can't leak into the next take.
    preloadLines(Object.values(L));
    run(async () => {
      const s = makeScript();
      void s.say(L.open2);
      await s.wait(2600);
      await s.say(L.goon1, L.scarn1);
      await s.wait(4000);
      take.set({ hint: null });
    });
  });

  const onDown = (how: 'shot' | 'impact') => {
    if (how === 'impact') completeNote('setpiece', 'Flatten a goon with a set piece');
    down.current += 1;
    barkOne([L.bark1, L.bark4, L.bark2, L.bark3]);
    const cleared = WAVES.slice(0, wave + 1).reduce((n, w) => n + w.length, 0);
    if (down.current < cleared) return;
    if (wave + 1 < WAVES.length) {
      window.setTimeout(() => {
        sfx('whoosh');
        take.set({ objective: 'Reinforcements! (from the warehouse)' });
        setWave((w) => w + 1);
        void say(L.more, L.scarn3);
      }, 1200);
    } else {
      window.setTimeout(() => {
        if (take.get().status !== 'rolling') return;
        take.set({ status: 'wrapped', endedAt: performance.now(), objective: null });
        // The punchline plays over the review card: the PA steals Scarn's line.
        void say(L.scarn5, L.scarn6, L.scarn7);
      }, 1500);
    }
  };

  const shelves = useMemo(
    () =>
      SHELF_ROW_X.map((x, i) => ({ key: `back-${i}`, position: [x, 0, -7.2] as Vec3, rotation: [0, 0, 0] as Vec3, seed: 100 + i })).concat(
        // Gondola islands: two units back to back, the ones you can actually topple into people.
        [-9, -2.5, 6, 11].flatMap((x, i) => [
          { key: `isl-a-${i}`, position: [x, 0, -2.0] as Vec3, rotation: [0, 0, 0] as Vec3, seed: 200 + i },
          { key: `isl-b-${i}`, position: [x, 0, -2.6] as Vec3, rotation: [0, Math.PI, 0] as Vec3, seed: 300 + i },
        ]),
      ),
    [],
  );

  return (
    <>
      <ThirdPersonCamera />
      <Lights />
      <color attach="background" args={['#15130f']} />
      <fog attach="fog" args={['#2b2823', 24, 70]} />

      {/* The set (Dunder Mifflin's warehouse playing a supermarket, and the bullpen behind the
          camera) is runek world data: src/sets/aisle-five.world.json. */}
      <SetPiece data={SETS.aisleFive} />

      {/* The breakable set: shelves to topple into goons and the FOOD pyramid. */}
      {shelves.map((s) => (
        <PaperShelf key={s.key} position={s.position} rotation={s.rotation} seed={s.seed} onTopple={() => addStyle('SET DESTRUCTION', 120)} />
      ))}
      <ReamPyramid position={[1, 0, 2.8]} seed={5} base={6} rows={1} onCollapse={() => completeNote('pyramid', 'Knock over the FOOD pyramid')} />

      <Scarn start={[-15, 0.85, 3]} />
      {WAVES.slice(0, wave + 1).map((w, wi) =>
        w.map((g, gi) => <Goon key={`${wi}-${gi}`} start={g.start} hp={g.hp} delay={g.delay} seed={wi * 31 + gi * 7 + 1} onDown={onDown} />),
      )}
    </>
  );
}

/**
 * Warehouse light: a soft key from the skylights (the only shadow caster), cool sky fill, and a
 * warm pool over the bullpen behind the camera. The fluorescent rows are HDR emitters (bloom)
 * with faked floor pools, not lights: a point light per fixture made every lit shader several
 * times bigger.
 */
function Lights() {
  // Racking, carts, ducts and joists are metal: they need the room to reflect.
  useEnvironmentIntensity(0.28);
  // Without the environment map (low and off tiers) the sky fills in for it.
  const tier = useFxTier();
  const plain = tier === 'low' || tier === 'off';
  return (
    <>
      <hemisphereLight args={['#e9efff', '#4a443c', plain ? 0.75 : 0.5]} />
      <directionalLight
        position={[4, 16, 6]}
        intensity={1.25}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <pointLight position={[0, 2.9, 12.5]} intensity={18} distance={16} color="#fff4dc" />
    </>
  );
}
