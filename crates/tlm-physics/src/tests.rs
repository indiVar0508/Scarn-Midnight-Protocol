use super::*;

const IDENT: [f32; 4] = [0.0, 0.0, 0.0, 1.0];
/// rapier.js `interactionGroups(memberships, filters)` → bits.
fn ig(memberships: &[u32], filters: &[u32]) -> u32 {
    let m = memberships.iter().fold(0u32, |a, b| a | (1 << b));
    let f = filters.iter().fold(0u32, |a, b| a | (1 << b));
    (m << 16) | f
}
const ALL: u32 = 0xffff_ffff;

fn body(p: &mut Physics, kind: BodyKind, at: [f32; 3]) -> u32 {
    p.create_body(kind as u8, at[0], at[1], at[2], IDENT[0], IDENT[1], IDENT[2], IDENT[3], false, true, 0.0, 0.0, 0, 1.0)
}

fn cuboid(p: &mut Physics, b: u32, h: [f32; 3], groups: u32) -> u32 {
    p.new_cuboid(h[0], h[1], h[2]);
    p.pending_groups(groups, ALL);
    p.attach(b as i32) as u32
}

fn ground(p: &mut Physics) -> u32 {
    let g = body(p, BodyKind::Fixed, [0.0, -0.5, 0.0]);
    cuboid(p, g, [20.0, 0.5, 20.0], ALL);
    g
}

fn y_of(p: &mut Physics, id: u32) -> f32 {
    assert!(p.read_pose(id));
    p.out(1)
}

fn steps(p: &mut Physics, n: usize) {
    for _ in 0..n {
        p.step();
    }
}

#[test]
fn dynamic_box_falls_and_rests_on_the_ground() {
    let mut p = Physics::new();
    ground(&mut p);
    let b = body(&mut p, BodyKind::Dynamic, [0.0, 3.0, 0.0]);
    cuboid(&mut p, b, [0.5, 0.5, 0.5], ALL);
    steps(&mut p, 240);
    let y = y_of(&mut p, b);
    assert!((y - 0.5).abs() < 0.05, "box should rest on the ground at y≈0.5, got {y}");
}

#[test]
fn pose_buffer_matches_read_pose_and_marks_dead_bodies() {
    let mut p = Physics::new();
    let a = body(&mut p, BodyKind::Fixed, [1.0, 2.0, 3.0]);
    let b = body(&mut p, BodyKind::Fixed, [4.0, 5.0, 6.0]);
    p.remove_body(a);
    let len = p.sync_poses() as usize;
    assert_eq!(len, 2 * POSE_STRIDE);
    assert_eq!(p.poses[7], 0.0, "removed body is not live");
    let base = b as usize * POSE_STRIDE;
    assert_eq!(&p.poses[base..base + 3], &[4.0, 5.0, 6.0]);
    assert_eq!(p.poses[base + 6], 1.0, "identity quaternion w");
    assert!(p.poses[base + 7] >= POSE_LIVE);
}

#[test]
fn ids_are_never_reused_and_stale_ids_are_no_ops() {
    let mut p = Physics::new();
    let a = body(&mut p, BodyKind::Dynamic, [0.0, 0.0, 0.0]);
    let ca = cuboid(&mut p, a, [0.5, 0.5, 0.5], ALL);
    p.remove_body(a);
    let b = body(&mut p, BodyKind::Dynamic, [0.0, 0.0, 0.0]);
    assert_ne!(a, b);
    assert!(!p.body_exists(a));
    assert!(!p.collider_exists(ca), "a body's colliders go with it");
    p.set_linvel(a, 1.0, 0.0, 0.0, true); // must not touch b
    assert!(p.read_velocity(b));
    assert_eq!(p.out(0), 0.0);
    p.step(); // removal events for the stale collider must not panic
    assert_eq!(p.body_count(), 1);
}

#[test]
fn ray_cast_reports_collider_toi_normal_and_respects_filters() {
    let mut p = Physics::new();
    let wall = body(&mut p, BodyKind::Fixed, [0.0, 1.0, -5.0]);
    let wc = cuboid(&mut p, wall, [2.0, 1.0, 0.5], ig(&[0], &[0, 1]));
    p.step();
    let hit = p.cast_ray(0.0, 1.0, 0.0, 0.0, 0.0, -1.0, 100.0, true, 0, 0, false, -1, -1);
    assert_eq!(hit, wc as i32);
    assert!((p.out(0) - 4.5).abs() < 1.0e-3, "toi to the near face");
    assert!((p.out(3) - 1.0).abs() < 1.0e-3, "normal points back at the ray (+z)");
    // A query whose groups the wall doesn't accept misses.
    let miss = p.cast_ray(0.0, 1.0, 0.0, 0.0, 0.0, -1.0, 100.0, true, 0, ig(&[5], &[0]), true, -1, -1);
    assert_eq!(miss, -1);
    // Excluding the wall's body misses too.
    assert_eq!(p.cast_ray(0.0, 1.0, 0.0, 0.0, 0.0, -1.0, 100.0, true, 0, 0, false, wall as i32, -1), -1);
    // QueryFilterFlags::EXCLUDE_FIXED (1) skips fixed bodies.
    assert_eq!(p.cast_ray(0.0, 1.0, 0.0, 0.0, 0.0, -1.0, 100.0, true, 1, 0, false, -1, -1), -1);
}

