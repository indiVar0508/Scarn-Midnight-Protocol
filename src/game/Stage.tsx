import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { World, type WorldPalette } from '@runek/core';
import { PCFShadowMap, type PerspectiveCamera } from 'three';
import { SimTicker } from './systems/SimTicker';
import { Effects } from './systems/Effects';
import { input } from './systems/input';
import { Post } from './systems/Post';
import { dprFor, fxTier } from './systems/tier';
import { SceneEnvironment } from './systems/SceneEnvironment';
import { Warmup } from './systems/Warmup';
import { take } from '../state/take';

/** Paper-warehouse-pretending-to-be-a-supermarket palette (v1 Environment Bible §4). */
export const WAREHOUSE: Partial<WorldPalette> = {
  floor: '#8f8d86',
  wall: '#c9c2b2',
  metal: '#4a5560',
  wood: '#8a6a48',
  accent: '#d9a62e',
};

/** Laptops with two GPUs: ask for the discrete one. */
const GL: WebGLContextAttributes = { powerPreference: 'high-performance', antialias: true };

function InputBinder() {
  const el = useThree((s) => s.gl.domElement);
  useEffect(() => input.attach(el), [el]);
  return null;
}

/**
 * Renderer settings that change which shader programs get built, fixed before anything compiles.
 * - Shadow filter: R3F asks for PCFSoftShadowMap, which three r184 swaps for PCFShadowMap inside
 *   its first shadow render; a program compiled before that (the take's warmup) would bake in the
 *   wrong filter and be thrown away on frame one. Ask for PCF directly.
 * - Shader error checks: three reads every program's info logs on first use, and each read waits
 *   for the GPU process to finish all queued work (uploads, other compiles): seconds of stalls
 *   on a laptop GPU. Only `?shaders=check` turns them back on, for working on shaders.
 */
function RendererSetup() {
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    gl.shadowMap.type = PCFShadowMap;
    gl.debug.checkShaderErrors = new URLSearchParams(location.search).get('shaders') === 'check';
  }, [gl]);
  return null;
}

/** World's default camera is fine (fov 60); the third-person camera needs a closer near plane. */
function CameraSetup() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useEffect(() => {
    camera.near = 0.05;
    camera.far = 150;
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

/**
 * Every scene renders inside runek's `<World>` (TECH ADR-11): its Canvas, its WorldContext
 * (palette, player, walkers, controls) and its `<Physics>`, which is our facade over the Rust
 * rapier3d build. The take's content is keyed inside it, so a retake replaces bodies and actors
 * without rebuilding the WebGL context. Each take holds still (world paused, a loading card up)
 * until its shaders are compiled, then runs a few frames under the card (`Warmup`); so does a
 * take that moves to a new set (`take.location`).
 */
export function Stage({ takeKey, paused, palette, children }: { takeKey: number; paused: boolean; palette?: Partial<WorldPalette>; children: ReactNode }) {
  // Which take (and set within it) has compiled, so its world may run, and which is showing (card
  // down, script on).
  const location = useSyncExternalStore(take.subscribe, () => take.get().location);
  const warmKey = `${takeKey}:${location}`;
  const [running, setRunning] = useState('');
  const [shown, setShown] = useState('');
  const onRun = useCallback((key: string) => setRunning(key), []);
  const onShow = useCallback((key: string) => setShown(key), []);
  const loading = shown !== warmKey;
  const dpr = useMemo(() => dprFor(fxTier()), []);
  const hold = paused || running !== warmKey;
  return (
    <>
      <World paused={hold} palette={palette} lights={false} input={!hold} gl={GL} dpr={dpr}>
        <RendererSetup />
        <CameraSetup />
        <InputBinder />
        <SceneEnvironment />
        <group key={takeKey}>
          <SimTicker />
          {children}
          <Effects />
          <Warmup takeKey={takeKey} warmKey={warmKey} onRun={onRun} onShow={onShow} />
        </group>
        <Post />
      </World>
      {loading && (
        <div className='stage-loading' role='status'>
          <span>Lighting the set…</span>
        </div>
      )}
    </>
  );
}
