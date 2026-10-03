import Phaser from 'phaser';
import { Actor } from './Actor';
import type { Rig } from './Rig';
import type { ChapterScene } from '../systems/ChapterScene';
import type { Combat } from '../systems/Combat';
import { input } from '../systems/Input';
import { sfx } from '../../audio/sfx';
import { ui } from '../../state/ui';
import { settings } from '../../state/settings';
import { addStat, save, unlockAchievement } from '../../state/save';
import { Director } from '../Director';
import { R } from '../art/characters';

export type ScarnMode = 'explore' | 'combat' | 'stealth' | 'locked';

/**
 * Michael Scarn, player controller. Twin-stick-ish on the floor plane:
 * move, aim (mouse / right stick / auto-aim), shoot, dodge-roll, interact,
 * and the Dramatic Pose (F), which dazzles nearby henchmen.
 */
export class Scarn extends Actor {
  mode: ScarnMode = 'explore';
  /** Forced forward speed for auto-run sections (the player steers vertically). */
  autoRun: number | null = null;
  combat: Combat | null = null;
  speed = 300;
  accel = 2600;
  dodgeT = 0;
  dodgeCd = 0;
  dodgeDir = { x: 1, y: 0 };
  fireCd = 0;
  poseCd = 0;
  aim = 0;
  reticle: Phaser.GameObjects.Image | null = null;
  onDown: (() => void) | null = null;
  canPose = true;
  sneaking = false;
  skates = false;
  fireInterval = 0.19;
  hidden = false; // stealth: inside a locker / behind cover
  footstepT = 0;

  constructor(scene: ChapterScene, rig: Rig, x: number, y: number) {
    super(scene, rig, x, y, 'player');
    this.r = 22;
    this.maxHp = 6;
    this.hp = 6;
    this.gunHeight = 78;
    rig.flair = [
      { aF: 60, eF: 150, head: -6 }, // fix hair
      { aF: 92, eF: 0, aB: 70, eB: 25, lean: -6, head: -6 }, // finger guns at nobody
      { aF: 40, eF: 120, head: 8 }, // check watch
      { lean: -8, head: -12, aF: -12, eF: 70, aB: -18, eB: 60 }, // chest out
    ];
    scene.player = this;
    scene.speaker('scarn', rig);
  }

  setMode(m: ScarnMode, combat?: Combat): void {
    const wasCombat = this.mode === 'combat';
    this.mode = m;
    if (combat) this.combat = combat;
    if (m === 'combat') {
      if (this.skates) this.rig.hold('stick', 0, 0, -0.5);
      else this.rig.hold('pistol', 2, 2, 0);
      if (!this.reticle && this.scene.textures.exists('reticle')) this.reticle = this.scene.add.image(0, 0, 'reticle').setDepth(9999).setScale(1 / R);
      ui.set({ hud: { hp: this.hp, hpMax: this.maxHp }, touchLayout: 'action' });
    } else {
      // Only put the weapon away; props handed over in cutscenes (trophy, phone...) stay in hand.
      if (wasCombat) this.rig.hold(null);
      this.rig.aimAngle = null;
      this.reticle?.destroy();
      this.reticle = null;
      ui.set({ touchLayout: m === 'locked' ? 'none' : m === 'stealth' ? 'buttons' : 'move' });
      if (m !== 'stealth') ui.set({ hud: null });
    }
  }

  update(dt: number): void {
    const s = this.scene;
    this.invuln = Math.max(0, this.invuln - dt);
    this.fireCd -= dt;
    this.dodgeCd -= dt;
    this.poseCd -= dt;
    const locked = this.mode === 'locked' || s.busy || !!ui.get().dialogue;
    if (!this.alive) return;

    // --- dodge roll in progress
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      const sp = 620;
      this.moveBy(this.dodgeDir.x * sp * dt, this.dodgeDir.y * sp * dt);
      this.rig.spin = (1 - Math.max(0, this.dodgeT) / 0.32) * 360;
      if (this.dodgeT <= 0) this.rig.spin = 0;
      return;
    }

    let mv = locked ? { x: 0, y: 0 } : input.move();
    if (this.hidden) mv = { x: 0, y: 0 };
    const sneak = this.mode === 'stealth';
    const maxSp = sneak ? 210 : this.skates ? 380 : this.speed;
    // Auto-run: forward speed is forced; left/right only brake or push a little.
    const tx = this.autoRun !== null && !locked ? this.autoRun * (mv.x < -0.3 ? 0.6 : mv.x > 0.3 ? 1.15 : 1) : mv.x * maxSp;
    const ty = mv.y * maxSp * 0.72;
    const a = (this.skates ? 900 : this.accel) * dt;
    this.vx = approach(this.vx, tx, a);
    this.vy = approach(this.vy, ty, a);
    this.moveBy(this.vx * dt, this.vy * dt);
    const speed = Math.hypot(this.vx, this.vy);
    this.rig.moveSpeed = speed;

    // footsteps
    if (speed > 60) {
      this.footstepT -= dt * (speed / 200);
      if (this.footstepT <= 0) {
        this.footstepT = 0.34;
        if (!sneak) sfx('step', 0, 60);
      }
    }