/// A kinematic capsule character standing on the ground at feet height 0. It spawns one
/// controller offset (2 cm) above the floor: spawned touching it, the controller spends its first
/// frames pushing the capsule out of its own skin gap and loses movement.
fn character(p: &mut Physics, at: [f32; 3]) -> (u32, u32, u32) {
    let b = body(p, BodyKind::KinematicPosition, [at[0], at[1] + 0.85 + 0.02, at[2]]);
    p.new_capsule(0.55, 0.3);
    let c = p.attach(b as i32) as u32;
    let k = p.create_kcc(0.02);
    p.kcc_config(k, true, 0.3, 0.2, false, 0.3, 50f32.to_radians(), 30f32.to_radians());
    (b, c, k)
}

/// Walk with the game's controller rule: no downward push while grounded (snap-to-ground holds
/// the character down; pushing into ground inside the skin gap stalls whole frames), gravity
/// only while airborne.
fn walk(p: &mut Physics, k: u32, c: u32, v: [f32; 3], frames: usize, push_mass: f32) -> bool {
    let dt = p.timestep();
    let mut grounded = false;
    for _ in 0..frames {
        let dy = if grounded { 0.0 } else { -0.02 };
        assert!(p.kcc_move(k, c, v[0] * dt, v[1] * dt + dy, v[2] * dt, 0, 0, false, true, push_mass));
        grounded = p.out(3) > 0.5;
        p.step();
    }
    grounded
}

#[test]
fn character_walks_on_the_ground_and_reports_grounded() {
    let mut p = Physics::new();
    ground(&mut p);
    let (b, c, k) = character(&mut p, [0.0, 0.0, 0.0]);
    p.step();
    let grounded = walk(&mut p, k, c, [0.0, 0.0, -3.0], 60, 0.0);
    assert!(grounded);
    assert!(p.read_pose(b));
    // One settling frame at spawn, then the full 5 cm a frame.
    assert!((p.out(2) + 2.95).abs() < 0.02, "moved 3 m along -z, got z={}", p.out(2));
    assert!((p.out(1) - 0.87).abs() < 0.02, "stays on the floor (plus the skin gap), got y={}", p.out(1));
}

#[test]
fn character_is_blocked_by_walls_and_climbs_small_steps() {
    let mut p = Physics::new();
    ground(&mut p);
    // A wall at z = -2 and a 0.2 m step at x = 2.
    let wall = body(&mut p, BodyKind::Fixed, [0.0, 1.0, -2.0]);
    cuboid(&mut p, wall, [3.0, 1.0, 0.1], ALL);
    let stair = body(&mut p, BodyKind::Fixed, [3.0, 0.1, 0.0]);
    cuboid(&mut p, stair, [1.0, 0.1, 1.0], ALL);
    let (b, c, k) = character(&mut p, [0.0, 0.0, 0.0]);
    p.step();
    walk(&mut p, k, c, [0.0, 0.0, -4.0], 60, 0.0);
    assert!(p.read_pose(b));
    assert!(p.out(2) > -2.0 + 0.1 + 0.3 - 0.05, "stopped by the wall, z={}", p.out(2));
    // Back off the wall, then walk onto the step.
    walk(&mut p, k, c, [0.0, 0.0, 4.0], 30, 0.0);
    walk(&mut p, k, c, [4.0, 0.0, 0.0], 60, 0.0);
    assert!(p.read_pose(b));
    assert!(p.out(1) > 0.85 + 0.15, "autostepped onto the 0.2 m step, y={}", p.out(1));
}

#[test]
fn character_pushes_dynamic_props() {
    let mut p = Physics::new();
    ground(&mut p);
    let crate_ = body(&mut p, BodyKind::Dynamic, [0.0, 0.3, -1.5]);
    cuboid(&mut p, crate_, [0.3, 0.3, 0.3], ALL);
    let (_, c, k) = character(&mut p, [0.0, 0.0, 0.0]);
    steps(&mut p, 30);
    walk(&mut p, k, c, [0.0, 0.0, -3.0], 60, 80.0);
    assert!(p.read_pose(crate_));
    assert!(p.out(2) < -1.7, "the crate was pushed along -z, z={}", p.out(2));
}

