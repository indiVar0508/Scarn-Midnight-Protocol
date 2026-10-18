//! Threat Level Midnight physics: the [rapier3d](https://github.com/dimforge/rapier) crate compiled
//! to WebAssembly with `wasm-bindgen`.
//!
//! The JavaScript side (`src/physics/`) sees a flat, handle-based API: plain numbers in and out,
//! no Rust objects to free. Bodies and colliders are identified by our own `u32` ids, never reused,
//! so a stale id from a removed body is a harmless no-op instead of aliasing a new one. Results with
//! several values go through a small scratch buffer (`out`), and per-frame bulk data (body poses,
//! events, projectiles) through `Vec`s that JS views directly in WASM memory.

use std::collections::HashMap;
use std::sync::Mutex;

use rapier3d::control::{CharacterAutostep, CharacterLength, KinematicCharacterController};
use rapier3d::parry::query::ShapeCastOptions;
use rapier3d::prelude::*;
use wasm_bindgen::prelude::*;

/// Floats per body in the pose buffer: position xyz, rotation quaternion xyzw, flags.
pub const POSE_STRIDE: usize = 8;
/// Pose flag bits (stored as a float in the eighth slot).
const POSE_LIVE: f32 = 1.0;
const POSE_SLEEPING: f32 = 2.0;

/// u32s per event: kind, a, b, flags.
pub const EVENT_STRIDE: usize = 4;
/// Event kinds.
pub const EV_COLLISION_STARTED: u32 = 1;
pub const EV_COLLISION_STOPPED: u32 = 2;
pub const EV_PROJECTILE_HIT: u32 = 3;
pub const EV_PROJECTILE_EXPIRED: u32 = 4;
/// Event flag bits.
pub const EVF_SENSOR: u32 = 1;
pub const EVF_REMOVED: u32 = 2;
/// "No id" in the event stream (e.g. the collider half of an expired projectile).
pub const NONE: u32 = u32::MAX;

/// Floats per live projectile in the projectile buffer: id, x, y, z, radius.
pub const PROJECTILE_STRIDE: usize = 5;

/// Body kinds, matching `@react-three/rapier`'s `type` strings in order.
#[derive(Clone, Copy)]
enum BodyKind {
    Dynamic = 0,
    Fixed = 1,
    KinematicPosition = 2,
    KinematicVelocity = 3,
}

impl BodyKind {
    fn from_u8(v: u8) -> Self {
        match v {
            1 => Self::Fixed,
            2 => Self::KinematicPosition,
            3 => Self::KinematicVelocity,
            _ => Self::Dynamic,
        }
    }

    fn rapier(self) -> RigidBodyType {
        match self {
            Self::Dynamic => RigidBodyType::Dynamic,
            Self::Fixed => RigidBodyType::Fixed,
            Self::KinematicPosition => RigidBodyType::KinematicPositionBased,
            Self::KinematicVelocity => RigidBodyType::KinematicVelocityBased,
        }
    }

    fn of(t: RigidBodyType) -> Self {
        match t {
            RigidBodyType::Fixed => Self::Fixed,
            RigidBodyType::KinematicPositionBased => Self::KinematicPosition,
            RigidBodyType::KinematicVelocityBased => Self::KinematicVelocity,
            _ => Self::Dynamic,
        }
    }
}

/// `@react-three/rapier` / rapier.js interaction groups: memberships in the high 16 bits,
/// filter in the low 16. Both sides must agree for a pair to interact (AND mode).
fn groups_from_bits(bits: u32) -> InteractionGroups {
    InteractionGroups::new(
        Group::from_bits_truncate(bits >> 16),
        Group::from_bits_truncate(bits & 0xffff),
        InteractionTestMode::And,
    )
}

fn pose(x: f32, y: f32, z: f32, qx: f32, qy: f32, qz: f32, qw: f32) -> Pose {
    let q = Rotation::from_xyzw(qx, qy, qz, qw);
    // Guard against a zero / non-unit quaternion from JS.
    let q = if q.length_squared() > 1.0e-12 { q.normalize() } else { Rotation::IDENTITY };
    Pose::from_parts(Vector::new(x, y, z), q)
}

/// Collects collision events during a step (rapier calls back while it holds the sets). The
/// trait requires `Sync`; the lock is uncontended (WASM is single-threaded).
#[derive(Default)]
struct Collector {
    events: Mutex<Vec<CollisionEvent>>,
}

