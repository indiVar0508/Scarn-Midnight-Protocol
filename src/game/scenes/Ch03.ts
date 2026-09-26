import { ChapterScene, type Beat } from '../systems/ChapterScene';
import { World } from '../systems/World';
import { Scarn } from '../entities/Scarn';
import { walkActor, walkRig } from '../systems/Moves';
import { paintLake, paintSkyline } from '../art/backgrounds';
import { registerCanvas } from '../art/props';
import { CH03 as L } from '../../data/script/ch03';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { setStat, getFlag, setFlag } from '../../state/save';
import { mopIce, stickHandle, targetShoot, obstacleSkate, reflexes } from '../minigames/Training';
import { stampResult, grade } from '../minigames/common';
import type { Rig } from '../entities/Rig';

const W = 2000;

export class Ch03 extends ChapterScene {
  readonly chapter = 3;
  scarn!: Scarn;
  jack!: Rig;

  constructor() {
    super('Ch03');
  }

  beats(): Beat[] {
    return [
      { id: 'drive', run: () => this.drive() },
      { id: 'jack', run: () => this.meetJack() },
      { id: 'training', run: () => this.training() },
    ];
  }

  private buildLake(): void {
    this.useSet('lake', () => {
      this.world = new World(1280, 400, 690, 40);
      this.background('bg_lake', () => paintLake(W));
      this.prop('cone', 180, 440);
      this.prop('tire', 1160, 430);
      this.jack = this.rig('jack', 1100, 470, -1);
      this.speaker('jack', this.jack);
      this.jack.flair = [{ aF: 150, eF: 30, head: -10 }, { lean: 20, aF: 60, eF: 40 }];
      this.scarn = new Scarn(this, this.rig('scarn', 520, 560), 520, 560);
      this.scarn.setMode('locked');
      this.cameras.main.setScroll(0, 0);
    });
  }

  private async drive(): Promise<void> {
    this.clearSet();
    this.setName = 'drive';
    music.play('montage', { fade: 0.4 });
    // Recycled establishing shots: the same skyline, three captions.
    if (!this.textures.exists('bg_skyline')) registerCanvas(this, 'bg_skyline', paintSkyline());
    const shot = this.add.image(0, 0, 'bg_skyline').setOrigin(0).setScrollFactor(0);
    const car = this.add.container(-300, 610).setScrollFactor(0);
    const body = this.add.rectangle(0, 0, 260, 70, 0x8a1a1a).setStrokeStyle(4, 0x1b1420);
    const roof = this.add.rectangle(10, -55, 150, 50, 0x6a1010).setStrokeStyle(4, 0x1b1420);
    const w1 = this.add.circle(-80, 38, 26, 0x111111).setStrokeStyle(4, 0x333333);
    const w2 = this.add.circle(80, 38, 26, 0x111111).setStrokeStyle(4, 0x333333);
    const lab = this.add.text(0, 2, 'CARDBOARD', { fontFamily: '"Permanent Marker", cursive', fontSize: '22px', color: '#fff' }).setOrigin(0.5);
    car.add([roof, body, w1, w2, lab]);
    const scarnHead = this.rig('scarn', 30, -40, 1, 0.55);
    scarnHead.setScrollFactor(0);
    car.addAt(scarnHead, 0);
    this.tweens.add({ targets: [w1, w2], angle: 360, duration: 500, repeat: -1 });
    this.tweens.add({ targets: car, y: 606, duration: 120, yoyo: true, repeat: -1 });
    const caps = [L.cap1, L.cap2, L.cap3];
    for (let i = 0; i < 3; i++) {
      if (i === 2) {
        if (!this.textures.exists('bg_lake')) registerCanvas(this, 'bg_lake', paintLake(W));
        shot.setTexture('bg_lake');
      }
      car.x = -300;
      this.tweens.add({ targets: car, x: 1500, duration: 2200, ease: 'Linear' });
      this.detach(this.card({ kind: 'stamp', title: caps[i].text.toUpperCase() }, 1700));
      sfx('whoosh');
      await this.wait(2100);
    }
    this.clearSet();
    this.buildLake();
    this.letterbox(true);
    const sam = this.rig('samuel', 380, 600, 1);
    this.speaker('samuel', sam);
    await this.say(L.d1);
    await this.say(L.d2);
    await this.say(L.d3);
    this.scarn.rig.strike('dramaticTurn');
    await this.crashZoom(this.scarn.x, this.scarn.y - 110, 1.45);
    await this.say(L.d4);
    await this.say(L.d5);
    await this.zoomTo(1, 250);
    this.letterbox(false);
    sam.destroy();
  }

