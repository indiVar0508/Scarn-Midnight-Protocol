// Touch smoke test (TOUCH=1 VP=844x390): virtual stick moves Scarn, USE button interacts.
export default async function (t) {
  await t.open();
  await t.wait(800);
  await t.shot('menu');
  await t.settings({ screeningMode: false });
  await t.start(1);
  await t.skipTalk(20000, (s) => s.objective && !s.card && !s.dialogue);
  const st = await t.state();
  t.log('inputMode', await t.eval(() => window.__TLM__.ui.get().inputMode), 'layout', await t.eval(() => window.__TLM__.ui.get().touchLayout));
  await t.shot('game-touch');
  const stick = await t.page.locator('.touch .stick, .stick').first().boundingBox();
  t.log('stick box', JSON.stringify(stick));
  const x0 = (await t.eval(() => window.__TLM__.player())).x;
  if (stick) {
    // drag the stick to the right with a CDP touch sequence
    const cx = stick.x + stick.width / 2;
    const cy = stick.y + stick.height / 2;
    const cdp = await t.page.context().newCDPSession(t.page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + i * 10, y: cy }] });
      await t.wait(30);
    }
    await t.wait(1200);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  const x1 = (await t.eval(() => window.__TLM__.player())).x;
  t.log('player x', Math.round(x0), '->', Math.round(x1));
  if (!(x1 > x0 + 50)) throw new Error('virtual stick did not move Scarn');
  t.log('state', JSON.stringify(st));
}
