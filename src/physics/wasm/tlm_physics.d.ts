/* tslint:disable */
/* eslint-disable */

/**
 * One rapier world plus the id bookkeeping and buffers the JS side reads.
 */
export class Physics {
    free(): void;
    [Symbol.dispose](): void;
    apply_impulse(id: number, x: number, y: number, z: number, wake: boolean): void;
    apply_impulse_at_point(id: number, x: number, y: number, z: number, px: number, py: number, pz: number, wake: boolean): void;
    apply_torque_impulse(id: number, x: number, y: number, z: number, wake: boolean): void;
    /**
     * Insert the pending collider on `body` (or free-standing when `body` is negative).
     * Returns the collider id, or -1 if nothing was pending or the body is gone.
     */
    attach(body: number): number;
    body_count(): number;
    body_exists(id: number): boolean;
    body_type(id: number): number;
    /**
     * Cast a ray. `flags`: rapier `QueryFilterFlags` bits (EXCLUDE_SENSORS = 8, ONLY_FIXED = 6…).
     * `groups`: interaction-group bits, used only when `use_groups`. Returns the hit collider id
     * or -1; on a hit, out[0] = time of impact, out[1..4] = normal, out[4..7] = point.
     */
    cast_ray(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max_toi: number, solid: boolean, flags: number, groups: number, use_groups: boolean, exclude_body: number, exclude_collider: number): number;
    clear_projectiles(): void;
    /**
     * The body a collider is attached to, or -1.
     */
    collider_body(id: number): number;
    collider_count(): number;
    collider_exists(id: number): boolean;
    /**
     * Create a rigid body. `kind`: 0 dynamic, 1 fixed, 2 kinematic (position), 3 kinematic
     * (velocity). `lock_rotations` bits: 1 = x, 2 = y, 4 = z.
     */
    create_body(kind: number, x: number, y: number, z: number, qx: number, qy: number, qz: number, qw: number, ccd: boolean, can_sleep: boolean, linear_damping: number, angular_damping: number, lock_rotations: number, gravity_scale: number): number;
    create_kcc(offset: number): number;
    /**
     * Number of events from the last step (each `EVENT_STRIDE` u32s in `events_ptr`).
     */
    event_count(): number;
    event_points_ptr(): number;
    events_ptr(): number;
    is_sleeping(id: number): boolean;
    /**
     * Configure a controller. Non-positive `autostep_height` / `snap` disable those features.
     * Angles are in radians.
     */
    kcc_config(id: number, slide: boolean, autostep_height: number, autostep_width: number, autostep_dynamic: boolean, snap: number, max_slope_climb: number, min_slope_slide: number): void;
    /**
     * Move the character whose shape is collider `collider` by `(dx, dy, dz)`, sliding along
     * obstacles. Writes the corrected translation to out[0..3], out[3] = grounded (0/1),
     * out[4] = sliding down a slope (0/1). With `apply`, also sets the body's next kinematic
     * translation. With `push_mass > 0`, dynamic bodies it runs into are pushed as by a
     * character of that mass. Returns false if the controller or collider is gone.
     */
    kcc_move(kcc: number, collider: number, dx: number, dy: number, dz: number, flags: number, groups: number, use_groups: boolean, apply: boolean, push_mass: number): boolean;
    mass(id: number): number;
    constructor();
    new_ball(r: number): void;
    /**
     * Capsule along Y (`@react-three/rapier`'s `CapsuleCollider` args order: half height, radius).
     */
    new_capsule(half_height: number, r: number): void;
    new_cone(half_height: number, r: number): void;
    /**
     * Convex hull of points (xyz triplets). False if the hull is degenerate.
     */
    new_convex_hull(points: Float32Array): boolean;
    new_cuboid(hx: number, hy: number, hz: number): void;
    new_cylinder(half_height: number, r: number): void;
    /**
     * Triangle mesh from vertices (xyz triplets) and triangle indices. False if invalid.
     */
    new_trimesh(vertices: Float32Array, indices: Uint32Array): boolean;
    /**
     * Read one scratch value (for callers that don't map WASM memory, such as tests).
     */
    out(i: number): number;
    out_ptr(): number;
    /**
     * `events`: report collision/intersection events for this collider. `all_pairs`: also
     * detect kinematic↔fixed and kinematic↔kinematic pairs (needed for sensors a kinematic
     * character walks into).
     */
    pending_flags(sensor: boolean, events: boolean, all_pairs: boolean): void;
    /**
     * Collision and solver groups in rapier.js bit layout (see `groups_from_bits`).
     */
    pending_groups(collision: number, solver: number): void;
    pending_material(density: number, friction: number, restitution: number): void;
    /**
     * Local pose of the pending collider relative to its body.
     */
    pending_pose(x: number, y: number, z: number, qx: number, qy: number, qz: number, qw: number): void;
    poses_ptr(): number;
    projectile_count(): number;
    projectiles_ptr(): number;
    /**
     * Writes position (out[0..3]) and rotation (out[3..7]); false if the body is gone.
     */
    read_pose(id: number): boolean;
    /**
     * Writes linear velocity (out[0..3]) and angular velocity (out[3..6]).
     */
    read_velocity(id: number): boolean;
    /**
     * Remove a body and every collider attached to it.
     */
    remove_body(id: number): void;
    remove_collider(id: number): void;
    remove_kcc(id: number): void;
    set_angular_damping(id: number, v: number): void;
    set_angvel(id: number, x: number, y: number, z: number, wake: boolean): void;
    set_body_type(id: number, kind: number, wake: boolean): void;
    set_ccd(id: number, on: boolean): void;
    set_collider_enabled(id: number, on: boolean): void;
    set_collision_groups(id: number, bits: number): void;
    set_density(id: number, density: number): void;
    set_enabled_rotations(id: number, x: boolean, y: boolean, z: boolean, wake: boolean): void;
    set_friction(id: number, friction: number): void;
    set_gravity(x: number, y: number, z: number): void;
    set_gravity_scale(id: number, v: number, wake: boolean): void;
    set_linear_damping(id: number, v: number): void;
    set_linvel(id: number, x: number, y: number, z: number, wake: boolean): void;
    set_next_kinematic_rotation(id: number, qx: number, qy: number, qz: number, qw: number): void;
    set_next_kinematic_translation(id: number, x: number, y: number, z: number): void;
    set_rotation(id: number, qx: number, qy: number, qz: number, qw: number, wake: boolean): void;
    set_sensor(id: number, sensor: boolean): void;
    set_solver_groups(id: number, bits: number): void;
    set_timestep(dt: number): void;
    set_translation(id: number, x: number, y: number, z: number, wake: boolean): void;
    sleep(id: number): void;
    /**
     * Launch a projectile: a ball swept through the world every step with a shape cast. It ends
     * on the first collider it touches (`EV_PROJECTILE_HIT`, with the collider id and impact
     * point) or when `ttl` runs out (`EV_PROJECTILE_EXPIRED`). `exclude_body` (≥ 0) is the
     * shooter, which it passes through.
     */
    spawn_projectile(x: number, y: number, z: number, vx: number, vy: number, vz: number, radius: number, ttl: number, groups: number, exclude_body: number): number;
    /**
     * Advance one fixed step: rigid bodies, collision/intersection events, then projectiles.
     */
    step(): void;
    /**
     * Fill the pose buffer for every body id (dead ids get flags 0) and return its length.
     */
    sync_poses(): number;
    /**
     * Fill the projectile buffer (`PROJECTILE_STRIDE` floats each) and return its length.
     */
    sync_projectiles(): number;
    timestep(): number;
    wake_up(id: number): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_physics_free: (a: number, b: number) => void;
    readonly physics_apply_impulse: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly physics_apply_impulse_at_point: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly physics_apply_torque_impulse: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly physics_attach: (a: number, b: number) => number;
    readonly physics_body_count: (a: number) => number;
    readonly physics_body_exists: (a: number, b: number) => number;
    readonly physics_body_type: (a: number, b: number) => number;
    readonly physics_cast_ray: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number) => number;
    readonly physics_clear_projectiles: (a: number) => void;
    readonly physics_collider_body: (a: number, b: number) => number;
    readonly physics_collider_count: (a: number) => number;
    readonly physics_collider_exists: (a: number, b: number) => number;
    readonly physics_create_body: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number) => number;
    readonly physics_create_kcc: (a: number, b: number) => number;
    readonly physics_event_count: (a: number) => number;
    readonly physics_event_points_ptr: (a: number) => number;
    readonly physics_events_ptr: (a: number) => number;
    readonly physics_is_sleeping: (a: number, b: number) => number;
    readonly physics_kcc_config: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly physics_kcc_move: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => number;
    readonly physics_mass: (a: number, b: number) => number;
    readonly physics_new: () => number;
    readonly physics_new_ball: (a: number, b: number) => void;
    readonly physics_new_capsule: (a: number, b: number, c: number) => void;
    readonly physics_new_cone: (a: number, b: number, c: number) => void;
    readonly physics_new_convex_hull: (a: number, b: number, c: number) => number;
    readonly physics_new_cuboid: (a: number, b: number, c: number, d: number) => void;
    readonly physics_new_cylinder: (a: number, b: number, c: number) => void;
    readonly physics_new_trimesh: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly physics_out: (a: number, b: number) => number;
    readonly physics_out_ptr: (a: number) => number;
    readonly physics_pending_flags: (a: number, b: number, c: number, d: number) => void;
    readonly physics_pending_groups: (a: number, b: number, c: number) => void;
    readonly physics_pending_material: (a: number, b: number, c: number, d: number) => void;
    readonly physics_pending_pose: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly physics_poses_ptr: (a: number) => number;
    readonly physics_projectile_count: (a: number) => number;
    readonly physics_projectiles_ptr: (a: number) => number;
    readonly physics_read_pose: (a: number, b: number) => number;
    readonly physics_read_velocity: (a: number, b: number) => number;
    readonly physics_remove_body: (a: number, b: number) => void;
    readonly physics_remove_collider: (a: number, b: number) => void;
    readonly physics_remove_kcc: (a: number, b: number) => void;
    readonly physics_set_angular_damping: (a: number, b: number, c: number) => void;
    readonly physics_set_angvel: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly physics_set_body_type: (a: number, b: number, c: number, d: number) => void;
    readonly physics_set_ccd: (a: number, b: number, c: number) => void;
    readonly physics_set_collider_enabled: (a: number, b: number, c: number) => void;
    readonly physics_set_collision_groups: (a: number, b: number, c: number) => void;
    readonly physics_set_density: (a: number, b: number, c: number) => void;
    readonly physics_set_enabled_rotations: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly physics_set_friction: (a: number, b: number, c: number) => void;
    readonly physics_set_gravity: (a: number, b: number, c: number, d: number) => void;
    readonly physics_set_gravity_scale: (a: number, b: number, c: number, d: number) => void;
    readonly physics_set_linear_damping: (a: number, b: number, c: number) => void;
    readonly physics_set_linvel: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly physics_set_next_kinematic_rotation: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly physics_set_next_kinematic_translation: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly physics_set_rotation: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly physics_set_sensor: (a: number, b: number, c: number) => void;
    readonly physics_set_solver_groups: (a: number, b: number, c: number) => void;
    readonly physics_set_timestep: (a: number, b: number) => void;
    readonly physics_set_translation: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly physics_sleep: (a: number, b: number) => void;
    readonly physics_spawn_projectile: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => number;
    readonly physics_step: (a: number) => void;
    readonly physics_sync_poses: (a: number) => number;
    readonly physics_sync_projectiles: (a: number) => number;
    readonly physics_timestep: (a: number) => number;
    readonly physics_wake_up: (a: number, b: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
