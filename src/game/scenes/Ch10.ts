import Phaser from 'phaser';
import { ChapterScene, type Beat } from '../systems/ChapterScene';
import { World } from '../systems/World';
import { Hockey, RINK, type Team } from '../minigames/Hockey';
import { superShot } from '../minigames/SuperShot';
import { walkRig } from '../systems/Moves';
import { paintBar, paintRink, paintSky, paintSkyline, paintSpace, paintStreet, paintTunnel } from '../art/backgrounds';
import { ensureProp, registerCanvas } from '../art/props';
import { R } from '../art/characters';
import { CH10 as L } from '../../data/script/ch10';
import { music } from '../../audio/music';
import { sfx, ambience } from '../../audio/sfx';
import { addStat, save, unlockAchievement, getFlag, setFlag } from '../../state/save';
import { ui } from '../../state/ui';
import { settings } from '../../state/settings';
import { Director } from '../Director';
import { ctl } from '../systems/controlsText';
import { qa } from '../systems/qa';
import type { Rig } from '../entities/Rig';

const W = 2600;
const OX = 9000; // off-world area for the split-screen cutaway

export class Ch10 extends ChapterScene {
  readonly chapter = 10;
  hockey!: Hockey;
  scarn!: Rig;
  private stopCrowd: (() => void) | null = null;

  constructor() {
    super('Ch10');
  }

  beats(): Beat[] {
    return [
      { id: 'period1', run: () => this.period1() },
      { id: 'bomb', run: () => this.bombPhase() },
      { id: 'ghost', run: () => this.ghost() },
      { id: 'flight', run: () => this.flight() },
      { id: 'victory', run: () => this.victory() },
    ];
  }

  private buildArena(): void {
    this.useSet('arena', () => {
      this.world = new World(W, RINK.y0, RINK.y1);
      this.background('bg_arena', () => paintRink(W, true));
      // one section of the crowd is cardboard cutouts
      for (let i = 0; i < 8; i++) this.prop('cutout', 1900 + i * 40, 262, 0.8).setDepth(-5);
      this.prop('cardboard', 2060, 190).setDepth(-4);
      this.prop('boommic', 1200, 40).setDepth(9000).setScrollFactor(0.5);
      this.hockey = new Hockey(this);
      this.scarn = this.rig('scarn_hockey', 1000, 540, 1);
      this.speaker('scarn', this.scarn);
      this.hockey.addSkater(this.scarn, 'home', 'fwd', true);
      this.hockey.addSkater(this.rig('allstar_blue', 900, 440, 1), 'home', 'fwd');
      this.hockey.addSkater(this.rig('allstar_blue', 700, 640, 1), 'home', 'def');
      this.hockey.addSkater(this.rig('allstar_red', 1500, 540, -1), 'away', 'fwd');
      this.hockey.addSkater(this.rig('allstar_red', 1600, 640, -1), 'away', 'fwd');
      this.hockey.addSkater(this.rig('chad', 1800, 440, -1), 'away', 'def');
      this.hockey.addGoalie(this.rig('goalie_blue', 0, 0, 1), 'home');
      this.hockey.addGoalie(this.rig('goalie_red', 0, 0, -1), 'away');
      this.hockey.faceoff();
      this.cameras.main.setBounds(0, 0, W, 720);
      this.cameras.main.startFollow(this.hockey.puck.img, true, 0.08, 0.06, 0, 120);
      this.stopCrowd?.();
      this.stopCrowd = ambience('crowd', 1);
      this.events.once('shutdown', () => this.stopCrowd?.());
    });
  }

  private scoreboard(): void {
    const s = this.hockey.score;
    ui.set({ objective: `SCORE 3 GOALS · HOME ${s.home} — ${s.away} AWAY` });
  }

