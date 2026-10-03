// Ch9 with REAL key presses: an in-page bot presses lane keys at note times with human-ish
// jitter (sd ~35 ms) and deliberately fumbles ~6% of notes. BOT=bad plays late and sloppy
// to exercise the fail -> retry -> forced-assist path.
export default async function (t) {
  const bad = process.env.BOT === 'bad';
  await t.open();
  await t.settings({ screeningMode: false });
  await t.start(9, 'dance');
  await t.eval((bad) => {
    const T = window.__TLM__;
    const KEYS = ['ArrowLeft', 'ArrowDown', 'Space', 'ArrowUp', 'ArrowRight'];
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.06; // ~sd 35ms
    let chart = T.rhythm.chart(false);
    let idx = 0;
    let lastSong = -1;
    window.__bot = { pressed: 0, skipped: 0 };
    const press = (code) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })), 60);
    };
    const tick = () => {
      if (T.ui.get().touchLayout === 'rhythm') {
        const now = T.rhythm.songTime() - T.rhythm.latency();
        if (now < lastSong - 1) {
          // song restarted (retry): reset, and a retry after failing uses the assist chart
          idx = 0;
          chart = T.rhythm.chart(true);
        }
        lastSong = now;
        while (idx < chart.length) {
          const n = chart[idx];
          const target = n.beat * T.rhythm.spb + (bad ? 0.13 + gauss() : gauss());
          if (now < target) break;
          if (now - target < 0.1) {
            if (Math.random() < (bad ? 0.45 : 0.06)) window.__bot.skipped++;
            else {
              press(KEYS[n.lane]);
              window.__bot.pressed++;
            }
          }
          idx++;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, bad);
  // skip the lead-in dialogue until the rhythm lanes are up
  for (let i = 0; i < 300; i++) {
    if (await t.eval(() => window.__TLM__.ui.get().touchLayout === 'rhythm')) break;
    const s = await t.state();
    if (s.card) await t.eval(() => window.__TLM__.skipCard());
    else if (s.dialogue) await t.eval(() => window.__TLM__.advance(0));
    await t.wait(200);
  }
  t.log('rhythm layout up:', await t.eval(() => window.__TLM__.ui.get().touchLayout === 'rhythm'));
  await t.wait(20000);
  await t.shot('dance-20s');
  await t.wait(40000);
  await t.shot('dance-60s');
  const end = await t.skipTalk(400000, (s) => s.chapter === 10);
  const res = await t.eval(() => ({ stats: window.__TLM__.save.get().stats, bot: window.__bot, fails: window.__TLM__.save.get().flags.ch09_fails, ach: window.__TLM__.save.get().achievements }));
  t.log('result', JSON.stringify({ dance: res.stats.danceAccuracy, combo: res.stats.danceMaxCombo, bot: res.bot, fails: res.fails, ach: res.ach, chapter: end.chapter }));
  if (end.chapter !== 10) throw new Error('did not finish the dance');
}
