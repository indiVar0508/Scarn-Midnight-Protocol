import Phaser from 'phaser';
import { ChapterScene, type Beat } from '../systems/ChapterScene';
import { World } from '../systems/World';
import { Combat } from '../systems/Combat';
import { Scarn } from '../entities/Scarn';
import { Samuel } from '../entities/Samuel';
import { runEncounter } from '../systems/Encounter';
import { walkActor, walkRig } from '../systems/Moves';
import { paintClub, paintKitchen, paintManor } from '../art/backgrounds';
import { ensureProp } from '../art/props';
import { R } from '../art/characters';
import { CH05 as L } from '../../data/script/ch05';
import { music } from '../../audio/music';
import { sfx, ambience } from '../../audio/sfx';
import { voice } from '../../audio/voice';
import { findBeet } from '../../state/save';
import { openTape, SECRET_LINE, autoSolve, tape } from '../../state/tape';
import { qa } from '../systems/qa';
import { Director } from '../Director';
import type { Rig } from '../entities/Rig';

const CW = 2000;
const KW = 2200;

export class Ch05 extends ChapterScene {
  readonly chapter = 5;
  scarn!: Scarn;
  samuel!: Samuel;
  jasmine!: Rig;
  combat!: Combat;
  private stopAmb: (() => void) | null = null;

  constructor() {
    super('Ch05');
  }

  beats(): Beat[] {
    return [
      { id: 'fax', run: () => this.fax() },
      { id: 'door', run: () => this.door() },
      { id: 'club', run: () => this.club() },
      { id: 'song', run: () => this.song() },
      { id: 'dart', run: () => this.dart() },
      { id: 'escape', run: () => this.escape() },
    ];
  }

  private async fax(): Promise<void> {
    this.useSet('manor-night', () => {
      this.world = new World(1600, 400, 690);
      this.background('bg_manor_night', () => paintManor(1600, true));
      this.prop('portrait', 620, 250).setDepth(-5);
      this.prop('fireplaceTV', 620, 404);
      this.prop('sidetable', 1000, 540);
      this.prop('fax', 1000, 480).setDepth(541);
      this.cameras.main.setScroll(300, 0);
    });
    music.play('suspense', { fade: 1 });
    const sam = this.rig('samuel', 1080, 560, -1);
    const sc = this.rig('scarn', 820, 580, 1);
    this.speaker('samuel', sam);
    this.speaker('scarn', sc);
    this.letterbox(true);
    sfx('fax', 0.3);
    await this.wait(1400);
    // the fax prints a single, dramatic page
    const page = this.add.rectangle(1000, 470, 40, 6, 0xffffff).setDepth(600).setStrokeStyle(1, 0x999999);
    await this.tweenP({ targets: page, height: 60, y: 440, duration: 1100 });
    await this.say(L.s1);
    await this.say(L.m1);
    await this.say(L.s2);
    await this.crashZoom(1000, 440, 1.6);
    await this.say(L.s3);
    await this.zoomTo(1, 250);
    await this.say(L.m2);
    await this.say(L.s4);
    sc.strike('dramaticTurn');
    await this.say(L.m3);
    await this.say(L.s5);
    await this.say(L.m4);
    this.letterbox(false);
  }

  private buildClub(): void {
    this.useSet('club', () => {
      this.world = new World(CW, 410, 690);
      this.background('bg_club', () => paintClub(CW));
      this.prop('vending', 470, 404);
      this.world.addWall(420, 385, 100, 25);
      this.prop('discoball', 1100, 150).setDepth(-3);
      this.prop('piano', 1560, 460);
      this.world.addWall(1470, 420, 190, 40);
      this.prop('micstand', 1760, 470);
      for (const [x, y] of [[640, 520], [860, 620], [1080, 520], [1280, 630], [760, 660]]) {
        this.prop('cafetable', x, y);
        this.world.addWall(x - 34, y - 14, 68, 18);
        this.prop('stool', x - 50, y + 10);
        this.prop('stool', x + 50, y + 10);
      }
      this.prop('rope', 260, 470);
      this.stopAmb?.();
      this.stopAmb = ambience('bar', 0.8);
      this.events.once('shutdown', () => this.stopAmb?.());
      this.cameras.main.setBounds(0, 0, CW, 720);
    });
  }

