/**
 * A drop-in `@react-three/rapier` for our Rust physics. Vite and TypeScript alias the package name
 * here, so runek's vendored components and runek's `<World>` (which import `@react-three/rapier`)
 * run unmodified on rapier3d compiled from Rust (`./world.ts`, `crates/tlm-physics`).
 *
 * Semantics kept from `@react-three/rapier` that runek relies on:
 * - `<RigidBody>` places its body at the group's world transform and takes its colliders from child
 *   collider components and/or automatic colliders (`colliders="cuboid" | "ball" | "hull" |
 *   "trimesh"`, one per child mesh, default `"cuboid"`).
 * - Child colliders mount before their body (React runs child effects first), so they queue on
 *   the body handle and are created when it exists. StrictMode's effect replay removes and
 *   re-creates everything cleanly.
 * - Bodies step on a fixed timestep; the scene renders an interpolation between the last two steps.
 * - `ref`s are rapier.js-shaped (`BodyApi`/`ColliderApi`), event props get the usual payloads, and
 *   `useRapier()` returns `{ world, rapier }` with rapier.js-style `castRay`, `Ray` and flags.
 */
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { useFrame } from '@react-three/fiber';
import { Box3, Euler, InstancedMesh, Matrix4, Mesh, Object3D, Quaternion, Vector3, type BufferGeometry, type Group } from 'three';
import {
  BodyApi,
  ColliderApi,
  loadPhysics,
  physicsLoaded,
  PhysicsWorld,
  QueryFilterFlags,
  RigidBodyType,
  type ColliderDesc,
  type PhysicsEvent,
  type ShapeDesc,
  type Vec3Like,
} from './world';
import { interactionGroups } from './groups';

export { interactionGroups, QueryFilterFlags, RigidBodyType };
export type RapierRigidBody = BodyApi;
export type RapierCollider = ColliderApi;
type Vec3 = [number, number, number];

// ── Event payloads (shape of @react-three/rapier's) ───────────────────────────────────────────

export interface CollisionTarget {
  rigidBody: BodyApi | undefined;
  collider: ColliderApi;
  rigidBodyObject: Object3D | undefined;
  colliderObject: Object3D | undefined;
}
export interface CollisionPayload {
  target: CollisionTarget;
  other: CollisionTarget;
  /** Not reported by our Rust events (no contact manifold crosses the WASM boundary). */
  manifold: null;
  flipped: boolean;
}
export type CollisionEnterPayload = CollisionPayload;
export type CollisionExitPayload = CollisionPayload;
export type IntersectionEnterPayload = CollisionPayload;
export type IntersectionExitPayload = CollisionPayload;

interface EventHandlers {
  onCollisionEnter?: (p: CollisionPayload) => void;
  onCollisionExit?: (p: CollisionPayload) => void;
  onIntersectionEnter?: (p: CollisionPayload) => void;
  onIntersectionExit?: (p: CollisionPayload) => void;
}
const hasHandlers = (h: EventHandlers) => !!(h.onCollisionEnter || h.onCollisionExit || h.onIntersectionEnter || h.onIntersectionExit);

// ── Physics context ───────────────────────────────────────────────────────────────────────────

type StepCallback = (world: PhysicsWorld) => void;
type EventCallback = (events: readonly PhysicsEvent[], world: PhysicsWorld) => void;

/** What the frame loop syncs into the scene for one body. */
interface Synced {
  body: BodyApi;
  object: Object3D;
  /** For instanced bodies: the mesh and the instance index (and its scale). */
  instanced?: { mesh: InstancedMesh; index: number; scale: Vector3 };
}

interface ColliderRecord {
  collider: ColliderApi;
  object: Object3D | undefined;
  body: BodyApi | undefined;
  bodyObject: Object3D | undefined;
  /** The collider's own handlers win; otherwise its body's. */
  handlers: () => EventHandlers;
}

