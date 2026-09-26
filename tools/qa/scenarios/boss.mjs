// Ch6 boss with REAL key presses (god mode keeps Scarn alive, but no skip-fights): hold fire
// with auto-aim, strafe and dodge-roll, mash through the Catherine memory. Verifies the
// shield/monologue/rest cycle, the phase callbacks and the scripted defeat all resolve.
export default async function (t) {
  await t.open();
  await t.settings({ screeningMode: false });
  await t.qa({ god: true });
  await t.start(6, 'lair');
  await t.eval(() => {
    const T = window.__TLM__;
    const held = new Set();
    const setKey = (code, on) => {
      if (on === held.has(code)) return;
      if (on) held.add(code);
      else held.delete(code);
      window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code, bubbles: true }));
    };
    const tap = (code) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })), 40);
    };
    window.__bb = { dodges: 0, mash: 0 };
    let dir = 0;
    let lastTap = 0;
    let nextTurn = 0;
    const tick = () => {
      const ui = T.ui.get();
      const now = performance.now();
      const fight = !ui.dialogue && !ui.card && T.save.get().beat === 'lair';
      if (ui.touchLayout === 'buttons' && fight) {
        // mash prompt (REFUSE TO SURRENDER / Catherine memory)
        ['KeyJ', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].forEach((k) => setKey(k, false));
        if (now - lastTap > 90) {
          tap('Space');
          lastTap = now;
          window.__bb.mash++;
        }
      } else if (fight) {
        setKey('KeyJ', true);
        if (now > nextTurn) {
          dir = (dir + 1) % 4;
          nextTurn = now + 700 + Math.random() * 600;
          if (Math.random() < 0.35) {
            tap('Space');
            window.__bb.dodges++;
          }
        }
        setKey('KeyW', dir === 0);
        setKey('KeyD', dir === 1);
        setKey('KeyS', dir === 2);
        setKey('KeyA', dir === 3);
      } else {
        ['KeyJ', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].forEach((k) => setKey(k, false));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const t0 = Date.now();
  let n = 0;
  while (Date.now() - t0 < 480000) {
    const s = await t.state();
    if (s.chapter === 7 || s.beat === 'defeat') break;
    if (s.card) await t.eval(() => window.__TLM__.skipCard());
    else if (s.dialogue) await t.eval(() => window.__TLM__.advance(0));
    if ((Date.now() - t0) / 20000 > n) {
      n++;
      const info = await t.eval(() => {
        const sc = window.__TLM__.scene();
        const gf = sc && sc.actors && sc.actors.find((a) => a.constructor && a.constructor.name === 'Goldenface');
        return { hp: gf ? gf.hp : null, phase: gf ? gf.phase : null, bot: window.__bb, stats: window.__TLM__.save.get().stats.shotsFired };
      });
      t.log(Math.round((Date.now() - t0) / 1000) + 's', s.beat, JSON.stringify(s.hud), JSON.stringify(info));
      await t.shot(`boss-${n}`);
    }
    await t.wait(300);
  }
  const s = await t.state();
  t.log('end', s.chapter, s.beat, JSON.stringify(await t.eval(() => ({ bb: window.__bb, st: window.__TLM__.save.get().stats }))));
  if (!(s.chapter === 7 || s.beat === 'defeat')) throw new Error('boss fight did not resolve');
}
