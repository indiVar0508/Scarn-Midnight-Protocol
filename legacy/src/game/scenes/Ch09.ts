import { ChapterScene, type Beat } from '../systems/ChapterScene';
import { World } from '../systems/World';
import { Scarn } from '../entities/Scarn';
import { Samuel } from '../entities/Samuel';
import { walkActor, walkRig } from '../systems/Moves';
import { doTheScarn } from '../minigames/Rhythm';
import { paintBar } from '../art/backgrounds';
import { CH09 as L } from '../../data/script/ch09';
import { music } from '../../audio/music';
import { sfx, ambience } from '../../audio/sfx';
import { findBeet, setStat, unlockAchievement, getFlag, setFlag, save } from '../../state/save';
import { settings } from '../../state/settings';
import type { Rig } from '../entities/Rig';

const W = 1800;

export class Ch09 extends ChapterScene {
  readonly chapter = 9;
  scarn!: Scarn;
  samuel!: Samuel;
  billy!: Rig;
  kid!: Rig;
  patrons: Rig[] = [];

  constructor() {
    super('Ch09');
  }

  beats(): Beat[] {
    return [
      { id: 'bar', run: () => this.bar() },
      { id: 'dance', run: () => this.dance() },
    ];
  }

  private build(): void {
    this.useSet('bar', () => {
      this.world = new World(W, 420, 690);
      this.background('bg_bar', () => paintBar(W));
      this.prop('neon', 900, 60).setDepth(-4);
      this.prop('tv', 300, 260).setDepth(-4);
      this.prop('bar', 900, 470);
      this.world.addWall(690, 430, 420, 44);
      for (const x of [720, 820, 1000, 1100]) this.prop('stool', x, 520);
      this.prop('jukebox', 1560, 430);
      this.world.addWall(1505, 410, 110, 22);
      this.prop('cafetable', 380, 600);
      this.prop('cafetable', 1300, 640);
      this.billy = this.rig('billy', 900, 440, 1);
      this.speaker('billy', this.billy);
      const ids = ['bar1', 'bar2', 'bar3', 'bar4', 'bar5', 'bar6', 'patron2'];
      const seats: [number, number][] = [
        [720, 510],
        [1100, 510],
        [340, 610],
        [420, 612],
        [1260, 650],
        [1340, 652],
        [180, 480],
      ];
      this.patrons = ids.map((id, i) => {
        const r = this.rig(id, seats[i][0], seats[i][1], i % 2 ? -1 : 1);
        r.setAnim('pose', i === 6 ? 'stand' : 'sit');
        return r;
      });
      this.speaker('bartender', this.patrons[6]);
      this.speaker('bachelorette', this.patrons[0]);
      this.kid = this.rig('kid', 1440, 520, 1);
      this.speaker('kid', this.kid);
      this.cameras.main.setBounds(0, 0, W, 720);
      const stop = ambience('bar', 0.7);
      this.events.once('shutdown', stop);
    });
  }

  private async bar(): Promise<void> {
    this.build();
    music.play('sad', { fade: 1 });
    this.scarn = new Scarn(this, this.rig('scarn', 120, 600), 120, 600);
    this.samuel = new Samuel(this, 40, 620);
    this.samuel.leader = this.scarn;
    this.cameras.main.startFollow(this.scarn.rig, true, 0.08, 0.08, 0, 60);
    this.scarn.setMode('locked');
    await walkActor(this, this.scarn, 900, 540, 120);
    this.scarn.rig.setFacing(1);
    this.scarn.rig.setAnim('pose', 'sitSlump');
    this.letterbox(true);
    await this.say(L.b1);
    await this.say(L.m1);
    await this.say(L.b2);
    await this.say(L.m2);
    await this.say(L.b3);
    await this.say(L.m3);
    this.billy.strike('wave');
    await this.say(L.b4);
    this.billy.strike('point');
    await this.say(L.b5);
    this.letterbox(false);
    this.billy.setAnim('idle');
    this.scarn.rig.setAnim('idle');
    this.scarn.place(900, 560);
    this.scarn.setMode('explore');
    this.objective('The kid by the jukebox is waiting for your nod. (G9.)');
    this.interact({ x: 720, y: 560, r: 90, label: 'Talk to the bachelorette party', once: true, onUse: () => this.say(L.bach1) });
    this.interact({ x: 300, y: 460, r: 120, label: 'Watch TV', once: true, onUse: () => this.say(L.tv) });
    this.interact({ x: 190, y: 500, r: 90, label: 'Talk to patron', once: true, onUse: () => this.say(L.patronA) });
    this.prop('dundie', 1300, 612).setDepth(641);
    const beet = this.prop('beet', 380, 574).setDepth(601);
    this.interact({
      x: 380,
      y: 620,
      r: 80,
      label: 'A beet?',
      once: true,
      onUse: async () => {
        beet.destroy();
        sfx('sparkle');
        findBeet('ch09');
        await this.say(L.beet);
      },
    });
    let played = false;
    this.interact({ x: 1480, y: 540, r: 130, label: 'Nod at the kid', once: true, onUse: async () => void (played = true) });
    await this.waitUntil(() => played);
    this.scarn.setMode('locked');
    this.letterbox(true);
    await walkRig(this, this.kid, 1540, 470, 160);
    await this.say(L.kid1);
    this.scarn.rig.setExpression('hurt');
    await this.say(L.mNo);
    this.scarn.rig.setExpression('idle');
    this.billy.strike('victory');
    await this.say(L.b6);
    this.kid.strike('point');
    sfx('jukebox');
    music.stop(0.5);
    // flashback
    const unsoft = this.softFocus();
    this.sepia(true);
    const cat = this.rig('catherine', this.scarn.x + 140, this.scarn.y, -1);
    cat.setGhost(true);
    this.speaker('catherine', cat);
    music.stinger('romance');
    this.scarn.rig.strike('danceRight');
    cat.strike('danceLeft');
    await this.say(L.c1);
    await this.say(L.m4);
    cat.destroy();
    this.sepia(false);
    unsoft();
    this.letterbox(false);
  }

