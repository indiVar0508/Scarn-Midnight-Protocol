import Phaser from 'phaser';
import { ChapterScene, type Beat } from '../systems/ChapterScene';
import { World } from '../systems/World';
import { Combat } from '../systems/Combat';
import { Scarn } from '../entities/Scarn';
import { runEncounter } from '../systems/Encounter';
import { walkActor } from '../systems/Moves';
import { paintMarket } from '../art/backgrounds';
import { paintNewspaper, type Paper } from '../art/newspaper';
import { registerCanvas } from '../art/props';
import { CH01 as L } from '../../data/script/ch01';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { Director } from '../Director';
import { findBeet } from '../../state/save';
import { ctl } from '../systems/controlsText';
import type { Rig } from '../entities/Rig';

const W = 2400;

export class Ch01 extends ChapterScene {
  readonly chapter = 1;
  scarn!: Scarn;
  combat!: Combat;
  cashier!: Rig;

  constructor() {
    super('Ch01');
  }

  beats(): Beat[] {
    return [
      { id: 'shop', run: () => this.shop() },
      { id: 'fight1', run: () => this.fight1() },
      { id: 'fight2', run: () => this.fight2() },
      { id: 'cleanup', run: () => this.cleanupAisle() },
      { id: 'history', run: () => this.history() },
    ];
  }

  private build(scarnX = 180): void {
    this.useSet('market', () => {
      this.world = new World(W, 392, 690);
      this.background('bg_market', () => paintMarket(W));
      // back shelves (decor) + aisle shelf islands (obstacles)
      for (let x = 140; x < W - 300; x += 250) if (x < 1180 || x > 1480) this.prop('shelf', x, 388, 0.9);
      this.prop('aislesign', 1400, 250).setDepth(-5);
      this.prop('shelf', 700, 540, 0.8);
      this.world.addWall(610, 520, 180, 34);
      this.prop('shelf', 1900, 560, 0.8);
      this.world.addWall(1810, 540, 180, 34);
      this.prop('pallet', 1100, 640);
      this.world.addWall(1045, 612, 110, 34);
      this.prop('forklift', 420, 610);
      this.world.addWall(360, 580, 130, 36);
      this.prop('cart', 1540, 470);
      this.prop('register', 2210, 470);
      this.world.addWall(2140, 440, 150, 36);
      this.prop('boxstack', 2360, 420);
      this.cashier = this.rig('cashier', 2250, 452, -1);
      this.speaker('cashier', this.cashier);

      this.combat = new Combat(this);
      this.scarn = new Scarn(this, this.rig('scarn', scarnX, 560), scarnX, 560);
      this.scarn.combat = this.combat;
      this.cameras.main.setBounds(0, 0, W, 720);
      this.cameras.main.startFollow(this.scarn.rig, true, 0.09, 0.09, 0, 60);
    });
  }

  private async shop(): Promise<void> {
    this.build(-60);
    music.play('spy', { fade: 1 });
    this.scarn.setMode('locked');
    this.letterbox(true);
    await walkActor(this, this.scarn, 220, 560, 170);
    await this.say(L.open);
    this.scarn.rig.gesture('heroic', 900);
    await this.say(L.open2);
    this.letterbox(false);
    this.scarn.setMode('explore');
    this.objective(`Find the hair gel in AISLE 5 (${ctl('move')})`);

    this.interact({ x: 300, y: 430, r: 110, label: 'Inspect "FOOD"', once: true, onUse: () => this.say(L.paper) });
    this.interact({
      x: 430,
      y: 620,
      r: 120,
      label: 'Inspect forklift',
      once: true,
      onUse: async () => {
        await this.say(L.forklift);
        this.achieve('twss');
        await this.say(L.forklift2);
      },
    });
    this.interact({ x: 1560, y: 430, r: 110, label: 'Read sign', once: true, onUse: () => this.say(L.sign) });
    this.interact({ x: 1540, y: 500, r: 90, label: 'Inspect cart', once: true, onUse: () => this.say(L.cart) });
    const beet = this.prop('beet', 1170, 600);
    this.interact({
      x: 1170,
      y: 620,
      r: 80,
      label: 'Is that... a beet?',
      once: true,
      onUse: async () => {
        beet.destroy();
        sfx('sparkle');
        findBeet('ch01');
        await this.say(L.beet);
      },
    });
    this.prop('sidetable', 1400, 420);
    const gel = this.prop('hairgel', 1400, 390).setDepth(421);
    let got = false;
    this.interact({
      x: 1400,
      y: 420,
      r: 120,
      label: 'Take hair gel',
      once: true,
      onUse: async () => {
        await this.say(L.aisle);
        gel.destroy();
        sfx('sparkle');
        this.scarn.rig.gesture('oneArmUp', 1000);
        await this.say(L.gel);
        got = true;
      },
    });
    await this.waitUntil(() => got);
  }

