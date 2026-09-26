import Phaser from 'phaser';
import type { ChapterScene } from '../systems/ChapterScene';
import type { Rig } from '../entities/Rig';
import { input, type Action } from '../systems/Input';
import { qa } from '../systems/qa';
import { buildChart, judge, accuracyOf, SPB, TOTAL_BEATS, sectionStarts, type Judgement, type Note } from './chart';
import { music } from '../../audio/music';
import { audio } from '../../audio/engine';
import { sfx } from '../../audio/sfx';
import { voice } from '../../audio/voice';
import { settings } from '../../state/settings';
import { ui } from '../../state/ui';
import type { Line } from '../../data/script/lines';

const LANES: { action: Action; label: string; color: number; pose: string }[] = [
  { action: 'left', label: '◀', color: 0xff5a7a, pose: 'danceLeft' },
  { action: 'down', label: '▼', color: 0x5ac8ff, pose: 'danceDown' },
  { action: 'action', label: 'SCARN', color: 0xffcf3a, pose: 'danceScarn' },
  { action: 'up', label: '▲', color: 0x7dff8a, pose: 'danceUp' },
  { action: 'right', label: '▶', color: 0xc38aff, pose: 'danceRight' },
];
const FONT = '"Bebas Neue", Impact, sans-serif';
const HIT_Y = 612;
const SPEED = 420; // px per second
const LANE_X0 = 70;
const LANE_W = 82;

export interface DanceResult {
  accuracy: number;
  maxCombo: number;
}

/**
 * The Scarn. Notes are scheduled on the audio clock (not frames), key presses
 * are time-stamped, and the player's latency offset is applied.
 */
