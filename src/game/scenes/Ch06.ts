import { ChapterScene, type Beat } from '../systems/ChapterScene';
import { World } from '../systems/World';
import { Combat } from '../systems/Combat';
import { Scarn } from '../entities/Scarn';
import { Samuel } from '../entities/Samuel';
import { Goon } from '../entities/Goon';
import { Goldenface } from '../entities/Goldenface';
import { Guard, SecurityCam, throwNoise } from '../systems/Stealth';
import { wireRetake } from '../systems/Encounter';
import { walkActor, walkRig } from '../systems/Moves';
import { hack } from '../minigames/Hack';
import { mash } from '../minigames/Mash';
import { paintTunnel } from '../art/backgrounds';
import { ensureProp } from '../art/props';
import { R } from '../art/characters';
import { CH06 as L } from '../../data/script/ch06';
import { music } from '../../audio/music';
import { sfx, ambience } from '../../audio/sfx';
import { findBeet, save, setFlag, unlockAchievement } from '../../state/save';
import { ui } from '../../state/ui';
import { Director } from '../Director';
import { input } from '../systems/Input';
import { ctl } from '../systems/controlsText';
import { qa } from '../systems/qa';
import type { Rig } from '../entities/Rig';

export class Ch06 extends ChapterScene {
  readonly chapter = 6;
  scarn!: Scarn;
  samuel!: Samuel;
  guards: Guard[] = [];
  gadgets = 3;
  private stopAmb: (() => void) | null = null;

  constructor() {
    super('Ch06');
  }

  beats(): Beat[] {
    return [
      { id: 'roomA', run: () => this.roomA() },
      { id: 'roomB', run: () => this.roomB() },
      { id: 'roomC', run: () => this.roomC() },
      { id: 'hostages', run: () => this.hostages() },
      { id: 'lair', run: () => this.lair() },
      { id: 'defeat', run: () => this.defeat() },
    ];
  }

  // ------------------------------------------------------------ shared room setup
  private room(name: string, w: number, seed: number, variant: 'pipes' | 'storage' | 'boiler', playerX = 120): void {
    this.clearSet();
    this.setName = name;
    this.guards = [];
    this.gadgets = 3;
    this.world = new World(w, 405, 690);
    this.background(`bg_tun_${name}`, () => paintTunnel(w, seed, variant));
    this.cameras.main.setBounds(0, 0, w, 720);
    this.scarn = new Scarn(this, this.rig('scarn', playerX, 580), playerX, 580);
    this.samuel = new Samuel(this, playerX - 80, 600);
    this.samuel.leader = this.scarn;
    this.samuel.offset = { x: -70, y: 12 };
    this.cameras.main.startFollow(this.scarn.rig, true, 0.09, 0.09, 0, 60);
    this.stopAmb?.();
    this.stopAmb = ambience('hum', 1);
    this.events.once('shutdown', () => this.stopAmb?.());
    wireRetake(this, this.scarn);
    // gadget throw + samuel hidden from guards (he is very quiet. suspiciously quiet.)
    this.updaters.add(() => {
      if (this.scarn.mode === 'stealth' && !this.busy && !ui.get().dialogue && input.pressed('gadget')) {
        if (this.gadgets <= 0) {
          sfx('beep_bad');
          return;
        }
        this.gadgets--;
        const mv = input.move();
        const dx = Math.abs(mv.x) + Math.abs(mv.y) > 0.2 ? mv.x : this.scarn.rig.facing;
        const dy = Math.abs(mv.x) + Math.abs(mv.y) > 0.2 ? mv.y : 0;
        throwNoise(this, this.scarn, this.guards, dx, dy);
        ui.set({ hud: { hp: this.gadgets, hpMax: 3, label: 'TEETH' } });
      }
    });
    ui.set({ hud: { hp: this.gadgets, hpMax: 3, label: 'TEETH' } });
  }

  private crate(x: number, y: number, kind: 'crate' | 'boxstack' = 'crate'): void {
    this.prop(kind, x, y);
    this.world.addWall(x - 36, y - 26, 72, 28);
  }

