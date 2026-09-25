import Phaser from 'phaser';
import type { ChapterScene } from '../systems/ChapterScene';
import type { Scarn } from '../entities/Scarn';
import type { Rig } from '../entities/Rig';
import { MiniHud } from './common';
import { input } from '../systems/Input';
import { qa } from '../systems/qa';
import { ctl } from '../systems/controlsText';
import { ensureProp } from '../art/props';
import { R } from '../art/characters';
import { sfx } from '../../audio/sfx';
import { settings } from '../../state/settings';
import { ui } from '../../state/ui';

const assist = () => settings.get().assist;

async function autoWin(scene: ChapterScene, hud: MiniHud): Promise<number | null> {
  if (!qa.autoWin) return null;
  await scene.wait(900);
  hud.destroy();
  return 86;
}

// ---------------------------------------------------------------- 1. MOP THE ICE
export async function mopIce(scene: ChapterScene, scarn: Scarn): Promise<number> {
  const hud = new MiniHud(scene, 'DRILL 1: CLEAN THE ICE', `Move with ${ctl('move')} over the dirty patches. Back and forth. Wax on.`);
  const aw = await autoWin(scene, hud);
  if (aw !== null) return aw;
  scarn.setMode('explore');
  scarn.canPose = false;
  scarn.rig.hold('mop', 0, -4, 0.2);
  scarn.speed = 340;
  const patches: { x: number; y: number; r: number; dirt: number; g: Phaser.GameObjects.Ellipse }[] = [];
  const pts = [
    [220, 470], [420, 610], [560, 450], [760, 560], [930, 640], [1080, 460], [300, 650], [680, 660], [1150, 600], [480, 540], [880, 420], [1020, 560],
  ];
  for (const [x, y] of pts) {
    const r = 34 + Math.random() * 18;
    const g = scene.add.ellipse(x, y, r * 2.4, r * 1.1, 0x6a4a2a, 0.75).setDepth(402);
    patches.push({ x, y, r, dirt: 1, g });
  }
  let t = 20;
  const total = patches.length;
  await scene.frameLoop((dt, done) => {
    t -= dt;
    hud.setTime(t);
    const mx = scarn.x + scarn.rig.facing * 44;
    const my = scarn.y;
    const moving = Math.hypot(scarn.vx, scarn.vy) > 60;
    let left = 0;
    for (const p of patches) {
      if (p.dirt <= 0) continue;
      const d = Math.hypot((mx - p.x) / 1.2, (my - p.y) * 1.3);
      if (moving && d < p.r + 26) {
        p.dirt -= dt * (assist() ? 2.4 : 1.7);
        if (Math.random() < 0.3) sfx('skate', 0, 120);
        if (p.dirt <= 0) {
          sfx('sparkle');
          hud.popup(p.x, p.y - 30, 'SPARKLING', '#9ff', false);
        }
      }
      p.g.setAlpha(Math.max(0, p.dirt) * 0.75);
      left += Math.max(0, p.dirt);
    }
    const frac = 1 - left / total;
    hud.meter(frac, 'ICE CLEANLINESS');
    hud.setScore(`${Math.round(frac * 100)}%`);
    if (t <= 0 || left <= 0.001) done();
  });
  const cleaned = 1 - patches.reduce((a, p) => a + Math.max(0, p.dirt), 0) / total;
  patches.forEach((p) => p.g.destroy());
  scarn.rig.hold(null);
  scarn.setMode('locked');
  scarn.speed = 300;
  hud.destroy();
  return Math.round(cleaned * 100);
}

