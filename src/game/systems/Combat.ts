import Phaser from 'phaser';
import type { ChapterScene } from './ChapterScene';
import type { Actor, Team } from '../entities/Actor';
import { ensureProp } from '../art/props';
import { R } from '../art/characters';
import { sfx } from '../../audio/sfx';
import { addStat } from '../../state/save';
import { settings } from '../../state/settings';

export interface Bullet {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  team: Team;
  dmg: number;
  life: number;
  r: number;
  countsAsShot: boolean;
}

/**
 * Floor-plane bullets. A bullet flies on the floor (x, y) at a visual height z,
 * and hits actors whose foot-circle it overlaps.
 */
export class Combat {
  scene: ChapterScene;
  bullets: Bullet[] = [];
  sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  dust: Phaser.GameObjects.Particles.ParticleEmitter;
  onKill: ((a: Actor) => void) | null = null;

  constructor(scene: ChapterScene) {
    this.scene = scene;
    ['bullet', 'ebullet', 'goldbullet', 'muzzle', 'star', 'dust', 'exclaim', 'question', 'zzz'].forEach((k) => ensureProp(scene, k));
    this.sparks = scene.add.particles(0, 0, 'star', {
      speed: { min: 120, max: 320 },
      lifespan: 380,
      scale: { start: 0.9 / R, end: 0 },
      rotate: { min: 0, max: 360 },
      emitting: false,
    });
    this.sparks.setDepth(9000);
    this.dust = scene.add.particles(0, 0, 'dust', {
      speed: { min: 20, max: 90 },
      angle: { min: 180, max: 360 },
      lifespan: 500,
      alpha: { start: 0.7, end: 0 },
      scale: { start: 0.9 / R, end: 1.8 / R },
      emitting: false,
    });
    this.dust.setDepth(1);
    scene.updaters.add((dt) => this.update(dt));
  }

  fire(from: Actor, angle: number, opts: { speed?: number; team?: Team; tex?: string; dmg?: number; z?: number; r?: number; countsAsShot?: boolean } = {}): void {
    const team = opts.team ?? from.team;
    const speed = opts.speed ?? 900;
    const tex = opts.tex ?? (team === 'player' ? 'bullet' : 'ebullet');
    const z = opts.z ?? from.gunHeight;
    const hx = from.x + Math.cos(angle) * 34;
    const hy = from.y + Math.sin(angle) * 34;
    const img = this.scene.add.image(hx, hy - z, tex).setScale(1 / R).setRotation(angle).setDepth(hy + 1);
    const b: Bullet = { img, x: hx, y: hy, z, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, team, dmg: opts.dmg ?? 1, life: 1.6, r: opts.r ?? 12, countsAsShot: opts.countsAsShot ?? team === 'player' };
    this.bullets.push(b);
    // muzzle flash (cardboard cut-out)
    const m = this.scene.add.image(hx, hy - z, 'muzzle').setScale(1.2 / R).setRotation(angle).setDepth(hy + 2);
    this.scene.time.delayedCall(55, () => m.destroy());
    if (team === 'player') {
      sfx('shoot', this.pan(hx));
      if (b.countsAsShot) addStat('shotsFired', 1);
    } else sfx('enemy_shoot', this.pan(hx));
  }

  pan(x: number): number {
    const cam = this.scene.cameras.main;
    return Phaser.Math.Clamp((x - cam.scrollX - 640) / 800, -0.8, 0.8);
  }

  update(dt: number): void {
    const w = this.scene.world;
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      b.img.setPosition(b.x, b.y - b.z).setDepth(b.y + 1);
      if (b.life <= 0) continue;
      if (b.x < w.minX - 60 || b.x > w.maxX + 60 || b.y < w.minY - 90 || b.y > w.maxY + 60 || w.pointBlocked(b.x, b.y)) {
        if (w.pointBlocked(b.x, b.y) && b.x > w.minX && b.x < w.maxX) {
          this.sparks.explode(4, b.x, b.y - b.z);
          sfx('ricochet', this.pan(b.x), 90);
        }
        b.life = 0;
        continue;
      }
      for (const a of this.scene.actors) {
        if (!a.alive || a.team === b.team || a.team === 'neutral') continue;
        const dx = a.x - b.x;
        const dy = (a.y - b.y) * 1.6;
        if (dx * dx + dy * dy < (a.r + b.r) * (a.r + b.r)) {
          const len = Math.hypot(b.vx, b.vy) || 1;
          const hit = a.damage(b.dmg * (a.team === 'player' && settings.get().assist ? 0.5 : 1), b.vx / len, b.vy / len);
          if (hit) {
            b.life = 0;
            this.sparks.explode(8, b.x, b.y - b.z);
            sfx('hit', this.pan(b.x));
            if (b.team === 'player') {
              if (b.countsAsShot) addStat('shotsHit', 1);
              this.scene.hitstop(a.alive ? 30 : 70);
              if (!a.alive) {
                addStat('enemiesDefeated', 1);
                this.onKill?.(a);
              }
            }
            break;
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => {
      if (b.life <= 0) {
        b.img.destroy();
        return false;
      }
      return true;
    });
  }

  clearBullets(): void {
    this.bullets.forEach((b) => b.img.destroy());
    this.bullets = [];
  }

  enemies(): Actor[] {
    return this.scene.actors.filter((a) => a.team === 'enemy' && a.alive);
  }

  /** Floating icon above an actor ("!", "?", "zzz"). */
  icon(a: Actor, key: string, ms = 700): Phaser.GameObjects.Image {
    const im = this.scene.add.image(a.x, a.y - 170 * a.rig.baseScale, key).setScale(1 / R).setDepth(9500);
    im.setScale(0);
    this.scene.tweens.add({ targets: im, scale: 1 / R, duration: 140, ease: 'Back.easeOut' });
    const follow = () => im.setPosition(a.x, a.y - 170 * a.rig.baseScale);
    this.scene.updaters.add(follow);
    this.scene.time.delayedCall(ms, () => {
      this.scene.updaters.delete(follow);
      im.destroy();
    });
    return im;
  }
}
