import { ChapterScene, type Beat } from '../systems/ChapterScene';
import { World } from '../systems/World';
import { Scarn } from '../entities/Scarn';
import { Samuel } from '../entities/Samuel';
import { walkActor, walkRig } from '../systems/Moves';
import { paintManor } from '../art/backgrounds';
import { CH02 as L } from '../../data/script/ch02';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { findBeet, addStat, unlockAchievement } from '../../state/save';
import { openCall } from '../systems/VideoCall';
import { coinFlip } from '../minigames/CoinFlip';
import { ensureProp } from '../art/props';
import { R } from '../art/characters';

const W = 1600;

export class Ch02 extends ChapterScene {
  readonly chapter = 2;
  scarn!: Scarn;
  samuel!: Samuel;

  constructor() {
    super('Ch02');
  }

  beats(): Beat[] {
    return [
      { id: 'wake', run: () => this.wake() },
      { id: 'roam', run: () => this.roam() },
      { id: 'call', run: () => this.call() },
    ];
  }

  buildManor(): void {
    this.useSet('manor', () => {
      this.world = new World(W, 400, 690);
      this.background('bg_manor', () => paintManor(W));
      this.prop('portrait', 620, 250).setDepth(-5);
      this.prop('fireplaceTV', 620, 404);
      this.world.addWall(545, 380, 150, 30);
      this.prop('trophyshelf', 880, 404);
      this.world.addWall(820, 380, 120, 30);
      this.prop('lamp', 110, 430);
      this.prop('plant', 1390, 440);
      this.prop('rug', 760, 560).setDepth(401);
      this.prop('door', 1500, 410);
      this.prop('doorsign', 1500, 214).setDepth(-5);
      this.prop('sidetable', 1160, 520);
      this.world.addWall(1125, 505, 72, 20);
      this.prop('laptop', 1160, 452).setDepth(521);
      this.prop('sidetable', 170, 540);
      this.world.addWall(135, 525, 72, 20);
      this.prop('photo_catherine', 150, 474).setDepth(541);
      this.prop('mug', 190, 478).setDepth(541);
      this.prop('armchair', 320, 610);
      this.world.addWall(270, 585, 100, 30);
      this.prop('couch', 860, 670);
      this.world.addWall(760, 640, 200, 34);
      this.cameras.main.setBounds(0, 0, W, 720);
    });
  }

  private async wake(): Promise<void> {
    this.buildManor();
    music.play('manor', { fade: 1 });
    // Scarn asleep in the armchair
    const sleeper = this.rig('scarn', 322, 604, 1);
    sleeper.setDepth(611).setAnim('still', 'sitSlump').setExpression('blink');
    sleeper.snap();
    this.speaker('scarn', sleeper);
    ensureProp(this, 'zzz');
    const z = this.add.image(360, 430, 'zzz').setScale(1 / R).setDepth(9000);
    this.tweens.add({ targets: z, y: 400, alpha: 0.3, duration: 1200, yoyo: true, repeat: -1 });
    this.cameras.main.centerOn(500, 360);
    this.letterbox(true);
    await this.say(L.n1);
    const sam = this.rig('samuel', 1500, 430, -1);
    this.speaker('samuel', sam);
    await walkRig(this, sam, 470, 600, 220);
    sam.setFacing(-1);
    await this.say(L.s1);
    z.destroy();
    sfx('boing');
    sleeper.setExpression('shock');
    sleeper.gesture('hurt', 300);
    this.shake(120, 0.004);
    await this.say(L.m1);
    sleeper.setExpression('idle');
    await this.say(L.s2);
    await this.say(L.m2);
    await this.say(L.s3);
    await this.say(L.m3);
    await this.say(L.s4);
    await this.say(L.m4);
    sleeper.destroy();
    sam.destroy();
    this.letterbox(false);
  }