// ---------------------------------------------------------------- 2. STICK HANDLING
export async function stickHandle(scene: ChapterScene, scarn: Scarn): Promise<number> {
  const hud = new MiniHud(scene, 'DRILL 2: STICK HANDLING', `Press ${ui.get().inputMode === 'touch' ? '◀ / ▶' : 'LEFT / RIGHT'} as the puck reaches each side.`);
  const aw = await autoWin(scene, hud);
  if (aw !== null) return aw;
  ensureProp(scene, 'puck');
  ui.set({ touchLayout: 'rhythm' });
  scarn.setMode('locked');
  scarn.rig.hold('stick', 0, 0, -0.4);
  scarn.rig.setAnim('pose', 'crouch');
  const cx = scarn.x;
  const cy = scarn.y + 20;
  const puck = scene.add.image(cx, cy, 'puck').setScale(1.4 / R).setDepth(cy + 5);
  const zoneL = scene.add.circle(cx - 150, cy, 34).setStrokeStyle(5, 0xffffff, 0.8).setDepth(cy + 4);
  const zoneR = scene.add.circle(cx + 150, cy, 34).setStrokeStyle(5, 0xffffff, 0.8).setDepth(cy + 4);
  const count = 20;
  let i = 0;
  let side = 1;
  let interval = assist() ? 1.0 : 0.85;
  let judgedThis = false;
  let clock = 0;
  let arriveAt = 1.1;
  let from = 0;
  let score = 0;
  const win = assist() ? 0.2 : 0.14;
  const judge = (dir: -1 | 1) => {
    const off = Math.abs(clock - arriveAt);
    if (judgedThis) return;
    if (off > 0.32) return;
    judgedThis = true;
    if (dir === side && off <= win) {
      score += off < win * 0.5 ? 1 : 0.7;
      sfx('puck');
      hud.popup(cx + side * 150, cy - 90, off < win * 0.5 ? 'PERFECT' : 'GOOD', '#3ad17a', false);
      scarn.rig.gesture({ aF: side > 0 ? 70 : -20, eF: 20, lean: 18 }, 180);
    } else {
      sfx('miss');
      hud.popup(cx + side * 150, cy - 90, 'MISS', '#ff6060', false);
    }
  };
  await scene.frameLoop((dt, done) => {
    clock += dt;
    // puck travel
    const tt = Phaser.Math.Clamp((clock - (arriveAt - interval)) / interval, 0, 1);
    const x = Phaser.Math.Linear(from, side * 150, Phaser.Math.Easing.Sine.InOut(tt));
    puck.setPosition(cx + x, cy - Math.sin(tt * Math.PI) * 16);
    (side > 0 ? zoneR : zoneL).setStrokeStyle(5, 0xffcf3a, 1).setScale(1 + Math.max(0, 1 - tt) * 0.8);
    (side > 0 ? zoneL : zoneR).setStrokeStyle(5, 0xffffff, 0.35).setScale(1);
    if (input.pressed('left')) judge(-1);
    if (input.pressed('right')) judge(1);
    if (clock > arriveAt + 0.34) {
      if (!judgedThis) {
        sfx('miss');
        hud.popup(cx + side * 150, cy - 90, 'MISS', '#ff6060', false);
      }
      i++;
      hud.setScore(`${i}/${count}`);
      if (i >= count) {
        done();
        return;
      }
      judgedThis = false;
      from = side * 150;
      side = Math.random() < 0.7 ? -side : side;
      interval = Math.max(assist() ? 0.75 : 0.6, interval - 0.015);
      arriveAt = arriveAt + interval;
    }
    hud.setTime((count - i) * interval);
  });
  [puck, zoneL, zoneR].forEach((o) => o.destroy());
  scarn.rig.hold(null);
  scarn.rig.setAnim('idle');
  ui.set({ touchLayout: 'none' });
  hud.destroy();
  return Math.round((score / count) * 100);
}

