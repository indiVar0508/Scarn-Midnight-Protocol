import Phaser from 'phaser';
import { Actor } from '../entities/Actor';
import type { ChapterScene, Interactable } from './ChapterScene';
import type { Scarn } from '../entities/Scarn';
import { ensureProp } from '../art/props';
import { R } from '../art/characters';
import { sfx } from '../../audio/sfx';
import { settings } from '../../state/settings';
import { addStat } from '../../state/save';
import { qa } from './qa';

export interface Waypoint {
  x: number;
  y: number;
  wait?: number; // seconds to pause here
  look?: number; // sweep amplitude while waiting (radians)
}

type GState = 'patrol' | 'wait' | 'suspicious' | 'investigate' | 'alert' | 'stunned';

/**
 * Stealth watcher logic shared by guards and cameras: a vision cone on the
 * floor plane and a suspicion meter that ramps up while Scarn is visible.
 */
function canSee(scene: ChapterScene, ox: number, oy: number, angle: number, fov: number, range: number, p: Scarn): number {
  if (!p.alive || p.hidden) return 0;
  const dx = p.x - ox;
  const dy = (p.y - oy) * 1.4;
  const d = Math.hypot(dx, dy);
  if (d > range) return 0;
  let a = Math.atan2(dy, dx) - angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  if (Math.abs(a) > fov) return 0;
  if (scene.world.segmentBlocked(ox, oy, p.x, p.y)) return 0;
  return 1 - d / range; // closer = faster detection
}

function drawCone(g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, fov: number, range: number, color: number, alpha: number): void {
  g.clear();
  const hc = settings.get().highContrast;
  g.fillStyle(color, hc ? alpha * 1.5 : alpha);
  g.lineStyle(hc ? 4 : 2, color, hc ? 1 : 0.7);
  g.beginPath();
  g.moveTo(x, y);
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const a = angle - fov + (i / steps) * fov * 2;
    g.lineTo(x + Math.cos(a) * range, y + (Math.sin(a) * range) / 1.4);
  }
  g.closePath();
  g.fillPath();
  g.strokePath();
}

export class Guard extends Actor {
  path: Waypoint[];
  idx = 0;
  speed = 110;
  angle = 0;
  baseAngle = 0;
  fov = 0.62;
  range = 330;
  state: GState = 'patrol';
  suspicion = 0;
  waitT = 0;
  sweep = 0;
  target: Scarn;
  cone: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Image | null = null;
  investigateAt: { x: number; y: number } | null = null;
  onSpotted: (() => void) | null = null;
  chop: Interactable | null = null;
  disguiseFactor = () => 1;
  line: (() => void) | null = null;

  constructor(scene: ChapterScene, skin: string, target: Scarn, path: Waypoint[], opts: { speed?: number; range?: number; fov?: number; takedown?: boolean } = {}) {
    super(scene, scene.rig(skin, path[0].x, path[0].y), path[0].x, path[0].y, 'neutral');
    this.path = path;
    this.target = target;
    this.speed = opts.speed ?? 110;
    this.range = opts.range ?? 330;
    this.fov = opts.fov ?? 0.62;
    this.solid = true;
    this.cone = scene.add.graphics().setDepth(2);
    ensureProp(scene, 'question');
    ensureProp(scene, 'exclaim');
    ensureProp(scene, 'zzz');
    // takedown prompt, only enabled when Scarn is right behind the guard
    if (opts.takedown !== false) this.chop = scene.interact({
      x: this.x,
      y: this.y,
      r: 80,
      label: 'Scarn Chop (takedown)',
      enabled: false,
      onUse: () => this.takedown(),
    });
  }

  private setIcon(key: string | null): void {
    if (this.icon && (!key || this.icon.texture.key !== key)) {
      this.icon.destroy();
      this.icon = null;
    }
    if (key && !this.icon) {
      this.icon = this.scene.add.image(this.x, this.y - 150, key).setScale(1 / R).setDepth(9500);
      if (key === 'exclaim') sfx('spotted', 0, 400);
      else if (key === 'question') sfx('suspicious', 0, 400);
    }
    this.icon?.setPosition(this.x, this.y - 160);
  }

  hear(x: number, y: number): void {
    if (this.state === 'stunned' || this.state === 'alert') return;
    if (Math.hypot(x - this.x, y - this.y) > 520) return;
    this.investigateAt = { x, y };
    this.state = 'investigate';
    this.waitT = 2.2;
    this.setIcon('question');
  }