#[test]
fn sensor_reports_a_kinematic_character_entering_and_leaving() {
    let mut p = Physics::new();
    ground(&mut p);
    let spot = body(&mut p, BodyKind::Fixed, [0.0, 1.0, -3.0]);
    p.new_ball(0.8);
    p.pending_flags(true, true, true);
    let sensor = p.attach(spot as i32) as u32;
    let (_, c, k) = character(&mut p, [0.0, 0.0, 0.0]);
    p.step();
    let (mut entered, mut left) = (false, false);
    let dt = p.timestep();
    for i in 0..120 {
        let vz = if i < 60 { -4.0 } else { 4.0 };
        p.kcc_move(k, c, 0.0, 0.0, vz * dt, 0, 0, false, true, 0.0);
        p.step();
        for e in p.events.chunks_exact(EVENT_STRIDE) {
            let pair = (e[1] == sensor && e[2] == c) || (e[1] == c && e[2] == sensor);
            if pair && e[3] & EVF_SENSOR != 0 {
                entered |= e[0] == EV_COLLISION_STARTED;
                left |= e[0] == EV_COLLISION_STOPPED && entered;
            }
        }
    }
    assert!(entered, "sensor saw the character arrive");
    assert!(left, "sensor saw the character leave");
}

#[test]
fn collision_events_only_for_colliders_that_ask() {
    let mut p = Physics::new();
    let g = ground(&mut p);
    let quiet = body(&mut p, BodyKind::Dynamic, [-2.0, 2.0, 0.0]);
    cuboid(&mut p, quiet, [0.3, 0.3, 0.3], ALL);
    let loud = body(&mut p, BodyKind::Dynamic, [2.0, 2.0, 0.0]);
    p.new_cuboid(0.3, 0.3, 0.3);
    p.pending_flags(false, true, false);
    let lc = p.attach(loud as i32) as u32;
    let mut seen = Vec::new();
    for _ in 0..120 {
        p.step();
        for e in p.events.chunks_exact(EVENT_STRIDE) {
            if e[0] == EV_COLLISION_STARTED {
                seen.push((e[1], e[2]));
            }
        }
    }
    let _ = g;
    assert_eq!(seen.len(), 1, "one landing reported: {seen:?}");
    assert!(seen[0].0 == lc || seen[0].1 == lc);
}

#[test]
fn projectile_hits_a_character_capsule_and_reports_the_collider() {
    let mut p = Physics::new();
    ground(&mut p);
    let (_, c, _) = character(&mut p, [0.0, 0.0, -6.0]);
    p.step();
    // Shot from z=0 toward -z at chest height; groups: member 2 (enemy shot), hits 0,1.
    let id = p.spawn_projectile(0.0, 1.25, 0.0, 0.0, 0.0, -8.0, 0.07, 4.0, ig(&[2], &[0, 1]), -1);
    let mut hit = None;
    for _ in 0..120 {
        p.step();
        for (i, e) in p.events.chunks_exact(EVENT_STRIDE).enumerate() {
            if e[0] == EV_PROJECTILE_HIT && e[1] == id {
                hit = Some((e[2], p.event_points[i * 3 + 2]));
            }
        }
        if hit.is_some() {
            break;
        }
    }
    let (collider, z) = hit.expect("projectile hit something");
    assert_eq!(collider, c, "it hit the character's capsule");
    assert!((z + 5.7).abs() < 0.2, "impact near the capsule's front, z={z}");
    assert_eq!(p.projectile_count(), 0);
}

#[test]
fn projectiles_pass_their_shooter_respect_groups_and_expire() {
    let mut p = Physics::new();
    let shooter = body(&mut p, BodyKind::KinematicPosition, [0.0, 1.0, 0.0]);
    p.new_capsule(0.5, 0.3);
    p.attach(shooter as i32);
    // A target in group 4 that this projectile's filter ignores.
    let ghost = body(&mut p, BodyKind::Fixed, [0.0, 1.0, -3.0]);
    cuboid(&mut p, ghost, [1.0, 1.0, 0.2], ig(&[4], &[0, 1, 2, 3, 4]));
    p.step();
    let id = p.spawn_projectile(0.0, 1.0, 0.0, 0.0, 0.0, -10.0, 0.05, 0.5, ig(&[2], &[0, 1]), shooter as i32);
    let mut expired = false;
    for _ in 0..60 {
        p.step();
        for e in p.events.chunks_exact(EVENT_STRIDE) {
            assert_ne!(e[0], EV_PROJECTILE_HIT, "no valid target in its path");
            expired |= e[0] == EV_PROJECTILE_EXPIRED && e[1] == id;
        }
    }
    assert!(expired);
    assert_eq!(p.sync_projectiles(), 0);
}

