import { useEffect, useMemo, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { DEFAULT_CONTROLS, DEFAULT_FONTS, DEFAULT_PALETTE, DEFAULT_WORLD_TIME, WorldContext, type WorldContextValue, type WorldPalette } from '@runek/core';
import { SimTicker } from './systems/SimTicker';
import { Effects } from './systems/Effects';
import { input } from './systems/input';
import { STEP } from './systems/sim';

/** Paper-warehouse-pretending-to-be-a-supermarket palette (v1 Environment Bible §4). */
export const WAREHOUSE: Partial<WorldPalette> = {
  floor: '#8f8d86',
  wall: '#c9c2b2',
  metal: '#4a5560',
  wood: '#8a6a48',
  accent: '#d9a62e',
};

function InputBinder() {
  const el = useThree((s) => s.gl.domElement);
  useEffect(() => input.attach(el), [el]);
  return null;
}

/**
 * Our own Canvas + Physics with runek's WorldContext provided by hand (TECH §8): runek's
 * <World> owns both, and a game needs the fixed timestep, camera and pause under its control.
 */
export function Stage({ takeKey, paused, palette, children }: { takeKey: number; paused: boolean; palette?: Partial<WorldPalette>; children: ReactNode }) {
  const world = useMemo<WorldContextValue>(
    () => ({
      unit: 1,
      gravity: [0, -9.81, 0],
      ground: 0,
      palette: { ...DEFAULT_PALETTE, ...palette },
      fonts: DEFAULT_FONTS,
      time: DEFAULT_WORLD_TIME,
      controls: DEFAULT_CONTROLS,
    }),
    [palette],
  );

  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 60, position: [0, 3, 6], near: 0.05, far: 150 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <InputBinder />
      <WorldContext.Provider value={world}>
        <Physics key={takeKey} timeStep={STEP} paused={paused} interpolate>
          <SimTicker />
          {children}
          <Effects />
        </Physics>
      </WorldContext.Provider>
    </Canvas>
  );
}
