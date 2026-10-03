import { useMemo, useRef, useState } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Wall } from '../../runek/Wall';
import { Counter } from '../../runek/Counter';
import { Crate } from '../../runek/Crate';
import { Chair } from '../../runek/Chair';
import { Door } from '../../runek/Door';
import { PaperShelf } from '../../tlm/PaperShelf';
import { ReamPyramid } from '../../tlm/ReamPyramid';
import { SetFloor } from '../../tlm/SetFloor';
import { Poster } from '../../tlm/Poster';
import { Baler, BoomMic, CameraTripod, CubicleWall, DirectorChair, Forklift, OfficeDesk } from '../../tlm/OfficeProps';
import { Scarn } from '../actors/Scarn';
import { Goon } from '../actors/Goon';
import { CastFigure } from '../actors/CastFigure';
import type { CastId } from '../actors/cast';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { G } from '../systems/groups';
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
/** Faces -X: toward a player walking down the aisle from the start mark. */
const FACE_START: Vec3 = [0, -Math.PI / 2, 0];
/** Faces the set from the crew side. */
const FACE_SET: Vec3 = [0, Math.PI, 0];
const CARDBOARD = '#c9a777';

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
      <color attach="background" args={['#100e0c']} />
      <fog attach="fog" args={['#100e0c', 30, 60]} />

      {/* ---------------- The set: Dunder Mifflin's warehouse, playing a supermarket ---------------- */}
      <SetFloor size={[38, 18]} position={[0, 0, 0]} marks={[[0, 8.2, 38, 0.12]]} />
      <Wall width={38} height={6} position={[0, 0, -8.6]} />
      <Wall width={18} height={6} position={[-19, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <Wall width={18} height={6} position={[19, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      {/* The fourth wall: tape on the floor and an invisible line actors don't cross. */}
      <RigidBody type="fixed" colliders={false} position={[0, 1.5, 8.35]}>
        <CuboidCollider args={[19, 1.5, 0.1]} collisionGroups={G.barrier} />
      </RigidBody>

      <WarehouseDressing />

      {shelves.map((s) => (
        <PaperShelf key={s.key} position={s.position} rotation={s.rotation} seed={s.seed} onTopple={() => addStyle('SET DESTRUCTION', 120)} />
      ))}
      <ReamPyramid position={[1, 0, 2.8]} seed={5} base={6} rows={1} onCollapse={() => completeNote('pyramid', 'Knock over the FOOD pyramid')} />
      <Poster position={[3.2, 1.3, 2.8]} rotation={FACE_START} size={[0.9, 0.7]} lines={[{ text: 'FOOD' }, { text: '2 for $5', size: 0.6 }]} font="marker" background={CARDBOARD} />

      {/* Checkout: the cashier who will steal Scarn's line. */}
      <Counter position={[15.5, 0, 1]} rotation={[0, Math.PI / 2, 0]} length={3} />
      <Mug position={[15.4, 1.0, 2.0]} text="WORLD'S BEST BOSS" />
      <group position={[16.8, 0, 1]} rotation={[0, -Math.PI / 2, 0]}>
        <CastFigure who="cashier" />
      </group>
      <Poster position={[14.2, 3.0, 1]} rotation={FACE_START} size={[2.6, 0.75]} lines={[{ text: 'CHECKOUT' }, { text: '10 ITEMS OR LESS  (fewer. — Oscar)', size: 0.5, font: 'marker', color: '#a33' }]} />

      {/* ---------------- Behind the camera: the Dunder Mifflin office, mid-shoot ---------------- */}
      <CrewSide />

      <Scarn start={[-15, 0.85, 3]} />
      {WAVES.slice(0, wave + 1).map((w, wi) =>
        w.map((g, gi) => <Goon key={`${wi}-${gi}`} start={g.start} hp={g.hp} delay={g.delay} seed={wi * 31 + gi * 7 + 1} onDown={onDown} />),
      )}
    </>
  );
}

/** Office references dressing the warehouse (affectionate, never mean: v1 Comedy Bible). */
function WarehouseDressing() {
  return (
    <>
      <Poster
        position={[-6, 4.6, -8.5]}
        size={[8, 1.2]}
        lines={[{ text: 'Dunder Mifflin', font: 'serif', size: 1.4 }, { text: 'PAPER COMPANY, INC. · SCRANTON BRANCH', size: 0.55, font: 'sans' }]}
        background="#1d2d5c"
        color="#f4f1e8"
      />
      <Poster position={[-12, 2.3, -8.5]} size={[1.7, 1.2]} lines={[{ text: 'THIS WAREHOUSE HAS GONE', size: 0.55 }, { text: '0', size: 1.6, color: '#c0392b', font: 'marker' }, { text: 'DAYS WITHOUT AN ACCIDENT', size: 0.55 }]} border={0.04} />
      <Poster position={[8, 1.9, -8.5]} size={[0.8, 1.0]} lines={[{ text: 'PRETZEL', size: 1.1 }, { text: 'DAY', size: 1.1 }, { text: 'free pretzels! lobby', size: 0.45, font: 'marker' }]} background="#ffe08a" font="bebas" tilt={0.04} />
      <Poster position={[9.2, 1.75, -8.5]} size={[0.75, 1.0]} lines={[{ text: "MICHAEL SCOTT'S", size: 0.45 }, { text: 'DUNDER MIFFLIN', size: 0.45 }, { text: 'SCRANTON', size: 0.45 }, { text: 'MEREDITH PALMER MEMORIAL', size: 0.42 }, { text: 'CELEBRITY RABIES AWARENESS', size: 0.4 }, { text: 'PRO-AM FUN RUN RACE', size: 0.45 }, { text: 'FOR THE CURE', size: 0.6, color: '#c0392b' }]} font="sans" tilt={-0.05} />
      <Poster position={[10.4, 1.85, -8.5]} size={[0.8, 0.9]} lines={[{ text: 'THE DUNDIES', font: 'serif', size: 0.9 }, { text: 'Chili’s · Thursday', size: 0.5, font: 'marker' }]} background="#262626" color="#e8c22e" tilt={0.03} />
      <Poster position={[18.9, 3.2, -3]} rotation={FACE_START} size={[3.6, 0.9]} lines={[{ text: 'WUPHF.com', font: 'sans', size: 1.2 }, { text: 'one message. every device.', size: 0.45, font: 'type' }]} background="#ffffff" color="#d4402c" />
      {/* Darryl's office */}
      <Door position={[-16, 0, -8.5]} />
      <Poster position={[-16, 2.55, -8.48]} size={[1.3, 0.3]} lines={[{ text: 'WAREHOUSE OFFICE · KNOCK' }]} background="#f2efe6" />
      {/* Hanging aisle signs: hand-lettered on cardboard, because this is a paper warehouse. */}
      <Hanging position={[2, 3.7, 0.6]} size={[2.4, 0.9]} lines={[{ text: 'AISLE 5' }]} />
      <Hanging position={[-7.5, 3.5, 0.6]} size={[1.7, 0.75]} lines={[{ text: 'FOOD' }, { text: '(paper)', size: 0.45 }]} />
      <Hanging position={[9, 3.5, 0.6]} size={[1.9, 0.75]} lines={[{ text: 'ALSO FOOD' }]} />
      <Forklift position={[-12.5, 0, 5.6]} rotation={[0, 0.5, 0]} />
      <Baler position={[17, 0, -6.4]} rotation={[0, -0.3, 0]} />
      <Crate position={[-16.5, 0, 6.3]} size={1} seed={3} />
      <Crate position={[-15.3, 0, 6.8]} size={0.8} seed={4} />
      <Poster position={[-16.5, 0.55, 6.82]} size={[0.8, 0.45]} lines={[{ text: 'SCHRUTE FARMS', size: 0.8 }, { text: 'BEETS · B&B · AGROTOURISM', size: 0.45 }]} background="#e9dcc0" color="#5b1a2a" board={false} />
    </>
  );
}

/** A cardboard sign hung from the grid on two strings. */
function Hanging({ position, size, lines }: { position: Vec3; size: [number, number]; lines: { text: string; size?: number }[] }) {
  return (
    <group position={position}>
      <Poster rotation={FACE_START} size={size} lines={lines} font="marker" background={CARDBOARD} color="#1b1b1b" />
      {[-0.4, 0.4].map((k) => (
        <mesh key={k} position={[0, size[1] / 2 + 0.6, k * size[0]]}>
          <boxGeometry args={[0.01, 1.2, 0.01]} />
          <meshBasicMaterial color="#222" />
        </mesh>
      ))}
    </group>
  );
}

function Mug({ position, text }: { position: Vec3; text: string }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.045, 0.11, 16]} />
        <meshStandardMaterial color="#f6f4ee" />
      </mesh>
      <Poster position={[-0.051, 0, 0]} rotation={FACE_START} size={[0.08, 0.06]} lines={[{ text }]} font="serif" board={false} />
    </group>
  );
}

