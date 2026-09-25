import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(process.env.URL || 'http://localhost:5173/?unlock=all');
await page.waitForTimeout(3000);
if (process.env.START) { await page.mouse.click(640, 360); await page.evaluate((c) => window.__TLM__.start(+c), process.env.START); await page.waitForTimeout(3000); }
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.start');
await page.waitForTimeout(3000);
const { profile } = await cdp.send('Profiler.stop');
const self = new Map();
const dt = profile.timeDeltas; const samples = profile.samples;
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
for (let i = 0; i < samples.length; i++) { const n = byId.get(samples[i]); const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); }
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
for (const [k, v] of top) console.log((v / 1000).toFixed(0).padStart(6), 'ms', k);
await browser.close();
