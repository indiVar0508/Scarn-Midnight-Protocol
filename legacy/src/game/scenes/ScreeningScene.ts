import Phaser from 'phaser';
import { Director } from '../Director';
import { paintScreening } from '../art/backgrounds';
import { registerCanvas } from '../art/props';
import { makeCanvas, ellipse, blob, rr, text } from '../art/canvas';
import { Rig } from '../entities/Rig';
import { sfx, ambience } from '../../audio/sfx';
import { music } from '../../audio/music';
import { caption, ui } from '../../state/ui';
import { settings } from '../../state/settings';
import { input } from '../systems/Input';
import { chapterById } from '../../data/chapters';

/**
 * SCREENING MODE: between chapters we cut to the conference room where the
 * office is watching Michael's movie. Stylized silhouettes only.
 */
type Hair = 'tallFlop' | 'midPart' | 'long' | 'bun' | 'round' | 'bald' | 'messy' | 'swoop' | 'curly' | 'receding' | 'bob';

const AUDIENCE: { hair: Hair; x: number; row: number; w: number; h: number }[] = [
  { hair: 'midPart', x: 250, row: 0, w: 1, h: 1 },
  { hair: 'tallFlop', x: 380, row: 0, w: 1.05, h: 1.15 },
  { hair: 'long', x: 500, row: 0, w: 0.95, h: 0.95 },
  { hair: 'bun', x: 780, row: 0, w: 0.85, h: 0.85 },
  { hair: 'round', x: 900, row: 0, w: 1.3, h: 1 },
  { hair: 'bald', x: 1030, row: 0, w: 1.1, h: 1 },
  { hair: 'swoop', x: 180, row: 1, w: 1, h: 1 },
  { hair: 'curly', x: 420, row: 1, w: 1.05, h: 0.95 },
  { hair: 'messy', x: 660, row: 1, w: 1, h: 1 },
  { hair: 'bob', x: 860, row: 1, w: 0.95, h: 0.95 },
  { hair: 'receding', x: 1180, row: 1, w: 1, h: 1 },
];

// After each chapter: [caption, reaction]
const REACTIONS: Record<number, [string, 'laugh' | 'silence' | 'clap' | 'gasp' | 'cough' | 'sparse']> = {
  1: ['[Stanley, flatly: "I did not agree to narrate this."]', 'laugh'],
  2: ['[Darryl, quietly: "Wait. I own the stadium?"]', 'cough'],
  3: ['[Creed: "I don\'t remember filming this. Or that cabin."]', 'sparse'],
  4: ['[Jim looks directly into the camera]', 'silence'],
  5: ['[whispering: "is that Jan?"]', 'laugh'],
  6: ['[Toby, very quietly: "Four times?"]', 'gasp'],
  7: ['[Pam, to her mother: "Mom."]', 'laugh'],
  8: ['[Dwight: "Samuel is clearly a robot. Clearly."]', 'gasp'],
  9: ['[the entire room claps along. Andy does the harmonies.]', 'clap'],
  10: ['[standing ovation (one person, same person)]', 'clap'],
};

function paintHead(hair: Hair, turned: boolean): HTMLCanvasElement {
  const { c, g } = makeCanvas(140, 150);
  const col = '#07070a';
  // shoulders
  blob(g, [10, 150, 20, 108, 50, 96, 90, 96, 120, 108, 130, 150]);
  g.fillStyle = col;
  g.fill();
  // head
  ellipse(g, 70, 64, 30, 36);
  g.fill();
  g.fillStyle = col;
  switch (hair) {
    case 'tallFlop':
      blob(g, [38, 58, 40, 24, 70, 14, 104, 26, 102, 56, 90, 40, 70, 34, 50, 40]);
      g.fill();
      break;
    case 'midPart':
      blob(g, [40, 56, 42, 30, 70, 22, 98, 30, 100, 56, 70, 36]);
      g.fill();
      g.strokeStyle = 'rgba(120,120,140,0.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(40, 64);
      g.lineTo(30, 66);
      g.moveTo(100, 64);
      g.lineTo(110, 66);
      g.stroke();
      break;
    case 'long':
      blob(g, [36, 110, 34, 50, 50, 26, 90, 26, 106, 50, 104, 110, 90, 80, 50, 80]);
      g.fill();
      break;
    case 'bun':
      ellipse(g, 70, 26, 16, 14);
      g.fill();
      break;
    case 'round':
      ellipse(g, 70, 62, 38, 40);
      g.fill();
      break;
    case 'messy':
      for (const [x, y] of [[44, 38], [58, 26], [78, 24], [96, 36], [100, 54], [40, 56]]) {
        ellipse(g, x, y, 12, 10);
        g.fill();
      }
      break;
    case 'swoop':
      blob(g, [40, 50, 50, 22, 92, 20, 108, 40, 80, 34, 50, 46]);
      g.fill();
      break;
    case 'curly':
    case 'bob':
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        ellipse(g, 70 + Math.cos(a) * 34, 60 + Math.sin(a) * 36, hair === 'curly' ? 14 : 18, hair === 'curly' ? 14 : 20);
        g.fill();
      }
      break;
    case 'bald':
    case 'receding':
      break;
  }
  // rim light from the projector
  g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, 0, 0, 150);
  gr.addColorStop(0, 'rgba(160,190,255,0.35)');
  gr.addColorStop(0.2, 'rgba(160,190,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 140, 150);
  g.globalCompositeOperation = 'source-over';
  if (turned) {
    // the camera look: a deadpan face lit by the projector
    ellipse(g, 70, 66, 26, 32);
    g.fillStyle = '#c9a489';
    g.fill();
    g.fillStyle = '#1b1420';
    ellipse(g, 60, 62, 3, 3.5);
    g.fill();
    ellipse(g, 80, 62, 3, 3.5);
    g.fill();
    g.fillRect(58, 82, 24, 2.5);
    g.strokeStyle = '#1b1420';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(54, 52);
    g.lineTo(66, 54);
    g.moveTo(74, 53);
    g.lineTo(86, 50);
    g.stroke();
    blob(g, [40, 58, 42, 28, 70, 18, 102, 28, 100, 58, 88, 40, 70, 34, 52, 40]);
    g.fillStyle = '#3a2618';
    g.fill();
  }
  return c;
}

