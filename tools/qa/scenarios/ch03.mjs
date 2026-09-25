// Chapter 3: drive montage, Cherokee Jack, five drills played with real (random) input.
export default async function (t) {
  await t.open();
  await t.start(3);
  await t.skipTalk(6000, (s) => !s.card);
  await t.wait(2500);
  await t.shot('drive');
  await t.skipTalk(40000, (s) => s.beat === 'jack' && s.objective && !s.dialogue);
  await t.eval(() => window.__TLM__.teleport(1500, 470));
  await t.wait(400);
  await t.key('KeyE');
  await t.skipTalk(15000, (s) => s.dialogue && s.dialogue.choices);
  await t.shot('jack');
  await t.eval(() => window.__TLM__.advance(0));
  await t.skipTalk(30000, (s) => s.beat === 'training' && !s.dialogue && !s.card);
  const keys = ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyJ'];
  const t0 = Date.now();
  let n = 0;
  while (Date.now() - t0 < 200000) {
    const s = await t.state();
    if (s.chapter === 4 || s.scenes.includes('Screening')) break;
    if (s.dialogue) { await t.eval(() => window.__TLM__.advance(0)); await t.wait(200); continue; }
    if (s.card) { await t.eval(() => window.__TLM__.skipCard()); }
    const k = keys[Math.floor(Math.random() * keys.length)];
    await t.hold([k], 120 + Math.random() * 200);
    if (n++ % 40 === 5) await t.shot('drill');
  }
  t.log(JSON.stringify(await t.state()));
  const flags = await t.eval(() => window.__TLM__.save.get().stats.trainingScore);
  t.log('trainingScore', flags);
}