  private spotted = () => {
    if (this.scarn.mode === 'locked') return;
    this.scarn.setMode('locked');
    this.busy = true;
    this.scarn.rig.setExpression('shock');
    this.scarn.alive = false;
    this.scarn.onDown?.();
  };

  private addGuard(path: ConstructorParameters<typeof Guard>[3], opts?: ConstructorParameters<typeof Guard>[4]): Guard {
    const g = new Guard(this, 'goon', this.scarn, path, opts);
    g.onSpotted = this.spotted;
    this.guards.push(g);
    return g;
  }

  private door(x: number, label = 'Go through the door'): Promise<void> {
    this.prop('metaldoor', x, 404);
    let through = false;
    this.interact({ x, y: 440, r: 120, label, once: true, onUse: async () => void (through = true) });
    return this.waitUntil(() => through).then(async () => {
      this.scarn.setMode('locked');
      sfx('door');
      await Director.overlay?.fade(true, 350);
      this.guard(); // the chapter may have been stopped while the overlay played
      Director.overlay?.blackout(false);
    });
  }

  private stealthIntroObjective(): void {
    this.objective(`Sneak! Avoid vision cones · ${ctl('interact')} behind a guard: Scarn Chop · ${ctl('gadget')}: throw chattering teeth`);
  }

  // ------------------------------------------------------------ rooms
  private async roomA(): Promise<void> {
    this.room('A', 1900, 2, 'pipes');
    music.play('stealth', { fade: 1 });
    this.crate(620, 520);
    this.crate(1010, 650, 'boxstack');
    this.crate(1250, 470);
    this.crate(1600, 600);
    this.scarn.setMode('locked');
    this.letterbox(true);
    await this.say(L.a1);
    await this.say(L.a2);
    await this.say(L.a3);
    this.scarn.rig.gesture({ aF: 120, eF: 10, lean: 10 }, 700);
    await this.say(L.a4);
    this.letterbox(false);
    const g1 = this.addGuard([
      { x: 480, y: 450, wait: 1.2, look: 0.7 },
      { x: 900, y: 450, wait: 1.2, look: 0.7 },
    ]);
    this.speaker('goon', g1.rig);
    const g2 = this.addGuard([
      { x: 1420, y: 600, wait: 3, look: 1.1 },
      { x: 1400, y: 540, wait: 2.5, look: 1.1 },
    ]);
    g2.angle = Math.PI;
    this.speaker('goon2', g2.rig);
    this.scarn.setMode('stealth');
    this.stealthIntroObjective();
    const chat = this.time.addEvent({ delay: 9000, loop: true, callback: () => this.bark(Math.random() > 0.5 ? L.guard1 : L.guard2) });
    let chopped = false;
    this.updaters.add(() => {
      if (!chopped && this.guards.some((g) => g.state === 'stunned')) {
        chopped = true;
        this.bark(L.chop1);
      }
    });
    await this.door(1850);
    chat.remove();
  }

  private async roomB(): Promise<void> {
    this.room('B', 2100, 5, 'storage');
    music.play('stealth');
    this.crate(1250, 560);
    this.crate(1650, 470);
    this.scarn.setMode('locked');
    await this.say(L.b1);
    await this.say(L.b2);
    await this.say(L.b3);
    this.scarn.setMode('stealth');
    const cams = [new SecurityCam(this, this.scarn, 560, 420, 0.5, 2.6, { range: 360, speed: 0.55 }), new SecurityCam(this, this.scarn, 1450, 420, 0.5, 2.6, { range: 380, speed: 0.7 })];
    cams.forEach((c) => (c.onSpotted = this.spotted));
    this.addGuard(
      [
        { x: 1700, y: 640, wait: 1.5, look: 0.8 },
        { x: 1950, y: 560, wait: 1.5, look: 0.8 },
      ],
      { speed: 100 },
    );
    this.prop('terminal', 900, 416);
    this.world.addWall(860, 400, 80, 20);
    this.objective('Get Samuel to the MAINFRAME terminal to kill the cameras (or dodge them)');
    this.interact({
      x: 900,
      y: 450,
      r: 120,
      label: 'Hack the mainframe (with Samuel)',
      once: true,
      onUse: async () => {
        this.scarn.setMode('locked');
        this.samuel.following = false;
        await walkActor(this, this.samuel, 960, 440, 260);
        this.samuel.rig.setFacing(-1);
        this.samuel.rig.strike('thinking');
        await this.say(L.bTerm);
        await hack(this, 6);
        cams.forEach((c) => c.disable());
        this.samuel.rig.setAnim('idle');
        this.samuel.following = true;
        await this.say(L.bDone);
        this.scarn.setMode('stealth');
        this.stealthIntroObjective();
      },
    });
    const beet = this.prop('beet', 1250, 600);
    this.interact({
      x: 1250,
      y: 610,
      r: 80,
      label: 'A beet?',
      once: true,
      onUse: async () => {
        beet.destroy();
        sfx('sparkle');
        findBeet('ch06');
        await this.say(L.beet);
      },
    });
    await this.door(2050);
  }