interface PhysicsState {
  world: PhysicsWorld;
  synced: Map<number, Synced>;
  colliders: Map<number, ColliderRecord>;
  before: Set<{ current: StepCallback }>;
  after: Set<{ current: StepCallback }>;
  events: Set<{ current: EventCallback }>;
  defaultColliders: AutoColliders;
}

const PhysicsContext = createContext<PhysicsState | null>(null);

function usePhysicsState(): PhysicsState {
  const s = useContext(PhysicsContext);
  if (!s) throw new Error('physics hooks must be used inside <Physics>');
  return s;
}

/** Our full physics API (bodies, ray casts, KCC, projectiles) for gameplay code. */
export function usePhysics(): PhysicsWorld {
  return usePhysicsState().world;
}

function useMutableCallback<T>(fn: T) {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return ref;
}

export function useBeforePhysicsStep(cb: StepCallback): void {
  const s = usePhysicsState();
  const ref = useMutableCallback(cb);
  useEffect(() => {
    s.before.add(ref);
    return () => void s.before.delete(ref);
  }, [s, ref]);
}

export function useAfterPhysicsStep(cb: StepCallback): void {
  const s = usePhysicsState();
  const ref = useMutableCallback(cb);
  useEffect(() => {
    s.after.add(ref);
    return () => void s.after.delete(ref);
  }, [s, ref]);
}

/** Every event of every step (projectile hits, raw collisions), after per-collider dispatch. */
export function usePhysicsEvents(cb: EventCallback): void {
  const s = usePhysicsState();
  const ref = useMutableCallback(cb);
  useEffect(() => {
    s.events.add(ref);
    return () => void s.events.delete(ref);
  }, [s, ref]);
}

// rapier.js-compatible surface for `useRapier()` (runek's RouteDriver uses castRay with flags).
class Ray {
  constructor(
    public origin: Vec3Like,
    public dir: Vec3Like,
  ) {}
}
const rapierNamespace = { Ray, QueryFilterFlags, RigidBodyType };

class CompatWorld {
  constructor(private readonly w: PhysicsWorld) {}
  castRay(ray: Ray, maxToi: number, solid = true, flags?: number, groups?: number, excludeCollider?: ColliderApi, excludeBody?: BodyApi) {
    const hit = this.w.castRay(ray.origin, ray.dir, maxToi, { solid, flags, groups, excludeCollider, excludeBody });
    return hit ? { collider: hit.collider, timeOfImpact: hit.timeOfImpact } : null;
  }
  castRayAndGetNormal(ray: Ray, maxToi: number, solid = true, flags?: number, groups?: number, excludeCollider?: ColliderApi, excludeBody?: BodyApi) {
    return this.w.castRay(ray.origin, ray.dir, maxToi, { solid, flags, groups, excludeCollider, excludeBody });
  }
}

export function useRapier() {
  const s = usePhysicsState();
  const world = useMemo(() => new CompatWorld(s.world), [s.world]);
  return { world, rapier: rapierNamespace, physics: s.world };
}

export type AutoColliders = 'cuboid' | 'ball' | 'hull' | 'trimesh' | false;

export interface PhysicsProps {
  gravity?: Vec3;
  paused?: boolean;
  /** Accepted for compatibility; there is no debug renderer. */
  debug?: boolean;
  /** Fixed step in seconds (`"vary"` is treated as 1/60). */
  timeStep?: number | 'vary';
  /** Render an interpolation between the last two steps (default true). */
  interpolate?: boolean;
  /** Default `colliders` for every `<RigidBody>` (default "cuboid", like @react-three/rapier). */
  colliders?: AutoColliders;
  children?: ReactNode;
}

const MAX_FRAME = 0.1;
const tmpM = new Matrix4();
const tmpM2 = new Matrix4();
const tmpP = new Vector3();
const tmpQ = new Quaternion();
const tmpQ2 = new Quaternion();
const tmpS = new Vector3();
const ONE = new Vector3(1, 1, 1);

