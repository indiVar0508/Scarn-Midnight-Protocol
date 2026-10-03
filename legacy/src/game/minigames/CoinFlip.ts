import Phaser from 'phaser';
import type { ChapterScene } from '../systems/ChapterScene';
import { input } from '../systems/Input';
import { ensureProp } from '../art/props';
import { R } from '../art/characters';
import { sfx } from '../../audio/sfx';
import { ui } from '../../state/ui';
import { qa } from '../systems/qa';
import { ctl } from '../systems/controlsText';

export type FlipResult = 'heads' | 'tails' | 'edge' | 'dropped';

/**
 * Coin flip microgame. Hold ACTION to charge, release to flip, press ACTION
 * again as the coin passes the catch ring. The outcome is (mostly) up to fate.
 */
export async function coinFlip(scene: ChapterScene, attempt: number): Promise<FlipResult> {
  ensureProp(scene, 'coin');
  const objs: Phaser.GameObjects.GameObject[] = [];
  const cx = 640;
  const handY = 520;
  const dim = scene.add.rectangle(0, 0, 1280, 720, 0x000000, 0.55).setOrigin(0).setScrollFactor(0).setDepth(20000);
  const coin = scene.add.image(cx, handY, 'coin').setScrollFactor(0).setDepth(20002).setScale(3.2 / R);
  const ring = scene.add.circle(cx, handY, 60).setStrokeStyle(6, 0xffcf3a).setScrollFactor(0).setDepth(20001).setAlpha(0);
  const barBg = scene.add.rectangle(cx, 640, 420, 22, 0x222222).setScrollFactor(0).setDepth(20001).setStrokeStyle(3, 0xffffff);
  const bar = scene.add.rectangle(cx - 208, 640, 4, 16, 0xffcf3a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(20002);
  const sweet = scene.add.rectangle(cx + 110, 640, 60, 16, 0x3ad17a, 0.5).setScrollFactor(0).setDepth(20001);
  const label = scene.add
    .text(cx, 150, `HOLD ${ctl('action')} TO CHARGE · RELEASE TO FLIP`, { fontFamily: '"Bebas Neue", Impact, sans-serif', fontSize: '42px', color: '#ffffff', stroke: '#000', strokeThickness: 6 })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(20003);
  const face = scene.add
    .text(cx, 250, '', { fontFamily: '"Bebas Neue", Impact, sans-serif', fontSize: '96px', color: '#ffcf3a', stroke: '#000', strokeThickness: 8 })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(20003);
  objs.push(dim, coin, ring, barBg, bar, sweet, label, face);
  ui.set({ touchLayout: 'buttons' });

  let phase: 'charge' | 'air' | 'done' = 'charge';
  let power = 0;
  let dir = 1;
  let charging = false;
  let vy = 0;
  let y = handY;
  let spin = 0;
  let result: FlipResult = 'heads';
  let airTime = 0;

  let finishIn = -1;
  await scene.frameLoop((dt, done) => {
    if (finishIn >= 0) {
      finishIn -= dt;
      if (finishIn < 0) done();
      return;
    }
    if (qa.autoWin && phase === 'charge') {
      power = 0.8;
      phase = 'air';
      vy = -1300;
    }
    if (phase === 'charge') {
      if (input.isDown('action')) {
        charging = true;
        power += dir * dt * 1.25;
        if (power > 1) {
          power = 1;
          dir = -1;
        }
        if (power < 0) {
          power = 0;
          dir = 1;
        }
      } else if (charging) {
        phase = 'air';
        vy = -700 - power * 900;
        sfx('coin_flip');
        label.setText(`PRESS ${ctl('action')} WHEN IT HITS THE RING`);
        ring.setAlpha(1);
      }
      bar.width = Math.max(4, power * 416);
    } else if (phase === 'air') {
      airTime += dt;
      vy += 1500 * dt;
      y += vy * dt;
      spin += dt * (12 + power * 20);
      coin.setY(y).setScale(3.2 / R, (3.2 / R) * Math.abs(Math.cos(spin)));
      const falling = vy > 0;
      const dist = Math.abs(y - handY);
      ring.setScale(falling ? 0.6 + Math.min(1.6, dist / 180) : 1.6);
      const pressed = input.pressed('action') || (qa.autoWin && falling && dist < 14);
      if ((falling && (pressed || y > handY + 90)) || airTime > 5) {
        phase = 'done';
        ring.setAlpha(0);
        if (y > handY + 90 || airTime > 5) {
          result = 'dropped';
          sfx('coin_land');
        } else {
          const caughtQuality = 1 - Math.min(1, dist / 90);
          sfx('clink');
          // Fate. Mostly. The first flip is honest-ish; after that, destiny intervenes.
          const sweetSpot = power > 0.72 && power < 0.93;
          if (caughtQuality > 0.9 && sweetSpot && Math.random() < 0.35) result = 'edge';
          else if (attempt === 0) result = Math.random() < 0.5 ? 'heads' : 'tails';
          else if (attempt === 1) result = Math.random() < 0.7 ? 'heads' : 'tails';
          else result = 'heads';
        }
        face.setText(result === 'dropped' ? '...?' : result === 'edge' ? 'EDGE!?' : result.toUpperCase());
        coin.setScale(3.2 / R);
        finishIn = 0.9;
      }
    }
  });
  objs.forEach((o) => o.destroy());
  ui.set({ touchLayout: 'none' });
  return result;
}