// ---------------------------------------------------------------- 3. TARGET PRACTICE
export async function targetShoot(scene: ChapterScene, scarn: Scarn): Promise<number> {
  const hud = new MiniHud(scene, 'DRILL 3: TARGET PRACTICE', `Aim with ${ctl('aim')}, shoot pucks with ${ctl('fire')}. Do NOT hit Cherokee Jack.`);
  const aw = await autoWin(scene, hud);
  if (aw !== null) return aw;
  ['target', 'goldtarget', 'jackcutout', 'puck'].forEach((k) => ensureProp(scene, k));
  ui.set({ touchLayout: 'action' });
  scarn.setMode('locked');
  scarn.rig.hold('stick', 0, 0, -0.4);
  scarn.rig.setAnim('pose', 'slapWind');
  const reticle = scene.add.image(640, 360, 'reticle').setScale(1 / R).setScrollFactor(0).setDepth(19999);
  type T = { img: Phaser.GameObjects.Image; kind: 'target' | 'goldtarget' | 'jackcutout'; life: number; x: number; y: number };
  const targets: T[] = [];
  let t = 20;
  let spawn = 0.3;
  let points = 0;
  let possible = 0;
  let cd = 0;
  const shoot = (tx: number, ty: number) => {
    cd = 0.28;
    sfx('slapshot');
    scarn.rig.gesture('slapHit', 220);
    const p = scene.add.image(scarn.x + 30, scarn.y - 10, 'puck').setScale(1.3 / R).setDepth(9000);
    scene.tweens.add({
      targets: p,
      x: tx,
      y: ty,
      scale: 0.7 / R,
      duration: 150,
      onComplete: () => {
        p.destroy();
        let hitAny = false;
        for (const tg of targets) {
          if (tg.life <= 0) continue;
          if (Math.hypot(tg.x - tx, tg.y - 34 - ty) < 44) {
            tg.life = 0;
            hitAny = true;
            if (tg.kind === 'jackcutout') {
              points -= 1;
              sfx('boing');
              hud.popup(tg.x, tg.y - 80, 'NOT JACK!', '#ff6060', false);
            } else {
              const v = tg.kind === 'goldtarget' ? 2 : 1;
              points += v;
              sfx('metal');
              hud.popup(tg.x, tg.y - 80, v === 2 ? '+2 GOLDENFACE!' : '+1', '#ffcf3a', false);
            }
            scene.tweens.add({ targets: tg.img, angle: 90, alpha: 0, duration: 250 });
            break;
          }
        }
        if (!hitAny) sfx('puck');
      },
    });
  };
  await scene.frameLoop((dt, done) => {
    t -= dt;
    cd -= dt;
    hud.setTime(t);
    spawn -= dt;
    if (spawn <= 0 && t > 1) {
      spawn = assist() ? 1.0 : 0.72;
      const r = Math.random();
      const kind: T['kind'] = r < 0.18 ? 'jackcutout' : r < 0.4 ? 'goldtarget' : 'target';
      const x = 160 + Math.random() * 960;
      const y = 420 + Math.random() * 60;
      const img = scene.add.image(x, y + 80, kind).setScale(1 / R).setOrigin(0.5, 1).setDepth(y);
      scene.tweens.add({ targets: img, y, duration: 140, ease: 'Back.easeOut' });
      targets.push({ img, kind, life: assist() ? 2.3 : 1.7, x, y });
      if (kind !== 'jackcutout') possible += kind === 'goldtarget' ? 2 : 1;
    }
    for (const tg of targets) {
      if (tg.life > 0) {
        tg.life -= dt;
        if (tg.life <= 0) scene.tweens.add({ targets: tg.img, y: tg.y + 90, alpha: 0, duration: 160 });
      }
    }
    const usingMouse = ui.get().inputMode === 'kbm' && performance.now() - input.pointer.lastMove < 2500;
    reticle.setVisible(usingMouse);
    reticle.setPosition(input.pointer.x, input.pointer.y);
    if (cd <= 0 && input.pressed('fire')) {
      if (usingMouse) {
        const wp = scene.cameras.main.getWorldPoint(input.pointer.x, input.pointer.y);
        shoot(wp.x, wp.y);
      } else {
        const tg = targets.filter((x) => x.life > 0 && x.kind !== 'jackcutout').sort((a, b) => a.life - b.life)[0];
        if (tg) shoot(tg.x, tg.y - 34);
        else shoot(640, 400);
      }
    }
    hud.setScore(`${points} PTS`);
    if (t <= 0) done();
  });
  targets.forEach((x) => x.img.destroy());
  reticle.destroy();
  scarn.rig.hold(null);
  scarn.rig.setAnim('idle');
  ui.set({ touchLayout: 'none' });
  hud.destroy();
  return Math.round(Phaser.Math.Clamp(points / Math.max(1, possible * 0.8), 0, 1) * 100);
}

