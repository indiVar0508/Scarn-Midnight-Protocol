import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadPhysicsSync, PhysicsWorld, QueryFilterFlags, RigidBodyType, type KccMove } from './world';
import { interactionGroups } from './groups';
import { crateHash } from '../../scripts/wasm-hash.mjs';

// The real Rust/rapier module, instantiated from the committed build.
beforeAll(() => {
  loadPhysicsSync(readFileSync(fileURLToPath(new URL('./wasm/tlm_physics_bg.wasm', import.meta.url))));
});

const ident = { x: 0, y: 0, z: 0, w: 1 };

function withGround() {
  const w = new PhysicsWorld();
  const g = w.createBody({ type: RigidBodyType.Fixed, position: { x: 0, y: -0.5, z: 0 }, rotation: ident });
  w.createCollider({ shape: 'cuboid', halfExtents: [20, 0.5, 20] }, {}, g);
  return w;
}

describe('the committed WASM build', () => {
  it('matches the crate source (run `npm run wasm` after changing crates/tlm-physics)', () => {
    const stamped = readFileSync(fileURLToPath(new URL('./wasm/SOURCE_HASH', import.meta.url)), 'utf8').trim();
    expect(stamped).toBe(crateHash());
  });
});

describe('PhysicsWorld (rapier3d in WASM)', () => {
  it('simulates a dynamic body onto the ground and exports its pose', () => {
    const w = withGround();
    const b = w.createBody({ type: RigidBodyType.Dynamic, position: { x: 1, y: 3, z: 0 }, rotation: ident });
    w.createCollider({ shape: 'ball', radius: 0.25 }, { density: 2 }, b);
    for (let i = 0; i < 240; i++) w.step();
    expect(b.translation().y).toBeCloseTo(0.25, 1);
    const poses = w.poses();
    const base = b.handle * PhysicsWorld.POSE_STRIDE;
    expect(poses[base]).toBeCloseTo(1, 3);
    expect(poses[base + 7]).toBeGreaterThanOrEqual(1);
    expect(b.mass()).toBeGreaterThan(0);
    w.dispose();
  });

  it('ray casts return the collider, its body, and the impact', () => {
    const w = withGround();
    const wall = w.createBody({ type: RigidBodyType.Fixed, position: { x: 0, y: 1, z: -5 }, rotation: ident });
    const wc = w.createCollider({ shape: 'cuboid', halfExtents: [1, 1, 0.5] }, {}, wall)!;
    w.step();
    const hit = w.castRay({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, 50)!;
    expect(hit.collider).toBe(wc);
    expect(hit.collider.parent()).toBe(wall);
    expect(hit.timeOfImpact).toBeCloseTo(4.5, 3);
    expect(hit.point.z).toBeCloseTo(-4.5, 3);
    expect(w.castRay({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, 50, { flags: QueryFilterFlags.ONLY_DYNAMIC })).toBeNull();
    w.dispose();
  });

  it('runs the character controller with rapier semantics', () => {
    const w = withGround();
    const body = w.createBody({ type: RigidBodyType.KinematicPositionBased, position: { x: 0, y: 0.87, z: 0 }, rotation: ident });
    const cap = w.createCollider({ shape: 'capsule', halfHeight: 0.55, radius: 0.3 }, {}, body)!;
    const kcc = w.createCharacterController({ snapToGround: 0.3, autostepHeight: 0.3, autostepMinWidth: 0.2 });
    w.step();
    let grounded = false;
    for (let i = 0; i < 60; i++) {
      const m: KccMove = kcc.move(cap, { x: 0.05, y: grounded ? 0 : -0.02, z: 0 })!;
      grounded = m.grounded;
      w.step();
    }
    expect(grounded).toBe(true);
    expect(body.translation().x).toBeGreaterThan(2.9);
    kcc.dispose();
    expect(kcc.move(cap, { x: 1, y: 0, z: 0 })).toBeNull();
    w.dispose();
  });

  it('reports sensor intersections with a kinematic character as events', () => {
    const w = withGround();
    const spot = w.createBody({ type: RigidBodyType.Fixed, position: { x: 2, y: 1, z: 0 }, rotation: ident });
    const sensor = w.createCollider({ shape: 'ball', radius: 0.6 }, { sensor: true, events: true, allPairs: true, collisionGroups: interactionGroups(6, [1]) }, spot)!;
    const body = w.createBody({ type: RigidBodyType.KinematicPositionBased, position: { x: 0, y: 0.87, z: 0 }, rotation: ident });
    const cap = w.createCollider({ shape: 'capsule', halfHeight: 0.55, radius: 0.3 }, { collisionGroups: interactionGroups(1, [0, 6]) }, body)!;
    const kcc = w.createCharacterController({ snapToGround: 0.3 });
    w.step();
    const seen: string[] = [];
    for (let i = 0; i < 60; i++) {
      kcc.move(cap, { x: 0.06, y: 0, z: 0 });
      for (const e of w.step()) {
        if (e.kind === 'collision' && e.sensor && [e.a, e.b].includes(sensor.handle) && [e.a, e.b].includes(cap.handle)) seen.push(e.started ? 'enter' : 'leave');
      }
    }
    expect(seen).toEqual(['enter', 'leave']);
    w.dispose();
  });

  it('flies projectiles in Rust and reports what they hit', () => {
    const w = withGround();
    const target = w.createBody({ type: RigidBodyType.KinematicPositionBased, position: { x: 0, y: 0.87, z: -6 }, rotation: ident });
    const cap = w.createCollider({ shape: 'capsule', halfHeight: 0.55, radius: 0.3 }, { collisionGroups: interactionGroups(1, [0, 2]) }, target)!;
    w.step();
    const id = w.spawnProjectile({ x: 0, y: 1.25, z: 0 }, { x: 0, y: 0, z: -8 }, { radius: 0.07, ttl: 4, groups: interactionGroups(2, [0, 1]) });
    expect(w.projectiles().length).toBe(PhysicsWorld.PROJECTILE_STRIDE);
    let hit: { collider: number | null } | null = null;
    for (let i = 0; i < 120 && !hit; i++) {
      for (const e of w.step()) if (e.kind === 'projectile-hit' && e.projectile === id) hit = e;
    }
    expect(hit?.collider).toBe(cap.handle);
    w.dispose();
  });

  it('turns a kinematic body dynamic and stale handles are harmless', () => {
    const w = withGround();
    const b = w.createBody({ type: RigidBodyType.KinematicPositionBased, position: { x: 0, y: 1, z: 0 }, rotation: ident, enabledRotations: [false, false, false] });
    w.createCollider({ shape: 'capsule', halfHeight: 0.55, radius: 0.3 }, { density: 180 }, b);
    b.setBodyType(RigidBodyType.Dynamic);
    b.setEnabledRotations(true, true, true);
    expect(b.isDynamic()).toBe(true);
    w.removeBody(b);
    expect(b.isValid()).toBe(false);
    b.setLinvel({ x: 1, y: 0, z: 0 });
    expect(b.translation()).toEqual({ x: 0, y: 0, z: 0 });
    expect(() => w.step()).not.toThrow();
    w.dispose();
  });

  it('is inert after dispose (children clean up after <Physics> frees the world)', () => {
    const w = withGround();
    const b = w.createBody({ type: RigidBodyType.Dynamic, position: { x: 0, y: 1, z: 0 }, rotation: ident });
    const c = w.createCollider({ shape: 'ball', radius: 0.2 }, {}, b)!;
    const kcc = w.createCharacterController();
    w.dispose();
    expect(() => {
      kcc.dispose();
      w.removeCollider(c);
      w.removeBody(b);
      b.setLinvel({ x: 1, y: 0, z: 0 });
      expect(b.translation()).toEqual({ x: 0, y: 0, z: 0 });
      expect(w.castRay({ x: 0, y: 5, z: 0 }, { x: 0, y: -1, z: 0 }, 10)).toBeNull();
      expect(w.step()).toEqual([]);
      expect(w.poses().length).toBe(0);
    }).not.toThrow();
  });
});
