import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useWorld, type Vec3 } from '@runek/core';
import { Poster } from './Poster';

/**
 * Dunder Mifflin set pieces. Each follows the runek contract (position/rotation props, units
 * from `useWorld()`, one cuboid collider per gameplay chunk, no assets).
 */

interface Placed {
  position?: Vec3;
  rotation?: Vec3;
}

function Box({ size, at, color, metal = 0, rough = 0.7 }: { size: Vec3; at: Vec3; color: string; metal?: number; rough?: number }) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={metal} roughness={rough} />
    </mesh>
  );
}

/** The warehouse forklift. "So big. So hard to handle." (v1 Ch1 gag.) */
export function Forklift({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placed) {
  const { unit: u } = useWorld();
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[0.6 * u, 1.1 * u, 1.2 * u]} position={[0, 1.1 * u, 0]} />
      <Box size={[1.2 * u, 0.7 * u, 1.8 * u]} at={[0, 0.65 * u, 0]} color="#e3b51f" />
      <Box size={[1.1 * u, 0.12 * u, 0.9 * u]} at={[0, 2.15 * u, -0.1 * u]} color="#2a2a2a" metal={0.5} />
      {[-0.5, 0.5].map((x) =>
        [-0.5, 0.35].map((z) => <Box key={`${x}${z}`} size={[0.06 * u, 1.2 * u, 0.06 * u]} at={[x * u, 1.6 * u, z * u]} color="#2a2a2a" metal={0.5} />),
      )}
      <Box size={[0.5 * u, 0.5 * u, 0.4 * u]} at={[0, 1.25 * u, 0.25 * u]} color="#222" />
      {/* mast + forks */}
      <Box size={[0.9 * u, 2.4 * u, 0.1 * u]} at={[0, 1.2 * u, -0.95 * u]} color="#333" metal={0.6} />
      {[-0.28, 0.28].map((x) => (
        <Box key={x} size={[0.1 * u, 0.06 * u, 1.1 * u]} at={[x * u, 0.12 * u, -1.5 * u]} color="#3a3a3a" metal={0.6} />
      ))}
      {[
        [-0.62, 0.55],
        [0.62, 0.55],
        [-0.62, -0.6],
        [0.62, -0.6],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * u, 0.3 * u, z * u]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.3 * u, 0.3 * u, 0.22 * u, 16]} />
          <meshStandardMaterial color="#151515" />
        </mesh>
      ))}
    </RigidBody>
  );
}

/** The cardboard baler. Everyone in the warehouse has a story about the baler. */
export function Baler({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placed) {
  const { unit: u } = useWorld();
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[0.8 * u, 1.4 * u, 0.7 * u]} position={[0, 1.4 * u, 0]} />
      <Box size={[1.6 * u, 2.8 * u, 1.4 * u]} at={[0, 1.4 * u, 0]} color="#4f6d8a" metal={0.4} rough={0.5} />
      <Box size={[1.2 * u, 0.9 * u, 0.05 * u]} at={[0, 1.1 * u, 0.71 * u]} color="#1c2733" />
      <Poster position={[0, 2.2 * u, 0.72 * u]} size={[1.1, 0.42]} lines={[{ text: 'DANGER', color: '#fff' }, { text: 'DO NOT RIDE THE BALER', size: 0.6, color: '#fff' }]} background="#c0392b" board={false} />
    </RigidBody>
  );
}

