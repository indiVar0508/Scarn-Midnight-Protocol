import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { Color, InstancedMesh, Object3D, Quaternion, Vector3 } from 'three';
import { G } from './groups';
import { sim, addTrauma } from './sim';
import { take } from '../../state/take';

interface Tracer {
  a: Vector3;
  b: Vector3;
  life: number;
}
interface Spark {
  p: Vector3;
  v: Vector3;
  life: number;
}
interface Bullet {
  p: Vector3;
  v: Vector3;
  life: number;
}

const MAX_TRACERS = 24;
const MAX_SPARKS = 160;
const MAX_BULLETS = 48;
const TRACER_LIFE = 0.07;
const BULLET_RADIUS = 0.07;
const PLAYER_RADIUS = 0.42;

const tracers: Tracer[] = [];
const sparks: Spark[] = [];
const bullets: Bullet[] = [];

export const fx = {
  tracer(a: Vector3, b: Vector3): void {
    if (tracers.length >= MAX_TRACERS) tracers.shift();
    tracers.push({ a: a.clone(), b: b.clone(), life: TRACER_LIFE });
  },
  sparks(at: Vector3, normal: Vector3, n = 8): void {
    for (let i = 0; i < n; i++) {
      if (sparks.length >= MAX_SPARKS) sparks.shift();
      const v = normal
        .clone()
        .multiplyScalar(2 + Math.random() * 3)
        .add(new Vector3((Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4));
      sparks.push({ p: at.clone(), v, life: 0.25 + Math.random() * 0.25 });
    }
  },
  /** An enemy shot: slow and bright so it can be read and dodged. */
  bullet(from: Vector3, dir: Vector3, speed: number): void {
    if (bullets.length >= MAX_BULLETS) bullets.shift();
    bullets.push({ p: from.clone(), v: dir.clone().setY(0).normalize().multiplyScalar(speed), life: 4 });
  },
  /** Live projectiles (the reflex trial counts the ones that get past). */
  bulletCount(): number {
    return bullets.length;
  },
  clear(): void {
    tracers.length = 0;
    sparks.length = 0;
    bullets.length = 0;
  },
};

const dummy = new Object3D();
const up = new Vector3(0, 1, 0);
const tmp = new Vector3();
const q = new Quaternion();

/** Renders and simulates all transient effects in three draw calls. */
export function Effects() {
  const tracerMesh = useRef<InstancedMesh>(null);
  const sparkMesh = useRef<InstancedMesh>(null);
  const bulletMesh = useRef<InstancedMesh>(null);
  const { world, rapier } = useRapier();

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    // Enemy bullets: walls stop them, the player's capsule (by distance) takes them.
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      const step = b.v.length() * dt;
      const dir = tmp.copy(b.v).normalize();
      const ray = new rapier.Ray(b.p, dir);
      const hit = world.castRay(ray, step, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, G.enemyShot);
      b.p.addScaledVector(b.v, dt);
      b.life -= dt;
      const pp = sim.player.pos;
      const dx = b.p.x - pp.x;
      const dz = b.p.z - pp.z;
      if (sim.player.alive && Math.hypot(dx, dz) < PLAYER_RADIUS + BULLET_RADIUS && b.p.y < pp.y + 1.9) {
        bullets.splice(i, 1);
        if (sim.onPlayerHit) {
          sim.onPlayerHit(sim.player.iframes > 0);
        } else if (sim.player.iframes <= 0) {
          const s = take.get();
          take.set({ hp: Math.max(0, s.hp - 1), combo: 1 });
          sim.player.iframes = 0.6;
          addTrauma(0.45);
        }
        continue;
      }
      if (hit || b.life <= 0) {
        if (hit) fx.sparks(b.p, dir.clone().negate(), 4);
        bullets.splice(i, 1);
      }
    }
    for (let i = tracers.length - 1; i >= 0; i--) {
      tracers[i].life -= dt;
      if (tracers[i].life <= 0) tracers.splice(i, 1);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.v.y -= 14 * dt;
      s.p.addScaledVector(s.v, dt);
      if (s.p.y < 0.02) {
        s.p.y = 0.02;
        s.v.multiplyScalar(0.4);
      }
      s.life -= dt;
      if (s.life <= 0) sparks.splice(i, 1);
    }

    const tm = tracerMesh.current;
    if (tm) {
      tracers.forEach((t, i) => {
        const len = t.a.distanceTo(t.b);
        dummy.position.copy(t.a).lerp(t.b, 0.5);
        q.setFromUnitVectors(up, tmp.copy(t.b).sub(t.a).normalize());
        dummy.quaternion.copy(q);
        const w = 0.05 * (t.life / TRACER_LIFE) + 0.01;
        dummy.scale.set(w, len, w);
        dummy.updateMatrix();
        tm.setMatrixAt(i, dummy.matrix);
      });
      tm.count = tracers.length;
      tm.instanceMatrix.needsUpdate = true;
    }
    const sm = sparkMesh.current;
    if (sm) {
      sparks.forEach((s, i) => {
        dummy.position.copy(s.p);
        dummy.quaternion.identity();
        const k = Math.max(0.2, s.life * 3);
        dummy.scale.set(k, k, k);
        dummy.updateMatrix();
        sm.setMatrixAt(i, dummy.matrix);
      });
      sm.count = sparks.length;
      sm.instanceMatrix.needsUpdate = true;
    }
    const bm = bulletMesh.current;
    if (bm) {
      bullets.forEach((b, i) => {
        dummy.position.copy(b.p);
        dummy.quaternion.identity();
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        bm.setMatrixAt(i, dummy.matrix);
      });
      bm.count = bullets.length;
      bm.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={tracerMesh} args={[undefined, undefined, MAX_TRACERS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={new Color('#fff2a8')} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={sparkMesh} args={[undefined, undefined, MAX_SPARKS]} frustumCulled={false}>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshBasicMaterial color="#ffb347" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={bulletMesh} args={[undefined, undefined, MAX_BULLETS]} frustumCulled={false}>
        <sphereGeometry args={[BULLET_RADIUS, 10, 8]} />
        <meshBasicMaterial color="#ff4d3d" toneMapped={false} />
      </instancedMesh>
    </>
  );
}