export function Physics({ gravity = [0, -9.81, 0], paused = false, timeStep = 1 / 60, interpolate = true, colliders = 'cuboid', children }: PhysicsProps) {
  const [state, setState] = useState<PhysicsState | null>(null);
  const [loaded, setLoaded] = useState(physicsLoaded);

  useEffect(() => {
    if (loaded) return;
    let live = true;
    void loadPhysics().then(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [loaded]);

  // One world per mount; StrictMode's replay disposes the first and keeps the second.
  useEffect(() => {
    if (!loaded) return;
    const world = new PhysicsWorld({ x: gravity[0], y: gravity[1], z: gravity[2] });
    setState({ world, synced: new Map(), colliders: new Map(), before: new Set(), after: new Set(), events: new Set(), defaultColliders: colliders });
    return () => {
      world.dispose();
      setState(null);
    };
    // gravity/colliders are applied live below; recreating the world would drop every body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    if (state) state.world.setGravity({ x: gravity[0], y: gravity[1], z: gravity[2] });
  }, [state, gravity[0], gravity[1], gravity[2]]); // eslint-disable-line react-hooks/exhaustive-deps

  const dt = typeof timeStep === 'number' && timeStep > 0 ? timeStep : 1 / 60;
  const clock = useRef({ acc: 0, prev: new Float32Array(0), curr: new Float32Array(0) });

  useFrame((_, delta) => {
    if (!state || state.world.isDisposed) return;
    const { world } = state;
    const c = clock.current;
    world.timestep = dt;
    if (!paused) {
      c.acc += Math.min(delta, MAX_FRAME);
      while (c.acc >= dt) {
        for (const cb of state.before) cb.current(world);
        const events = world.step();
        dispatch(state, events);
        for (const cb of state.events) cb.current(events, world);
        for (const cb of state.after) cb.current(world);
        c.acc -= dt;
        c.prev = c.curr;
        c.curr = world.poses().slice();
      }
    }
    if (c.curr.length === 0) c.curr = world.poses().slice();
    const alpha = interpolate && !paused ? c.acc / dt : 1;
    syncScene(state, c.prev, c.curr, alpha);
  }, -0.5);

  if (!state) return null;
  return <PhysicsContext.Provider value={state}>{children}</PhysicsContext.Provider>;
}

/** Write each moving body's (interpolated) pose into its Object3D or instance. */
function syncScene(state: PhysicsState, prev: Float32Array, curr: Float32Array, alpha: number) {
  const S = PhysicsWorld.POSE_STRIDE;
  for (const s of state.synced.values()) {
    const i = s.body.handle * S;
    if (i + S > curr.length || curr[i + 7] < 1) continue;
    const t = s.body.bodyType();
    if (t === RigidBodyType.Fixed && !s.instanced) continue;
    const hasPrev = i + S <= prev.length && prev[i + 7] >= 1;
    if (hasPrev && alpha < 1) {
      tmpP.set(prev[i] + (curr[i] - prev[i]) * alpha, prev[i + 1] + (curr[i + 1] - prev[i + 1]) * alpha, prev[i + 2] + (curr[i + 2] - prev[i + 2]) * alpha);
      tmpQ.set(prev[i + 3], prev[i + 4], prev[i + 5], prev[i + 6]).slerp(tmpQ2.set(curr[i + 3], curr[i + 4], curr[i + 5], curr[i + 6]), alpha);
    } else {
      tmpP.set(curr[i], curr[i + 1], curr[i + 2]);
      tmpQ.set(curr[i + 3], curr[i + 4], curr[i + 5], curr[i + 6]);
    }
    if (s.instanced) {
      const { mesh, index, scale } = s.instanced;
      mesh.updateWorldMatrix(true, false);
      tmpM.compose(tmpP, tmpQ, scale);
      tmpM2.copy(mesh.matrixWorld).invert().multiply(tmpM);
      mesh.setMatrixAt(index, tmpM2);
      mesh.instanceMatrix.needsUpdate = true;
      continue;
    }
    const o = s.object;
    const parent = o.parent;
    if (!parent) continue;
    parent.updateWorldMatrix(true, false);
    if (isIdentity(parent.matrixWorld)) {
      o.position.copy(tmpP);
      o.quaternion.copy(tmpQ);
    } else {
      tmpM.compose(tmpP, tmpQ, ONE);
      tmpM2.copy(parent.matrixWorld).invert().multiply(tmpM);
      tmpM2.decompose(o.position, o.quaternion, tmpS);
    }
  }
}

const IDENTITY = new Matrix4();
function isIdentity(m: Matrix4) {
  return m.equals(IDENTITY);
}

function dispatch(state: PhysicsState, events: readonly PhysicsEvent[]) {
  for (const e of events) {
    if (e.kind !== 'collision') continue;
    const a = state.colliders.get(e.a);
    const b = state.colliders.get(e.b);
    if (!a || !b) continue;
    fire(a, b, e.started, e.sensor, false);
    fire(b, a, e.started, e.sensor, true);
  }
}

function target(r: ColliderRecord): CollisionTarget {
  return { rigidBody: r.body, collider: r.collider, rigidBodyObject: r.bodyObject, colliderObject: r.object };
}

function fire(self: ColliderRecord, other: ColliderRecord, started: boolean, sensor: boolean, flipped: boolean) {
  const h = self.handlers();
  const cb = sensor ? (started ? h.onIntersectionEnter : h.onIntersectionExit) : started ? h.onCollisionEnter : h.onCollisionExit;
  cb?.({ target: target(self), other: target(other), manifold: null, flipped });
}

// ── Bodies ────────────────────────────────────────────────────────────────────────────────────

/** A body that colliders attach to once it exists (child collider effects run before ours). */
class BodyHandle {
  body: BodyApi | null = null;
  object: Object3D | null = null;
  private queue = new Set<ColliderReg>();
  handlers: { current: EventHandlers } = { current: {} };
  wantsEvents = () => hasHandlers(this.handlers.current);

  add(reg: ColliderReg) {
    if (this.body) reg.create(this);
    else this.queue.add(reg);
  }
  drop(reg: ColliderReg) {
    this.queue.delete(reg);
  }
  flush() {
    for (const reg of this.queue) reg.create(this);
    this.queue.clear();
  }
}

interface ColliderReg {
  create(handle: BodyHandle | null): void;
}

const BodyContext = createContext<BodyHandle | null>(null);

type BodyTypeName = 'dynamic' | 'fixed' | 'kinematicPosition' | 'kinematicVelocity';
const BODY_TYPES: Record<BodyTypeName, RigidBodyType> = {
  dynamic: RigidBodyType.Dynamic,
  fixed: RigidBodyType.Fixed,
  kinematicPosition: RigidBodyType.KinematicPositionBased,
  kinematicVelocity: RigidBodyType.KinematicVelocityBased,
};

interface MaterialProps {
  density?: number;
  friction?: number;
  restitution?: number;
  collisionGroups?: number;
  solverGroups?: number;
  sensor?: boolean;
}

export interface RigidBodyOptions extends MaterialProps, EventHandlers {
  type?: BodyTypeName;
  colliders?: AutoColliders;
  ccd?: boolean;
  canSleep?: boolean;
  linearDamping?: number;
  angularDamping?: number;
  gravityScale?: number;
  enabledRotations?: [boolean, boolean, boolean];
  lockRotations?: boolean;
  /** Include invisible meshes when generating automatic colliders. */
  includeInvisible?: boolean;
  userData?: Record<string, unknown>;
  name?: string;
}

export interface RigidBodyProps extends RigidBodyOptions {
  position?: Vec3;
  rotation?: Vec3;
  quaternion?: [number, number, number, number];
  ref?: Ref<BodyApi | null>;
  children?: ReactNode;
}

function assignRef<T>(ref: Ref<T | null> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === 'function') ref(value);
  else (ref as { current: T | null }).current = value;
}

function worldPose(o: Object3D) {
  o.updateWorldMatrix(true, false);
  const p = new Vector3();
  const q = new Quaternion();
  o.matrixWorld.decompose(p, q, new Vector3());
  return { position: { x: p.x, y: p.y, z: p.z }, rotation: { x: q.x, y: q.y, z: q.z, w: q.w } };
}

function bodyDesc(o: RigidBodyOptions, pose: ReturnType<typeof worldPose>) {
  return {
    type: BODY_TYPES[o.type ?? 'dynamic'],
    ...pose,
    ccd: o.ccd,
    canSleep: o.canSleep,
    linearDamping: o.linearDamping,
    angularDamping: o.angularDamping,
    gravityScale: o.gravityScale,
    enabledRotations: o.lockRotations ? ([false, false, false] as [boolean, boolean, boolean]) : o.enabledRotations,
  };
}

export function RigidBody({ ref, children, position, rotation, quaternion, name, ...options }: RigidBodyProps) {
  const s = usePhysicsState();
  const group = useRef<Group>(null);
  const [handle] = useState(() => new BodyHandle());
  handle.handlers.current = options;
  const opts = useMutableCallback(options);

  useLayoutEffect(() => {
    const g = group.current;
    if (!g) return;
    g.userData.__rigidBody = true;
    const o = opts.current;
    const body = s.world.createBody(bodyDesc(o, worldPose(g)));
    body.userData = o.userData ?? {};
    handle.body = body;
    handle.object = g;
    s.synced.set(body.handle, { body, object: g });
    handle.flush();
    const auto = o.colliders ?? s.defaultColliders;
    const autoColliders = auto ? autoCollidersFor(s, handle, g, auto, o) : [];
    assignRef(ref, body);
    return () => {
      assignRef(ref, null);
      for (const c of autoColliders) s.colliders.delete(c.handle);
      s.synced.delete(body.handle);
      s.world.removeBody(body);
      handle.body = null;
    };
    // Re-created only on remount (keyed by the caller), like @react-three/rapier.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  // Live updates that don't need a new body.
  const type = options.type ?? 'dynamic';
  useEffect(() => {
    handle.body?.setBodyType(BODY_TYPES[type], true);
  }, [handle, type]);
  const poseKey = JSON.stringify([position, rotation, quaternion]);
  const firstPose = useRef(true);
  useEffect(() => {
    if (firstPose.current) {
      firstPose.current = false;
      return;
    }
    const g = group.current;
    if (!g || !handle.body) return;
    const p = worldPose(g);
    handle.body.setTranslation(p.position, true);
    handle.body.setRotation(p.rotation, true);
  }, [handle, poseKey]);

  return (
    <group ref={group} name={name} position={position} rotation={rotation} quaternion={quaternion}>
      <BodyContext.Provider value={handle}>{children}</BodyContext.Provider>
    </group>
  );
}

/** One collider per child mesh (not descending into nested bodies), like @react-three/rapier. */
function autoCollidersFor(s: PhysicsState, handle: BodyHandle, root: Object3D, kind: Exclude<AutoColliders, false>, o: RigidBodyOptions): ColliderApi[] {
  const out: ColliderApi[] = [];
  root.updateWorldMatrix(true, true);
  const inv = new Matrix4().copy(root.matrixWorld).invert();
  const visit = (obj: Object3D) => {
    for (const child of obj.children) {
      if (child.userData.__rigidBody) continue;
      if (!o.includeInvisible && !child.visible) continue;
      if (child instanceof Mesh && !(child instanceof InstancedMesh)) {
        const local = new Matrix4().multiplyMatrices(inv, child.matrixWorld);
        const shape = meshShape(child.geometry, kind, local);
        if (shape) {
          const c = createCollider(s, handle, shape.shape, { ...shape.desc, ...material(o) }, child);
          if (c) out.push(c);
        }
      }
      visit(child);
    }
  };
  visit(root);
  return out;
}

/** A mesh's collider shape in body space. Cuboid/ball use the scaled bounding box; hull and
 *  trimesh bake the full mesh transform into the vertices. */
function meshShape(geometry: BufferGeometry, kind: Exclude<AutoColliders, false>, local: Matrix4): { shape: ShapeDesc; desc: ColliderDesc } | null {
  const pos = geometry.getAttribute('position');
  if (!pos) return null;
  if (kind === 'hull' || kind === 'trimesh') {
    const v = new Float32Array(pos.count * 3);
    const p = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(local);
      v.set([p.x, p.y, p.z], i * 3);
    }
    if (kind === 'hull') return { shape: { shape: 'convexHull', points: v }, desc: {} };
    const idx = geometry.index ? Uint32Array.from(geometry.index.array as ArrayLike<number>) : Uint32Array.from({ length: pos.count }, (_, i) => i);
    return { shape: { shape: 'trimesh', vertices: v, indices: idx }, desc: {} };
  }
  geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? new Box3();
  const t = new Vector3();
  const q = new Quaternion();
  const sc = new Vector3();
  local.decompose(t, q, sc);
  const size = box.getSize(new Vector3()).multiply(sc).multiplyScalar(0.5);
  const center = box.getCenter(new Vector3()).multiply(sc).applyQuaternion(q).add(t);
  const desc: ColliderDesc = { position: { x: center.x, y: center.y, z: center.z }, rotation: { x: q.x, y: q.y, z: q.z, w: q.w } };
  if (kind === 'ball') return { shape: { shape: 'ball', radius: Math.max(size.x, size.y, size.z) }, desc };
  return { shape: { shape: 'cuboid', halfExtents: [Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)] }, desc };
}

function material(o: MaterialProps): ColliderDesc {
  return { density: o.density, friction: o.friction, restitution: o.restitution, collisionGroups: o.collisionGroups, solverGroups: o.solverGroups, sensor: o.sensor };
}

function createCollider(s: PhysicsState, handle: BodyHandle | null, shape: ShapeDesc, desc: ColliderDesc, object: Object3D | undefined, own?: { current: EventHandlers }): ColliderApi | null {
  const wantsEvents = !!(own && hasHandlers(own.current)) || !!handle?.wantsEvents();
  const c = s.world.createCollider(shape, { ...desc, events: desc.events || wantsEvents, allPairs: desc.allPairs || !!desc.sensor }, handle?.body ?? null);
  if (!c) return null;
  s.colliders.set(c.handle, {
    collider: c,
    object,
    body: handle?.body ?? undefined,
    bodyObject: handle?.object ?? undefined,
    handlers: () => (own && hasHandlers(own.current) ? own.current : (handle?.handlers.current ?? {})),
  });
  return c;
}

// ── Collider components ───────────────────────────────────────────────────────────────────────

export interface ColliderProps extends MaterialProps, EventHandlers {
  position?: Vec3;
  rotation?: Vec3;
  quaternion?: [number, number, number, number];
  ref?: Ref<ColliderApi | null>;
  name?: string;
  /** Report events even without handlers (for `usePhysicsEvents` consumers). */
  activeEvents?: boolean;
}

function useCollider(shape: ShapeDesc, key: string, props: ColliderProps) {
  const s = usePhysicsState();
  const handle = useContext(BodyContext);
  const object = useRef<Object3D>(null);
  const own = useMutableCallback<EventHandlers>(props);
  const p = useMutableCallback(props);

  useLayoutEffect(() => {
    let collider: ColliderApi | null = null;
    const reg: ColliderReg = {
      create: (h) => {
        const o = object.current;
        if (!o) return;
        // Pose relative to the body's group (or the world, for a free collider).
        o.updateWorldMatrix(true, false);
        const local = new Matrix4();
        if (h?.object) {
          h.object.updateWorldMatrix(true, false);
          local.copy(h.object.matrixWorld).invert().multiply(o.matrixWorld);
        } else local.copy(o.matrixWorld);
        const t = new Vector3();
        const q = new Quaternion();
        local.decompose(t, q, new Vector3());
        collider = createCollider(s, h, shape, { position: { x: t.x, y: t.y, z: t.z }, rotation: { x: q.x, y: q.y, z: q.z, w: q.w }, ...material(p.current), events: !!p.current.activeEvents }, o, own);
        assignRef(p.current.ref, collider);
      },
    };
    if (handle) handle.add(reg);
    else reg.create(null);
    return () => {
      handle?.drop(reg);
      if (collider) {
        s.colliders.delete(collider.handle);
        s.world.removeCollider(collider);
        assignRef(p.current.ref, null);
      }
    };
    // `key` encodes the shape args: new args, new collider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, handle, key]);

  return <object3D ref={object} name={props.name} position={props.position} rotation={props.rotation} quaternion={props.quaternion} />;
}

export function CuboidCollider({ args, ...props }: ColliderProps & { args: Vec3 }) {
  return useCollider({ shape: 'cuboid', halfExtents: args }, `c${args.join()}`, props);
}
export function BallCollider({ args, ...props }: ColliderProps & { args: [number] }) {
  return useCollider({ shape: 'ball', radius: args[0] }, `b${args[0]}`, props);
}
export function CapsuleCollider({ args, ...props }: ColliderProps & { args: [number, number] }) {
  return useCollider({ shape: 'capsule', halfHeight: args[0], radius: args[1] }, `p${args.join()}`, props);
}
export function CylinderCollider({ args, ...props }: ColliderProps & { args: [number, number] }) {
  return useCollider({ shape: 'cylinder', halfHeight: args[0], radius: args[1] }, `y${args.join()}`, props);
}
export function ConeCollider({ args, ...props }: ColliderProps & { args: [number, number] }) {
  return useCollider({ shape: 'cone', halfHeight: args[0], radius: args[1] }, `n${args.join()}`, props);
}
export function ConvexHullCollider({ args, ...props }: ColliderProps & { args: [ArrayLike<number>] }) {
  const points = useMemo(() => Float32Array.from(args[0]), [args]);
  return useCollider({ shape: 'convexHull', points }, `h${points.length}:${points[0]}:${points[points.length - 1]}`, props);
}
export function TrimeshCollider({ args, ...props }: ColliderProps & { args: [ArrayLike<number>, ArrayLike<number>] }) {
  const vertices = useMemo(() => Float32Array.from(args[0]), [args]);
  const indices = useMemo(() => Uint32Array.from(args[1]), [args]);
  return useCollider({ shape: 'trimesh', vertices, indices }, `t${vertices.length}:${indices.length}:${vertices[0]}:${vertices[vertices.length - 1]}`, props);
}

// ── Instanced bodies ──────────────────────────────────────────────────────────────────────────

export interface InstancedRigidBodyProps extends RigidBodyOptions {
  key: string | number;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}

export interface InstancedRigidBodiesProps extends RigidBodyOptions {
  instances: InstancedRigidBodyProps[];
  ref?: Ref<(BodyApi | null)[] | null>;
  children: ReactNode;
}

/**
 * One body per instance of the child `<instancedMesh>`, each with an automatic collider from the
 * mesh geometry (scaled per instance), driving the instance matrices.
 */
export function InstancedRigidBodies({ instances, ref, children, ...options }: InstancedRigidBodiesProps) {
  const s = usePhysicsState();
  const group = useRef<Group>(null);
  const opts = useMutableCallback(options);
  const key = useMemo(() => JSON.stringify(instances.map((i) => [i.key, i.position, i.rotation, i.scale])), [instances]);

  useLayoutEffect(() => {
    const g = group.current;
    if (!g) return;
    let mesh: InstancedMesh | null = null;
    g.traverse((o) => {
      if (!mesh && o instanceof InstancedMesh) mesh = o as InstancedMesh;
    });
    const m = mesh as InstancedMesh | null;
    if (!m) return;
    m.frustumCulled = false; // instances leave the original bounds as they scatter
    g.updateWorldMatrix(true, true);
    const o = opts.current;
    const kind = o.colliders ?? s.defaultColliders;
    const bodies: BodyApi[] = [];
    const meshWorld = m.matrixWorld.clone();
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      const io = { ...o, ...inst };
      const scale = new Vector3(...(inst.scale ?? [1, 1, 1]));
      const local = new Matrix4().compose(new Vector3(...(inst.position ?? [0, 0, 0])), new Quaternion().setFromEuler(new Euler(...(inst.rotation ?? [0, 0, 0]))), scale);
      const world = new Matrix4().multiplyMatrices(meshWorld, local);
      const p = new Vector3();
      const q = new Quaternion();
      world.decompose(p, q, new Vector3());
      const body = s.world.createBody(bodyDesc(io, { position: { x: p.x, y: p.y, z: p.z }, rotation: { x: q.x, y: q.y, z: q.z, w: q.w } }));
      const handle = new BodyHandle();
      handle.body = body;
      handle.object = m;
      handle.handlers.current = io;
      if (kind) {
        const shape = meshShape(m.geometry, kind, new Matrix4().makeScale(scale.x, scale.y, scale.z));
        if (shape) createCollider(s, handle, shape.shape, { ...shape.desc, ...material(io) }, m);
      }
      s.synced.set(body.handle, { body, object: m, instanced: { mesh: m, index: i, scale } });
      bodies.push(body);
    }
    assignRef(ref, bodies);
    return () => {
      assignRef(ref, null);
      for (const b of bodies) {
        s.synced.delete(b.handle);
        s.world.removeBody(b);
      }
      for (const [id, rec] of s.colliders) if (rec.object === m && bodies.includes(rec.body as BodyApi)) s.colliders.delete(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, key]);

  return <group ref={group}>{children}</group>;
}

// ── Sensors from hooks ────────────────────────────────────────────────────────────────────────

export interface SensorHandlers {
  onEnter?: (other: ColliderApi) => void;
  onExit?: (other: ColliderApi) => void;
}

/**
 * A free-standing rapier sensor at a world position (`at` null = none). Its intersection events
 * with any collider its groups accept call `onEnter`/`onExit` with the other collider. Kinematic
 * characters trigger it (sensors always test kinematic↔fixed pairs).
 */
export function useSensor(shape: ShapeDesc, at: Vec3Like | null, handlers: SensorHandlers, collisionGroups?: number): void {
  const s = usePhysicsState();
  const own = useMutableCallback<EventHandlers>({
    onIntersectionEnter: (p) => handlers.onEnter?.(p.other.collider),
    onIntersectionExit: (p) => handlers.onExit?.(p.other.collider),
  });
  const key = JSON.stringify([shape, at, collisionGroups]);
  useLayoutEffect(() => {
    if (!at) return;
    const c = createCollider(s, null, shape, { position: at, sensor: true, collisionGroups, events: true }, undefined, own);
    return () => {
      if (!c) return;
      s.colliders.delete(c.handle);
      s.world.removeCollider(c);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, key]);
}

/** A sensor that follows a kinematic body you move (`ref.current.setNextKinematicTranslation`). */
export function useMovingSensor(shape: ShapeDesc, handlers: SensorHandlers, collisionGroups?: number) {
  const s = usePhysicsState();
  const body = useRef<BodyApi | null>(null);
  const own = useMutableCallback<EventHandlers>({
    onIntersectionEnter: (p) => handlers.onEnter?.(p.other.collider),
    onIntersectionExit: (p) => handlers.onExit?.(p.other.collider),
  });
  const key = JSON.stringify([shape, collisionGroups]);
  useLayoutEffect(() => {
    const b = s.world.createBody({ type: RigidBodyType.KinematicPositionBased, position: { x: 0, y: -50, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } });
    const h = new BodyHandle();
    h.body = b;
    createCollider(s, h, shape, { sensor: true, collisionGroups, events: true }, undefined, own);
    body.current = b;
    return () => {
      body.current = null;
      for (const [id, rec] of s.colliders) if (rec.body === b) s.colliders.delete(id);
      s.world.removeBody(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, key]);
  return body;
}
