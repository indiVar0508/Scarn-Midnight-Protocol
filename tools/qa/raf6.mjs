import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const q of ['', 'scale=1', 'render=1', 'fps=1', 'input=1', 'scale=1&render=1&fps=1&input=1']) {
  await page.goto('http://localhost:5173/tools/qa/pages/min2.html?' + q);
  await page.waitForTimeout(2000);
  const r = await page.evaluate(async () => { const f0 = window.game.loop.frame; await new Promise((r) => setTimeout(r, 1500)); return (window.game.loop.frame - f0) / 1.5; });
  console.log(q || 'default', r);
}
await browser.close();
