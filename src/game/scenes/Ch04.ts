import { ChapterScene, type Beat } from '../systems/ChapterScene';
import { World } from '../systems/World';
import { Combat } from '../systems/Combat';
import { Scarn } from '../entities/Scarn';
import { runEncounter } from '../systems/Encounter';
import { walkActor, walkRig } from '../systems/Moves';
import { Guard } from '../systems/Stealth';
import { race } from '../minigames/Race';
import { paintLocker, paintRink } from '../art/backgrounds';
import { CH04 as L } from '../../data/script/ch04';
import { music } from '../../audio/music';
import { sfx, ambience } from '../../audio/sfx';
import { Director } from '../Director';
import { ctl } from '../systems/controlsText';
import { unlockAchievement } from '../../state/save';
import type { Rig } from '../entities/Rig';
import { ensureProp } from '../art/props';

const RW = 2600;
const LW = 1700;

export class Ch04 extends ChapterScene {
  readonly chapter = 4;
  scarn!: Scarn;
  combat!: Combat;
  coach!: Rig;
  chad!: Rig;
  green!: Rig;
  private stopCrowd: (() => void) | null = null;

  constructor() {
    super('Ch04');
  }

  beats(): Beat[] {
    return [
      { id: 'briefing', run: () => this.briefing() },
      { id: 'race', run: () => this.raceBeat() },
      { id: 'fight', run: () => this.fight() },
      { id: 'dq', run: () => this.dq() },
      { id: 'locker', run: () => this.locker() },
    ];
  }

  private buildRink(): void {
    this.useSet('rink', () => {
      this.world = new World(RW, 370, 690);
      this.background('bg_rink', () => paintRink(RW));
      this.prop('boommic', 900, 60).setDepth(9000).setScrollFactor(0.6);
      this.coach = this.rig('coach', 380, 420, 1);
      this.speaker('coach', this.coach);
      this.chad = this.rig('chad', 150, 520, 1);
      this.speaker('chad', this.chad);
      this.green = this.rig('skater_green', 150, 450, 1);
      this.combat = new Combat(this);
      this.scarn = new Scarn(this, this.rig('scarn_hockey', 150, 610), 150, 610);
      this.scarn.skates = true;
      this.scarn.setMode('locked');
      this.cameras.main.setBounds(0, 0, RW, 720);
      this.cameras.main.startFollow(this.scarn.rig, true, 0.08, 0.08, 0, 60);
      this.stopCrowd?.();
      this.stopCrowd = ambience('crowd', 0.6);
      this.events.once('shutdown', () => this.stopCrowd?.());
    });
  }

  private async briefing(): Promise<void> {
    this.buildRink();
    music.play('tryout', { fade: 0.6 });
    this.scarn.rig.setAnim('skate');
    this.letterbox(true);
    await this.say(L.c1);
    await this.say(L.c2);
    this.chad.gesture('victory', 1200);
    await this.say(L.chad1);
    this.scarn.rig.gesture('fingerguns', 1200);
    await this.say(L.m1);
    await this.say(L.c3);
    this.letterbox(false);
  }

  private async raceBeat(): Promise<void> {
    this.buildRink();
    music.play('tryout');
    [this.chad, this.green, this.scarn.rig].forEach((r) => r.setAnim('skate'));
    this.coach.setPosition(380, 400);
    for (const n of ['3', '2', '1', 'GO!']) {
      this.detach(this.card({ kind: 'stamp', title: n }, 600));
      sfx(n === 'GO!' ? 'whistle' : 'beep');
      await this.wait(650);
    }
    // the scarn actor must not fight the race script for control of the rig
    this.scarn.setMode('locked');
    const actorUpdate = this.scarn.update.bind(this.scarn);
    this.scarn.update = () => undefined;
    const r = await race(this, this.scarn.rig, [this.chad, this.green], 1550, 2400);
    this.scarn.update = actorUpdate;
    this.scarn.place(this.scarn.rig.x, this.scarn.rig.y);
    void r;
  }

