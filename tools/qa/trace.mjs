import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(process.env.URL || 'http://localhost:5173/?unlock=all');
await page.waitForTimeout(3000);
await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'gpu', 'viz', 'cc', 'blink'] });
await page.waitForTimeout(2000);
const buf = await browser.stopTracing();
const ev = JSON.parse(buf.toString()).traceEvents;
const agg = new Map();
for (const e of ev) { if (e.ph !== 'X' || !e.dur) continue; const k = `${e.name}`; const a = agg.get(k) || { n: 0, t: 0 }; a.n++; a.t += e.dur; agg.set(k, a); }
const top = [...agg.entries()].sort((a, b) => b[1].t - a[1].t).slice(0, 30);
for (const [k, v] of top) console.log((v.t / 1000).toFixed(0).padStart(7), 'ms', String(v.n).padStart(5), k);
await browser.close();
