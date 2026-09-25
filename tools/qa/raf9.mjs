import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const q of ['n=0', 'n=40&s=256', 'n=40&s=1024', 'n=40&s=256&show=40', 'n=10&s=2048&show=10']) {
  await page.goto('http://localhost:5173/tools/qa/pages/min3.html?' + q);
  await page.waitForTimeout(2500);
  const r = await page.evaluate(async () => { const f0 = window.game.loop.frame; await new Promise((r) => setTimeout(r, 1500)); return (window.game.loop.frame - f0) / 1.5; });
  console.log(q, r);
}
await browser.close();