  takedown(): void {
    if (this.state === 'stunned') return;
    this.state = 'stunned';
    sfx('chop');
    this.scene.shake(90, 0.004);
    this.rig.gesture('hurt', 300);
    this.target.rig.gesture({ aF: 120, eF: 10, lean: 12 }, 350);
    addStat('enemiesDefeated', 1);
    this.scene.time.delayedCall(420, () => {
      if (!this.rig.active) return;
      this.rig.setAnim('down');
      sfx('knockdown');
      this.setIcon('zzz');
    });
    this.cone.clear();
    if (this.chop) this.chop.enabled = false;
  }

  update(dt: number): void {
    const p = this.target;
    if (this.state === 'stunned') {
      this.icon?.setPosition(this.x, this.y - 60);
      return;
    }
    // movement
    let moving = false;
    if (this.state === 'patrol') {
      const w = this.path[this.idx];
      const dx = w.x - this.x;
      const dy = w.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        this.state = 'wait';
        this.waitT = w.wait ?? 0.8;
        this.baseAngle = this.angle;
        this.sweep = 0;
      } else {
        this.moveBy((dx / d) * this.speed * dt, (dy / d) * this.speed * dt);
        this.angle = lerpAngle(this.angle, Math.atan2(dy * 1.4, dx), dt * 6);
        moving = true;
      }
    } else if (this.state === 'wait') {
      const w = this.path[this.idx];
      this.waitT -= dt;
      this.sweep += dt * 1.6;
      this.angle = this.baseAngle + Math.sin(this.sweep) * (w.look ?? 0.9);
      if (this.waitT <= 0) {
        this.idx = (this.idx + 1) % this.path.length;
        this.state = 'patrol';
      }
    } else if (this.state === 'investigate' && this.investigateAt) {
      const dx = this.investigateAt.x - this.x;
      const dy = this.investigateAt.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 40) {
        this.moveBy((dx / d) * this.speed * 1.2 * dt, (dy / d) * this.speed * 1.2 * dt);
        this.angle = lerpAngle(this.angle, Math.atan2(dy * 1.4, dx), dt * 6);
        moving = true;
      } else {
        this.waitT -= dt;
        this.sweep += dt * 2;
        this.angle += Math.sin(this.sweep) * dt * 2;
        if (this.waitT <= 0) {
          this.investigateAt = null;
          this.state = 'patrol';
          this.setIcon(null);
        }
      }
    }
    this.rig.moveSpeed = moving ? this.speed : 0;
    this.rig.setAnim(moving ? 'walk' : 'idle');
    this.rig.setFacing(Math.cos(this.angle) < 0 ? -1 : 1);

    // vision
    const eyeX = this.x;
    const eyeY = this.y;
    const seen = qa.god ? 0 : canSee(this.scene, eyeX, eyeY, this.angle, this.fov, this.range, p);
    const rate = (settings.get().assist ? 0.9 : 1.5) * this.disguiseFactor();
    if (seen > 0) this.suspicion = Math.min(1, this.suspicion + dt * rate * (0.5 + seen * 1.6));
    else this.suspicion = Math.max(0, this.suspicion - dt * 0.45);
    if (this.state !== 'alert') {
      if (this.suspicion >= 1) {
        this.state = 'alert';
        this.setIcon('exclaim');
        sfx('alarm');
        this.onSpotted?.();
      } else if (this.suspicion > 0.3) {
        this.setIcon('question');
        if (seen > 0) this.angle = lerpAngle(this.angle, Math.atan2((p.y - this.y) * 1.4, p.x - this.x), dt * 2);
        if (this.state === 'patrol' || this.state === 'wait') this.line?.();
      } else if (this.state !== 'investigate') this.setIcon(null);
    }
    this.icon?.setPosition(this.x, this.y - 160);
    const col = this.state === 'alert' ? 0xff3030 : this.suspicion > 0.3 ? 0xffcf3a : 0xffffff;
    drawCone(this.cone, eyeX, eyeY, this.angle, this.fov, this.range, col, 0.16 + this.suspicion * 0.2);

    // takedown availability: close, behind, not alerted
    if (this.chop) {
      this.chop.x = this.x - Math.cos(this.angle) * 40;
      this.chop.y = this.y;
      const dx = p.x - this.x;
      const dy = (p.y - this.y) * 1.4;
      const d = Math.hypot(dx, dy);
      let a = Math.atan2(dy, dx) - this.angle;
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      this.chop.enabled = d < 95 && Math.abs(a) > 1.9 && this.state !== 'alert';
    }
  }

  destroy(): void {
    this.cone.destroy();
    this.icon?.destroy();
    super.destroy();
  }
}

