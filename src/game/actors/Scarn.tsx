import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierCollider, type RapierRigidBody } from '@react-three/rapier';
import { Group, Vector3 } from 'three';
import { CastFigure, newDrive } from './CastFigure';
import { input } from '../systems/input';
import { G } from '../systems/groups';
import { sim, addTrauma, camBasis, STEP, type Hit } from '../systems/sim';
import { fx } from '../systems/Effects';
import { useKcc } from '../systems/useKcc';
import { take, addStyle, completeNote } from '../../state/take';
import { sfx } from '@shared/audio/sfx';

type Vec3 = [number, number, number];

// Feel constants (v1 design bible §7: crisp accel/decel, forgiving dodge).
const RUN_SPEED = 5.0;
const STRAFE_FIRE_SPEED = 3.6; // slower while shooting, like any third-person shooter
const ACCEL = 38;
const DECEL = 30;
const ROLL_SPEED = 10;
const ROLL_TIME = 0.4;
const ROLL_COOLDOWN = 0.45;
const FIRE_INTERVAL = 0.14;
const MUZZLE_HEIGHT = 1.35;
const SHOT_RANGE = 80;
const POSE_TIME = 0.9;
const GRAVITY = 24;
const CAPSULE_HALF = 0.55;
const CAPSULE_R = 0.3;
const FOOT = CAPSULE_HALF + CAPSULE_R;
const HIP = 0.95; // roll pivot height
/** Seconds the camera stays pulled in after the last shot. */
const AIM_HOLD = 0.6;

/** How close (m) Scarn must be to use something. */
const REACH_SLACK = 0.2;

/** On ice: faster top speed, slow to start and very slow to stop (you glide). */
const SKATE = { speed: 7.0, accel: 9, decel: 2.6 };

export interface ScarnProps {
  start: Vec3;
  locked?: boolean;
  armed?: boolean;
  yaw?: number;
  /** 'skate' = ice physics (glide). */
  movement?: 'walk' | 'skate';
}

