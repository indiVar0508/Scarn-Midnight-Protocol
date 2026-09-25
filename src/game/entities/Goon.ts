import Phaser from 'phaser';
import { Actor } from './Actor';
import type { ChapterScene } from '../systems/ChapterScene';
import type { Combat } from '../systems/Combat';
import { sfx } from '../../audio/sfx';
import { settings } from '../../state/settings';

type GoonState = 'enter' | 'move' | 'windup' | 'recover' | 'dazzled' | 'dying' | 'down';

/**
 * Goldenface's henchmen. Readable by design: they telegraph every shot with a
 * wind-up pose and a "!" and fire slow, bright bullets. When knocked out they
 * hold the hit for a beat, then fall over slightly late.
 */
export class Goon extends Actor {
  combat: Combat;
  target: Actor;
  state: GoonState = 'enter';
  t = 0;
  prefer = 280 + Math.random() * 140;
  strafe = Math.random() > 0.5 ? 1 : -1;
  shots = 0;
  burst = 1;
  enterTo: { x: number; y: number } | null = null;
  aggression: number;
  bulletSpeed: number;
  fireRate: number;
  melee = false;

  bulletTex: string | undefined;

  constructor(scene: ChapterScene, combat: Combat, target: Actor, x: number, y: number, opts: { skin?: string; hp?: number; enterTo?: { x: number; y: number }; aggression?: number; burst?: number; weapon?: 'pistol' | 'stick' } = {}) {
    super(scene, scene.rig(opts.skin ?? 'goon', x, y, x < target.x ? 1 : -1), x, y, 'enemy');
    this.combat = combat;
    this.target = target;
    this.hp = opts.hp ?? 2;
    this.maxHp = this.hp;
    this.r = 24;
    this.enterTo = opts.enterTo ?? null;
    this.aggression = opts.aggression ?? 1;
    this.burst = opts.burst ?? 1 + Math.floor(Math.random() * 2);
    const assist = settings.get().assist;
    this.bulletSpeed = (assist ? 250 : 330) * (0.9 + this.aggression * 0.1);
    this.fireRate = (assist ? 2.6 : 1.8) / this.aggression;
    this.t = 0.6 + Math.random() * 1.2;
    if (opts.weapon === 'stick') {
      this.rig.hold('stick', 0, 0, -0.5);
      this.bulletTex = 'puck';
    } else this.rig.hold('pistol', 2, 2, 0);
    this.rig.stiffness = 14;
    if (!this.enterTo) this.state = 'move';
  }

  dazzle(s: number): void {
    if (!this.alive || this.state === 'dying') return;
    this.state = 'dazzled';
    this.t = s;
    this.rig.aimAngle = null;
    this.rig.setExpression('shock');
    this.rig.strike('shrug');
    this.combat.icon(this, 'question', s * 1000);
  }

  update(dt: number): void {
    const tgt = this.target;
    this.invuln = Math.max(0, this.invuln - dt);
    this.t -= dt;
    const dx = tgt.x - this.x;
    const dy = tgt.y - this.y;
    const d = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);

    switch (this.state) {
      case 'enter': {
        const e = this.enterTo!;
        const ex = e.x - this.x;
        const ey = e.y - this.y;
        const ed = Math.hypot(ex, ey);
        if (ed < 12) {
          this.state = 'move';
          this.t = 0.4 + Math.random() * 0.8;
        } else {
          this.moveBy((ex / ed) * 260 * dt, (ey / ed) * 200 * dt);
          this.rig.setFacing(ex < 0 ? -1 : 1);
          this.rig.moveSpeed = 260;
          this.rig.setAnim('run');
        }
        return;
      }
      case 'move': {
        this.rig.setFacing(dx < 0 ? -1 : 1);
        this.rig.aimAngle = ang;
        // keep preferred distance, strafe around
        const want = d - this.prefer;
        let mx = (dx / (d || 1)) * Phaser.Math.Clamp(want / 100, -1, 1);
        let my = (dy / (d || 1)) * Phaser.Math.Clamp(want / 100, -1, 1);
        mx += (-dy / (d || 1)) * 0.6 * this.strafe;
        my += (dx / (d || 1)) * 0.6 * this.strafe;
        const l = Math.hypot(mx, my) || 1;
        const sp = 150 * this.aggression;
        const ox = this.x;
        const oy = this.y;
        this.moveBy((mx / l) * sp * dt, (my / l) * sp * dt * 0.75);
        if (Math.hypot(this.x - ox, this.y - oy) < sp * dt * 0.2) this.strafe *= -1;
        this.rig.moveSpeed = sp;
        this.rig.setAnim('walk');
        if (Math.random() < dt * 0.3) this.strafe *= -1;
        if (this.t <= 0 && tgt.alive) {
          this.state = 'windup';
          this.t = settings.get().assist ? 0.75 : 0.55;
          this.shots = this.burst;
          this.rig.setAnim('pose', 'aim');
          this.combat.icon(this, 'exclaim', this.t * 1000);
          sfx('suspicious', this.combat.pan(this.x), 150);
        }
        return;
      }
      case 'windup': {
        this.rig.aimAngle = ang;
        this.rig.setFacing(dx < 0 ? -1 : 1);
        if (this.t <= 0) {
          this.combat.fire(this, ang + (Math.random() - 0.5) * 0.12, { speed: this.bulletSpeed, team: 'enemy', tex: this.bulletTex, z: this.bulletTex ? 24 : undefined });
          this.rig.kick(1);
          this.shots--;
          if (this.shots > 0) this.t = 0.28;
          else {
            this.state = 'recover';
            this.t = 0.5;
          }
        }
        return;
      }
      case 'recover':
        this.rig.setAnim('idle');
        if (this.t <= 0) {
          this.state = 'move';
          this.t = this.fireRate * (0.7 + Math.random() * 0.8);
        }
        return;
      case 'dazzled':
        if (this.t <= 0) {
          this.state = 'move';
          this.t = 0.6;
          this.rig.setExpression('idle');
          this.rig.setAnim('walk');
        }
        return;
      case 'dying':
        // Waits for its cue... then falls over.
        if (this.t <= 0) {
          this.state = 'down';
          this.rig.setAnim('down');
          this.rig.aimAngle = null;
          this.rig.hold(null);
          sfx('knockdown', this.combat.pan(this.x));
          this.combat.dust.explode(10, this.x, this.y);
          this.scene.shake(90, 0.003);
          this.scene.time.delayedCall(500, () => {
            if (this.rig.active) this.combat.icon(this, 'zzz', 2400);
          });
          this.t = 3;
        }
        return;
      case 'down':
        if (this.t <= 0 && this.rig.alpha > 0) {
          this.scene.tweens.add({ targets: this.rig, alpha: 0, duration: 600, onComplete: () => this.destroy() });
          this.t = 99;
        }
        return;
    }
  }

  damage(amount: number, dx: number, dy: number): boolean {
    if (!this.alive) return false;
    const hit = super.damage(amount, dx, dy);
    if (!hit) return false;
    this.moveBy(dx * 18, dy * 12);
    if (this.state === 'windup' && this.hp > 0) {
      this.state = 'recover';
      this.t = 0.35;
    }
    if (!this.alive) {
      this.updatesWhenDead = true;
      this.solid = false;
      this.state = 'dying';
      this.t = 0.45; // the famous late fall
      this.rig.setAnim('pose', 'hurt');
      this.rig.setExpression('shock');
      this.rig.aimAngle = null;
    }
    return true;
  }
}
