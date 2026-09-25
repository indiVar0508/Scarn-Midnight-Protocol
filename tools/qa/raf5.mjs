import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
if (process.env.STUB) await page.addInitScript(() => { navigator.getGamepads = () => []; });
await page.goto('http://localhost:5173/?unlock=all');
await page.waitForTimeout(3000);
const r = await page.evaluate(async () => { const t0 = performance.now(); for (let i = 0; i < 50; i++) navigator.getGamepads(); const gp = (performance.now() - t0) / 50; const g = window.__TLM__.Director.game; const f0 = g.loop.frame; await new Promise((r) => setTimeout(r, 1500)); return { gpMs: gp, fps: (g.loop.frame - f0) / 1.5 }; });
console.log(process.env.STUB ? 'stubbed' : 'real', JSON.stringify(r));
await browser.close();
