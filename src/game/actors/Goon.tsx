import { useEffect, useMemo, useRef } from 'react';
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier, type CollisionEnterPayload, type RapierCollider, type RapierRigidBody } from '@react-three/rapier';
import { Group, Vector3 } from 'three';
import { rng, range } from '@runek/core';
import { CastFigure, newDrive } from './CastFigure';
import { lerpAngle } from './Scarn';
import { G } from '../systems/groups';
import { sim, addTrauma, STEP, type Hit } from '../systems/sim';
import { fx } from '../systems/Effects';
import { useKcc } from '../systems/useKcc';
import { take, addStyle } from '../../state/take';
import { settings } from '@shared/state/settings';
import { sfx } from '@shared/audio/sfx';

type Vec3 = [number, number, number];

const SPEED = 2.6;
const CAPSULE_HALF = 0.55;
const CAPSULE_R = 0.3;
const GUN_HEIGHT = 1.25;
/** v1's signature gag: goons fall over a beat late. */
const LATE_FALL = 0.4;
const PREFERRED_MIN = 4.5;
const PREFERRED_MAX = 8.5;

export interface GoonProps {
  start: Vec3;
  seed?: number;
  hp?: number;
  /** Seconds before this goon starts acting (staggered wave entrances). */
  delay?: number;
  /** How it went down: shot, or flattened by a prop. */
  onDown?: (how: 'shot' | 'impact') => void;
}

type Mode = 'active' | 'reeling' | 'down';

