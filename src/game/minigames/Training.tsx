import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, CuboidCollider, CylinderCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierCollider, type RapierRigidBody } from '@react-three/rapier';
import { Vector3, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { rng, range } from '@runek/core';
import { Cone } from '../../tlm/LakeProps';
import { Poster } from '../../tlm/Poster';
import { CastFigure, newDrive } from '../actors/CastFigure';
import { fx } from '../systems/Effects';
import { G } from '../systems/groups';
import { sim, camBasis, STEP, type Hit } from '../systems/sim';
import { take, addStyle, completeNote } from '../../state/take';
import { sfx } from '@shared/audio/sfx';

type Vec3 = [number, number, number];

export interface TrialProps {
  /** Called once with a 0–100 score. */
  onDone: (score: number) => void;
}

/**
 * The trial clock: a 3-2-1 count-in, then `seconds` of play. Publishes the HUD panel and calls
 * `finish` when time runs out (a trial may also finish early). Runs on physics steps.
 */
function useTrialClock(title: string, seconds: number, score: () => string, onTimeUp: () => void) {
  const t = useRef({ count: 3, left: seconds, done: false, last: 3 });
  const [live, setLive] = useState(false);
  useBeforePhysicsStep(() => {
    const s = t.current;
    if (s.done) return;
    if (s.count > 0) {
      s.count -= STEP;
      const n = Math.ceil(s.count);
      if (n !== s.last && n > 0) {
        s.last = n;
        sfx('beep');
      }
      take.set({ trial: { title, timeLeft: seconds, score: s.count > 0 ? `READY… ${Math.ceil(s.count)}` : 'GO!' } });
      if (s.count <= 0) {
        sfx('whistle');
        setLive(true);
      }
      return;
    }
    s.left -= STEP;
    take.set({ trial: { title, timeLeft: s.left, score: score() } });
    if (s.left <= 0) {
      s.done = true;
      onTimeUp();
    }
  });
  useEffect(() => () => take.set({ trial: null }), []);
  return {
    live,
    stop: () => {
      t.current.done = true;
    },
  };
}

function useOnce(onDone: (n: number) => void) {
  const done = useRef(false);
  return (n: number) => {
    if (done.current) return;
    done.current = true;
    take.set({ trial: null });
    onDone(Math.max(0, Math.min(100, Math.round(n))));
  };
}

// ---------------------------------------------------------------------------------------------
// 1. Mop the ice

const MOP_SPOTS = 14;

export function MopTrial({ onDone, center }: TrialProps & { center: Vec3 }) {
  const finish = useOnce(onDone);
  const spots = useMemo(() => {
    const r = rng(31);
    return Array.from({ length: MOP_SPOTS }, () => ({ x: center[0] + range(r, -4.5, 4.5), z: center[2] + range(r, -3, 3), s: range(r, 0.35, 0.6) }));
  }, [center]);
  const dirt = useRef(spots.map(() => 1));
  const meshes = useRef<(Mesh | null)[]>([]);
  const mop = useRef<Group>(null);
  const last = useRef(new Vector3());
  const cleaned = () => dirt.current.filter((d) => d <= 0.2).length;
  const clock = useTrialClock('MOP THE ICE', 20, () => `${cleaned()} / ${MOP_SPOTS} CLEAN`, () => end());
  const end = () => {
    clock.stop();
    const n = cleaned();
    if (n === MOP_SPOTS) completeNote('spotless', 'Mop the ice spotless');
    finish((n / MOP_SPOTS) * 100);
  };

  useBeforePhysicsStep(() => {
    if (!clock.live) return;
    const p = sim.player.pos;
    const moving = last.current.distanceTo(p) > 0.004;
    last.current.copy(p);
    if (!moving) return;
    const { fx: fx2, fz } = camBasis(sim.cam.yaw);
    const mx = p.x + fx2 * 0.6;
    const mz = p.z + fz * 0.6;
    dirt.current.forEach((d, i) => {
      if (d <= 0) return;
      if (Math.hypot(spots[i].x - mx, spots[i].z - mz) < spots[i].s + 0.25) {
        const was = d;
        dirt.current[i] = Math.max(0, d - STEP * 5);
        if (was > 0.2 && dirt.current[i] <= 0.2) {
          sfx('sparkle', 0, 80);
          addStyle('SQUEAKY', 10);
        }
      }
    });
    if (cleaned() === MOP_SPOTS) end();
  });

  useFrame(() => {
    dirt.current.forEach((d, i) => {
      const m = meshes.current[i];
      if (m) (m.material as MeshStandardMaterial).opacity = d <= 0.2 ? 0 : d * 0.85;
    });
    const g = mop.current;
    if (g) {
      const { fx: fx2, fz } = camBasis(sim.cam.yaw);
      g.position.set(sim.player.pos.x + fx2 * 0.6, 0, sim.player.pos.z + fz * 0.6);
      g.rotation.y = sim.cam.yaw;
    }
  });

  return (
    <>
      {spots.map((s, i) => (
        <mesh key={i} ref={(m) => (meshes.current[i] = m)} position={[s.x, 0.006, s.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[s.s, 18]} />
          <meshStandardMaterial color="#5a4632" transparent opacity={0.85} />
        </mesh>
      ))}
      <group ref={mop}>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.5, 0.1, 0.18]} />
          <meshStandardMaterial color="#e8e2cf" roughness={1} />
        </mesh>
        <mesh position={[0, 0.7, 0.25]} rotation={[-0.45, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.4, 6]} />
          <meshStandardMaterial color="#8a6a48" />
        </mesh>
      </group>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// 2. Stick handling: carry the puck through six gates in order

export function StickTrial({ onDone, center }: TrialProps & { center: Vec3 }) {
  const finish = useOnce(onDone);
  const gates = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        x: center[0] - 5 + i * 2,
        z: center[2] + (i % 2 ? 1.6 : -1.6),
      })),
    [center],
  );
  const passed = useRef(0);
  const puck = useRef<RapierRigidBody>(null);
  const gateMats = useRef<(MeshStandardMaterial | null)[]>([]);
  const prev = useRef(new Vector3());
  const clock = useTrialClock('STICK HANDLING', 25, () => `${passed.current} / 6 GATES`, () => end());
  const end = () => {
    clock.stop();
    finish((passed.current / 6) * 100);
  };

  useBeforePhysicsStep(() => {
    const b = puck.current;
    if (!b || !clock.live) return;
    const p = sim.player.pos;
    const vel = new Vector3().subVectors(p, prev.current).divideScalar(STEP);
    prev.current.copy(p);
    const { fx: fx2, fz } = camBasis(sim.cam.yaw);
    const stick = new Vector3(p.x + fx2 * 0.75, 0.05, p.z + fz * 0.75);
    const q = b.translation();
    const d = Math.hypot(q.x - stick.x, q.z - stick.z);
    // On the stick: the puck follows the blade (a soft spring plus the skater's own speed).
    if (d < 0.9) {
      const k = 9;
      b.setLinvel({ x: (stick.x - q.x) * k + vel.x * 0.9, y: b.linvel().y, z: (stick.z - q.z) * k + vel.z * 0.9 }, true);
    }
    const g = gates[passed.current];
    if (g && Math.hypot(q.x - g.x, q.z - g.z) < 0.55) {
      const m = gateMats.current[passed.current];
      if (m) m.color.set('#3ad17a');
      passed.current += 1;
      sfx('perfect');
      addStyle('GATE', 20);
      if (passed.current === 6) end();
    }
  });

  return (
    <>
      <RigidBody ref={puck} type="dynamic" colliders={false} position={[center[0] - 7, 0.05, center[2]]} ccd linearDamping={0.6} angularDamping={2} enabledRotations={[false, true, false]}>
        <CylinderCollider args={[0.0125, 0.0375]} density={1600} friction={0.05} collisionGroups={G.prop} />
        <mesh castShadow>
          <cylinderGeometry args={[0.0375, 0.0375, 0.025, 20]} />
          <meshStandardMaterial color="#0b0b0b" />
        </mesh>
      </RigidBody>
      {gates.map((g, i) => (
        <group key={i} position={[g.x, 0, g.z]}>
          {[-0.45, 0.45].map((dz) => (
            <mesh key={dz} position={[0, 0.25, dz]} castShadow>
              <cylinderGeometry args={[0.03, 0.05, 0.5, 8]} />
              <meshStandardMaterial ref={(m) => void (dz < 0 && (gateMats.current[i] = m))} color="#ffcf4a" />
            </mesh>
          ))}
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.45, 0.52, 24]} />
            <meshBasicMaterial color={i === 0 ? '#ffcf4a' : '#c9d7de'} />
          </mesh>
          <Poster position={[0, 0.75, 0]} rotation={[0, -Math.PI / 2, 0]} size={[0.3, 0.3]} lines={[{ text: String(i + 1) }]} board={false} background="#ffcf4a" />
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// 3. Targets: shoot the cardboard goons, not Cherokee Jack

const TARGETS = 8;

function CardboardTarget({ at, onHit }: { at: Vec3; onHit: () => void }) {
  const body = useRef<RapierRigidBody>(null);
  const col = useRef<RapierCollider>(null);
  const down = useRef(false);
  const { rapier } = useRapier();
  useEffect(() => {
    let handle = -1;
    const id = window.setInterval(() => {
      if (handle >= 0 || !col.current) return;
      handle = col.current.handle;
      sim.hittables.set(handle, (h: Hit) => {
        const b = body.current;
        if (!b) return;
        if (!down.current) {
          down.current = true;
          b.setBodyType(rapier.RigidBodyType.Dynamic, true);
          b.setLinvel({ x: h.dir.x * 3, y: 1.5, z: h.dir.z * 3 }, true);
          b.setAngvel({ x: h.dir.z * 6, y: 0, z: -h.dir.x * 6 }, true);
          sfx('knockdown', 0, 60);
          onHit();
        }
      });
    }, 50);
    return () => {
      window.clearInterval(id);
      if (handle >= 0) sim.hittables.delete(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <RigidBody ref={body} type="fixed" colliders={false} position={at} rotation={[0, -Math.PI / 2, 0]}>
      <CuboidCollider ref={col} args={[0.3, 0.75, 0.04]} position={[0, 0.75, 0]} density={60} collisionGroups={G.prop} />
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[0.6, 1.5, 0.03]} />
        <meshStandardMaterial color="#b8925e" />
      </mesh>
      <Poster position={[0, 0.95, 0.02]} size={[0.5, 0.9]} lines={[{ text: '☻', size: 1.4 }, { text: 'GOON', size: 0.6 }]} background="#1b1b1b" color="#f4f1e8" board={false} />
    </RigidBody>
  );
}

export function TargetTrial({ onDone, center }: TrialProps & { center: Vec3 }) {
  const finish = useOnce(onDone);
  const hits = useRef(0);
  const jackHits = useRef(0);
  const targets = useMemo(() => {
    const r = rng(17);
    return Array.from({ length: TARGETS }, (_, i) => [center[0] + 6 + range(r, 0, 5), 0, center[2] - 4.5 + i * 1.25 + range(r, -0.2, 0.2)] as Vec3);
  }, [center]);
  const jackCol = useRef<RapierCollider>(null);
  const jackDrive = useRef(newDrive());
  const clock = useTrialClock('TARGETS', 20, () => `${hits.current} / ${TARGETS} DOWN${jackHits.current ? ` · JACK HIT ×${jackHits.current}` : ''}`, () => end());
  const end = () => {
    clock.stop();
    if (hits.current === TARGETS && jackHits.current === 0) completeNote('snocker', 'Every target, and not one shot at Jack');
    finish((hits.current / TARGETS) * 100 - jackHits.current * 15);
  };
  // Jack among the targets is shootable, which he takes personally.
  useEffect(() => {
    let handle = -1;
    const id = window.setInterval(() => {
      if (handle >= 0 || !jackCol.current) return;
      handle = jackCol.current.handle;
      sim.hittables.set(handle, () => {
        jackHits.current += 1;
        jackDrive.current.dazed = true;
        window.setTimeout(() => (jackDrive.current.dazed = false), 600);
        sfx('hurt', 0, 300);
      });
    }, 50);
    return () => {
      window.clearInterval(id);
      if (handle >= 0) sim.hittables.delete(handle);
    };
  }, []);
  const jackAt: Vec3 = [center[0] + 8.5, 0, center[2] + 0.6];
  return (
    <>
      {targets.map((t, i) => (
        <CardboardTarget
          key={i}
          at={t}
          onHit={() => {
            hits.current += 1;
            addStyle('BULLSEYE', 25);
            if (hits.current === TARGETS) end();
          }}
        />
      ))}
      <RigidBody type="fixed" colliders={false} position={jackAt}>
        <CapsuleCollider ref={jackCol} args={[0.55, 0.3]} position={[0, 0.85, 0]} />
      </RigidBody>
      <group position={jackAt} rotation={[0, -Math.PI / 2, 0]}>
        <CastFigure who="jack" drive={jackDrive} />
      </group>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// 4. Obstacle skating: slalom the cones to the finish line, knock as few as possible

export function ObstacleTrial({ onDone, center }: TrialProps & { center: Vec3 }) {
  const finish = useOnce(onDone);
  const knocks = useRef(0);
  const started = useRef(0);
  const cones = useMemo(() => {
    const out: Vec3[] = [];
    // Slalom cones sit on the racing line (alternately nudged), so skating straight hits them all.
    for (let i = 0; i < 7; i++) out.push([center[0] - 4.5 + i * 1.8, 0, center[2] + (i % 2 ? 0.3 : -0.3)]);
    // Lane walls.
    for (let i = 0; i < 9; i++) {
      out.push([center[0] - 6 + i * 1.8, 0, center[2] + 2.4]);
      out.push([center[0] - 6 + i * 1.8, 0, center[2] - 2.4]);
    }
    return out;
  }, [center]);
  const finishX = center[0] + 8.5;
  const clock = useTrialClock('OBSTACLES', 25, () => `${knocks.current} CONES DOWN`, () => end(false));
  const end = (made: boolean) => {
    clock.stop();
    const t = sim.time - started.current;
    finish(made ? 100 - knocks.current * 12 - Math.max(0, t - 9) * 4 : 20 - knocks.current * 5);
  };
  useBeforePhysicsStep(() => {
    if (!clock.live) return;
    if (!started.current) started.current = sim.time;
    if (sim.player.pos.x > finishX) end(true);
  });
  return (
    <>
      {cones.map((c, i) => (
        <Cone
          key={i}
          position={c}
          onKnock={() => {
            knocks.current += 1;
            sfx('boing', 0, 80);
          }}
        />
      ))}
      <mesh position={[finishX, 0.006, center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 7]} />
        <meshBasicMaterial color="#c0392b" />
      </mesh>
      <Poster position={[finishX + 0.6, 1.6, center[2]]} rotation={[0, -Math.PI / 2, 0]} size={[1.6, 0.5]} lines={[{ text: 'FINISH' }]} background="#f4f1e8" color="#c0392b" />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// 5. Reflexes: Jack throws things; roll (SPACE) or sidestep

const THROWS = 12;

export function ReflexTrial({ onDone, center }: TrialProps & { center: Vec3 }) {
  const finish = useOnce(onDone);
  const thrown = useRef(0);
  const hit = useRef(0);
  const next = useRef(1.2);
  const tele = useRef(0);
  const r = useMemo(() => rng(53), []);
  const drive = useRef(newDrive());
  const jackAt = new Vector3(center[0] + 8, 0, center[2]);
  const clock = useTrialClock('REFLEXES', 22, () => `${thrown.current - hit.current} / ${thrown.current} DODGED`, () => end());
  const end = () => {
    clock.stop();
    sim.onPlayerHit = null;
    if (thrown.current > 0 && hit.current === 0) completeNote('ninjat', 'Dodge every single throw');
    finish(thrown.current ? ((thrown.current - hit.current) / thrown.current) * 100 : 0);
  };
  useEffect(() => {
    sim.onPlayerHit = (dodged) => {
      if (dodged) {
        addStyle('NINJAT', 30);
        return;
      }
      hit.current += 1;
      sfx('hurt', 0, 100);
    };
    return () => {
      sim.onPlayerHit = null;
    };
  }, []);
  useBeforePhysicsStep(() => {
    if (!clock.live) return;
    const d = drive.current;
    if (tele.current > 0) {
      tele.current -= STEP;
      d.aim = 1;
      if (tele.current <= 0) {
        const from = jackAt.clone().setY(1.25);
        const to = new Vector3(sim.player.pos.x, 1.25, sim.player.pos.z);
        fx.bullet(from, to.sub(from), range(r, 7, 10));
        sfx('whoosh', 0, 60);
        thrown.current += 1;
        d.aim = 0;
        if (thrown.current >= THROWS) window.setTimeout(() => end(), 1500);
      }
      return;
    }
    next.current -= STEP;
    if (next.current <= 0 && thrown.current < THROWS) {
      tele.current = 0.45;
      next.current = range(r, 0.8, 1.5);
    }
  });
  useFrame(() => {
    drive.current.aimPitch = 0;
  });
  return (
    <group position={jackAt.toArray() as Vec3} rotation={[0, -Math.PI / 2, 0]}>
      <CastFigure who="jack" drive={drive} />
    </group>
  );
}
