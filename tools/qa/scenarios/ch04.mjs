// Chapter 4: race (real alternating input), skate fight (real), locker stealth (scripted route).
export default async function (t) {
  await t.open();
  await t.start(4);
  await t.skipTalk(40000, (s) => s.beat === 'race' && !s.dialogue && !s.card);
  await t.wait(2800);
  for (let i = 0; i < 40; i++) {
    const s = await t.state();
    if (s.beat !== 'race') break;
    await t.key(i % 2 ? 'KeyD' : 'KeyA', 60);
    await t.wait(160);
    if (i === 10) await t.shot('race');
  }
  await t.skipTalk(40000, (s) => !!s.hud);
  await t.shot('fight');
  await t.qa({ god: true });
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    const s = await t.state();
    if (s.beat === 'dq') break;
    if (s.dialogue) await t.eval(() => window.__TLM__.advance(0));
    await t.hold(['KeyJ', ['KeyW', 'KeyS', 'KeyA', 'KeyD'][Math.floor(Math.random() * 4)]], 400);
  }
  await t.qa({ skipFights: true });
  await t.skipTalk(40000, (s) => s.beat === 'locker' && s.objective && !s.dialogue);
  await t.wait(800);
  await t.shot('locker');
  await t.qa({ god: true });
  const go = async (x, y) => { await t.eval(([a, b]) => window.__TLM__.teleport(a, b), [x, y]); await t.wait(300); t.log('hint', (await t.state()).hint); await t.key('KeyE'); await t.wait(300); await t.skipTalk(8000, (s) => !s.busy && !s.dialogue); };
  await go(170 + 4 * 92, 440); // disguise
  await t.shot('disguise');
  await go(800, 500); // camera
  await go(1366, 440); // swap
  await go(90, 460); // exit
  await t.skipTalk(20000, (s) => s.chapter === 5);
  t.log(JSON.stringify(await t.state()));
  t.log('ach', JSON.stringify(await t.eval(() => window.__TLM__.save.get().achievements)));
}
