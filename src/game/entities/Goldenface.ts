import Phaser from 'phaser';
import { Actor } from './Actor';
import type { ChapterScene } from '../systems/ChapterScene';
import type { Combat } from '../systems/Combat';
import type { Scarn } from './Scarn';
import { sfx } from '../../audio/sfx';
import { settings } from '../../state/settings';
import { ui } from '../../state/ui';

type BossState = 'monologue' | 'move' | 'pattern' | 'rest' | 'scripted';

/**
 * Goldenface, the boss. Readable cycles: he monologues (shielded), repositions,
 * fires one bullet pattern, then pauses to admire himself (big damage window).
 */
export class Goldenface extends Actor {
  combat: Combat;
  target: Scarn;
  state: BossState = 'monologue';
  t = 2.4;
  pattern = 0;
  shots = 0;
  moveTo = { x: 0, y: 0 };
  shield: Phaser.GameObjects.Ellipse;
  phase = 1;
  onPhase: ((p: number) => void) | null = null;
  onMonologue: (() => void) | null = null;
  bossName = 'GOLDENFACE';

  constructor(scene: ChapterScene, combat: Combat, target: Scarn, x: number, y: number) {
    super(scene, scene.rig('goldenface', x, y, -1), x, y, 'enemy');
    this.combat = combat;
    this.target = target;
    this.maxHp = settings.get().assist ? 22 : 34;
    this.hp = this.maxHp;
    this.r = 30;
    this.rig.hold('goldgun', 2, 2, 0);
    this.shield = scene.add.ellipse(x, y - 70, 150, 190, 0xffd24a, 0.18).setStrokeStyle(4, 0xfff3b0, 0.8).setDepth(y + 2);
    scene.speaker('goldenface', this.rig);
    this.updateHud();
  }

  updateHud(): void {
    ui.set({ hud: { hp: Math.max(0, (this.hp / this.maxHp) * 10), hpMax: 10, label: this.bossName } });
  }

  get shielded(): boolean {
    return this.state === 'monologue';
  }

  damage(amount: number, dx: number, dy: number): boolean {
    if (!this.alive || this.state === 'scripted') return false;
    if (this.shielded) {
      sfx('metal', 0, 80);
      this.shield.setAlpha(1);
      this.scene.tweens.add({ targets: this.shield, alpha: 0.35, duration: 200 });
      return true; // absorbs the bullet
    }
    const mult = this.state === 'rest' ? 2 : 1;
    this.hp -= amount * mult;
    this.rig.flash(0xffffff, 60);
    this.moveBy(dx * 6, dy * 4);
    this.updateHud();
    const ratio = this.hp / this.maxHp;
    if (this.phase === 1 && ratio < 0.62) {
      this.phase = 2;
      this.onPhase?.(2);
    } else if (this.phase === 2 && ratio < 0.32) {
      this.phase = 3;
      this.onPhase?.(3);
    } else if (this.phase === 3 && ratio < 0.1) {
      this.phase = 4;
      this.onPhase?.(4);
    }
    return true;
  }

  update(dt: number): void {
    const p = this.target;
    this.t -= dt;
    this.shield.setPosition(this.x, this.y - 70).setDepth(this.y + 2).setVisible(this.shielded);
    const dx = p.x - this.x;
    const ang = Math.atan2(p.y - this.y, dx);
    this.rig.setFacing(dx < 0 ? -1 : 1);
    switch (this.state) {
      case 'scripted':
        return;
      case 'monologue':
        this.rig.setAnim('pose', 'victory');
        this.rig.aimAngle = null;
        this.rig.talking = true;
        if (this.t <= 0) {
          this.rig.talking = false;
          this.state = 'move';
          this.t = 0.9;
          const w = this.scene.world;
          this.moveTo = {
            x: Phaser.Math.Clamp(p.x + (Math.random() > 0.5 ? 1 : -1) * (280 + Math.random() * 120), w.minX + 80, w.maxX - 80),
            y: Phaser.Math.Clamp(p.y + (Math.random() - 0.5) * 200, w.minY + 20, w.maxY - 20),
          };
        }
        return;
      case 'move': {
        const mx = this.moveTo.x - this.x;
        const my = this.moveTo.y - this.y;
        const d = Math.hypot(mx, my);
        if (d > 10) {
          this.moveBy((mx / d) * 420 * dt, (my / d) * 330 * dt);
          this.rig.setAnim('run');
          this.rig.moveSpeed = 420;
        }
        if (this.t <= 0) {
          this.state = 'pattern';
          this.pattern = (this.pattern + 1) % 4;
          this.shots = 0;
          this.t = 0.5;
          this.rig.setAnim('pose', 'aim');
          this.combat.icon(this, 'exclaim', 450);
          sfx('suspicious');
        }
        return;
      }
      case 'pattern': {
        this.rig.aimAngle = ang;
        if (this.t > 0) return;
        const speed = settings.get().assist ? 250 : 320;
        const fire = (a: number, sp = speed) => this.combat.fire(this, a, { speed: sp, team: 'enemy', tex: 'goldbullet', r: 14 });
        switch (this.pattern) {
          case 0: // fan
            for (let i = -2; i <= 2; i++) fire(ang + i * 0.22);
            this.shots += 1;
            this.t = 0.55;
            break;
          case 1: // ring
            for (let i = 0; i < 12; i++) fire(this.shots * 0.13 + (i / 12) * Math.PI * 2, speed * 0.8);
            this.shots += 1;
            this.t = 0.6;
            break;
          case 2: // aimed burst
            fire(ang, speed * 1.35);
            this.shots += 1;
            this.t = 0.16;
            break;
          case 3: // sweeping arc
            fire(ang - 0.9 + this.shots * 0.18);
            this.shots += 1;
            this.t = 0.07;
            break;
        }
        this.rig.kick(0.6);
        const max = [3, 2, 5, 11][this.pattern] + (this.phase >= 2 ? 1 : 0);
        if (this.shots >= max) {
          this.state = 'rest';
          this.t = settings.get().assist ? 2.6 : 2;
          this.rig.aimAngle = null;
          this.rig.setAnim('pose', 'handsHips');
          this.combat.icon(this, 'question', 1200);
        }
        return;
      }
      case 'rest':
        // admiring his reflection in his own gun: double damage window
        this.rig.setAnim('pose', 'thinking');
        if (this.t <= 0) {
          this.state = 'monologue';
          this.t = 1.8 + Math.random() * 0.8;
          this.onMonologue?.();
        }
        return;
    }
  }

  script(on: boolean): void {
    this.state = on ? 'scripted' : 'monologue';
    this.t = 1;
    this.rig.aimAngle = null;
    this.rig.talking = false;
    if (on) this.rig.setAnim('idle');
  }

  destroy(): void {
    this.shield.destroy();
    super.destroy();
  }
}

