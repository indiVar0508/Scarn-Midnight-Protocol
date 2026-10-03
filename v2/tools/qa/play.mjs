// Smoke playtest: title → play → walk → shoot → pose/roll; prints take state + console errors.
// Run with `npm run dev` up: `node tools/qa/play.mjs` (OUT=dir for screenshots, CHROME=path).
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const out = process.env.OUT ?? 'tools/qa/out';
const BASE = process.env.BASE ?? 'http://localhost:5174/';
const executablePath = process.env.CHROME || undefined; // e.g. a cached Playwright chromium
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(BASE);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/01-title.png` });
await page.locator('.title .btn.primary').click();
await page.waitForFunction(() => window.__TLM2__, null, { timeout: 30000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/02-start.png` });
const st = () => page.evaluate(() => { const t = window.__TLM2__.take.get(); const p = window.__TLM2__.sim.player.pos; return { hp: t.hp, down: t.goonsDown, style: t.style, shots: t.shots, hits: t.hits, status: t.status, notes: t.notes, pos: [p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2)] }; });
console.log('start', JSON.stringify(await st()));
// walk right for a bit
await page.keyboard.down('KeyD'); await page.waitForTimeout(1200); await page.keyboard.up('KeyD');
console.log('after walk', JSON.stringify(await st()));
// aim at screen center-right and shoot in bursts
await page.mouse.move(800, 380);
for (let i = 0; i < 6; i++) { await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(200); await page.mouse.move(700 + i * 60, 300 + (i % 3) * 80); }
await page.screenshot({ path: `${out}/03-fight.png` });
console.log('after shooting', JSON.stringify(await st()));
await page.keyboard.press('KeyF'); await page.waitForTimeout(300);
await page.keyboard.press('Space'); await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/04-pose-roll.png` });
console.log('after pose/roll', JSON.stringify(await st()));
console.log(logs.slice(0, 30).join('\n'));
await browser.close();
