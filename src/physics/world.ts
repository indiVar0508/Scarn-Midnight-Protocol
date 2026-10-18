/**
 * TypeScript side of our Rust physics crate (`crates/tlm-physics`: rapier3d compiled to WASM).
 *
 * `PhysicsWorld` wraps the flat, id-based WASM API in rapier.js-shaped objects (`BodyApi`,
 * `ColliderApi`) so gameplay code and the `@react-three/rapier` facade (`./react.tsx`) can use
 * familiar method names. Every view into WASM memory is created fresh at the point of use:
 * memory growth (new bodies, bigger buffers) detaches older views.
 */
import init, { initSync, Physics as RawPhysics, type InitOutput } from './wasm/tlm_physics.js';

export type Vec3Like = { x: number; y: number; z: number };
export type QuatLike = { x: number; y: number; z: number; w: number };

/** rapier.js numbering (also our Rust `BodyKind`). */
export enum RigidBodyType {
  Dynamic = 0,
  Fixed = 1,
  KinematicPositionBased = 2,
  KinematicVelocityBased = 3,
}

/** rapier `QueryFilterFlags` bits (identical in Rust and rapier.js). */
export enum QueryFilterFlags {
  EXCLUDE_FIXED = 1,
  EXCLUDE_KINEMATIC = 2,
  EXCLUDE_DYNAMIC = 4,
  EXCLUDE_SENSORS = 8,
  EXCLUDE_SOLIDS = 16,
  ONLY_DYNAMIC = 3,
  ONLY_KINEMATIC = 5,
  ONLY_FIXED = 6,
}

/** Must match the constants in crates/tlm-physics/src/lib.rs. */
const POSE_STRIDE = 8;
const EVENT_STRIDE = 4;
const PROJECTILE_STRIDE = 5;
const EV = { started: 1, stopped: 2, projectileHit: 3, projectileExpired: 4 } as const;
const NONE = 0xffffffff;

export type PhysicsEvent =
  | { kind: 'collision'; started: boolean; a: number; b: number; sensor: boolean; removed: boolean }
  | { kind: 'projectile-hit'; projectile: number; collider: number | null; point: Vec3Like }
  | { kind: 'projectile-expired'; projectile: number; point: Vec3Like };

export interface RayHit {
  collider: ColliderApi;
  timeOfImpact: number;
  normal: Vec3Like;
  point: Vec3Like;
}

export interface RayOptions {
  /** Treat shapes as solid (a ray starting inside one hits at 0). Default true. */
  solid?: boolean;
  flags?: number;
  /** Interaction-group bits for the query (see `interactionGroups`). */
  groups?: number;
  excludeBody?: BodyApi | null;
  excludeCollider?: ColliderApi | null;
}

export interface BodyDesc {
  type: RigidBodyType;
  position: Vec3Like;
  rotation: QuatLike;
  ccd?: boolean;
  canSleep?: boolean;
  linearDamping?: number;
  angularDamping?: number;
  /** Rotations each axis may do (`@react-three/rapier`'s `enabledRotations`). */
  enabledRotations?: [boolean, boolean, boolean];
  gravityScale?: number;
}

export type ShapeDesc =
  | { shape: 'cuboid'; halfExtents: [number, number, number] }
  | { shape: 'ball'; radius: number }
  | { shape: 'capsule'; halfHeight: number; radius: number }
  | { shape: 'cylinder'; halfHeight: number; radius: number }
  | { shape: 'cone'; halfHeight: number; radius: number }
  | { shape: 'convexHull'; points: Float32Array }
  | { shape: 'trimesh'; vertices: Float32Array; indices: Uint32Array };

export interface ColliderDesc {
  /** Pose relative to the body. */
  position?: Vec3Like;
  rotation?: QuatLike;
  density?: number;
  friction?: number;
  restitution?: number;
  collisionGroups?: number;
  solverGroups?: number;
  sensor?: boolean;
  /** Report collision/intersection events for this collider. */
  events?: boolean;
  /** Also test kinematic↔fixed / kinematic↔kinematic pairs (sensors a kinematic character
   *  walks into need this). */
  allPairs?: boolean;
}

const ALL_GROUPS = 0xffffffff;

let ready: Promise<InitOutput> | null = null;
let memory: WebAssembly.Memory | null = null;

