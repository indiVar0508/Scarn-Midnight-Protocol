import Phaser from 'phaser';
import type { ChapterScene } from '../systems/ChapterScene';
import { mash } from './Mash';
import { input } from '../systems/Input';
import { qa } from '../systems/qa';
import { ctl } from '../systems/controlsText';
import { sfx } from '../../audio/sfx';
import { settings } from '../../state/settings';
import { ui } from '../../state/ui';

const FONT = '"Bebas Neue", Impact, sans-serif';
const FRUSTRATIONS = ['GOLDENFACE', 'THE PRESIDENT', 'MY MUG', 'TOBY', 'THE STAPLERS', 'SHMIM', "JAN'S CANDLES", 'GEORGE FOREMAN GRILL', 'BEING LEGALLY CHAD', 'MARLEY & ME', 'THE PAPERLESS OFFICE', 'CATHERINE'];

/**
 * The super shot: absorb frustrations (mash), then time the release while
 * the aim sweeps past the roof hatch. Returns aim quality 0..1.
 */
export async function superShot(scene: ChapterScene, puckX: number, puckY: number): Promise<number> {
  const words: Phaser.GameObjects.Text[] = [];
  let spawn = 0;
  let wi = 0;
  const glow = scene.add.circle(puckX, puckY, 20, 0xffcf3a, 0.3).setDepth(9000).setBlendMode(Phaser.BlendModes.ADD);
  await mash(scene, {
    label: 'FILL THE PUCK WITH FRUSTRATION',
    need: 30,
    decay: 0.12,
    y: 660,
    onTick: (f, dt) => {
      spawn -= dt;
      glow.setRadius(20 + f * 90).setAlpha(0.3 + f * 0.4);
      if (spawn <= 0) {
        spawn = 0.35;
        const word = FRUSTRATIONS[wi++ % FRUSTRATIONS.length];
        const side = Math.random() > 0.5 ? 1 : -1;
        const t = scene.add
          .text(puckX + side * (500 + Math.random() * 200), puckY - 260 + Math.random() * 360, word, { fontFamily: FONT, fontSize: '38px', color: '#ff6060', stroke: '#000', strokeThickness: 6 })
          .setOrigin(0.5)
          .setDepth(9100);
        words.push(t);
        scene.tweens.add({ targets: t, x: puckX, y: puckY, scale: 0.2, alpha: 0.2, duration: 700, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
      }
    },
    onPress: () => sfx('charge', 0, 250),
  });
  words.forEach((w) => w.active && w.destroy());
  // aim: a reticle sweeps across the ceiling; hit the hatch
  ui.set({ touchLayout: 'buttons' });
  const hatchX = 640;
  const hatch = scene.add.rectangle(hatchX, 70, 180, 60, 0x000000, 0.6).setStrokeStyle(5, 0x7dff8a).setScrollFactor(0).setDepth(19980);
  const hatchT = scene.add.text(hatchX, 70, 'ROOF HATCH', { fontFamily: FONT, fontSize: '30px', color: '#7dff8a' }).setOrigin(0.5).setScrollFactor(0).setDepth(19981);
  const ret = scene.add.circle(0, 70, 26).setStrokeStyle(6, 0xffcf3a).setScrollFactor(0).setDepth(19982);
  const help = scene.add
    .text(640, 160, `PRESS ${ctl('action')} WHEN THE RING IS OVER THE HATCH`, { fontFamily: FONT, fontSize: '40px', color: '#ffffff', stroke: '#000', strokeThickness: 6 })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(19981);
  let t = 0;
  let quality = 0;
  const speed = settings.get().assist ? 1.3 : 2.1;
  input.endFrame();
  await scene.frameLoop((dt, done) => {
    t += dt;
    // start at the far left so leftover mashing can't release a free bullseye
    const x = 640 + Math.sin(t * speed - Math.PI / 2) * 520;
    ret.setX(x);
    const off = Math.abs(x - hatchX);
    ret.setStrokeStyle(6, off < 90 ? 0x7dff8a : 0xffcf3a);
    const armed = t > 0.35;
    if ((armed && (input.pressed('action') || input.pressed('fire'))) || (qa.autoWin && off < 20) || t > 12) {
      quality = t > 12 ? 0.5 : Math.max(0.35, 1 - off / 600);
      done();
    }
  });
  sfx('slapshot');
  scene.flash(0xffffff, 250, 0.9);
  [hatch, hatchT, ret, help, glow].forEach((o) => o.destroy());
  ui.set({ touchLayout: 'none' });
  return quality;
}
