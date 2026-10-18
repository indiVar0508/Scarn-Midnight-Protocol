// How much of a CPU core each song's synthesis costs. Every note is built live from oscillators and
// filters on Chrome's single audio thread (the renderer's AudioOutputDevice thread), which also
// plays the voices: a song that keeps it near 100% leaves nothing for a busy game, the audio clock
// falls behind, and the player hears the sound (lines included) break up (TECH gotcha 32).
// Plays each song alone on the title screen and reads that thread's CPU time from /proc (Linux).
//   node tools/qa/music-load.mjs [song[/track,track] ...]   (default: every scene's song)
// `song/track,...` plays only those tracks, to find what a song spends its time on.
// Exits 1 if any song is over the budget. Env: BASE (the dev server), CHROME, SECS (default 14),
// BUDGET (% of a core, default 50).
import { readdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5174/';
const SECS = Number(process.env.SECS ?? 14);
const BUDGET = Number(process.env.BUDGET ?? 50);
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.goto(BASE);
await page.waitForSelector('.scene-row');
const songs = process.argv.slice(2).length ? process.argv.slice(2) : await page.evaluate(async () => [...new Set((await import('/src/game/scenes/registry.data.ts')).SCENES.map((s) => s.music))]);

// Chrome's processes are this script's descendants; the audio thread is named AudioOutputDevi(ce).
const ppid = (p) => Number(readFileSync(`/proc/${p}/stat`, 'utf8').replace(/^.*\) /, '').split(' ')[1]);
function audioThreads() {
  const pids = readdirSync('/proc').filter((d) => /^\d+$/.test(d));
  const mine = new Set([process.pid]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const p of pids) {
      try {
        if (!mine.has(Number(p)) && mine.has(ppid(p))) (mine.add(Number(p)), (grew = true));
      } catch {
        /* gone */
      }
    }
  }
  const out = [];
  for (const p of mine) {
    try {
      for (const t of readdirSync(`/proc/${p}/task`)) if (readFileSync(`/proc/${p}/task/${t}/comm`, 'utf8').startsWith('AudioOutputDev')) out.push(`/proc/${p}/task/${t}/stat`);
    } catch {
      /* gone */
    }
  }
  return out;
}
const ticks = (stat) => {
  const f = readFileSync(stat, 'utf8').replace(/^.*\) /, '').split(' ');
  return Number(f[11]) + Number(f[12]); // utime + stime, in clock ticks (100 per second)
};

let over = 0;
for (const spec of songs) {
  const [id, only] = spec.split('/');
  await page.evaluate(
    async ([id, only]) => {
      const { audio } = await import('/src/shared/audio/engine.ts');
      const { music } = await import('/src/shared/audio/music.ts');
      const { SONGS } = await import('/src/shared/audio/songs.ts');
      audio.resume();
      let play = id;
      if (only) {
        const keep = only.split(',');
        const def = SONGS[id];
        const pick = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => keep.includes(k)));
        play = `${id}/${only}`;
        SONGS[play] = { ...def, id: play, instruments: pick(def.instruments), sections: Object.fromEntries(Object.entries(def.sections).map(([k, s]) => [k, { ...s, tracks: pick(s.tracks) }])) };
      }
      music.play(play, { fade: 0, force: true });
    },
    [id, only],
  );
  await page.waitForTimeout(3000); // past the intro and the first allocations
  const threads = audioThreads();
  if (!threads.length) throw new Error('no AudioOutputDevice thread found (Linux only)');
  const clock = () => page.evaluate(async () => (await import('/src/shared/audio/engine.ts')).audio.ctx.currentTime);
  const [c0, a0, w0] = [threads.map(ticks).reduce((a, b) => a + b, 0), await clock(), Date.now()];
  await page.waitForTimeout((SECS - 3) * 1000);
  const [c1, a1, w1] = [threads.map(ticks).reduce((a, b) => a + b, 0), await clock(), Date.now()];
  await page.evaluate(async () => (await import('/src/shared/audio/music.ts')).music.stop(0));
  await page.waitForTimeout(1500);
  const cpu = ((c1 - c0) * 10 * 100) / (w1 - w0); // ticks are 10 ms
  const rate = ((a1 - a0) * 1000) / (w1 - w0);
  const bad = !only && cpu > BUDGET;
  over += bad;
  console.log(`${spec.padEnd(24)} audio thread ${cpu.toFixed(0).padStart(3)}% of a core | audio clock ${rate.toFixed(2)}x${bad ? `  OVER BUDGET (${BUDGET}%)` : ''}`);
}
await browser.close();
process.exit(over ? 1 : 0);
