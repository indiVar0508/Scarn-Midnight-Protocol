import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier';
import { pick, range, rng, sub, useWorld, type Vec3 } from '@runek/core';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  type InstancedMesh,
  Matrix4,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  type ShaderMaterial,
  SRGBColorSpace,
  type MeshBasicMaterial,
} from 'three';
import { G } from '../game/systems/groups';
import { Poster, type PosterLine } from './Poster';
import { labelTexture } from './labels';
import { blockWall, corrugated } from './surfaces';

/**
 * The Dunder Mifflin warehouse, dressed (badly) as a supermarket: the building itself (roof,
 * joists, ducts, skylights, lights, racking, dock doors, block walls), the shop dressing (carts,
 * end caps, a freezer, a register) and the air (dust, light shafts). Each follows the runek
 * contract: position/rotation props, plain JSON props, `useWorld()` units, seeded variation.
 */

interface Placed {
  position?: Vec3;
  rotation?: Vec3;
}

const tmp = new Object3D();

/** Fill an instanced mesh from a list of [position, scale, rotationY?] and an optional color list. */
function useInstances(ref: React.RefObject<InstancedMesh | null>, items: [Vec3, Vec3, number?][], colors?: string[]) {
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach(([p, s, ry], i) => {
      tmp.position.set(...p);
      tmp.scale.set(...s);
      tmp.rotation.set(0, ry ?? 0, 0);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    if (colors) {
      const c = new Color();
      colors.forEach((hex, i) => m.setColorAt(i, c.set(hex)));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    m.computeBoundingSphere();
  }, [ref, items, colors]);
}

// ── The building ────────────────────────────────────────────────────────────────────────────────

export interface RaftersProps extends Placed {
  /** Footprint `[width, depth]` and the underside of the roof deck, in units. */
  size?: [number, number];
  height?: number;
  /** Bar-joist spacing along X. */
  spacing?: number;
  /** Skylight centers along X (they run the depth of the roof). */
  skylights?: number[];
}

/**
 * The roof: corrugated deck, open-web bar joists every `spacing`, two girders, a galvanized
 * duct run and skylights. Purely visual (nothing reaches it).
 */
export function Rafters({ position = [0, 0, 0], rotation = [0, 0, 0], size = [38, 18], height = 7.2, spacing = 2, skylights = [] }: RaftersProps) {
  const { unit } = useWorld();
  const [w, d] = [size[0] * unit, size[1] * unit];
  const h = height * unit;
  const deck = useMemo(() => {
    const base = corrugated('#5f666c', 11);
    const map = base.map.clone();
    map.repeat.set(d / 1.5, w / 1.5);
    map.rotation = Math.PI / 2;
    return map;
  }, [w, d]);
  useEffect(() => () => deck.dispose(), [deck]);

  // Joists: top and bottom chords plus a zig-zag web, all one instanced box.
  const bars = useMemo(() => {
    const out: [Vec3, Vec3, number?][] = [];
    const depthJ = 0.55 * unit;
    for (let x = -w / 2 + spacing / 2; x < w / 2; x += spacing * unit) {
      out.push([[x, h - 0.03, 0], [0.07, 0.06, d]]);
      out.push([[x, h - depthJ, 0], [0.07, 0.06, d]]);
      const n = Math.floor(d / (0.7 * unit));
      for (let k = 0; k < n; k++) {
        const z = -d / 2 + (k + 0.5) * (d / n);
        out.push([[x, h - depthJ / 2, z], [0.03, depthJ * 1.15, 0.03]]);
      }
    }
    for (const z of [-d / 4, d / 4]) out.push([[0, h - 0.4 * unit, z], [w, 0.7 * unit, 0.22 * unit]]);
    return out;
  }, [w, d, h, spacing, unit]);
  const barMesh = useRef<InstancedMesh>(null);
  useInstances(barMesh, bars);
  // Web members lean alternately; tilt them after the generic fill.
  useLayoutEffect(() => {
    const m = barMesh.current;
    if (!m) return;
    const mat = new Matrix4();
    bars.forEach(([p, s], i) => {
      if (s[0] !== 0.03) return;
      tmp.position.set(...p);
      tmp.scale.set(...s);
      tmp.rotation.set(i % 2 ? 0.6 : -0.6, 0, 0);
      tmp.updateMatrix();
      m.setMatrixAt(i, mat.copy(tmp.matrix));
    });
    m.instanceMatrix.needsUpdate = true;
  }, [bars]);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, h + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={deck} color="#8d949a" roughness={0.85} metalness={0.3} />
      </mesh>
      <instancedMesh ref={barMesh} args={[undefined, undefined, bars.length]} castShadow={false}>
        <boxGeometry />
        <meshStandardMaterial color="#454b52" metalness={0.5} roughness={0.55} />
      </instancedMesh>
      {/* Duct run, hung below the joists. */}
      <mesh position={[0, h - 1.05 * unit, -d / 2 + 2.2 * unit]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.38 * unit, 0.38 * unit, w * 0.96, 20, 1, true]} />
        <meshStandardMaterial color="#b4bcc2" metalness={0.85} roughness={0.32} side={DoubleSide} />
      </mesh>
      {skylights.map((x) => (
        <mesh key={x} position={[x * unit, h + 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.4 * unit, d * 0.8]} />
          <meshBasicMaterial color={[2.2, 2.4, 2.6]} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export interface FluorescentRowProps extends Placed {
  /** Fixtures in the row, end to end along X. */
  count?: number;
  /** Length of one fixture. */
  length?: number;
  gap?: number;
  /** Chain length up to the joists. */
  drop?: number;
  /** One tube in this row flickers (it's a warehouse). */
  flicker?: number;
  seed?: number;
  /** Drop from the row to the floor its light pools land on (default: the row's height). */
  floor?: number;
}

/**
 * A row of hanging fluorescent fixtures, instanced (one draw per part for the whole row). The
 * tubes are HDR (above 1.0, not tone mapped) so the bloom pass picks them up. The light they throw
 * is faked: a soft additive pool on the floor under each fixture, `floor` units below the row. A
 * real point light per fixture made every lit shader in the scene several times bigger (a 10 s
 * compile freeze and a third of the frame rate on an integrated GPU).
 */
export function FluorescentRow({ position = [0, 5.6, 0], rotation = [0, 0, 0], count = 4, length = 2.4, gap = 1.2, drop = 1.2, flicker = -1, seed = 1, floor }: FluorescentRowProps) {
  const { unit } = useWorld();
  const L = length * unit;
  const xs = useMemo(() => {
    const span = count * L + (count - 1) * gap * unit;
    return Array.from({ length: count }, (_, i) => -span / 2 + L / 2 + i * (L + gap * unit));
  }, [count, L, gap, unit]);
  const fixtures = useMemo(() => xs.map((x): [Vec3, Vec3] => [[x, 0, 0], [1, 1, 1]]), [xs]);
  const steady = useMemo(() => fixtures.filter((_, i) => i !== flicker), [fixtures, flicker]);
  const chains = useMemo(() => xs.flatMap((x) => [-0.4, 0.4].map((k): [Vec3, Vec3] => [[x + k * L, drop / 2, 0], [1, drop, 1]])), [xs, L, drop]);
  const fall = floor ?? position[1];
  const pools = useMemo(() => xs.map((x): [Vec3, Vec3] => [[x, -fall + 0.02 * unit, 0], [L * 1.7, 1, 4.2 * unit]]), [xs, L, fall, unit]);
  const poolUniforms = useMemo(() => ({ tint: { value: new Color('#eef2ff') }, strength: { value: 0.07 } }), []);
  const housingRef = useRef<InstancedMesh>(null);
  const tubeRef = useRef<InstancedMesh>(null);
  const chainRef = useRef<InstancedMesh>(null);
  const poolRef = useRef<InstancedMesh>(null);
  useInstances(housingRef, fixtures);
  useInstances(tubeRef, steady);
  useInstances(chainRef, chains);
  useInstances(poolRef, pools);
  const flat = useMemo(() => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  useEffect(() => () => flat.dispose(), [flat]);
  const bad = useRef<MeshBasicMaterial>(null);
  const r = useMemo(() => rng(seed), [seed]);
  useFrame(({ clock }) => {
    const m = bad.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const on = Math.sin(t * 23) > -0.6 || Math.sin(t * 3.1) > 0.4 || r() > 0.5;
    m.color.setScalar(on ? 2.6 : 0.25);
  });
  return (
    <group position={position} rotation={rotation}>
      <instancedMesh ref={housingRef} args={[undefined, undefined, fixtures.length]}>
        <boxGeometry args={[L, 0.07 * unit, 0.32 * unit]} />
        <meshStandardMaterial color="#e9e8e2" metalness={0.3} roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={tubeRef} args={[undefined, undefined, steady.length]} position={[0, -0.04 * unit, 0]}>
        <boxGeometry args={[L * 0.96, 0.02 * unit, 0.24 * unit]} />
        <meshBasicMaterial color={[2.6, 2.6, 2.45]} toneMapped={false} />
      </instancedMesh>
      {flicker >= 0 && flicker < xs.length && (
        <mesh position={[xs[flicker], -0.04 * unit, 0]}>
          <boxGeometry args={[L * 0.96, 0.02 * unit, 0.24 * unit]} />
          <meshBasicMaterial ref={bad} color={[2.6, 2.6, 2.45]} toneMapped={false} />
        </mesh>
      )}
      <instancedMesh ref={chainRef} args={[undefined, undefined, chains.length]}>
        <boxGeometry args={[0.012, 1, 0.012]} />
        <meshBasicMaterial color="#2a2a2a" />
      </instancedMesh>
      <instancedMesh ref={poolRef} args={[flat, undefined, pools.length]} renderOrder={1}>
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          uniforms={poolUniforms}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            }`}
          fragmentShader={`
            uniform vec3 tint;
            uniform float strength;
            varying vec2 vUv;
            void main() {
              float a = 1.0 - smoothstep(0.0, 1.0, length((vUv - 0.5) * 2.0));
              gl_FragColor = vec4(tint * a * a * strength, 1.0);
            }`}
        />
      </instancedMesh>
    </group>
  );
}

export interface WallSkinProps extends Placed {
  width?: number;
  height?: number;
  /** Upper paint, lower dado paint, and the dado height. */
  paint?: string;
  lower?: string;
  dado?: number;
  /** Half the wall's thickness: the skin sits just proud of its inner face. */
  offset?: number;
}

/**
 * Painted cinder block over a runek `Wall`: place it with the wall's own position, rotation,
 * width and height. Visual only; the wall keeps its collider.
 */
export function WallSkin({ position = [0, 0, 0], rotation = [0, 0, 0], width = 8, height = 6, paint, lower, dado = 1.2, offset = 0.1 }: WallSkinProps) {
  const { unit } = useWorld();
  const w = width * unit;
  const h = height * unit;
  const maps = useMemo(() => {
    const base = blockWall(paint, lower, height, dado);
    const map = base.map.clone();
    map.repeat.set(w / (base.tile * unit), 1);
    return map;
  }, [paint, lower, height, dado, w, unit]);
  useEffect(() => () => maps.dispose(), [maps]);
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, h / 2, offset * unit + 0.006]} receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={maps} roughness={0.92} />
      </mesh>
    </group>
  );
}

export interface PalletRackProps extends Placed {
  bays?: number;
  levels?: number;
  bayWidth?: number;
  depth?: number;
  height?: number;
  seed?: number;
}

const BOX_TINTS = ['#c8a377', '#bf9a6d', '#d0ad80', '#b8936a'];

/**
 * Selective pallet racking: blue uprights, orange beams, wire decks, and pallets of Dunder
 * Mifflin paper cases (a few empty slots). One fixed collider for the whole run.
 */
export function PalletRack({ position = [0, 0, 0], rotation = [0, 0, 0], bays = 4, levels = 3, bayWidth = 2.7, depth = 1.1, height = 5, seed = 1 }: PalletRackProps) {
  const { unit } = useWorld();
  const bw = bayWidth * unit;
  const D = depth * unit;
  const H = height * unit;
  const W = bays * bw;
  const levelY = (l: number) => 0.15 * unit + (l * (H - 0.4 * unit)) / Math.max(1, levels - 1 || 1);

  const { frame, beams, cases, tints, labels } = useMemo(() => {
    const r = rng(seed);
    const frame: [Vec3, Vec3, number?][] = [];
    const beams: [Vec3, Vec3, number?][] = [];
    const cases: [Vec3, Vec3, number?][] = [];
    const tints: string[] = [];
    const labels: [Vec3, Vec3, number?][] = [];
    for (let b = 0; b <= bays; b++) {
      const x = -W / 2 + b * bw;
      for (const z of [-D / 2, D / 2]) frame.push([[x, H / 2, z], [0.08 * unit, H, 0.08 * unit]]);
      for (let k = 0; k < 6; k++) frame.push([[x, 0.4 * unit + k * (H / 6.5), 0], [0.03 * unit, 0.03 * unit, D]]);
    }
    for (let l = 0; l < levels; l++) {
      const y = levelY(l);
      for (const z of [-D / 2, D / 2]) beams.push([[0, y, z], [W, 0.12 * unit, 0.06 * unit]]);
      for (let b = 0; b < bays; b++) {
        if (r() < 0.12) continue; // an empty slot
        for (const pz of [0]) {
          const cx = -W / 2 + (b + 0.5) * bw;
          // Pallet.
          cases.push([[cx, y + 0.13 * unit, pz], [bw * 0.82, 0.13 * unit, D * 0.95]]);
          tints.push('#8a6a45');
          const rows = l === levels - 1 ? 2 : 3;
          const cols = 4;
          const deep = 2;
          const cw = (bw * 0.8) / cols;
          const cd = (D * 0.9) / deep;
          const ch = 0.28 * unit;
          for (let ry = 0; ry < rows; ry++)
            for (let cxi = 0; cxi < cols; cxi++)
              for (let cz = 0; cz < deep; cz++) {
                if (ry === rows - 1 && r() < 0.25) continue;
                const p: Vec3 = [cx - (bw * 0.8) / 2 + (cxi + 0.5) * cw, y + 0.2 * unit + ry * ch + ch / 2, -D * 0.45 + (cz + 0.5) * cd];
                cases.push([p, [cw * 0.97, ch * 0.97, cd * 0.97], (r() - 0.5) * 0.04]);
                tints.push(pick(r, BOX_TINTS));
                if (cz === deep - 1) labels.push([[p[0], p[1], p[2] + (cd * 0.97) / 2 + 0.003], [cw * 0.8, ch * 0.55, 1]]);
              }
        }
      }
    }
    return { frame, beams, cases, tints, labels };
  }, [seed, bays, levels, bw, D, H, W, unit]);

  const frameMesh = useRef<InstancedMesh>(null);
  const beamMesh = useRef<InstancedMesh>(null);
  const caseMesh = useRef<InstancedMesh>(null);
  const labelMesh = useRef<InstancedMesh>(null);
  useInstances(frameMesh, frame);
  useInstances(beamMesh, beams);
  useInstances(caseMesh, cases, tints);
  useInstances(labelMesh, labels);
  const label = useMemo(
    () => labelTexture({ lines: [{ text: 'DUNDER MIFFLIN', size: 1 }, { text: '10 REAMS · 20 LB · LETTER', size: 0.55, font: 'sans' }], background: '#f2efe6', color: '#1d2d5c', font: 'serif', border: 0.06, borderColor: '#1d2d5c' }, 1.8, 256),
    [],
  );
  useEffect(() => () => label.dispose(), [label]);

  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W / 2, H / 2, D / 2 + 0.05]} position={[0, H / 2, 0]} collisionGroups={G.env} />
      </RigidBody>
      <instancedMesh ref={frameMesh} args={[undefined, undefined, frame.length]} castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="#2f5d9a" metalness={0.4} roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={beamMesh} args={[undefined, undefined, beams.length]} castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="#e0661f" metalness={0.35} roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={caseMesh} args={[undefined, undefined, cases.length]} castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={labelMesh} args={[undefined, undefined, labels.length]}>
        <planeGeometry />
        <meshStandardMaterial map={label} roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

export interface RollDoorProps extends Placed {
  width?: number;
  height?: number;
  /** The dock number stencilled above. */
  number?: number;
  /** 0 closed .. 1 open (rolled up into the header). */
  open?: number;
}

/** A loading-dock roll-up door with its header box, bumpers and yellow bollards. */
export function RollDoor({ position = [0, 0, 0], rotation = [0, 0, 0], width = 3.2, height = 3.6, number = 1, open = 0 }: RollDoorProps) {
  const { unit } = useWorld();
  const w = width * unit;
  const h = height * unit;
  const shown = h * (1 - open);
  const map = useMemo(() => {
    const m = corrugated('#9aa3a8', 5 + number).map.clone();
    m.repeat.set(w / unit, shown / unit);
    return m;
  }, [w, shown, unit, number]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <group position={position} rotation={rotation}>
      {shown > 0.01 && (
        <mesh position={[0, h - shown / 2, 0.02 * unit]} receiveShadow>
          <planeGeometry args={[w, shown]} />
          <meshStandardMaterial map={map} metalness={0.55} roughness={0.5} />
        </mesh>
      )}
      {open > 0 && (
        <mesh position={[0, (h - shown) / 2, 0]}>
          <planeGeometry args={[w, h - shown]} />
          <meshBasicMaterial color="#0b0c0e" />
        </mesh>
      )}
      <mesh position={[0, h + 0.25 * unit, 0.18 * unit]} castShadow>
        <boxGeometry args={[w + 0.3 * unit, 0.5 * unit, 0.35 * unit]} />
        <meshStandardMaterial color="#7a838a" metalness={0.5} roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (w / 2 + 0.06 * unit), h / 2, 0.06 * unit]}>
            <boxGeometry args={[0.1 * unit, h, 0.1 * unit]} />
            <meshStandardMaterial color="#5c646b" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[s * (w / 2 - 0.3 * unit), 0.9 * unit, 0.12 * unit]}>
            <boxGeometry args={[0.25 * unit, 0.45 * unit, 0.12 * unit]} />
            <meshStandardMaterial color="#121212" roughness={0.9} />
          </mesh>
          <Bollard position={[s * (w / 2 + 0.45 * unit), 0, 0.5 * unit]} />
        </group>
      ))}
      <Poster position={[0, h + 0.75 * unit, 0.02 * unit]} size={[1.1, 0.42]} lines={[{ text: `DOCK ${number}` }]} font="bebas" background="#e1b12c" color="#141414" board={false} />
    </group>
  );
}

/** A yellow steel bollard (concrete-filled; it doesn't move). */
export function Bollard({ position = [0, 0, 0], height = 1.1 }: { position?: Vec3; height?: number }) {
  const { unit } = useWorld();
  const h = height * unit;
  const r = 0.08 * unit;
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider args={[h / 2, r]} position={[0, h / 2, 0]} collisionGroups={G.env} />
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 16]} />
        <meshStandardMaterial color="#e3b41f" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, h + 0.01, 0]}>
        <sphereGeometry args={[r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e3b41f" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, h * 0.75, 0]}>
        <cylinderGeometry args={[r * 1.01, r * 1.01, 0.06 * unit, 16, 1, true]} />
        <meshStandardMaterial color="#171717" roughness={0.6} />
      </mesh>
    </RigidBody>
  );
}

/** A lit EXIT sign (HDR red, so it blooms). Its face is local +Z. */
export function ExitSign({ position = [0, 3, 0], rotation = [0, 0, 0] }: Placed) {
  const tex = useMemo(() => labelTexture({ lines: [{ text: 'EXIT' }], background: '#1a0303', color: '#ff2a1a', font: 'sans' }, 2.4, 256), []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[0.5, 0.21, 0.07]} />
        <meshStandardMaterial color="#e7e5df" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.036]}>
        <planeGeometry args={[0.46, 0.18]} />
        <meshBasicMaterial map={tex} color={[2.2, 2.2, 2.2]} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** An office drop ceiling: 60 cm acoustic tiles in a white grid, seen from below. */
export function DropCeiling({ position = [0, 3.2, 0], size = [10, 6] }: { position?: Vec3; size?: [number, number] }) {
  const { unit } = useWorld();
  const [w, d] = [size[0] * unit, size[1] * unit];
  const map = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const r = rng(17);
    g.fillStyle = '#e4e1d8';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(90,85,75,${range(r, 0.05, 0.25)})`;
      g.fillRect(r() * 128, r() * 128, 1, 1 + (r() < 0.3 ? 1 : 0));
    }
    g.fillStyle = '#f7f6f2';
    g.fillRect(0, 0, 128, 4);
    g.fillRect(0, 0, 4, 128);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(w / (0.6 * unit), d / (0.6 * unit));
    t.anisotropy = 8;
    return t;
  }, [w, d, unit]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={map} roughness={0.95} />
    </mesh>
  );
}

// ── The shop ─────────────────────────────────────────────────────────────────────────────────────

/** A see-through wire grid, for cart baskets and freezer racks. */
let wireTex: CanvasTexture | null = null;
function wire() {
  if (wireTex) return wireTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#fff';
  for (let i = 0; i < 64; i += 16) {
    g.fillRect(i, 0, 3, 64);
    g.fillRect(0, i, 64, 3);
  }
  wireTex = new CanvasTexture(c);
  wireTex.wrapS = wireTex.wrapT = RepeatWrapping;
  wireTex.repeat.set(3, 3);
  return wireTex;
}

/**
 * A shopping cart: a dynamic body Scarn can shove (the KCC pushes it) into a goon, which knocks
 * him down like any heavy prop. Chrome wire basket, red handle, four casters.
 */
export function ShoppingCart({ position = [0, 0, 0], rotation = [0, 0, 0], handle = '#c0392b' }: Placed & { handle?: string }) {
  const { unit } = useWorld();
  const u = unit;
  const alpha = wire();
  return (
    <RigidBody type="dynamic" colliders={false} position={position} rotation={rotation} linearDamping={0.6} angularDamping={1.5} canSleep>
      <CuboidCollider args={[0.28 * u, 0.24 * u, 0.45 * u]} position={[0, 0.78 * u, 0]} density={60} friction={0.3} collisionGroups={G.prop} />
      <CuboidCollider args={[0.26 * u, 0.06 * u, 0.4 * u]} position={[0, 0.12 * u, 0]} density={60} friction={0.15} collisionGroups={G.prop} />
      <mesh position={[0, 0.78 * u, 0]} castShadow>
        <boxGeometry args={[0.56 * u, 0.48 * u, 0.9 * u]} />
        <meshStandardMaterial color="#e3e7ea" metalness={0.7} roughness={0.3} alphaMap={alpha} alphaTest={0.5} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.2 * u, 0]}>
        <boxGeometry args={[0.5 * u, 0.03 * u, 0.8 * u]} />
        <meshStandardMaterial color="#c9cdd0" metalness={0.9} roughness={0.3} alphaMap={alpha} alphaTest={0.5} side={DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.25 * u, 0.45 * u, -0.05 * u]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.025 * u, 0.62 * u, 0.025 * u]} />
          <meshStandardMaterial color="#cfd3d6" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 1.04 * u, -0.5 * u]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.022 * u, 0.022 * u, 0.56 * u, 10]} />
        <meshStandardMaterial color={handle} roughness={0.4} />
      </mesh>
      {[
        [-0.22, -0.32],
        [0.22, -0.32],
        [-0.22, 0.34],
        [0.22, 0.34],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * u, 0.05 * u, z * u]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05 * u, 0.05 * u, 0.03 * u, 12]} />
          <meshStandardMaterial color="#1b1b1b" roughness={0.7} />
        </mesh>
      ))}
    </RigidBody>
  );
}

