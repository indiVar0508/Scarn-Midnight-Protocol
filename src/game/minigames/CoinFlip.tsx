import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { CylinderCollider, RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier';
import { MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { rng } from '@runek/core';
import { Store } from '@shared/state/store';
import { sfx } from '@shared/audio/sfx';
import { input } from '../systems/input';
import { STEP } from '../systems/sim';
import { G } from '../systems/groups';
import { labelTexture } from '../../tlm/labels';

export type FlipResult = 'heads' | 'tails' | 'edge' | 'dropped';

interface CoinState {
  phase: 'idle' | 'charge' | 'air' | 'done';
  charge: number;
  result: FlipResult | null;
  attempt: number;
}

export const coin = new Store<CoinState>({ phase: 'idle', charge: 0, result: null, attempt: 0 });
let resolveFlip: ((r: FlipResult) => void) | null = null;

/** Hand the player the coin; resolves with how it landed. */
export function flipCoin(attempt: number): Promise<FlipResult> {
  coin.set({ phase: 'charge', charge: 0, result: null, attempt });
  return new Promise((r) => (resolveFlip = r));
}

export function resetCoin(): void {
  resolveFlip = null;
  coin.set({ phase: 'idle', charge: 0, result: null, attempt: 0 });
}

/** The clean-flip window on the charge meter. */
export const SWEET = [0.55, 0.78] as const;
const RADIUS = 0.09;
const HALF = 0.008;

/**
 * Samuel's coin: a real Rapier body. Charge sets the toss height and spin; a clean charge
 * (in the sweet zone) flips straight up, an overcharge drifts and may leave the desk.
 * Whichever face ends up on top is the answer. It's physics. Probably God.
 */
export function Coin({ rest }: { rest: [number, number, number] }) {
  const body = useRef<RapierRigidBody>(null);
  const m = useRef({ held: false, dir: 1, settle: 0, airT: 0, up: new Vector3(), q: new Quaternion() });

  const mats = useMemo(() => {
    const heads = labelTexture({ background: '#e8b923', color: '#5a3d00', font: 'serif', lines: [{ text: 'HEADS', size: 0.9 }, { text: 'IN SCARN WE TRUST', size: 0.45, font: 'sans' }] }, 1, 256);
    const tails = labelTexture({ background: '#d9a91c', color: '#5a3d00', font: 'serif', lines: [{ text: 'TAILS', size: 0.9 }, { text: 'BEST 4 OF 7', size: 0.45, font: 'sans' }] }, 1, 256);
    return [
      new MeshStandardMaterial({ color: '#c99a18', metalness: 0.85, roughness: 0.3 }),
      new MeshStandardMaterial({ map: heads, metalness: 0.6, roughness: 0.35 }),
      new MeshStandardMaterial({ map: tails, metalness: 0.6, roughness: 0.35 }),
    ];
  }, []);
  useEffect(
    () => () =>
      mats.forEach((mm) => {
        mm.map?.dispose();
        mm.dispose();
      }),
    [mats],
  );

  useBeforePhysicsStep(() => {
    const rb = body.current;
    if (!rb) return;
    const st = coin.get();
    const s = m.current;
    if (st.phase === 'idle' || st.phase === 'done') return;
    const down = input.isDown('interact') || input.isDown('fire') || input.isDown('dodge');

    if (st.phase === 'charge') {
      // Park the coin on the thumb (desk spot) while charging.
      rb.setTranslation({ x: rest[0], y: rest[1] + 0.02, z: rest[2] }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      if (down) {
        if (!s.held) sfx('charge', 0, 200);
        s.held = true;
        // Ping-pong meter: holding too long overshoots and comes back down.
        let c = st.charge + s.dir * STEP * 0.9;
        if (c >= 1) {
          c = 1;
          s.dir = -1;
        } else if (c <= 0) {
          c = 0;
          s.dir = 1;
        }
        coin.set({ charge: c });
      } else if (s.held) {
        s.held = false;
        s.dir = 1;
        launch(rb, st.charge, st.attempt);
        coin.set({ phase: 'air' });
        s.settle = 0;
        s.airT = 0;
      }
      return;
    }

    // In the air / settling: decide once it's still, off the desk, or taking forever.
    s.airT += STEP;
    const p = rb.translation();
    const v = rb.linvel();
    const w = rb.angvel();
    const still = Math.hypot(v.x, v.y, v.z) < 0.04 && Math.hypot(w.x, w.y, w.z) < 0.3;
    s.settle = still ? s.settle + STEP : 0;
    let result: FlipResult | null = null;
    if (p.y < rest[1] - 0.35) result = 'dropped';
    else if (s.settle > 0.35 || s.airT > 6) {
      const r = rb.rotation();
      s.up.set(0, 1, 0).applyQuaternion(s.q.set(r.x, r.y, r.z, r.w));
      result = s.up.y > 0.5 ? 'heads' : s.up.y < -0.5 ? 'tails' : 'edge';
    }
    if (result) {
      coin.set({ phase: 'done', result });
      sfx(result === 'dropped' ? 'boing' : 'coin_land');
      const done = resolveFlip;
      resolveFlip = null;
      done?.(result);
    }
  });

  function launch(rb: RapierRigidBody, charge: number, attempt: number) {
    const r = rng(attempt * 7919 + Math.round(charge * 1000));
    const clean = charge >= SWEET[0] && charge <= SWEET[1];
    const over = charge > SWEET[1];
    const drift = clean ? 0.15 : over ? 0.9 + charge * 0.8 : 0.35;
    const a = r() * Math.PI * 2;
    rb.setLinvel({ x: Math.cos(a) * drift, y: 2.2 + charge * 2.6, z: Math.sin(a) * drift }, true);
    rb.setAngvel({ x: 22 + charge * 30 + r() * 8, y: (r() - 0.5) * 4, z: (r() - 0.5) * (clean ? 2 : 10) }, true);
    sfx('coin_flip');
  }

  return (
    <RigidBody ref={body} type="dynamic" colliders={false} position={rest} ccd canSleep={false} linearDamping={0.1} angularDamping={0.4}>
      <CylinderCollider args={[HALF, RADIUS]} density={2500} friction={0.6} restitution={0.25} collisionGroups={G.prop} />
      <mesh castShadow material={mats}>
        <cylinderGeometry args={[RADIUS, RADIUS, HALF * 2, 40]} />
      </mesh>
    </RigidBody>
  );
}

/** Charge meter + result banner. */
export function CoinUI() {
  const st = useSyncExternalStore(coin.subscribe, coin.get);
  if (st.phase === 'idle') return null;
  const label = { heads: 'HEADS', tails: 'TAILS', edge: 'ON ITS EDGE?!', dropped: 'OFF THE DESK' } as const;
  return (
    <div className="coin-ui">
      {st.phase === 'charge' && <div className="coin-help">HOLD E / SPACE / CLICK TO CHARGE · RELEASE TO FLIP</div>}
      <div className="coin-bar">
        <div className="sweet" style={{ left: `${SWEET[0] * 100}%`, width: `${(SWEET[1] - SWEET[0]) * 100}%` }} />
        <div className="fill" style={{ width: `${st.charge * 100}%` }} />
      </div>
      {st.phase === 'done' && st.result && <div className={`coin-result ${st.result}`}>{label[st.result]}</div>}
    </div>
  );
}