  private async fight1(): Promise<void> {
    this.build(1400);
    this.scarn.place(Math.max(this.scarn.x, 900), this.scarn.y);
    this.scarn.setMode('locked');
    sfx('door');
    this.shake(200, 0.006);
    const g1 = this.rig('goon', 1340, 395, -1);
    const g2 = this.rig('goon', 1440, 395, -1);
    this.speaker('goon', g1);
    this.speaker('goon2', g2);
    this.letterbox(true);
    await this.crashZoom(1390, 330, 1.35);
    await this.say(L.goon1);
    await this.zoomTo(1, 250);
    this.cameras.main.startFollow(this.scarn.rig, true, 0.09, 0.09, 0, 60);
    this.scarn.rig.setFacing(1);
    this.scarn.rig.gesture('fingerguns', 1200);
    await this.say(L.scarn1);
    await this.say(L.goon2);
    await this.say(L.scarn2);
    g1.destroy();
    g2.destroy();
    this.letterbox(false);
    music.play('action', { fade: 0.3 });
    this.scarn.setMode('combat', this.combat);
    this.objective(`AIM with ${ctl('aim')} · SHOOT with ${ctl('fire')}`);
    let barked = 0;
    this.combat.onKill = () => {
      barked++;
      if (barked === 1) this.bark(L.bark1);
      if (barked === 3) this.bark(L.bark4);
    };
    await runEncounter(this, this.scarn, this.combat, [
      {
        goons: [
          { x: 1340, y: 395, enterTo: { x: 1300, y: 470 }, hp: 1, burst: 1 },
          { x: 1440, y: 395, enterTo: { x: 1520, y: 500 }, hp: 1, burst: 1 },
          { x: W + 40, y: 600, enterTo: { x: 1750, y: 600 }, hp: 2, burst: 1 },
        ],
      },
    ]);
  }

  private async fight2(): Promise<void> {
    this.build(1400);
    this.scarn.setMode('combat', this.combat);
    music.play('action');
    this.bark(L.more);
    await this.wait(900);
    this.bark(L.scarn3);
    this.objective(`DODGE ROLL with ${ctl('dodge')} (invincible mid-roll) · DRAMATIC POSE with ${ctl('pose')}`);
    let n = 0;
    this.combat.onKill = () => {
      n++;
      if (n === 2) this.bark(L.bark2);
    };
    await runEncounter(this, this.scarn, this.combat, [
      {
        goons: [
          { x: -40, y: 620, enterTo: { x: 700, y: 640 }, hp: 2, burst: 2 },
          { x: W + 40, y: 470, enterTo: { x: 1800, y: 460 }, hp: 2, burst: 2 },
        ],
      },
      {
        delay: 400,
        onStart: () => this.bark(L.bark3),
        goons: [
          { x: 1340, y: 395, enterTo: { x: 1250, y: 520 }, hp: 2, burst: 1, aggression: 1.2 },
          { x: 1440, y: 395, enterTo: { x: 1560, y: 560 }, hp: 2, burst: 2 },
          { x: W + 40, y: 650, enterTo: { x: 2000, y: 650 }, hp: 3, burst: 3, aggression: 0.9 },
        ],
      },
    ]);
    this.objective(null);
  }