impl EventHandler for Collector {
    fn handle_collision_event(
        &self,
        _bodies: &RigidBodySet,
        _colliders: &ColliderSet,
        event: CollisionEvent,
        _contact_pair: Option<&ContactPair>,
    ) {
        if let Ok(mut events) = self.events.lock() {
            events.push(event);
        }
    }

    fn handle_contact_force_event(
        &self,
        _dt: Real,
        _bodies: &RigidBodySet,
        _colliders: &ColliderSet,
        _contact_pair: &ContactPair,
        _total_force_magnitude: Real,
    ) {
    }

    fn handle_soft_body_tear_event(&self, _soft_bodies: &SoftBodySet, _event: &SoftBodyTearEvent) {}
}

struct Projectile {
    id: u32,
    pos: Vector,
    vel: Vector,
    radius: f32,
    ttl: f32,
    groups: InteractionGroups,
    exclude: Option<RigidBodyHandle>,
}

/// One rapier world plus the id bookkeeping and buffers the JS side reads.
#[wasm_bindgen]
pub struct Physics {
    world: PhysicsWorld,
    bodies: Vec<Option<RigidBodyHandle>>,
    colliders: Vec<Option<ColliderHandle>>,
    collider_ids: HashMap<ColliderHandle, u32>,
    /// Colliders removed since the last step: their ids must survive until the step reports
    /// their final (REMOVED) events.
    removed_colliders: Vec<ColliderHandle>,
    kccs: Vec<Option<KinematicCharacterController>>,
    projectiles: Vec<Projectile>,
    next_projectile: u32,
    /// Builder for the collider being assembled by the `new_*` / `pending_*` calls.
    pending: Option<ColliderBuilder>,
    poses: Vec<f32>,
    events: Vec<u32>,
    /// Three floats (a world point) per event, aligned with `events`.
    event_points: Vec<f32>,
    projectile_buf: Vec<f32>,
    out: [f32; 16],
}

impl Default for Physics {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl Physics {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Physics {
        let mut world = PhysicsWorld::new();
        world.integration_parameters.dt = 1.0 / 60.0;
        Physics {
            world,
            bodies: Vec::new(),
            colliders: Vec::new(),
            collider_ids: HashMap::new(),
            removed_colliders: Vec::new(),
            kccs: Vec::new(),
            projectiles: Vec::new(),
            next_projectile: 0,
            pending: None,
            poses: Vec::new(),
            events: Vec::new(),
            event_points: Vec::new(),
            projectile_buf: Vec::new(),
            out: [0.0; 16],
        }
    }

    // ── World ─────────────────────────────────────────────────────────────────────────────────

    pub fn set_gravity(&mut self, x: f32, y: f32, z: f32) {
        self.world.gravity = Vector::new(x, y, z);
    }

    pub fn set_timestep(&mut self, dt: f32) {
        if dt > 0.0 && dt.is_finite() {
            self.world.integration_parameters.dt = dt;
        }
    }

    pub fn timestep(&self) -> f32 {
        self.world.integration_parameters.dt
    }

    /// Advance one fixed step: rigid bodies, collision/intersection events, then projectiles.
    pub fn step(&mut self) {
        self.events.clear();
        self.event_points.clear();
        let collector = Collector::default();
        self.world.step_with_events(&(), &collector);
        for ev in collector.events.into_inner().unwrap_or_default() {
            let (kind, c1, c2, f) = match ev {
                CollisionEvent::Started(a, b, f) => (EV_COLLISION_STARTED, a, b, f),
                CollisionEvent::Stopped(a, b, f) => (EV_COLLISION_STOPPED, a, b, f),
            };
            let (Some(&a), Some(&b)) = (self.collider_ids.get(&c1), self.collider_ids.get(&c2)) else {
                continue;
            };
            let mut flags = 0;
            if f.contains(CollisionEventFlags::SENSOR) {
                flags |= EVF_SENSOR;
            }
            if f.contains(CollisionEventFlags::REMOVED) {
                flags |= EVF_REMOVED;
            }
            self.push_event(kind, a, b, flags, Vector::ZERO);
        }
        // Removed colliders have now reported their last events.
        for h in self.removed_colliders.drain(..) {
            self.collider_ids.remove(&h);
        }
        self.step_projectiles();
    }

    // ── Bodies ────────────────────────────────────────────────────────────────────────────────

