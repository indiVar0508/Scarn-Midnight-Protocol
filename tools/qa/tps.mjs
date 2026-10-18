// Third-person look-around: forward view, turn to the crew side, fight a bit. Camera is
// steered through the QA hook because headless Chromium can't take pointer lock.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { stageShown } from './stage.mjs';
const out = process.env.OUT ?? 'tools/qa/out';
const BASE = process.env.BASE ?? 'http://localhost:5174/';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
await page.goto(BASE);
await page.locator('.title .btn.primary').click();
await page.waitForFunction(() => window.__TLM2__, null, { timeout: 30000 });
await stageShown(page);
await page.waitForTimeout(6000);
const cam = (yaw, pitch) => page.evaluate(([y, p]) => { const c = window.__TLM2__.sim.cam; c.yaw = y; c.pitch = p; }, [yaw, pitch]);
const st = () => page.evaluate(() => { const t = window.__TLM2__.take.get(); const p = window.__TLM2__.sim.player.pos; return { hp: t.hp, down: t.goonsDown, shots: t.shots, hits: t.hits, status: t.status, pos: [p.x.toFixed(1), p.z.toFixed(1)] }; });
await page.screenshot({ path: `${out}/tps-01-forward.png` });
await cam(Math.PI + 0.75, 0.05); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/tps-02-crew.png` });
await cam(0.2, 0.2); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/tps-03-backwall.png` });
await cam(-Math.PI / 2, 0.15);
await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
await page.mouse.move(640, 360);
// Real aim, real hitscan: sweep the camera until its own aim ray reports a goon under the
// crosshair (`sim.aimOnTarget`), then fire. Goons close in meanwhile.
let aimed = 0;
for (let i = 0; i < 80 && (await st()).down < 1; i++) {
  await cam(-Math.PI / 2 + ((i % 24) - 12) * 0.06, 0.12);
  await page.waitForTimeout(300);
  if (!(await page.evaluate(() => window.__TLM2__.sim.aimOnTarget))) continue;
  aimed++;
  // Hold the trigger until a shot goes off: under SwiftShader a physics step can be a second away.
  const shots = (await st()).shots;
  await page.mouse.down();
  await page.waitForFunction((n) => window.__TLM2__.take.get().shots > n, shots, { timeout: 15000 }).catch(() => {});
  await page.mouse.up();
}
console.log('aimed at a goon', aimed, 'times');
await page.screenshot({ path: `${out}/tps-04-fight.png` });
console.log('after fight', JSON.stringify(await st()));
console.log(logs.slice(0, 20).join('\n'));
await browser.close();