  private async roam(): Promise<void> {
    this.buildManor();
    music.play('manor');
    this.scarn = new Scarn(this, this.rig('scarn', 380, 560), 380, 560);
    this.scarn.setMode('explore');
    this.samuel = new Samuel(this, 470, 600);
    this.samuel.following = false;
    this.samuel.rig.setFacing(-1);
    this.cameras.main.startFollow(this.scarn.rig, true, 0.09, 0.09, 0, 60);
    this.objective('Answer the President (the laptop on the side table)');
    const once = (x: number, y: number, label: string, fn: () => Promise<void>) => this.interact({ x, y, r: 110, label, once: true, onUse: fn });
    once(620, 440, 'Admire portrait', () => this.say(L.portrait));
    once(880, 440, 'Inspect trophies', () => this.say(L.trophies));
    once(560, 450, 'Warm hands by the fire', () => this.say(L.fire));
    once(190, 560, 'Pick up the mug', async () => {
      this.scarn.rig.gesture('oneArmUp', 900);
      await this.say(L.mug);
    });
    once(150, 560, 'Look at the photo', async () => {
      music.stinger('romance');
      const unsoft = this.softFocus();
      this.sepia(true);
      await this.say(L.photo);
      this.sepia(false);
      unsoft();
    });
    once(860, 620, 'Sit on couch', () => this.say(L.couch));
    const beet = this.prop('beet', 1330, 640);
    once(1330, 650, 'A beet?', async () => {
      beet.destroy();
      sfx('sparkle');
      findBeet('ch02');
      await this.say(L.beet);
    });
    this.interact({ x: this.samuel.x, y: this.samuel.y, r: 90, label: 'Talk to Samuel', onUse: () => this.say(L.samuelTalk) });
    let answered = false;
    this.interact({
      x: 1160,
      y: 540,
      r: 120,
      label: 'Answer the laptop',
      once: true,
      onUse: async () => {
        answered = true;
      },
    });
    // the laptop rings until answered
    const ring = this.time.addEvent({ delay: 2600, loop: true, callback: () => sfx('phone_ring', 0.5) });
    await this.waitUntil(() => answered);
    ring.remove();
  }

  private async call(): Promise<void> {
    this.buildManor();
    music.play('suspense', { fade: 1 });
    if (!this.scarn || !this.scarn.rig.active) {
      this.scarn = new Scarn(this, this.rig('scarn', 1080, 560), 1080, 560);
      this.samuel = new Samuel(this, 900, 610);
      this.samuel.following = false;
    }
    this.scarn.setMode('locked');
    await walkActor(this, this.scarn, 1090, 560, 220);
    this.scarn.rig.setFacing(1);
    this.cameras.main.stopFollow();
    await this.panTo(900, 360, 500);
    this.letterbox(true);
    const call = openCall(this, 'president', { x: 690, y: 90, w: 540, h: 300 });
    this.speaker('president', call.rig);
    this.speaker('president_tv', call.rig);
    await this.say(L.p1);
    const c1 = await this.choose(null, [
      { label: '"I\'m retired. I sell paper now."', line: L.c1a },
      { label: '"Is this about the missing staplers?"', line: L.c1b },
      { label: '[Turn around in chair. Dramatically.]', line: L.c1c },
    ]);
    if (c1 === 0) await this.say(L.p1a);
    if (c1 === 1) await this.say(L.p1b);
    if (c1 === 2) {
      this.scarn.rig.spin = 0;
      await this.tweenP({ targets: this.scarn.rig, spin: 360, duration: 900, ease: 'Cubic.easeInOut' });
      this.scarn.rig.spin = 0;
      await this.say(L.p1c);
      await this.say(L.m1c);
    }
    await this.say(L.p2);
    this.scarn.rig.setExpression('shock');
    await this.say(L.p3);
    this.scarn.rig.setExpression('idle');
    const c2 = await this.choose(null, [
      { label: '"Goldenface. The man who took my wife."', line: L.c2a },
      { label: '"Not the hot dog guys!"', line: L.c2b },
      { label: '"Why would anyone attack hockey?"', line: L.c2c },
    ]);
    await this.say([L.p2a, L.p2b, L.p2c][c2]);
    await this.say(L.p4);
    await this.say(L.m5);
    await this.say(L.m6);

    // coin flip: best two out of three, or three out of five, or...
    call.hide(true);
    let heads = 0;
    let attempt = 0;
    while (heads < 1) {
      const r = await coinFlip(this, attempt);
      addStat('coinFlips', 1);
      if (r === 'heads') {
        heads++;
        await this.say(L.heads);
      } else if (r === 'edge') {
        heads++;
        await this.say(L.edge);
      } else if (r === 'dropped') {
        await this.say(L.dropped);
        await this.say(L.s5);
        heads++;
      } else {
        unlockAchievement('best_of_three');
        await this.say(attempt === 0 ? L.tails : L.tails2);
      }
      attempt++;
    }
    call.hide(false);
    this.scarn.rig.gesture('heroic', 1200);
    await this.say(L.m7);
    await this.say(L.p5);
    await this.say(L.m8);
    await this.crashZoom(this.scarn.x, this.scarn.y - 100, 1.5);
    await this.say(L.p6);
    music.stinger('dun');
    await this.zoomTo(1, 300);
    call.close();
    this.scarn.rig.strike('fingerguns');
    this.lensFlare(900, 160);
    await this.say(L.m9);
    await this.missionCard('SAVE THE NHL ALL-STAR GAME', 'Hostages: concession stand workers (incl. the nacho lady). Threat level: MIDNIGHT.');
    this.letterbox(false);
  }
}
