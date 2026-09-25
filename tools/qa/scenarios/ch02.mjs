export default async function (t) {
  await t.open();
  await t.start(2);
  await t.skipTalk(4000, (s) => !s.card);
  await t.wait(1500);
  await t.shot('wake');
  await t.skipTalk(30000, (s) => s.beat === 'roam' && s.objective && !s.dialogue);
  await t.wait(600);
  await t.shot('roam');
  await t.eval(() => window.__TLM__.teleport(160, 575));
  await t.wait(300);
  t.log('hint', (await t.state()).hint);
  await t.key('KeyE');
  await t.wait(800);
  await t.shot('photo');
  await t.skipTalk(8000);
  await t.eval(() => window.__TLM__.teleport(1150, 560));
  await t.wait(300);
  await t.key('KeyE');
  await t.waitFor((s) => s.beat === 'call', 8000);
  await t.skipTalk(6000, (s) => !!s.dialogue);
  await t.wait(800);
  await t.shot('call');
  await t.skipTalk(6000, (s) => s.dialogue && s.dialogue.choices);
  await t.shot('choice');
  await t.eval(() => window.__TLM__.advance(2));
  await t.skipTalk(30000, (s) => !s.dialogue && s.beat === 'call');
  await t.wait(500);
  await t.shot('coin');
  // play the coin flip for real: hold space, release, then press when falling
  for (let i = 0; i < 4; i++) {
    const st = await t.state();
    if (st.card) break;
    if (st.dialogue) { await t.skipTalk(6000, (s) => !s.dialogue); continue; }
    await t.hold(['Space'], 700);
    await t.wait(900);
    await t.key('Space');
    await t.wait(1600);
    await t.skipTalk(5000, (s) => !s.dialogue);
  }
  await t.skipTalk(20000, (s) => !!s.card && s.card.includes('SAVE'));
  await t.wait(800);
  await t.shot('mission');
  await t.skipTalk(20000, (s) => s.chapter === 3);
  t.log(JSON.stringify(await t.state()));
}
