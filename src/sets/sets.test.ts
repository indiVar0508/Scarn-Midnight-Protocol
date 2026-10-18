import { describe, expect, it } from 'vitest';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { checkWorld, createGroundIndex, type Vec3, type WorldData, type WorldNode } from '@runek/core';
import { SETS } from './index';
import { SET_REGISTRY } from './registry';

const walk = (nodes: WorldNode[], out: WorldNode[] = []) => {
  for (const node of nodes) {
    out.push(node);
    if (node.children) walk(node.children, out);
  }
  return out;
};

type Placement = { position?: Vec3; rotation?: Vec3; width?: number; height?: number; thickness?: number; offset?: number; size?: [number, number]; tilt?: number };

/** Every node with its world matrix (a Group's transform carries to its children). */
const placed = (nodes: WorldNode[], parent = new Matrix4(), out: { node: WorldNode; world: Matrix4 }[] = []) => {
  for (const node of nodes) {
    const p = (node.props ?? {}) as Placement;
    const at = p.position ?? (node.type === 'Poster' ? [0, 1.5, 0] : [0, 0, 0]);
    const local = new Matrix4().compose(new Vector3(...at), new Quaternion().setFromEuler(new Euler(...(p.rotation ?? [0, 0, 0]))), new Vector3(1, 1, 1));
    const world = parent.clone().multiply(local);
    out.push({ node, world });
    if (node.children) placed(node.children, world, out);
  }
  return out;
};

// A sign's print has to clear the surface it hangs on by more than its board is deep (0.011).
const CLEAR = 0.012;

/**
 * Signs with any corner inside a wall or behind a wall's paint (`WallSkin` sits just proud of the
 * wall's face), or turned to face the wall. Each wall's "inside" runs along its local Z: through the
 * whole slab for a `Wall` (both faces show), from the wall's centre line to the paint for a
 * `WallSkin`. No set uses wall `openings` or anchored signs yet: the check treats openings as solid
 * wall and reads a sign's authored position.
 */
function buriedSigns(data: WorldData): string[] {
  const all = placed(data.nodes);
  const surfaces = all.flatMap(({ node, world }) => {
    const p = (node.props ?? {}) as Placement;
    if (node.type === 'Wall') {
      const t = (p.thickness ?? 0.2) / 2;
      return [{ id: node.id, toLocal: world.clone().invert(), w: p.width ?? 4, h: p.height ?? 3, inside: [-t - CLEAR, t + CLEAR] }];
    }
    if (node.type === 'WallSkin') return [{ id: node.id, toLocal: world.clone().invert(), w: p.width ?? 8, h: p.height ?? 6, inside: [0, (p.offset ?? 0.1) + 0.006 + CLEAR] }];
    return [];
  });
  const out: string[] = [];
  for (const { node, world } of all) {
    if (node.type !== 'Poster') continue;
    const { size: [pw, ph] = [0.6, 0.8], tilt = 0 } = (node.props ?? {}) as Placement; // Poster's defaults
    for (const s of surfaces) {
      const local = new Matrix4().multiplyMatrices(s.toLocal, world);
      const c = new Vector3().setFromMatrixPosition(local);
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => new Vector3((i * pw) / 2, (j * ph) / 2, 0).applyAxisAngle(new Vector3(0, 0, 1), tilt).applyMatrix4(local));
      const [lo, hi] = s.inside;
      const over = (v: Vector3) => Math.abs(v.x) <= s.w / 2 && v.y >= 0 && v.y <= s.h;
      if (corners.some((v) => over(v) && v.z > lo && v.z < hi)) out.push(`${node.id} is inside or behind ${s.id}`);
      else if (over(c) && c.z > lo - 0.3 && c.z < hi + 0.3 && new Vector3(0, 0, 1).transformDirection(local).z * c.z <= 0) out.push(`${node.id} faces into ${s.id}`);
    }
  }
  return out;
}

describe.each(Object.entries(SETS))('set %s', (_, data: WorldData) => {
  const nodes = walk(data.nodes);

  it('places only registered components', () => {
    const unknown = nodes.map((n) => n.type).filter((t) => t !== 'Group' && !(t in SET_REGISTRY));
    expect(unknown).toEqual([]);
  });

  it('gives every node a unique id', () => {
    const ids = nodes.map((n) => n.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("passes runek's world check (nothing buried or floating)", () => {
    expect(checkWorld(data, SET_REGISTRY)).toEqual([]);
    expect(createGroundIndex(data, SET_REGISTRY).warnings).toEqual([]);
  });

  it('hangs every sign proud of its wall, facing out', () => {
    expect(buriedSigns(data)).toEqual([]);
  });

  it('has a floor under the actors', () => {
    const ground = createGroundIndex(data, SET_REGISTRY);
    expect(ground.groundAt(0, 0, { kinds: ['deck'] })).toBeCloseTo(0, 5);
  });
});

describe('the world check, with the set registry', () => {
  it('catches a prop left floating', () => {
    const data: WorldData = {
      version: 1,
      nodes: [
        { type: 'SetFloor', id: 'floor', props: { size: [4, 4] } },
        { type: 'OfficeDesk', id: 'desk', props: { position: [0, 0.5, 0] } },
      ],
    };
    expect(checkWorld(data, SET_REGISTRY).map((i) => [i.id, i.kind, i.fix])).toEqual([['desk', 'floating', 0]]);
  });
});

describe('the sign check', () => {
  const room = (...signs: WorldNode[]): WorldData => ({
    version: 1,
    nodes: [
      { type: 'Wall', id: 'wall', props: { position: [0, 0, -2], width: 6, height: 3 } },
      { type: 'WallSkin', id: 'paint', props: { position: [0, 0, -2], width: 6, height: 3 } },
      { type: 'Wall', id: 'side', props: { position: [3, 0, 0], rotation: [0, -Math.PI / 2, 0], width: 4, height: 3 } },
      ...signs,
    ],
  });
  const sign = (id: string, position: Vec3, rotation?: Vec3, size?: [number, number]): WorldNode => ({
    type: 'Poster',
    id,
    props: { position, ...(rotation && { rotation }), ...(size && { size }) },
  });

  it('passes signs hung on the paint and on a bare wall', () => {
    expect(buriedSigns(room(sign('on-paint', [0, 1.5, -1.88]), sign('on-side', [2.885, 1.5, 0], [0, -Math.PI / 2, 0])))).toEqual([]);
  });

  it('catches a sign behind the paint, one inside a wall, and one facing the wall', () => {
    expect(buriedSigns(room(sign('flush', [0, 1.5, -1.886]), sign('in-side', [2.95, 1.5, 0], [0, -Math.PI / 2, 0]), sign('backwards', [0, 1.5, -1.85], [0, Math.PI, 0])))).toEqual([
      'flush is inside or behind paint',
      'in-side is inside or behind side',
      'backwards faces into wall',
      'backwards faces into paint',
    ]);
  });

  it('catches a sign angled off the wall with one edge in it, though its centre is clear', () => {
    expect(buriedSigns(room(sign('angled', [0, 1.5, -1.8], [0, Math.PI / 9, 0], [1, 0.8])))).toEqual(['angled is inside or behind wall', 'angled is inside or behind paint']);
  });
});
