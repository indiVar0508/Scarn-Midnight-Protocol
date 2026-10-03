import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useWorld, type Vec3 } from '@runek/core';
import { floorSurface } from '../runek/surfaces/floor';

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
}

/**
 * A sound-stage floor. Same surface as runek's `Floor`, but with an explicit collider built
 * in the same commit as the mesh (CONTRACT §12): runek's Floor uses automatic colliders,
 * which arrive a commit late, so actors and dynamic props spawned on it fell straight through.
 */
export function SetFloor({ position, rotation = [0, 0, 0], size = [8, 8], thickness = 0.3, color, marks = [], friction }: SetFloorProps) {
  const { unit, palette, ground } = useWorld();
  const w = size[0] * unit;
  const d = size[1] * unit;
  const t = thickness * unit;
  return (
    <RigidBody type="fixed" colliders={false} position={position ?? [0, ground, 0]} rotation={rotation}>
      <CuboidCollider args={[w / 2, t / 2, d / 2]} position={[0, -t / 2, 0]} friction={friction} />
      <mesh receiveShadow position={[0, -t / 2, 0]}>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial color={color ?? palette.floor} roughness={0.95} />
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
