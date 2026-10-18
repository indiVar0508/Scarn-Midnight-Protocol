// Load-time and frame-time probe on the real GPU: `node tools/qa/perf.mjs [fx] [scene]`, where fx
// is auto (the game's own pick), off, low, medium or high, and scene a scene title (Aisle Five).
// Chromium runs ANGLE on the host GL driver (not SwiftShader like the other QA scripts), so the
// numbers track what a player sees. WebGL calls are wrapped to count shader programs, the time the
// page spent blocked reading their status, and draw calls per frame.
//
// Env: BASE (server), CHROME (binary), W/H/DPR (viewport), ANGLE (gl|vulkan|swiftshader), PROFILE_DIR (keep
// Chrome's profile, and its GPU shader cache, between runs: a returning player), SLOW=n (list the
// n slowest programs), PROFILE=n (top n functions by self time during load, or over 5 s of play
// with STEADY=1), BREAKDOWN=1 (every program compiled, and draws per frame by program), VARIANTS=1 (label programs
// with what split them: instancing, skinning, vertex colors, maps, double-sided...).
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5174';
const FX = process.argv[2] ?? 'auto';
const SCENE = process.argv[3] ?? 'Aisle Five';
const launch = {
  executablePath: process.env.CHROME || undefined,
  args: [`--use-angle=${process.env.ANGLE ?? 'gl'}`, ...(process.env.ANGLE === 'swiftshader' ? ['--enable-unsafe-swiftshader'] : []), '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'],
};
const view = { viewport: { width: Number(process.env.W ?? 1920), height: Number(process.env.H ?? 1080) }, deviceScaleFactor: Number(process.env.DPR ?? 1) };
const context = process.env.PROFILE_DIR ? await chromium.launchPersistentContext(process.env.PROFILE_DIR, { ...launch, ...view }) : null;
const browser = context ? null : await chromium.launch(launch);
const page = context ? await context.newPage() : await browser.newPage(view);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text().slice(0, 200)));
await page.addInitScript((opts) => {
  const P = WebGL2RenderingContext.prototype;
  const s = (window.__perf = { programs: 0, blockedMs: 0, draws: 0, frames: [], hitches: [], links: [], names: [], byProgram: {}, seen: 0, seenAt: [] });
  // Label each program by its fragment shader (three.js's material type, point-light count, and
  // the features that make it big) so slow ones can be named.
  const src = new WeakMap();
  const label = new WeakMap();
  const shaderSource = P.shaderSource;
  P.shaderSource = function (sh, text) {
    src.set(sh, text);
    return shaderSource.call(this, sh, text);
  };
  const attach = P.attachShader;
  const vtags = new WeakMap();
  // What splits one material into several programs (VARIANTS=1 adds these to the labels).
  const variant = (t) => opts.variants ? [/#define USE_INSTANCING\b/.test(t) && 'inst', /#define USE_SKINNING/.test(t) && 'skin', /#define USE_COLOR\b/.test(t) && 'vcol', /#define USE_MAP\b/.test(t) && 'map', /#define DOUBLE_SIDED/.test(t) && '2side', /#define FLAT_SHADED/.test(t) && 'flat', /#define USE_ALPHATEST/.test(t) && 'atest', /#define USE_EMISSIVEMAP/.test(t) && 'emap', /#define USE_FOG/.test(t) && 'fog', /#define USE_UV\b/.test(t) && 'uv', /#define USE_BATCHING/.test(t) && 'batch', /#define USE_TRANSMISSION/.test(t) && 'transm', /#define USE_CLEARCOAT/.test(t) && 'cc'].filter(Boolean).join(',') : '';
  P.attachShader = function (p, sh) {
    const t = src.get(sh) ?? '';
    if (!/gl_FragColor|pc_fragColor|layout\(location = 0\) out/.test(t)) vtags.set(p, variant(t));
    if (/gl_FragColor|pc_fragColor|layout\(location = 0\) out/.test(t)) {
      const name = t.match(/#define SHADER_NAME (\S+)/)?.[1] ?? t.match(/#define SHADER_TYPE (\S+)/)?.[1] ?? 'unnamed';
      const pl = t.match(/uniform PointLight pointLights\[ (\d+) \]/)?.[1];
      const tags = [pl && `pl${pl}`, /rkBump/.test(t) && '+detail', /#define USE_ENVMAP/.test(t) && '+env', /#define USE_SHEEN/.test(t) && '+sheen', /#define USE_SHADOWMAP/.test(t) && '+shadow'];
      const v = [vtags.get(p), variant(t)].filter(Boolean).join(',');
      label.set(p, `${name} ${tags.filter(Boolean).join(' ')} ${(t.length / 1000).toFixed(0)}k${v ? ` [${[...new Set(v.split(','))].join(',')}]` : ''}`);
    }
    return attach.call(this, p, sh);
  };
  const link = P.linkProgram;
  P.linkProgram = function (p) {
    s.programs++;
    s.names.push(label.get(p) ?? 'unnamed');
    return link.call(this, p);
  };
  // Draws by the program they use (BREAKDOWN=1): which materials (and the shadow pass) cost the most.
  let using = null;
  const use = P.useProgram;
  P.useProgram = function (p) {
    using = p;
    return use.call(this, p);
  };
  // Status reads are synchronous round trips to the GPU process: where the page blocks on a
  // compile (or on whatever else the GPU process is still working through).
  for (const n of ['getProgramParameter', 'getProgramInfoLog', 'getShaderInfoLog', 'getShaderParameter']) {
    const f = P[n];
    P[n] = function (o, ...a) {
      const t = performance.now();
      const r = f.call(this, o, ...a);
      const ms = performance.now() - t;
      s.blockedMs += ms;
      if (ms > 30) s.links.push([Math.round(ms), label.get(o) ?? n]);
      return r;
    };
  }
  for (const n of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
    const f = P[n];
    P[n] = function (...a) {
      s.draws++;
      const l = (using && label.get(using)) ?? 'unnamed';
      s.byProgram[l] = (s.byProgram[l] ?? 0) + 1;
      return f.apply(this, a);
    };
  }
  // Time from the click the page actually received: Playwright may hold a click back for seconds
  // waiting for the title to stop moving, and that is not loading time.
  addEventListener('pointerdown', () => (s.down ??= performance.now()), true);
  let last = performance.now();
  const tick = (now) => {
    const dt = now - last;
    last = now;
    s.frames.push(dt);
    if (dt > 100) s.hitches.push(Math.round(dt));
    // A frame the player sees freeze: no loading card over it.
    if (dt > 100 && !document.querySelector('.stage-loading')) {
      s.seen = Math.max(s.seen, Math.round(dt));
      const t = window.__TLM2__?.take.get();
      if (dt > 300) s.seenAt.push(`${Math.round(dt)}ms @${(now / 1000).toFixed(1)}s ${t?.location || 'start'}${t?.blackout ? ' (blacked out)' : ''}`);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, { variants: !!process.env.VARIANTS });

async function summary(cdp, title) {
  const { profile } = await cdp.send('Profiler.stop');
  const dt = new Map();
  profile.samples.forEach((id, i) => dt.set(id, (dt.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0) / 1000));
  const self = new Map();
  for (const n of profile.nodes) {
    const ms = dt.get(n.id) ?? 0;
    if (!ms) continue;
    const f = n.callFrame;
    const k = `${f.functionName || '(anon)'} ${f.url.replace(/^.*\/(src|node_modules)\//, '$1/').replace(/\?.*$/, '')}:${f.lineNumber + 1}`;
    self.set(k, (self.get(k) ?? 0) + ms);
  }
  console.log(`top self time ${title} (ms):`);
  for (const [k, ms] of [...self].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.PROFILE) || 25)) console.log(`  ${ms.toFixed(0).padStart(6)}  ${k}`);
}

const slowest = (links) => {
  const n = Number(process.env.SLOW);
  if (n) for (const [ms, l] of links.sort((a, b) => b[0] - a[0]).slice(0, n)) console.log(`  blocked ${String(ms).padStart(5)}ms  ${l}`);
};

await page.goto(`${BASE}/?unlock=all${FX === 'auto' ? '' : `&fx=${FX}`}`);
console.log('renderer', await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(e.UNMASKED_RENDERER_WEBGL); }));
await page.waitForSelector('.scene-row');
const reset = () => page.evaluate(() => Object.assign(window.__perf, { down: window.__perf.down, programs: 0, blockedMs: 0, draws: 0, frames: [], hitches: [], links: [], names: [], byProgram: {}, seen: 0, seenAt: [] }));
await reset();
const cdp = process.env.PROFILE ? await page.context().newCDPSession(page) : null;
if (cdp) {
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  if (!process.env.STEADY) await cdp.send('Profiler.start');
}
await page.locator('.scene-row', { hasText: SCENE }).click();
// The take's loading card ("Lighting the set…") is up while its shaders compile.
await page.waitForSelector('.stage-loading', { timeout: 120000 }).catch(() => {});
await page.waitForSelector('.stage-loading', { state: 'detached', timeout: 120000 });
const card = (await page.evaluate(() => performance.now() - window.__perf.down)) / 1000;
const atCard = await page.evaluate(() => ({ ...window.__perf, frames: undefined }));
await reset();
// Skip the opening lines, then call it loaded once frames have been steady (< 50 ms) for a second.
for (let i = 0; i < 40 && (await page.evaluate(() => window.__TLM2__.sim.busy)); i++) {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
}
// A take that moves to a new set (Scene 3's drive → lake) puts the card up again while it compiles.
await page.waitForSelector('.stage-loading', { state: 'detached', timeout: 120000 });
// (Software rendering never gets there: measure anyway after the timeout.)
await page.waitForFunction(() => { const f = window.__perf.frames; let ms = 0; for (let i = f.length - 1; i >= 0 && f[i] < 50; i--) ms += f[i]; return ms > 1000; }, null, { timeout: process.env.ANGLE === 'swiftshader' ? 10000 : 120000, polling: 100 }).catch(() => console.log('(frames never steady under 50 ms)'));
const after = await page.evaluate(() => ({ ...window.__perf, frames: undefined }));
if (cdp && !process.env.STEADY) await summary(cdp, 'during load');
slowest(atCard.links);
console.log(`card down ${card.toFixed(1)}s | programs ${atCard.programs} | blocked ${Math.round(atCard.blockedMs)}ms | hitches>100ms ${atCard.hitches.length} [${atCard.hitches.slice(0, 12).join(', ')}${atCard.hitches.length > 12 ? ', …' : ''}]`);
console.log(`after card: programs ${after.programs} | blocked ${Math.round(after.blockedMs)}ms | longest frame ${Math.max(0, ...after.hitches)}ms (${after.seen}ms with no card up)`);
if (after.seenAt.length) console.log(`  visible freezes over 300 ms: ${after.seenAt.join(', ')}`);
await reset();
if (cdp && process.env.STEADY) await cdp.send('Profiler.start');
await page.waitForTimeout(5000);
if (cdp && process.env.STEADY) await summary(cdp, 'over 5 s of play');
const run = await page.evaluate(() => window.__perf);
slowest(run.links);
const f = run.frames.slice().sort((a, b) => a - b);
const q = (p) => f[Math.min(f.length - 1, Math.floor(p * f.length))].toFixed(1);
if (process.env.BREAKDOWN) {
  const count = (xs) => Object.entries(xs.reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  console.log(`programs at load (${atCard.names.length}):`);
  for (const [l, n] of count(atCard.names)) console.log(`  ${String(n).padStart(3)} × ${l}`);
  if (after.names.length) console.log(`programs after the card: ${count(after.names).map(([l, n]) => `${n} × ${l}`).join(', ')}`);
  console.log('draws per frame, by program:');
  for (const [l, n] of Object.entries(run.byProgram).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(Math.round(n / f.length)).padStart(5)}  ${l}`);
}
console.log(`play fps ${(1000 / (run.frames.reduce((a, b) => a + b, 0) / f.length)).toFixed(1)} | p50 ${q(0.5)}ms p95 ${q(0.95)}ms max ${q(1)}ms | draws/frame ${Math.round(run.draws / f.length)} | late programs ${run.programs}`);
await (context ?? browser).close();