export interface EndCapProps extends Placed {
  /** The header card. */
  lines?: PosterLine[];
  /** Product box colors (it's all paper, in different boxes). */
  colors?: string[];
  seed?: number;
}

/**
 * An end-cap display: a low gondola with a stepped pyramid of product boxes and a header card.
 * Fixed (the boxes are glued, for once).
 */
export function EndCap({ position = [0, 0, 0], rotation = [0, 0, 0], lines = [{ text: "MANAGER'S" }, { text: 'SPECIAL', size: 1.2 }], colors = ['#d9483b', '#f2c94c', '#2d9cdb', '#f6f4ee'], seed = 1 }: EndCapProps) {
  const { unit } = useWorld();
  const u = unit;
  const boxes = useMemo(() => {
    const r = rng(sub(seed, 3));
    const out: [Vec3, Vec3, number?][] = [];
    const tints: string[] = [];
    const rows = 4;
    for (let y = 0; y < rows; y++) {
      const n = rows - y + 1;
      for (let i = 0; i < n; i++) {
        out.push([[(-(n - 1) / 2 + i) * 0.3 * u, 0.42 * u + y * 0.24 * u + 0.11 * u, 0], [0.28 * u, 0.22 * u, 0.36 * u], (r() - 0.5) * 0.12]);
        tints.push(pick(r, colors));
      }
    }
    return { out, tints };
  }, [seed, colors, u]);
  const mesh = useRef<InstancedMesh>(null);
  useInstances(mesh, boxes.out, boxes.tints);
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.85 * u, 0.7 * u, 0.3 * u]} position={[0, 0.7 * u, 0]} collisionGroups={G.env} />
      </RigidBody>
      <mesh position={[0, 0.2 * u, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7 * u, 0.4 * u, 0.6 * u]} />
        <meshStandardMaterial color="#e7e3d8" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.405 * u, 0.301 * u]}>
        <boxGeometry args={[1.7 * u, 0.05 * u, 0.01 * u]} />
        <meshStandardMaterial color="#c0392b" roughness={0.6} />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, boxes.out.length]} castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial roughness={0.75} />
      </instancedMesh>
      <mesh position={[0, 1.95 * u, -0.1 * u]}>
        <boxGeometry args={[0.03 * u, 0.9 * u, 0.03 * u]} />
        <meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} />
      </mesh>
      <Poster position={[0, 2.25 * u, -0.08 * u]} size={[1.3, 0.55]} lines={lines} font="bebas" background="#f2c94c" color="#c0392b" border={0.05} borderColor="#c0392b" />
    </group>
  );
}

