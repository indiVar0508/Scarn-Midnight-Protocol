import { ChapterScene, type Beat } from '../systems/ChapterScene';
import { World } from '../systems/World';
import { Scarn } from '../entities/Scarn';
import { Samuel } from '../entities/Samuel';
import { walkActor } from '../systems/Moves';
import { paintManor } from '../art/backgrounds';
import { ensureProp } from '../art/props';
import { CH11 as L } from '../../data/script/ch11';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';

const W = 1600;

export class Ch11 extends ChapterScene {
  readonly chapter = 11;
  scarn!: Scarn;
  samuel!: Samuel;

  constructor() {
    super('Ch11');
  }

  beats(): Beat[] {
    return [{ id: 'home', run: () => this.home() }];
  }

  private async home(): Promise<void> {
    this.useSet('manor-night', () => {
      this.world = new World(W, 400, 690);
      this.background('bg_manor_night', () => paintManor(W, true));
      this.prop('portrait', 620, 250).setDepth(-5);
      this.prop('fireplaceTV', 620, 404);
      this.world.addWall(545, 380, 150, 30);
      this.prop('trophyshelf', 880, 404);
      this.world.addWall(820, 380, 120, 30);
      this.prop('lamp', 110, 430);
      this.prop('plant', 1390, 440);
      this.prop('rug', 760, 560).setDepth(401);
      this.prop('door', 1500, 410);
      this.prop('sidetable', 1160, 520);
      this.world.addWall(1125, 505, 72, 20);
      this.prop('phone', 1160, 480).setDepth(521);
      this.prop('sidetable', 170, 540);
      this.world.addWall(135, 525, 72, 20);
      this.prop('photo_catherine', 170, 474).setDepth(541);
      this.prop('armchair', 320, 610);
      this.world.addWall(270, 585, 100, 30);
      this.cameras.main.setBounds(0, 0, W, 720);
    });
    music.play('manor', { fade: 1.5 });
    this.scarn = new Scarn(this, this.rig('scarn', 1450, 600), 1450, 600);
    this.scarn.rig.hold('trophy', 0, -10, 0);
    this.samuel = new Samuel(this, 1520, 620, false);
    this.samuel.leader = this.scarn;
    this.cameras.main.startFollow(this.scarn.rig, true, 0.08, 0.08, 0, 60);
    this.scarn.setMode('locked');
    this.letterbox(true);
    await this.say(L.n1);
    await this.say(L.s1);
    await this.say(L.m1);
    this.letterbox(false);
    this.scarn.setMode('explore');
    this.objective('Put the All-Star trophy on the shelf');
    let placed = false;
    this.interact({
      x: 880,
      y: 440,
      r: 120,
      label: 'Place the trophy',
      once: true,
      onUse: async () => {
        this.scarn.rig.hold(null);
        ensureProp(this, 'trophy');
        this.prop('trophy', 915, 300, 0.45).setDepth(405);
        sfx('sparkle');
        await this.say(L.m2);
        // breakfast, basking in the glow of the trophy
        this.scarn.setMode('locked');
        this.scarn.rig.hold('fryingpan', 6, 0, 0);
        this.scarn.rig.strike('heroic');
        sfx('clink');
        await this.say(L.brk1);
        await this.say(L.brk2);
        this.scarn.rig.setFacing(1);
        await this.say(L.brk3);
        this.scarn.rig.hold(null);
        this.scarn.setMode('explore');
        placed = true;
      },
    });
    this.interact({ x: 170, y: 560, r: 100, label: 'Look at the photo', once: true, onUse: () => this.say(L.photo) });
    await this.waitUntil(() => placed);
    // android hints
    this.scarn.setMode('locked');
    this.samuel.following = false;
    await walkActor(this, this.samuel, 1340, 470, 240);
    this.samuel.rig.setFacing(1);
    this.speaker('samuel_robot', this.samuel.rig);
    await this.say(L.s2);
    this.samuel.rig.strike('point');
    sfx('robot');
    this.flash(0x6affff, 120, 0.3);
    this.shake(80, 0.002);
    const spark = this.add.circle(this.samuel.x + 30, this.samuel.y - 90, 10, 0x9ff8ff, 0.9).setDepth(9000);
    this.tweens.add({ targets: spark, alpha: 0, scale: 3, duration: 300, repeat: 3 });
    await this.say(L.m3);
    // his eyes, just for a moment
    const led = this.rig('samuel_led', this.samuel.x, this.samuel.y, 1);
    this.samuel.rig.setVisible(false);
    this.speaker('samuel_robot', led);
    await this.say(L.s3);
    led.destroy();
    this.samuel.rig.setVisible(true);
    this.speaker('samuel_robot', this.samuel.rig);
    await this.say(L.m4);
    this.scarn.setMode('explore');
    this.objective('Talk to Samuel');
    let asked = false;
    this.interact({ x: 1300, y: 490, r: 120, label: 'Ask Samuel something personal', once: true, onUse: async () => void (asked = true) });
    await this.waitUntil(() => asked);
    this.scarn.setMode('locked');
    await this.say(L.m5);
    const led2 = this.rig('samuel_led', this.samuel.x, this.samuel.y, -1);
    this.samuel.rig.setVisible(false);
    this.speaker('samuel_robot', led2);
    sfx('robot');
    await this.say(L.s4);
    led2.destroy();
    this.samuel.rig.setVisible(true);
    this.speaker('samuel_robot', this.samuel.rig);
    await this.say(L.m6);
    await this.say(L.s5);
    // the phone
    this.scarn.setMode('explore');
    this.objective('Answer the phone');
    const ring = this.time.addEvent({ delay: 2200, loop: true, callback: () => sfx('phone_ring') });
    sfx('phone_ring');
    let answered = false;
    this.interact({ x: 1160, y: 540, r: 120, label: 'Answer the phone', once: true, onUse: async () => void (answered = true) });
    await this.waitUntil(() => answered);
    ring.remove();
    sfx('pickup');
    this.scarn.setMode('locked');
    this.scarn.rig.strike('phone');
    this.scarn.rig.hold('phone_handset', 0, 0, 0);
    music.play('suspense', { fade: 0.6 });
    this.letterbox(true);
    await this.say(L.x1);
    await this.say(L.m7);
    await this.say(L.x2);
    this.scarn.rig.setExpression('shock');
    await this.say(L.m8);
    this.scarn.rig.setExpression('idle');
    await this.say(L.x3);
    await this.say(L.m9);
    await this.crashZoom(this.scarn.x, this.scarn.y - 110, 1.6);
    await this.say(L.x4);
    music.stinger('dun');
    await this.zoomTo(1, 250);
    this.scarn.rig.hold(null);
    this.scarn.rig.strike('dramaticTurn');
    await this.say(L.m10);
    await this.say(L.s6);
    this.scarn.rig.strike('fingerguns');
    this.lensFlare(700, 180);
    await this.say(L.m11);
    music.stinger('title');
    await this.freezeFrame('SCARN WILL RETURN.', 2400);
  }
}