  private async dance(): Promise<void> {
    this.build();
    if (!this.scarn?.rig.active) {
      this.scarn = new Scarn(this, this.rig('scarn', 1100, 600), 1100, 600);
    }
    this.scarn.setMode('locked');
    this.scarn.canPose = false;
    this.cameras.main.stopFollow();
    this.cameras.main.setScroll(420, 0);
    this.scarn.place(1060, 600);
    this.scarn.rig.setFacing(1);
    this.samuel?.destroy?.();
    // dance spots: a line behind Scarn, then the whole bar
    const spots: [number, number][] = [
      [940, 560],
      [1180, 560],
      [860, 650],
      [1260, 650],
      [780, 580],
      [1340, 580],
      [1060, 520],
      [1000, 470],
    ];
    const dancers = [...this.patrons, this.billy, ...(this.kid?.active ? [this.kid] : [])];
    const onJoin = (i: number) => {
      const d = dancers[i];
      const [x, y] = spots[i % spots.length];
      sfx('cheer_small', (x - 1060) / 600);
      this.detach(walkRig(this, d, x, y, 320).then(() => d.setFacing(1)));
    };
    for (let attempt = (getFlag('ch09_fails', 0) as number); ; attempt++) {
      dancers.forEach((d) => d.setData('joined', false));
      const res = await doTheScarn(this, this.scarn.rig, dancers, L, onJoin, attempt >= 2);
      const pass = res.accuracy >= (settings.get().assist || attempt >= 2 ? 30 : 45);
      if (pass) {
        setStat('danceAccuracy', Math.max(save.get().stats.danceAccuracy, res.accuracy));
        setStat('danceMaxCombo', Math.max(save.get().stats.danceMaxCombo, res.maxCombo));
        setFlag('ch09_fails', 0);
        break;
      }
      setFlag('ch09_fails', attempt + 1);
      this.scarn.rig.setAnim('idle');
      await this.say(attempt >= 1 ? L.fail2 : L.fail1);
      // everyone back to their seats
      dancers.forEach((d) => d.setAnim('idle'));
    }
    // CONFIDENCE RESTORED
    dancers.forEach((d) => d.setAnim('pose', 'victory'));
    this.scarn.rig.setAnim('pose', 'victory');
    sfx('applause');
    music.stinger('victory');
    await this.say(L.win1);
    unlockAchievement('confidence');
    await this.missionCard('CONFIDENCE RESTORED', 'Coolness: 100%. Hair: immaculate. Threat level: MIDNIGHT.');
    // jacket on, in slow motion
    music.play('spy', { fade: 0.5 });
    this.letterbox(true);
    this.grayscale(false);
    await this.crashZoom(this.scarn.x, this.scarn.y - 100, 1.4);
    this.scarn.rig.stiffness = 3;
    this.scarn.rig.strike('dramaticTurn');
    this.lensFlare(700, 200);
    sfx('pose');
    await this.wait(1200);
    this.scarn.rig.stiffness = 16;
    await this.zoomTo(1, 300);
    await this.say(L.m5);
    this.billy.setAnim('idle');
    await this.say(L.b7);
    this.scarn.rig.strike('fingerguns');
    music.stinger('title');
    await this.say(L.m6);
    await this.say(L.m7);
    const sam = this.rig('samuel', 1500, 600, -1);
    this.speaker('samuel', sam);
    await this.say(L.s1);
    await this.say(L.m8);
    await this.freezeFrame('THE SCARN IS BACK.', 1500);
  }
}
