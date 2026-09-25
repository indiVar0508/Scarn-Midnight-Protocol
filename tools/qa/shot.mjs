// Quick visual check: node tools/qa/shot.mjs <script-name> [url]
import { chromium } from 'playwright';

const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const url = process.argv[3] || 'http://localhost:5173/?unlock=all&renderer=canvas';
const mode = process.argv[2] || 'menu';
const out = 'tools/qa/out';

const browser = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack}`));
await page.goto(url);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/${mode}-boot.png` });
await page.mouse.click(640, 360);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/${mode}-menu.png` });
const steps = {
  async menu() {},
  async ch(n = 1, beat = null, waits = [3000, 3000, 3000]) {
    await page.evaluate(([n, b]) => window.__TLM__.start(n, b), [n, beat]);
    let i = 0;
    for (const w of waits) {
      await page.waitForTimeout(w);
      await page.screenshot({ path: `${out}/${mode}-${i++}.png` });
      const st = await page.evaluate(() => window.__TLM__.state());
      console.log(JSON.stringify(st));
      await page.evaluate(() => { window.__TLM__.skipCard(); window.__TLM__.advance(0); });
    }
  },
};
const [fn, ...args] = mode.split(':');
const parsed = args.map((a) => (a === 'null' ? null : isNaN(+a) ? a : +a));
await (steps[fn] || steps.menu)(...parsed);
console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
