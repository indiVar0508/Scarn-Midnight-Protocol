import type { ChapterScene } from '../systems/ChapterScene';
import type { Rig } from '../entities/Rig';
import { MiniHud } from './common';
import { input } from '../systems/Input';
import { qa } from '../systems/qa';
import { sfx } from '../../audio/sfx';
import { settings } from '../../state/settings';
import { ui } from '../../state/ui';

export interface RaceResult {
  interrupted: boolean;
  scarnX: number;
}

/**
 * Tryout speed-skating race: alternate LEFT/RIGHT to stride. Good rhythm
 * (0.18-0.5s between alternating strides) builds speed; double-tapping the
 * same foot wobbles. Ends when Scarn reaches `stopAt` (Goldenface arrives).
 */
export async function race(scene: ChapterScene, scarn: Rig, rivals: Rig[], stopAt: number, finish: number): Promise<RaceResult> {
  const hud = new MiniHud(scene, 'THE TRYOUT', `Alternate ${ui.get().inputMode === 'touch' ? '◀ ▶' : 'LEFT / RIGHT'} to skate. Find the rhythm.`);
  ui.set({ touchLayout: 'rhythm' });
  let v = 0;
  let last: 'left' | 'right' | null = null;
  let lastT = 0;
  let clock = 0;
  const rv = rivals.map(() => 0);
  const rTop = rivals.map((_, i) => 400 + i * 30 + Math.random() * 20);
  const assist = settings.get().assist;
  let stride = 0;
  await scene.frameLoop((dt, done) => {
    clock += dt;
    const press = input.pressed('left') ? 'left' : input.pressed('right') ? 'right' : null;
    if (qa.autoWin && clock - lastT > 0.25) {
      v = Math.min(560, v + 80);
      lastT = clock;
    }
    if (press) {
      const gap = clock - lastT;
      if (press !== last) {
        const good = gap > (assist ? 0.12 : 0.16) && gap < 0.55;
        v = Math.min(560, v + (good ? 70 : 32));
        sfx('skate', press === 'left' ? -0.3 : 0.3, 40);
        if (good) stride++;
        if (good && stride % 6 === 0) hud.popup(640, 200, 'RHYTHM!', '#3ad17a');
      } else {
        v *= 0.75;
        stride = 0;
        hud.popup(640, 200, 'WOBBLE', '#ff6060');
        scarn.gesture('hurt', 200);
      }
      last = press;
      lastT = clock;
    }
    v = Math.max(0, v - dt * 120);
    scarn.x += v * dt;
    scarn.moveSpeed = v;
    scarn.setDepth(scarn.y);
    rivals.forEach((r, i) => {
      rv[i] = Math.min(rTop[i], rv[i] + dt * 180);
      r.x += (rv[i] + Math.sin(clock * 2 + i) * 30) * dt;
      r.moveSpeed = rv[i];
    });
    const lead = Math.max(...rivals.map((r) => r.x));
    const place = 1 + rivals.filter((r) => r.x > scarn.x).length;
    hud.setScore(`${place === 1 ? '1ST' : place === 2 ? '2ND' : '3RD'} PLACE`);
    hud.meter(scarn.x / finish, 'LAP PROGRESS');
    if (scarn.x >= stopAt || lead >= stopAt + 200) done();
  });
  hud.destroy();
  ui.set({ touchLayout: 'none' });
  return { interrupted: true, scarnX: scarn.x };
}
