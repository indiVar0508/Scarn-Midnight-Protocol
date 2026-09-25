import Phaser from 'phaser';
import type { ChapterScene } from '../systems/ChapterScene';
import { input } from '../systems/Input';
import { qa } from '../systems/qa';
import { ctl } from '../systems/controlsText';
import { sfx } from '../../audio/sfx';
import { settings } from '../../state/settings';
import { ui } from '../../state/ui';

export interface MashOpts {
  label: string;
  /** presses needed to fill from empty (before decay) */
  need?: number;
  /** meter lost per second */
  decay?: number;
  onPress?: (fill: number) => void;
  onTick?: (fill: number, dt: number) => void;
  y?: number;
}

/** Button-mash meter. Accessibility: in Assist mode each press counts double and decay is gentle. */
export async function mash(scene: ChapterScene, o: MashOpts): Promise<void> {
  const assist = settings.get().assist;
  const need = (o.need ?? 18) / (assist ? 2 : 1);
  const decay = (o.decay ?? 0.18) * (assist ? 0.4 : 1);
  const y = o.y ?? 600;
  ui.set({ touchLayout: 'buttons' });
  const label = scene.add
    .text(640, y - 56, `${o.label} — MASH ${ctl('mash')}!`, { fontFamily: '"Bebas Neue", Impact, sans-serif', fontSize: '48px', color: '#ffffff', stroke: '#000', strokeThickness: 7 })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(19995);
  const bg = scene.add.rectangle(640, y, 560, 34, 0x111111, 0.9).setStrokeStyle(4, 0xffffff).setScrollFactor(0).setDepth(19995);
  const bar = scene.add.rectangle(362, y, 4, 26, 0xffcf3a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(19996);
  let fill = 0;
  input.resetMash();
  let pulse = 0;
  await scene.frameLoop((dt, done) => {
    const presses = input.resetMash() + (qa.autoWin ? 1 : 0);
    if (presses > 0) {
      fill = Math.min(1, fill + presses / need);
      sfx('ui_blip', 0, 30);
      o.onPress?.(fill);
      pulse = 1;
    }
    fill = Math.max(0, fill - decay * dt);
    o.onTick?.(fill, dt);
    pulse = Math.max(0, pulse - dt * 6);
    bar.width = Math.max(4, fill * 552);
    label.setScale(1 + pulse * 0.06);
    bar.setFillStyle(Phaser.Display.Color.GetColor(255, 207 - Math.floor(fill * 120), 58));
    if (fill >= 1) done();
  });
  sfx('beep_ok');
  [label, bg, bar].forEach((x) => x.destroy());
  ui.set({ touchLayout: 'none' });
}
