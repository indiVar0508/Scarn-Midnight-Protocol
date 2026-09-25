// node tools/qa/probe.mjs "<js to eval after start>" [waitMs]
import { chromium } from 'playwright';
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}\n${e.stack}`));
await page.goto(process.env.URL || 'http://localhost:5173/?unlock=all');
await page.waitForTimeout(2000);
await page.mouse.click(640, 360);
await page.waitForTimeout(800);
const script = process.argv[2] || '';
const res = await page.evaluate(`(async () => { ${script} })()`);
console.log('RESULT', JSON.stringify(res, null, 1));
if (process.argv[3]) await page.screenshot({ path: process.argv[3] });
console.log(logs.filter((l) => !l.includes('ERR_CERT')).join('\n'));
await browser.close();