  private async fight(): Promise<void> {
    this.buildRink();
    if (this.scarn.x < 900) {
      this.scarn.place(1550, 610);
      this.chad.setPosition(1650, 520);
      this.green.setPosition(1600, 450);
    }
    music.stop(0.2);
    sfx('scratch');
    [this.chad, this.green].forEach((r) => r.setAnim('pose', 'cower'));
    const gf = this.rig('goldenface', this.scarn.x + 520, 470, -1);
    this.speaker('goldenface', gf);
    gf.hold('stick', 0, 0, -0.5);
    this.letterbox(true);
    music.stinger('dun');
    await this.crashZoom(gf.x, gf.y - 110, 1.5);
    gf.strike('handsHips');
    await this.say(L.gf1);
    await this.zoomTo(1, 200);
    this.cameras.main.startFollow(this.scarn.rig, true, 0.08, 0.08, 0, 60);
    await this.say(L.m2);
    await this.say(L.gf2);
    gf.gesture('victory', 900);
    await this.say(L.gf3);
    await walkRig(this, gf, gf.x + 400, 400, 300, 'skate');
    gf.setVisible(false);
    this.speaker('goon', this.rig('goon_skater', this.scarn.x + 600, 500, -1));
    await this.say(L.goonA);
    this.speakers.get('goon')?.destroy();
    this.scarn.rig.gesture('fingerguns', 900);
    await this.say(L.m3);
    this.letterbox(false);
    music.play('action', { fade: 0.2 });
    [this.chad, this.green].forEach((r, i) => this.detach(walkRig(this, r, 200 + i * 80, 400 + i * 30, 260, 'skate')));
    this.scarn.setMode('combat', this.combat);
    this.objective(`Skate with ${ctl('move')} · Shoot pucks with ${ctl('fire')} · The ice is slippery!`);
    let k = 0;
    this.combat.onKill = () => {
      k++;
      if (k === 1) this.bark(L.bark1);
      if (k === 3) this.bark(L.bark2);
    };
    const x = this.scarn.x;
    await runEncounter(this, this.scarn, this.combat, [
      {
        goons: [
          { x: x + 700, y: 450, enterTo: { x: x + 350, y: 450 }, skin: 'goon_skater', weapon: 'stick', hp: 2 },
          { x: x + 700, y: 640, enterTo: { x: x + 380, y: 640 }, skin: 'goon_skater', weapon: 'stick', hp: 2 },
        ],
      },
      {
        delay: 500,
        goons: [
          { x: x - 700, y: 520, enterTo: { x: x - 300, y: 520 }, skin: 'goon_skater', weapon: 'stick', hp: 2, burst: 2 },
          { x: x + 700, y: 560, enterTo: { x: x + 320, y: 560 }, skin: 'goon_skater', weapon: 'stick', hp: 3, burst: 2 },
        ],
      },
    ]);
    this.objective(null);
    this.scarn.setMode('locked');
    gf.setVisible(true).setPosition(this.scarn.x + 420, 420);
    gf.setAnim('pose', 'victory');
    this.letterbox(true);
    await this.say(L.gf4);
    // unnecessary cape flourish
    gf.spin = 0;
    this.tweens.add({ targets: gf, spin: 720, duration: 900, ease: 'Cubic.easeInOut' });
    sfx('whoosh');
    await this.say(L.gf5);
    await walkRig(this, gf, gf.x + 700, 390, 420, 'skate');
    gf.destroy();
    this.letterbox(false);
  }

  private async dq(): Promise<void> {
    this.buildRink();
    music.play('sad', { fade: 1 });
    this.scarn.setMode('locked');
    this.coach.setPosition(this.scarn.x + 200, 440).setFacing(-1);
    this.chad.setPosition(this.scarn.x + 360, 520).setFacing(-1);
    this.letterbox(true);
    await this.say(L.c4);
    await this.say(L.c5);
    this.chad.setAnim('pose', 'victory');
    sfx('crowd_cheer');
    await this.say(L.chad2);
    this.scarn.rig.setAnim('pose', 'kneelSad');
    const sam = this.rig('samuel', this.scarn.x - 160, 600, 1);
    this.speaker('samuel', sam);
    await this.say(L.s1);
    this.scarn.rig.setAnim('pose', 'heroic');
    await this.say(L.m4);
    await this.say(L.s2);
    await this.say(L.m5);
    this.letterbox(false);
    await Director.overlay?.fade(true, 500);
    this.guard(); // the chapter may have been stopped while the overlay played
    Director.overlay?.blackout(false);
  }

