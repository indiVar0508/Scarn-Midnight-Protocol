import Phaser from 'phaser';
import { ChapterScene, type Beat } from '../systems/ChapterScene';
import { World } from '../systems/World';
import { Combat } from '../systems/Combat';
import { Scarn } from '../entities/Scarn';
import { Samuel } from '../entities/Samuel';
import { Goon } from '../entities/Goon';
import { wireRetake } from '../systems/Encounter';
import { walkActor, walkRig } from '../systems/Moves';
import { paintHallway, paintOval, paintStreet } from '../art/backgrounds';
import { ensureProp } from '../art/props';
import { R } from '../art/characters';
import { CH08 as L } from '../../data/script/ch08';
import { music } from '../../audio/music';
import { sfx, ambience } from '../../audio/sfx';
import { qa } from '../systems/qa';
import { ctl } from '../systems/controlsText';
import { Director } from '../Director';
import type { Rig } from '../entities/Rig';

const OW = 1600;
const HW = 4000;
const SW = 1800;

export class Ch08 extends ChapterScene {
  readonly chapter = 8;
  scarn!: Scarn;
  samuel!: Samuel;
  president!: Rig;

  constructor() {
    super('Ch08');
  }

  beats(): Beat[] {
    return [
      { id: 'oval', run: () => this.oval() },
      { id: 'escape', run: () => this.escape() },
      { id: 'rain', run: () => this.rain() },
    ];
  }

  private async oval(): Promise<void> {
    this.useSet('oval', () => {
      this.world = new World(OW, 410, 690);
      this.background('bg_oval', () => paintOval(OW));
      this.prop('flag', 640, 440);
      this.prop('seal', 900, 200, 0.9).setRotation(0.14).setDepth(-5);
      this.prop('desk', 900, 520);
      this.world.addWall(790, 470, 220, 50);
      this.prop('stapler', 820, 426).setDepth(521);
      this.prop('trophy', 990, 440).setDepth(521).setScale(0.35);
      this.prop('filing', 1300, 420);
      this.world.addWall(1265, 400, 70, 25);
      this.prop('confchair', 500, 600);
      this.prop('confchair', 1150, 640);
      this.cameras.main.setBounds(0, 0, OW, 720);
      this.president = this.rig('president', 900, 470, -1);
      this.speaker('president', this.president);
      this.scarn = new Scarn(this, this.rig('scarn', 150, 600), 150, 600);
      this.samuel = new Samuel(this, 80, 620);
      this.samuel.leader = this.scarn;
      this.cameras.main.startFollow(this.scarn.rig, true, 0.09, 0.09, 0, 60);
    });
    music.play('suspense', { fade: 1 });
    this.scarn.setMode('explore');
    this.objective('Warn the President (talk to him). Maybe look around first.');
    const once = (x: number, y: number, label: string, fn: () => Promise<void>) => this.interact({ x, y, r: 100, label, once: true, onUse: fn });
    once(930, 540, 'Read papers on the desk', () => this.say(L.desk));
    once(990, 520, 'Inspect gold trophy', () => this.say(L.trophy));
    once(900, 430, 'Look at the seal', () => this.say(L.seal));
    once(640, 470, 'Salute the flag', async () => {
      this.scarn.rig.strike('salute');
      await this.say(L.flag);
      this.scarn.rig.setAnim('idle');
    });
    once(820, 520, 'Touch the red hotline', () => this.say(L.stapler));
    let talk = false;
    this.interact({ x: 760, y: 500, r: 140, label: 'Warn the President', once: true, onUse: async () => void (talk = true) });
    await this.waitUntil(() => talk);
    this.scarn.setMode('locked');
    await walkActor(this, this.scarn, 700, 520, 200);
    this.scarn.rig.setFacing(1);
    this.letterbox(true);
    await this.say(L.p1);
    await this.say(L.m1);
    this.president.setExpression('shock');
    await this.say(L.p2);
    await this.say(L.m2);
    this.president.setExpression('idle');
    // shifty eyes
    this.president.setFacing(1);
    await this.wait(250);
    this.president.setFacing(-1);
    await this.say(L.p3);
    await this.choose(null, [
      { label: '"Just me and Samuel."', line: L.c1 },
      { label: '"Everyone. I made a PowerPoint."', line: L.c2 },
      { label: '"I told the Scranton Times."', line: L.c3 },
    ]);
    await this.say(L.p4);
    // reveal
    const gf = this.rig('goldenface', 1300, 470, -1);
    this.speaker('goldenface', gf);
    gf.setAlpha(0);
    sfx('door');
    await this.tweenP({ targets: gf, alpha: 1, duration: 400 });
    await walkRig(this, gf, 1150, 520, 160);
    music.stinger('dun');
    await this.crashZoom(gf.x, gf.y - 110, 1.5);
    await this.say(L.gf1);
    await this.zoomTo(1, 200);
    this.cameras.main.startFollow(this.scarn.rig, true, 0.09, 0.09, 0, 60);
    this.scarn.rig.strike('point');
    await this.say(L.m3);
    await walkRig(this, this.president, 1080, 520, 140);
    this.president.setFacing(-1);
    this.scarn.rig.setExpression('shock');
    await this.say(L.m4);
    await this.say(L.p5);
    gf.strike('victory');
    await this.say(L.gf2);
    await this.say(L.p6);
    this.scarn.rig.setExpression('idle');
    await this.say(L.m5);
    this.president.strike('point');
    await this.say(L.p7);
    await this.say(L.s1);
    this.letterbox(false);
  }

