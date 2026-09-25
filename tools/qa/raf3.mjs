import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const t of ['webgl', 'canvas']) {
  await page.goto('http://localhost:5173/tools/qa/pages/min.html?t=' + t);
  await page.waitForTimeout(2500);
  const r = await page.evaluate(async () => { const f0 = window.game.loop.frame; await new Promise((r) => setTimeout(r, 2000)); return (window.game.loop.frame - f0) / 2; });
  console.log(t, r);
}
await browser.close();
