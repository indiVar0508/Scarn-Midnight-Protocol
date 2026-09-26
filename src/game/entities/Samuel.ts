import { Actor } from './Actor';
import type { ChapterScene } from '../systems/ChapterScene';
import { sfx } from '../../audio/sfx';
import { SAMUEL_ASIDES } from '../../data/script/misc';
import { ui } from '../../state/ui';

const ASIDES = Object.values(SAMUEL_ASIDES);
let asideIdx = Math.floor(Math.random() * ASIDES.length);
let lastAside = 0;

/**
 * Samuel L. Chang: butler, hacker, companion. Follows Scarn at a respectful
 * distance with suspiciously exact movements; occasionally glitches.
 */
export class Samuel extends Actor {
  leader: Actor | null = null;
  following = true;
  offset = { x: -90, y: 18 };
  speed = 290;
  glitchT = 6 + Math.random() * 8;
  /** Offers the occasional Dwight-ism while following. */
  chatty = true;

  constructor(scene: ChapterScene, x: number, y: number, led = false) {
    super(scene, scene.rig(led ? 'samuel_led' : 'samuel', x, y), x, y, 'neutral');
    this.solid = false;
    this.r = 20;
    this.rig.stiffness = 22; // too precise
    scene.speaker('samuel', this.rig);
  }

  update(dt: number): void {
    this.glitchT -= dt;
    if (this.glitchT <= 0) {
      // One-frame tell: an LED blink and a tiny beep.
      this.glitchT = 9 + Math.random() * 12;
      this.rig.setExpression('shock');
      sfx('robot', 0, 500);
      this.scene.time.delayedCall(90, () => this.rig.active && this.rig.setExpression('idle'));
      // ...and sometimes a Dwight-ism, if nothing else is going on
      const now = performance.now();
      const quiet = !this.scene.busy && !ui.get().dialogue && !ui.get().caption && this.following && !!this.leader;
      if (this.chatty && quiet && now - lastAside > 28000) {
        lastAside = now;
        this.scene.bark(ASIDES[asideIdx++ % ASIDES.length]);
      }
    }
    if (!this.following || !this.leader) {
      this.rig.moveSpeed = 0;
      if (this.rig.anim === 'walk' || this.rig.anim === 'run') this.rig.setAnim('idle');
      return;
    }
    const L = this.leader;
    const side = L.rig.facing;
    const tx = L.x + this.offset.x * side;
    const ty = L.y + this.offset.y;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 16) {
      const sp = Math.min(this.speed * (d > 220 ? 1.4 : 1), d / dt);
      this.moveBy((dx / d) * sp * dt, (dy / d) * sp * dt);
      this.rig.moveSpeed = sp;
      this.rig.setAnim(sp > 250 ? 'run' : 'walk');
      if (Math.abs(dx) > 6) this.rig.setFacing(dx < 0 ? -1 : 1);
    } else {
      this.rig.moveSpeed = 0;
      this.rig.setAnim('idle');
      this.rig.setFacing(L.rig.facing);
    }
  }
}