    /// Create a rigid body. `kind`: 0 dynamic, 1 fixed, 2 kinematic (position), 3 kinematic
    /// (velocity). `lock_rotations` bits: 1 = x, 2 = y, 4 = z.
    #[allow(clippy::too_many_arguments)]
    pub fn create_body(
        &mut self,
        kind: u8,
        x: f32,
        y: f32,
        z: f32,
        qx: f32,
        qy: f32,
        qz: f32,
        qw: f32,
        ccd: bool,
        can_sleep: bool,
        linear_damping: f32,
        angular_damping: f32,
        lock_rotations: u8,
        gravity_scale: f32,
    ) -> u32 {
        let id = self.bodies.len() as u32;
        let rb = RigidBodyBuilder::new(BodyKind::from_u8(kind).rapier())
            .pose(pose(x, y, z, qx, qy, qz, qw))
            .ccd_enabled(ccd)
            .can_sleep(can_sleep)
            .linear_damping(linear_damping)
            .angular_damping(angular_damping)
            .enabled_rotations(lock_rotations & 1 == 0, lock_rotations & 2 == 0, lock_rotations & 4 == 0)
            .gravity_scale(gravity_scale)
            .user_data(id as u128)
            .build();
        let h = self.world.insert_body(rb);
        self.bodies.push(Some(h));
        self.poses.resize(self.bodies.len() * POSE_STRIDE, 0.0);
        id
    }

    /// Remove a body and every collider attached to it.
    pub fn remove_body(&mut self, id: u32) {
        let Some(h) = self.body_handle(id) else { return };
        if let Some(rb) = self.world.bodies.get(h) {
            for &ch in rb.colliders() {
                if let Some(cid) = self.collider_ids.get(&ch) {
                    self.colliders[*cid as usize] = None;
                }
                self.removed_colliders.push(ch);
            }
        }
        self.world.remove_body_with_colliders(h, true);
        self.bodies[id as usize] = None;
        let base = id as usize * POSE_STRIDE;
        self.poses[base + 7] = 0.0;
    }

    pub fn body_exists(&self, id: u32) -> bool {
        self.body_handle(id).is_some()
    }

    pub fn body_count(&self) -> u32 {
        self.world.bodies.len() as u32
    }

    pub fn set_translation(&mut self, id: u32, x: f32, y: f32, z: f32, wake: bool) {
        if let Some(rb) = self.body_mut(id) {
            rb.set_translation(Vector::new(x, y, z), wake);
        }
    }

    pub fn set_rotation(&mut self, id: u32, qx: f32, qy: f32, qz: f32, qw: f32, wake: bool) {
        if let Some(rb) = self.body_mut(id) {
            rb.set_rotation(pose(0.0, 0.0, 0.0, qx, qy, qz, qw).rotation, wake);
        }
    }

    pub fn set_next_kinematic_translation(&mut self, id: u32, x: f32, y: f32, z: f32) {
        if let Some(rb) = self.body_mut(id) {
            rb.set_next_kinematic_translation(Vector::new(x, y, z));
        }
    }

    pub fn set_next_kinematic_rotation(&mut self, id: u32, qx: f32, qy: f32, qz: f32, qw: f32) {
        if let Some(rb) = self.body_mut(id) {
            rb.set_next_kinematic_rotation(pose(0.0, 0.0, 0.0, qx, qy, qz, qw).rotation);
        }
    }

    pub fn set_linvel(&mut self, id: u32, x: f32, y: f32, z: f32, wake: bool) {
        if let Some(rb) = self.body_mut(id) {
            rb.set_linvel(Vector::new(x, y, z), wake);
        }
    }

    pub fn set_angvel(&mut self, id: u32, x: f32, y: f32, z: f32, wake: bool) {
        if let Some(rb) = self.body_mut(id) {
            rb.set_angvel(Vector::new(x, y, z), wake);
        }
    }