  private async meetJack(): Promise<void> {
    this.buildLake();
    music.play('manor', { fade: 1 });
    this.jack.setPosition(1530, 470).setVisible(false);
    this.scarn.setMode('explore');
    this.world.maxX = 1900;
    this.cameras.main.setBounds(0, 0, W, 720);
    this.cameras.main.startFollow(this.scarn.rig, true, 0.09, 0.09);
    this.objective("Knock on Cherokee Jack's cabin door");
    let knocked = false;
    this.interact({ x: 1530, y: 420, r: 150, label: 'Knock', once: true, onUse: async () => void (knocked = true) });
    await this.waitUntil(() => knocked);
    this.scarn.setMode('locked');
    sfx('door');
    await this.say(L.door);
    this.jack.setVisible(true).setPosition(1530, 420);
    this.jack.setAlpha(0);
    this.tweens.add({ targets: this.jack, alpha: 1, duration: 600 });
    music.stinger('ghost');
    this.letterbox(true);
    await walkRig(this, this.jack, 1530, 520, 120);
    this.jack.setFacing(-1);
    await walkActor(this, this.scarn, 1330, 540, 200);
    this.scarn.rig.setFacing(1);
    await this.say(L.j1);
    await this.say(L.m1);
    await this.say(L.j2);
    await this.say(L.j3);
    await this.say(L.m2);
    await this.say(L.j4);
    const i = await this.choose(null, [
      { label: '"Is that a Zamboni in your cabin?"', line: L.q1 },
      { label: '"Are you the real Cherokee Jack?"', line: L.q2 },
      { label: '"What is your fee?"', line: L.q3 },
    ]);
    await this.say([L.a1, L.a2, L.a3][i]);
    await this.say(L.j5);
    this.letterbox(false);
  }

  private async training(): Promise<void> {
    this.clearSet();
    this.buildLake();
    music.play('montage', { fade: 0.3 });
    this.jack.setPosition(1100, 470);
    this.scarn.place(520, 560);
    this.world.maxX = 1250;
    this.cameras.main.stopFollow();
    this.cameras.main.setScroll(0, 0);
    const drills: { pre: typeof L.pre1; post: typeof L.post1; name: string; run: () => Promise<number> }[] = [
      { pre: L.pre1, post: L.post1, name: 'CLEAN THE ICE', run: () => mopIce(this, this.scarn) },
      { pre: L.pre2, post: L.post2, name: 'STICK HANDLING', run: () => stickHandle(this, this.scarn) },
      { pre: L.pre3, post: L.post3, name: 'TARGET PRACTICE', run: () => targetShoot(this, this.scarn) },
      {
        pre: L.pre4,
        post: L.post4,
        name: 'OBSTACLE COURSE',
        run: async () => {
          this.scarn.rig.setVisible(false);
          this.jack.setVisible(false);
          const s = await obstacleSkate(this, 'bg_lake');
          this.jack.setVisible(true);
          return s;
        },
      },
      { pre: L.pre5, post: L.post5, name: 'REFLEXES', run: () => reflexes(this, this.scarn, this.jack) },
    ];
    const done = (getFlag('ch03_scores', '') as string).split(',').filter(Boolean).map(Number);
    for (let d = done.length; d < drills.length; d++) {
      const dr = drills[d];
      this.detach(this.card({ kind: 'stamp', title: `DAY ${Math.floor(d / 2) + 1} · ${['MORNING', 'NOON', 'DUSK'][d % 3]}` }, 1100));
      sfx('whoosh');
      this.flash(0xffffff, 150, 0.4);
      await this.wait(900);
      this.scarn.place(520, 560);
      this.scarn.rig.setFacing(1);
      this.scarn.setMode('locked');
      await this.say(dr.pre);
      const score = await dr.run();
      this.scarn.place(520, 560);
      this.scarn.rig.setVisible(true);
      done.push(score);
      setFlag('ch03_scores', done.join(','));
      await stampResult(this, dr.name, score);
      this.scarn.rig.gesture('fingerguns', 1000);
      this.lensFlare(600, 200);
      await this.say(dr.post);
    }
    const avg = done.reduce((a, b) => a + b, 0) / done.length;
    setStat('trainingScore', avg);
    setFlag('ch03_scores', '');
    // Report card: whatever the grades say, Scarn is elite.
    const lines = done.map((s, i) => `${drills[i].name.padEnd(18, ' ')} ${grade(s)}`).join('\n');
    const bg = this.add.rectangle(640, 360, 760, 520, 0xf4f1ea).setStrokeStyle(6, 0x1b1420).setScrollFactor(0).setDepth(19990).setRotation(-0.02);
    const title = this.add.text(640, 150, 'TRAINING REPORT CARD', { fontFamily: '"Bebas Neue", Impact, sans-serif', fontSize: '52px', color: '#1b1420' }).setOrigin(0.5).setScrollFactor(0).setDepth(19991);
    const body = this.add.text(640, 330, lines, { fontFamily: '"Special Elite", "Courier New", monospace', fontSize: '30px', color: '#222', align: 'left' }).setOrigin(0.5).setScrollFactor(0).setDepth(19991);
    const stamp = this.add
      .text(640, 520, 'ELITE', { fontFamily: '"Bebas Neue", Impact, sans-serif', fontSize: '120px', color: '#c0152a', stroke: '#c0152a', strokeThickness: 2 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(19992)
      .setRotation(-0.18)
      .setScale(3)
      .setAlpha(0);
    sfx('stamp');
    await this.wait(1200);
    this.tweens.add({ targets: stamp, scale: 1, alpha: 0.9, duration: 220, ease: 'Back.easeOut' });
    sfx('slam');
    this.shake(150, 0.006);
    await this.wait(1600);
    [bg, title, body, stamp].forEach((o) => o.destroy());
    this.letterbox(true);
    await this.say(L.m3);
    await this.say(L.j6);
    this.scarn.rig.strike('heroic');
    await this.say(L.m4);
    await this.say(L.j7);
    await this.say(L.m5);
    await this.say(L.j8);
    await walkRig(this, this.jack, 1500, 460, 140);
    await this.freezeFrame('ELITE.', 1200);
  }
}