  private async escape(): Promise<void> {
    this.useSet('hallway', () => {
      this.world = new World(HW, 430, 690);
      this.background('bg_hallway', () => paintHallway(HW));
      this.cameras.main.setBounds(0, 0, HW, 720);
      this.scarn = new Scarn(this, this.rig('scarn', 200, 560), 200, 560);
      this.samuel = new Samuel(this, 110, 580);
      this.samuel.leader = this.scarn;
      this.samuel.speed = 400;
      this.cameras.main.startFollow(this.scarn.rig, true, 0.12, 0.09, -300, 60);
      this.prop('window', HW - 120, 250).setDepth(-5);
    });
    music.play('action', { fade: 0.2 });
    const combat = new Combat(this);
    this.scarn.setMode('combat', combat);
    wireRetake(this, this.scarn);
    this.objective(`ESCAPE! Steer UP/DOWN · ROLL through obstacles (${ctl('dodge')}) · SHOOT (${ctl('fire')})`);
    ['officechair', 'crate', 'plant'].forEach((k) => ensureProp(this, k));
    let parkoured = false;
    const obstacles: { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; hit: boolean }[] = [];
    let spawnT = 1;
    let goonT = 2.5;
    const runSpeed = 330;
    let barked = false;
    const god = () => {
      if (qa.god) {
        this.scarn.hp = this.scarn.maxHp;
        this.scarn.invuln = 1;
      }
    };
    this.updaters.add(god);
    this.scarn.autoRun = runSpeed;
    await this.frameLoop((dt, done) => {
      if (this.busy) return;
      spawnT -= dt;
      if (spawnT <= 0 && this.scarn.x < HW - 700) {
        spawnT = 0.9 + Math.random() * 0.9;
        const kind = ['officechair', 'crate', 'plant'][Math.floor(Math.random() * 3)];
        const y = 450 + Math.random() * 220;
        const x = this.scarn.x + 900;
        const img = this.add.image(x, y, kind).setScale((kind === 'crate' ? 0.8 : 1) / R).setOrigin(0.5, 1).setDepth(y);
        obstacles.push({ img, x, y, vx: kind === 'officechair' ? -160 : 0, vy: kind === 'officechair' ? (Math.random() - 0.5) * 120 : 0, hit: false });
      }
      goonT -= dt;
      if (goonT <= 0 && this.scarn.x < HW - 900) {
        goonT = 2.4 + Math.random() * 1.5;
        const g = new Goon(this, combat, this.scarn, this.scarn.x + 760, 440, { skin: 'secret', hp: 1, enterTo: { x: this.scarn.x + 700, y: 470 + Math.random() * 180 }, burst: 1 });
        g.prefer = 500;
        if (!barked) {
          barked = true;
          this.bark(L.bark1);
        }
      }
      for (const o of obstacles) {
        o.x += o.vx * dt;
        o.y = Phaser.Math.Clamp(o.y + o.vy * dt, 440, 690);
        o.img.setPosition(o.x, o.y).setDepth(o.y);
        if (!o.hit && Math.abs(o.x - this.scarn.x) < 40 && Math.abs(o.y - this.scarn.y) < 34) {
          if (this.scarn.dodgeT > 0) {
            o.hit = true;
            sfx('whoosh');
            if (!parkoured) {
              parkoured = true;
              this.bark(L.parkour);
              this.time.delayedCall(1600, () => this.bark(L.parkour2));
            }
          } else if (this.scarn.damage(1, -1, 0)) {
            o.hit = true;
            this.tweens.add({ targets: o.img, angle: 90, alpha: 0.4, duration: 300 });
          }
        }
      }
      if (this.scarn.x > HW - 260) done();
    });
    this.updaters.delete(god);
    this.scarn.autoRun = null;
    combat.clearBullets();
    combat.enemies().forEach((e) => e.damage(99, 1, 0));
    this.scarn.setMode('locked');
    this.scarn.vx = 0;
    this.letterbox(true);
    await this.say(L.dive);
    await this.say(L.s2);
    await this.say(L.m6);
    // slow motion dive through the (ground floor) window
    sfx('whoosh');
    this.grayscale(true);
    this.scarn.rig.strike('lieFront');
    await this.tweenP({ targets: this.scarn.rig, x: HW + 80, y: 440, duration: 1600, ease: 'Sine.easeOut' });
    sfx('small_boom');
    this.grayscale(false);
    await Director.overlay?.fade(true, 500);
    this.guard(); // the chapter may have been stopped while the overlay played
    Director.overlay?.blackout(false);
  }

