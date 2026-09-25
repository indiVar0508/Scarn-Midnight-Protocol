import Phaser from 'phaser';
import type { ChapterScene } from '../systems/ChapterScene';
import type { Rig } from '../entities/Rig';
import { input } from '../systems/Input';
import { qa } from '../systems/qa';
import { ensureProp } from '../art/props';
import { R } from '../art/characters';
import { sfx } from '../../audio/sfx';
import { settings } from '../../state/settings';
import { addStat } from '../../state/save';
import { ui } from '../../state/ui';

/**
 * Arcade hockey on the floor plane (NES Ice Hockey energy).
 * Home team attacks right; away team attacks left.
 */
export type Team = 'home' | 'away';

export interface Skater {
  rig: Rig;
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: Team;
  human: boolean;
  role: 'fwd' | 'def';
  stun: number;
  dash: number;
  cooldown: number;
  facing: 1 | -1;
}

interface Goalie {
  rig: Rig;
  x: number;
  y: number;
  team: Team;
}

export const RINK = { x0: 110, x1: 2490, y0: 385, y1: 690, goalL: 170, goalR: 2430, mouth0: 470, mouth1: 610 };

export class Hockey {
  scene: ChapterScene;
  skaters: Skater[] = [];
  goalies: Goalie[] = [];
  puck = { x: 1300, y: 540, vx: 0, vy: 0, owner: null as Skater | null, img: null as unknown as Phaser.GameObjects.Image, shadow: null as unknown as Phaser.GameObjects.Ellipse, lastTouch: null as Skater | null, cooldown: 0 };
  score = { home: 0, away: 0 };
  onGoal: ((team: Team, scorer: Skater | null) => void) | null = null;
  frozen = false;
  bomb = false;
  noGoals = false; // keep-away phase: nets are "live" bombs
  onNetTouch: (() => void) | null = null;
  charge = 0;
  charging = false;
  chargeBar: Phaser.GameObjects.Rectangle;
  chargeBg: Phaser.GameObjects.Rectangle;
  marker: Phaser.GameObjects.Ellipse;
  human!: Skater;
  private beepT = 0;

  constructor(scene: ChapterScene) {
    this.scene = scene;
    ensureProp(scene, 'puck');
    ensureProp(scene, 'bombpuck');
    ensureProp(scene, 'goal');
    ensureProp(scene, 'stick');
    // nets (depth sorted by their base)
    scene.prop('goal', RINK.goalL - 30, RINK.mouth1 + 10, 1.1).setDepth(RINK.mouth1);
    scene.prop('goal', RINK.goalR + 30, RINK.mouth1 + 10, 1.1).setDepth(RINK.mouth1).setFlipX(true);
    this.puck.shadow = scene.add.ellipse(0, 0, 22, 8, 0x000000, 0.3).setDepth(390);
    this.puck.img = scene.add.image(0, 0, 'puck').setScale(1.3 / R).setDepth(400);
    this.marker = scene.add.ellipse(0, 0, 70, 22).setStrokeStyle(4, 0xffcf3a, 0.9).setDepth(389);
    this.chargeBg = scene.add.rectangle(0, 0, 70, 10, 0x000000, 0.7).setDepth(9800).setVisible(false);
    this.chargeBar = scene.add.rectangle(0, 0, 2, 6, 0xffcf3a).setOrigin(0, 0.5).setDepth(9801).setVisible(false);
    scene.updaters.add((dt) => this.update(dt));
    ui.set({ touchLayout: 'hockey' });
  }

  addSkater(rig: Rig, team: Team, role: Skater['role'], human = false): Skater {
    rig.hold('stick', 0, 0, -0.5);
    rig.setAnim('skate');
    const s: Skater = { rig, x: rig.x, y: rig.y, vx: 0, vy: 0, team, human, role, stun: 0, dash: 0, cooldown: 0, facing: team === 'home' ? 1 : -1 };
    this.skaters.push(s);
    if (human) this.human = s;
    return s;
  }