  /** Split-screen: Samuel under the stadium. */
  private async cutaway(lines: (typeof L)[keyof typeof L][], hostagesFree = false): Promise<void> {
    this.hockey.frozen = true;
    if (!this.textures.exists('bg_cut')) registerCanvas(this, 'bg_cut', paintTunnel(1400, 11, 'storage'));
    const remote: Phaser.GameObjects.GameObject[] = [];
    remote.push(this.add.image(OX, 0, 'bg_cut').setOrigin(0).setDepth(-10000));
    remote.push(this.prop('cage', OX + 620, 560));
    const sam = this.rig('samuel', OX + 420, 600, 1);
    sam.strike('thinking');
    this.speaker('samuel', sam);
    this.speaker('samuel_radio', sam);
    remote.push(sam);
    for (const [id, x] of [
      ['hostage', 560],
      ['hostage_b', 630],
      ['hostage3', 700],
    ] as [string, number][]) {
      const r = this.rig(id, OX + x, hostagesFree ? 640 : 530, -1);
      r.setAnim('idle', hostagesFree ? 'victory' : 'tied');
      if (id === 'hostage3') this.speaker('hostage3', r);
      remote.push(r);
    }
    const cam = this.cameras.add(660, 96, 580, 330);
    cam.setScroll(OX + 290, 250);
    cam.setZoom(1);
    const g = this.add.graphics().setScrollFactor(0).setDepth(19000);
    g.lineStyle(8, 0x000000).strokeRect(656, 92, 588, 338);
    g.lineStyle(3, 0x3cff6a).strokeRect(652, 88, 596, 346);
    const lab = this.add.text(668, 398, 'UNDER THE STADIUM · LIVE', { fontFamily: '"VT323", monospace', fontSize: '22px', color: '#3cff6a' }).setScrollFactor(0).setDepth(19001);
    cam.ignore([g, lab]);
    this.cameras.main.ignore(remote);
    sfx('beep');
    for (const l of lines) await this.say(l);
    this.cameras.remove(cam);
    [g, lab, ...remote].forEach((o) => o.destroy());
    this.hockey.frozen = false;
  }

  private async period1(): Promise<void> {
    this.buildArena();
    music.play('arena', { fade: 0.5 });
    this.hockey.frozen = true;
    this.letterbox(true);
    await this.say(L.an1);
    this.scarn.gesture('victory', 900);
    await this.say(L.m1);
    await this.cutaway([L.s1, L.m2]);
    this.letterbox(false);
    this.hockey.frozen = true;
    this.detach(this.card({ kind: 'stamp', title: 'FACE-OFF!' }, 900));
    sfx('whistle');
    await this.wait(900);
    this.hockey.frozen = false;
    this.scoreboard();
    this.showHelp(`SKATE ${ctl('move')} · HOLD & RELEASE ${ctl('fire')} TO SHOOT · PASS ${ctl('pass')} · CHECK ${ctl('check')} · POKE-STEAL ${ctl('interact')}`);
    let homeGoals = 0;
    let resume = false;
    const target = 3;
    this.hockey.onGoal = (team: Team, scorer) => {
      this.hockey.frozen = true;
      sfx('goal_horn');
      sfx('crowd_cheer');
      this.flash(team === 'home' ? 0xffcf3a : 0xff4040, 300, 0.4);
      if (team === 'home' && scorer?.human) {
        addStat('goals', 1);
        this.scarn.strike('victory');
      }
      this.bark(team === 'home' ? L.goal1 : L.goalAway);
      this.scoreboard();
      this.time.delayedCall(1800, () => {
        if (team === 'home') homeGoals++;
        resume = true;
      });
    };
    const god = () => {
      if (qa.skipFights && !this.hockey.frozen) {
        // QA: teleport the puck into the away net
        const p = this.hockey.puck;
        p.owner = null;
        p.lastTouch = this.hockey.human;
        p.x = RINK.goalR + 10;
        p.y = 540;
      }
    };
    this.updaters.add(god);
    let cut = false;
    while (homeGoals < target) {
      await this.waitUntil(() => resume);
      resume = false;
      if (homeGoals >= target) break;
      if (homeGoals === 1 && !cut) {
        cut = true;
        this.hideHelp();
        await this.cutaway([L.s2, L.m3, L.h3]);
      }
      ui.set({ objective: `SCORE ${target} GOALS · HOME ${this.hockey.score.home} — ${this.hockey.score.away} AWAY` });
      this.hockey.faceoff();
      this.detach(this.card({ kind: 'stamp', title: 'FACE-OFF!' }, 700));
      sfx('whistle');
      this.hockey.frozen = false;
    }
    this.updaters.delete(god);
    this.hideHelp();
  }