/** Load the WASM module once (browser: fetched as a hashed asset next to the bundle). */
export function loadPhysics(): Promise<void> {
  ready ??= import('./wasm/tlm_physics_bg.wasm?url').then(({ default: url }) => init({ module_or_path: url }));
  return ready.then((exports) => {
    memory = exports.memory;
  });
}

/** Node/tests: instantiate synchronously from the module bytes. */
export function loadPhysicsSync(bytes: BufferSource): void {
  memory = initSync({ module: bytes }).memory;
}

export function physicsLoaded(): boolean {
  return memory !== null;
}

function mem(): ArrayBuffer {
  if (!memory) throw new Error('physics WASM not loaded: call loadPhysics() first');
  return memory.buffer as ArrayBuffer;
}

/** A rapier.js-shaped handle on one body. Methods on a removed body are harmless no-ops. */
export class BodyApi {
  /** Our stable id (never reused); rapier.js calls it `handle`. */
  readonly handle: number;
  /** Arbitrary data the caller attaches (the facade stores its Object3D here). */
  userData: unknown;
  constructor(
    private readonly w: PhysicsWorld,
    id: number,
  ) {
    this.handle = id;
  }
  private get raw() {
    return this.w.raw;
  }
  isValid(): boolean {
    return this.raw.body_exists(this.handle);
  }
  translation(): Vec3Like {
    if (!this.raw.read_pose(this.handle)) return { x: 0, y: 0, z: 0 };
    const o = this.w.out();
    return { x: o[0], y: o[1], z: o[2] };
  }
  rotation(): QuatLike {
    if (!this.raw.read_pose(this.handle)) return { x: 0, y: 0, z: 0, w: 1 };
    const o = this.w.out();
    return { x: o[3], y: o[4], z: o[5], w: o[6] };
  }
  linvel(): Vec3Like {
    if (!this.raw.read_velocity(this.handle)) return { x: 0, y: 0, z: 0 };
    const o = this.w.out();
    return { x: o[0], y: o[1], z: o[2] };
  }
  angvel(): Vec3Like {
    if (!this.raw.read_velocity(this.handle)) return { x: 0, y: 0, z: 0 };
    const o = this.w.out();
    return { x: o[3], y: o[4], z: o[5] };
  }
  setTranslation(v: Vec3Like, wake = true): void {
    this.raw.set_translation(this.handle, v.x, v.y, v.z, wake);
  }
  setRotation(q: QuatLike, wake = true): void {
    this.raw.set_rotation(this.handle, q.x, q.y, q.z, q.w, wake);
  }
  setNextKinematicTranslation(v: Vec3Like): void {
    this.raw.set_next_kinematic_translation(this.handle, v.x, v.y, v.z);
  }
  setNextKinematicRotation(q: QuatLike): void {
    this.raw.set_next_kinematic_rotation(this.handle, q.x, q.y, q.z, q.w);
  }
  setLinvel(v: Vec3Like, wake = true): void {
    this.raw.set_linvel(this.handle, v.x, v.y, v.z, wake);
  }
  setAngvel(v: Vec3Like, wake = true): void {
    this.raw.set_angvel(this.handle, v.x, v.y, v.z, wake);
  }
  applyImpulse(v: Vec3Like, wake = true): void {
    this.raw.apply_impulse(this.handle, v.x, v.y, v.z, wake);
  }
  applyImpulseAtPoint(v: Vec3Like, p: Vec3Like, wake = true): void {
    this.raw.apply_impulse_at_point(this.handle, v.x, v.y, v.z, p.x, p.y, p.z, wake);
  }
  applyTorqueImpulse(v: Vec3Like, wake = true): void {
    this.raw.apply_torque_impulse(this.handle, v.x, v.y, v.z, wake);
  }
  mass(): number {
    return this.raw.mass(this.handle);
  }
  bodyType(): RigidBodyType {
    return this.raw.body_type(this.handle) as RigidBodyType;
  }
  isDynamic(): boolean {
    return this.isValid() && this.bodyType() === RigidBodyType.Dynamic;
  }
  isKinematic(): boolean {
    const t = this.bodyType();
    return this.isValid() && (t === RigidBodyType.KinematicPositionBased || t === RigidBodyType.KinematicVelocityBased);
  }
  isFixed(): boolean {
    return this.bodyType() === RigidBodyType.Fixed;
  }
  setBodyType(type: RigidBodyType, wake = true): void {
    this.raw.set_body_type(this.handle, type, wake);
  }
  setEnabledRotations(x: boolean, y: boolean, z: boolean, wake = true): void {
    this.raw.set_enabled_rotations(this.handle, x, y, z, wake);
  }
  lockRotations(locked: boolean, wake = true): void {
    this.raw.set_enabled_rotations(this.handle, !locked, !locked, !locked, wake);
  }
  setLinearDamping(v: number): void {
    this.raw.set_linear_damping(this.handle, v);
  }
  setAngularDamping(v: number): void {
    this.raw.set_angular_damping(this.handle, v);
  }
  setGravityScale(v: number, wake = true): void {
    this.raw.set_gravity_scale(this.handle, v, wake);
  }
  enableCcd(on: boolean): void {
    this.raw.set_ccd(this.handle, on);
  }
  wakeUp(): void {
    this.raw.wake_up(this.handle);
  }
  sleep(): void {
    this.raw.sleep(this.handle);
  }
  isSleeping(): boolean {
    return this.raw.is_sleeping(this.handle);
  }
}

