// Chapters 6-11 flow test with QA assists (auto-win minigames, skip fights, god mode).
export default async function (t) {
  await t.open();
  await t.settings({ screeningMode: false });
  await t.qa({ autoWin: true, skipFights: true, god: true });
  const go = async (x, y, label) => {
    await t.skipTalk(30000, (s) => !s.busy && !s.dialogue && !s.card);
    await t.eval(([a, b]) => window.__TLM__.teleport(a, b), [x, y]);
    await t.wait(350);
    const h = (await t.state()).hint;
    t.log(`[${label}] hint:`, h);
    await t.key('KeyE');
    await t.wait(400);
  };
  const waitBeat = (b, ms = 60000) => t.skipTalk(ms, (s) => s.beat === b && !s.dialogue && !s.card && !s.busy);
  // FROM=n starts the run at chapter n (the rest chains naturally).
  const from = Number(process.env.FROM || 6);
  const at = async (n) => {
    if (from === n) await t.start(n);
    return from <= n;
  };
  // ---- Ch6
  if (await at(6)) {
  await waitBeat('roomA');
  await t.wait(800);
  await t.shot('ch6-roomA');
  await go(1850, 450, 'A door');
  await waitBeat('roomB');
  await t.wait(600);
  await t.shot('ch6-roomB');
  await go(900, 460, 'terminal');
  await t.skipTalk(20000, (s) => !s.busy && !s.dialogue);
  await go(2050, 450, 'B door');
  await waitBeat('roomC');
  await t.shot('ch6-roomC');
  await go(1350, 655, 'keycard');
  await go(1950, 450, 'C door');
  await waitBeat('hostages');
  await go(620, 560, 'hostages');
  await t.skipTalk(30000, (s) => s.objective && s.objective.includes('boiler'));
  await t.shot('ch6-hostages');
  await go(1650, 450, 'boiler door');
  await t.skipTalk(90000, (s) => s.beat === 'lair' && !!s.hud && !s.dialogue);
  await t.wait(1500);
  await t.shot('ch6-boss');
  await t.skipTalk(120000, (s) => s.chapter === 7);
  t.log('reached ch7', JSON.stringify(await t.state()));
  }
  // ---- Ch7
  if (await at(7)) {
  await t.wait(2500);
  await t.shot('ch7');
  await t.skipTalk(60000, (s) => s.chapter === 8);
  }
  // ---- Ch8
  if (await at(8)) {
  await waitBeat('oval');
  await t.wait(500);
  await t.shot('ch8-oval');
  await go(760, 510, 'president');
  await t.skipTalk(60000, (s) => s.beat === 'escape' && !!s.hud);
  await t.wait(3000);
  await t.shot('ch8-run');
  await t.skipTalk(90000, (s) => s.beat === 'rain' && !s.dialogue);
  await t.wait(1500);
  await t.shot('ch8-rain');
  for (let i = 0; i < 60; i++) {
    const s = await t.state();
    if (s.chapter === 9) break;
    if (s.dialogue) await t.eval(() => window.__TLM__.advance(0));
    await t.hold(['KeyD'], 500);
  }
  }
  // ---- Ch9
  if (await at(9)) {
  await t.skipTalk(60000, (s) => s.chapter === 9 && s.objective && s.objective.includes('G9') && !s.busy);
  await t.shot('ch9-bar');
  await go(1560, 480, 'jukebox');
  await t.skipTalk(30000, (s) => s.beat === 'dance' && !s.dialogue);
  await t.wait(9000);
  await t.shot('ch9-dance');
  await t.skipTalk(200000, (s) => s.chapter === 10);
  t.log('dance done', JSON.stringify(await t.eval(() => window.__TLM__.save.get().stats)));
  }
  // ---- Ch10
  if (await at(10)) {
  await t.wait(1500);
  await t.skipTalk(60000, (s) => s.objective && s.objective.includes('GOALS'));
  await t.shot('ch10-hockey');
  await t.skipTalk(120000, (s) => s.beat === 'bomb' && s.objective && s.objective.includes('KEEP'));
  await t.shot('ch10-bomb');
  await t.skipTalk(120000, (s) => s.beat === 'flight');
  await t.wait(2500);
  await t.shot('ch10-flight');
  await t.skipTalk(120000, (s) => s.beat === 'victory');
  await t.wait(1500);
  await t.shot('ch10-victory');
  await t.skipTalk(60000, (s) => s.chapter === 11);
  }
  // ---- Ch11
  await at(11);
  await t.skipTalk(30000, (s) => s.objective && s.objective.includes('trophy'));
  await t.shot('ch11');
  await go(880, 450, 'shelf');
  await t.skipTalk(40000, (s) => s.objective && s.objective.includes('Samuel') && !s.busy);
  await go(1300, 500, 'samuel');
  await t.skipTalk(40000, (s) => s.objective && s.objective.includes('phone') && !s.busy);
  await go(1160, 545, 'phone');
  await t.skipTalk(60000, (s) => s.screen === 'credits');
  await t.wait(3000);
  await t.shot('credits');
  await t.eval(() => window.__TLM__.ui.set({ screen: 'stats' }));
  await t.wait(1500);
  await t.shot('stats');
  t.log('final', JSON.stringify(await t.state()), JSON.stringify(await t.eval(() => window.__TLM__.save.get().achievements)));
}
