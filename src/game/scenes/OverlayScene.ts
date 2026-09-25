import Phaser from 'phaser';
import { settings } from '../../state/settings';
import { makeCanvas, text } from '../art/canvas';
import { ensureProp } from '../art/props';
import { R } from '../art/characters';
import { sfx } from '../../audio/sfx';
import { music } from '../../audio/music';

/**
 * Always-on screen-space layer above the chapter scenes: VHS grain, scanlines,
 * vignette, tracking wobble, letterbox bars, flashes, the on-screen display
 * ("PLAY ▶") and the THREAT / LEVEL / MIDNIGHT title slam.
 */
export class OverlayScene extends Phaser.Scene {
  private grain!: Phaser.GameObjects.TileSprite;
  private scan!: Phaser.GameObjects.TileSprite;
  private vignette!: Phaser.GameObjects.Image;
  private track!: Phaser.GameObjects.Rectangle;
  private barTop!: Phaser.GameObjects.Rectangle;
  private barBot!: Phaser.GameObjects.Rectangle;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private osd!: Phaser.GameObjects.Text;
  private osdTimer?: Phaser.Time.TimerEvent;
  private trackY = -200;
  private trackTimer = 4000;

  constructor() {
    super({ key: 'Overlay', active: false });
  }

  create(): void {
    this.makeTextures();
    this.grain = this.add.tileSprite(0, 0, 1280, 720, 'fx_grain').setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(10);
    this.scan = this.add.tileSprite(0, 0, 1280, 720, 'fx_scan').setOrigin(0).setDepth(11);
    this.vignette = this.add.image(0, 0, 'fx_vignette').setOrigin(0).setDepth(12);
    this.track = this.add.rectangle(0, -200, 1280, 26, 0xffffff, 0.05).setOrigin(0).setDepth(13);
    this.barTop = this.add.rectangle(0, -90, 1280, 90, 0x000000).setOrigin(0).setDepth(20);
    this.barBot = this.add.rectangle(0, 720, 1280, 90, 0x000000).setOrigin(0).setDepth(20);
    this.flashRect = this.add.rectangle(0, 0, 1280, 720, 0xffffff, 0).setOrigin(0).setDepth(40);
    this.osd = this.add
      .text(40, 34, '', { fontFamily: '"VT323", "Courier New", monospace', fontSize: '34px', color: '#e8ffe8' })
      .setShadow(2, 2, '#000', 0, true, true)
      .setDepth(30)
      .setAlpha(0);
    this.applySettings();
    settings.subscribe(() => this.applySettings());
  }

  private applySettings(): void {
    if (!this.grain) return;
    const f = settings.get().filmEffects;
    this.grain.setAlpha(0.1 * f);
    this.scan.setAlpha(0.35 * f);
    this.vignette.setAlpha(0.35 + 0.45 * f);
    this.track.setVisible(f > 0.05);
  }

