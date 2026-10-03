import Phaser from 'phaser';
import { makeCanvas } from '../art/canvas';
import { R } from '../art/characters';

/** Generates shared textures, launches the overlay and the attract loop. */
export class BootScene extends Phaser.Scene {
  private onReady: () => void;

  constructor(onReady: () => void) {
    super({ key: 'Boot' });
    this.onReady = onReady;
  }

  create(): void {
    if (!this.textures.exists('reticle')) {
      const { c, g } = makeCanvas(48 * R, 48 * R);
      g.scale(R, R);
      g.strokeStyle = '#000';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(24, 24, 13, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = '#ffcf3a';
      g.lineWidth = 2.5;
      g.stroke();
      for (const [x1, y1, x2, y2] of [
        [24, 2, 24, 14],
        [24, 34, 24, 46],
        [2, 24, 14, 24],
        [34, 24, 46, 24],
      ]) {
        g.strokeStyle = '#000';
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
        g.strokeStyle = '#ffcf3a';
        g.lineWidth = 2.5;
        g.stroke();
      }
      this.textures.addCanvas('reticle', c);
    }
    this.scene.launch('Overlay');
    this.scene.start('Attract');
    this.scene.bringToTop('Overlay');
    this.onReady();
  }
}