/**
 * An upright glass-door freezer: cold-lit interior, rows of brightly boxed frozen food behind
 * frosted glass. Fixed. Its face is local +Z.
 */
export function FreezerCase({ position = [0, 0, 0], rotation = [0, 0, 0], doors = 3, seed = 1 }: Placed & { doors?: number; seed?: number }) {
  const { unit } = useWorld();
  const u = unit;
  const dw = 0.8 * u;
  const W = doors * dw;
  const H = 2.1 * u;
  const D = 0.8 * u;
  const goods = useMemo(() => {
    const r = rng(seed);
    const out: [Vec3, Vec3, number?][] = [];
    const tints: string[] = [];
    for (let s = 0; s < 5; s++) {
      for (let x = -W / 2 + 0.08 * u; x < W / 2 - 0.12 * u; x += range(r, 0.13, 0.2) * u) {
        const h = range(r, 0.14, 0.26) * u;
        out.push([[x + 0.05 * u, 0.25 * u + s * 0.36 * u + h / 2, 0.05 * u], [0.1 * u, h, 0.3 * u]]);
        tints.push(pick(r, ['#e74c3c', '#f39c12', '#27ae60', '#2980b9', '#8e44ad', '#ecf0f1', '#f1c40f']));
      }
    }
    return { out, tints };
  }, [seed, W, u]);
  const mesh = useRef<InstancedMesh>(null);
  useInstances(mesh, goods.out, goods.tints);
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W / 2, H / 2, D / 2]} position={[0, H / 2, 0]} collisionGroups={G.env} />
      </RigidBody>
      {/* Cabinet: back, sides, top, kick plate. */}
      <mesh position={[0, H / 2, -D / 2 + 0.02 * u]} receiveShadow>
        <boxGeometry args={[W, H, 0.04 * u]} />
        <meshStandardMaterial color="#dfe8ee" emissive="#bfe3ff" emissiveIntensity={0.55} roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2, H / 2, 0]} castShadow>
          <boxGeometry args={[0.06 * u, H, D]} />
          <meshStandardMaterial color="#f1f1ee" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, H + 0.12 * u, 0.05 * u]} castShadow>
        <boxGeometry args={[W + 0.06 * u, 0.24 * u, D + 0.1 * u]} />
        <meshStandardMaterial color="#1d4f91" roughness={0.5} />
      </mesh>
      <Poster position={[0, H + 0.12 * u, D / 2 + 0.11 * u]} size={[W / u - 0.3, 0.2]} lines={[{ text: 'FROZEN  ·  (PAPER, FROZEN)' }]} background="#1d4f91" color="#ffffff" board={false} />
      <mesh position={[0, 0.1 * u, 0]}>
        <boxGeometry args={[W, 0.2 * u, D]} />
        <meshStandardMaterial color="#2b2b2b" roughness={0.8} />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, goods.out.length]}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.6} emissive="#ffffff" emissiveIntensity={0.08} />
      </instancedMesh>
      {/* Shelf lights (bloom) and the frosted glass doors with their handles. */}
      {[0, 1, 2, 3, 4].map((s) => (
        <mesh key={s} position={[0, 0.58 * u + s * 0.36 * u, 0.28 * u]}>
          <boxGeometry args={[W - 0.1 * u, 0.012 * u, 0.02 * u]} />
          <meshBasicMaterial color={[1.6, 1.9, 2.2]} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: doors }, (_, i) => (
        <group key={i} position={[-W / 2 + dw * (i + 0.5), H / 2 + 0.1 * u, D / 2]}>
          <mesh>
            <planeGeometry args={[dw - 0.04 * u, H - 0.25 * u]} />
            <meshPhysicalMaterial color="#e9f6ff" transparent opacity={0.22} roughness={0.15} metalness={0} clearcoat={1} depthWrite={false} />
          </mesh>
          <mesh position={[dw / 2 - 0.1 * u, 0, 0.03 * u]}>
            <boxGeometry args={[0.025 * u, 0.9 * u, 0.025 * u]} />
            <meshStandardMaterial color="#c9ced2" metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A cash register and card reader for the end of a runek `Counter`. */
export function Register({ position = [0, 0, 0], rotation = [0, 0, 0] }: Placed) {
  const { unit } = useWorld();
  const u = unit;
  const screen = useMemo(() => labelTexture({ lines: [{ text: 'TOTAL', size: 0.6 }, { text: '$0.00', size: 1 }], background: '#0b2a12', color: '#46ff7a', font: 'type' }, 1.4, 128), []);
  useEffect(() => () => screen.dispose(), [screen]);
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.06 * u, 0]} castShadow>
        <boxGeometry args={[0.42 * u, 0.12 * u, 0.36 * u]} />
        <meshStandardMaterial color="#2a2d31" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.13 * u, 0.06 * u]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[0.36 * u, 0.04 * u, 0.2 * u]} />
        <meshStandardMaterial color="#3d4147" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.32 * u, -0.1 * u]} castShadow>
        <boxGeometry args={[0.3 * u, 0.2 * u, 0.04 * u]} />
        <meshStandardMaterial color="#1c1e21" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.32 * u, -0.079 * u]}>
        <planeGeometry args={[0.26 * u, 0.16 * u]} />
        <meshBasicMaterial map={screen} color={[1.4, 1.4, 1.4]} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.2 * u, -0.1 * u]}>
        <cylinderGeometry args={[0.02 * u, 0.02 * u, 0.14 * u, 8]} />
        <meshStandardMaterial color="#1c1e21" />
      </mesh>
    </group>
  );
}