  private makeTextures(): void {
    if (!this.textures.exists('fx_grain')) {
      const { c, g } = makeCanvas(256, 256);
      const id = g.createImageData(256, 256);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = Math.random() * 255;
        id.data[i] = v;
        id.data[i + 1] = v;
        id.data[i + 2] = v;
        id.data[i + 3] = Math.random() > 0.5 ? 255 : 0;
      }
      g.putImageData(id, 0, 0);
      this.textures.addCanvas('fx_grain', c);
    }
    if (!this.textures.exists('fx_scan')) {
      const { c, g } = makeCanvas(4, 4);
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(0, 0, 4, 1);
      this.textures.addCanvas('fx_scan', c);
    }
    if (!this.textures.exists('fx_vignette')) {
      const { c, g } = makeCanvas(1280, 720);
      const gr = g.createRadialGradient(640, 360, 260, 640, 360, 820);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,0.85)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 1280, 720);
      this.textures.addCanvas('fx_vignette', c);
    }
    ensureProp(this, 'flare');
    ensureProp(this, 'flarering');
    ensureProp(this, 'explosion');
    ensureProp(this, 'explosion_plain');
  }

  update(_t: number, delta: number): void {
    this.grain.tilePositionX = Math.random() * 256;
    this.grain.tilePositionY = Math.random() * 256;
    this.trackTimer -= delta;
    if (this.trackTimer <= 0 && this.trackY < -100) {
      this.trackY = -40;
      this.trackTimer = 6000 + Math.random() * 9000;
    }
    if (this.trackY > -100) {
      this.trackY += delta * 0.25;
      this.track.y = this.trackY;
      if (this.trackY > 760) this.trackY = -200;
    }
  }

  letterbox(on: boolean, ms = 500): void {
    this.tweens.add({ targets: this.barTop, y: on ? 0 : -90, duration: ms, ease: 'Cubic.easeInOut' });
    this.tweens.add({ targets: this.barBot, y: on ? 630 : 720, duration: ms, ease: 'Cubic.easeInOut' });
  }

  flash(color = 0xffffff, ms = 250, alpha = 0.9): void {
    const reduced = settings.get().reducedFlashing;
    this.flashRect.setFillStyle(color, 1);
    this.flashRect.setAlpha(reduced ? Math.min(0.25, alpha) : alpha);
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration: reduced ? ms * 2 : ms, ease: 'Quad.easeOut' });
  }

  fade(toBlack: boolean, ms = 600): Promise<void> {
    return new Promise((resolve) => {
      this.flashRect.setFillStyle(0x000000, 1);
      if (toBlack) this.flashRect.setAlpha(Math.max(0, this.flashRect.alpha));
      this.tweens.add({
        targets: this.flashRect,
        alpha: toBlack ? 1 : 0,
        duration: ms,
        onComplete: () => resolve(),
      });
    });
  }

  blackout(on: boolean): void {
    this.tweens.killTweensOf(this.flashRect);
    this.flashRect.setFillStyle(0x000000, 1).setAlpha(on ? 1 : 0);
  }

  showOsd(msg: string, ms = 2200): void {
    this.osd.setText(msg).setAlpha(1);
    this.osdTimer?.remove();
    this.osdTimer = this.time.delayedCall(ms, () => this.osd.setAlpha(0));
  }

  lensFlare(x = 1000, y = 120): void {
    if (settings.get().reducedFlashing) return;
    const f = this.add.image(x, y, 'flare').setScale(1.4 / R).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(35);
    const rings = [0.3, 0.55, 0.8].map((t) =>
      this.add
        .image(x + (640 - x) * t * 2, y + (360 - y) * t * 2, 'flarering')
        .setScale((0.5 + t) / R)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(35),
    );
    this.tweens.add({ targets: [f, ...rings], alpha: { from: 0, to: 0.9 }, duration: 180, yoyo: true, hold: 500, onComplete: () => [f, ...rings].forEach((o) => o.destroy()) });
    this.tweens.add({ targets: f, x: x - 160, duration: 900 });
  }

  /** The THREAT / LEVEL / MIDNIGHT title slam. */
  async titleSlam(): Promise<void> {
    const words = ['THREAT', 'LEVEL', 'MIDNIGHT'];
    const objs: Phaser.GameObjects.GameObject[] = [];
    const bg = this.add.rectangle(0, 0, 1280, 720, 0x07030a, 0.92).setOrigin(0).setDepth(25);
    objs.push(bg);
    const boom = this.add.image(640, 360, 'explosion_plain').setScale(0.2 / R).setAlpha(0).setDepth(26);
    objs.push(boom);
    for (let i = 0; i < words.length; i++) {
      const t = this.add
        .text(640, 200 + i * 150, words[i], {
          fontFamily: '"Bebas Neue", Impact, "Arial Black", sans-serif',
          fontSize: i === 2 ? '170px' : '130px',
          color: i === 2 ? '#ffcf3a' : '#f4f1ea',
          stroke: '#3a0a0a',
          strokeThickness: 14,
        })
        .setOrigin(0.5)
        .setDepth(27)
        .setScale(3)
        .setAlpha(0);
      t.setShadow(8, 10, '#000000', 0, true, true);
      objs.push(t);
      sfx('slam');
      if (i === 2) music.stinger('title');
      this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
      this.cameras.main.shake(260, 0.012 * (settings.get().reducedShake ? 0.15 : 1));
      if (i === 2) {
        this.flash(0xffe0a0, 400, 0.7);
        this.tweens.add({ targets: boom, alpha: 0.85, scale: 2.2 / R, duration: 500, ease: 'Cubic.easeOut' });
        this.lensFlare(1000, 140);
      }
      await new Promise((r) => this.time.delayedCall(i === 2 ? 1900 : 650, r));
    }
    const sub = this.add
      .text(640, 640, 'A  MICHAEL  SCARN  ADVENTURE', { fontFamily: '"Courier New", monospace', fontSize: '26px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(27)
      .setAlpha(0);
    objs.push(sub);
    this.tweens.add({ targets: sub, alpha: 1, duration: 400 });
    await new Promise((r) => this.time.delayedCall(1600, r));
    await new Promise<void>((r) => this.tweens.add({ targets: objs, alpha: 0, duration: 500, onComplete: () => r() }));
    objs.forEach((o) => o.destroy());
  }

  /** "CUT! TAKE 2" clapperboard used for failure retries. */
  async clapper(take: number): Promise<void> {
    const objs: Phaser.GameObjects.GameObject[] = [];
    const bg = this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.6).setOrigin(0).setDepth(25);
    const { c, g } = makeCanvas(520, 360);
    g.fillStyle = '#1b1b1b';
    g.fillRect(0, 80, 520, 280);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      g.save();
      g.translate(i * 90, 80);
      g.fillRect(0, 0, 45, 60);
      g.restore();
    }
    text(g, 'SCENE: ANY', 260, 170, { size: 34, color: '#fff' });
    text(g, `TAKE ${take}`, 260, 240, { size: 64, color: '#ffcf3a' });
    text(g, 'DIR: M. SCOTT', 260, 310, { size: 24, color: '#fff' });
    const key = `fx_clap_${take}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, c);
    const board = this.add.image(640, 380, key).setDepth(26).setScale(0.2).setAlpha(0);
    const cut = this.add
      .text(640, 150, 'CUT!', { fontFamily: 'Impact, sans-serif', fontSize: '110px', color: '#ff3b3b', stroke: '#000', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(27)
      .setAlpha(0);
    objs.push(bg, board, cut);
    sfx('scratch');
    this.tweens.add({ targets: cut, alpha: 1, scale: { from: 2, to: 1 }, duration: 180 });
    this.tweens.add({ targets: board, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut', delay: 150 });
    this.time.delayedCall(700, () => sfx('stamp'));
    await new Promise((r) => this.time.delayedCall(1700, r));
    await new Promise<void>((r) => this.tweens.add({ targets: objs, alpha: 0, duration: 300, onComplete: () => r() }));
    objs.forEach((o) => o.destroy());
  }
}
