// Shell QA: fresh-save chapter locks, settings persistence across reloads, pause menu,
// restart checkpoint, and chapter unlock after completion.
export default async function (t) {
  const expect = (cond, msg) => {
    if (!cond) throw new Error(`EXPECTATION FAILED: ${msg}`);
    t.log('ok -', msg);
  };
  // 1. Fresh save: only chapter 1 reachable
  await t.open('', { unlock: false });
  await t.wait(1500);
  let save = await t.eval(() => window.__TLM__.save.get());
  expect(save.reached === 1 && !save.completed, `fresh save reaches only chapter 1 (reached=${save.reached})`);
  await t.shot('menu');
  const chapterBtn = t.page.getByRole('button', { name: 'CHAPTER SELECT' });
  expect(await chapterBtn.isDisabled(), 'Chapter Select is locked on a fresh save');

  // 2. Settings persistence (through the real Settings screen)
  await t.page.getByText('SETTINGS', { exact: true }).first().click();
  await t.wait(600);
  await t.shot('settings');
  const before = await t.eval(() => window.__TLM__.settings.get());
  await t.page.getByRole('switch', { name: 'Reduced flashing' }).click();
  await t.page.getByText('High-contrast indicators', { exact: true }).click(); // label row click
  await t.wait(300);
  const after = await t.eval(() => window.__TLM__.settings.get());
  expect(after.reducedFlashing !== before.reducedFlashing && after.highContrast !== before.highContrast, 'settings toggles change state');
  await t.page.reload();
  await t.wait(2500);
  const reloaded = await t.eval(() => window.__TLM__.settings.get());
  expect(reloaded.reducedFlashing === after.reducedFlashing && reloaded.highContrast === after.highContrast, 'settings survive a page reload');
  await t.page.mouse.click(640, 360);
  await t.wait(600);

  // 3. Play chapter 1 with QA assists until chapter 2 starts -> chapter 2 unlocked
  await t.settings({ screeningMode: false });
  await t.qa({ autoWin: true, skipFights: true, god: true });
  await t.start(1);
  await t.skipTalk(15000, (s) => s.objective && !s.dialogue && !s.card);
  await t.eval(() => window.__TLM__.teleport(1400, 440));
  await t.wait(300);
  await t.key('KeyE');
  await t.skipTalk(60000, (s) => s.beat === 'cleanup' && !s.dialogue && !s.busy);
  await t.eval(() => window.__TLM__.teleport(2080, 520));
  await t.wait(400);
  await t.key('KeyE');
  await t.skipTalk(120000, (s) => s.chapter === 2);
  save = await t.eval(() => window.__TLM__.save.get());
  expect(save.reached >= 2, `completing chapter 1 unlocks chapter 2 (reached=${save.reached})`);

  // 4. Pause + restart checkpoint in chapter 2
  await t.skipTalk(30000, (s) => s.beat && s.beat !== 'start' && !s.card);
  const beatBefore = (await t.state()).beat;
  await t.key('Escape');
  await t.wait(500);
  let s = await t.state();
  expect(s.paused === true, 'Escape pauses the game');
  await t.shot('pause');
  await t.page.getByText('RESTART CHECKPOINT', { exact: true }).click();
  await t.wait(2500);
  s = await t.state();
  expect(!s.paused && s.chapter === 2 && s.beat === beatBefore, `restart checkpoint resumes chapter 2 at beat "${beatBefore}" (now ${s.beat})`);
  await t.key('Escape');
  await t.wait(400);
  await t.key('Escape');
  await t.wait(400);
  s = await t.state();
  expect(!s.paused, 'Escape again resumes');

  // 5. Reload -> save persisted, chapter select shows chapters 1-2
  await t.page.reload();
  await t.wait(2500);
  save = await t.eval(() => window.__TLM__.save.get());
  expect(save.started && save.chapter === 2 && save.reached >= 2, `save survives reload (chapter=${save.chapter}, beat=${save.beat})`);
  await t.page.mouse.click(640, 360);
  await t.wait(800);
  await t.shot('menu-continue');
  expect(!(await chapterBtn.isDisabled()), 'Chapter Select is available after progress');
  await chapterBtn.click();
  await t.wait(700);
  await t.shot('chapter-select');
  const locked = await t.page.locator('.locked, [aria-disabled="true"], button:disabled').count();
  t.log('locked chapter entries:', locked);
}