export function Goon({ start, seed = 1, hp = 2, delay = 0, onDown }: GoonProps) {
  const body = useRef<RapierRigidBody>(null);
  const collider = useRef<RapierCollider>(null);
  const visual = useRef<Group>(null);
  const alert = useRef<Group>(null);
  const drive = useRef(newDrive());
  const { world, rapier } = useRapier();
  const r = useMemo(() => rng(seed), [seed]);

  const kccRef = useKcc({ mass: 70 });

  const m = useRef({
    mode: 'active' as Mode,
    hp,
    wait: delay,
    // First shot comes late: the player needs a beat to find goons in third person.
    reload: range(r, 2.0, 3.2),
    tele: 0,
    strafe: r() < 0.5 ? 1 : -1,
    strafeT: range(r, 1.5, 3),
    push: new Vector3(),
    vel: new Vector3(),
    vy: 0,
    reelT: 0,
    lastHitDir: new Vector3(0, 0, -1),
    registered: -1,
    juggleCd: 0,
    flash: 0,
    /** Downed by a prop rather than a bullet (bonus style). */
    impact: false,
  });

  // Register as hittable once the collider exists.
  const onHit = (h: Hit) => {
    const s = m.current;
    const rb = body.current;
    if (!rb) return;
    s.lastHitDir.copy(h.dir);
    if (s.mode === 'down') {
      rb.applyImpulseAtPoint({ x: h.dir.x * 160, y: 90, z: h.dir.z * 160 }, h.point, true);
      if (s.juggleCd <= 0) {
        addStyle('JUGGLE', 30);
        s.juggleCd = 0.5;
      }
      return;
    }
    if (s.mode === 'reeling') return;
    s.hp -= h.damage;
    s.push.addScaledVector(h.dir, 3.5);
    s.tele = 0;
    s.flash = 0.08;
    sfx('hit', 0, 50);
    sim.hitstop = Math.max(sim.hitstop, 0.035);
    if (s.hp <= 0) {
      s.mode = 'reeling';
      s.reelT = LATE_FALL;
      addTrauma(0.12);
    }
  };

  useEffect(() => {
    return () => {
      const s = m.current;
      if (s.registered >= 0) sim.hittables.delete(s.registered);
    };
  }, []);

  useBeforePhysicsStep(() => {
    const rb = body.current;
    const col = collider.current;
    if (!rb || !col) return;
    const s = m.current;
    if (s.registered < 0) {
      s.registered = col.handle;
      sim.hittables.set(col.handle, onHit);
    }
    const dt = STEP;
    const st = drive.current;
    s.juggleCd -= dt;
    st.recoil = Math.max(0, st.recoil - dt);
    s.flash = Math.max(0, s.flash - dt);
    if (sim.hitstop > 0) return;
    const assist = settings.get().assist;

    if (s.mode === 'down') {
      st.speed = 0;
      st.aim = 0;
      if (alert.current) alert.current.visible = false;
      return;
    }

    const pos = rb.translation();
    const pp = sim.player.pos;
    const to = new Vector3(pp.x - pos.x, 0, pp.z - pos.z);
    const dist = to.length();
    const dirTo = dist > 0.001 ? to.clone().divideScalar(dist) : new Vector3(0, 0, 1);

    if (s.mode === 'reeling') {
      // Stand there, stunned, for a beat too long. Then remember to fall over.
      st.dazed = true;
      st.aim = 0;
      s.reelT -= dt;
      if (s.reelT <= 0) knockDown(rb, col);
      s.push.multiplyScalar(Math.max(0, 1 - dt * 8));
      moveKcc(rb, col, s.push.x * dt, s.push.z * dt, dt);
      return;
    }

    const rolling = take.get().status === 'rolling';
    s.wait -= dt;
    const acting = s.wait <= 0 && rolling && sim.player.alive;

    // Movement: hold a comfortable range and strafe, so shots come from readable angles.
    const want = new Vector3();
    if (acting && s.tele <= 0) {
      if (dist > PREFERRED_MAX) want.copy(dirTo);
      else if (dist < PREFERRED_MIN) want.copy(dirTo).negate();
      s.strafeT -= dt;
      if (s.strafeT <= 0) {
        s.strafe *= -1;
        s.strafeT = range(r, 1.5, 3);
      }
      want.add(new Vector3(-dirTo.z, 0, dirTo.x).multiplyScalar(0.6 * s.strafe));
      if (want.lengthSq() > 1) want.normalize();
      want.multiplyScalar(SPEED);
    }
    s.vel.lerp(want, Math.min(1, dt * 6));
    s.push.multiplyScalar(Math.max(0, 1 - dt * 8));
    moveKcc(rb, col, (s.vel.x + s.push.x) * dt, (s.vel.z + s.push.z) * dt, dt);

    // Shooting: reload → line-of-sight check → telegraph (arm up, flash) → slow bullet.
    if (acting) {
      if (s.tele > 0) {
        s.tele -= dt;
        if (s.tele <= 0) fire(pos, dirTo, assist);
      } else {
        s.reload -= dt;
        if (s.reload <= 0 && dist < 15 && hasLineOfSight(pos, dist, dirTo, rb)) {
          s.tele = assist ? 0.9 : 0.55;
          s.reload = range(r, 2.1, 3.3) * (assist ? 1.5 : 1);
        } else if (s.reload <= 0) {
          s.reload = 0.3;
        }
      }
    }

    st.speed = s.vel.length();
    // Gun arm comes up for the wind-up and stays up through the shot; a hit jolts it down.
    st.aim = s.flash > 0 ? 0.4 : s.tele > 0 || st.recoil > 0 ? 1 : acting ? 0.25 : 0;
    st.aimPitch = 0;
    st.dazed = false;
    if (alert.current) alert.current.visible = s.tele > 0;
    if (visual.current) {
      visual.current.rotation.y = lerpAngle(visual.current.rotation.y, Math.atan2(dirTo.x, dirTo.z), Math.min(1, dt * 10));
    }
  });

  /** Props can't push a kinematic body, so a heavy prop arriving fast knocks the goon down
   *  explicitly: the shelf → goon chain reaction is the core slapstick. */
  function onImpact(e: CollisionEnterPayload) {
    const s = m.current;
    const other = e.other.rigidBody;
    if (s.mode !== 'active' || !other || !other.isDynamic()) return;
    const v = other.linvel();
    const momentum = Math.hypot(v.x, v.y, v.z) * other.mass();
    if (momentum < 40) return;
    const pos = body.current?.translation();
    const from = other.translation();
    if (pos) s.lastHitDir.set(pos.x - from.x, 0, pos.z - from.z).normalize();
    s.hp = 0;
    s.mode = 'reeling';
    s.reelT = LATE_FALL * 0.5;
    s.flash = 0.1;
    s.impact = true;
  }

  function moveKcc(rb: RapierRigidBody, col: RapierCollider, dx: number, dz: number, dt: number) {
    const s = m.current;
    const kcc = kccRef.current;
    if (!kcc) return;
    s.vy = kcc.computedGrounded() ? -1 : s.vy - 24 * dt;
    kcc.computeColliderMovement(col, { x: dx, y: s.vy * dt, z: dz }, rapier.QueryFilterFlags.EXCLUDE_SENSORS, G.kccEnemy);
    const mv = kcc.computedMovement();
    const p = rb.translation();
    rb.setNextKinematicTranslation({ x: p.x + mv.x, y: p.y + mv.y, z: p.z + mv.z });
  }

  function hasLineOfSight(pos: { x: number; y: number; z: number }, dist: number, dir: Vector3, rb: RapierRigidBody): boolean {
    const feet = pos.y - (CAPSULE_HALF + CAPSULE_R);
    const ray = new rapier.Ray({ x: pos.x, y: feet + GUN_HEIGHT, z: pos.z }, dir);
    const hit = world.castRay(ray, dist, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, G.enemyShot, undefined, rb);
    return !hit;
  }

  function fire(pos: { x: number; y: number; z: number }, dir: Vector3, assist: boolean) {
    const feet = pos.y - (CAPSULE_HALF + CAPSULE_R);
    const from = new Vector3(pos.x, feet + GUN_HEIGHT, pos.z).addScaledVector(dir, 0.6);
    fx.bullet(from, dir, assist ? 5.5 : 8);
    drive.current.recoil = 0.12;
    sfx('enemy_shoot', 0, 60);
  }

  function knockDown(rb: RapierRigidBody, col: RapierCollider) {
    const s = m.current;
    s.mode = 'down';
    rb.setBodyType(rapier.RigidBodyType.Dynamic, true);
    rb.setEnabledRotations(true, true, true, true);
    rb.setLinearDamping(0.4);
    rb.setAngularDamping(0.6);
    col.setCollisionGroups(G.ragdoll);
    col.setDensity(180);
    // Velocity, not impulse: mass properties only refresh on the next step.
    const d = s.lastHitDir;
    rb.setLinvel({ x: d.x * 6, y: 3.5, z: d.z * 6 }, true);
    rb.setAngvel({ x: d.z * 6, y: range(r, -3, 3), z: -d.x * 6 }, true);
    sfx('knockdown');
    addTrauma(0.2);
    sim.lastKnockdown = sim.time;
    sim.knockdowns.push(sim.time);
    take.set((t) => ({ goonsDown: t.goonsDown + 1 }));
    if (s.impact) addStyle('SET PIECE TAKEDOWN', 250);
    else addStyle('KNOCKDOWN', 100);
    onDown?.(s.impact ? 'impact' : 'shot');
  }

  const foot = -(CAPSULE_HALF + CAPSULE_R);
  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={start} enabledRotations={[false, false, false]} onCollisionEnter={onImpact}>
      <CapsuleCollider ref={collider} args={[CAPSULE_HALF, CAPSULE_R]} collisionGroups={G.enemy} />
      <group ref={visual} position={[0, foot, 0]}>
        <CastFigure who="goon" drive={drive} />
      </group>
      <group ref={alert} position={[0, 1.35, 0]} visible={false}>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.1, 0.32, 0.1]} />
          <meshBasicMaterial color="#ff3b30" toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="#ff3b30" toneMapped={false} />
        </mesh>
      </group>
    </RigidBody>
  );
}