/** A bullpen desk: laminate top, beige CRT monitor, keyboard, a mug. */
export function OfficeDesk({ position = [0, 0, 0], rotation = [0, 0, 0], mug }: Placed & { mug?: string }) {
  const { unit: u } = useWorld();
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[0.8 * u, 0.38 * u, 0.4 * u]} position={[0, 0.38 * u, 0]} />
      <Box size={[1.6 * u, 0.05 * u, 0.8 * u]} at={[0, 0.74 * u, 0]} color="#8a7356" />
      <Box size={[0.05 * u, 0.72 * u, 0.75 * u]} at={[-0.77 * u, 0.36 * u, 0]} color="#6d5a43" />
      <Box size={[0.45 * u, 0.72 * u, 0.75 * u]} at={[0.57 * u, 0.36 * u, 0]} color="#6d5a43" />
      <Box size={[0.42 * u, 0.36 * u, 0.4 * u]} at={[-0.2 * u, 0.96 * u, -0.12 * u]} color="#d8d0bd" />
      <Box size={[0.36 * u, 0.28 * u, 0.01 * u]} at={[-0.2 * u, 0.97 * u, 0.085 * u]} color="#2c4a5a" />
      <Box size={[0.45 * u, 0.02 * u, 0.15 * u]} at={[-0.2 * u, 0.775 * u, 0.22 * u]} color="#cfc8b6" />
      {mug && (
        <>
          <mesh position={[0.45 * u, 0.82 * u, 0.15 * u]}>
            <cylinderGeometry args={[0.045 * u, 0.04 * u, 0.1 * u, 14]} />
            <meshStandardMaterial color="#f6f4ee" />
          </mesh>
          <Poster position={[0.45 * u, 0.82 * u, 0.196 * u]} size={[0.07, 0.05]} lines={[{ text: mug, font: 'serif' }]} board={false} />
        </>
      )}
    </RigidBody>
  );
}

/** A canvas director's chair with the name stencilled on the back. */
export function DirectorChair({ position = [0, 0, 0], rotation = [0, 0, 0], name = 'DIRECTOR' }: Placed & { name?: string }) {
  const { unit: u } = useWorld();
  return (
    <group position={position} rotation={rotation}>
      {[-0.25, 0.25].map((x) => (
        <Box key={x} size={[0.04 * u, 1.0 * u, 0.5 * u]} at={[x * u, 0.5 * u, 0]} color="#3b2a1c" />
      ))}
      <Box size={[0.5 * u, 0.03 * u, 0.42 * u]} at={[0, 0.6 * u, 0]} color="#151515" />
      <Box size={[0.52 * u, 0.24 * u, 0.02 * u]} at={[0, 1.05 * u, -0.22 * u]} color="#151515" />
      <Poster position={[0, 1.05 * u, -0.235 * u]} rotation={[0, Math.PI, 0]} size={[0.5, 0.2]} lines={[{ text: name, color: '#f4f1e8' }]} background="#151515" board={false} />
    </group>
  );
}

/** A camcorder on a tripod, pointed at the set. */
export function CameraTripod({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placed) {
  const { unit: u } = useWorld();
  return (
    <group position={position} rotation={rotation}>
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 0.18 * u, 0.7 * u, Math.cos(a) * 0.18 * u]} rotation={[Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25]}>
          <cylinderGeometry args={[0.015 * u, 0.015 * u, 1.45 * u, 6]} />
          <meshStandardMaterial color="#222" metalness={0.6} />
        </mesh>
      ))}
      <Box size={[0.16 * u, 0.16 * u, 0.32 * u]} at={[0, 1.5 * u, 0]} color="#1a1a1a" />
      <mesh position={[0, 1.5 * u, -0.2 * u]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055 * u, 0.06 * u, 0.12 * u, 16]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0.05 * u, 1.62 * u, 0.1 * u]}>
        <sphereGeometry args={[0.015 * u, 8, 6]} />
        <meshBasicMaterial color="#ff2020" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A boom pole with a fuzzy mic hanging over the set line (it dips into frame, of course). */
export function BoomMic({ position = [0, 0, 0], rotation = [0, 0, 0], length = 3.2 }: Placed & { length?: number }) {
  const { unit: u } = useWorld();
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -(length / 2) * u]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018 * u, 0.018 * u, length * u, 8]} />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.12 * u, -length * u]} scale={[1, 1, 2.2]}>
        <sphereGeometry args={[0.08 * u, 12, 10]} />
        <meshStandardMaterial color="#5a5a5a" roughness={1} />
      </mesh>
    </group>
  );
}

/** A grey fabric cubicle divider. */
export function CubicleWall({ position = [0, 0, 0], rotation = [0, 0, 0], width = 1.8 }: Placed & { width?: number }) {
  const { unit: u } = useWorld();
  return (
    <group position={position} rotation={rotation}>
      <Box size={[width * u, 1.25 * u, 0.06 * u]} at={[0, 0.625 * u, 0]} color="#8d8f93" rough={1} />
      <Box size={[width * u, 0.04 * u, 0.08 * u]} at={[0, 1.27 * u, 0]} color="#5e6064" />
    </group>
  );
}
