import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, InstancedRigidBodies, RigidBody, type InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier';
import { Color, Euler, InstancedMesh, Quaternion, Vector3 } from 'three';
import { rng, sub, useWorld, type Vec3 } from '@runek/core';
import { G } from '../game/systems/groups';

/** Copy-paper wrappers. Mostly white; Michael insists the coloured ones are "the premium line". */
const WRAPPERS = ['#f6f4ee', '#f6f4ee', '#f6f4ee', '#e3ecff', '#fff1cf', '#ffe0e0', '#e2f7e4'];
export const REAM: Vec3 = [0.22, 0.055, 0.29];
const REAM_DENSITY = 800; // ≈ 2.8 kg a ream
const FRAME_DENSITY = 110;

export interface PaperShelfProps {
  position?: Vec3;
  rotation?: Vec3;
  seed?: number;
  width?: number;
  height?: number;
  depth?: number;
  /** Number of boards, bottom to top. */
  boards?: number;
  /** 0..1 chance a ream slot is stocked. */
  fill?: number;
  /** Reams stacked per slot. */
  layers?: number;
  /** Defaults to the palette's `metal` slot. */
  color?: string;
  /** Fired once when the unit tips past ~50°. */
  onTopple?: () => void;
}

/**
 * Warehouse shelving stocked with paper reams. Unlike runek's fixed `Shelf`, the frame
 * is a dynamic body (compound colliders per board and upright) and every ream is its
 * own body, so the whole unit can be shot, shoved and toppled. Reams render as one
 * instanced mesh.
 */
export function PaperShelf({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  width = 1.8,
  height = 2.1,
  depth = 0.55,
  boards = 4,
  fill = 0.85,
  layers = 2,
  color,
  onTopple,
}: PaperShelfProps) {
  const { unit, palette } = useWorld();
  const frameColor = color ?? palette.metal;
  const w = width * unit;
  const h = height * unit;
  const d = depth * unit;
  const post = 0.04 * unit;
  const board = 0.03 * unit;

  const boardYs = useMemo(() => {
    const ys: number[] = [];
    for (let i = 0; i < boards; i++) ys.push(0.1 * unit + (i * (h - 0.2 * unit)) / Math.max(1, boards - 1));
    return ys;
  }, [boards, h, unit]);

  // Reams in world space (InstancedRigidBodies wants absolute transforms).
  const { instances, colors } = useMemo(() => {
    const r = rng(sub(seed, 7));
    const q = new Quaternion().setFromEuler(new Euler(...rotation));
    const origin = new Vector3(...position);
    const [rw, rh] = REAM.map((v) => v * unit);
    const cols = Math.max(1, Math.floor((w - post * 2) / (rw + 0.02 * unit)));
    const span = cols * (rw + 0.02 * unit);
    const out: InstancedRigidBodyProps[] = [];
    const cs: string[] = [];
    boardYs.forEach((by, bi) => {
      for (let c = 0; c < cols; c++) {
        if (r() > fill) continue;
        const n = 1 + Math.floor(r() * layers);
        for (let l = 0; l < n; l++) {
          const local = new Vector3(-span / 2 + (c + 0.5) * (rw + 0.02 * unit), by + board / 2 + rh / 2 + l * (rh + 0.002) + 0.001, (r() - 0.5) * 0.04 * unit);
          const p = local.applyQuaternion(q).add(origin);
          out.push({ key: `${bi}-${c}-${l}`, position: [p.x, p.y, p.z], rotation: [rotation[0], rotation[1] + (r() - 0.5) * 0.08, rotation[2]] });
          cs.push(WRAPPERS[Math.floor(r() * WRAPPERS.length)]);
        }
      }
    });
    return { instances: out, colors: cs };
  }, [seed, position, rotation, unit, w, post, board, boardYs, fill, layers]);

  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new Color();
    colors.forEach((hex, i) => m.setColorAt(i, c.set(hex)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [colors]);

  const frame = useRef<RapierRigidBody>(null);
  const toppled = useRef(false);
  const check = useRef(0);
  useFrame((_, dt) => {
    check.current -= dt;
    if (toppled.current || check.current > 0 || !frame.current) return;
    check.current = 0.25;
    const rq = frame.current.rotation();
    const upY = new Vector3(0, 1, 0).applyQuaternion(new Quaternion(rq.x, rq.y, rq.z, rq.w)).y;
    if (upY < 0.64) {
      toppled.current = true;
      onTopple?.();
    }
  });

  return (
    <>
      <RigidBody ref={frame} type="dynamic" colliders={false} position={position} rotation={rotation} canSleep>
        {[-1, 1].map((side) => (
          <group key={side}>
            <CuboidCollider args={[post / 2, h / 2, d / 2]} position={[(side * (w - post)) / 2, h / 2, 0]} density={FRAME_DENSITY} collisionGroups={G.prop} />
            <mesh castShadow receiveShadow position={[(side * (w - post)) / 2, h / 2, 0]}>
              <boxGeometry args={[post, h, d]} />
              <meshStandardMaterial color={frameColor} metalness={0.4} roughness={0.6} />
            </mesh>
          </group>
        ))}
        {boardYs.map((y) => (
          <group key={y}>
            <CuboidCollider args={[w / 2 - post, board / 2, d / 2]} position={[0, y, 0]} density={FRAME_DENSITY} collisionGroups={G.prop} />
            <mesh castShadow receiveShadow position={[0, y, 0]}>
              <boxGeometry args={[w - post * 2, board, d]} />
              <meshStandardMaterial color="#c9a227" metalness={0.2} roughness={0.7} />
            </mesh>
          </group>
        ))}
      </RigidBody>
      {instances.length > 0 && (
        <InstancedRigidBodies instances={instances} colliders="cuboid" density={REAM_DENSITY} collisionGroups={G.prop} canSleep>
          <instancedMesh ref={mesh} args={[undefined, undefined, instances.length]} count={instances.length} castShadow receiveShadow>
            <boxGeometry args={[REAM[0] * unit, REAM[1] * unit, REAM[2] * unit]} />
            <meshStandardMaterial roughness={0.9} />
          </instancedMesh>
        </InstancedRigidBodies>
      )}
    </>
  );
}

PaperShelf.groundSitting = true;
