/* @ts-self-types="./tlm_physics.d.ts" */

/**
 * One rapier world plus the id bookkeeping and buffers the JS side reads.
 */
export class Physics {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PhysicsFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_physics_free(ptr, 0);
    }
    /**
     * @param {number} id
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {boolean} wake
     */
    apply_impulse(id, x, y, z, wake) {
        wasm.physics_apply_impulse(this.__wbg_ptr, id, x, y, z, wake);
    }
    /**
     * @param {number} id
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} px
     * @param {number} py
     * @param {number} pz
     * @param {boolean} wake
     */
    apply_impulse_at_point(id, x, y, z, px, py, pz, wake) {
        wasm.physics_apply_impulse_at_point(this.__wbg_ptr, id, x, y, z, px, py, pz, wake);
    }
    /**
     * @param {number} id
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {boolean} wake
     */
    apply_torque_impulse(id, x, y, z, wake) {
        wasm.physics_apply_torque_impulse(this.__wbg_ptr, id, x, y, z, wake);
    }
    /**
     * Insert the pending collider on `body` (or free-standing when `body` is negative).
     * Returns the collider id, or -1 if nothing was pending or the body is gone.
     * @param {number} body
     * @returns {number}
     */
    attach(body) {
        const ret = wasm.physics_attach(this.__wbg_ptr, body);
        return ret;
    }
    /**
     * @returns {number}
     */
    body_count() {
        const ret = wasm.physics_body_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} id
     * @returns {boolean}
     */
    body_exists(id) {
        const ret = wasm.physics_body_exists(this.__wbg_ptr, id);
        return ret !== 0;
    }
    /**
     * @param {number} id
     * @returns {number}
     */
    body_type(id) {
        const ret = wasm.physics_body_type(this.__wbg_ptr, id);
        return ret;
    }
    /**
     * Cast a ray. `flags`: rapier `QueryFilterFlags` bits (EXCLUDE_SENSORS = 8, ONLY_FIXED = 6…).
     * `groups`: interaction-group bits, used only when `use_groups`. Returns the hit collider id
     * or -1; on a hit, out[0] = time of impact, out[1..4] = normal, out[4..7] = point.
     * @param {number} ox
     * @param {number} oy
     * @param {number} oz
     * @param {number} dx
     * @param {number} dy
     * @param {number} dz
     * @param {number} max_toi
     * @param {boolean} solid
     * @param {number} flags
     * @param {number} groups
     * @param {boolean} use_groups
     * @param {number} exclude_body
     * @param {number} exclude_collider
     * @returns {number}
     */
    cast_ray(ox, oy, oz, dx, dy, dz, max_toi, solid, flags, groups, use_groups, exclude_body, exclude_collider) {
        const ret = wasm.physics_cast_ray(this.__wbg_ptr, ox, oy, oz, dx, dy, dz, max_toi, solid, flags, groups, use_groups, exclude_body, exclude_collider);
        return ret;
    }
    clear_projectiles() {
        wasm.physics_clear_projectiles(this.__wbg_ptr);
    }
    /**
     * The body a collider is attached to, or -1.
     * @param {number} id
     * @returns {number}
     */
    collider_body(id) {
        const ret = wasm.physics_collider_body(this.__wbg_ptr, id);
        return ret;
    }
    /**
     * @returns {number}
     */
    collider_count() {
        const ret = wasm.physics_collider_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} id
     * @returns {boolean}
     */
    collider_exists(id) {
        const ret = wasm.physics_collider_exists(this.__wbg_ptr, id);
        return ret !== 0;
    }
    /**
     * Create a rigid body. `kind`: 0 dynamic, 1 fixed, 2 kinematic (position), 3 kinematic
     * (velocity). `lock_rotations` bits: 1 = x, 2 = y, 4 = z.
     * @param {number} kind
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} qx
     * @param {number} qy
     * @param {number} qz
     * @param {number} qw
     * @param {boolean} ccd
     * @param {boolean} can_sleep
     * @param {number} linear_damping
     * @param {number} angular_damping
     * @param {number} lock_rotations
     * @param {number} gravity_scale
     * @returns {number}
     */
    create_body(kind, x, y, z, qx, qy, qz, qw, ccd, can_sleep, linear_damping, angular_damping, lock_rotations, gravity_scale) {
        const ret = wasm.physics_create_body(this.__wbg_ptr, kind, x, y, z, qx, qy, qz, qw, ccd, can_sleep, linear_damping, angular_damping, lock_rotations, gravity_scale);
        return ret >>> 0;
    }
    /**
     * @param {number} offset
     * @returns {number}
     */
    create_kcc(offset) {
        const ret = wasm.physics_create_kcc(this.__wbg_ptr, offset);
        return ret >>> 0;
    }
    /**
     * Number of events from the last step (each `EVENT_STRIDE` u32s in `events_ptr`).
     * @returns {number}
     */
    event_count() {
        const ret = wasm.physics_event_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    event_points_ptr() {
        const ret = wasm.physics_event_points_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    events_ptr() {
        const ret = wasm.physics_events_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} id
     * @returns {boolean}
     */
    is_sleeping(id) {
        const ret = wasm.physics_is_sleeping(this.__wbg_ptr, id);
        return ret !== 0;
    }
    /**
     * Configure a controller. Non-positive `autostep_height` / `snap` disable those features.
     * Angles are in radians.
     * @param {number} id
     * @param {boolean} slide
     * @param {number} autostep_height
     * @param {number} autostep_width
     * @param {boolean} autostep_dynamic
     * @param {number} snap
     * @param {number} max_slope_climb
     * @param {number} min_slope_slide
     */
    kcc_config(id, slide, autostep_height, autostep_width, autostep_dynamic, snap, max_slope_climb, min_slope_slide) {
        wasm.physics_kcc_config(this.__wbg_ptr, id, slide, autostep_height, autostep_width, autostep_dynamic, snap, max_slope_climb, min_slope_slide);
    }
    /**
     * Move the character whose shape is collider `collider` by `(dx, dy, dz)`, sliding along
     * obstacles. Writes the corrected translation to out[0..3], out[3] = grounded (0/1),
     * out[4] = sliding down a slope (0/1). With `apply`, also sets the body's next kinematic
     * translation. With `push_mass > 0`, dynamic bodies it runs into are pushed as by a
     * character of that mass. Returns false if the controller or collider is gone.
     * @param {number} kcc
     * @param {number} collider
     * @param {number} dx
     * @param {number} dy
     * @param {number} dz
     * @param {number} flags
     * @param {number} groups
     * @param {boolean} use_groups
     * @param {boolean} apply
     * @param {number} push_mass
     * @returns {boolean}
     */
    kcc_move(kcc, collider, dx, dy, dz, flags, groups, use_groups, apply, push_mass) {
        const ret = wasm.physics_kcc_move(this.__wbg_ptr, kcc, collider, dx, dy, dz, flags, groups, use_groups, apply, push_mass);
        return ret !== 0;
    }
    /**
     * @param {number} id
     * @returns {number}
     */
    mass(id) {
        const ret = wasm.physics_mass(this.__wbg_ptr, id);
        return ret;
    }
    constructor() {
        const ret = wasm.physics_new();
        this.__wbg_ptr = ret;
        PhysicsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} r
     */
    new_ball(r) {
        wasm.physics_new_ball(this.__wbg_ptr, r);
    }
    /**
     * Capsule along Y (`@react-three/rapier`'s `CapsuleCollider` args order: half height, radius).
     * @param {number} half_height
     * @param {number} r
     */
    new_capsule(half_height, r) {
        wasm.physics_new_capsule(this.__wbg_ptr, half_height, r);
    }
    /**
     * @param {number} half_height
     * @param {number} r
     */
    new_cone(half_height, r) {
        wasm.physics_new_cone(this.__wbg_ptr, half_height, r);
    }
    /**
     * Convex hull of points (xyz triplets). False if the hull is degenerate.
     * @param {Float32Array} points
     * @returns {boolean}
     */
    new_convex_hull(points) {
        const ptr0 = passArrayF32ToWasm0(points, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.physics_new_convex_hull(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @param {number} hx
     * @param {number} hy
     * @param {number} hz
     */
    new_cuboid(hx, hy, hz) {
        wasm.physics_new_cuboid(this.__wbg_ptr, hx, hy, hz);
    }
    /**
     * @param {number} half_height
     * @param {number} r
     */
    new_cylinder(half_height, r) {
        wasm.physics_new_cylinder(this.__wbg_ptr, half_height, r);
    }
    /**
     * Triangle mesh from vertices (xyz triplets) and triangle indices. False if invalid.
     * @param {Float32Array} vertices
     * @param {Uint32Array} indices
     * @returns {boolean}
     */
    new_trimesh(vertices, indices) {
        const ptr0 = passArrayF32ToWasm0(vertices, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(indices, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.physics_new_trimesh(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret !== 0;
    }
    /**
     * Read one scratch value (for callers that don't map WASM memory, such as tests).
     * @param {number} i
     * @returns {number}
     */
    out(i) {
        const ret = wasm.physics_out(this.__wbg_ptr, i);
        return ret;
    }
    /**
     * @returns {number}
     */
    out_ptr() {
        const ret = wasm.physics_out_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * `events`: report collision/intersection events for this collider. `all_pairs`: also
     * detect kinematic↔fixed and kinematic↔kinematic pairs (needed for sensors a kinematic
     * character walks into).
     * @param {boolean} sensor
     * @param {boolean} events
     * @param {boolean} all_pairs
     */
    pending_flags(sensor, events, all_pairs) {
        wasm.physics_pending_flags(this.__wbg_ptr, sensor, events, all_pairs);
    }
    /**
     * Collision and solver groups in rapier.js bit layout (see `groups_from_bits`).
     * @param {number} collision
     * @param {number} solver
     */
    pending_groups(collision, solver) {
        wasm.physics_pending_groups(this.__wbg_ptr, collision, solver);
    }
    /**
     * @param {number} density
     * @param {number} friction
     * @param {number} restitution
     */
    pending_material(density, friction, restitution) {
        wasm.physics_pending_material(this.__wbg_ptr, density, friction, restitution);
    }
    /**
     * Local pose of the pending collider relative to its body.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} qx
     * @param {number} qy
     * @param {number} qz
     * @param {number} qw
     */
    pending_pose(x, y, z, qx, qy, qz, qw) {
        wasm.physics_pending_pose(this.__wbg_ptr, x, y, z, qx, qy, qz, qw);
    }
    /**
     * @returns {number}
     */
    poses_ptr() {
        const ret = wasm.physics_poses_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    projectile_count() {
        const ret = wasm.physics_projectile_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    projectiles_ptr() {
        const ret = wasm.physics_projectiles_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Writes position (out[0..3]) and rotation (out[3..7]); false if the body is gone.
     * @param {number} id
     * @returns {boolean}
     */
    read_pose(id) {
        const ret = wasm.physics_read_pose(this.__wbg_ptr, id);
        return ret !== 0;
    }
    /**
     * Writes linear velocity (out[0..3]) and angular velocity (out[3..6]).
     * @param {number} id
     * @returns {boolean}
     */
    read_velocity(id) {
        const ret = wasm.physics_read_velocity(this.__wbg_ptr, id);
        return ret !== 0;
    }
    /**
     * Remove a body and every collider attached to it.
     * @param {number} id
     */
    remove_body(id) {
        wasm.physics_remove_body(this.__wbg_ptr, id);
    }
    /**
     * @param {number} id
     */
    remove_collider(id) {
        wasm.physics_remove_collider(this.__wbg_ptr, id);
    }
    /**
     * @param {number} id
     */
    remove_kcc(id) {
        wasm.physics_remove_kcc(this.__wbg_ptr, id);
    }
    /**
     * @param {number} id
     * @param {number} v
     */
    set_angular_damping(id, v) {
        wasm.physics_set_angular_damping(this.__wbg_ptr, id, v);
    }
    /**
     * @param {number} id
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {boolean} wake
     */
    set_angvel(id, x, y, z, wake) {
        wasm.physics_set_angvel(this.__wbg_ptr, id, x, y, z, wake);
    }
    /**
     * @param {number} id
     * @param {number} kind
     * @param {boolean} wake
     */
    set_body_type(id, kind, wake) {
        wasm.physics_set_body_type(this.__wbg_ptr, id, kind, wake);
    }
    /**
     * @param {number} id
     * @param {boolean} on
     */
    set_ccd(id, on) {
        wasm.physics_set_ccd(this.__wbg_ptr, id, on);
    }
    /**
     * @param {number} id
     * @param {boolean} on
     */
    set_collider_enabled(id, on) {
        wasm.physics_set_collider_enabled(this.__wbg_ptr, id, on);
    }
    /**
     * @param {number} id
     * @param {number} bits
     */
    set_collision_groups(id, bits) {
        wasm.physics_set_collision_groups(this.__wbg_ptr, id, bits);
    }
    /**
     * @param {number} id
     * @param {number} density
     */
    set_density(id, density) {
        wasm.physics_set_density(this.__wbg_ptr, id, density);
    }
    /**
     * @param {number} id
     * @param {boolean} x
     * @param {boolean} y
     * @param {boolean} z
     * @param {boolean} wake
     */
    set_enabled_rotations(id, x, y, z, wake) {
        wasm.physics_set_enabled_rotations(this.__wbg_ptr, id, x, y, z, wake);
    }
    /**
     * @param {number} id
     * @param {number} friction
     */
    set_friction(id, friction) {
        wasm.physics_set_friction(this.__wbg_ptr, id, friction);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_gravity(x, y, z) {
        wasm.physics_set_gravity(this.__wbg_ptr, x, y, z);
    }
    /**
     * @param {number} id
     * @param {number} v
     * @param {boolean} wake
     */
    set_gravity_scale(id, v, wake) {
        wasm.physics_set_gravity_scale(this.__wbg_ptr, id, v, wake);
    }
    /**
     * @param {number} id
     * @param {number} v
     */
    set_linear_damping(id, v) {
        wasm.physics_set_linear_damping(this.__wbg_ptr, id, v);
    }
    /**
     * @param {number} id
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {boolean} wake
     */
    set_linvel(id, x, y, z, wake) {
        wasm.physics_set_linvel(this.__wbg_ptr, id, x, y, z, wake);
    }
    /**
     * @param {number} id
     * @param {number} qx
     * @param {number} qy
     * @param {number} qz
     * @param {number} qw
     */
    set_next_kinematic_rotation(id, qx, qy, qz, qw) {
        wasm.physics_set_next_kinematic_rotation(this.__wbg_ptr, id, qx, qy, qz, qw);
    }
    /**
     * @param {number} id
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_next_kinematic_translation(id, x, y, z) {
        wasm.physics_set_next_kinematic_translation(this.__wbg_ptr, id, x, y, z);
    }
    /**
     * @param {number} id
     * @param {number} qx
     * @param {number} qy
     * @param {number} qz
     * @param {number} qw
     * @param {boolean} wake
     */
    set_rotation(id, qx, qy, qz, qw, wake) {
        wasm.physics_set_rotation(this.__wbg_ptr, id, qx, qy, qz, qw, wake);
    }
    /**
     * @param {number} id
     * @param {boolean} sensor
     */
    set_sensor(id, sensor) {
        wasm.physics_set_sensor(this.__wbg_ptr, id, sensor);
    }
    /**
     * @param {number} id
     * @param {number} bits
     */
    set_solver_groups(id, bits) {
        wasm.physics_set_solver_groups(this.__wbg_ptr, id, bits);
    }
    /**
     * @param {number} dt
     */
    set_timestep(dt) {
        wasm.physics_set_timestep(this.__wbg_ptr, dt);
    }
    /**
     * @param {number} id
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {boolean} wake
     */
    set_translation(id, x, y, z, wake) {
        wasm.physics_set_translation(this.__wbg_ptr, id, x, y, z, wake);
    }
    /**
     * @param {number} id
     */
    sleep(id) {
        wasm.physics_sleep(this.__wbg_ptr, id);
    }
    /**
     * Launch a projectile: a ball swept through the world every step with a shape cast. It ends
     * on the first collider it touches (`EV_PROJECTILE_HIT`, with the collider id and impact
     * point) or when `ttl` runs out (`EV_PROJECTILE_EXPIRED`). `exclude_body` (≥ 0) is the
     * shooter, which it passes through.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} vx
     * @param {number} vy
     * @param {number} vz
     * @param {number} radius
     * @param {number} ttl
     * @param {number} groups
     * @param {number} exclude_body
     * @returns {number}
     */
    spawn_projectile(x, y, z, vx, vy, vz, radius, ttl, groups, exclude_body) {
        const ret = wasm.physics_spawn_projectile(this.__wbg_ptr, x, y, z, vx, vy, vz, radius, ttl, groups, exclude_body);
        return ret >>> 0;
    }
    /**
     * Advance one fixed step: rigid bodies, collision/intersection events, then projectiles.
     */
    step() {
        wasm.physics_step(this.__wbg_ptr);
    }
    /**
     * Fill the pose buffer for every body id (dead ids get flags 0) and return its length.
     * @returns {number}
     */
    sync_poses() {
        const ret = wasm.physics_sync_poses(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Fill the projectile buffer (`PROJECTILE_STRIDE` floats each) and return its length.
     * @returns {number}
     */
    sync_projectiles() {
        const ret = wasm.physics_sync_projectiles(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    timestep() {
        const ret = wasm.physics_timestep(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} id
     */
    wake_up(id) {
        wasm.physics_wake_up(this.__wbg_ptr, id);
    }
}
if (Symbol.dispose) Physics.prototype[Symbol.dispose] = Physics.prototype.free;
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
    };
    return {
        __proto__: null,
        "./tlm_physics_bg.js": import0,
    };
}

const PhysicsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_physics_free(ptr, 1));

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('tlm_physics_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