    // --- aiming
    let aiming = false;
    if (this.mode === 'combat' && !locked) {
      const cam = s.cameras.main;
      const usingMouse = ui.get().inputMode === 'kbm' && performance.now() - input.pointer.lastMove < 2500;
      if (input.padAim.x || input.padAim.y) {
        this.aim = Math.atan2(input.padAim.y, input.padAim.x);
        aiming = true;
      } else if (usingMouse) {
        const wp = cam.getWorldPoint(input.pointer.x, input.pointer.y);
        this.aim = Math.atan2(wp.y + this.gunHeight - this.y, wp.x - this.x);
        aiming = true;
        this.reticle?.setVisible(true).setPosition(wp.x, wp.y);
      } else {
        const t = this.autoTarget();
        if (t) this.aim = Math.atan2(t.y - this.y, t.x - this.x);
        else if (speed > 30) this.aim = Math.atan2(this.vy, this.vx);
        else this.aim = this.rig.facing > 0 ? 0 : Math.PI;
        aiming = !!t;
        this.reticle?.setVisible(false);
      }
      if (this.reticle && !usingMouse) this.reticle.setVisible(false);
      const facing = Math.cos(this.aim) >= 0 ? 1 : -1;
      this.rig.setFacing(facing as 1 | -1);
      this.rig.aimAngle = this.aim;

      if (input.isDown('fire') && this.fireCd <= 0) {
        this.fireCd = this.skates ? 0.3 : this.fireInterval;
        if (this.skates) sfx('slapshot');
        this.combat?.fire(this, this.aim, this.skates ? { speed: 900, tex: 'puck', z: 24 } : { speed: 950 });
        this.rig.kick(1);
        s.shake(60, 0.002);
      }
    } else {
      if (!locked && Math.abs(this.vx) > 12) this.rig.setFacing(this.vx < 0 ? -1 : 1);
    }

    // --- animation state
    if (this.hidden) {
      // tucked away in a locker / behind cover
    } else if (this.skates) {
      this.rig.setAnim('skate');
    } else if (this.rig.anim !== 'pose' || this.mode !== 'locked') {
      if (speed > 40) this.rig.setAnim(sneak ? 'sneak' : speed > 260 ? 'run' : 'walk');
      else if (this.rig.anim !== 'pose') this.rig.setAnim('idle', sneak ? 'crouch' : 'stand');
    }
    if (!aiming && this.mode === 'combat') this.rig.aimAngle = this.aim;

    if (locked) return;

    // --- dodge
    if (input.pressed('dodge') && this.dodgeCd <= 0 && this.mode !== 'stealth' && this.mode !== 'explore') {
      const d = Math.hypot(mv.x, mv.y) > 0.1 ? mv : { x: this.rig.facing, y: 0 };
      const l = Math.hypot(d.x, d.y) || 1;
      this.dodgeDir = { x: d.x / l, y: (d.y / l) * 0.8 };
      this.dodgeT = 0.32;
      this.dodgeCd = 0.55;
      this.rig.gesture('crouch', 330);
      this.invuln = Math.max(this.invuln, 0.36);
      sfx('dodge');
      this.combat?.dust.explode(6, this.x, this.y);
    }

    // --- dramatic pose
    if (this.canPose && input.pressed('pose') && this.poseCd <= 0) this.dramaticPose();
  }

  dramaticPose(): void {
    this.poseCd = 1.2;
    this.rig.gesture('fingerguns', 900);
    sfx('pose');
    const cam = this.scene.cameras.main;
    Director.overlay?.lensFlare(Phaser.Math.Clamp(this.x - cam.scrollX + 60, 100, 1180), Phaser.Math.Clamp(this.y - cam.scrollY - 120, 80, 600));
    addStat('dramaticPoses', 1);
    if (save.get().stats.dramaticPoses >= 15) unlockAchievement('poser');
    // Henchmen are briefly dazzled by the sheer coolness.
    if (this.combat) {
      for (const e of this.combat.enemies()) {
        if (e.dist(this) < 330 && 'dazzle' in e) (e as unknown as { dazzle: (s: number) => void }).dazzle(1.1);
      }
      this.poseCd = 4;
    }
  }

  autoTarget(): Actor | null {
    if (!this.combat) return null;
    let best: Actor | null = null;
    let bd = 900;
    for (const e of this.combat.enemies()) {
      const d = e.dist(this);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  damage(amount: number, dx: number, dy: number): boolean {
    if (!this.alive || this.invuln > 0 || this.dodgeT > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invuln = 0.9;
    this.rig.hurt(380);
    sfx('hurt');
    this.scene.shake(160, 0.006);
    this.scene.flash(0xff2020, 160, 0.25);
    this.vx += dx * 260;
    this.vy += dy * 180;
    ui.set({ hud: { hp: this.hp, hpMax: this.maxHp } });
    if (this.hp <= 0) {
      this.alive = false;
      this.rig.setAnim('down');
      this.rig.aimAngle = null;
      addStat('deaths', 1);
      if (save.get().stats.deaths >= 3) unlockAchievement('intentional');
      this.onDown?.();
    }
    return true;
  }

  heal(): void {
    this.hp = this.maxHp;
    ui.set({ hud: { hp: this.hp, hpMax: this.maxHp } });
  }

  // settings are read live so accessibility toggles apply mid-fight
  get assist(): boolean {
    return settings.get().assist;
  }
}

function approach(v: number, t: number, a: number): number {
  if (v < t) return Math.min(t, v + a);
  if (v > t) return Math.max(t, v - a);
  return v;
}
