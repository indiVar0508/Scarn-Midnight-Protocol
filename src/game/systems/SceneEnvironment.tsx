import { useEffect, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Color, InstancedMesh, Mesh, MeshBasicMaterial, MeshLambertMaterial, PMREMGenerator, type Light, type MeshStandardMaterial } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useFxTier } from './tier';

const DEFAULT_ENV = 0.12;
/** The unlit room's wall radiance: matches the lit room's mean (0.648, measured on the PMREM). */
const WALL = 0.52;

/**
 * three's `RoomEnvironment`, unlit. Its walls and boxes are lit by a point light, which compiled
 * three full lit programs (two standard, one Lambert) for this one render, synchronously: 1–3.5 s
 * of every scene's loading on an Intel laptop GPU. The light panels are emissive anyway, so they
 * come out the same; grey walls at the lit room's mean radiance stand in for the lit walls.
 */
function unlitRoom() {
  const room = new RoomEnvironment();
  for (const l of room.children.filter((c) => (c as Light).isLight)) room.remove(l);
  room.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const m = o.material as MeshStandardMaterial | MeshLambertMaterial;
    const color = m instanceof MeshLambertMaterial ? m.emissive.clone().multiplyScalar(m.emissiveIntensity) : new Color().setScalar(o instanceof InstancedMesh ? WALL * 0.6 : WALL);
    o.material = new MeshBasicMaterial({ side: m.side, color });
    m.dispose();
  });
  return room;
}

/**
 * A scene that needs more (or less) reflected light than the default sets it while mounted.
 * Scene content mounts after the Stage's environment, so its effect runs last and wins.
 */
export function useEnvironmentIntensity(intensity: number) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.environmentIntensity = intensity;
    return () => {
      scene.environmentIntensity = DEFAULT_ENV;
    };
  }, [scene, intensity]);
}

/**
 * Image-based lighting (medium and high tiers) without an HDR file: three's procedural
 * `RoomEnvironment` (unlit, see `unlitRoom`), prefiltered once, as the scene's environment. Metals (carts, racking, ducts,
 * the forklift) need something to reflect, or they render near-black; everything else gets its
 * soft fill from it.
 */
export function SceneEnvironment({ intensity = DEFAULT_ENV }: { intensity?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const tier = useFxTier();
  // A layout effect: the environment changes every lit shader, so it must be in before the take's
  // warmup compiles them (or they all compile twice).
  useLayoutEffect(() => {
    // A prefiltered environment lookup on every lit pixel halves the frame rate on software
    // renderers; they keep plain lighting (scenes add fill for them, see `useFxTier`).
    if (tier !== 'high' && tier !== 'medium') return;
    const pmrem = new PMREMGenerator(gl);
    const room = unlitRoom();
    const target = pmrem.fromScene(room, 0.04);
    const env = target.texture;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    room.dispose();
    pmrem.dispose();
    return () => {
      if (scene.environment === env) scene.environment = null;
      target.dispose(); // the render target, not just its texture (its framebuffers too)
    };
  }, [gl, scene, intensity, tier]);
  return null;
}
