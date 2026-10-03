import type { ChapterScene } from '../systems/ChapterScene';
import { input, type Action } from '../systems/Input';
import { qa } from '../systems/qa';
import { sfx } from '../../audio/sfx';
import { settings } from '../../state/settings';
import { ui } from '../../state/ui';

const FONT = '"VT323", "Courier New", monospace';
const ARROWS: { a: Action; s: string }[] = [
  { a: 'up', s: '▲' },
  { a: 'down', s: '▼' },
  { a: 'left', s: '◀' },
  { a: 'right', s: '▶' },
];

/**
 * Samuel "hacks the mainframe" (a keyboard taped to a wall). The player types
 * the arrow sequence he reads out. Retries until it works; never a dead end.
 */
export async function hack(scene: ChapterScene, length = 6): Promise<void> {
  ui.set({ touchLayout: 'rhythm' });
  const bg = scene.add.rectangle(640, 360, 760, 360, 0x021a0a, 0.95).setStrokeStyle(4, 0x3cff6a).setScrollFactor(0).setDepth(19990);
  const title = scene.add.text(640, 220, 'SAMUEL.EXE — HACKING THE MAINFRAME', { fontFamily: FONT, fontSize: '34px', color: '#6cff9a' }).setOrigin(0.5).setScrollFactor(0).setDepth(19991);
  const seqT = scene.add.text(640, 330, '', { fontFamily: FONT, fontSize: '80px', color: '#6cff9a' }).setOrigin(0.5).setScrollFactor(0).setDepth(19991);
  const info = scene.add.text(640, 430, '', { fontFamily: FONT, fontSize: '30px', color: '#c8ffd8' }).setOrigin(0.5).setScrollFactor(0).setDepth(19991);
  const objs = [bg, title, seqT, info];
  const time = settings.get().assist ? 9 : 6;
  for (;;) {
    const seq = Array.from({ length }, () => ARROWS[Math.floor(Math.random() * 4)]);
    let idx = 0;
    let t = time;
    let failed = false;
    const render = () =>
      seqT.setText(
        seq
          .map((x, i) => (i < idx ? '█' : x.s))
          .join(' '),
      );
    render();
    info.setText(`Type the sequence with the ARROW KEYS · ${t.toFixed(1)}s`);
    await scene.frameLoop((dt, done) => {
      t -= dt;
      info.setText(`Type the sequence with the ARROW KEYS · ${Math.max(0, t).toFixed(1)}s`);
      if (qa.autoWin) {
        idx = length;
        done();
        return;
      }
      for (const x of ARROWS) {
        if (input.pressed(x.a)) {
          if (x.a === seq[idx].a) {
            idx++;
            sfx('hack_key', 0, 20);
            render();
          } else {
            failed = true;
            sfx('beep_bad');
          }
          break;
        }
      }
      if (idx >= length || failed || t <= 0) done();
    });
    if (idx >= length) {
      sfx('beep_ok');
      seqT.setText('ACCESS GRANTED');
      info.setText('beep boop — I mean, done.');
      await scene.wait(900);
      break;
    }
    seqT.setText(failed ? 'WRONG KEY' : 'TIMEOUT');
    info.setText('Samuel: "Again, sir. Slower. I am being very patient."');
    await scene.wait(1000);
  }
  objs.forEach((o) => o.destroy());
  ui.set({ touchLayout: 'buttons' });
}
