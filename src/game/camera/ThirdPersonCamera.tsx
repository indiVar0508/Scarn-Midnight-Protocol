import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { Vector3 } from 'three';
import { input } from '../systems/input';
import { G } from '../systems/groups';
import { sim, camBasis } from '../systems/sim';
import { shakeScale } from '@shared/state/settings';

const MOUSE_SENS = 0.0024; // radians per pixel
const PAD_RATE = 2.6; // radians per second at full stick
const PITCH_MIN = -0.55; // looking up
const PITCH_MAX = 0.85; // looking down
const PIVOT_HEIGHT = 1.55; // shoulder height above the feet
const SHOULDER = 0.55; // over the right shoulder
const DIST = 3.4;
const DIST_AIM = 2.5; // pulls in while firing
const ARM_MARGIN = 0.25;
const AIM_RANGE = 80;

/**
 * Over-the-shoulder third-person camera. Mouse (pointer lock) or right stick turns it; Scarn
 * strafes relative to it and shoots at whatever is under the centre crosshair. A spring arm
 * keeps walls from getting between camera and player; props are ignored so the camera never
 * twitches when a shelf falls behind you.
 */
export function ThirdPersonCamera() {
  const camera = useThree((s) => s.camera);
  const { world, rapier } = useRapier();
  const dist = useRef(DIST);
  const v = useRef({ pivot: new Vector3(), dir: new Vector3(), want: new Vector3(), aim: new Vector3() });

  const shotLook = useRef(new Vector3());
  useFrame((s, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const c = sim.cam;
    // Scripted shot (conversation, coin insert): ease to it and hold; gameplay look is frozen.
    if (sim.shot) {
      const k = 1 - Math.exp(-dt * 5);
      camera.position.lerp(sim.shot.pos, k);
      shotLook.current.lerp(sim.shot.look, k);
      camera.lookAt(shotLook.current);
      input.takeLook();
      return;
    }
    shotLook.current.copy(sim.player.aim);
    const look = input.takeLook();
    c.yaw -= look.dx * MOUSE_SENS;
    c.pitch += look.dy * MOUSE_SENS;
    if (input.pad.connected) {
      c.yaw -= input.pad.aim.x * PAD_RATE * dt;
      c.pitch += input.pad.aim.y * PAD_RATE * 0.7 * dt;
    }
    c.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, c.pitch));

    const { fx, fz, rx, rz } = camBasis(c.yaw);
    const { pivot, dir, want, aim } = v.current;
    const p = sim.player.pos;
    pivot.set(p.x + rx * SHOULDER, p.y + PIVOT_HEIGHT, p.z + rz * SHOULDER);
    const cp = Math.cos(c.pitch);
    dir.set(fx * cp, -Math.sin(c.pitch), fz * cp);

    // Spring arm: shorten against solid set walls, ease back out.
    const target = c.aiming ? DIST_AIM : DIST;
    const back = dir.clone().negate();
    const hit = world.castRay(new rapier.Ray(pivot, back), target, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, G.camera, undefined, sim.player.body ?? undefined);
    const allowed = hit ? Math.max(0.6, hit.timeOfImpact - ARM_MARGIN) : target;
    dist.current = allowed < dist.current ? allowed : dist.current + (allowed - dist.current) * (1 - Math.exp(-dt * 6));

    want.copy(pivot).addScaledVector(dir, -dist.current);
    const shake = sim.trauma * sim.trauma * shakeScale() * 0.12;
    const t = s.clock.elapsedTime;
    camera.position.set(want.x + Math.sin(t * 61.3) * shake, want.y + Math.sin(t * 47.9) * shake, want.z + Math.sin(t * 53.1) * shake);
    camera.rotation.set(-c.pitch + Math.sin(t * 37.7) * shake * 0.3, c.yaw, 0, 'YXZ');
    sim.trauma = Math.max(0, sim.trauma - dt * 1.8);

    // Aim: what's under the crosshair, starting at the player so nothing behind them counts.
    const from = want.clone().addScaledVector(dir, dist.current);
    const aimHit = world.castRay(new rapier.Ray(from, dir), AIM_RANGE, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, G.playerShot, undefined, sim.player.body ?? undefined);
    aim.copy(from).addScaledVector(dir, aimHit ? aimHit.timeOfImpact : AIM_RANGE);
    sim.player.aim.copy(aim);
    sim.aimOnTarget = !!aimHit && sim.hittables.has(aimHit.collider.handle);
  });
  return null;
}
