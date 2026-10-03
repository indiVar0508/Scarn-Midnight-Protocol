import { useFrame } from '@react-three/fiber';
import { useBeforePhysicsStep } from '@react-three/rapier';
import { input } from './input';
import { sim, STEP } from './sim';
import { take } from '../../state/take';

/**
 * Mount first inside <Physics>: its step callback registers before any actor's, so the
 * sim clock and hitstop advance before gameplay reads them.
 */
export function SimTicker() {
  useFrame(() => input.beginFrame(), -1);
  useBeforePhysicsStep(() => {
    input.stepTick();
    sim.time += STEP;
    sim.hitstop = Math.max(0, sim.hitstop - STEP);
    const t = take.get();
    if (t.status === 'rolling' && t.hp <= 0) take.set({ status: 'cut', endedAt: performance.now() });
  });
  return null;
}