/** A wall-mounted camera sweeping between two angles. Samuel can disable it. */
export class SecurityCam {
  scene: ChapterScene;
  x: number;
  y: number;
  a0: number;
  a1: number;
  t = 0;
  speed: number;
  angle: number;
  fov = 0.42;
  range: number;
  disabled = false;
  suspicion = 0;
  cone: Phaser.GameObjects.Graphics;
  img: Phaser.GameObjects.Image;
  led: Phaser.GameObjects.Arc;
  onSpotted: (() => void) | null = null;
  target: Scarn;
  alerted = false;

  constructor(scene: ChapterScene, target: Scarn, x: number, y: number, a0: number, a1: number, opts: { range?: number; speed?: number; mountY?: number } = {}) {
    this.scene = scene;
    this.target = target;
    this.x = x;
    this.y = y;
    this.a0 = a0;
    this.a1 = a1;
    this.angle = a0;
    this.range = opts.range ?? 380;
    this.speed = opts.speed ?? 0.5;
    this.cone = scene.add.graphics().setDepth(2);
    this.img = scene.prop('camera', x, opts.mountY ?? 250).setDepth(-4);
    this.led = scene.add.circle(x + 16, (opts.mountY ?? 250) - 6, 4, 0xff2020).setDepth(-3);
    scene.updaters.add((dt) => this.update(dt));
  }

  disable(): void {
    this.disabled = true;
    this.cone.clear();
    this.led.setFillStyle(0x333333);
    sfx('beep_ok');
  }

  update(dt: number): void {
    if (this.disabled) return;
    this.t += dt * this.speed;
    this.angle = this.a0 + (Math.sin(this.t) * 0.5 + 0.5) * (this.a1 - this.a0);
    this.img.setFlipX(Math.cos(this.angle) < 0);
    const seen = qa.god ? 0 : canSee(this.scene, this.x, this.y, this.angle, this.fov, this.range, this.target);
    if (seen > 0) this.suspicion = Math.min(1, this.suspicion + dt * (settings.get().assist ? 0.8 : 1.3));
    else this.suspicion = Math.max(0, this.suspicion - dt * 0.6);
    if (this.suspicion >= 1 && !this.alerted) {
      this.alerted = true;
      sfx('alarm');
      this.onSpotted?.();
    }
    const col = this.alerted ? 0xff3030 : this.suspicion > 0.2 ? 0xffcf3a : 0x9fd8ff;
    drawCone(this.cone, this.x, this.y, this.angle, this.fov, this.range, col, 0.14 + this.suspicion * 0.25);
    this.led.setAlpha(Math.sin(this.t * 8) > 0 ? 1 : 0.3);
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}

/** Throw a noise-maker (chattering teeth) that nearby guards investigate. */
export function throwNoise(scene: ChapterScene, from: Scarn, guards: Guard[], dirX: number, dirY: number): void {
  ensureProp(scene, 'chatterteeth');
  const tx = Phaser.Math.Clamp(from.x + dirX * 260, scene.world.minX + 20, scene.world.maxX - 20);
  const ty = Phaser.Math.Clamp(from.y + dirY * 160, scene.world.minY, scene.world.maxY);
  const im = scene.add.image(from.x, from.y - 60, 'chatterteeth').setScale(1.4 / R).setDepth(9000);
  sfx('whoosh');
  scene.tweens.add({
    targets: im,
    x: tx,
    duration: 450,
  });
  scene.tweens.add({
    targets: im,
    y: { from: from.y - 60, to: ty },
    duration: 450,
    ease: 'Quad.easeIn',
    onComplete: () => {
      im.setDepth(ty);
      sfx('boing');
      scene.tweens.add({ targets: im, angle: { from: -15, to: 15 }, duration: 70, yoyo: true, repeat: 14, onComplete: () => im.destroy() });
      for (let i = 0; i < 6; i++) scene.time.delayedCall(i * 170, () => sfx('robot', 0, 60));
      guards.forEach((g) => g.hear(tx, ty));
    },
  });
}