  private async roomC(): Promise<void> {
    this.room('C', 2000, 8, 'pipes');
    music.play('stealth');
    this.crate(700, 470);
    this.crate(900, 640, 'boxstack');
    this.crate(1650, 470);
    this.prop('vent', 380, 404).setDepth(-2);
    this.scarn.setMode('locked');
    await this.say(L.c1);
    await this.say(L.c2);
    await this.say(L.c3);
    this.scarn.setMode('stealth');
    const a = this.addGuard([{ x: 1280, y: 560, wait: 5, look: 0.5 }], { range: 300 });
    const b = this.addGuard([{ x: 1420, y: 560, wait: 5, look: 0.5 }], { range: 300 });
    a.angle = 0;
    b.angle = Math.PI;
    this.speaker('goon', a.rig);
    this.speaker('goon2', b.rig);
    const chat = this.time.addEvent({ delay: 6500, loop: true, callback: () => this.bark(Math.random() > 0.5 ? L.chat1 : L.chat2) });
    const card = this.prop('keycard', 1350, 640);
    let hasCard = false;
    this.interact({
      x: 1350,
      y: 650,
      r: 80,
      label: 'Take keycard',
      once: true,
      onUse: async () => {
        card.destroy();
        hasCard = true;
        sfx('sparkle');
        await this.say(L.card);
        this.objective('Open the locked door');
      },
    });
    this.interact({
      x: 380,
      y: 440,
      r: 90,
      label: 'Crawl into the vent (box)',
      onUse: async () => {
        this.scarn.setMode('locked');
        this.bark(L.vent);
        await this.tweenP({ targets: this.scarn.rig, alpha: 0, duration: 250 });
        sfx('whoosh');
        await this.wait(900);
        this.scarn.place(1100, 670);
        this.samuel.place(1040, 680);
        this.scarn.rig.setAlpha(1);
        this.scarn.setMode('stealth');
      },
    });
    this.objective(`Get the keycard. Lure the guards with ${ctl('gadget')} (chattering teeth), or use the vent`);
    this.prop('metaldoor', 1950, 404);
    let through = false;
    this.interact({
      x: 1950,
      y: 440,
      r: 120,
      label: 'Open door',
      onUse: async () => {
        if (!hasCard) {
          sfx('locked');
          await this.say(L.locked);
          return;
        }
        sfx('beep_ok');
        through = true;
      },
    });
    await this.waitUntil(() => through);
    chat.remove();
    this.scarn.setMode('locked');
    sfx('door');
    await Director.overlay?.fade(true, 350);
    this.guard(); // the chapter may have been stopped while the overlay played
    Director.overlay?.blackout(false);
  }