export function Scarn({ start, locked = false, armed = true, yaw, movement = 'walk' }: ScarnProps) {
  const body = useRef<RapierRigidBody>(null);
  const collider = useRef<RapierCollider>(null);
  const turn = useRef<Group>(null);
  const roll = useRef<Group>(null);
  const drive = useRef(newDrive());
  const { world, rapier } = useRapier();
  const kccRef = useKcc({ mass: 80 });

  const m = useRef({
    vel: new Vector3(),
    vy: 0,
    rollT: -1,
    rollCd: 0,
    rollDir: new Vector3(),
    fireCd: 0,
    aimHold: 0,
    poseT: 0,
    poseCd: 0,
  });

  useEffect(() => {
    sim.player.body = body.current;
    sim.player.alive = true;
    if (yaw !== undefined) sim.cam.yaw = yaw;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visuals per render frame: face the camera's forward (strafe), roll, blink when hurt.
  useFrame(() => {
    const s = m.current;
    const d = drive.current;
    if (turn.current) {
      const want = s.rollT >= 0 ? Math.atan2(s.rollDir.x, s.rollDir.z) : sim.cam.yaw + Math.PI;
      turn.current.rotation.y = lerpAngle(turn.current.rotation.y, want, 0.4);
      turn.current.visible = sim.player.iframes <= 0 || s.rollT >= 0 || Math.floor(sim.time * 20) % 2 === 0;
    }
    if (roll.current) roll.current.rotation.x = s.rollT >= 0 ? (s.rollT / ROLL_TIME) * Math.PI * 2 : 0;
    d.speed = Math.hypot(s.vel.x, s.vel.z);
    d.pose = s.poseT > 0 ? Math.min(1, (POSE_TIME - s.poseT) * 8, s.poseT * 6) : 0;
    // Arm pitch toward the aim point.
    const p = sim.player.pos;
    const a = sim.player.aim;
    const flat = Math.hypot(a.x - p.x, a.z - p.z);
    d.aimPitch = Math.atan2(a.y - (p.y + MUZZLE_HEIGHT), Math.max(flat, 0.5));
  });

  useBeforePhysicsStep(() => {
    const rb = body.current;
    const col = collider.current;
    const kcc = kccRef.current;
    if (!rb || !col || !kcc) return;
    const dt = STEP;
    const s = m.current;
    const d = drive.current;
    const alive = take.get().hp > 0 && take.get().status === 'rolling';
    sim.player.alive = alive;
    const controllable = alive && !locked && !sim.busy;
    d.dazed = !alive;

    const pos = rb.translation();
    if (pos.y < -10) {
      // Fell out of the set (should never happen): put him back on his mark.
      rb.setTranslation({ x: start[0], y: start[1] + 0.5, z: start[2] }, true);
      s.vy = 0;
      return;
    }
    sim.player.pos.set(pos.x, pos.y - FOOT, pos.z);
    sim.player.iframes = Math.max(0, sim.player.iframes - dt);
    if (sim.hitstop > 0) return;

    // --- Interaction: the nearest usable thing in reach gets the prompt; E uses it.
    let best: typeof sim.focus = null;
    let bestD = Infinity;
    for (const it of sim.interactables.values()) {
      if (!it.enabled) continue;
      const dd = Math.hypot(it.pos.x - pos.x, it.pos.z - pos.z);
      if (dd < it.radius + REACH_SLACK && dd < bestD) {
        best = it;
        bestD = dd;
      }
    }
    sim.focus = controllable ? best : null;
    if (sim.focus && input.consume('interact')) sim.focus.onUse();

    // --- Movement relative to the camera.
    const { fx: fwdX, fz: fwdZ, rx, rz } = camBasis(sim.cam.yaw);
    const mv = controllable ? input.move() : { x: 0, y: 0 };
    const firing = controllable && armed && input.isDown('fire');
    const skating = movement === 'skate';
    const speed = s.poseT > 0 ? RUN_SPEED * 0.3 : firing ? STRAFE_FIRE_SPEED : skating ? SKATE.speed : RUN_SPEED;
    const want = new Vector3(fwdX * mv.y + rx * mv.x, 0, fwdZ * mv.y + rz * mv.x).multiplyScalar(speed);

    // --- Dodge roll (i-frames for the whole roll plus a hair).
    s.rollCd -= dt;
    if (controllable && s.rollCd <= 0 && s.rollT < 0 && input.consume('dodge')) {
      s.rollT = 0;
      s.rollCd = ROLL_TIME + ROLL_COOLDOWN;
      s.rollDir.copy(want.lengthSq() > 0.01 ? want.clone().normalize() : new Vector3(fwdX, 0, fwdZ));
      sim.player.iframes = Math.max(sim.player.iframes, ROLL_TIME + 0.06);
      s.poseT = 0;
      sfx('dodge');
    }
    if (s.rollT >= 0) {
      s.rollT += dt;
      s.vel.copy(s.rollDir).multiplyScalar(ROLL_SPEED * (1 - (s.rollT / ROLL_TIME) * 0.4));
      if (s.rollT >= ROLL_TIME) s.rollT = -1;
    } else {
      const rate = want.lengthSq() > s.vel.lengthSq() ? (skating ? SKATE.accel : ACCEL) : skating ? SKATE.decel : DECEL;
      const dv = want.clone().sub(s.vel);
      const step = rate * dt;
      if (dv.length() <= step) s.vel.copy(want);
      else s.vel.addScaledVector(dv.normalize(), step);
    }

    // --- Gravity + KCC sweep.
    s.vy = kcc.computedGrounded() ? -1 : s.vy - GRAVITY * dt;
    kcc.computeColliderMovement(col, { x: s.vel.x * dt, y: s.vy * dt, z: s.vel.z * dt }, rapier.QueryFilterFlags.EXCLUDE_SENSORS, G.kccPlayer);
    const mvd = kcc.computedMovement();
    rb.setNextKinematicTranslation({ x: pos.x + mvd.x, y: pos.y + mvd.y, z: pos.z + mvd.z });

    // --- Shooting at whatever is under the crosshair (TECH ADR-5).
    s.fireCd -= dt;
    s.aimHold = Math.max(0, s.aimHold - dt);
    d.recoil = Math.max(0, d.recoil - dt);
    if (firing && s.rollT < 0 && s.poseT <= 0 && s.fireCd <= 0) {
      s.fireCd = FIRE_INTERVAL;
      s.aimHold = AIM_HOLD;
      shoot(pos.x, pos.y - FOOT, pos.z, fwdX, fwdZ, rx, rz);
      d.recoil = 0.12;
    }
    sim.cam.aiming = s.aimHold > 0;
    d.aim = controllable && s.rollT < 0 && s.poseT <= 0 && (s.aimHold > 0 || firing) ? 1 : 0;

    // --- Dramatic pose: style points, more if a goon just went down.
    s.poseCd -= dt;
    s.poseT = Math.max(0, s.poseT - dt);
    if (controllable && s.rollT < 0 && s.poseCd <= 0 && input.consume('pose')) {
      s.poseT = POSE_TIME;
      s.poseCd = 1.2;
      sim.player.lastPose = sim.time;
      sfx('pose');
      if (sim.time - sim.lastKnockdown < 1.6) addStyle('DRAMATIC POSE', 150);
      else addStyle('POSE', 20);
      if (sim.knockdowns.filter((t) => sim.time - t < 3).length >= 2) completeNote('pose-combo', 'Pose over two fresh goons');
    }
  });

  function shoot(x: number, feetY: number, z: number, fwdX: number, fwdZ: number, rx: number, rz: number) {
    // Muzzle: right hand, chest height, a little ahead.
    const origin = new Vector3(x + rx * 0.28 + fwdX * 0.45, feetY + MUZZLE_HEIGHT, z + rz * 0.28 + fwdZ * 0.45);
    const dir = sim.player.aim.clone().sub(origin);
    if (dir.lengthSq() < 0.01) dir.set(fwdX, 0, fwdZ);
    dir.normalize();
    const ray = new rapier.Ray(origin, dir);
    const hit = world.castRay(ray, SHOT_RANGE, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, G.playerShot, undefined, body.current ?? undefined);
    const toi = hit ? hit.timeOfImpact : SHOT_RANGE;
    const end = origin.clone().addScaledVector(dir, toi);
    fx.tracer(origin, end);
    sfx('shoot', 0, 40);
    addTrauma(0.05);
    take.set((t) => ({ shots: t.shots + 1 }));
    if (!hit) return;
    fx.sparks(end, dir.clone().negate(), 6);
    const handler = sim.hittables.get(hit.collider.handle);
    if (handler) {
      const h: Hit = { point: end, dir, damage: 1 };
      handler(h);
      take.set((t) => ({ hits: t.hits + 1 }));
      return;
    }
    const target = hit.collider.parent();
    if (target && target.isDynamic()) {
      const k = Math.min(target.mass() * 3.2, 14);
      target.applyImpulseAtPoint({ x: dir.x * k, y: Math.max(dir.y * k, k * 0.2), z: dir.z * k }, end, true);
      sfx('hit', 0, 60);
    } else {
      sfx('ricochet', 0, 80);
    }
  }

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={start} enabledRotations={[false, false, false]}>
      <CapsuleCollider ref={collider} args={[CAPSULE_HALF, CAPSULE_R]} collisionGroups={G.player} />
      <group ref={turn} position={[0, -FOOT, 0]}>
        <group position={[0, HIP, 0]}>
          <group ref={roll}>
            <group position={[0, -HIP, 0]}>
              <CastFigure who="scarn" drive={drive} detail="high" unarmed={!armed} />
            </group>
          </group>
        </group>
      </group>
    </RigidBody>
  );
}

export function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
