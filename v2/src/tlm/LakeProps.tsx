import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, CylinderCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { CanvasTexture, SRGBColorSpace, type Group } from 'three';
import { rng, useWorld, type Vec3 } from '@runek/core';
import { G } from '../game/systems/groups';
import { Poster } from './Poster';

/**
 * "Frozen mountain lake" set pieces (a warehouse floor, a white tarp, a painted backdrop).
 * runek contract: position/rotation, units from useWorld(), seeded, no assets.
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

/** Painted mountains on canvas flats, with the seam between two flats taped over. */
export function Backdrop({ position = [0, 0, 0], rotation = [0, 0, 0], width = 30, height = 7, seed = 3 }: Placed & { width?: number; height?: number; seed?: number }) {
  const { unit: u } = useWorld();
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = Math.round((2048 * height) / width);
    const g = c.getContext('2d')!;
    const W = c.width;
    const H = c.height;
    const r = rng(seed);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#7fb0d8');
    sky.addColorStop(1, '#dbe9f2');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    // Three ranges, back to front, each a seeded zigzag with snowcaps.
    const ranges = [
      { base: 0.62, amp: 0.38, col: '#8ea3b8', snow: 0.12 },
      { base: 0.72, amp: 0.3, col: '#6c8297', snow: 0.1 },
      { base: 0.84, amp: 0.2, col: '#4d6275', snow: 0 },
    ];
    for (const rg of ranges) {
      const peaks: [number, number][] = [];
      for (let x = -50; x <= W + 50; x += 120 + r() * 160) peaks.push([x, H * (rg.base - rg.amp * (0.4 + r() * 0.6))]);
      g.fillStyle = rg.col;
      g.beginPath();
      g.moveTo(0, H);
      peaks.forEach(([x, y], i) => {
        g.lineTo(x, y);
        const nx = peaks[i + 1]?.[0] ?? W + 50;
        g.lineTo((x + nx) / 2, H * rg.base);
      });
      g.lineTo(W, H);
      g.fill();
      if (rg.snow) {
        g.fillStyle = '#f7fbff';
        for (const [x, y] of peaks) {
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x - 40, y + H * rg.snow);
          g.lineTo(x + 40, y + H * rg.snow);
          g.fill();
        }
      }
    }
    // Pine trees along the shore, all the same tree.
    g.fillStyle = '#2f4a3a';
    for (let x = 10; x < W; x += 36 + r() * 30) {
      const h = H * (0.08 + r() * 0.05);
      g.beginPath();
      g.moveTo(x, H - h);
      g.lineTo(x - h * 0.3, H);
      g.lineTo(x + h * 0.3, H);
      g.fill();
    }
    // The seam between the two flats, taped (badly).
    g.fillStyle = 'rgba(40,30,20,0.55)';
    g.fillRect(W * 0.5 - 2, 0, 4, H);
    g.fillStyle = '#d8cfa8';
    for (let y = H * 0.1; y < H; y += H * 0.22) g.fillRect(W * 0.5 - 30, y, 60, 26);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [width, height, seed]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, (height * u) / 2, 0]}>
        <planeGeometry args={[width * u, height * u]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* the wooden flat braces, visible from behind */}
      {[-0.25, 0.25].map((k) => (
        <Box key={k} size={[0.1 * u, height * u, 0.1 * u]} at={[k * width * u, (height * u) / 2, -0.2 * u]} color="#8a6a48" />
      ))}
    </group>
  );
}

/** Cherokee Jack's van. He lives in it. Don't touch the jars. */
export function Van({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placed) {
  const { unit: u } = useWorld();
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[1.1 * u, 1.1 * u, 2.4 * u]} position={[0, 1.2 * u, 0]} />
      <Box size={[2.2 * u, 1.9 * u, 4.8 * u]} at={[0, 1.3 * u, 0]} color="#c7b48a" />
      <Box size={[2.22 * u, 0.25 * u, 4.82 * u]} at={[0, 1.0 * u, 0]} color="#8c4b2a" />
      <Box size={[2.0 * u, 0.6 * u, 0.05 * u]} at={[0, 1.75 * u, 2.41 * u]} color="#2b3b44" />
      {[-1.6, 1.6].map((z) =>
        [-1.1, 1.1].map((x) => (
          <mesh key={`${x}${z}`} position={[x * u, 0.38 * u, z * u]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.38 * u, 0.38 * u, 0.25 * u, 16]} />
            <meshStandardMaterial color="#151515" />
          </mesh>
        )),
      )}
      {/* side window full of jars */}
      <Box size={[0.04 * u, 0.55 * u, 1.4 * u]} at={[1.11 * u, 1.75 * u, -0.6 * u]} color="#2b3b44" />
      {[-1.1, -0.85, -0.6, -0.35, -0.1].map((z, i) => (
        <mesh key={z} position={[1.06 * u, 1.62 * u, z * u]}>
          <cylinderGeometry args={[0.07 * u, 0.07 * u, 0.2 * u, 10]} />
          <meshStandardMaterial color={['#9bbf6a', '#d9a441', '#b85b4a', '#7a9fb5', '#e0d070'][i]} transparent opacity={0.85} />
        </mesh>
      ))}
      <Poster position={[1.13 * u, 0.85 * u, 0.9 * u]} rotation={[0, Math.PI / 2, 0]} size={[1.6, 0.4]} lines={[{ text: 'NOT A VAN DOWN BY THE LAKE' }]} font="marker" background="#f2efe6" board={false} />
    </RigidBody>
  );
}

