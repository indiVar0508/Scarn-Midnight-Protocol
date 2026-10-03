import { useEffect, useRef } from 'react';
import { useRapier } from '@react-three/rapier';
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat';

export interface KccOptions {
  mass: number;
}

/**
 * A Rapier KinematicCharacterController owned by an effect, so creation and removal stay
 * paired (StrictMode's mount → cleanup → mount would otherwise leave a freed controller
 * behind a memoized value). Read `.current` inside step callbacks; it is null until mounted.
 */
export function useKcc({ mass }: KccOptions) {
  const { world } = useRapier();
  const ref = useRef<KinematicCharacterController | null>(null);
  useEffect(() => {
    const c = world.createCharacterController(0.02);
    c.enableAutostep(0.3, 0.2, false);
    c.enableSnapToGround(0.3);
    c.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    c.setApplyImpulsesToDynamicBodies(true);
    c.setCharacterMass(mass);
    ref.current = c;
    return () => {
      ref.current = null;
      world.removeCharacterController(c);
    };
  }, [world, mass]);
  return ref;
}