  private async rain(): Promise<void> {
    this.useSet('street', () => {
      this.world = new World(SW, 430, 690);
      this.background('bg_street', () => paintStreet(SW));
      this.cameras.main.setBounds(0, 0, SW, 720);
      this.scarn = new Scarn(this, this.rig('scarn', 120, 600), 120, 600);
      this.samuel = new Samuel(this, 40, 620);
      this.samuel.leader = this.scarn;
      this.cameras.main.startFollow(this.scarn.rig, true, 0.06, 0.06, 0, 60);
    });
    music.play('sad', { fade: 1.5 });
    const stop = ambience('rain', 1);
    this.events.once('shutdown', stop);
    ensureProp(this, 'raindrop');
    ensureProp(this, 'wateringcan');
    // the rain is a watering can held just out of frame. Mostly out of frame.
    const can = this.add.image(640, -6, 'wateringcan').setOrigin(0.5, 0).setScrollFactor(0).setDepth(9500).setScale(1.2 / R);
    this.tweens.add({ targets: can, x: 700, angle: 4, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add
      .particles(0, 0, 'raindrop', {
        x: { min: 0, max: 1280 },
        y: -20,
        speedY: { min: 700, max: 900 },
        speedX: -60,
        lifespan: 1000,
        scale: 1 / R,
        alpha: 0.7,
        frequency: 12,
        quantity: 2,
      })
      .setScrollFactor(0)
      .setDepth(9400);
    this.scarn.setMode('explore');
    this.scarn.speed = 110;
    this.scarn.canPose = false;
    this.objective('Walk. Just walk.');
    const said = new Set<number>();
    const beats: [number, () => Promise<void>][] = [
      [400, () => this.say(L.r1)],
      [700, () => this.sayAll([L.r2, L.r3])],
      [1050, () => this.sayAll([L.r4, L.r5])],
      [1400, () => this.say(L.r6)],
    ];
    await this.waitUntil(() => {
      beats.forEach(([x, fn], i) => {
        if (this.scarn.x > x && !said.has(i) && !this.busy) {
          said.add(i);
          this.busy = true;
          fn().finally(() => (this.busy = false));
        }
      });
      return said.size === beats.length && !this.busy && this.scarn.x > 1550;
    });
    this.scarn.setMode('locked');
    this.letterbox(true);
    await this.freezeFrame("BILLY'S.", 1300);
  }
}

