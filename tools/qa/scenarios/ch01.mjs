// Chapter 1: walk, interact, both fights, cleanup, title + newspapers.
export default async function (t) {
  await t.open();
  await t.shot('menu');
  await t.start(1);
  await t.wait(1200);
  await t.shot('card');
  await t.skipTalk(15000, (s) => s.objective && !s.dialogue && !s.card);
  await t.shot('explore');
  await t.hold(['KeyD'], 1200);
  await t.eval(() => window.__TLM__.teleport(1400, 440));
  await t.wait(300);
  t.log('hint at aisle:', (await t.state()).hint);
  await t.key('KeyE');
  await t.skipTalk(8000, (s) => s.beat === 'fight1');
  await t.skipTalk(12000, (s) => !!s.hud);
  await t.wait(1500);
  await t.shot('fight1');
  await t.qa({ god: true });
  const t0 = Date.now();
  let shots = 0;
  while (Date.now() - t0 < 45000) {
    const s = await t.state();
    if (s.beat === 'cleanup') break;
    if (s.dialogue) await t.eval(() => window.__TLM__.advance(0));
    await t.hold(['KeyJ', ['KeyW', 'KeyS', 'KeyA', 'KeyD'][Math.floor(Math.random() * 4)]], 400);
    if (Math.random() > 0.8) await t.key('Space');
    if (Math.random() > 0.9) await t.key('KeyF');
    if (shots++ === 12) await t.shot('fight-mid');
  }
  t.log('after fight', JSON.stringify(await t.state()));
  await t.qa({ skipFights: true });
  await t.waitFor((s) => s.beat === 'cleanup', 30000);
  await t.eval(() => window.__TLM__.teleport(2080, 520));
  await t.wait(400);
  await t.shot('cleanup');
  await t.key('KeyE');
  await t.skipTalk(25000, (s) => s.beat === 'history');
  await t.wait(2600);
  await t.shot('title');
  await t.wait(3000);
  await t.skipTalk(8000, (s) => !!s.dialogue);
  await t.shot('news');
  await t.skipTalk(40000, (s) => s.scenes.includes('Screening') || s.chapter === 2);
  await t.wait(1500);
  await t.shot('screening');
  t.log(JSON.stringify(await t.state()));
}
