import type { ChapterScene } from '../systems/ChapterScene';
import { World } from '../systems/World';
import { paintOval } from '../art/backgrounds';

/** The "Oval Office": the conference room with a flag in it. Shared by chapters 2 and 8. */
export function dressOvalOffice(scene: ChapterScene, w: number): void {
  scene.world = new World(w, 410, 690);
  scene.background('bg_oval', () => paintOval(w));
  scene.prop('flag', 640, 440);
  scene.prop('seal', 900, 200, 0.9).setRotation(0.14).setDepth(-5);
  scene.prop('desk', 900, 520);
  scene.world.addWall(790, 470, 220, 50);
  scene.prop('stapler', 820, 426).setDepth(521);
  scene.prop('trophy', 990, 440).setDepth(521).setScale(0.35);
  scene.prop('filing', 1300, 420);
  scene.world.addWall(1265, 400, 70, 25);
  scene.prop('confchair', 500, 600);
  scene.prop('confchair', 1150, 640);
  scene.cameras.main.setBounds(0, 0, w, 720);
}
