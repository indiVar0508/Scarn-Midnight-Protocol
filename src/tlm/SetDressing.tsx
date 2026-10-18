import { CuboidCollider, RigidBody } from '@react-three/rapier';
import type { Vec3 } from '@runek/core';
import { G } from '../game/systems/groups';
import { Poster, type PosterLine } from './Poster';

/**
 * Small set-dressing pieces the scene files place as runek WorldData nodes (src/sets). Each
 * takes plain JSON props so a world file can place it.
 */

interface Placed {
  position?: Vec3;
  rotation?: Vec3;
}

const CARDBOARD = '#c9a777';

/** A cardboard sign hung from the grid on two strings. Its face is local +Z. */
export function Hanging({ position, rotation, size, lines }: Placed & { size: [number, number]; lines: PosterLine[] }) {
  return (
    <group position={position} rotation={rotation}>
      <Poster position={[0, 0, 0]} size={size} lines={lines} font="marker" background={CARDBOARD} color="#1b1b1b" />
      {[-0.4, 0.4].map((k) => (
        <mesh key={k} position={[k * size[0], size[1] / 2 + 0.6, 0]}>
          <boxGeometry args={[0.01, 1.2, 0.01]} />
          <meshBasicMaterial color="#222" />
        </mesh>
      ))}
    </group>
  );
}

/** A coffee mug, origin at its base, the print facing local +Z. */
export function Mug({ position, rotation, text }: Placed & { text: string }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.05, 0.045, 0.11, 16]} />
        <meshStandardMaterial color="#f6f4ee" />
      </mesh>
      <Poster position={[0, 0.055, 0.051]} size={[0.08, 0.06]} lines={[{ text }]} font="serif" board={false} />
    </group>
  );
}

/** A plain box: a shower curtain, a red-stapler hotline, a ceiling light panel. `glow` ignores lighting. */
export function Slab({ position, rotation, size, color, opacity, glow }: Placed & { size: Vec3; color: string; opacity?: number; glow?: boolean }) {
  return (
    <mesh position={position} rotation={rotation} castShadow={!glow} receiveShadow={!glow}>
      <boxGeometry args={size} />
      {glow ? (
        <meshBasicMaterial color={color} />
      ) : (
        <meshStandardMaterial color={color} transparent={opacity !== undefined} opacity={opacity ?? 1} />
      )}
    </mesh>
  );
}

/** A flat ellipse on the floor (the "oval" rug, cut by hand from a carpet sample). */
export function Disc({ position, size, color }: { position?: Vec3; size: [number, number]; color: string }) {
  return (
    <mesh position={position} scale={[size[0], 1, size[1]]} receiveShadow>
      <cylinderGeometry args={[1, 1, 0.01, 48]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/**
 * The open side of a set: an invisible line actors don't cross (rapier collider on the
 * BARRIER layer: blocks the player and goons, not props or shots). `size` is full extents.
 */
export function Barrier({ position, rotation, size }: Placed & { size: Vec3 }) {
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} collisionGroups={G.barrier} />
    </RigidBody>
  );
}
