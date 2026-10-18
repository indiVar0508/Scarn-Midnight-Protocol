import { useEffect, useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useWorld, type Vec3 } from '@runek/core';
import { floorSurface } from '../runek/surfaces/floor';
import { concrete } from './surfaces';

export interface SetFloorProps {
  position?: Vec3;
  rotation?: Vec3;
  /** `[width, depth]` in units. The top surface sits at the component origin. */
  size?: [number, number];
  thickness?: number;
  /** Defaults to the palette's `floor` slot. */
  color?: string;
  /** Surface friction (ice ≈ 0.03). */
  friction?: number;
  /** Painted tape marks (the set's blocking marks), as `[x, z, w, d]` rects in local units. */
  marks?: [number, number, number, number][];
  /** `concrete`: sealed warehouse slab with joints, stains and scuffs (tinted by `color`). */
  finish?: 'plain' | 'concrete';
  seed?: number;
}

/**
 * A sound-stage floor. Same surface as runek's `Floor`, but with an explicit collider built
 * in the same commit as the mesh (CONTRACT §12): runek's Floor uses automatic colliders,
 * which arrive a commit late, so actors and dynamic props spawned on it fell straight through.
 */
export function SetFloor({ position, rotation = [0, 0, 0], size = [8, 8], thickness = 0.3, color, marks = [], friction, finish = 'plain', seed = 7 }: SetFloorProps) {
  const { unit, palette, ground } = useWorld();
  const w = size[0] * unit;
  const d = size[1] * unit;
  const t = thickness * unit;
  // Textured top: clones share the cached canvas source, each with its own tiling.
  const maps = useMemo(() => {
    if (finish !== 'concrete') return null;
    const base = concrete(color ?? palette.floor, seed);
    const map = base.map.clone();
    const roughnessMap = base.roughnessMap.clone();
    for (const tex of [map, roughnessMap]) tex.repeat.set(w / base.tile, d / base.tile);
    return { map, roughnessMap };
  }, [finish, color, palette.floor, seed, w, d]);
  useEffect(() => () => {
    maps?.map.dispose();
    maps?.roughnessMap.dispose();
  }, [maps]);
  return (
    <RigidBody type="fixed" colliders={false} position={position ?? [0, ground, 0]} rotation={rotation}>
      <CuboidCollider args={[w / 2, t / 2, d / 2]} position={[0, -t / 2, 0]} friction={friction} />
      <mesh receiveShadow position={[0, -t / 2, 0]}>
        <boxGeometry args={[w, t, d]} />
        {maps ? (
          <meshStandardMaterial map={maps.map} roughnessMap={maps.roughnessMap} roughness={0.75} metalness={0.02} />
        ) : (
          <meshStandardMaterial color={color ?? palette.floor} roughness={0.95} />
        )}
      </mesh>
      {marks.map(([x, z, mw, md]) => (
        <mesh key={`${x}:${z}`} position={[x * unit, 0.004, z * unit]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[mw * unit, md * unit]} />
          <meshBasicMaterial color={palette.accent} />
        </mesh>
      ))}
    </RigidBody>
  );
}

SetFloor.surface = floorSurface;
