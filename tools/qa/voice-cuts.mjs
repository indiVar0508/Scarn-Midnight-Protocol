// Voice-line probe for Scene 3 (Cherokee Jack) on the real GPU: plays the scene through and reports
// every voice line that was cut short (and what cut it), how long each line took against its
// recorded length, and the seconds in which the audio clock fell behind the wall clock (the audio
// thread overloaded: on speakers, the sound breaks up; TECH gotcha 32).
//   node tools/qa/voice-cuts.mjs [human|careful]
//   human:   plays like a person: clicks into the game to grab the mouse, answers with the mouse,
//            shoots and dodges with the mouse, and keeps going for a beat after a trial ends.
//   careful: touches nothing while a line plays (keys only, and only what the scene needs).
// Exits 1 if a line was cut or the audio clock ran slow in more than 5% of the seconds. Needs the
// dev server (it imports the voice module to watch it).
// Env: BASE, CHROME, ANGLE (gl by default: the real GPU, so the scene runs at real speed), FX (a
// graphics tier), SHORT=1 (stop at the first trial: the drive and the talk with Jack only).
import { chromium } from 'playwright';
import { stageShown } from './stage.mjs';
const BASE = process.env.BASE ?? 'http://localhost:5174/';
const MODE = process.argv[2] ?? 'human';
const angle = process.env.ANGLE ?? 'gl';
const browser = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: [`--use-angle=${angle}`, ...(angle === 'swiftshader' ? ['--enable-unsafe-swiftshader'] : []), '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text().slice(0, 200)));
const T = () => page.evaluate(() => { const t = window.__TLM2__.take.get(); const s = window.__TLM2__.sim; return { status: t.status, busy: s.busy, trial: t.trial?.title ?? null, score: t.trial?.score ?? null, objective: t.objective }; });
const tp = (x, z) => page.evaluate(([x, z]) => window.__TLM2__.sim.player.body.setTranslation({ x, y: 0.85, z }, true), [x, z]);
const human = MODE === 'human';
const click = async (button = 'left') => { await page.mouse.move(640, 400); await page.mouse.down({ button }); await page.waitForTimeout(90); await page.mouse.up({ button }); };

await page.goto(BASE + '?unlock=all' + (process.env.FX ? `&fx=${process.env.FX}` : ''));
await page.locator('.scene-row', { hasText: 'Cherokee Jack' }).click();
await page.waitForFunction(() => window.__TLM2__, null, { timeout: 30000 });
// Watch the voice player: each play() is a record; a stop() while it plays is a cut (with who called it).
await page.evaluate(async () => {
  const { voice } = await import('/src/shared/audio/voice.ts');
  const { audio } = await import('/src/shared/audio/engine.ts');
  const vc = (window.__vc = { log: [], cur: null, clock: [] });
  // When the line's audio actually starts (after its fetch and decode), on both clocks.
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    const rec = vc.cur;
    if (rec && !rec.started && this.buffer && Math.abs(this.buffer.duration * 1000 - rec.dur) < 150) {
      rec.started = performance.now();
      rec.ac0 = this.context.currentTime;
    }
    return start.apply(this, a);
  };
  // The audio clock against the wall clock, each second.
  setInterval(() => audio.ctx && vc.clock.push([performance.now(), audio.ctx.currentTime]), 1000);
  const play = voice.play.bind(voice);
  voice.play = (id, opts) => {
    const rec = { id, t0: performance.now(), dur: voice.duration(id), end: 0, how: null, by: null };
    vc.log.push(rec);
    vc.cur = rec;
    const p = play(id, opts);
    void p.then(() => {
      if (rec.how) return;
      rec.how = 'ended';
      rec.end = performance.now();
      rec.ac1 = audio.ctx?.currentTime;
    });
    return p;
  };
  const stop = voice.stop.bind(voice);
  voice.stop = () => {
    const rec = vc.cur;
    if (rec && !rec.how && voice.isPlaying(rec.id)) {
      rec.how = 'cut';
      rec.end = performance.now();
      rec.by = new Error().stack.split('\n').slice(2, 7).map((l) => l.trim().replace(/\(?https?:\/\/[^/]+\/(src\/)?/, '').replace(/\?[^:]*/, '')).join(' < ');
    }
    stop();
  };
});
await stageShown(page);
if (human) await click(); // grab the mouse, like anyone starting to play

// The drive plays itself; wait for the lake.
await page.waitForFunction(() => window.__TLM2__.take.get().objective?.startsWith('Find Cherokee Jack'), null, { timeout: 120000 });
await stageShown(page); // the lake is a new set: the loading card comes up again while it compiles
await page.waitForTimeout(1000);
await tp(6.0, -1.2);
await page.waitForTimeout(500);
await page.keyboard.press('KeyE');

let lastTrial = null;
let lastTrialKind = null;
let trialEnded = 0;
for (let i = 0; i < 4000; i++) {
  const st = await T();
  if (st.status === 'wrapped') break;
  if (process.env.SHORT && st.trial) break;
  if (st.trial !== lastTrial) {
    if (lastTrial && !st.trial) trialEnded = Date.now();
    lastTrial = st.trial;
  }
  const choices = page.locator('.choices button');
  if (await choices.count()) {
    await page.waitForTimeout(400);
    if (human) await choices.first().click();
    else await page.keyboard.press('Digit1');
    await page.waitForTimeout(300);
    continue;
  }
  const live = st.trial && !st.score?.startsWith('READY');
  // A person's reaction time: still shooting/dodging for a beat after the whistle.
  const afterglow = human && !st.trial && Date.now() - trialEnded < 700;
  const kind = live ? st.trial : afterglow ? lastTrialKind : null;
  if (live) lastTrialKind = st.trial;
  if (kind === 'MOP THE ICE') { await page.keyboard.down(i % 2 ? 'KeyW' : 'KeyS'); await page.keyboard.down(i % 4 < 2 ? 'KeyA' : 'KeyD'); await page.waitForTimeout(500); for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) await page.keyboard.up(k); continue; }
  if (kind === 'STICK HANDLING' || kind === 'OBSTACLES') { await page.keyboard.down('KeyW'); await page.waitForTimeout(400); await page.keyboard.up('KeyW'); continue; }
  if (kind === 'TARGETS') { await page.evaluate((y) => (window.__TLM2__.sim.cam.yaw = y), -Math.PI / 2 + ((i % 9) - 4) * 0.09); if (human) await click(); else { await page.keyboard.down('KeyJ'); await page.waitForTimeout(90); await page.keyboard.up('KeyJ'); } await page.waitForTimeout(150); continue; }
  if (kind === 'REFLEXES') { if (human) await click('right'); else await page.keyboard.press('Space'); await page.waitForTimeout(350); continue; }
  await page.waitForTimeout(200);
}