// ── The air ──────────────────────────────────────────────────────────────────────────────────────

/** Dust motes drifting in the light: GPU-animated points, additive, seeded placement. */
export function DustMotes({ position = [0, 0, 0], size = [30, 5, 14], count = 600, seed = 1 }: { position?: Vec3; size?: Vec3; count?: number; seed?: number }) {
  const geom = useMemo(() => {
    const r = rng(seed);
    const p = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (r() - 0.5) * size[0];
      p[i * 3 + 1] = r() * size[1] + 0.3;
      p[i * 3 + 2] = (r() - 0.5) * size[2];
      ph[i] = r() * 100;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(p, 3));
    g.setAttribute('phase', new BufferAttribute(ph, 1));
    return g;
  }, [seed, count, size]);
  useEffect(() => () => geom.dispose(), [geom]);
  const mat = useRef<ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.uniforms.time.value = clock.elapsedTime;
  });
  return (
    <points position={position} geometry={geom} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={{ time: { value: 0 } }}
        vertexShader={`
          attribute float phase;
          uniform float time;
          varying float vA;
          varying float vDepth;
          void main() {
            vec3 p = position;
            p.x += sin(time * 0.11 + phase) * 0.6;
            p.y += sin(time * 0.07 + phase * 1.7) * 0.4;
            p.z += cos(time * 0.09 + phase * 0.6) * 0.6;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            vDepth = -mv.z;
            gl_PointSize = clamp(14.0 / -mv.z, 1.0, 3.0);
            vA = 0.5 + 0.5 * sin(time * 0.5 + phase * 3.0);
          }`}
        fragmentShader={`
          varying float vA;
          varying float vDepth;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            gl_FragColor = vec4(vec3(1.0, 0.96, 0.85), (0.5 - d) * 0.28 * vA * smoothstep(1.5, 4.0, vDepth));
          }`}
      />
    </points>
  );
}

