// Chapter 5: fax, password, clues, tape puzzle solved via the real UI, dart, kitchen escape.
export default async function (t) {
  await t.open();
  await t.start(5);
  await t.skipTalk(40000, (s) => s.dialogue && s.dialogue.choices);
  await t.shot('password');
  await t.eval(() => window.__TLM__.advance(0)); // "Bears" (wrong)
  await t.skipTalk(8000, (s) => s.dialogue && s.dialogue.choices);
  await t.eval(() => window.__TLM__.advance(1)); // "Beets"
  await t.skipTalk(20000, (s) => s.beat === 'club' && s.objective && !s.dialogue);
  await t.shot('club');
  const go = async (x, y) => { await t.eval(([a, b]) => window.__TLM__.teleport(a, b), [x, y]); await t.wait(300); t.log('hint', (await t.state()).hint); await t.key('KeyE'); await t.wait(300); await t.skipTalk(10000, (s) => !s.busy && !s.dialogue); };
  await go(560, 490);
  await go(860, 650);
  await go(1280, 670);
  await t.skipTalk(20000, (s) => s.tape);
  await t.wait(1500);
  await t.shot('deck');
  // solve: record, reverse, speed to 1.25, play
  await t.key('KeyR');
  await t.wait(400);
  await t.key('KeyB');
  for (let i = 0; i < 5; i++) { await t.key('ArrowRight'); await t.wait(80); }
  await t.wait(300);
  await t.key('Space');
  await t.wait(1800);
  await t.shot('decoded');
  const tp = await t.eval(() => window.__TLM__.tape.get());
  t.log('tape', JSON.stringify(tp));
  await t.key('Digit2');
  await t.skipTalk(40000, (s) => s.beat === 'escape' && !!s.hud);
  await t.shot('escape');
  await t.qa({ god: true, skipFights: true });
  await t.waitFor((s) => s.objective && s.objective.includes('EXIT'), 30000);
  await go(2110, 450);
  await t.skipTalk(20000, (s) => s.chapter === 6);
  t.log(JSON.stringify(await t.state()));
}