/**
 * The reverse shot: the Dunder Mifflin bullpen where the movie is actually being made. Turn
 * around and the crew is watching the take, in character as themselves.
 */
function CrewSide() {
  const crew: { who: CastId; at: Vec3; rot?: Vec3; chair?: boolean }[] = [
    { who: 'kevin', at: [-2.6, 0, 10.4] },
    { who: 'pam', at: [3.4, 0, 9.9] },
    { who: 'angela', at: [6.2, 0, 10.6], rot: [0, Math.PI - 0.4, 0] },
    { who: 'stanley', at: [9.2, 0, 12.4], chair: true },
    { who: 'oscar', at: [-7.2, 0, 12.2], chair: true },
  ];
  return (
    <>
      <SetFloor size={[38, 7]} position={[0, 0, 12.5]} color="#59606b" />
      <Wall width={38} height={3.2} position={[0, 0, 16]} rotation={[0, Math.PI, 0]} color="#c8c2b4" />
      <CameraTripod position={[-2.2, 0, 9.5]} />
      <BoomMic position={[3.5, 2.4, 9.6]} rotation={[0.18, 0.15, 0]} length={3.4} />
      <DirectorChair position={[0.6, 0, 10.6]} rotation={FACE_SET} name="MICHAEL SCOTT · DIRECTOR" />
      {crew.map((c) => (
        <group key={c.who} position={c.at} rotation={c.rot ?? FACE_SET}>
          {c.chair && <Chair position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />}
          <CastFigure who={c.who} />
        </group>
      ))}
      <OfficeDesk position={[-7.2, 0, 13.4]} rotation={FACE_SET} mug="Oscar" />
      <OfficeDesk position={[9.2, 0, 13.6]} rotation={FACE_SET} mug="Stanley" />
      <OfficeDesk position={[-12, 0, 13.4]} rotation={FACE_SET} />
      <OfficeDesk position={[13.5, 0, 13.4]} rotation={FACE_SET} />
      <CubicleWall position={[-9.6, 0, 12.6]} rotation={[0, Math.PI / 2, 0]} />
      <CubicleWall position={[11.6, 0, 12.6]} rotation={[0, Math.PI / 2, 0]} />
      <Poster
        position={[0, 2.1, 15.95]}
        rotation={FACE_SET}
        size={[3.2, 1.4]}
        lines={[{ text: 'THREAT LEVEL MIDNIGHT', size: 1.1 }, { text: 'shoot day 1,412', size: 0.6, font: 'marker', color: '#1d2d5c' }, { text: 'NO LAUGHING ON SET  — Pam', size: 0.5, font: 'marker', color: '#c0392b' }]}
        background="#fbfbf8"
        border={0.03}
        borderColor="#9aa3ad"
      />
    </>
  );
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#fff6e0', '#3a3530', 0.6]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[6, 16, 9]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
      />
      {/* Fluorescent tubes over the set, and the office's own lights behind the camera. */}
      {[-12, -4, 4, 12].map((x) => (
        <mesh key={x} position={[x, 5.9, -1]}>
          <boxGeometry args={[3, 0.06, 0.25]} />
          <meshBasicMaterial color="#f8f7ef" />
        </mesh>
      ))}
      <pointLight position={[0, 2.9, 12.5]} intensity={18} distance={16} color="#fff4dc" />
      {[-9, 0, 9].map((x) => (
        <mesh key={x} position={[x, 3.15, 12.5]}>
          <boxGeometry args={[1.2, 0.04, 0.6]} />
          <meshBasicMaterial color="#f4f2ea" />
        </mesh>
      ))}
    </>
  );
}
