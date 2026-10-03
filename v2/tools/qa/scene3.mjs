// Scene 3 playthrough: drive → lake → knock on the van → questions → five trials (played
// crudely by a bot) → report card → wrapped → review → end card.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5174/';
const out = process.env.OUT ?? 'tools/qa/out';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text().slice(0, 200)));
const T = () => page.evaluate(() => { const t = window.__TLM2__.take.get(); const s = window.__TLM2__.sim; return { status: t.status, notes: t.notes, busy: s.busy, focus: s.focus?.id ?? null, trial: t.trial?.title ?? null, score: t.trial?.score ?? null, slate: t.slate, report: !!t.report, style: t.style }; });
const tp = (x, z) => page.evaluate(([x, z]) => window.__TLM2__.sim.player.body.setTranslation({ x, y: 0.85, z }, true), [x, z]);
const yaw = (y) => page.evaluate((y) => (window.__TLM2__.sim.cam.yaw = y), y);
await page.goto(BASE + '?unlock=all');
await page.locator('.scene-row', { hasText: 'Cherokee Jack' }).click();
await page.waitForFunction(() => window.__TLM2__, null, { timeout: 30000 });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${out}/s3-01-drive.png` });
for (let i = 0; i < 30 && (await T()).busy; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(300); }
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/s3-02-lake.png` });
console.log('lake', JSON.stringify(await T()));
await tp(6.0, -1.2); await page.waitForTimeout(400);
console.log('at van focus:', (await T()).focus);
await page.keyboard.press('KeyE'); await page.waitForTimeout(800);
const seen = new Set();
let lastTrial = null;
for (let i = 0; i < 900; i++) {
  const st = await T();
  if (st.status === 'wrapped') break;
  if (st.report && !seen.has('report')) { seen.add('report'); await page.screenshot({ path: `${out}/s3-09-report.png` }); }
  if (st.trial !== lastTrial) {
    if (lastTrial) console.log(`  ${lastTrial} → ${st.trial ?? 'done'}`);
    lastTrial = st.trial;
  }
  const choices = await page.locator('.choices button').count();
  if (choices) { await page.keyboard.press(`Digit${choices}`); await page.waitForTimeout(300); continue; }
  if (st.trial && !st.score?.startsWith('READY')) {
    if (!seen.has(st.trial)) { seen.add(st.trial); await page.waitForTimeout(400); await page.screenshot({ path: `${out}/s3-trial-${st.trial.replace(/\W/g, '')}.png` }); }
    if (st.trial === 'MOP THE ICE') { await page.keyboard.down(i % 2 ? 'KeyW' : 'KeyS'); await page.keyboard.down(i % 4 < 2 ? 'KeyA' : 'KeyD'); await page.waitForTimeout(700); await page.keyboard.up('KeyW'); await page.keyboard.up('KeyS'); await page.keyboard.up('KeyA'); await page.keyboard.up('KeyD'); }
    else if (st.trial === 'STICK HANDLING' || st.trial === 'OBSTACLES') { await page.keyboard.down('KeyW'); await page.waitForTimeout(600); await page.keyboard.up('KeyW'); }
    else if (st.trial === 'TARGETS') { await yaw(-Math.PI / 2 + ((i % 9) - 4) * 0.09); await page.mouse.move(640, 360); await page.mouse.down(); await page.waitForTimeout(250); await page.mouse.up(); }
    else if (st.trial === 'REFLEXES') { await page.keyboard.press('Space'); await page.waitForTimeout(450); }
    continue;
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}
const end = await T();
console.log('end', JSON.stringify(end));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/s3-10-review.png` });
await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
console.log('end card:', (await page.locator('text=END OF SCENE 3').count()) > 0, '|', await page.locator('.end-card .director').textContent().catch(() => ''));
await browser.close();