    pub fn apply_impulse(&mut self, id: u32, x: f32, y: f32, z: f32, wake: bool) {
        if let Some(rb) = self.body_mut(id) {
            rb.apply_impulse(Vector::new(x, y, z), wake);
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn apply_impulse_at_point(&mut self, id: u32, x: f32, y: f32, z: f32, px: f32, py: f32, pz: f32, wake: bool) {
        if let Some(rb) = self.body_mut(id) {
            rb.apply_impulse_at_point(Vector::new(x, y, z), Vector::new(px, py, pz), wake);
        }
    }

    pub fn apply_torque_impulse(&mut self, id: u32, x: f32, y: f32, z: f32, wake: bool) {
        if let Some(rb) = self.body_mut(id) {
            rb.apply_torque_impulse(Vector::new(x, y, z), wake);
        }
    }

    pub fn set_body_type(&mut self, id: u32, kind: u8, wake: bool) {
        if let Some(rb) = self.body_mut(id) {
            rb.set_body_type(BodyKind::from_u8(kind).rapier(), wake);
        }
    }

    pub fn body_type(&self, id: u32) -> u8 {
        self.body(id).map_or(BodyKind::Fixed as u8, |rb| BodyKind::of(rb.body_type()) as u8)
    }

    pub fn set_enabled_rotations(&mut self, id: u32, x: bool, y: bool, z: bool, wake: bool) {
        if let Some(rb) = self.body_mut(id) {
            rb.set_enabled_rotations(x, y, z, wake);
        }
    }

    pub fn set_linear_damping(&mut self, id: u32, v: f32) {
        if let Some(rb) = self.body_mut(id) {
            rb.set_linear_damping(v);
        }
    }

    pub fn set_angular_damping(&mut self, id: u32, v: f32) {
        if let Some(rb) = self.body_mut(id) {
            rb.set_angular_damping(v);
        }
    }

    pub fn set_gravity_scale(&mut self, id: u32, v: f32, wake: bool) {
        if let Some(rb) = self.body_mut(id) {
            rb.set_gravity_scale(v, wake);
        }
    }

    pub fn set_ccd(&mut self, id: u32, on: bool) {
        if let Some(rb) = self.body_mut(id) {
            rb.enable_ccd(on);
        }
    }

    pub fn wake_up(&mut self, id: u32) {
        if let Some(h) = self.body_handle(id) {
            self.world.wake_up(h, true);
        }
    }

    pub fn sleep(&mut self, id: u32) {
        if let Some(rb) = self.body_mut(id) {
            rb.sleep();
        }
    }

    pub fn is_sleeping(&self, id: u32) -> bool {
        self.body(id).is_some_and(|rb| rb.is_sleeping())
    }

    pub fn mass(&self, id: u32) -> f32 {
        self.body(id).map_or(0.0, |rb| rb.mass())
    }

    /// Writes position (out[0..3]) and rotation (out[3..7]); false if the body is gone.
    pub fn read_pose(&mut self, id: u32) -> bool {
        let Some(rb) = self.body(id) else { return false };
        let p = *rb.position();
        self.out[0..3].copy_from_slice(&[p.translation.x, p.translation.y, p.translation.z]);
        self.out[3..7].copy_from_slice(&[p.rotation.x, p.rotation.y, p.rotation.z, p.rotation.w]);
        true
    }

    /// Writes linear velocity (out[0..3]) and angular velocity (out[3..6]).
    pub fn read_velocity(&mut self, id: u32) -> bool {
        let Some(rb) = self.body(id) else { return false };
        let (v, w) = (rb.linvel(), rb.angvel());
        self.out[0..6].copy_from_slice(&[v.x, v.y, v.z, w.x, w.y, w.z]);
        true
    }

    /// Fill the pose buffer for every body id (dead ids get flags 0) and return its length.
    pub fn sync_poses(&mut self) -> u32 {
        for (id, slot) in self.bodies.iter().enumerate() {
            let base = id * POSE_STRIDE;
            let Some(rb) = slot.and_then(|h| self.world.bodies.get(h)) else {
                self.poses[base + 7] = 0.0;
                continue;
            };
            let p = rb.position();
            self.poses[base] = p.translation.x;
            self.poses[base + 1] = p.translation.y;
            self.poses[base + 2] = p.translation.z;
            self.poses[base + 3] = p.rotation.x;
            self.poses[base + 4] = p.rotation.y;
            self.poses[base + 5] = p.rotation.z;
            self.poses[base + 6] = p.rotation.w;
            self.poses[base + 7] = POSE_LIVE + if rb.is_sleeping() { POSE_SLEEPING } else { 0.0 };
        }
        self.poses.len() as u32
    }

    pub fn poses_ptr(&self) -> *const f32 {
        self.poses.as_ptr()
    }

    // ── Colliders (assembled: new_* → pending_* → attach) ──────────────────────────────────────

    pub fn new_cuboid(&mut self, hx: f32, hy: f32, hz: f32) {
        self.pending = Some(ColliderBuilder::cuboid(hx.max(1.0e-4), hy.max(1.0e-4), hz.max(1.0e-4)));
    }

    pub fn new_ball(&mut self, r: f32) {
        self.pending = Some(ColliderBuilder::ball(r.max(1.0e-4)));
    }

    /// Capsule along Y (`@react-three/rapier`'s `CapsuleCollider` args order: half height, radius).
    pub fn new_capsule(&mut self, half_height: f32, r: f32) {
        self.pending = Some(ColliderBuilder::capsule_y(half_height.max(0.0), r.max(1.0e-4)));
    }

    pub fn new_cylinder(&mut self, half_height: f32, r: f32) {
        self.pending = Some(ColliderBuilder::cylinder(half_height.max(1.0e-4), r.max(1.0e-4)));
    }

    pub fn new_cone(&mut self, half_height: f32, r: f32) {
        self.pending = Some(ColliderBuilder::cone(half_height.max(1.0e-4), r.max(1.0e-4)));
    }

    /// Convex hull of points (xyz triplets). False if the hull is degenerate.
    pub fn new_convex_hull(&mut self, points: &[f32]) -> bool {
        let pts: Vec<Vector> = points.chunks_exact(3).map(|c| Vector::new(c[0], c[1], c[2])).collect();
        self.pending = ColliderBuilder::convex_hull(&pts);
        self.pending.is_some()
    }

    /// Triangle mesh from vertices (xyz triplets) and triangle indices. False if invalid.
    pub fn new_trimesh(&mut self, vertices: &[f32], indices: &[u32]) -> bool {
        let verts: Vec<Vector> = vertices.chunks_exact(3).map(|c| Vector::new(c[0], c[1], c[2])).collect();
        let n = verts.len() as u32;
        let tris: Vec<[u32; 3]> = indices
            .chunks_exact(3)
            .filter(|t| t[0] < n && t[1] < n && t[2] < n)
            .map(|t| [t[0], t[1], t[2]])
            .collect();
        if verts.is_empty() || tris.is_empty() {
            self.pending = None;
            return false;
        }
        self.pending = ColliderBuilder::trimesh(verts, tris).ok();
        self.pending.is_some()
    }

    /// Local pose of the pending collider relative to its body.
    #[allow(clippy::too_many_arguments)]
    pub fn pending_pose(&mut self, x: f32, y: f32, z: f32, qx: f32, qy: f32, qz: f32, qw: f32) {
        if let Some(b) = self.pending.take() {
            self.pending = Some(b.position(pose(x, y, z, qx, qy, qz, qw)));
        }
    }

    pub fn pending_material(&mut self, density: f32, friction: f32, restitution: f32) {
        if let Some(b) = self.pending.take() {
            self.pending = Some(b.density(density.max(0.0)).friction(friction.max(0.0)).restitution(restitution.max(0.0)));
        }
    }

    /// Collision and solver groups in rapier.js bit layout (see `groups_from_bits`).
    pub fn pending_groups(&mut self, collision: u32, solver: u32) {
        if let Some(b) = self.pending.take() {
            self.pending = Some(b.collision_groups(groups_from_bits(collision)).solver_groups(groups_from_bits(solver)));
        }
    }

    /// `events`: report collision/intersection events for this collider. `all_pairs`: also
    /// detect kinematic↔fixed and kinematic↔kinematic pairs (needed for sensors a kinematic
    /// character walks into).
    pub fn pending_flags(&mut self, sensor: bool, events: bool, all_pairs: bool) {
        if let Some(b) = self.pending.take() {
            let mut b = b.sensor(sensor);
            if events {
                b = b.active_events(ActiveEvents::COLLISION_EVENTS);
            }
            if all_pairs {
                b = b.active_collision_types(ActiveCollisionTypes::all());
            }
            self.pending = Some(b);
        }
    }

    /// Insert the pending collider on `body` (or free-standing when `body` is negative).
    /// Returns the collider id, or -1 if nothing was pending or the body is gone.
    pub fn attach(&mut self, body: i32) -> i32 {
        let Some(builder) = self.pending.take() else { return -1 };
        let id = self.colliders.len() as u32;
        let co = builder.user_data(id as u128).build();
        let h = if body >= 0 {
            let Some(bh) = self.body_handle(body as u32) else { return -1 };
            self.world.insert_collider(co, Some(bh))
        } else {
            self.world.insert_collider(co, None)
        };
        self.colliders.push(Some(h));
        self.collider_ids.insert(h, id);
        id as i32
    }

    pub fn remove_collider(&mut self, id: u32) {
        let Some(h) = self.collider_handle(id) else { return };
        self.world.remove_collider(h);
        self.colliders[id as usize] = None;
        self.removed_colliders.push(h);
    }

    pub fn collider_exists(&self, id: u32) -> bool {
        self.collider_handle(id).is_some()
    }

    pub fn collider_count(&self) -> u32 {
        self.world.colliders.len() as u32
    }

    /// The body a collider is attached to, or -1.
    pub fn collider_body(&self, id: u32) -> i32 {
        let Some(co) = self.collider(id) else { return -1 };
        co.parent()
            .and_then(|bh| self.world.bodies.get(bh))
            .map_or(-1, |rb| rb.user_data as i32)
    }

    pub fn set_collision_groups(&mut self, id: u32, bits: u32) {
        if let Some(co) = self.collider_mut(id) {
            co.set_collision_groups(groups_from_bits(bits));
        }
    }

    pub fn set_solver_groups(&mut self, id: u32, bits: u32) {
        if let Some(co) = self.collider_mut(id) {
            co.set_solver_groups(groups_from_bits(bits));
        }
    }

    pub fn set_density(&mut self, id: u32, density: f32) {
        if let Some(co) = self.collider_mut(id) {
            co.set_density(density.max(0.0));
        }
    }

    pub fn set_friction(&mut self, id: u32, friction: f32) {
        if let Some(co) = self.collider_mut(id) {
            co.set_friction(friction.max(0.0));
        }
    }

    pub fn set_sensor(&mut self, id: u32, sensor: bool) {
        if let Some(co) = self.collider_mut(id) {
            co.set_sensor(sensor);
        }
    }

    pub fn set_collider_enabled(&mut self, id: u32, on: bool) {
        if let Some(co) = self.collider_mut(id) {
            co.set_enabled(on);
        }
    }

    // ── Events ────────────────────────────────────────────────────────────────────────────────

    /// Number of events from the last step (each `EVENT_STRIDE` u32s in `events_ptr`).
    pub fn event_count(&self) -> u32 {
        (self.events.len() / EVENT_STRIDE) as u32
    }

    pub fn events_ptr(&self) -> *const u32 {
        self.events.as_ptr()
    }

    pub fn event_points_ptr(&self) -> *const f32 {
        self.event_points.as_ptr()
    }

    // ── Scene queries ─────────────────────────────────────────────────────────────────────────

    /// Cast a ray. `flags`: rapier `QueryFilterFlags` bits (EXCLUDE_SENSORS = 8, ONLY_FIXED = 6…).
    /// `groups`: interaction-group bits, used only when `use_groups`. Returns the hit collider id
    /// or -1; on a hit, out[0] = time of impact, out[1..4] = normal, out[4..7] = point.
    #[allow(clippy::too_many_arguments)]
    pub fn cast_ray(
        &mut self,
        ox: f32,
        oy: f32,
        oz: f32,
        dx: f32,
        dy: f32,
        dz: f32,
        max_toi: f32,
        solid: bool,
        flags: u32,
        groups: u32,
        use_groups: bool,
        exclude_body: i32,
        exclude_collider: i32,
    ) -> i32 {
        let ray = Ray::new(Vector::new(ox, oy, oz), Vector::new(dx, dy, dz));
        let mut filter = QueryFilter::new();
        filter.flags = QueryFilterFlags::from_bits_truncate(flags);
        if use_groups {
            filter = filter.groups(groups_from_bits(groups));
        }
        if exclude_body >= 0
            && let Some(h) = self.body_handle(exclude_body as u32) {
                filter = filter.exclude_rigid_body(h);
            }
        if exclude_collider >= 0
            && let Some(h) = self.collider_handle(exclude_collider as u32) {
                filter = filter.exclude_collider(h);
            }
        let hit = self.world.cast_ray_and_get_normal(&ray, max_toi, solid, filter);
        let Some((h, inter)) = hit else { return -1 };
        let p = ray.point_at(inter.time_of_impact);
        self.out[0] = inter.time_of_impact;
        self.out[1..4].copy_from_slice(&[inter.normal.x, inter.normal.y, inter.normal.z]);
        self.out[4..7].copy_from_slice(&[p.x, p.y, p.z]);
        self.collider_ids.get(&h).map_or(-1, |&id| id as i32)
    }

    // ── Kinematic character controller ────────────────────────────────────────────────────────

    pub fn create_kcc(&mut self, offset: f32) -> u32 {
        let kcc = KinematicCharacterController {
            offset: CharacterLength::Absolute(offset.max(1.0e-4)),
            ..Default::default()
        };
        self.kccs.push(Some(kcc));
        (self.kccs.len() - 1) as u32
    }

    pub fn remove_kcc(&mut self, id: u32) {
        if let Some(slot) = self.kccs.get_mut(id as usize) {
            *slot = None;
        }
    }

    /// Configure a controller. Non-positive `autostep_height` / `snap` disable those features.
    /// Angles are in radians.
    #[allow(clippy::too_many_arguments)]
    pub fn kcc_config(
        &mut self,
        id: u32,
        slide: bool,
        autostep_height: f32,
        autostep_width: f32,
        autostep_dynamic: bool,
        snap: f32,
        max_slope_climb: f32,
        min_slope_slide: f32,
    ) {
        let Some(Some(kcc)) = self.kccs.get_mut(id as usize) else { return };
        kcc.slide = slide;
        kcc.autostep = (autostep_height > 0.0).then_some(CharacterAutostep {
            max_height: CharacterLength::Absolute(autostep_height),
            min_width: CharacterLength::Absolute(autostep_width.max(0.0)),
            include_dynamic_bodies: autostep_dynamic,
        });
        kcc.snap_to_ground = (snap > 0.0).then_some(CharacterLength::Absolute(snap));
        kcc.max_slope_climb_angle = max_slope_climb;
        kcc.min_slope_slide_angle = min_slope_slide;
    }

    /// Move the character whose shape is collider `collider` by `(dx, dy, dz)`, sliding along
    /// obstacles. Writes the corrected translation to out[0..3], out[3] = grounded (0/1),
    /// out[4] = sliding down a slope (0/1). With `apply`, also sets the body's next kinematic
    /// translation. With `push_mass > 0`, dynamic bodies it runs into are pushed as by a
    /// character of that mass. Returns false if the controller or collider is gone.
    #[allow(clippy::too_many_arguments)]
    pub fn kcc_move(
        &mut self,
        kcc: u32,
        collider: u32,
        dx: f32,
        dy: f32,
        dz: f32,
        flags: u32,
        groups: u32,
        use_groups: bool,
        apply: bool,
        push_mass: f32,
    ) -> bool {
        let Some(Some(controller)) = self.kccs.get(kcc as usize) else { return false };
        let controller = *controller;
        let Some(ch) = self.collider_handle(collider) else { return false };
        let Some(co) = self.world.colliders.get(ch) else { return false };
        let shape = co.shared_shape().clone();
        let char_pose = *co.position();
        let body = co.parent();

        // A character walks through trigger volumes: sensors never block it.
        let mut filter = QueryFilter::new();
        filter.flags = QueryFilterFlags::from_bits_truncate(flags) | QueryFilterFlags::EXCLUDE_SENSORS;
        if use_groups {
            filter = filter.groups(groups_from_bits(groups));
        }
        filter = filter.exclude_collider(ch);
        if let Some(bh) = body {
            filter = filter.exclude_rigid_body(bh);
        }

        let dt = self.world.integration_parameters.dt;
        let w = &mut self.world;
        let mut queries = w.broad_phase.as_query_pipeline_mut(
            w.narrow_phase.query_dispatcher(),
            &mut w.bodies,
            &mut w.colliders,
            filter,
        );
        let mut collisions = Vec::new();
        let mvt = controller.move_shape(
            dt,
            &queries.as_ref(),
            &*shape,
            &char_pose,
            Vector::new(dx, dy, dz),
            |c| collisions.push(c),
        );
        if push_mass > 0.0 && !collisions.is_empty() {
            controller.solve_character_collision_impulses(dt, &mut queries, &*shape, push_mass, &collisions);
        }

        if apply
            && let Some(rb) = body.and_then(|bh| self.world.bodies.get_mut(bh)) {
                let t = rb.translation() + mvt.translation;
                rb.set_next_kinematic_translation(t);
            }
        self.out[0..3].copy_from_slice(&[mvt.translation.x, mvt.translation.y, mvt.translation.z]);
        self.out[3] = if mvt.grounded { 1.0 } else { 0.0 };
        self.out[4] = if mvt.is_sliding_down_slope { 1.0 } else { 0.0 };
        true
    }

    // ── Projectiles ───────────────────────────────────────────────────────────────────────────

    /// Launch a projectile: a ball swept through the world every step with a shape cast. It ends
    /// on the first collider it touches (`EV_PROJECTILE_HIT`, with the collider id and impact
    /// point) or when `ttl` runs out (`EV_PROJECTILE_EXPIRED`). `exclude_body` (≥ 0) is the
    /// shooter, which it passes through.
    #[allow(clippy::too_many_arguments)]
    pub fn spawn_projectile(
        &mut self,
        x: f32,
        y: f32,
        z: f32,
        vx: f32,
        vy: f32,
        vz: f32,
        radius: f32,
        ttl: f32,
        groups: u32,
        exclude_body: i32,
    ) -> u32 {
        let id = self.next_projectile;
        self.next_projectile = self.next_projectile.wrapping_add(1);
        let exclude = if exclude_body >= 0 { self.body_handle(exclude_body as u32) } else { None };
        self.projectiles.push(Projectile {
            id,
            pos: Vector::new(x, y, z),
            vel: Vector::new(vx, vy, vz),
            radius: radius.max(1.0e-3),
            ttl,
            groups: groups_from_bits(groups),
            exclude,
        });
        id
    }

    pub fn clear_projectiles(&mut self) {
        self.projectiles.clear();
    }

    pub fn projectile_count(&self) -> u32 {
        self.projectiles.len() as u32
    }

    /// Fill the projectile buffer (`PROJECTILE_STRIDE` floats each) and return its length.
    pub fn sync_projectiles(&mut self) -> u32 {
        self.projectile_buf.clear();
        for p in &self.projectiles {
            self.projectile_buf.extend_from_slice(&[p.id as f32, p.pos.x, p.pos.y, p.pos.z, p.radius]);
        }
        self.projectile_buf.len() as u32
    }

    pub fn projectiles_ptr(&self) -> *const f32 {
        self.projectile_buf.as_ptr()
    }

    // ── Scratch ───────────────────────────────────────────────────────────────────────────────

    pub fn out_ptr(&self) -> *const f32 {
        self.out.as_ptr()
    }

    /// Read one scratch value (for callers that don't map WASM memory, such as tests).
    pub fn out(&self, i: usize) -> f32 {
        self.out.get(i).copied().unwrap_or(f32::NAN)
    }
}

// Internal helpers (not exported to JS).
impl Physics {
    fn body_handle(&self, id: u32) -> Option<RigidBodyHandle> {
        self.bodies.get(id as usize).copied().flatten()
    }

    fn collider_handle(&self, id: u32) -> Option<ColliderHandle> {
        self.colliders.get(id as usize).copied().flatten()
    }

    fn body(&self, id: u32) -> Option<&RigidBody> {
        self.body_handle(id).and_then(|h| self.world.bodies.get(h))
    }

    fn body_mut(&mut self, id: u32) -> Option<&mut RigidBody> {
        let h = self.body_handle(id)?;
        self.world.bodies.get_mut(h)
    }

    fn collider(&self, id: u32) -> Option<&Collider> {
        self.collider_handle(id).and_then(|h| self.world.colliders.get(h))
    }

    fn collider_mut(&mut self, id: u32) -> Option<&mut Collider> {
        let h = self.collider_handle(id)?;
        self.world.colliders.get_mut(h)
    }

    fn push_event(&mut self, kind: u32, a: u32, b: u32, flags: u32, at: Vector) {
        self.events.extend_from_slice(&[kind, a, b, flags]);
        self.event_points.extend_from_slice(&[at.x, at.y, at.z]);
    }

    fn step_projectiles(&mut self) {
        if self.projectiles.is_empty() {
            return;
        }
        let dt = self.world.integration_parameters.dt;
        let mut alive = Vec::with_capacity(self.projectiles.len());
        let projectiles = std::mem::take(&mut self.projectiles);
        for mut p in projectiles {
            let mut filter = QueryFilter::new().exclude_sensors().groups(p.groups);
            if let Some(h) = p.exclude {
                filter = filter.exclude_rigid_body(h);
            }
            let ball = Ball::new(p.radius);
            let opts = ShapeCastOptions { max_time_of_impact: 1.0, ..ShapeCastOptions::with_max_time_of_impact(1.0) };
            let hit = self
                .world
                .query_pipeline_with_filter(filter)
                .cast_shape(&Pose::from_translation(p.pos), p.vel * dt, &ball, opts);
            if let Some((h, cast)) = hit {
                let at = p.pos + p.vel * dt * cast.time_of_impact;
                let cid = self.collider_ids.get(&h).copied().unwrap_or(NONE);
                self.push_event(EV_PROJECTILE_HIT, p.id, cid, 0, at);
                continue;
            }
            p.pos += p.vel * dt;
            p.ttl -= dt;
            if p.ttl <= 0.0 {
                self.push_event(EV_PROJECTILE_EXPIRED, p.id, NONE, 0, p.pos);
                continue;
            }
            alive.push(p);
        }
        self.projectiles = alive;
    }
}

#[cfg(test)]
mod tests;