  private async locker(): Promise<void> {
    this.stopCrowd?.();
    this.clearSet();
    this.setName = 'locker';
    music.play('stealth', { fade: 0.8 });
    this.world = new World(LW, 410, 690);
    this.background('bg_locker', () => paintLocker(LW));
    this.cameras.main.setBounds(0, 0, LW, 720);
    const lockers: Record<number, ReturnType<ChapterScene['prop']>> = {};
    for (let i = 0; i < 16; i++) {
      const x = 170 + i * 92;
      lockers[i] = this.prop('locker', x, 404);
    }
    this.prop('door', 70, 412);
    this.prop('bench', 520, 560);
    this.world.addWall(445, 548, 150, 18);
    this.prop('bench', 1060, 600);
    this.world.addWall(985, 588, 150, 18);
    this.prop('sidetable', 800, 470);
    this.world.addWall(768, 460, 64, 16);
    this.prop('instacam', 800, 432).setDepth(471);
    this.prop('heater', 1620, 470);
    const passImg = this.prop('pass', 1366, 300).setDepth(405);
    this.chad = this.rig('chad_towel', 1560, 500, -1);
    this.chad.setAnim('pose', 'sit');
    this.speaker('chad_towel', this.chad);

    const scarn = new Scarn(this, this.rig('scarn_hockey', 150, 620), 150, 620);
    this.scarn = scarn;
    scarn.setMode('stealth');
    this.cameras.main.startFollow(scarn.rig, true, 0.09, 0.09, 0, 60);
    const coach = new Guard(
      this,
      'coach',
      scarn,
      [
        { x: 1350, y: 520, wait: 1.6, look: 1.1 },
        { x: 380, y: 480, wait: 1.2, look: 0.9 },
        { x: 700, y: 650, wait: 1 },
        { x: 1250, y: 660, wait: 1.2 },
      ],
      { speed: 115, range: 380, takedown: false },
    );
    this.speaker('coach', coach.rig);
    let disguised = false;
    let hmSaid = false;
    coach.disguiseFactor = () => (disguised ? 0.35 : 1);
    coach.line = () => {
      if (hmSaid) return;
      hmSaid = true;
      this.bark(disguised ? L.coachDisg : L.coachHm);
    };
    let caught = false;
    coach.onSpotted = () => {
      if (caught) return;
      caught = true;
      this.detach((async () => {
        this.busy = true;
        scarn.setMode('locked');
        this.bark(L.coachSees);
        await this.wait(1400);
        await Director.overlay?.fade(true, 400);
        this.guard(); // the chapter may have been stopped while the overlay played
        Director.restartCheckpoint();
      })());
    };
    this.objective(`Get Chad's ALL-STAR PASS. Stay out of the coach's sight. HIDE in lockers (${ctl('interact')}).`);
    let hasPhoto = false;
    let swapped = false;
    // hideable lockers
    for (const i of [2, 6, 9, 12, 14]) {
      const lx = 170 + i * 92;
      const it = this.interact({
        x: lx,
        y: 430,
        r: 70,
        label: 'Hide in locker',
        onUse: () => {
          scarn.hidden = !scarn.hidden;
          scarn.rig.setVisible(!scarn.hidden);
          sfx('door');
          lockers[i].setTexture(scarn.hidden ? 'lockerOpen' : 'locker');
          this.time.delayedCall(260, () => lockers[i].setTexture('locker'));
          it.label = scarn.hidden ? 'Leave locker' : 'Hide in locker';
          if (scarn.hidden) scarn.place(lx, 430);
        },
      });
    }
    ensureProp(this, 'lockerOpen');
    this.interact({
      x: 170 + 4 * 92,
      y: 430,
      r: 70,
      label: 'Search locker',
      once: true,
      onUse: async () => {
        sfx('door');
        scarn.swapRig('scarn_disguise');
        disguised = true;
        sfx('sparkle');
        await this.say(L.disguise);
      },
    });
    this.interact({
      x: 800,
      y: 490,
      r: 90,
      label: 'Take a selfie (instant camera)',
      onUse: async () => {
        if (hasPhoto) return;
        sfx('shutter');
        this.flash(0xffffff, 200, 0.7);
        scarn.rig.strike('fingerguns');
        await this.wait(400);
        scarn.rig.setAnim('idle');
        hasPhoto = true;
        await this.say(L.camera);
      },
    });
    this.interact({
      x: 1366,
      y: 430,
      r: 80,
      label: "Swap the photo on Chad's pass",
      onUse: async () => {
        if (swapped) return;
        if (!hasPhoto) {
          await this.say(L.photoNeed);
          return;
        }
        swapped = true;
        passImg.destroy();
        sfx('sparkle');
        await this.say(L.swap);
        this.objective('Leave through the door on the left');
      },
    });
    this.interact({ x: 1520, y: 520, r: 90, label: 'Listen to Chad', onUse: () => this.say(L.sauna) });
    const sing = this.time.addEvent({ delay: 7000, loop: true, callback: () => this.bark(L.sauna) });
    let out = false;
    this.interact({
      x: 80,
      y: 450,
      r: 110,
      label: 'Exit',
      onUse: async () => {
        if (!swapped) return;
        out = true;
      },
    });
    await this.waitUntil(() => out);
    sing.remove();
    if (disguised) unlockAchievement('disguise');
    scarn.setMode('locked');
    const sam = this.rig('samuel', 250, 620, -1);
    this.speaker('samuel', sam);
    await walkActor(this, scarn, 160, 600, 200);
    await this.say(L.exit);
    await this.say(L.s3);
    scarn.rig.strike('heroic');
    await this.say(L.m6);
    await this.freezeFrame('LEGALLY CHAD.', 1400);
  }
}
