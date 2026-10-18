import { useEffect, useRef } from 'react';
import { usePhysics } from '../../physics/react';
import type { CharacterController } from '../../physics/world';

/** Gap the controller keeps from surfaces. Characters spawn this far above the floor: spawned
 *  touching it, the controller spends its first frames pushing out of its own skin gap. */
export const KCC_OFFSET = 0.02;

/**
 * rapier's KinematicCharacterController (running in Rust) owned by an effect, so creation and
 * removal stay paired under StrictMode's mount → cleanup → mount. Read `.current` inside step
 * callbacks; it is null until mounted.
 *
 * Rule for callers: no downward push while grounded. Snap-to-ground holds the character down;
 * pushing into ground inside the skin gap makes rapier cancel the whole move for that frame
 * (crates/tlm-physics tests, `character_walks_on_the_ground_and_reports_grounded`).
 */
export function useKcc() {
  const world = usePhysics();
  const ref = useRef<CharacterController | null>(null);
  useEffect(() => {
    const c = world.createCharacterController({
      offset: KCC_OFFSET,
      autostepHeight: 0.3,
      autostepMinWidth: 0.2,
      snapToGround: 0.3,
      maxSlopeClimbAngle: (50 * Math.PI) / 180,
      minSlopeSlideAngle: (30 * Math.PI) / 180,
    });
    ref.current = c;
    return () => {
      ref.current = null;
      c.dispose();
    };
  }, [world]);
  return ref;
}