  private help: Phaser.GameObjects.Text | null = null;
  private showHelp(t: string): void {
    this.help?.destroy();
    this.help = this.add
      .text(640, 700, t, { fontFamily: '"Barlow Condensed", Arial, sans-serif', fontSize: '20px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 10, y: 4 } })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(19990);
  }
  private hideHelp(): void {
    this.help?.destroy();
    this.help = null;
  }

  private async bombPhase(): Promise<void> {
    this.buildArena();
    music.play('arena');
    this.hockey.frozen = true;
    this.hockey.faceoff();
    this.letterbox(true);
    await this.say(L.an2);
    this.hockey.setBomb(true);
    // Goldenface on the jumbotron
    const gf = this.rig('goldenface', 1300, 170, -1, 0.9);
    gf.setScrollFactor(0.4).setDepth(-3);
    this.speaker('goldenface', gf);
    gf.strike('victory');
    music.stinger('dun');
    await this.say(L.gf1);
    gf.destroy();
    this.scarn.setExpression('shock');
    await this.say(L.m4);
    this.scarn.setExpression('idle');
    this.letterbox(false);
    const total = settings.get().assist ? 30 : 40;
    let left = total;
    this.hockey.noGoals = true;
    let failed = false;
    this.hockey.onNetTouch = () => {
      if (failed) return;
      failed = true;
      this.hockey.frozen = true;
      sfx('small_boom');
      this.bark(L.net);
      const take = ((save.get().flags.takes_10 as number | undefined) ?? 1) + 1;
      setFlag('takes_10', take);
      this.detach((async () => {
        await this.wait(1600);
        await Director.overlay?.clapper(take);
        Director.restartCheckpoint();
      })());
    };
    this.showHelp(`KEEP-AWAY! Hold the puck, pass (${ctl('pass')}), check (${ctl('check')}) anyone heading for a net`);
    this.hockey.frozen = false;
    await this.frameLoop((dt, done) => {
      if (this.hockey.frozen) return;
      left -= dt;
      ui.set({ objective: `KEEP THE BOMB PUCK AWAY FROM BOTH NETS: ${Math.max(0, left).toFixed(0)}s` });
      if (qa.skipFights) left = 0;
      if (left <= 0) done();
    });
    this.hideHelp();
    this.hockey.frozen = true;
    ui.set({ objective: null });
  }

  private async ghost(): Promise<void> {
    this.buildArena();
    this.hockey.frozen = true;
    this.hockey.setBomb(true);
    const h = this.hockey.human;
    this.hockey.place(h, 1300, 560);
    this.hockey.puck.owner = h;
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(1300, 420);
    await this.cutaway([L.s3, L.s4], true);
    this.scarn.setExpression('shock');
    await this.say(L.m5);
    await this.say(L.s5);
    await this.say(L.m6);
    await this.say(L.s6);
    // the low point
    music.play('sad', { fade: 1 });
    this.grayscale(true);
    this.scarn.strike('kneelSad');
    this.stopCrowd?.();
    this.letterbox(true);
    await this.say(L.m7);
    // a deliberately cheap ghost, on a visible string
    const jack = this.rig('jack_ghost', 1460, 470, -1);
    jack.setGhost(true);
    this.speaker('jack_ghost', jack);
    const str = this.add.rectangle(1460, 0, 2, 380, 0xffffff, 0.7).setOrigin(0.5, 0).setDepth(9000);
    jack.setAlpha(0);
    sfx('ghost');
    music.stinger('ghost');
    await this.tweenP({ targets: jack, alpha: 1, duration: 1200 });
    this.tweens.add({ targets: [jack], y: 450, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const hangString = () => str.setSize(2, jack.y - 150);
    this.updaters.add(hangString);
    await this.say(L.j1);
    this.scarn.strike('kneel');
    await this.say(L.m8);
    await this.say(L.j2);
    await this.say(L.j3);
    await this.say(L.j4);
    await this.say(L.j5);
    const g = (getFlag('ghost_wisdom', 0) as number) + 1;
    setFlag('ghost_wisdom', g);
    if (g >= 2) unlockAchievement('ghost');
    this.scarn.strike('heroic');
    this.grayscale(false);
    await this.say(L.m9);
    await this.tweenP({ targets: [jack, str], alpha: 0, duration: 800 });
    this.updaters.delete(hangString);
    jack.destroy();
    str.destroy();
    this.letterbox(false);
    music.play('finale', { fade: 0.5 });
    this.scarn.strike('slapWind');
    const q = await superShot(this, this.hockey.puck.x, this.hockey.puck.y);
    setFlag('supershot_q', Math.round(q * 100));
    this.scarn.strike('slapHit');
    this.bark(L.m10);
    this.hockey.puck.img.setVisible(false);
    // the puck launches through the roof
    const p = this.add.image(this.hockey.puck.x, this.hockey.puck.y, 'bombpuck').setScale(1.6 / R).setDepth(9500);
    sfx('whoosh');
    this.shake(300, 0.012);
    await this.tweenP({ targets: p, x: 1320, y: -80, scale: 0.6 / R, duration: 700, ease: 'Quad.easeIn' });
    await this.wait(600);
  }

  private async flight(): Promise<void> {
    // Shot 1: sky full of cotton-ball clouds on strings
    const shot = async (key: string, paint: () => HTMLCanvasElement, caption: string | null, from: [number, number], to: [number, number], ms: number, extra?: () => void) => {
      this.clearSet();
      this.setName = key;
      this.background(key, paint).setScrollFactor(0);
      extra?.();
      const puck = this.add.image(from[0], from[1], 'bombpuck').setScale(1.6 / R).setDepth(9000).setScrollFactor(0);
      ensureProp(this, 'dust');
      const trail = this.add.particles(0, 0, 'dust', { follow: puck, lifespan: 400, scale: { start: 1 / R, end: 0 }, alpha: { start: 0.8, end: 0 }, frequency: 20, tint: 0xffcf3a }).setDepth(8999).setScrollFactor(0);
      if (caption) this.detach(this.card({ kind: 'stamp', title: caption }, ms));
      sfx('whoosh');
      await this.tweenP({ targets: puck, x: to[0], y: to[1], angle: 720, duration: ms, ease: 'Sine.easeInOut' });
      trail.destroy();
    };
    ensureProp(this, 'bombpuck');
    ensureProp(this, 'satellite');
    music.play('finale');
    await shot('bg_sky', () => paintSky(), null, [640, 760], [700, -60], 1500);
    await shot('bg_skyline', () => paintSkyline(), 'MEANWHILE, OVER SCRANTON', [-40, 500], [1320, 200], 1600);
    await shot('bg_skyline', () => paintSkyline(), 'STILL OVER SCRANTON', [1320, 600], [-40, 150], 1300);
    // Shot 4: space and a cardboard satellite
    await shot('bg_space', () => paintSpace(), 'SPACE', [100, 720], [880, 330], 1700, () => {
      this.add.image(900, 320, 'satellite').setScale(1.3 / R).setDepth(100).setScrollFactor(0).setName('sat');
    });
    const sat = this.children.getByName('sat') as Phaser.GameObjects.Image;
    sfx('metal');
    this.shake(200, 0.01);
    this.tweens.add({ targets: sat, angle: 380, x: 1000, duration: 1800, ease: 'Cubic.easeOut' });
    sfx('satellite');
    await this.wait(1400);
    // Shot 5: Billy's bar gets reception back
    this.clearSet();
    this.setName = 'barTV';
    this.background('bg_bar', () => paintBar(1800)).setScrollFactor(0).setX(-100);
    const tv = this.prop('tv', 640, 380, 2.2).setScrollFactor(0);
    const billy = this.rig('billy', 420, 640, 1);
    this.speaker('billy', billy);
    const pat = this.rig('patron2', 860, 650, -1);
    this.speaker('bartender', pat);
    // the TV now shows the game
    const screen = this.add.rectangle(640, 285, 200, 128, 0xcfe3f2).setScrollFactor(0).setDepth(9000);
    const tvp = this.add.image(640, 280, 'bombpuck').setScale(0.8 / R).setScrollFactor(0).setDepth(9001);
    this.tweens.add({ targets: tvp, y: 300, duration: 300, yoyo: true, repeat: -1 });
    void tv;
    screen.setAlpha(0);
    await this.wait(300);
    sfx('tape_click');
    screen.setAlpha(1);
    billy.strike('victory');
    pat.strike('victory');
    sfx('cheer_small');
    await this.say(L.bar1);
    await this.say(L.bar2);
    // Shot 6: parking lot, Goldenface escaping in a golf cart
    this.clearSet();
    this.setName = 'lot';
    this.background('bg_street', () => paintStreet(1800)).setScrollFactor(0);
    const cart = this.prop('golfcart', 200, 640).setScrollFactor(0);
    const gf = this.rig('goldenface', 200, 560, 1);
    gf.setScrollFactor(0);
    this.speaker('goldenface', gf);
    gf.strike('victory');
    this.tweens.add({ targets: [cart, gf], x: '+=500', duration: 2600 });
    await this.say(L.gf2);
    const fall = this.add.image(760, -60, 'bombpuck').setScale(1.6 / R).setScrollFactor(0).setDepth(9000);
    sfx('slide_down');
    gf.setExpression('shock');
    await this.tweenP({ targets: fall, x: gf.x + 20, y: 560, duration: 900, ease: 'Quad.easeIn' });
    fall.destroy();
    // A huge, deliberately terrible explosion. Everyone reacts a beat late.
    ensureProp(this, 'explosion');
    const boom = this.add.image(gf.x, 500, 'explosion').setScale(0.2 / R).setScrollFactor(0).setDepth(9500);
    sfx('explosion');
    this.flash(0xfff0b0, 400, 0.8);
    this.shake(700, 0.02);
    await this.tweenP({ targets: boom, scale: 3.2 / R, duration: 500, ease: 'Back.easeOut' });
    gf.setAnim('pose', 'lieBack');
    this.tweens.add({ targets: gf, y: -200, angle: 900, duration: 1600, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: cart, y: 900, angle: -60, duration: 1400 });
    await this.wait(1600);
    this.tweens.add({ targets: boom, alpha: 0, duration: 800 });
    await this.say(L.gf3);
    // Shot 7: Samuel frees the hostages
    this.clearSet();
    this.setName = 'free';
    this.background('bg_cut', () => paintTunnel(1400, 11, 'storage')).setScrollFactor(0);
    const cage = this.prop('cage', 640, 560).setScrollFactor(0);
    const sam = this.rig('samuel', 420, 620, 1);
    sam.setScrollFactor(0);
    this.speaker('samuel', sam);
    const hs = (['hostage', 'hostage_b', 'hostage_c', 'hostage3'] as const).map((id, i) => {
      const r = this.rig(id, 560 + i * 60, 520, -1);
      r.setScrollFactor(0);
      r.setAnim('idle', 'tied');
      return r;
    });
    this.speaker('hostage', hs[0]);
    this.speaker('hostage3', hs[3]);
    sfx('door');
    this.tweens.add({ targets: cage, alpha: 0.2, duration: 500 });
    await this.say(L.sam1);
    // cheering arrives slightly late
    await this.wait(400);
    hs.slice(0, 3).forEach((r, i) => {
      r.setAnim('pose', 'victory');
      this.detach(walkRig(this, r, 1400 + i * 50, 600, 300, 'run'));
    });
    sfx('cheer_small');
    await this.say(L.hs1);
    await this.say(L.hs3);
    await this.say(L.sam2);
    unlockAchievement('hostage3');
    this.detach(walkRig(this, hs[3], 1400, 600, 120));
    await this.wait(600);
  }

  private async victory(): Promise<void> {
    this.clearSet();
    this.buildArena();
    this.hockey.frozen = true;
    this.hockey.setBomb(false);
    this.hockey.puck.img.setVisible(false);
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(1300, 420);
    music.play('spy', { fade: 0.5 });
    this.stopCrowd?.();
    this.stopCrowd = ambience('crowd', 1.4);
    sfx('crowd_cheer');
    sfx('applause');
    const h = this.hockey.human;
    this.hockey.place(h, 1300, 560);
    this.scarn.strike('victory');
    this.scarn.hold('trophy', 0, -10, 0);
    this.letterbox(true);
    await this.say(L.an3);
    this.lensFlare(640, 160);
    await this.say(L.m11);
    const jack = this.rig('jack_ghost', 1560, 470, -1);
    jack.setGhost(true);
    jack.setAlpha(0.8);
    this.speaker('jack_ghost', jack);
    await this.say(L.ghost2);
    jack.destroy();
    if (save.get().stats.goals >= 3) unlockAchievement('hockey');
    music.stinger('victory');
    await this.freezeFrame('THREAT LEVEL MIDNIGHT: CANCELLED.', 2000);
  }
}