  private async cleanupAisle(): Promise<void> {
    this.build(1900);
    this.scarn.setMode('explore');
    this.scarn.heal();
    music.play('spy', { fade: 1.5 });
    this.objective('Pay for the hair gel');
    let paid = false;
    this.interact({
      x: 2150,
      y: 500,
      r: 150,
      label: 'Pay',
      once: true,
      onUse: async () => {
        this.scarn.setMode('locked');
        await walkActor(this, this.scarn, 2120, 520, 200);
        this.scarn.rig.setFacing(1);
        await this.say(L.cashier1);
        await this.say(L.scarn4);
        await this.say(L.cashier2);
        this.letterbox(true);
        await this.crashZoom(this.scarn.x + 20, this.scarn.y - 110, 1.5);
        this.scarn.rig.strike('dramaticTurn');
        await this.say(L.scarn5);
        // ...and the store PA steals his line.
        this.scarn.rig.setFacing(-1);
        sfx('beep_bad');
        await this.say(L.scarn6);
        await this.zoomTo(1, 200);
        this.scarn.rig.setExpression('shock');
        this.scarn.rig.gesture('point', 900);
        await this.say(L.scarn7);
        this.scarn.rig.setExpression('idle');
        this.scarn.rig.strike('heroic');
        this.lensFlare(700, 180);
        await this.freezeFrame('SCARN.', 1400);
        paid = true;
      },
    });
    await this.waitUntil(() => paid);
  }

  private async history(): Promise<void> {
    this.clearSet();
    this.setName = 'history';
    music.stop(0.3);
    Director.overlay?.blackout(true);
    await Director.overlay?.titleSlam();
    this.guard(); // the chapter may have been stopped while the overlay played
    Director.overlay?.blackout(false);
    music.play('spy', { fade: 0.5 });
    const papers: [Paper, typeof L.n1 | null][] = [
      [{ headline: 'SCARN SAVES NFL ALL-STAR GAME', sub: "Quarterback asks: 'Who was that handsome man?'", photo: 'scarn', date: 'SUNDAY, FEBRUARY 2' }, L.n1],
      [{ headline: 'SCARN SAVES MBA ALL-STAR GAME', sub: 'Business students "mostly fine," networking resumes', photo: 'mba', date: 'TUESDAY, MARCH 11' }, L.n2],
      [{ headline: 'SCARN SAVES NBA ALL-STAR GAME', sub: 'Also finds a very large lost sneaker', photo: 'stadium', date: 'SATURDAY, APRIL 5' }, null],
      [{ headline: "SPY'S WIFE TAKEN BY GOLDENFACE", sub: 'Catherine Zeta-Scarn remembered as "perfect, a great dancer"', photo: 'catherine', date: 'FRIDAY, JUNE 13' }, L.n3],
      [{ headline: "SCARN RETIRES: 'I WILL SELL PAPER NOW'", sub: "World's best agent becomes a mild-mannered paper salesman", photo: 'paper', date: 'MONDAY, JULY 21' }, L.n4],
    ];
    const cam = this.cameras.main;
    cam.setBackgroundColor('#1a1410');
    const bg = this.add.rectangle(0, 0, 1280, 720, 0x1a1410).setOrigin(0).setScrollFactor(0);
    bg.setDepth(-1);
    let prev: Phaser.GameObjects.Image | null = null;
    for (let i = 0; i < papers.length; i++) {
      const [p, line] = papers[i];
      const key = `news_${i}`;
      if (!this.textures.exists(key)) registerCanvas(this, key, paintNewspaper(p, i + 3));
      // sits above the narration box so the small-print gags stay readable
      const im = this.add.image(640, 288, key).setScrollFactor(0).setScale(0.05).setRotation(Math.PI * 6).setDepth(i);
      sfx('whoosh');
      if (p.photo === 'catherine') {
        music.play('sad', { fade: 1 });
      }
      await this.tweenP({ targets: im, scale: 0.8, rotation: (Math.random() - 0.5) * 0.12, duration: 700, ease: 'Cubic.easeOut' });
      sfx('slam');
      this.shake(120, 0.004);
      if (p.photo === 'catherine') {
        const unsoft = this.softFocus();
        if (line) await this.say(line);
        unsoft();
      } else if (line) await this.say(line);
      else await this.wait(1300);
      prev?.destroy();
      prev = im;
    }
    await this.wait(400);
    await Director.overlay?.fade(true, 700);
    this.guard(); // the chapter may have been stopped while the overlay played
    Director.overlay?.blackout(false);
  }
}

