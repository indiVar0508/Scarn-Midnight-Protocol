// Scene 2 playthrough: manor (skip intro, inspect all + beet, leave) → Oval Office (sit,
// choices, coin flips until it lands) → review → PRINT IT → mission card → end card.
// Moves Scarn by teleport through the QA hook (walking paths aren't the point here).
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5174/';
const out = process.env.OUT ?? 'tools/qa/out';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text()));
const T = () => page.evaluate(() => { const t = window.__TLM2__.take.get(); const s = window.__TLM2__.sim; return { status: t.status, notes: t.notes, busy: s.busy, focus: s.focus?.id ?? null, obj: t.objective }; });
const tp = (x, z) => page.evaluate(([x, z]) => window.__TLM2__.sim.player.body.setTranslation({ x, y: 0.85, z }, true), [x, z]);
const skipWhileBusy = async (max = 40) => { for (let i = 0; i < max && (await T()).busy; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); } };

await page.goto(BASE + '?unlock=all');
await page.locator('.scene-row', { hasText: 'One Last Mission' }).click();
await page.waitForFunction(() => window.__TLM2__, null, { timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/s2-01-wake.png` });
await skipWhileBusy();
console.log('after intro', JSON.stringify(await T()));
for (const [id, x, z] of [['portrait', 1.5, -3.2], ['trophies', 3.8, -1.5], ['fire', -2.5, -2.9], ['photo', -4.0, 1.6], ['couch', -2.5, -0.2], ['mug', -1.4, -2.0], ['beet', 3.6, 2.4]]) {
  await tp(x, z); await page.waitForTimeout(250);
  const f = (await T()).focus;
  await page.keyboard.press('KeyE'); await page.waitForTimeout(350);
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  console.log(`  ${id}: focus=${f}`);
}
await page.screenshot({ path: `${out}/s2-02-manor.png` });
console.log('after tour', JSON.stringify(await T()));
await tp(3.8, -3.3); await page.waitForTimeout(300);
await page.keyboard.press('KeyE'); await page.waitForTimeout(400);
await skipWhileBusy(); await page.waitForTimeout(1800);
console.log('office?', JSON.stringify(await T()));
await page.screenshot({ path: `${out}/s2-03-office.png` });
await tp(0, 0.2); await page.waitForTimeout(300);
await page.keyboard.press('KeyE'); await page.waitForTimeout(800);
// Conversation: answer choices (3 = sit backwards, then 2 = nacho lady), skip lines.
let flips = 0;
for (let i = 0; i < 120; i++) {
  const st = await T();
  if (st.status === 'wrapped') break;
  const choices = await page.locator('.choices button').count();
  const coinCharge = await page.locator('.coin-help').count();
  if (choices) { await page.screenshot({ path: `${out}/s2-04-choice.png` }); await page.keyboard.press(i < 20 && !st.notes.includes('rebel') ? 'Digit3' : 'Digit2'); }
  else if (coinCharge) {
    if (!flips) await page.screenshot({ path: `${out}/s2-05-coin.png` });
    flips++;
    await page.keyboard.down('Space'); await page.waitForTimeout(720); await page.keyboard.up('Space');
    await page.waitForTimeout(2500);
    console.log('  flip', flips, await page.locator('.coin-result').textContent().catch(() => '?'));
    await page.screenshot({ path: `${out}/s2-06-flip${flips}.png` });
  } else await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
}
console.log('end', JSON.stringify(await T()), 'flips', flips);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/s2-07-review.png` });
console.log('review card:', await page.locator('text=PRINT IT').count(), '| text:', (await page.evaluate(() => document.body.innerText)).slice(0, 200).replace(/\n/g, ' | '));
await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
console.log('mission card:', await page.locator('.mission-card').count() > 0);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/s2-08-mission.png` });
await page.keyboard.press('Escape'); await page.waitForTimeout(800);
await page.waitForTimeout(300);
console.log('end card:', (await page.locator('text=END OF SCENE 2').count()) > 0, '| next:', await page.locator('.end-card .director').textContent().catch(() => ''));
await browser.close();
