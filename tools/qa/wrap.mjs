// Take loop: QA-zaps both waves → wrapped → review card → R → Take 2.
// Run with `npm run dev` up: `node tools/qa/wrap.mjs`.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const out = process.env.OUT ?? 'tools/qa/out';
const BASE = process.env.BASE ?? 'http://localhost:5174/';
const executablePath = process.env.CHROME || undefined; // e.g. a cached Playwright chromium
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
await page.goto(BASE);
await page.locator('.title .btn.primary').click();
await page.waitForFunction(() => window.__TLM2__, null, { timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/05-pyramid.png` });
const st = () => page.evaluate(() => { const t = window.__TLM2__.take.get(); return { take: t.takeNo, hp: t.hp, down: t.goonsDown, total: t.goonsTotal, status: t.status, notes: t.notes }; });
// QA assist: shoot every goon (calls the same hit handler a bullet does).
const zap = () => page.evaluate(() => { const { sim } = window.__TLM2__; for (const h of sim.hittables.values()) h({ point: sim.player.pos.clone(), dir: sim.player.pos.clone().set(1, 0, 0), damage: 9 }); });
await zap(); await page.waitForTimeout(2600);
console.log('wave1 cleared', JSON.stringify(await st()));
await zap(); await page.waitForTimeout(800); await page.screenshot({ path: `${out}/06-late-fall.png` });
await page.waitForTimeout(2500);
console.log('wave2 cleared', JSON.stringify(await st()));
await page.screenshot({ path: `${out}/07-review.png` });
await page.keyboard.press('KeyR'); await page.waitForTimeout(1500);
console.log('after retake', JSON.stringify(await st()));
await page.screenshot({ path: `${out}/08-take2.png` });
console.log(logs.slice(0, 20).join('\n'));
await browser.close();
