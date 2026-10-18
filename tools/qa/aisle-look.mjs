// Look-dev shots of Scene 1 (Aisle Five) from a few angles: `node tools/qa/aisle-look.mjs [outDir]`.
// `GPU=1` renders on the host GPU (ANGLE over GL) instead of SwiftShader; `FX=` forces a tier.
import { chromium } from 'playwright';
import { stageShown } from './stage.mjs';
const OUT = process.argv[2] ?? 'tools/qa/out';
const BASE = process.env.BASE ?? 'http://localhost:5174';
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: process.env.GPU ? ['--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text().slice(0, 200)));
await page.goto(`${BASE}/?unlock=all${process.env.FX ? `&fx=${process.env.FX}` : ''}`);
await page.locator('.scene-row', { hasText: 'Aisle Five' }).click();
await page.waitForFunction(() => window.__TLM2__, null, { timeout: 30000 });
await stageShown(page);
for (let i = 0; i < 40 && !(await page.evaluate(() => !!window.__TLM2__.sim.player.body)); i++) {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}
await page.screenshot({ path: `${OUT}/aisle-boot.png` });
await page.waitForFunction(() => window.__TLM2__.sim.player.body, null, { timeout: 60000 });
await page.waitForTimeout(5000);
const shots = [
  ['start', -15, 3, -Math.PI / 2, 0.12],
  ['aisle', -6, 4.5, -Math.PI / 2 + 0.35, 0.05],
  ['checkout', 9, 2.5, -Math.PI / 2 - 0.35, 0.1],
  ['racks', -12, 0, Math.PI / 2 + 0.5, 0.0],
  ['crew', 0, 6.5, Math.PI, 0.05],
];
for (const [name, x, z, yaw, pitch] of shots) {
  await page.evaluate(([x, z, yaw, pitch]) => {
    const api = window.__TLM2__;
    api.sim.onPlayerHit = () => {}; // Scarn can't die mid-shoot (on a real GPU the goons get him)
    api.sim.player.body.setTranslation({ x, y: 0.87, z }, true);
    api.sim.cam.yaw = yaw;
    api.sim.cam.pitch = pitch;
  }, [x, z, yaw, pitch]);
  await page.waitForTimeout(process.env.GPU ? 2500 : 6000); // the camera eases after the teleport
  await page.screenshot({ path: `${OUT}/aisle-${name}.png` });
}
console.log('fps', await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => (++n, performance.now() - t0 < 2000 ? requestAnimationFrame(f) : res((n / 2).toFixed(1))); requestAnimationFrame(f); })));
await browser.close();