  private async hostages(): Promise<void> {
    this.room('D', 1700, 11, 'storage');
    ui.set({ hud: null });
    music.play('suspense', { fade: 1 });
    this.prop('cage', 800, 560);
    this.world.addWall(680, 420, 240, 150);
    const hs: Rig[] = [];
    for (const [id, x, y] of [
      ['hostage', 720, 520],
      ['hostage_b', 790, 530],
      ['hostage_c', 860, 520],
      ['hostage3', 900, 470],
    ] as [string, number, number][]) {
      const r = this.rig(id, x, y, -1);
      r.setAnim('idle', 'tied');
      hs.push(r);
    }
    this.speaker('hostage', hs[0]);
    this.speaker('kevin', hs[1]);
    this.speaker('pam', hs[2]);
    this.speaker('hostage3', hs[3]);
    this.scarn.setMode('explore');
    this.objective('Find the hostages');
    let found = false;
    this.interact({ x: 620, y: 560, r: 150, label: 'Talk to the hostages', once: true, onUse: async () => void (found = true) });
    await this.waitUntil(() => found);
    this.scarn.setMode('locked');
    this.letterbox(true);
    await this.say(L.d1);
    await this.say(L.d2);
    await this.say(L.d3);
    this.scarn.rig.setFacing(1);
    await this.say(L.d4);
    await this.say(L.kv1);
    await this.say(L.d5);
    await this.say(L.d6);
    await this.say(L.d7);
    this.samuel.following = false;
    await walkActor(this, this.samuel, 640, 600, 220);
    this.samuel.rig.strike('thinking');
    sfx('alarm');
    this.shake(200, 0.004);
    await this.say(L.pa1);
    this.scarn.rig.strike('heroic');
    await this.say(L.d8);
    this.letterbox(false);
    this.scarn.setMode('explore');
    this.objective('Go to the boiler room');
    await this.door(1650, 'Enter the boiler room');
  }