/** A desk fan, credited in the script as "wind". */
export function DeskFan({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placed) {
  const { unit: u } = useWorld();
  const blades = useRef<Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.z += dt * 18;
  });
  return (
    <group position={position} rotation={rotation}>
      <Box size={[0.3 * u, 0.05 * u, 0.3 * u]} at={[0, 0.025 * u, 0]} color="#ddd" />
      <Box size={[0.04 * u, 0.5 * u, 0.04 * u]} at={[0, 0.27 * u, 0]} color="#ccc" />
      <mesh position={[0, 0.6 * u, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2 * u, 0.012 * u, 6, 24]} />
        <meshStandardMaterial color="#bbb" metalness={0.6} />
      </mesh>
      <group ref={blades} position={[0, 0.6 * u, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[0, 0, 0]}>
            <boxGeometry args={[0.06 * u, 0.34 * u, 0.01 * u]} />
            <meshStandardMaterial color="#9ad0f5" transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Wayne, the Roomba. Liberated from a Sharper Image in 1998. Wanders in slow circles. */
export function Roomba({ position = [0, 0, 0], radius = 3, seed = 1 }: { position?: Vec3; radius?: number; seed?: number }) {
  const { unit: u } = useWorld();
  const g = useRef<Group>(null);
  const phase = useMemo(() => rng(seed)() * Math.PI * 2, [seed]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.25 + phase;
    if (!g.current) return;
    g.current.position.set(position[0] + Math.cos(t) * radius * u, position[1], position[2] + Math.sin(t * 1.3) * radius * 0.6 * u);
    g.current.rotation.y = -t + Math.sin(t * 2) * 0.4;
  });
  return (
    <group ref={g}>
      <mesh position={[0, 0.05 * u, 0]} castShadow>
        <cylinderGeometry args={[0.17 * u, 0.17 * u, 0.08 * u, 24]} />
        <meshStandardMaterial color="#2b2b2e" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.095 * u, 0.08 * u]}>
        <sphereGeometry args={[0.02 * u, 8, 6]} />
        <meshBasicMaterial color="#42ff7a" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A training cone: a dynamic body, so it tips when skated into (and counts as a knock). */
export function Cone({ position = [0, 0, 0], color = '#ff6a14', onKnock }: { position?: Vec3; color?: string; onKnock?: () => void }) {
  const { unit: u } = useWorld();
  const body = useRef<RapierRigidBody>(null);
  const knocked = useRef(false);
  useFrame(() => {
    const b = body.current;
    if (!b || knocked.current) return;
    const r = b.rotation();
    // Tipped more than ~35° from upright.
    if (1 - 2 * (r.x * r.x + r.z * r.z) < 0.82) {
      knocked.current = true;
      onKnock?.();
    }
  });
  return (
    <RigidBody ref={body} type="dynamic" colliders={false} position={position} collisionGroups={G.prop}>
      <CylinderCollider args={[0.22 * u, 0.13 * u]} position={[0, 0.22 * u, 0]} density={120} collisionGroups={G.prop} />
      <mesh position={[0, 0.22 * u, 0]} castShadow>
        <coneGeometry args={[0.14 * u, 0.44 * u, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.02 * u, 0]}>
        <boxGeometry args={[0.3 * u, 0.04 * u, 0.3 * u]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
}

/** The "car": two dining chairs, a cardboard hood and a steering wheel from a board game. */
export function CardboardCar({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placed) {
  const { unit: u } = useWorld();
  return (
    <group position={position} rotation={rotation}>
      <Box size={[1.8 * u, 0.7 * u, 0.06 * u]} at={[0, 0.75 * u, 0.9 * u]} color="#b8925e" />
      <Box size={[1.8 * u, 0.06 * u, 0.9 * u]} at={[0, 1.08 * u, 1.3 * u]} color="#b8925e" />
      <Box size={[0.06 * u, 0.6 * u, 2.2 * u]} at={[-0.9 * u, 0.6 * u, 0.2 * u]} color="#a8844f" />
      <Box size={[0.06 * u, 0.6 * u, 2.2 * u]} at={[0.9 * u, 0.6 * u, 0.2 * u]} color="#a8844f" />
      <mesh position={[0.45 * u, 1.05 * u, 0.7 * u]} rotation={[Math.PI / 2.8, 0, 0]}>
        <torusGeometry args={[0.16 * u, 0.025 * u, 8, 20]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <Poster position={[0, 0.75 * u, 0.94 * u]} size={[1.0, 0.25]} lines={[{ text: 'CAR' }]} font="marker" background="#b8925e" board={false} />
    </group>
  );
}
