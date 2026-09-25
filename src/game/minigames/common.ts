import Phaser from 'phaser';
import type { ChapterScene } from '../systems/ChapterScene';

const FONT = '"Bebas Neue", Impact, "Arial Black", sans-serif';

/** Screen-space HUD shared by minigames: title, instructions, timer, score. */
export class MiniHud {
  scene: ChapterScene;
  objs: Phaser.GameObjects.GameObject[] = [];
  title: Phaser.GameObjects.Text;
  help: Phaser.GameObjects.Text;
  timer: Phaser.GameObjects.Text;
  score: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Rectangle | null = null;
  barBg: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: ChapterScene, title: string, help: string) {
    this.scene = scene;
    const bg = scene.add.rectangle(640, 50, 1280, 100, 0x000000, 0.55).setScrollFactor(0).setDepth(19990);
    this.title = scene.add.text(640, 30, title, { fontFamily: FONT, fontSize: '44px', color: '#ffcf3a', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(19991);
    this.help = scene.add.text(640, 74, help, { fontFamily: '"Barlow Condensed", Arial, sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(19991);
    this.timer = scene.add.text(1170, 30, '', { fontFamily: '"VT323", monospace', fontSize: '44px', color: '#e8ffe8' }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(19991);
    this.score = scene.add.text(40, 30, '', { fontFamily: '"VT323", monospace', fontSize: '40px', color: '#ffffff' }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(19991);
    this.objs.push(bg, this.title, this.help, this.timer, this.score);
  }

  setTime(sec: number): void {
    this.timer.setText(`${Math.max(0, sec).toFixed(1)}s`);
    this.timer.setColor(sec < 5 ? '#ff6060' : '#e8ffe8');
  }

  setScore(s: string): void {
    this.score.setText(s);
  }

  meter(frac: number, label = ''): void {
    if (!this.bar) {
      this.barBg = this.scene.add.rectangle(640, 690, 500, 22, 0x111111, 0.85).setStrokeStyle(3, 0xffffff).setScrollFactor(0).setDepth(19990);
      this.bar = this.scene.add.rectangle(392, 690, 4, 16, 0xffcf3a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(19991);
      const t = this.scene.add.text(640, 662, label, { fontFamily: FONT, fontSize: '26px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(19991);
      this.objs.push(this.barBg, this.bar, t);
    }
    this.bar.width = Math.max(4, Math.min(1, frac) * 496);
  }

  popup(x: number, y: number, text: string, color = '#ffcf3a', screen = true): void {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: FONT, fontSize: '40px', color, stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(19995);
    if (screen) t.setScrollFactor(0);
    this.scene.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  destroy(): void {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }
}

export function grade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F (FOR FANTASTIC)';
}

/** Big stamped result in the centre of the screen. */
export async function stampResult(scene: ChapterScene, label: string, score: number): Promise<void> {
  const g = grade(score);
  const bg = scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0.5).setScrollFactor(0).setDepth(19996);
  const t1 = scene.add.text(640, 250, label, { fontFamily: FONT, fontSize: '54px', color: '#ffffff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(19997);
  const t2 = scene.add
    .text(640, 380, g, { fontFamily: FONT, fontSize: g.length > 3 ? '90px' : '190px', color: '#ffcf3a', stroke: '#4a1a00', strokeThickness: 12 })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(19997)
    .setScale(3)
    .setRotation(-0.1);
  const t3 = scene.add.text(640, 500, `${Math.round(score)} / 100`, { fontFamily: '"VT323", monospace', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(19997);
  scene.tweens.add({ targets: t2, scale: 1, duration: 220, ease: 'Back.easeOut' });
  await scene.wait(1500);
  [bg, t1, t2, t3].forEach((o) => o.destroy());
}
