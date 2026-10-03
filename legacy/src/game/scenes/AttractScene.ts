import Phaser from 'phaser';
import { Rig } from '../entities/Rig';
import { paintAttract } from '../art/backgrounds';
import { registerCanvas, ensureProp } from '../art/props';
import { R } from '../art/characters';

/** Animated backdrop behind the React main menu. */
export class AttractScene extends Phaser.Scene {
  private scarn!: Rig;
  private gf!: Rig;
  private t = 0;

  constructor() {
    super({ key: 'Attract' });
  }

  create(): void {
    if (!this.textures.exists('bg_attract')) registerCanvas(this, 'bg_attract', paintAttract());
    this.add.image(0, 0, 'bg_attract').setOrigin(0);
    ensureProp(this, 'flare');
    ensureProp(this, 'snow');

    this.gf = new Rig(this, 1080, 640, 'goldenface', { facing: -1, scale: 2.2 });
    this.gf.setAlpha(0.28).setAnim('pose', 'handsHips');
    this.gf.tint(0x553311);

    this.scarn = new Rig(this, 860, 700, 'scarn', { facing: -1, scale: 2.7 });
    this.scarn.setAnim('pose', 'heroic');
    this.scarn.flair = [{ aF: 92, eF: 0, aB: 70, eB: 25, lean: -6, head: -6 }];
    this.scarn.hold('pistol', 2, 2, 0);

    // drifting dust in the spotlight
    this.add.particles(0, 0, 'snow', {
      x: { min: 500, max: 1280 },
      y: { min: 0, max: 720 },
      lifespan: 6000,
      speedY: { min: -12, max: -4 },
      speedX: { min: -6, max: 6 },
      scale: { min: 0.1 / R, max: 0.35 / R },
      alpha: { start: 0.5, end: 0 },
      frequency: 120,
    });
    const flare = this.add.image(1010, 150, 'flare').setBlendMode(Phaser.BlendModes.ADD).setScale(1.3 / R).setAlpha(0.5);
    this.tweens.add({ targets: flare, x: 900, alpha: 0.2, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  update(_t: number, delta: number): void {
    this.t += delta;
    this.scarn.y = 700 + Math.sin(this.t / 1400) * 3;
    if (Math.floor(this.t / 5000) % 3 === 2) this.scarn.setAnim('pose', 'fingerguns');
    else this.scarn.setAnim('pose', 'heroic');
  }
}
