// Scripted QA driver.
//   node tools/qa/run.mjs tools/qa/scenarios/ch01.mjs [--webgl]
// A scenario default-exports `async (t) => { ... }` using the helpers below.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const file = process.argv[2];
const webgl = process.argv.includes('--webgl');
const base = process.env.BASE || 'http://localhost:5173';
const out = 'tools/qa/out';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const vp = (process.env.VP || '1280x720').split('x').map(Number);
const touch = !!process.env.TOUCH;
const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
const errors = [];
page.on('console', (m) => {
  const t = m.text();
  if ((m.type() === 'error' || m.type() === 'warning') && !t.includes('ERR_CERT') && !t.includes('fonts.g')) errors.push(`${m.type()}: ${t}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack}`));

const name = (file || 'scenario').split('/').pop().replace(/\.mjs$/, '');
let shotN = 0;
const t = {
  page,
  errors,
  async open(query = '', { unlock = true } = {}) {
    const params = [unlock ? 'unlock=all' : '', webgl ? '' : 'renderer=canvas'].filter(Boolean).join('&');
    await page.goto(`${base}/?${params}${query}`);
    await page.waitForTimeout(1500);
    if (touch) await page.touchscreen.tap(vp[0] / 2, vp[1] / 2);
    else await page.mouse.click(640, 360);
    await page.waitForTimeout(600);
  },
  wait: (ms) => page.waitForTimeout(ms),
  eval: (fn, arg) => page.evaluate(fn, arg),
  state: () => page.evaluate(() => window.__TLM__.state()),
  async shot(label = '') {
    const p = `${out}/${name}-${String(shotN++).padStart(2, '0')}${label ? '-' + label : ''}.png`;
    await page.screenshot({ path: p });
    return p;
  },
  async start(ch, beat = null) {
    await page.evaluate(([c, b]) => window.__TLM__.start(c, b), [ch, beat]);
  },
  async qa(flags) {
    await page.evaluate((f) => Object.assign(window.__TLM__.qa, f), flags);
  },
  async settings(s) {
    await page.evaluate((x) => window.__TLM__.settings.set(x), s);
  },
  /** Advance dialogue / cards until `until(state)` or timeout. */
  async skipTalk(maxMs = 20000, until = null) {
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs) {
      const s = await t.state();
      if (until && until(s)) return s;
      if (s.card) await page.evaluate(() => window.__TLM__.skipCard());
      else if (s.dialogue) await page.evaluate(() => window.__TLM__.advance(0));
      else if (!until) return s;
      await page.waitForTimeout(250);
    }
    return t.state();
  },
  async waitFor(pred, maxMs = 20000, step = 250) {
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs) {
      const s = await t.state();
      if (pred(s)) return s;
      await page.waitForTimeout(step);
    }
    throw new Error(`waitFor timed out: ${pred}`);
  },
  async key(code, ms = 80) {
    await page.keyboard.down(code);
    await page.waitForTimeout(ms);
    await page.keyboard.up(code);
  },
  async hold(codes, ms) {
    for (const c of codes) await page.keyboard.down(c);
    await page.waitForTimeout(ms);
    for (const c of codes) await page.keyboard.up(c);
  },
  log: (...a) => console.log('[qa]', ...a),
};

let ok = true;
try {
  const mod = await import(pathToFileURL(resolve(file)).href);
  await mod.default(t);
} catch (e) {
  ok = false;
  console.log('SCENARIO FAILED:', e.message);
  await t.shot('fail');
  console.log(JSON.stringify(await t.state().catch(() => null)));
}
console.log(errors.length ? `CONSOLE ERRORS (${errors.length}):\n${errors.slice(0, 20).join('\n')}` : 'no console errors');
await browser.close();
process.exit(ok ? 0 : 1);