/** A rapier.js-shaped handle on one collider. */
export class ColliderApi {
  readonly handle: number;
  constructor(
    private readonly w: PhysicsWorld,
    id: number,
  ) {
    this.handle = id;
  }
  isValid(): boolean {
    return this.w.raw.collider_exists(this.handle);
  }
  /** The body it's attached to (rapier.js returns the body; so do we). */
  parent(): BodyApi | null {
    const b = this.w.raw.collider_body(this.handle);
    return b < 0 ? null : this.w.body(b);
  }
  setCollisionGroups(bits: number): void {
    this.w.raw.set_collision_groups(this.handle, bits >>> 0);
  }
  setSolverGroups(bits: number): void {
    this.w.raw.set_solver_groups(this.handle, bits >>> 0);
  }
  setDensity(d: number): void {
    this.w.raw.set_density(this.handle, d);
  }
  setFriction(f: number): void {
    this.w.raw.set_friction(this.handle, f);
  }
  setSensor(on: boolean): void {
    this.w.raw.set_sensor(this.handle, on);
  }
  setEnabled(on: boolean): void {
    this.w.raw.set_collider_enabled(this.handle, on);
  }
}

export interface KccOptions {
  offset?: number;
  slide?: boolean;
  /** Max step height; 0 disables autostep. */
  autostepHeight?: number;
  autostepMinWidth?: number;
  autostepIncludeDynamic?: boolean;
  /** Snap-to-ground distance; 0 disables it. */
  snapToGround?: number;
  maxSlopeClimbAngle?: number;
  minSlopeSlideAngle?: number;
}

export interface KccMove {
  translation: Vec3Like;
  grounded: boolean;
  sliding: boolean;
}

/** rapier's `KinematicCharacterController`, running in Rust. */
export class CharacterController {
  private disposed = false;
  constructor(
    private readonly w: PhysicsWorld,
    readonly id: number,
    o: KccOptions,
  ) {
    w.raw.kcc_config(
      id,
      o.slide ?? true,
      o.autostepHeight ?? 0,
      o.autostepMinWidth ?? 0,
      o.autostepIncludeDynamic ?? false,
      o.snapToGround ?? 0,
      o.maxSlopeClimbAngle ?? Math.PI / 4,
      o.minSlopeSlideAngle ?? Math.PI / 4,
    );
  }
  /**
   * Sweep `collider`'s shape by `desired`, sliding along obstacles (sensors never block). With
   * `apply` (default) the body's next kinematic translation is set. `pushMass` > 0 pushes dynamic
   * bodies it touches. Returns null if the controller or collider is gone.
   */
  move(collider: ColliderApi, desired: Vec3Like, opts: { flags?: number; groups?: number; apply?: boolean; pushMass?: number } = {}): KccMove | null {
    if (this.disposed) return null;
    const ok = this.w.raw.kcc_move(
      this.id,
      collider.handle,
      desired.x,
      desired.y,
      desired.z,
      opts.flags ?? QueryFilterFlags.EXCLUDE_SENSORS,
      (opts.groups ?? ALL_GROUPS) >>> 0,
      opts.groups !== undefined,
      opts.apply ?? true,
      opts.pushMass ?? 0,
    );
    if (!ok) return null;
    const o = this.w.out();
    return { translation: { x: o[0], y: o[1], z: o[2] }, grounded: o[3] > 0.5, sliding: o[4] > 0.5 };
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.w.raw.remove_kcc(this.id);
  }
}