const vc = await page.evaluate(() => window.__vc);
const t0 = vc.log[0]?.t0 ?? 0;
const cut = vc.log.filter((r) => r.how === 'cut');
console.log('   at  line             how     wait   real/audio ms  (recorded)');
for (const r of vc.log) {
  const wait = r.started ? Math.round(r.started - r.t0) : -1;
  const real = r.started && r.end ? Math.round(r.end - r.started) : 0;
  const aud = r.ac1 != null && r.ac0 != null ? Math.round((r.ac1 - r.ac0) * 1000) : 0;
  console.log(`${String(Math.round((r.t0 - t0) / 1000)).padStart(5)}s  ${r.id.padEnd(16)} ${(r.how ?? 'open').padEnd(6)} ${String(wait).padStart(5)} ${String(real).padStart(6)}/${String(aud).padEnd(6)} (${r.dur})${r.by ? '  by ' + r.by : ''}`);
}
const slow = [];
for (let i = 1; i < vc.clock.length; i++) {
  const [a, x] = vc.clock[i - 1];
  const [b, y] = vc.clock[i];
  const rate = ((y - x) * 1000) / (b - a);
  if (rate < 0.9) slow.push(`${Math.round((a - t0) / 1000)}s:${rate.toFixed(2)}`);
}
const seconds = vc.clock.length - 1;
console.log(`audio clock: ${slow.length} of ${seconds} seconds ran slow${slow.length ? ' [' + slow.slice(0, 40).join(' ') + ']' : ''}`);
console.log(`${MODE}: ${vc.log.length} lines, ${cut.length} cut${cut.length ? ': ' + cut.map((r) => r.id).join(', ') : ''}`);
await browser.close();
process.exit(cut.length || slow.length > seconds * 0.05 ? 1 : 0);