// ---------------------------------------------------------------- 4. OBSTACLE COURSE
export async function obstacleSkate(scene: ChapterScene, bgKey: string): Promise<number> {
  const hud = new MiniHud(scene, 'DRILL 4: OBSTACLE COURSE', `JUMP with ${ui.get().inputMode === 'kbm' ? 'SPACE / UP' : ctl('action')} over cones and chairs. DUCK (DOWN) under banners.`);
  const aw = await autoWin(scene, hud);
  if (aw !== null) return aw;
  ['cone', 'officechair'].forEach((k) => ensureProp(scene, k));
  ui.set({ touchLayout: 'rhythm' });
  const cam = scene.cameras.main;
  cam.setScroll(0, 0);
  const tile = scene.add.tileSprite(0, 0, 1280, 720, bgKey).setOrigin(0).setScrollFactor(0).setDepth(-9000);
  const skater = scene.rig('scarn', 300, 580, 1);
  skater.setAnim('skate');
  skater.moveSpeed = 400;
  skater.setDepth(5000);
  const groundY = 580;
  type O = { img: Phaser.GameObjects.GameObject & { x: number }; kind: 'jump' | 'duck'; done: boolean };
  const obs: O[] = [];
  let t = 20;
  let spawn = 1;
  let jumpT = -1;
  let hits = 0;
  let total = 0;
  let stumble = 0;
  const speed = assist() ? 360 : 440;
  await scene.frameLoop((dt, done) => {
    t -= dt;
    hud.setTime(t);
    tile.tilePositionX += speed * dt;
    spawn -= dt;
    if (spawn <= 0 && t > 1.6) {
      spawn = (assist() ? 1.5 : 1.15) + Math.random() * 0.5;
      const r = Math.random();
      total++;
      if (r < 0.35) {
        const g = scene.add.container(1400, 0).setDepth(4000);
        const rope = scene.add.rectangle(0, 250, 4, 200, 0x777777);
        const banner = scene.add.rectangle(0, 440, 240, 56, 0xf4f4f0).setStrokeStyle(3, 0x1b1420);
        const tx = scene.add.text(0, 440, 'CASUAL FRIDAY', { fontFamily: '"Permanent Marker", cursive', fontSize: '28px', color: '#c0152a' }).setOrigin(0.5);
        g.add([rope, banner, tx]);
        obs.push({ img: g, kind: 'duck', done: false });
      } else {
        const img = scene.add.image(1400, groundY + 10, r < 0.7 ? 'cone' : 'officechair').setScale((r < 0.7 ? 1.4 : 1) / R).setOrigin(0.5, 1).setDepth(4000);
        obs.push({ img, kind: 'jump', done: false });
      }
    }
    // input
    const jumpPressed = input.pressed('up') || input.pressed('action') || input.pressed('dodge');
    if (jumpT < 0 && jumpPressed && stumble <= 0) {
      jumpT = 0;
      sfx('whoosh');
    }
    const ducking = input.isDown('down') && jumpT < 0;
    let h = 0;
    if (jumpT >= 0) {
      jumpT += dt;
      const dur = 0.62;
      h = Math.sin((jumpT / dur) * Math.PI) * 150;
      if (jumpT >= dur) {
        jumpT = -1;
        h = 0;
        sfx('skate_stop');
      }
    }
    skater.y = groundY - h;
    stumble -= dt;
    skater.setAnim(stumble > 0 ? 'pose' : 'skate', stumble > 0 ? 'hurt' : ducking ? 'crouch' : 'stand');
    if (ducking) skater.setAnim('pose', 'crouch');
    for (const o of obs) {
      o.img.x -= speed * dt;
      if (!o.done && Math.abs(o.img.x - 300) < 46) {
        const cleared = o.kind === 'jump' ? h > 60 : ducking;
        if (!cleared) {
          o.done = true;
          stumble = 0.5;
          sfx('hurt');
          scene.shake(120, 0.005);
          hud.popup(300, 380, 'OOF', '#ff6060');
          skater.hurt(300);
        }
      }
      if (!o.done && o.img.x < 250) {
        o.done = true;
        hits++;
        hud.popup(300, 330, o.kind === 'duck' ? 'LIMBO!' : 'AIR SCARN!', '#3ad17a');
      }
    }
    hud.setScore(`${hits}/${total}`);
    if (t <= 0) done();
  });
  obs.forEach((o) => o.img.destroy());
  tile.destroy();
  skater.destroy();
  ui.set({ touchLayout: 'none' });
  hud.destroy();
  return Math.round((hits / Math.max(1, total)) * 100);
}