  private spawnPlayer(x: number, y: number): void {
    this.scarn = new Scarn(this, this.rig('scarn', x, y), x, y);
    this.samuel = new Samuel(this, x - 80, y + 10);
    this.samuel.leader = this.scarn;
    this.cameras.main.startFollow(this.scarn.rig, true, 0.09, 0.09, 0, 60);
  }

  private async door(): Promise<void> {
    this.buildClub();
    music.play('jazz', { fade: 1 });
    this.spawnPlayer(90, 560);
    this.scarn.setMode('locked');
    const bouncer = this.rig('bouncer', 330, 520, -1);
    this.speaker('bouncer', bouncer);
    this.world.addWall(300, 470, 60, 220); // the bouncer blocks the way
    await walkActor(this, this.scarn, 240, 540, 180);
    await this.say(L.b1);
    for (;;) {
      const i = await this.choose(null, [
        { label: '"Bears."', line: L.pw1 },
        { label: '"Beets."', line: L.pw2 },
        { label: '"Battlestar Galactica."', line: L.pw3 },
      ]);
      if (i === 1) break;
      await this.say(L.bNo);
    }
    await this.say(L.bYes);
    this.world.walls.pop();
    await walkRig(this, bouncer, 330, 440, 120);
    bouncer.setFacing(1);
  }

  private async club(): Promise<void> {
    this.buildClub();
    music.play('jazz');
    if (!this.scarn?.rig.active) this.spawnPlayer(420, 560);
    this.scarn.setMode('explore');
    const bartender = this.rig('patron2', 560, 450, -1);
    this.speaker('bartender', bartender);
    const patron = this.rig('patron', 1080 + 40, 560, -1);
    patron.setAnim('pose', 'sit');
    this.speaker('patron', patron);
    const patron2 = this.rig('bar3', 860 - 50, 632, 1).setAnim('pose', 'sit');
    void patron2;
    this.objective('Find out what Jasmine knows. Look around. Talk to people.');
    let hasRec = false;
    let seated = false;
    this.interact({
      x: 560,
      y: 480,
      r: 110,
      label: 'Talk to the bartender',
      once: true,
      onUse: async () => {
        await this.say(L.bt1);
        await this.say(L.bt2);
        ensureProp(this, 'dictaphone');
        sfx('sparkle');
        hasRec = true;
        this.objective('Take the front-row table near the stage');
      },
    });
    this.interact({ x: 470, y: 440, r: 90, label: 'Order a drink', once: true, onUse: () => this.say(L.vend) });
    const napkin = this.prop('napkin', 860, 598).setDepth(621);
    this.interact({
      x: 860,
      y: 640,
      r: 90,
      label: 'Read napkin',
      once: true,
      onUse: async () => {
        napkin.destroy();
        await this.say(L.napkin);
      },
    });
    this.prop('setlist', 1450, 330).setDepth(-2);
    this.interact({ x: 1440, y: 470, r: 100, label: 'Read the set list', once: true, onUse: () => this.say(L.setlist) });
    this.interact({
      x: 1120,
      y: 570,
      r: 90,
      label: 'Talk to the jazz patron',
      once: true,
      onUse: async () => {
        await this.say(L.p1);
        await this.say(L.m5);
        await this.say(L.p2);
      },
    });
    this.interact({ x: 1100, y: 440, r: 80, label: 'Look up at the disco ball', once: true, onUse: () => this.say(L.disco) });
    const beet = this.prop('beet', 640, 494).setDepth(521);
    this.interact({
      x: 640,
      y: 540,
      r: 80,
      label: 'A beet?',
      once: true,
      onUse: async () => {
        beet.destroy();
        sfx('sparkle');
        findBeet('ch05');
        await this.say(L.beet);
      },
    });
    this.interact({
      x: 1280,
      y: 660,
      r: 100,
      label: 'Take a seat',
      onUse: async () => {
        if (!hasRec) {
          await this.say(L.needRec);
          return;
        }
        await this.say(L.seat);
        seated = true;
      },
    });
    await this.waitUntil(() => seated);
  }