  private async lair(): Promise<void> {
    this.room('E', 1400, 14, 'boiler', 200);
    ui.set({ hud: null });
    this.samuel.destroy();
    music.play('boss', { fade: 0.3 });
    const combat = new Combat(this);
    this.scarn.combat = combat;
    this.prop('goldchair', 1150, 470);
    this.prop('trophy', 1260, 440);
    this.prop('trophy', 1050, 440);
    this.prop('fogmachine', 150, 660);
    ensureProp(this, 'dust');
    this.add.particles(150, 650, 'dust', { speedX: { min: 20, max: 80 }, speedY: { min: -20, max: -5 }, lifespan: 4000, alpha: { start: 0.35, end: 0 }, scale: { start: 1 / R, end: 5 / R }, frequency: 90 }).setDepth(700);
    this.cameras.main.stopFollow();
    this.cameras.main.setScroll(60, 0);
    const gf = new Goldenface(this, combat, this.scarn, 1100, 520);
    gf.script(true);
    const h3 = this.rig('hostage3', 1300, 560, -1);
    h3.setAnim('idle', 'tied');
    this.speaker('hostage3', h3);
    this.scarn.setMode('locked');
    this.letterbox(true);
    const introSeen = save.get().flags.ch06_intro === true;
    if (!introSeen) {
      await walkActor(this, this.scarn, 420, 560, 200);
      await this.say(L.e1);
      await this.say(L.e2);
      await this.say(L.e3);
      await this.say(L.e4);
      gf.rig.strike('aim');
      gf.rig.aimAngle = Math.atan2(h3.y - gf.y, h3.x - gf.x);
      await this.say(L.e5);
      // The most expensive shot in the movie. Michael shows it from four angles.
      const takes: [string, number, typeof L.dir1 | null][] = [
        ['', 1, null],
        ['INSTANT REPLAY', 1.4, L.dir1],
        ['REPLAY (ANGLE 2)', 1.9, L.dir2],
        ["REPLAY (DIRECTOR'S CUT)", 1.2, null],
      ];
      for (const [label, zoom, note] of takes) {
        h3.setAnim('idle', 'tied').setExpression('idle');
        h3.snap();
        if (note) await this.say(note);
        if (label) this.detach(this.card({ kind: 'stamp', title: label }, 1000));
        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(label.includes('ANGLE 2') ? 1180 : 1300, 420);
        const slow = label.includes('DIRECTOR');
        sfx('shoot');
        this.flash(0xffe08a, 80, 0.4);
        h3.strike('hurt');
        h3.setExpression('shock');
        await this.wait(slow ? 700 : 250);
        h3.setAnim('down');
        sfx('knockdown');
        this.shake(120, 0.004);
        await this.wait(slow ? 1500 : 700);
      }
      await this.say(L.dir3);
      unlockAchievement('hostage3');
      this.cameras.main.setZoom(1);
      this.cameras.main.setScroll(60, 0);
      gf.rig.aimAngle = null;
      this.scarn.rig.setExpression('shock');
      await this.say(L.e6);
      this.scarn.rig.setExpression('idle');
      gf.rig.strike('victory');
      await this.say(L.bs1);
      await this.say(L.bs2);
      await this.say(L.bs3);
      await this.say(L.e7);
      // THE PUCK. Triple crash zoom.
      for (const [line, target] of [
        [L.e8, gf.rig],
        [L.e9, this.scarn.rig],
        [L.e10, gf.rig],
        [L.e11, this.scarn.rig],
      ] as const) {
        music.stinger('dun');
        await this.crashZoom(target.x, target.y - 120, 1.3 + Math.random() * 0.5);
        await this.say(line);
      }
      await this.zoomTo(1, 250);
      this.cameras.main.setScroll(60, 0);
      await this.say(L.e12);
      await this.say(L.e13);
      await this.say(L.e14);
      setFlag('ch06_intro', true);
    }
    h3.destroy();
    this.letterbox(false);
    this.scarn.setMode('combat', combat);
    this.scarn.place(420, 560);
    this.objective('Defeat Goldenface! His shield drops when he stops to admire himself');
    gf.script(false);
    const monos = [L.mono1, L.mono2, L.mono3];
    let m = 0;
    gf.onMonologue = () => this.bark(monos[m++ % monos.length]);
    let kills = 0;
    combat.onKill = () => {
      kills++;
      if (kills === 1) this.bark(L.bark1);
      if (kills === 3) this.bark(L.bark2);
    };
    let catherineDone = false;
    let finale = false;
    gf.onPhase = (p) => {
      if (p === 2) {
        this.bark(L.mono4);
        for (const [x, y] of [
          [-40, 460],
          [1440, 640],
        ])
          new Goon(this, combat, this.scarn, x, y, { enterTo: { x: x < 0 ? 200 : 1200, y }, hp: 2 });
      }
      if (p === 3 && !catherineDone) {
        catherineDone = true;
        this.detach(this.catherine(gf, combat));
      }
      if (p === 4) finale = true;
    };
    const god = () => {
      if (qa.god) {
        this.scarn.hp = this.scarn.maxHp;
        this.scarn.invuln = 1;
      }
      if (qa.skipFights && gf.phase < 4) gf.qaHit(3);
    };
    this.updaters.add(god);
    await this.waitUntil(() => finale && !this.busy);
    this.updaters.delete(god);
    combat.clearBullets();
    for (const a of combat.enemies()) if (a !== gf) a.damage(99, 1, 0);
    // Goldenface cheats.
    gf.script(true);
    ui.set({ boss: null });
    this.scarn.setMode('locked');
    this.letterbox(true);
    await this.say(L.fg1);
    // a memory of Catherine, in soft focus
    const unsoft = this.softFocus();
    this.sepia(true);
    await this.say(L.fg2);
    this.sepia(false);
    unsoft();
    this.scarn.rig.strike('slapWind');
    await this.say(L.fg3);
    // the puck. Goldenface simply... leans.
    ensureProp(this, 'puck');
    const puck = this.add.image(this.scarn.x + 40, this.scarn.y - 70, 'puck').setScale(1.6 / R).setDepth(9000);
    this.scarn.rig.strike('slapHit');
    sfx('slapshot');
    const gy = gf.y;
    this.tweens.add({ targets: gf, y: gy + 70, duration: 180, yoyo: true, hold: 260, ease: 'Quad.easeOut' });
    await this.tweenP({ targets: puck, x: gf.x + 700, y: gf.y - 110, angle: 720, duration: 650, ease: 'Linear' });
    puck.destroy();
    sfx('metal');
    await this.wait(250);
    await this.say(L.fg4);
    gf.rig.strike('aim');
    gf.rig.aimAngle = Math.atan2(this.scarn.y - gf.y, this.scarn.x - gf.x);
    await this.say(L.end1);
    // bullet time
    const b = this.add.image(gf.x - 40, gf.y - 78, 'goldbullet').setScale(1.4 / R).setDepth(9000);
    sfx('shoot');
    this.grayscale(true);
    await this.crashZoom((gf.x + this.scarn.x) / 2, this.scarn.y - 90, 1.25);
    await this.tweenP({ targets: b, x: this.scarn.x + 10, y: this.scarn.y - 80, duration: 2600, ease: 'Sine.easeInOut' });
    b.destroy();
    this.grayscale(false);
    sfx('mug_ting');
    this.flash(0xffffff, 250, 0.8);
    this.scarn.rig.strike('hurt');
    ensureProp(this, 'mug');
    const mugImg = this.add.image(this.scarn.x + 10, this.scarn.y - 80, 'mug').setScale(1.6 / R).setDepth(9001);
    this.tweens.add({ targets: mugImg, y: mugImg.y - 120, angle: 720, alpha: 0, duration: 1400 });
    await this.say(L.end2);
    this.scarn.rig.setAnim('down');
    sfx('knockdown');
    this.shake(200, 0.006);
    await this.say(L.end3);
    const sam = this.rig('samuel', -60, 600, 1);
    this.speaker('samuel', sam);
    this.detach(walkRig(this, sam, 250, 600, 360, 'run'));
    await this.say(L.end4);
    // gold smoke bomb
    sfx('small_boom');
    const smoke = this.add.circle(this.scarn.x, this.scarn.y - 60, 20, 0xffd24a, 0.8).setDepth(9500);
    await this.tweenP({ targets: smoke, radius: 900, alpha: 0.95, duration: 1200 });
    sam.setAnim('down');
    await this.say(L.end5);
    await Director.overlay?.fade(true, 1200);
    this.guard(); // the chapter may have been stopped while the overlay played
    this.letterbox(false);
  }

