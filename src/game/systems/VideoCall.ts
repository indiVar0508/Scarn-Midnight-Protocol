import Phaser from 'phaser';
import type { ChapterScene } from './ChapterScene';
import { paintOval } from '../art/backgrounds';
import { registerCanvas } from '../art/props';
import type { Rig } from '../entities/Rig';
import { sfx } from '../../audio/sfx';

/**
 * Picture-in-picture "video call": a tiny set is built far off to the side of
 * the world and a second camera shows it inside a TV frame on screen.
 */
export interface Call {
  rig: Rig;
  cam: Phaser.Cameras.Scene2D.Camera;
  frame: Phaser.GameObjects.GameObject[];
  hide(on: boolean): void;
  close(): void;
}

const OX = 6000;

export function openCall(scene: ChapterScene, who: string, opts: { x?: number; y?: number; w?: number; h?: number; label?: string } = {}): Call {
  const x = opts.x ?? 700;
  const y = opts.y ?? 70;
  const w = opts.w ?? 520;
  const h = opts.h ?? 300;
  if (!scene.textures.exists('bg_oval')) registerCanvas(scene, 'bg_oval', paintOval());
  const remote: Phaser.GameObjects.GameObject[] = [];
  remote.push(scene.add.image(OX, 0, 'bg_oval').setOrigin(0).setDepth(-10000));
  remote.push(scene.prop('flag', OX + 540, 420));
  remote.push(scene.prop('seal', OX + 800, 180, 0.8).setRotation(0.12).setDepth(-5));
  remote.push(scene.prop('desk', OX + 800, 520));
  const rig = scene.rig(who, OX + 800, 470, -1, 1.2);
  rig.setAnim('idle', 'handsHips');
  remote.push(rig);
  const cam = scene.cameras.add(x, y, w, h);
  cam.setScroll(OX + 800 - w / 2 / 0.9, 250 - h / 2 / 0.9 + 60);
  cam.setZoom(0.9);
  cam.setBackgroundColor('#000000');
  // TV frame (drawn by the main camera, ignored by the call camera)
  const g = scene.add.graphics().setScrollFactor(0).setDepth(19000);
  g.lineStyle(10, 0x1a1a1a, 1).strokeRect(x - 5, y - 5, w + 10, h + 10);
  g.lineStyle(3, 0x777777, 1).strokeRect(x - 10, y - 10, w + 20, h + 20);
  const lab = scene.add
    .text(x + 10, y + h - 30, opts.label ?? '● LIVE  ·  SECURE LINE (SKYPE)', { fontFamily: '"VT323", monospace', fontSize: '22px', color: '#ff4040' })
    .setScrollFactor(0)
    .setDepth(19001);
  const frame = [g, lab];
  cam.ignore(frame);
  scene.cameras.main.ignore(remote);
  sfx('beep_ok');
  return {
    rig,
    cam,
    frame,
    hide(on: boolean) {
      cam.setVisible(!on);
      frame.forEach((f) => (f as unknown as Phaser.GameObjects.Components.Visible).setVisible(!on));
    },
    close() {
      sfx('tape_click');
      scene.cameras.remove(cam);
      frame.forEach((f) => f.destroy());
      remote.forEach((r) => r.destroy());
    },
  };
}
