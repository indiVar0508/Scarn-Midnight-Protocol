// Look-dev shots of any scene, driven by a list of steps, on the real GPU (ANGLE over GL):
//   node tools/qa/look.mjs <outDir> '<scene title>' '<steps json>'
// Steps: ["shot", name] · ["wait", ms] · ["key", code] · ["skip", n] (press Enter n times: lines) ·
// ["until", js] (wait for a page condition) · ["stage"] (wait out a loading card) ·
// ["tp", x, z, yaw, pitch] (put Scarn on a mark and point the camera; he can't be hurt).
// Env: BASE (http://localhost:5174 by default), CHROME, ANGLE (gl; swiftshader for no GPU), FX (a tier).
import { chromium } from 'playwright';
import { stageShown } from './stage.mjs';
const [OUT = 'tools/qa/out', SCENE = 'Aisle Five', STEPS = '[["wait",1500],["shot","look"]]'] = process.argv.slice(2);
const BASE = process.env.BASE ?? 'http://localhost:5174';
const angle = process.env.ANGLE ?? 'gl';
const browser = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: [`--use-angle=${angle}`, ...(angle === 'swiftshader' ? ['--enable-unsafe-swiftshader'] : []), '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text().slice(0, 200)));
await page.goto(`${BASE}/?unlock=all${process.env.FX ? `&fx=${process.env.FX}` : ''}`);
await page.locator('.scene-row', { hasText: SCENE }).click();
await page.waitForFunction(() => window.__TLM2__, null, { timeout: 30000 });
await stageShown(page);
for (const [op, ...a] of JSON.parse(STEPS)) {
  if (op === 'shot') await page.screenshot({ path: `${OUT}/${a[0]}.png` });
  else if (op === 'wait') await page.waitForTimeout(a[0]);
  else if (op === 'key') await page.keyboard.press(a[0]);
  else if (op === 'stage') await stageShown(page);
  else if (op === 'skip') for (let i = 0; i < a[0]; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
  else if (op === 'until') await page.waitForFunction(a[0], null, { timeout: 120000 }).catch(() => console.log('timed out waiting for', a[0]));
  else if (op === 'tp')
    await page.evaluate(([x, z, yaw, pitch]) => {
      const s = window.__TLM2__.sim;
      s.onPlayerHit = () => {};
      s.player.body?.setTranslation({ x, y: 0.87, z }, true);
      s.cam.yaw = yaw;
      s.cam.pitch = pitch;
    }, a);
  else throw new Error(`unknown step ${op}`);
}
await browser.close();
