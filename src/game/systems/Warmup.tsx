import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { HalfFloatType, WebGLRenderTarget, type Camera, type Scene, type WebGLRenderer } from 'three';
import { whenFiguresIdle } from '../../runek/person/scheduler';
import { take } from '../../state/take';
import { postActive } from './tier';

/**
 * Scene scripts wait on this gate (see `run`), so dialogue doesn't play over a stage that is
 * still loading. One gate per take, opened only by that take's finished warmup. (StrictMode
 * replays the warmup's effect, cleanup then mount, for the same take; a cleanup that opened the
 * gate let the take's script start behind the card.)
 */
let stage = { key: '', ready: Promise.resolve(), open: () => {} };

export function stageReady(): Promise<void> {
  return stage.ready;
}

function holdStage(key: string) {
  if (stage.key === key) return;
  let open = () => {};
  const ready = new Promise<void>((resolve) => (open = resolve));
  stage = { key, ready, open };
}

function openStage(key: string) {
  if (stage.key === key) stage.open();
}

/**
 * three.js keys programs on the target they draw into: on the canvas it bakes in tone mapping
 * and sRGB output, into a render target (the post-processing chain's input) it doesn't. Compile
 * for the target the frame will actually use, or every lit program compiles again on frame one.
 * (The shadow filter is the other such setting; `RendererSetup` in Stage fixes it up front.)
 */
function compileFor(gl: WebGLRenderer, scene: Scene, camera: Camera, offscreen: boolean, ms: number): Promise<void> {
  const target = offscreen ? new WebGLRenderTarget(1, 1, { type: HalfFloatType }) : null;
  const prev = gl.getRenderTarget();
  if (target) gl.setRenderTarget(target);
  try {
    gl.compile(scene, camera);
  } finally {
    if (target) {
      gl.setRenderTarget(prev);
      target.dispose();
    }
  }
  return allReady(gl, ms);
}

/**
 * Resolves when every program the renderer holds has finished compiling, or after `ms`. (three's
 * own `compileAsync` polls one program per material, missing a material's other variants, and
 * throws from its timer if a material is disposed meanwhile, as on a retake mid-load.)
 */
function allReady(gl: WebGLRenderer, ms: number): Promise<void> {
  const deadline = performance.now() + ms;
  return new Promise((resolve) => {
    const check = () => {
      const programs = (gl.info.programs ?? []) as unknown as { isReady(): boolean }[];
      if (performance.now() > deadline || programs.every((p) => p.isReady())) resolve();
      else window.setTimeout(check, 16);
    };
    check();
  });
}

const tick = (ms = 0) => new Promise((resolve) => window.setTimeout(resolve, ms));
/** Never hold a take forever on a build or a driver that doesn't answer. */
const capped = (p: Promise<unknown>, ms: number) => Promise.race([p, tick(ms)]);

/**
 * Compiles every shader a take needs before its first frame. three.js otherwise compiles each
 * material the first time it is drawn, and the page blocks until the driver finishes: one frame
 * of 7–13 s at the start of Scene 1 on an Intel laptop GPU, and more stalls as characters appear.
 * Here every program goes to the driver at once (KHR_parallel_shader_compile) behind a loading
 * card, with the world paused.
 *
 * Order: the hold is taken in a layout effect, before the scene's own effects start its script.
 * The set compiles while the characters' first (coarse) builds run; then a second pass compiles
 * the characters' materials (the detailed builds share them). Then `onRun`: the world runs its
 * first few frames under the card (shadow and post-processing shaders, uploads), and `onShow`
 * takes the card down and lets the script start. A take that moves to a new set (`take.location`)
 * goes through it again.
 */
export function Warmup({ takeKey, warmKey, onRun, onShow }: { takeKey: number; warmKey: string; onRun: (warmKey: string) => void; onShow: (warmKey: string) => void }) {
  const gl = useThree((s) => s.gl);
  /** Whether this take has shown yet (a later warmup is a new set mid-take). */
  const shownOnce = useRef(false);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const frames = useRef({ n: 0, want: 0, wake: null as (() => void) | null });
  useFrame(() => {
    const f = frames.current;
    f.n++;
    if (f.wake && f.n >= f.want) {
      f.wake();
      f.wake = null;
    }
  });
  useLayoutEffect(() => {
    let live = true;
    // The scene object is per canvas, so a take number is never reused across visits to a scene.
    const key = `${scene.uuid}:${warmKey}`;
    const began = performance.now();
    holdStage(key);
    const rendered = (count: number) =>
      new Promise<void>((resolve) => {
        const f = frames.current;
        f.want = f.n + count;
        f.wake = resolve;
      });
    (async () => {
      try {
        await tick(); // the scene's effects request their figures
        const offscreen = postActive();
        // The set compiles while the figures build (on runek's workers), then the figures' own
        // materials once their meshes are in.
        const set = compileFor(gl, scene, camera, offscreen, 20000);
        await capped(whenFiguresIdle('far'), 10000);
        await tick(50); // React commits the built meshes
        await set;
        await compileFor(gl, scene, camera, offscreen, 20000);
      } catch (e) {
        console.error('[warmup]', e);
      }
      if (!live) return;
      onRun(warmKey);
      // No time limit: paused (Esc during loading) or in a background tab, no frames come, and the
      // card stays up until they do.
      await rendered(3);
      if (!live) return;
      // The take's clock starts when the stage shows, and stops while a new set loads.
      const t = take.get();
      const now = performance.now();
      if (t.takeNo === takeKey && t.status === 'rolling') take.set({ startedAt: shownOnce.current ? t.startedAt + now - began : now });
      shownOnce.current = true;
      onShow(warmKey);
      openStage(key);
    })();
    return () => {
      live = false;
    };
  }, [gl, scene, camera, takeKey, warmKey, onRun, onShow]);
  return null;
}