  addGoalie(rig: Rig, team: Team): void {
    rig.hold('stick', 0, 0, -0.5);
    const x = team === 'home' ? RINK.goalL + 40 : RINK.goalR - 40;
    rig.setPosition(x, 540);
    rig.setFacing(team === 'home' ? 1 : -1);
    rig.setAnim('pose', 'crouch');
    this.goalies.push({ rig, x, y: 540, team });
  }

  faceoff(): void {
    const p = this.puck;
    p.x = 1300;
    p.y = 540;
    p.vx = 0;
    p.vy = 0;
    p.owner = null;
    p.cooldown = 0.6;
    const home = this.skaters.filter((s) => s.team === 'home');
    const away = this.skaters.filter((s) => s.team === 'away');
    home.forEach((s, i) => this.place(s, 1300 - 140 - (i % 2) * 180, [540, 440, 640][i % 3]));
    away.forEach((s, i) => this.place(s, 1300 + 140 + (i % 2) * 180, [540, 640, 440][i % 3]));
    this.charge = 0;
    this.charging = false;
  }

  place(s: Skater, x: number, y: number): void {
    s.x = x;
    s.y = y;
    s.vx = 0;
    s.vy = 0;
    s.stun = 0;
    s.rig.setPosition(x, y);
  }

  setBomb(on: boolean): void {
    this.bomb = on;
    this.puck.img.setTexture(on ? 'bombpuck' : 'puck');
  }

  private shoot(s: Skater, angle: number, power: number): void {
    const p = this.puck;
    p.owner = null;
    p.lastTouch = s;
    p.cooldown = 0.25;
    p.vx = Math.cos(angle) * power;
    p.vy = Math.sin(angle) * power * 0.7;
    s.rig.gesture('slapHit', 260);
    sfx(power > 900 ? 'slapshot' : 'puck', this.pan(s.x));
    if (power > 900) this.scene.shake(80, 0.003);
  }

  private pan(x: number): number {
    return Phaser.Math.Clamp((x - this.scene.cameras.main.scrollX - 640) / 800, -0.8, 0.8);
  }

  private pass(from: Skater): void {
    const mates = this.skaters.filter((s) => s !== from && s.team === from.team && s.stun <= 0);
    if (!mates.length) return;
    const best = mates.sort((a, b) => {
      const sa = (a.x - from.x) * from.facing - Math.abs(a.y - from.y) * 0.5;
      const sb = (b.x - from.x) * from.facing - Math.abs(b.y - from.y) * 0.5;
      return sb - sa;
    })[0];
    const lead = 0.25;
    const tx = best.x + best.vx * lead;
    const ty = best.y + best.vy * lead;
    const d = Math.hypot(tx - from.x, ty - from.y);
    this.shoot(from, Math.atan2((ty - from.y) / 0.7, tx - from.x), Math.min(900, 380 + d * 1.1));
  }

  private tryCheck(s: Skater): void {
    if (s.cooldown > 0 || s.stun > 0) return;
    s.dash = 0.26;
    s.cooldown = 0.9;
    const dir = Math.hypot(s.vx, s.vy) > 20 ? Math.atan2(s.vy, s.vx) : s.facing > 0 ? 0 : Math.PI;
    s.vx = Math.cos(dir) * 620;
    s.vy = Math.sin(dir) * 460;
    sfx('skate_stop', this.pan(s.x));
  }

  private tryPoke(s: Skater): boolean {
    const p = this.puck;
    if (!p.owner || p.owner.team === s.team) return false;
    if (Math.hypot(p.owner.x - s.x, (p.owner.y - s.y) * 1.4) > 80) return false;
    if (Math.random() < (settings.get().assist ? 0.85 : 0.6)) {
      p.owner = s;
      p.lastTouch = s;
      sfx('stick', this.pan(s.x));
      if (s.human) addStat('steals', 1);
      return true;
    }
    sfx('miss');
    return false;
  }