  private async song(): Promise<void> {
    this.buildClub();
    if (!this.scarn?.rig.active) this.spawnPlayer(1280, 670);
    this.scarn.setMode('locked');
    this.scarn.place(1300, 675);
    this.scarn.rig.setFacing(1);
    this.samuel.following = false;
    music.stop(0.8);
    this.cameras.main.stopFollow();
    await this.panTo(1560, 400, 900);
    this.letterbox(true);
    const spot = this.add.ellipse(1760, 480, 220, 60, 0xfff2c0, 0.25).setDepth(470).setBlendMode(Phaser.BlendModes.ADD);
    await this.say(L.intro);
    this.jasmine = this.rig('jasmine', 2050, 470, -1);
    this.speaker('jasmine', this.jasmine);
    this.jasmine.hold('mic', 0, 0, 0);
    await walkRig(this, this.jasmine, 1760, 474, 130);
    this.jasmine.setFacing(-1);
    this.jasmine.strike('sing');
    sfx('applause');
    await this.say(L.j1);
    music.play('jasmine', { fade: 0.5 });
    // Jasmine sings: the "gibberish" is her line recorded backwards.
    let singing = true;
    const loop = async () => {
      while (singing && !this.signal.aborted) {
        if (tape.get().playing) {
          this.jasmine.talking = false;
          await this.wait(300);
          continue;
        }
        this.jasmine.talking = true;
        await voice.play(SECRET_LINE);
        this.jasmine.talking = false;
        await this.wait(1400);
      }
    };
    void loop().catch(() => undefined);
    this.tweens.add({ targets: this.jasmine, angle: { from: -3, to: 3 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: spot, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });
    this.letterbox(false);
    this.objective('RECORD her song, then figure out what it really says');
    const done = openTape();
    if (qa.autoWin) window.setTimeout(() => autoSolve(), 1200);
    await done;
    singing = false;
    voice.stop();
    this.guard();
    this.objective(null);
    this.scarn.rig.strike('dramaticTurn');
    await this.say(L.solved);
    spot.destroy();
  }

  private async dart(): Promise<void> {
    this.buildClub();
    if (!this.scarn?.rig.active) this.spawnPlayer(1300, 675);
    this.scarn.setMode('locked');
    this.scarn.place(1300, 675);
    this.scarn.rig.setFacing(1);
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(1450, 420);
    if (!this.jasmine?.active) {
      this.jasmine = this.rig('jasmine', 1760, 474, -1);
      this.speaker('jasmine', this.jasmine);
    }
    music.play('suspense', { fade: 0.6 });
    this.letterbox(true);
    await walkRig(this, this.jasmine, 1420, 640, 150);
    this.jasmine.setFacing(-1);
    await this.say(L.j2);
    // thwip
    sfx('dart');
    ensureProp(this, 'zzz');
    this.jasmine.setExpression('shock');
    this.jasmine.strike('hurt');
    await this.wait(250);
    const fall = async () => {
      this.jasmine.setAnim('pose', 'hurt').setExpression('shock');
      this.jasmine.pose.rot = 0;
      this.jasmine.snap();
      this.jasmine.setAnim('down');
      sfx('slide_down');
      await this.wait(900);
    };
    this.scarn.rig.strike('kneel');
    this.scarn.rig.setExpression('shock');
    this.bark(L.m6);
    await fall();
    // the expensive shot, replayed from several angles
    for (const [label, zoom] of [
      ['INSTANT REPLAY', 1.3],
      ['REPLAY (ANGLE 2)', 1.7],
      ['REPLAY (SLOW-MO)', 2.1],
    ] as [string, number][]) {
      this.detach(this.card({ kind: 'stamp', title: label }, 1100));
      this.cameras.main.centerOn(this.jasmine.x + (zoom > 2 ? 0 : 60), this.jasmine.y - 80);
      this.cameras.main.setZoom(zoom);
      this.jasmine.setAnim('pose', 'stand');
      this.jasmine.snap();
      await this.wait(200);
      this.jasmine.stiffness = zoom > 2 ? 4 : 16;
      await fall();
    }
    this.jasmine.stiffness = 16;
    this.cameras.main.setZoom(1);
    const z = this.add.image(this.jasmine.x - 40, this.jasmine.y - 70, 'zzz').setScale(1 / R).setDepth(9000);
    this.tweens.add({ targets: z, y: z.y - 20, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });
    this.cameras.main.centerOn(1400, 420);
    const sam = this.rig('samuel', 1120, 640, 1);
    this.speaker('samuel', sam);
    await this.say(L.s6);
    this.scarn.rig.setAnim('pose', 'stand').setExpression('idle');
    await this.say(L.m7);
    const g = this.rig('goon', 1000, 440, 1);
    this.speaker('goon', g);
    sfx('door');
    await this.say(L.goon1);
    await this.say(L.m8);
    this.letterbox(false);
    await Director.overlay?.fade(true, 400);
    this.guard(); // the chapter may have been stopped while the overlay played
    Director.overlay?.blackout(false);
  }

  private async escape(): Promise<void> {
    this.stopAmb?.();
    this.useSet('kitchen', () => {
      this.world = new World(KW, 400, 690);
      this.background('bg_kitchen', () => paintKitchen(KW));
      this.prop('metaldoor', 2130, 404);
      this.prop('crate', 600, 560);
      this.world.addWall(565, 535, 70, 30);
      this.prop('crate', 1300, 640);
      this.world.addWall(1265, 615, 70, 30);
      this.prop('boxstack', 1700, 480);
      this.world.addWall(1665, 460, 70, 30);
      this.cameras.main.setBounds(0, 0, KW, 720);
      this.combat = new Combat(this);
      this.spawnPlayer(120, 560);
      this.samuel.following = true;
    });
    music.play('action', { fade: 0.3 });
    this.scarn.setMode('combat', this.combat);
    this.objective('Fight your way out through the kitchen');
    let k = 0;
    this.combat.onKill = () => {
      k++;
      if (k === 1) this.bark(L.bark1);
      if (k === 3) this.bark(L.bark2);
    };
    await runEncounter(this, this.scarn, this.combat, [
      {
        goons: [
          { x: -40, y: 600, enterTo: { x: 300, y: 620 }, hp: 2 },
          { x: 900, y: 420, enterTo: { x: 820, y: 480 }, hp: 2 },
          { x: 1100, y: 650, enterTo: { x: 950, y: 640 }, hp: 2, burst: 2 },
        ],
      },
      {
        delay: 300,
        goons: [
          { x: KW + 40, y: 460, enterTo: { x: 1600, y: 560 }, hp: 3, burst: 2 },
          { x: KW + 40, y: 640, enterTo: { x: 1800, y: 640 }, hp: 2, burst: 3, aggression: 1.2 },
        ],
      },
    ]);
    this.objective('Reach the EXIT');
    let out = false;
    this.interact({ x: 2120, y: 440, r: 140, label: 'Exit', once: true, onUse: async () => void (out = true) });
    await this.waitUntil(() => out);
    this.scarn.setMode('locked');
    music.play('spy', { fade: 1 });
    this.letterbox(true);
    await this.say(L.out1);
    this.scarn.rig.strike('heroic');
    await this.say(L.out2);
    await this.freezeFrame('UNDERGROUND.', 1300);
  }
}
