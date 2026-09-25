import type { ChapterScene } from '../systems/ChapterScene';
import type { Rig } from './Rig';

export type Team = 'player' | 'enemy' | 'neutral';

/** Something that stands on the floor plane, drawn by a Rig. */
export class Actor {
  scene: ChapterScene;
  rig: Rig;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  r = 24;
  hp = 3;
  maxHp = 3;
  team: Team;
  alive = true;
  updatesWhenDead = false;
  invuln = 0;
  solid = true;
  gunHeight = 78;
  onDeath: (() => void) | null = null;

  constructor(scene: ChapterScene, rig: Rig, x: number, y: number, team: Team = 'neutral') {
    this.scene = scene;
    this.rig = rig;
    this.x = x;
    this.y = y;
    this.team = team;
    scene.actors.push(this);
    this.sync();
  }

  update(_dt: number): void {}

  sync(): void {
    this.rig.x = this.x;
    this.rig.y = this.y;
    this.rig.setDepth(this.y);
  }

  place(x: number, y: number): this {
    this.x = x;
    this.y = y;
    this.sync();
    return this;
  }

  /** Move with world collision. */
  moveBy(dx: number, dy: number): void {
    const p = { x: this.x + dx, y: this.y + dy };
    this.scene.world.resolve(p, this.r);
    // soft separation from other solid actors
    for (const o of this.scene.actors) {
      if (o === this || !o.alive || !o.solid || !this.solid) continue;
      const ddx = p.x - o.x;
      const ddy = (p.y - o.y) * 1.8;
      const d = Math.hypot(ddx, ddy);
      const min = (this.r + o.r) * 0.8;
      if (d > 0.01 && d < min) {
        p.x += (ddx / d) * (min - d) * 0.5;
        p.y += ((ddy / d) * (min - d) * 0.5) / 1.8;
      }
    }
    this.scene.world.resolve(p, this.r);
    this.x = p.x;
    this.y = p.y;
  }

  /** Returns true if damage was applied. */
  damage(amount: number, _dx: number, _dy: number): boolean {
    if (!this.alive || this.invuln > 0) return false;
    this.hp -= amount;
    this.rig.hurt();
    if (this.hp <= 0) {
      this.alive = false;
      this.onDeath?.();
    }
    return true;
  }

  dist(o: { x: number; y: number }): number {
    return Math.hypot(o.x - this.x, o.y - this.y);
  }

  destroy(): void {
    this.alive = false;
    this.rig.destroy();
    this.scene.actors = this.scene.actors.filter((a) => a !== this);
  }
}
