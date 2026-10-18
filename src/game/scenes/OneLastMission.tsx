import { useEffect, useRef, useState } from 'react';
import { Scarn } from '../actors/Scarn';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { SetPiece } from '../../sets/SetPiece';
import { SETS } from '../../sets';
import { Coin, flipCoin, resetCoin, type FlipResult } from '../minigames/CoinFlip';
import { sim } from '../systems/sim';
import { makeScript, run, useInteractable, useSceneScript } from '../systems/script';
import { preloadLines, say } from '../systems/dialogue';
import { take, addStyle, completeNote } from '../../state/take';
import { CH02 as L } from '@shared/data/script/ch02';
import { music } from '@shared/audio/music';
import { sfx } from '@shared/audio/sfx';

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
      {/* Scarn Manor is runek world data: src/sets/scarn-manor.world.json. */}
      <SetPiece data={SETS.scarnManor} />
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
      {/* The Oval Office is runek world data: src/sets/oval-office.world.json. */}
      <SetPiece data={SETS.ovalOffice} />
      <Coin rest={COIN_REST} />
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
// Lights (the sets themselves are runek world data in src/sets)

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
    </>
  );
}
