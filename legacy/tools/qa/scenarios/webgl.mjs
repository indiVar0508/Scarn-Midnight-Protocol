// WebGL smoke test (run with --webgl): visits filter-heavy moments and checks for errors.
export default async function (t) {
  await t.open();
  await t.wait(1500);
  await t.shot('menu');
  await t.settings({ screeningMode: false });
  await t.qa({ god: true, skipFights: true, autoWin: true });
  const visits = [
    [1, 'history', 9000],  // title slam + newspapers (soft focus on Catherine)
    [6, 'lair', 12000],    // boss arena, shield
    [8, 'rain', 6000],     // grayscale + rain
    [10, 'ghost', 14000],  // grayscale low point, cheap ghost
  ];
  for (const [ch, beat, ms] of visits) {
    await t.start(ch, beat);
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const s = await t.state();
      if (s.card) await t.eval(() => window.__TLM__.skipCard());
      else if (s.dialogue) await t.eval(() => window.__TLM__.advance(0));
      await t.wait(400);
    }
    const s = await t.state();
    t.log(`ch${ch}/${beat}`, 'fps', s.fps, 'renderer', await t.eval(() => window.__TLM__.Director.game.renderer.type));
    await t.shot(`ch${ch}-${beat}`);
  }
}
