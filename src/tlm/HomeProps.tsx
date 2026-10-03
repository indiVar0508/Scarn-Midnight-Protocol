import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useWorld, type Vec3 } from '@runek/core';
import type { MeshBasicMaterial } from 'three';

/**
 * Scarn Manor set pieces (a condo playing a mansion). runek contract: position/rotation,
 * units from `useWorld()`, one cuboid collider per gameplay chunk, no assets.
 */
interface Placed {
  position?: Vec3;
  rotation?: Vec3;
}

function Box({ size, at, color, rough = 0.8, metal = 0 }: { size: Vec3; at: Vec3; color: string; rough?: number; metal?: number }) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
    </mesh>
  );
}

/** A tired three-seater. It has seen The Notebook twice in one night. */
export function Couch({ position = [0, 0, 0], rotation = [0, 0, 0], color = '#7a5a46' }: Placed & { color?: string }) {
  const { unit: u } = useWorld();
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[1.1 * u, 0.42 * u, 0.45 * u]} position={[0, 0.42 * u, 0]} />
      <Box size={[2.2 * u, 0.42 * u, 0.9 * u]} at={[0, 0.25 * u, 0]} color={color} />
      <Box size={[2.2 * u, 0.55 * u, 0.22 * u]} at={[0, 0.7 * u, -0.34 * u]} color={color} />
      {[-1.02, 1.02].map((x) => (
        <Box key={x} size={[0.2 * u, 0.62 * u, 0.9 * u]} at={[x * u, 0.36 * u, 0]} color={color} />
      ))}
      {[-0.5, 0.5].map((x) => (
        <Box key={x} size={[0.95 * u, 0.12 * u, 0.62 * u]} at={[x * u, 0.52 * u, 0.08 * u]} color="#8d6a54" />
      ))}
    </RigidBody>
  );
}

/** The armchair Scarn fell asleep in after a Kahlua night. */
export function Armchair({ position = [0, 0, 0], rotation = [0, 0, 0], color = '#5b3b2c' }: Placed & { color?: string }) {
  const { unit: u } = useWorld();
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[0.5 * u, 0.45 * u, 0.45 * u]} position={[0, 0.45 * u, 0]} />
      <Box size={[1.0 * u, 0.45 * u, 0.9 * u]} at={[0, 0.25 * u, 0]} color={color} />
      <Box size={[1.0 * u, 0.6 * u, 0.2 * u]} at={[0, 0.75 * u, -0.35 * u]} color={color} />
      {[-0.42, 0.42].map((x) => (
        <Box key={x} size={[0.16 * u, 0.6 * u, 0.9 * u]} at={[x * u, 0.38 * u, 0]} color={color} />
      ))}
    </RigidBody>
  );
}

/** "A fireplace. On a TV." A flat TV on a stand playing a looping fire, crackle setting on. */
export function TvFireplace({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placed) {
  const { unit: u } = useWorld();
  const fire = useRef<MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (fire.current) fire.current.color.setRGB(1, 0.42 + Math.sin(t * 11) * 0.06 + Math.sin(t * 23) * 0.04, 0.08);
  });
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[0.8 * u, 0.3 * u, 0.25 * u]} position={[0, 0.3 * u, 0]} />
      <Box size={[1.6 * u, 0.6 * u, 0.5 * u]} at={[0, 0.3 * u, 0]} color="#3a2a20" />
      <Box size={[1.3 * u, 0.78 * u, 0.06 * u]} at={[0, 1.05 * u, -0.1 * u]} color="#111" />
      <mesh position={[0, 1.05 * u, -0.066 * u]}>
        <planeGeometry args={[1.18 * u, 0.66 * u]} />
        <meshBasicMaterial ref={fire} color="#ff6a14" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.0 * u, 0.4 * u]} intensity={2.5} distance={4 * u} color="#ff8a3a" />
    </RigidBody>
  );
}

/** A gold trophy (self-awarded). */
export function Trophy({ position = [0, 0, 0], scale = 1 }: { position?: Vec3; scale?: number }) {
  const { unit: u } = useWorld();
  const s = scale * u;
  return (
    <group position={position}>
      <Box size={[0.14 * s, 0.05 * s, 0.14 * s]} at={[0, 0.025 * s, 0]} color="#2a1d14" />
      <mesh position={[0, 0.11 * s, 0]}>
        <cylinderGeometry args={[0.015 * s, 0.025 * s, 0.12 * s, 10]} />
        <meshStandardMaterial color="#e8b923" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.22 * s, 0]}>
        <cylinderGeometry args={[0.07 * s, 0.03 * s, 0.12 * s, 16]} />
        <meshStandardMaterial color="#e8b923" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  );
}

/** Samuel's bathtub, now a beet farm. Scarn showers at the Y. */
export function BeetTub({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placed) {
  const { unit: u } = useWorld();
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[0.85 * u, 0.3 * u, 0.4 * u]} position={[0, 0.3 * u, 0]} />
      <Box size={[1.7 * u, 0.55 * u, 0.8 * u]} at={[0, 0.28 * u, 0]} color="#f2f0ea" rough={0.3} />
      <Box size={[1.5 * u, 0.04 * u, 0.62 * u]} at={[0, 0.5 * u, 0]} color="#4a3324" />
      {[-0.5, -0.15, 0.2, 0.55].map((x, i) => (
        <group key={x} position={[x * u, 0.56 * u, (i % 2 ? 0.12 : -0.1) * u]}>
          <mesh>
            <sphereGeometry args={[0.07 * u, 12, 10]} />
            <meshStandardMaterial color="#7a1030" />
          </mesh>
          <mesh position={[0, 0.1 * u, 0]}>
            <coneGeometry args={[0.05 * u, 0.14 * u, 6]} />
            <meshStandardMaterial color="#3f7a2e" />
          </mesh>
        </group>
      ))}
    </RigidBody>
  );
}