  private async catherine(gf: Goldenface, combat: Combat): Promise<void> {
    this.busy = true;
    gf.script(true);
    combat.clearBullets();
    for (const a of combat.enemies()) if (a !== gf) (a as Goon).dazzle?.(8);
    this.scarn.setMode('locked');
    this.scarn.vx = 0;
    this.scarn.vy = 0;
    music.play('sad', { fade: 0.6 });
    const unsoft = this.softFocus();
    this.sepia(true);
    await this.say(L.cat1);
    const cat = this.rig('catherine', 700, 470, -1);
    cat.setGhost(true);
    cat.setAlpha(0);
    this.speaker('catherine', cat);
    await this.tweenP({ targets: cat, alpha: 1, duration: 900 });
    await this.say(L.cat2);
    this.scarn.rig.strike('kneelSad');
    await this.say(L.cat3);
    this.objective(null);
    await mash(this, {
      label: 'REFUSE TO SURRENDER',
      need: 22,
      decay: 0.22,
      onPress: (f) => {
        if (f > 0.5) this.scarn.rig.strike('kneel');
        this.scarn.rig.flash(0xffcf3a, 50);
      },
    });
    await this.say(L.cat4);
    this.scarn.rig.strike('heroic');
    this.lensFlare(500, 200);
    await this.say(L.cat5);
    await this.tweenP({ targets: cat, alpha: 0, duration: 700 });
    cat.destroy();
    this.sepia(false);
    unsoft();
    music.play('boss', { fade: 0.4 });
    // powered up by love and dental hygiene
    this.scarn.rig.flash(0xffcf3a, 300);
    this.scarn.speed = 340;
    this.scarn.fireInterval = 0.11;
    this.scarn.setMode('combat', combat);
    this.objective('Finish him! (Shoot during his pauses for double damage)');
    gf.script(false);
    this.busy = false;
  }

  private async defeat(): Promise<void> {
    this.clearSet();
    this.setName = 'black';
    Director.overlay?.blackout(true);
    music.play('sad', { fade: 1 });
    await this.card({ kind: 'stamp', title: 'TO BE CONTINUED...' }, 2400);
    Director.overlay?.blackout(false);
  }
}
