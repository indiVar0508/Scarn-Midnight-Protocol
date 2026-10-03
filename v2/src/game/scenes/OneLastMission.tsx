import { useEffect, useRef, useState } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Wall } from '../../runek/Wall';
import { Door } from '../../runek/Door';
import { Table } from '../../runek/Table';
import { Chair } from '../../runek/Chair';
import { Rug } from '../../runek/Rug';
import { Lamp } from '../../runek/Lamp';
import { Flag } from '../../runek/Flag';
import { SetFloor } from '../../tlm/SetFloor';
import { Poster } from '../../tlm/Poster';
import { CameraTripod, BoomMic } from '../../tlm/OfficeProps';
import { Armchair, BeetTub, Couch, Trophy, TvFireplace } from '../../tlm/HomeProps';
import { Scarn } from '../actors/Scarn';
import { CastFigure } from '../actors/CastFigure';
import type { CastId } from '../actors/cast';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { Coin, flipCoin, resetCoin, type FlipResult } from '../minigames/CoinFlip';
import { G } from '../systems/groups';
import { sim } from '../systems/sim';
import { makeScript, run, useInteractable, useSceneScript } from '../systems/script';
import { preloadLines, say } from '../systems/dialogue';
import { take, addStyle, completeNote } from '../../state/take';
import { CH02 as L } from '@v1/data/script/ch02';
import { music } from '@v1/audio/music';
import { sfx } from '@v1/audio/sfx';

type Vec3 = [number, number, number];
type Room = 'manor' | 'office';

/** The six things that make the "inspect everything" note. */
const TOUR = ['portrait', 'trophies', 'fire', 'photo', 'couch', 'mug'] as const;