/**
 * Stand-in for a freed world. React tears down `<Physics>` before its children's cleanups run, so
 * those cleanups (removing a collider, a character controller…) can reach a disposed world; they
 * get harmless defaults instead of calling into freed WASM memory ("null pointer passed to rust").
 */
const DEAD_RETURNS: Record<string, unknown> = { attach: -1, cast_ray: -1, collider_body: -1, body_type: 1, kcc_move: false, read_pose: false, read_velocity: false, timestep: 1 / 60 };
const DEAD = new Proxy({} as RawPhysics, {
  get: (_t, name) => () => DEAD_RETURNS[name as string] ?? 0,
});

/** One rapier world in WASM. */
export class PhysicsWorld {
  private live: RawPhysics;
  private bodies = new Map<number, BodyApi>();
  private colliders = new Map<number, ColliderApi>();
  private events: PhysicsEvent[] = [];
  private disposed = false;

  constructor(gravity: Vec3Like = { x: 0, y: -9.81, z: 0 }) {
    mem(); // throws if not loaded
    this.live = new RawPhysics();
    this.live.set_gravity(gravity.x, gravity.y, gravity.z);
  }

  /** The WASM world, or an inert stand-in once disposed. */
  get raw(): RawPhysics {
    return this.live;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const freed = this.live;
    this.live = DEAD;
    freed.free();
    this.bodies.clear();
    this.colliders.clear();
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  /** The 16-float scratch the Rust side writes multi-value results into. */
  out(): Float32Array {
    if (this.disposed) return new Float32Array(16);
    return new Float32Array(mem(), this.raw.out_ptr(), 16);
  }

  setGravity(g: Vec3Like): void {
    this.raw.set_gravity(g.x, g.y, g.z);
  }

  get timestep(): number {
    return this.raw.timestep();
  }

  set timestep(dt: number) {
    this.raw.set_timestep(dt);
  }

  // ── Bodies & colliders ──

  createBody(d: BodyDesc): BodyApi {
    const r = d.enabledRotations ?? [true, true, true];
    const lock = (r[0] ? 0 : 1) | (r[1] ? 0 : 2) | (r[2] ? 0 : 4);
    const id = this.raw.create_body(
      d.type,
      d.position.x,
      d.position.y,
      d.position.z,
      d.rotation.x,
      d.rotation.y,
      d.rotation.z,
      d.rotation.w,
      d.ccd ?? false,
      d.canSleep ?? true,
      d.linearDamping ?? 0,
      d.angularDamping ?? 0,
      lock,
      d.gravityScale ?? 1,
    );
    return this.body(id);
  }

  /** The (cached) API object for body `id`. */
  body(id: number): BodyApi {
    let b = this.bodies.get(id);
    if (!b) this.bodies.set(id, (b = new BodyApi(this, id)));
    return b;
  }

  collider(id: number): ColliderApi {
    let c = this.colliders.get(id);
    if (!c) this.colliders.set(id, (c = new ColliderApi(this, id)));
    return c;
  }

  removeBody(b: BodyApi): void {
    if (this.disposed) return;
    this.raw.remove_body(b.handle);
  }

  /** Create a collider on `body` (or free-standing). Null if the shape is degenerate. */
  createCollider(shape: ShapeDesc, d: ColliderDesc, body: BodyApi | null): ColliderApi | null {
    const r = this.raw;
    switch (shape.shape) {
      case 'cuboid':
        r.new_cuboid(...shape.halfExtents);
        break;
      case 'ball':
        r.new_ball(shape.radius);
        break;
      case 'capsule':
        r.new_capsule(shape.halfHeight, shape.radius);
        break;
      case 'cylinder':
        r.new_cylinder(shape.halfHeight, shape.radius);
        break;
      case 'cone':
        r.new_cone(shape.halfHeight, shape.radius);
        break;
      case 'convexHull':
        if (!r.new_convex_hull(shape.points)) return null;
        break;
      case 'trimesh':
        if (!r.new_trimesh(shape.vertices, shape.indices)) return null;
        break;
    }
    const p = d.position ?? { x: 0, y: 0, z: 0 };
    const q = d.rotation ?? { x: 0, y: 0, z: 0, w: 1 };
    r.pending_pose(p.x, p.y, p.z, q.x, q.y, q.z, q.w);
    r.pending_material(d.density ?? 1, d.friction ?? 0.5, d.restitution ?? 0);
    r.pending_groups((d.collisionGroups ?? ALL_GROUPS) >>> 0, (d.solverGroups ?? ALL_GROUPS) >>> 0);
    r.pending_flags(d.sensor ?? false, d.events ?? false, d.allPairs ?? false);
    const id = r.attach(body ? body.handle : -1);
    return id < 0 ? null : this.collider(id);
  }

  removeCollider(c: ColliderApi): void {
    if (this.disposed) return;
    this.raw.remove_collider(c.handle);
  }

  // ── Stepping ──

  /** Advance one fixed step and return its events (valid until the next step). */
  step(): readonly PhysicsEvent[] {
    if (this.disposed) return [];
    this.raw.step();
    const n = this.raw.event_count();
    this.events.length = 0;
    if (n === 0) return this.events;
    const buf = mem();
    const ev = new Uint32Array(buf, this.raw.events_ptr(), n * EVENT_STRIDE);
    const pts = new Float32Array(buf, this.raw.event_points_ptr(), n * 3);
    for (let i = 0; i < n; i++) {
      const k = ev[i * 4];
      const a = ev[i * 4 + 1];
      const b = ev[i * 4 + 2];
      const f = ev[i * 4 + 3];
      const point = { x: pts[i * 3], y: pts[i * 3 + 1], z: pts[i * 3 + 2] };
      if (k === EV.started || k === EV.stopped) this.events.push({ kind: 'collision', started: k === EV.started, a, b, sensor: (f & 1) !== 0, removed: (f & 2) !== 0 });
      else if (k === EV.projectileHit) this.events.push({ kind: 'projectile-hit', projectile: a, collider: b === NONE ? null : b, point });
      else if (k === EV.projectileExpired) this.events.push({ kind: 'projectile-expired', projectile: a, point });
    }
    return this.events;
  }

  /** All body poses: `POSE_STRIDE` floats per body id (xyz, quaternion xyzw, flags: 1 live, +2
   *  sleeping). A fresh view; don't keep it across calls that may allocate. */
  poses(): Float32Array {
    if (this.disposed) return new Float32Array(0);
    const len = this.raw.sync_poses();
    return new Float32Array(mem(), this.raw.poses_ptr(), len);
  }

  static readonly POSE_STRIDE = POSE_STRIDE;

  // ── Queries ──

  castRay(origin: Vec3Like, dir: Vec3Like, maxToi: number, o: RayOptions = {}): RayHit | null {
    const id = this.raw.cast_ray(
      origin.x,
      origin.y,
      origin.z,
      dir.x,
      dir.y,
      dir.z,
      maxToi,
      o.solid ?? true,
      o.flags ?? 0,
      (o.groups ?? ALL_GROUPS) >>> 0,
      o.groups !== undefined,
      o.excludeBody ? o.excludeBody.handle : -1,
      o.excludeCollider ? o.excludeCollider.handle : -1,
    );
    if (id < 0) return null;
    const out = this.out();
    return {
      collider: this.collider(id),
      timeOfImpact: out[0],
      normal: { x: out[1], y: out[2], z: out[3] },
      point: { x: out[4], y: out[5], z: out[6] },
    };
  }

  createCharacterController(o: KccOptions = {}): CharacterController {
    return new CharacterController(this, this.raw.create_kcc(o.offset ?? 0.02), o);
  }

  // ── Projectiles ──

  spawnProjectile(from: Vec3Like, velocity: Vec3Like, o: { radius: number; ttl: number; groups?: number; excludeBody?: BodyApi | null }): number {
    return this.raw.spawn_projectile(from.x, from.y, from.z, velocity.x, velocity.y, velocity.z, o.radius, o.ttl, (o.groups ?? ALL_GROUPS) >>> 0, o.excludeBody ? o.excludeBody.handle : -1);
  }

  clearProjectiles(): void {
    this.raw.clear_projectiles();
  }

  /** Live projectiles: `[id, x, y, z, radius]` per projectile. A fresh view. */
  projectiles(): Float32Array {
    if (this.disposed) return new Float32Array(0);
    const len = this.raw.sync_projectiles();
    return new Float32Array(mem(), this.raw.projectiles_ptr(), len);
  }

  static readonly PROJECTILE_STRIDE = PROJECTILE_STRIDE;

  get bodyCount(): number {
    return this.raw.body_count();
  }

  get colliderCount(): number {
    return this.raw.collider_count();
  }
}
