// Screenshot a URL after a delay: `node tools/qa/shot.mjs '/?lineup' out.png [waitMs]`.
import { chromium } from 'playwright';
const [path = '/', file = 'tools/qa/out/shot.png', wait = '6000'] = process.argv.slice(2);
const BASE = process.env.BASE ?? 'http://localhost:5174';
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 1280), height: Number(process.env.H ?? 720) } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text()));
await page.goto(BASE + path);
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: file });
await browser.close();
