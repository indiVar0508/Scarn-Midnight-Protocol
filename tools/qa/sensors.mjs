// Sensor mechanics in Scene 3 on the Rust physics: the mop-head sensor cleans dirt-spot sensors,
// and the finish-line sensor ends the obstacle trial early. Player moved via the QA hook.
import { chromium } from 'playwright';
import { stageShown } from './stage.mjs';
const BASE = process.env.BASE ?? 'http://localhost:5174/';
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const T = () => page.evaluate(() => { const t = window.__TLM2__.take.get(); return { busy: window.__TLM2__.sim.busy, trial: t.trial?.title ?? null, score: t.trial?.score ?? null, report: t.report }; });
const tp = (x, z) => page.evaluate(([x, z]) => window.__TLM2__.sim.player.body.setTranslation({ x, y: 0.87, z }, true), [x, z]);
await page.goto(BASE + '?unlock=all');
await page.locator('.scene-row', { hasText: 'Cherokee Jack' }).click();
await page.waitForFunction(() => window.__TLM2__, null, { timeout: 30000 });
await stageShown(page);
for (let i = 0; i < 40 && !(await page.evaluate(() => !!window.__TLM2__.sim.player.body)); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(300); }
await page.waitForFunction(() => window.__TLM2__.sim.player.body && !window.__TLM2__.sim.busy, null, { timeout: 60000 });
await page.waitForTimeout(1000);
await tp(6.0, -1.2); await page.waitForTimeout(400);
await page.keyboard.press('KeyE'); await page.waitForTimeout(800);
const live = async (title) => { for (let i = 0; i < 200; i++) { const s = await T(); if (s.trial === title && s.score && !s.score.startsWith('READY')) return; if (await page.locator('.choices button').count()) await page.keyboard.press(`Digit${await page.locator('.choices button').count()}`); else await page.keyboard.press('Enter'); await page.waitForTimeout(250); } };
await live('MOP THE ICE');
// Raster the mop over the rink (yaw -π/2: the mop head sits 0.6 m ahead in +x).
await page.evaluate(() => (window.__TLM2__.sim.cam.yaw = -Math.PI / 2));
// Cleaning only counts while the mop moves, so glide the player every frame (like holding a key)
// in 0.5 m rows rather than teleporting and dwelling.
const best = await page.evaluate(() => new Promise((done) => {
  const api = window.__TLM2__;
  let x = -5.2, z = -2.2, dir = 1, score = '', frames = 0, last = performance.now();
  const t0 = last;
  const tick = () => {
    const t = api.take.get().trial;
    if (t?.title !== 'MOP THE ICE' || z > 4.3) return done(`${score} (${t?.title === 'MOP THE ICE' ? 'sweep done' : 'trial ended'}, ${(frames / ((performance.now() - t0) / 1000)).toFixed(0)} fps)`);
    score = t.score ?? score;
    const now = performance.now();
    x += dir * 2 * Math.min(0.1, (now - last) / 1000);
    last = now; frames++;
    if (x > 4.0 || x < -5.2) { dir = -dir; z += 0.5; }
    api.sim.player.body.setTranslation({ x, y: 0.87, z }, true);
    requestAnimationFrame(tick);
  };
  tick();
}));
console.log('mop after sweep:', best);
await live('OBSTACLES');
const t0 = Date.now();
await tp(9.6, 1);
await page.waitForTimeout(1500);
console.log('obstacles: finish sensor ended the trial early:', (await T()).trial !== 'OBSTACLES', `(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
await browser.close();