  update(dt: number): void {
    if (this.frozen) {
      this.skaters.forEach((s) => (s.rig.moveSpeed = 0));
      return;
    }
    const p = this.puck;
    p.cooldown -= dt;
    const aimGoalR = { x: RINK.goalR + 20, y: (RINK.mouth0 + RINK.mouth1) / 2 };
    const aimGoalL = { x: RINK.goalL - 20, y: (RINK.mouth0 + RINK.mouth1) / 2 };

    for (const s of this.skaters) {
      s.stun -= dt;
      s.cooldown -= dt;
      s.dash -= dt;
      let ax = 0;
      let ay = 0;
      const maxSp = s.human ? 380 : 310 + (s.role === 'fwd' ? 30 : 0);
      if (s.stun > 0) {
        s.rig.setAnim('pose', 'hurt');
      } else if (s.human && !this.scene.busy) {
        const mv = input.move();
        ax = mv.x;
        ay = mv.y;
        // controls
        const hasPuck = p.owner === s;
        if (hasPuck) {
          if (input.isDown('fire') || qa.autoWin) {
            this.charging = true;
            this.charge = Math.min(1.2, this.charge + dt);
          }
          const release = (this.charging && !input.isDown('fire')) || (qa.autoWin && this.charge > 0.5);
          if (release) {
            let ang: number;
            const usingMouse = ui.get().inputMode === 'kbm' && performance.now() - input.pointer.lastMove < 2500;
            if (usingMouse) {
              const wp = this.scene.cameras.main.getWorldPoint(input.pointer.x, input.pointer.y);
              ang = Math.atan2((wp.y + 30 - s.y) / 0.7, wp.x - s.x);
            } else {
              const ty = aimGoalR.y + mv.y * 60;
              ang = Math.atan2((ty - s.y) / 0.7, aimGoalR.x - s.x);
            }
            this.shoot(s, ang, 520 + (this.charge / 1.2) * 900);
            this.charging = false;
            this.charge = 0;
          }
          if (input.pressed('interact')) this.pass(s);
        } else {
          this.charging = false;
          this.charge = 0;
          if (input.pressed('interact')) this.tryPoke(s);
        }
        if (input.pressed('dodge') && !hasPuck) this.tryCheck(s);
      } else if (!s.human) {
        [ax, ay] = this.ai(s, dt, aimGoalL, aimGoalR);
      }
      // physics
      const l = Math.hypot(ax, ay);
      if (l > 1) {
        ax /= l;
        ay /= l;
      }
      const acc = 1100;
      if (s.dash <= 0) {
        s.vx += ax * acc * dt;
        s.vy += ay * acc * 0.8 * dt;
        const sp = Math.hypot(s.vx, s.vy);
        const cap = p.owner === s ? maxSp * 0.9 : maxSp;
        if (sp > cap) {
          s.vx *= cap / sp;
          s.vy *= cap / sp;
        }
        const fr = l < 0.1 ? 1.6 : 0.4;
        s.vx -= s.vx * fr * dt;
        s.vy -= s.vy * fr * dt;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < RINK.x0 + 20 || s.x > RINK.x1 - 20) s.vx *= -0.4;
      if (s.y < RINK.y0 || s.y > RINK.y1) s.vy *= -0.4;
      s.x = Phaser.Math.Clamp(s.x, RINK.x0 + 20, RINK.x1 - 20);
      s.y = Phaser.Math.Clamp(s.y, RINK.y0, RINK.y1);
      if (Math.abs(s.vx) > 25) s.facing = s.vx < 0 ? -1 : 1;
      s.rig.setPosition(s.x, s.y).setDepth(s.y);
      s.rig.setFacing(s.facing);
      s.rig.moveSpeed = Math.hypot(s.vx, s.vy);
      if (s.stun <= 0) s.rig.setAnim('skate', this.charging && s.human && p.owner === s ? 'slapWind' : 'stand');
    }

    // checks: a dashing skater knocks over opponents
    for (const a of this.skaters) {
      if (a.dash <= 0) continue;
      for (const b of this.skaters) {
        if (b.team === a.team || b.stun > 0) continue;
        if (Math.hypot(a.x - b.x, (a.y - b.y) * 1.5) < 56) {
          b.stun = 1.3;
          b.vx = a.vx * 0.6;
          b.vy = a.vy * 0.6;
          a.dash = 0;
          sfx('check', this.pan(b.x));
          this.scene.shake(120, 0.006);
          this.scene.hitstop(60);
          if (a.human) addStat('checks', 1);
          if (p.owner === b) {
            p.owner = null;
            p.vx = b.vx * 1.2 + (Math.random() - 0.5) * 200;
            p.vy = b.vy * 1.2 + (Math.random() - 0.5) * 160;
            p.cooldown = 0.2;
          }
        }
      }
    }

    // puck
    if (p.owner) {
      const o = p.owner;
      p.x = o.x + o.facing * 34;
      p.y = o.y + 8;
      p.vx = o.vx;
      p.vy = o.vy;
      if (o.stun > 0) p.owner = null;
    } else {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx -= p.vx * 0.55 * dt;
      p.vy -= p.vy * 0.55 * dt;
      // boards (the nets are behind the goal line)
      if (p.y < RINK.y0 - 5 || p.y > RINK.y1 + 5) {
        p.vy *= -0.8;
        p.y = Phaser.Math.Clamp(p.y, RINK.y0 - 5, RINK.y1 + 5);
        sfx('puck', this.pan(p.x), 80);
      }
      const inMouth = p.y > RINK.mouth0 && p.y < RINK.mouth1;
      // goalies
      for (const g of this.goalies) {
        const near = g.team === 'home' ? p.x < g.x + 26 && p.x > g.x - 30 && p.vx < 0 : p.x > g.x - 26 && p.x < g.x + 30 && p.vx > 0;
        if (near && Math.abs(p.y - g.y) < (settings.get().assist && g.team === 'away' ? 26 : 40)) {
          p.vx *= -0.6;
          p.vy = (Math.random() - 0.5) * 300;
          p.x = g.team === 'home' ? g.x + 30 : g.x - 30;
          g.rig.gesture('danceDown', 300);
          sfx('puck', this.pan(p.x));
          this.scene.hitstop(40);
        }
      }
      if ((p.x < RINK.goalL && inMouth) || (p.x > RINK.goalR && inMouth)) {
        const team: Team = p.x > RINK.goalR ? 'home' : 'away';
        if (this.noGoals) {
          p.vx = 0;
          p.vy = 0;
          this.onNetTouch?.();
        } else {
          this.score[team]++;
          const scorer = p.lastTouch && p.lastTouch.team === team ? p.lastTouch : null;
          this.onGoal?.(team, scorer);
        }
        p.x = Phaser.Math.Clamp(p.x, RINK.goalL, RINK.goalR);
      }
      if (p.x < RINK.x0 || p.x > RINK.x1) {
        p.vx *= -0.8;
        p.x = Phaser.Math.Clamp(p.x, RINK.x0, RINK.x1);
        sfx('puck', this.pan(p.x), 80);
      }
      // pickups
      if (p.cooldown <= 0) {
        let best: Skater | null = null;
        let bd = 38;
        for (const s of this.skaters) {
          if (s.stun > 0) continue;
          const d = Math.hypot(s.x + s.facing * 20 - p.x, (s.y - p.y) * 1.3);
          if (d < bd) {
            bd = d;
            best = s;
          }
        }
        if (best && Math.hypot(p.vx, p.vy) < 1100) {
          p.owner = best;
          p.lastTouch = best;
          sfx('stick', this.pan(p.x), 60);
        }
      }
    }
    // goalies track the puck
    for (const g of this.goalies) {
      const ty = Phaser.Math.Clamp(p.y, RINK.mouth0 + 10, RINK.mouth1 - 10);
      g.y += (ty - g.y) * Math.min(1, dt * (settings.get().assist && g.team === 'away' ? 2.2 : 3.6));
      g.rig.setPosition(g.x, g.y).setDepth(g.y);
    }
    p.img.setPosition(p.x, p.y - 4).setDepth(p.y + 1);
    p.shadow.setPosition(p.x, p.y + 2);
    if (this.bomb) {
      this.beepT -= dt;
      if (this.beepT <= 0) {
        this.beepT = 0.6;
        sfx('beep', this.pan(p.x), 200);
        p.img.setTint(0xff6060);
        this.scene.time.delayedCall(120, () => p.img.clearTint());
      }
    }
    // human marker + charge meter
    const h = this.human;
    if (h) {
      this.marker.setPosition(h.x, h.y + 4).setDepth(h.y - 1);
      this.chargeBg.setVisible(this.charging).setPosition(h.x, h.y - 150);
      this.chargeBar.setVisible(this.charging).setPosition(h.x - 34, h.y - 150);
      this.chargeBar.width = Math.max(2, (this.charge / 1.2) * 68);
    }
  }

