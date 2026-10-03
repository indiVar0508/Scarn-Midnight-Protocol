import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedRigidBodies, type InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier';
import { Color, Euler, InstancedMesh, Quaternion, Vector3 } from 'three';
import { rng, sub, useWorld, type Vec3 } from '@runek/core';
import { G } from '../game/systems/groups';
import { labelTexture } from './labels';

export interface ReamPyramidProps {
  position?: Vec3;
  rotation?: Vec3;
  seed?: number;
  /** Cases in the bottom row. */
  base?: number;
  /** Rows deep (front to back). */
  rows?: number;
  /** Fired once when the top case has dropped well below where it started. */
  onCollapse?: () => void;
}

/** A case of ten reams, the unit the warehouse actually stacks. */
export const CASE: Vec3 = [0.45, 0.28, 0.3];
const CASE_DENSITY = 600; // ≈ 23 kg a case

/**
 * The store's "FOOD" display: a step pyramid of copy-paper cases, about head height.
 * It's the most satisfying thing on the set to knock over, which is the point.
 */
export function ReamPyramid({ position = [0, 0, 0], rotation = [0, 0, 0], seed = 1, base = 6, rows = 2, onCollapse }: ReamPyramidProps) {
  const { unit } = useWorld();
  const [rw, rh, rd] = CASE.map((v) => v * unit);

  const { instances, topIndex, topY, colors } = useMemo(() => {
    const r = rng(sub(seed, 3));
    const q = new Quaternion().setFromEuler(new Euler(...rotation));
    const origin = new Vector3(...position);
    const out: InstancedRigidBodyProps[] = [];
    const cs: string[] = [];
    let top = 0;
    let tY = 0;
    const gap = 0.004 * unit;
    for (let level = 0; level < base; level++) {
      const count = base - level;
      for (let i = 0; i < count; i++) {
        for (let row = 0; row < rows; row++) {
          const x = (i - (count - 1) / 2) * (rw + gap);
          const y = rh / 2 + level * (rh + 0.002) + 0.001;
          const z = (row - (rows - 1) / 2) * (rd + gap);
          const p = new Vector3(x, y, z).applyQuaternion(q).add(origin);
          if (y > tY) {
            tY = y;
            top = out.length;
          }
          out.push({ key: `${level}-${i}-${row}`, position: [p.x, p.y, p.z], rotation });
          cs.push(r() < 0.15 ? '#fff4e0' : '#ffffff');
        }
      }
    }
    return { instances: out, topIndex: top, topY: tY + origin.y, colors: cs };
  }, [seed, position, rotation, base, rows, rw, rh, rd, unit]);

  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new Color();
    colors.forEach((hex, i) => m.setColorAt(i, c.set(hex)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [colors]);

  // Every case wears the logo: the warehouse only stocks one brand.
  const logo = useMemo(
    () =>
      labelTexture(
        { background: '#c9a777', color: '#1d2d5c', font: 'serif', lines: [{ text: 'Dunder Mifflin', size: 1.3 }, { text: 'PAPER COMPANY · 10 REAMS', size: 0.6, font: 'sans' }] },
        CASE[0] / CASE[1],
        256,
      ),
    [],
  );
  useEffect(() => () => logo.dispose(), [logo]);

  const bodies = useRef<(RapierRigidBody | null)[] | null>(null);
  const collapsed = useRef(false);
  useFrame(() => {
    if (collapsed.current) return;
    const top = bodies.current?.[topIndex];
    if (top && top.translation().y < topY - 0.25 * unit) {
      collapsed.current = true;
      onCollapse?.();
    }
  });

  return (
    <InstancedRigidBodies ref={bodies} instances={instances} colliders="cuboid" density={CASE_DENSITY} collisionGroups={G.prop} canSleep>
      <instancedMesh ref={mesh} args={[undefined, undefined, instances.length]} count={instances.length} castShadow receiveShadow>
        <boxGeometry args={[rw, rh, rd]} />
        <meshStandardMaterial map={logo} roughness={0.95} />
      </instancedMesh>
    </InstancedRigidBodies>
  );
}

ReamPyramid.groundSitting = true;