#[test]
fn convex_hull_and_trimesh_colliders_build_and_collide() {
    let mut p = Physics::new();
    // Trimesh floor (two triangles).
    let f = body(&mut p, BodyKind::Fixed, [0.0, 0.0, 0.0]);
    assert!(p.new_trimesh(&[-5.0, 0.0, -5.0, 5.0, 0.0, -5.0, 5.0, 0.0, 5.0, -5.0, 0.0, 5.0], &[0, 2, 1, 0, 3, 2]));
    assert!(p.attach(f as i32) >= 0);
    // A convex hull (tetrahedron) dropped onto it.
    let b = body(&mut p, BodyKind::Dynamic, [0.0, 2.0, 0.0]);
    assert!(p.new_convex_hull(&[0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.5]));
    assert!(p.attach(b as i32) >= 0);
    steps(&mut p, 240);
    let y = y_of(&mut p, b);
    assert!(y > -0.1 && y < 0.6, "the hull rests on the trimesh, y={y}");
    // Degenerate inputs are rejected instead of panicking.
    assert!(!p.new_trimesh(&[0.0, 0.0, 0.0], &[0, 1, 2]));
    assert_eq!(p.attach(b as i32), -1, "nothing pending after a rejected shape");
}

#[test]
fn body_type_swap_turns_a_kinematic_goon_into_a_tumbling_body() {
    let mut p = Physics::new();
    ground(&mut p);
    let g = body(&mut p, BodyKind::KinematicPosition, [0.0, 0.85, 0.0]);
    p.new_capsule(0.55, 0.3);
    p.pending_material(180.0, 0.5, 0.0);
    p.attach(g as i32);
    p.step();
    p.set_body_type(g, BodyKind::Dynamic as u8, true);
    p.set_enabled_rotations(g, true, true, true, true);
    p.set_linvel(g, 6.0, 3.5, 0.0, true);
    p.set_angvel(g, 0.0, 0.0, -6.0, true);
    assert_eq!(p.body_type(g), BodyKind::Dynamic as u8);
    steps(&mut p, 180);
    assert!(p.read_pose(g));
    assert!(p.out(0) > 1.0, "it flew in the hit direction, x={}", p.out(0));
    assert!(p.mass(g) > 10.0, "density gave it a real mass");
}

#[test]
fn gravity_and_timestep_are_configurable() {
    let mut p = Physics::new();
    p.set_gravity(0.0, 0.0, 0.0);
    p.set_timestep(1.0 / 30.0);
    assert!((p.timestep() - 1.0 / 30.0).abs() < 1.0e-6);
    p.set_timestep(-1.0);
    assert!((p.timestep() - 1.0 / 30.0).abs() < 1.0e-6, "invalid dt ignored");
    let b = body(&mut p, BodyKind::Dynamic, [0.0, 5.0, 0.0]);
    cuboid(&mut p, b, [0.2, 0.2, 0.2], ALL);
    steps(&mut p, 30);
    assert!((y_of(&mut p, b) - 5.0).abs() < 1.0e-4, "no gravity, no fall");
}



#[test]
fn a_moving_sensor_triggers_a_free_standing_sensor() {
    // The mop head (kinematic sensor, "tool" group) over a dirt spot (free sensor, "sensor" group).
    let mut p = Physics::new();
    p.new_cylinder(0.3, 0.5);
    p.pending_pose(0.0, 0.3, -2.0, 0.0, 0.0, 0.0, 1.0);
    p.pending_groups(ig(&[6], &[1, 3, 9]), ALL);
    p.pending_flags(true, true, true);
    let spot = p.attach(-1) as u32;
    let head = body(&mut p, BodyKind::KinematicPosition, [0.0, -50.0, 0.0]);
    p.new_ball(0.28);
    p.pending_groups(ig(&[9], &[6]), ALL);
    p.pending_flags(true, true, true);
    let hc = p.attach(head as i32) as u32;
    p.step();
    let mut entered = false;
    for i in 0..60 {
        let z = -0.1 * i as f32;
        p.set_next_kinematic_translation(head, 0.0, 0.15, z);
        p.step();
        for e in p.events.chunks_exact(EVENT_STRIDE) {
            let pair = (e[1] == spot && e[2] == hc) || (e[1] == hc && e[2] == spot);
            entered |= pair && e[0] == EV_COLLISION_STARTED && e[3] & EVF_SENSOR != 0;
        }
    }
    assert!(entered, "two sensors intersecting report an event");
}