  /** Very small brain: chase, carry, shoot, pass, cover. */
  private ai(s: Skater, _dt: number, goalL: { x: number; y: number }, goalR: { x: number; y: number }): [number, number] {
    const p = this.puck;
    const attackGoal = s.team === 'home' ? goalR : goalL;
    const ownGoal = s.team === 'home' ? goalL : goalR;
    const dirTo = (x: number, y: number): [number, number] => {
      const dx = x - s.x;
      const dy = y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      return d < 12 ? [0, 0] : [dx / d, dy / d];
    };
    if (p.owner === s) {
      const distGoal = Math.abs(attackGoal.x - s.x);
      if (distGoal < 520 && Math.random() < 0.03) {
        this.shoot(s, Math.atan2((attackGoal.y + (Math.random() - 0.5) * 120 - s.y) / 0.7, attackGoal.x - s.x), 900 + Math.random() * 300);
        return [0, 0];
      }
      // pressured? pass
      const pressure = this.skaters.some((o) => o.team !== s.team && Math.hypot(o.x - s.x, o.y - s.y) < 90);
      if (pressure && Math.random() < 0.02) this.pass(s);
      return dirTo(attackGoal.x, attackGoal.y + Math.sin(s.x / 90) * 90);
    }
    const mateHas = p.owner && p.owner.team === s.team;
    const oppHas = p.owner && p.owner.team !== s.team;
    if (mateHas) {
      // get open ahead of the carrier
      const ahead = s.team === 'home' ? 1 : -1;
      const tx = Phaser.Math.Clamp(p.owner!.x + ahead * (s.role === 'fwd' ? 260 : -120), RINK.x0 + 80, RINK.x1 - 80);
      const ty = s.role === 'fwd' ? (p.owner!.y > 540 ? 460 : 630) : 540;
      return dirTo(tx, ty);
    }
    if (oppHas) {
      const carrier = p.owner!;
      if (s.role === 'def') {
        // stand between carrier and own goal, then check
        const tx = (carrier.x + ownGoal.x) / 2;
        const ty = (carrier.y + ownGoal.y) / 2;
        if (Math.hypot(carrier.x - s.x, carrier.y - s.y) < 110 && s.cooldown <= 0 && Math.random() < 0.04) this.tryCheck(s);
        return dirTo(tx, ty);
      }
      if (Math.hypot(carrier.x - s.x, carrier.y - s.y) < 70 && Math.random() < 0.05) this.tryPoke(s);
      return dirTo(carrier.x, carrier.y);
    }
    // loose puck: nearest chases, others hold shape
    const mates = this.skaters.filter((o) => o.team === s.team);
    const nearest = mates.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (nearest === s || s.role === 'fwd') return dirTo(p.x + p.vx * 0.2, p.y + p.vy * 0.2);
    return dirTo((p.x + ownGoal.x) / 2, 540);
  }

  destroy(): void {
    this.puck.img.destroy();
    this.puck.shadow.destroy();
    this.marker.destroy();
    this.chargeBar.destroy();
    this.chargeBg.destroy();
    ui.set({ touchLayout: 'none' });
  }
}