// ---------------------------------------------------------------- 5. REFLEXES
export async function reflexes(scene: ChapterScene, scarn: Scarn, jack: Rig): Promise<number> {
  const hud = new MiniHud(scene, 'DRILL 5: REFLEXES', 'When Jack throws, press the ARROW he shows. Not before. Never before.');
  const aw = await autoWin(scene, hud);
  if (aw !== null) return aw;
  ensureProp(scene, 'puck');
  ensureProp(scene, 'stapler');
  ensureProp(scene, 'mug');
  ui.set({ touchLayout: 'rhythm' });
  scarn.setMode('locked');
  const big = scene.add.text(640, 300, '', { fontFamily: '"Bebas Neue", Impact, sans-serif', fontSize: '120px', color: '#fff', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(19995);
  const dirs = [
    { a: 'left' as const, s: '◀ LEFT' },
    { a: 'right' as const, s: 'RIGHT ▶' },
    { a: 'up' as const, s: '▲ UP' },
    { a: 'down' as const, s: '▼ DOWN' },
  ];
  const items = ['puck', 'stapler', 'mug'];
  let total = 0;
  for (let round = 0; round < 5; round++) {
    big.setText('READY...').setColor('#ffffff');
    jack.strike('slapWind');
    const delay = 1.1 + Math.random() * 1.8;
    let t = 0;
    let fault = false;
    await scene.frameLoop((dt, done) => {
      t += dt;
      if (input.pressed('left') || input.pressed('right') || input.pressed('up') || input.pressed('down')) {
        fault = true;
        done();
      }
      if (t >= delay) done();
    });
    if (fault) {
      big.setText('TOO SOON!').setColor('#ff6060');
      sfx('beep_bad');
      hud.popup(640, 420, '0 PTS');
      await scene.wait(800);
      continue;
    }
    const d = dirs[Math.floor(Math.random() * 4)];
    big.setText(`NOW! ${d.s}`).setColor('#ffcf3a');
    jack.strike('slapHit');
    sfx('whoosh');
    const it = scene.add.image(jack.x + 40, jack.y - 90, items[round % items.length]).setScale(1.4 / R).setDepth(9000);
    scene.tweens.add({ targets: it, x: scarn.x - 20, y: scarn.y - 90, angle: 720, duration: 600 });
    let ms = 0;
    let ok = false;
    const limit = assist() ? 1.6 : 1.1;
    await scene.frameLoop((dt, done) => {
      ms += dt;
      for (const x of dirs) {
        if (input.pressed(x.a)) {
          ok = x.a === d.a;
          done();
          return;
        }
      }
      if (ms > limit) done();
    });
    it.destroy();
    const react = Math.round(ms * 1000);
    const pts = ok ? Math.round(Phaser.Math.Clamp((900 - react) / 600, 0, 1) * 100) : 0;
    total += pts;
    if (ok) {
      sfx('perfect');
      scarn.rig.gesture('danceUp', 400);
      big.setText(`${react} ms`).setColor('#3ad17a');
    } else {
      sfx('miss');
      big.setText(ms > limit ? 'TOO SLOW' : 'WRONG WAY').setColor('#ff6060');
    }
    hud.setScore(`ROUND ${round + 1}/5`);
    await scene.wait(900);
  }
  big.destroy();
  jack.setAnim('idle');
  ui.set({ touchLayout: 'none' });
  hud.destroy();
  return Math.round(total / 5);
}