export async function doTheScarn(scene: ChapterScene, scarn: Rig, dancers: Rig[], callouts: Partial<Record<string, Line>>, onJoin: (i: number) => void, forceAssist = false): Promise<DanceResult> {
  const assist = forceAssist || settings.get().assist;
  const chart = buildChart(assist);
  const judged: (Judgement | null)[] = chart.map(() => null);
  ui.set({ touchLayout: 'rhythm' });
  const objs: Phaser.GameObjects.GameObject[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor?.(0);
    (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(19980);
    objs.push(o);
    return o;
  };
  // highway
  add(scene.add.rectangle(LANE_X0 + (LANE_W * 5) / 2 - LANE_W / 2, 360, LANE_W * 5 + 20, 720, 0x0a0710, 0.72));
  LANES.forEach((l, i) => {
    const x = LANE_X0 + i * LANE_W;
    add(scene.add.rectangle(x, 360, 2, 720, 0xffffff, 0.08));
    const rec = add(scene.add.circle(x, HIT_Y, 30).setStrokeStyle(5, l.color, 0.9));
    rec.setData('lane', i);
    add(scene.add.text(x, HIT_Y + 52, i === 2 ? (ui.get().inputMode === 'kbm' ? 'SPACE' : 'A') : l.label, { fontFamily: FONT, fontSize: '22px', color: '#ffffff' }).setOrigin(0.5));
  });
  const receptors = objs.filter((o) => o.getData('lane') !== undefined) as Phaser.GameObjects.Arc[];
  const noteObjs = chart.map((n) => {
    const l = LANES[n.lane];
    const g = scene.add.container(LANE_X0 + n.lane * LANE_W, -100);
    const c = scene.add.circle(0, 0, n.lane === 2 ? 30 : 25, l.color).setStrokeStyle(4, 0x1b1420);
    const t = scene.add.text(0, 1, n.lane === 2 ? 'S' : l.label, { fontFamily: FONT, fontSize: n.lane === 2 ? '34px' : '28px', color: '#1b1420' }).setOrigin(0.5);
    g.add([c, t]);
    add(g);
    g.setVisible(false);
    return g;
  });
  const comboT = add(scene.add.text(LANE_X0 + 2 * LANE_W, 380, '', { fontFamily: FONT, fontSize: '64px', color: '#ffffff', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5));
  const judgeT = add(scene.add.text(LANE_X0 + 2 * LANE_W, 470, '', { fontFamily: FONT, fontSize: '46px', color: '#ffcf3a', stroke: '#000', strokeThickness: 7 }).setOrigin(0.5));
  // confidence meter (right edge)
  add(scene.add.rectangle(1230, 400, 34, 440, 0x111111, 0.85).setStrokeStyle(3, 0xffffff));
  const conf = add(scene.add.rectangle(1230, 617, 26, 4, 0xffcf3a).setOrigin(0.5, 1));
  add(scene.add.text(1230, 160, 'CONFIDENCE', { fontFamily: FONT, fontSize: '24px', color: '#ffffff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setRotation(0));
  const title = add(scene.add.text(820, 40, '♪ DO THE SCARN ♪', { fontFamily: FONT, fontSize: '44px', color: '#ffcf3a', stroke: '#000', strokeThickness: 7 }).setOrigin(0.5));

  let combo = 0;
  let maxCombo = 0;
  let confidence = 0.1;
  let joined = 0;
  let lastPose = 'stand';
  const starts = sectionStarts();
  const calledSections = new Set<number>();
  const sectionCall: Record<number, string> = { 1: 'call1', 2: 'call2', 3: 'call3', 4: 'call4', 5: 'call5', 6: 'call6', 7: 'call7' };

  music.play('scarn', { force: true, fade: 0 });
  const lat = () => (audio.ctx?.outputLatency || audio.ctx?.baseLatency || 0) + settings.get().rhythmOffsetMs / 1000;
  const songNow = () => music.songTime() - lat();
  const perfToSong = (perf: number) => songNow() - (performance.now() - perf) / 1000;
  const endAt = TOTAL_BEATS * SPB + 0.5;
  const setDance = (pose: string) => {
    lastPose = pose;
    scarn.setAnim('pose', pose);
    dancers.forEach((d, i) => {
      if (!d.getData('joined')) return;
      const lag = 60 + ((i * 37) % 90) + (i === 2 ? 180 : 0); // the one extra always slightly late
      scene.time.delayedCall(lag, () => d.active && d.setAnim('pose', pose));
    });
  };
  const flash = (lane: number, j: Judgement) => {
    const r = receptors[lane];
    r.setScale(1.35);
    scene.tweens.add({ targets: r, scale: 1, duration: 120 });
    judgeT.setText(j === 'perfect' ? 'PERFECT!' : j === 'good' ? 'GOOD' : j === 'ok' ? 'OK' : 'MISS').setColor(j === 'miss' ? '#ff6060' : j === 'perfect' ? '#7dff8a' : '#ffcf3a');
    judgeT.setScale(1.3).setAlpha(1);
    scene.tweens.add({ targets: judgeT, scale: 1, alpha: 0.85, duration: 150 });
  };
  const applyJudge = (i: number, j: Judgement) => {
    judged[i] = j;
    const n = chart[i];
    noteObjs[i].setVisible(false);
    flash(n.lane, j);
    if (j === 'miss') {
      combo = 0;
      confidence = Math.max(0, confidence - 0.03);
      sfx('miss', 0, 60);
      scarn.gesture('hurt', 200);
    } else {
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      confidence = Math.min(1, confidence + (j === 'perfect' ? 0.014 : j === 'good' ? 0.011 : 0.006));
      if (j === 'perfect') sfx('perfect', 0, 30);
      setDance(LANES[n.lane].pose);
      if (n.lane === 2) {
        scarn.spin = 0;
        scene.tweens.add({ targets: scarn, spin: 360, duration: 300, onComplete: () => (scarn.spin = 0) });
        if (combo % 8 === 0) scene.lensFlare(scarn.x - scene.cameras.main.scrollX, 200);
      }
    }
    comboT.setText(combo >= 4 ? `${combo}` : '');
  };

  await scene.frameLoop((_dt, done) => {
    const t = songNow();
    // callouts at section starts (hype man Billy)
    for (const s of starts) {
      if (!calledSections.has(s.index) && t >= s.beat * SPB - 0.2 && sectionCall[s.index]) {
        calledSections.add(s.index);
        const line = callouts[sectionCall[s.index]];
        if (line) {
          void voice.play(line.id);
          if (settings.get().subtitles) ui.set({ caption: { id: Date.now(), text: `BILLY: ${line.text}` } });
        }
      }
    }
    // input: match each pressed lane to its nearest unjudged note
    LANES.forEach((l, lane) => {
      const pressed = lane === 2 ? input.pressed('action') || input.pressed('interact') : input.pressed(l.action);
      if (!pressed) return;
      const pt = perfToSong(input.pressTime(lane === 2 && !input.pressed('action') ? 'interact' : l.action));
      let best = -1;
      let bd = 9;
      for (let i = 0; i < chart.length; i++) {
        if (judged[i] || chart[i].lane !== lane) continue;
        const d = Math.abs(chart[i].beat * SPB - pt);
        if (d < bd) {
          bd = d;
          best = i;
        }
        if (chart[i].beat * SPB - pt > 0.5) break;
      }
      if (best >= 0 && bd <= 0.3) applyJudge(best, judge(chart[best].beat * SPB - pt, assist));
      else {
        receptors[lane].setScale(1.15);
        scene.tweens.add({ targets: receptors[lane], scale: 1, duration: 90 });
        setDance(l.pose); // freestyle is allowed; it just isn't scored
      }
    });
    // notes (after input, so a late-but-valid press in this frame is judged before the miss check)
    for (let i = 0; i < chart.length; i++) {
      if (judged[i]) continue;
      const nt = chart[i].beat * SPB;
      const dy = (nt - t) * SPEED;
      const o = noteObjs[i];
      if (dy < 760 && dy > -80) {
        o.setVisible(true);
        o.setY(HIT_Y - dy);
      }
      if (qa.autoWin && t >= nt) applyJudge(i, 'perfect');
      else if (t - nt > (assist ? 0.26 : 0.16)) applyJudge(i, 'miss');
    }
    // bar patrons join as the song (and your confidence) builds
    const progress = Phaser.Math.Clamp(t / endAt, 0, 1);
    const shouldJoin = Math.min(dancers.length, Math.floor(progress * (dancers.length + 1) * (0.55 + confidence * 0.7)));
    while (joined < shouldJoin) {
      dancers[joined].setData('joined', true);
      dancers[joined].setAnim('pose', lastPose);
      onJoin(joined);
      joined++;
    }
    conf.height = Math.max(4, confidence * 432);
    conf.setFillStyle(confidence > 0.7 ? 0x7dff8a : 0xffcf3a);
    title.setScale(1 + Math.max(0, Math.sin(t * Math.PI * 2 / SPB)) * 0.04);
    scarn.bob = Math.abs(Math.sin((t * Math.PI) / SPB)) * -6;
    if (t > endAt) done();
  });
  scarn.bob = 0;
  // everyone left joins for the finale
  while (joined < dancers.length) onJoin(joined++);
  objs.forEach((o) => o.destroy());
  ui.set({ touchLayout: 'none', caption: null });
  const js = judged.map((j) => j ?? 'miss');
  return { accuracy: accuracyOf(js, chart.length), maxCombo };
}

export type { Note };