/** Soft light shafts falling from skylights: additive, open cones that fade with depth. */
export function LightShafts({ xs = [], height = 7.2, depth = 12, color = '#fff6e2' }: { xs?: number[]; height?: number; depth?: number; color?: string }) {
  const tint = useMemo(() => new Color(color), [color]);
  return (
    <>
      {xs.map((x) => (
        <mesh key={x} position={[x, height / 2, 0]} rotation={[0, 0, 0.12]}>
          <boxGeometry args={[1.6, height, depth * 0.8]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            side={DoubleSide}
            uniforms={{ tint: { value: tint } }}
            vertexShader={`
              varying vec3 vP;
              void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
            fragmentShader={`
              uniform vec3 tint;
              varying vec3 vP;
              void main() {
                float fall = smoothstep(${(-height / 2).toFixed(2)}, ${(height / 2).toFixed(2)}, vP.y);
                float edge = 1.0 - smoothstep(0.2, 0.8, abs(vP.x) / 0.8);
                gl_FragColor = vec4(tint, 0.05 * fall * edge);
              }`}
          />
        </mesh>
      ))}
    </>
  );
}

// Stand on the floor: runek's world check flags them buried or floating.
PalletRack.groundSitting = true;
RollDoor.groundSitting = true;
Bollard.groundSitting = true;
ShoppingCart.groundSitting = true;
EndCap.groundSitting = true;
FreezerCase.groundSitting = true;