/** Ch2: Scarn Manor (a condo), then the Oval Office (a conference room), then the coin. */
export function OneLastMission() {
  const [room, setRoom] = useState<Room>('manor');

  useEffect(() => {
    preloadLines(Object.values(L));
    take.set({ objective: null, hint: 'Mouse: look · WASD: move · E: inspect / talk · Enter: skip a line' });
    const t = window.setTimeout(() => take.set({ hint: null }), 9000);
    return () => {
      window.clearTimeout(t);
      resetCoin();
    };
  }, []);

  const goOffice = () => {
    take.set({ blackout: true });
    window.setTimeout(() => {
      setRoom('office');
      window.setTimeout(() => take.set({ blackout: false }), 350);
    }, 600);
  };

  return (
    <>
      <ThirdPersonCamera />
      <color attach="background" args={['#0d0b0a']} />
      {room === 'manor' ? <Manor onLeave={goOffice} /> : <OvalOffice />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Scarn Manor

function Manor({ onLeave }: { onLeave: () => void }) {
  const [awake, setAwake] = useState(false);
  const seen = useRef(new Set<string>());

  useSceneScript(() => {
    music.play('manor', { fade: 1 });
    run(async () => {
      const s = makeScript();
      s.busy(true, { pos: [1.6, 1.5, 0.9], look: [0.3, 1.0, -0.6] });
      await s.say(L.n1, L.s1, L.m1, L.s2, L.m2, L.s3, L.m3, L.s4, L.m4);
      s.busy(false);
      setAwake(true);
      take.set({ objective: 'Get ready. Look around Scarn Manor (E), then head out the door.' });
    });
  });

  const inspect = (id: string, line: (typeof L)[keyof typeof L]) => () => {
    void say(line);
    if (seen.current.has(id)) return;
    seen.current.add(id);
    addStyle('ATTENTION TO DETAIL', 25);
    if (TOUR.every((t) => seen.current.has(t))) completeNote('manor-tour', 'Inspect everything in Scarn Manor');
  };

  useInteractable('portrait', [1.5, 0, -3.7], 'Inspect the portrait', inspect('portrait', L.portrait), { enabled: awake });
  useInteractable('trophies', [4.3, 0, -1.5], 'Inspect the trophies', inspect('trophies', L.trophies), { enabled: awake });
  useInteractable('fire', [-2.5, 0, -3.3], 'Inspect the fireplace', inspect('fire', L.fire), { enabled: awake });
  useInteractable('photo', [-4.5, 0, 1.6], 'Look at the photo', inspect('photo', L.photo), { enabled: awake });
  useInteractable('couch', [-2.5, 0, -0.7], 'Inspect the couch', inspect('couch', L.couch), { enabled: awake });
  useInteractable('mug', [-1.4, 0, -2.6], 'Pick up the mug', inspect('mug', L.mug), { enabled: awake, radius: 1.0 });
  useInteractable('beet', [4.3, 0, 2.4], 'Is that... a beet?', () => {
    void say(L.beet);
    if (!seen.current.has('beet')) {
      seen.current.add('beet');
      sfx('sparkle');
      completeNote('beet', "Find Samuel's bathtub beet");
    }
  }, { enabled: awake });
  useInteractable('samuel', [2.9, 0, -2.6], 'Talk to Samuel', () => void say(L.samuelTalk), { enabled: awake });
  useInteractable('door', [3.8, 0, -3.7], 'Leave for the Oval Office', () =>
    run(async () => {
      const s = makeScript();
      s.busy(true);
      await s.say(L.leave);
      take.set({ objective: null });
      onLeave();
    }), { enabled: awake, radius: 1.0 });

  return (
    <>
      <HomeLights />
      <SetFloor size={[11, 9]} color="#8a7a66" marks={[[0, 4.4, 11, 0.1]]} />
      <Wall width={11} height={3} position={[0, 0, -4.5]} color="#d8cfbd" />
      <Wall width={9} height={3} position={[-5.5, 0, 0]} rotation={[0, Math.PI / 2, 0]} color="#d8cfbd" />
      <Wall width={9} height={3} position={[5.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} color="#d8cfbd" />
      <FourthWall z={4.55} width={11} />

      <Door position={[3.8, 0, -4.45]} />
      <Poster position={[3.8, 2.35, -4.43]} size={[1.2, 0.32]} lines={[{ text: 'SCARN MANOR' }]} font="bebas" background="#ffffff" tilt={0.03} />
      <Poster position={[1.5, 1.75, -4.43]} size={[1.0, 1.3]} lines={[{ text: 'MICHAEL', size: 0.8 }, { text: 'SCARN', size: 1.2 }, { text: '(a portrait)', size: 0.4, font: 'marker' }, { text: 'by Michael Scarn', size: 0.4, font: 'marker' }]} font="serif" background="#e9dcc0" border={0.05} borderColor="#b8902c" />

      <TvFireplace position={[-2.5, 0, -4.1]} />
      <Couch position={[-2.5, 0, -1.3]} rotation={[0, Math.PI, 0]} />
      <Table position={[-2.0, 0, -2.6]} width={1.2} depth={0.6} height={0.45} />
      <Mug position={[-1.6, 0.47, -2.6]} />
      <Armchair position={[0.4, 0, -0.9]} rotation={[0, -2.3, 0]} />
      <Rug position={[-2.2, 0.01, -2]} size={[3.4, 2.6]} seed={7} />
      <Lamp position={[-4.8, 0, -3.8]} />

      {/* Self-awarded trophies on the sideboard. */}
      <Table position={[4.6, 0, -1.5]} rotation={[0, Math.PI / 2, 0]} width={1.8} depth={0.5} height={0.9} />
      {[-0.6, -0.2, 0.2, 0.6].map((z, i) => (
        <Trophy key={z} position={[4.6, 0.9, -1.5 + z]} scale={1 + (i % 2) * 0.4} />
      ))}
      <Poster position={[5.45, 1.85, -1.5]} rotation={[0, -Math.PI / 2, 0]} size={[1.4, 0.5]} lines={[{ text: "WORLD'S BEST SPY" }, { text: '3 years running · voted by: me', size: 0.45, font: 'marker' }]} background="#1d1d1d" color="#e8c22e" />

      {/* Catherine, in soft focus, on the side table. */}
      <Table position={[-4.8, 0, 1.6]} width={0.6} depth={0.6} height={0.7} />
      <Poster position={[-4.75, 0.9, 1.6]} rotation={[0, Math.PI / 2, -0.12]} size={[0.32, 0.4]} lines={[{ text: 'Catherine', font: 'serif' }, { text: 'forever', size: 0.6, font: 'marker' }]} background="#e6dcef" color="#5b3f78" border={0.08} borderColor="#c6a24a" />

      {/* The "bathroom": Samuel's beet farm, behind a shower curtain. */}
      <BeetTub position={[4.5, 0, 3.3]} rotation={[0, -Math.PI / 2, 0]} />
      <mesh position={[3.5, 1.1, 3.0]} castShadow>
        <boxGeometry args={[0.02, 2.2, 1.6]} />
        <meshStandardMaterial color="#9fc6d6" transparent opacity={0.8} />
      </mesh>

      <group position={[2.9, 0, -3.3]} rotation={[0, -0.5, 0]}>
        <CastFigure who="samuel" />
      </group>
      <Crew at={[0, 0, 6.2]} who={['kevin', 'pam']} />
      <Scarn start={[0.9, 0.85, 0.2]} armed={false} yaw={0.3} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// The Oval Office (a conference room with a flag)

const PRES: Vec3 = [0, 0, -2.7];
const COIN_REST: Vec3 = [0.35, 0.765, -1.1];

function OvalOffice() {
  const [seated, setSeated] = useState(false);

  useSceneScript(() => {
    // New room, fresh controls: the manor's exit script handed over mid-line.
    sim.busy = false;
    sim.shot = null;
    music.play('spy', { fade: 1 });
    take.set({ objective: 'Take a seat. The President is waiting.' });
    void say(L.p0);
  });

  const meeting = () =>
    run(async () => {
      const s = makeScript();
      setSeated(true);
      take.set({ objective: null });
      sim.player.body?.setTranslation({ x: 0, y: 0.85, z: 0.15 }, true);
      sim.cam.yaw = 0;
      const talk = { pos: [0.85, 1.75, 1.6] as Vec3, look: [0, 1.55, PRES[2]] as Vec3 };
      s.busy(true, talk);
      await s.say(L.p1);
      const c1 = await s.choose(["\"I'm retired. I sell paper now.\"", '"Is this about the missing staplers?"', '[Sit in the chair backwards. Like a cool teacher.]']);
      await s.say([L.c1a, L.c1b, L.c1c][c1]);
      if (c1 === 0) await s.say(L.p1a);
      if (c1 === 1) await s.say(L.p1b);
      if (c1 === 2) {
        completeNote('rebel', 'Sit in the chair backwards. Like a cool teacher.');
        addStyle('REBEL', 100);
        await spin(s);
        await s.say(L.p1c, L.m1c);
      }
      await s.say(L.p2, L.p3);
      const c2 = await s.choose(['"Goldenface. The man who murdered my wife."', '"Not the nacho lady!"', '"Why would anyone attack hockey?"']);
      await s.say([L.c2a, L.c2b, L.c2c][c2]);
      await s.say([L.p2a, L.p2b, L.p2c][c2]);
      if (c2 === 1) await s.say(L.m2b);
      await s.say(L.p4, L.m8);
      s.busy(true, { pos: [0.25, 1.65, -1.2], look: [0, 1.6, PRES[2]] }); // crash zoom on the President
      await s.wait(500);
      await s.say(L.p6);
      sfx('slam');
      s.busy(true, talk);
      await s.say(L.m5, L.m6);

      // The coin flip. Best of seven, as God and the movie intended.
      s.busy(true, { pos: [COIN_REST[0] + 0.5, 1.75, COIN_REST[2] + 1.0], look: [COIN_REST[0], 0.85, COIN_REST[2] - 0.2] });
      let attempt = 0;
      for (;;) {
        const r: FlipResult = await flipCoin(attempt);
        await s.wait(500);
        if (r === 'heads') {
          if (attempt === 0) addStyle('FIRST TRY', 100);
          await s.say(L.heads);
          break;
        }
        if (r === 'edge') {
          addStyle('MIRACLE', 300);
          await s.say(L.edge);
          break;
        }
        if (r === 'dropped') {
          await s.say(L.dropped, L.s5);
          break;
        }
        await s.say(attempt === 0 ? L.tails : L.tails2);
        attempt++;
      }
      s.busy(true, talk);
      await s.say(L.m7, L.p5);
      await s.say(L.m9, L.s6, L.m10);
      take.set({ status: 'wrapped', endedAt: performance.now() });
    });

  useInteractable('seat', [0, 0, -0.3], 'Take a seat', meeting, { enabled: !seated, radius: 1.1 });

  return (
    <>
      <OfficeLights />
      <SetFloor size={[12, 10]} color="#3f4a66" marks={[[0, 4.9, 12, 0.1]]} />
      <Wall width={12} height={3} position={[0, 0, -5]} color="#e6e1d4" />
      <Wall width={10} height={3} position={[-6, 0, 0]} rotation={[0, Math.PI / 2, 0]} color="#e6e1d4" />
      <Wall width={10} height={3} position={[6, 0, 0]} rotation={[0, -Math.PI / 2, 0]} color="#e6e1d4" />
      <FourthWall z={5.05} width={12} />

      {/* The "oval" rug: a carpet sample, cut by hand. */}
      <mesh position={[0, 0.01, -1.2]} scale={[2.6, 1, 1.7]} receiveShadow>
        <cylinderGeometry args={[1, 1, 0.01, 48]} />
        <meshStandardMaterial color="#26386b" />
      </mesh>
      <Table position={[0, 0, -1.5]} width={3.2} depth={1.3} height={0.75} color="#6b4a32" />
      {[-1, 0, 1].map((x) => (
        <Chair key={x} position={[x * 1.1, 0, -2.45]} />
      ))}
      <Chair position={[0, 0, -0.45]} rotation={[0, Math.PI, 0]} />
      <Coin rest={COIN_REST} />
      {/* The hotline: a red stapler. */}
      <mesh position={[-0.9, 0.79, -1.4]} castShadow>
        <boxGeometry args={[0.24, 0.07, 0.07]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      <Poster position={[-0.9, 0.86, -1.36]} size={[0.2, 0.06]} lines={[{ text: 'HOTLINE' }]} background="#ffffff" board={false} />

      <Flag position={[-2.4, 0, -4.4]} />
      <Poster position={[0, 2.15, -4.93]} size={[1.1, 1.1]} lines={[{ text: 'SEAL OF THE', size: 0.5 }, { text: 'PRESIDENT', size: 0.9 }, { text: '(printed)', size: 0.4, font: 'marker' }]} background="#f0e7c8" color="#1d2d5c" font="serif" border={0.06} borderColor="#b8902c" tilt={0.12} />
      <Poster position={[3.3, 1.6, -4.93]} size={[2.0, 1.2]} lines={[{ text: 'Q3 SAL', size: 0.9, font: 'marker', color: '#9aa3ad' }, { text: 'THREAT LEVEL:', size: 0.7, font: 'marker', color: '#1d2d5c' }, { text: '??? → MIDNIGHT', size: 0.7, font: 'marker', color: '#c0392b' }]} background="#fbfbf8" border={0.02} borderColor="#9aa3ad" />

      <group position={PRES}>
        <CastFigure who="president" />
      </group>
      <group position={[1.6, 0, 0.6]} rotation={[0, -2.2, 0]}>
        <CastFigure who="samuel" />
      </group>
      <Crew at={[0, 0, 6.6]} who={['kevin', 'angela']} />
      <Scarn start={[0, 0.85, 3.6]} armed={false} yaw={0} />
    </>
  );
}

/** "Sit in the chair backwards": one full, very cool spin. */
async function spin(s: ReturnType<typeof makeScript>) {
  const from = sim.cam.yaw;
  const t0 = performance.now();
  sfx('whoosh');
  while (performance.now() - t0 < 900) {
    const k = (performance.now() - t0) / 900;
    sim.cam.yaw = from + Math.PI * 2 * (k * k * (3 - 2 * k));
    await s.wait(16);
  }
  sim.cam.yaw = from;
}

// ---------------------------------------------------------------------------------------------
// Shared bits

/** The open side of the set: a strip of tape and an invisible line actors don't cross. */
function FourthWall({ z, width }: { z: number; width: number }) {
  return (
    <RigidBody type="fixed" colliders={false} position={[0, 1.5, z]}>
      <CuboidCollider args={[width / 2, 1.5, 0.1]} collisionGroups={G.barrier} />
    </RigidBody>
  );
}

/** A couple of coworkers behind the camera, watching the take. */
function Crew({ at, who }: { at: Vec3; who: CastId[] }) {
  return (
    <group position={at}>
      <SetFloor size={[14, 4]} position={[0, 0, 0.6]} color="#59606b" />
      <CameraTripod position={[-0.6, 0, -0.6]} rotation={[0, 0, 0]} />
      <BoomMic position={[1.2, 2.3, -0.4]} rotation={[0.2, 0.1, 0]} length={2.6} />
      {who.map((w, i) => (
        <group key={w} position={[(i ? 1.4 : -0.6) + 0, 0, 0.1]} rotation={[0, Math.PI, 0]}>
          <CastFigure who={w} />
        </group>
      ))}
    </group>
  );
}

function Mug({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.05, 0.045, 0.11, 16]} />
        <meshStandardMaterial color="#f6f4ee" />
      </mesh>
      <Poster position={[0, 0.055, 0.051]} size={[0.08, 0.06]} lines={[{ text: "WORLD'S BEST SECRET AGENT" }]} font="serif" board={false} />
    </group>
  );
}

function HomeLights() {
  return (
    <>
      <hemisphereLight args={['#fff1d6', '#3a3028', 0.7]} />
      <directionalLight position={[3, 6, 4]} intensity={1.1} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-bias={-0.0004} />
      <pointLight position={[0, 2.6, 0]} intensity={8} distance={10} color="#ffe2b8" />
    </>
  );
}

function OfficeLights() {
  return (
    <>
      <hemisphereLight args={['#f4f6ff', '#3a3530', 0.8]} />
      <directionalLight position={[2, 7, 5]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-bias={-0.0004} />
      {[-3, 0, 3].map((x) => (
        <mesh key={x} position={[x, 2.97, -1]}>
          <boxGeometry args={[1.2, 0.04, 0.6]} />
          <meshBasicMaterial color="#f4f2ea" />
        </mesh>
      ))}
    </>
  );
}