export class ScreeningScene extends Phaser.Scene {
  private next = 1;
  private after = 0;
  private stopAmb: (() => void) | null = null;
  private done = false;
  private startAt = 0;

  constructor() {
    super({ key: 'Screening' });
  }

  init(data: { next: number; after: number }): void {
    this.next = data.next;
    this.after = data.after;
    this.done = false;
  }

  create(): void {
    this.startAt = this.time.now;
    if (!this.textures.exists('bg_screening')) registerCanvas(this, 'bg_screening', paintScreening());
    this.add.image(0, 0, 'bg_screening').setOrigin(0);
    ui.set({ touchLayout: 'buttons' });
    music.stop(0.6);
    this.stopAmb = ambience('projector');
    sfx('projector');

    // what's on the screen: a frozen frame title of the chapter just watched
    const info = chapterById(this.after);
    const { c, g } = makeCanvas(700, 360);
    const gr = g.createLinearGradient(0, 0, 0, 360);
    gr.addColorStop(0, '#2a3348');
    gr.addColorStop(1, '#0e1220');
    g.fillStyle = gr;
    g.fillRect(0, 0, 700, 360);
    rr(g, 30, 250, 640, 80, 4);
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fill();
    text(g, `CHAPTER ${info.id}: ${info.title.toUpperCase()}`, 350, 290, { size: 30, color: '#ffcf3a' });
    text(g, '— THE END (OF THIS PART) —', 350, 318, { size: 14, color: '#fff', font: '"Courier New", monospace' });
    const key = `scr_frame_${this.after}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, c);
    this.add.image(640, 230, key).setDisplaySize(710, 370).setAlpha(0.95);
    // projector beam
    const beam = this.add.triangle(640, 360, 0, -330, -360, 360, 360, 360, 0xbfd4ff, 0.05).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: beam, alpha: 0.08, duration: 90, yoyo: true, repeat: -1 });

    // Michael, standing proudly by the screen
    const mike = new Rig(this, 1120, 560, 'scarn', { facing: -1, scale: 1.25 });
    mike.setAnim('pose', 'handsHips');
    mike.tint(0x6a6a88);

    // audience from behind
    const heads: Phaser.GameObjects.Image[] = [];
    const reaction = REACTIONS[this.after] ?? ['[silence]', 'silence'];
    const lookIdx = 1;
    AUDIENCE.forEach((a, i) => {
      const k = `scr_${a.hair}`;
      if (!this.textures.exists(k)) this.textures.addCanvas(k, paintHead(a.hair, false));
      const y = a.row === 0 ? 600 : 700;
      const im = this.add.image(a.x, y, k).setOrigin(0.5, 1).setScale(a.w * (a.row ? 1.25 : 1), a.h * (a.row ? 1.25 : 1));
      heads.push(im);
      if (reaction[1] === 'laugh' && i % 3 !== 1) this.tweens.add({ targets: im, y: y - 4, duration: 120, yoyo: true, repeat: 8, delay: 400 + i * 40 });
      if (reaction[1] === 'clap') this.tweens.add({ targets: im, y: y - 6, duration: 200, yoyo: true, repeat: 10, delay: i * 30 });
      if (reaction[1] === 'gasp') this.tweens.add({ targets: im, y: y + 6, scaleY: im.scaleY * 0.97, duration: 160, delay: 300 + i * 20 });
    });
    // one of them turns to look at the camera
    if (!this.textures.exists('scr_turn')) this.textures.addCanvas('scr_turn', paintHead('tallFlop', true));
    this.time.delayedCall(1600, () => {
      const h = heads[lookIdx];
      h.setTexture('scr_turn');
      this.tweens.add({ targets: h, scaleX: { from: 0.2, to: h.scaleX }, duration: 180 });
    });

    // Michael's reaction
    this.time.delayedCall(900, () => {
      if (reaction[1] === 'silence') mike.setAnim('pose', 'thinking');
      else mike.setAnim('pose', reaction[1] === 'clap' ? 'victory' : 'heroic');
      mike.setExpression(reaction[1] === 'silence' ? 'idle' : 'smile');
    });

    // sound
    this.time.delayedCall(500, () => {
      switch (reaction[1]) {
        case 'silence':
          sfx('crickets');
          break;
        case 'cough':
          sfx('cough', 0.4);
          break;
        case 'sparse':
          sfx('sparse_applause');
          break;
        case 'clap':
          sfx('applause');
          break;
        case 'gasp':
          sfx('crowd_ooh');
          break;
        case 'laugh':
          sfx('cheer_small');
          break;
      }
      if (settings.get().subtitles) caption(reaction[0], 3600);
    });

    this.add
      .text(24, 690, 'SCREENING MODE · press any key to skip · can be turned off in Settings', { fontFamily: 'Arial', fontSize: '14px', color: '#8a8fa0' })
      .setOrigin(0, 1);

    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.time.delayedCall(5200, () => this.finish());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopAmb?.());
  }

  update(): void {
    if (this.time.now - this.startAt > 900 && (input.pressed('action') || input.pressed('interact') || input.pressed('fire') || input.pressed('back'))) this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.stopAmb?.();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(320, () => void Director.startChapter(this.next));
  }
}

