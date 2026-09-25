// Measures rAF / Phaser frame rate under different headless GL flags.
import { chromium } from 'playwright';

const variants = [[], ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ['--disable-gpu'], ['--enable-unsafe-swiftshader']];
for (const args of variants) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:5173/?unlock=all');
  await page.waitForTimeout(2500);
  const r = await page.evaluate(async () => {
    let n = 0;
    const t0 = performance.now();
    await new Promise((res) => {
      const f = () => {
        n++;
        if (performance.now() - t0 < 2000) requestAnimationFrame(f);
        else res();
      };
      requestAnimationFrame(f);
    });
    const g = window.__TLM__?.Director.game;
    const f0 = g?.loop.frame;
    await new Promise((r) => setTimeout(r, 1000));
    return { raf: n / 2, phaserFps: g ? g.loop.frame - f0 : null, renderer: g?.renderer.type };
  });
  console.log(JSON.stringify(args), JSON.stringify(r));
  await browser.close();
}
