import type { ChapterScene } from './ChapterScene';
import type { Rig } from '../entities/Rig';
import type { Actor } from '../entities/Actor';
import { Cancelled } from '../../state/ui';

/** Walk a bare rig (no Actor) to a point. Resolves on arrival. */
export function walkRig(scene: ChapterScene, rig: Rig, x: number, y: number, speed = 180, anim: 'walk' | 'run' | 'sneak' | 'skate' = 'walk', endPose = 'stand'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (scene.signal.aborted) return reject(new Cancelled());
    const fn = (dt: number) => {
      if (!rig.active) {
        scene.updaters.delete(fn);
        resolve();
        return;
      }
      const dx = x - rig.x;
      const dy = y - rig.y;
      const d = Math.hypot(dx, dy);
      const step = speed * dt;
      if (d <= step) {
        rig.x = x;
        rig.y = y;
        rig.setDepth(y);
        rig.moveSpeed = 0;
        rig.setAnim(anim === 'skate' ? 'skate' : 'idle', endPose);
        scene.updaters.delete(fn);
        scene.signal.removeEventListener('abort', onAbort);
        resolve();
        return;
      }
      rig.x += (dx / d) * step;
      rig.y += (dy / d) * step;
      rig.setDepth(rig.y);
      if (Math.abs(dx) > 4) rig.setFacing(dx < 0 ? -1 : 1);
      rig.moveSpeed = speed;
      rig.setAnim(anim);
    };
    const onAbort = () => {
      scene.updaters.delete(fn);
      reject(new Cancelled());
    };
    scene.signal.addEventListener('abort', onAbort, { once: true });
    scene.updaters.add(fn);
  });
}

/** Walk an Actor (collides with the world). */
export function walkActor(scene: ChapterScene, a: Actor, x: number, y: number, speed = 200, anim: 'walk' | 'run' | 'sneak' = 'walk'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (scene.signal.aborted) return reject(new Cancelled());
    let stuck = 0;
    const fn = (dt: number) => {
      const dx = x - a.x;
      const dy = y - a.y;
      const d = Math.hypot(dx, dy);
      const step = speed * dt;
      if (d <= step + 1 || stuck > 1.2) {
        if (stuck <= 1.2) a.place(x, y);
        a.rig.moveSpeed = 0;
        a.rig.setAnim('idle');
        a.vx = 0;
        a.vy = 0;
        scene.updaters.delete(fn);
        scene.signal.removeEventListener('abort', onAbort);
        resolve();
        return;
      }
      const ox = a.x;
      const oy = a.y;
      a.moveBy((dx / d) * step, (dy / d) * step);
      if (Math.hypot(a.x - ox, a.y - oy) < step * 0.2) stuck += dt;
      if (Math.abs(dx) > 4) a.rig.setFacing(dx < 0 ? -1 : 1);
      a.rig.moveSpeed = speed;
      a.rig.setAnim(anim);
    };
    const onAbort = () => {
      scene.updaters.delete(fn);
      reject(new Cancelled());
    };
    scene.signal.addEventListener('abort', onAbort, { once: true });
    scene.updaters.add(fn);
  });
}
