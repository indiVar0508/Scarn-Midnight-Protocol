import Phaser from 'phaser';
import { ChapterScene, type Beat } from '../systems/ChapterScene';
import { World } from '../systems/World';
import { walkRig } from '../systems/Moves';
import { mash } from '../minigames/Mash';
import { paintHospital } from '../art/backgrounds';
import { POSES, BASE_POSE, type Pose } from '../entities/Rig';
import { CH07 as L } from '../../data/script/ch07';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { Director } from '../Director';

const W = 1400;

export class Ch07 extends ChapterScene {
  readonly chapter = 7;

  constructor() {
    super('Ch07');
  }

  beats(): Beat[] {
    return [{ id: 'wake', run: () => this.wake() }];
  }

  private async wake(): Promise<void> {
    this.useSet('hospital', () => {
      this.world = new World(W, 410, 690);
      this.background('bg_hospital', () => paintHospital(W));
      this.prop('bed', 640, 600);
      this.prop('iv', 420, 560);
      this.prop('sidetable', 900, 560);
      this.prop('laptopECG', 900, 492).setDepth(561);
      this.cameras.main.setScroll(40, 0);
    });
    Director.overlay?.blackout(true);
    music.play('hospital', { fade: 2 });
    // ECG readout (it is a laptop screensaver)
    const bpmText = this.add.text(900, 400, 'BPM 62', { fontFamily: '"VT323", monospace', fontSize: '30px', color: '#3cff6a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(9000);
    const warn = this.add.text(900, 368, '', { fontFamily: '"Bebas Neue", Impact, sans-serif', fontSize: '28px', color: '#ff4040', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(9000);
    let bpm = 62;
    let beatT = 0;
    this.updaters.add((dt) => {
      beatT -= dt;
      if (beatT <= 0) {
        beatT = 60 / bpm;
        sfx(bpm > 140 ? 'heart_alarm' : 'heart', 0.3, 60);
        this.tweens.add({ targets: bpmText, scale: { from: 1.25, to: 1 }, duration: 160 });
      }
      bpmText.setText(`BPM ${Math.round(bpm)}`);
    });
    // Scarn in bed; we drive his pose directly (lying -> sitting)
    const scarn = this.rig('scarn_gown', 650, 560, 1);
    scarn.frozen = true;
    this.speaker('scarn', scarn);
    const lie: Pose = { ...BASE_POSE, ...POSES.lieBack, y: -18 };
    const sit: Pose = { ...BASE_POSE, ...POSES.sit, y: 6 };
    const setP = (p: number) => {
      const k = Phaser.Math.Easing.Sine.InOut(Phaser.Math.Clamp(p, 0, 1));
      (Object.keys(sit) as (keyof Pose)[]).forEach((key) => (scarn.pose[key] = lie[key] + (sit[key] - lie[key]) * k));
      scarn.applyPose();
    };
    setP(0);
    scarn.setExpression('blink');
    const nurse = this.rig('nurse', 1040, 600, -1);
    this.speaker('nurse', nurse);
    await this.wait(700);
    await Director.overlay?.fade(false, 1200);
    Director.overlay?.blackout(false);
    this.letterbox(true);
    await this.say(L.n1);
    scarn.setExpression('idle');
    await this.say(L.m1);
    await this.say(L.n2);
    await this.say(L.m2);
    this.letterbox(false);
    // injury report card
    const card = this.add.container(640, 250).setScrollFactor(0).setDepth(19990);
    const paper = this.add.rectangle(0, 0, 440, 260, 0xfbfbf4).setStrokeStyle(4, 0x1b1420).setRotation(0.03);
    const tx = this.add
      .text(-200, -110, 'PATIENT: M. SCARN\n• Gunshot to chest (deflected by mug)\n• 3 broken ribs (minimum)\n• Mild concussion\n• Burned foot (George Foreman grill,\n   unrelated)\n• Ego: CRITICAL', {
        fontFamily: '"Special Elite", "Courier New", monospace',
        fontSize: '19px',
        color: '#222',
        lineSpacing: 6,
      })
      .setRotation(0.03);
    card.add([paper, tx]);
    const said = new Set<number>();
    await mash(this, {
      label: 'SIT UP',
      need: 26,
      decay: 0.2,
      y: 640,
      onTick: (f) => {
        setP(f);
        bpm = 62 + f * 120;
        warn.setText(f > 0.8 ? 'DO NOT SIT UP' : f > 0.55 ? 'PLEASE STOP' : f > 0.3 ? 'CONCERNING' : '');
        const lines = [
          [0.25, L.n3],
          [0.5, L.n4],
          [0.68, L.n5],
          [0.85, L.n6],
        ] as const;
        lines.forEach(([th, line], i) => {
          if (f > th && !said.has(i)) {
            said.add(i);
            this.bark(line);
            nurse.gesture('cower', 800);
          }
        });
      },
      onPress: () => scarn.setExpression(Math.random() > 0.5 ? 'hurt' : 'shock'),
    });
    card.destroy();
    warn.setText('');
    bpm = 90;
    setP(1);
    scarn.setExpression('idle');
    scarn.frozen = false;
    scarn.setAnim('pose', 'sit');
    await this.wait(400);
    // stands up dramatically
    scarn.setPosition(700, 610);
    scarn.setAnim('pose', 'heroic');
    this.lensFlare(700, 220);
    sfx('pose');
    await this.say(L.m3);
    scarn.setAnim('down');
    sfx('knockdown');
    this.shake(120, 0.004);
    await this.wait(500);
    scarn.setAnim('pose', 'heroic');
    await this.say(L.m4);
    const sam = this.rig('samuel', 1400, 600, -1);
    this.speaker('samuel', sam);
    sam.hold('flowers', 0, 0, 0);
    await walkRig(this, sam, 880, 610, 260);
    await this.say(L.s1);
    await this.say(L.m5);
    await this.say(L.s2);
    scarn.strike('fingerguns');
    await this.say(L.m6);
    await this.freezeFrame('DISCHARGED (AGAINST ADVICE).', 1500);
  }
}
