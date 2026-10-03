// Ch10 with REAL key presses: an in-page bot skates (WASD), chases the puck, pokes (E),
// checks (Space), carries it right and charges/releases slapshots (hold J). During the
// bomb phase it keeps the puck in the middle of the rink. Super shot: mashes Space.
export default async function (t) {
  await t.open();
  await t.settings({ screeningMode: false });
  await t.start(10);
  await t.eval(() => {
    const T = window.__TLM__;
    const held = new Set();
    const setKey = (code, on) => {
      if (on && !held.has(code)) {
        held.add(code);
        window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      } else if (!on && held.has(code)) {
        held.delete(code);
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      }
    };
    const tap = (code) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })), 50);
    };
    const steer = (dx, dy) => {
      setKey('KeyD', dx > 25);
      setKey('KeyA', dx < -25);
      setKey('KeyS', dy > 18);
      setKey('KeyW', dy < -18);
    };
    window.__hbot = { shots: 0, pokes: 0, checks: 0, mash: 0 };
    let chargeT = 0;
    let lastTap = 0;
    const tick = () => {
      const sc = T.scene();
      const h = sc && sc.hockey;
      const ui = T.ui.get();
      const now = performance.now();
      if (ui.dialogue || ui.card) {
        steer(0, 0);
        setKey('KeyJ', false);
      } else if (ui.touchLayout === 'buttons' && save_beat() === 'ghost') {
        // super shot: mash, then keep tapping (aim release lands wherever the ring is)
        steer(0, 0);
        if (now - lastTap > 110) {
          tap('Space');
          lastTap = now;
          window.__hbot.mash++;
        }
      } else if (h && !h.frozen && h.human) {
        const me = h.human;
        const p = h.puck;
        const bomb = save_beat() === 'bomb';
        if (p.owner === me) {
          if (bomb) {
            // keep-away: circle the centre ice
            const a = now / 900;
            steer(1300 + Math.cos(a) * 250 - me.x, 540 + Math.sin(a) * 90 - me.y);
            setKey('KeyJ', false);
          } else if (me.x < 1850) {
            steer(2000 - me.x, 540 - me.y);
            setKey('KeyJ', false);
          } else {
            // wind up, then aim for a corner the goalie is NOT covering (hold W or S on release)
            const g = h.skaters.find((k) => k.role === 'goalie' && k.team === 'away');
            const corner = g && g.y > 540 ? -1 : 1;
            setKey('KeyJ', true);
            chargeT += 16;
            if (chargeT < 600) steer(40, 540 - me.y);
            else {
              setKey('KeyD', false);
              setKey('KeyA', false);
              setKey(corner < 0 ? 'KeyW' : 'KeyS', true);
              setKey(corner < 0 ? 'KeyS' : 'KeyW', false);
            }
            if (chargeT > 750) {
              setKey('KeyJ', false);
              chargeT = 0;
              window.__hbot.shots++;
            }
          }
        } else {
          setKey('KeyJ', false);
          chargeT = 0;
          steer(p.x - me.x, p.y - me.y);
          const d = Math.hypot(p.x - me.x, p.y - me.y);
          if (p.owner && d < 70 && now - lastTap > 250) {
            if (Math.random() < 0.5) {
              tap('KeyE');
              window.__hbot.pokes++;
            } else {
              tap('Space');
              window.__hbot.checks++;
            }
            lastTap = now;
          }
        }
      } else {
        steer(0, 0);
        setKey('KeyJ', false);
      }
      requestAnimationFrame(tick);
    };
    const save_beat = () => T.save.get().beat;
    window.__goals = [];
    setInterval(() => {
      const h = T.scene() && T.scene().hockey;
      if (h && h.onGoal && !h.onGoal.__wrapped) {
        const orig = h.onGoal;
        const w = (team, scorer) => {
          window.__goals.push({ team, scorer: scorer ? (scorer.human ? 'SCARN' : scorer.role + ':' + scorer.team) : null, lastTouch: h.puck.lastTouch ? (h.puck.lastTouch.human ? 'SCARN' : h.puck.lastTouch.role + ':' + h.puck.lastTouch.team) : null });
          return orig(team, scorer);
        };
        w.__wrapped = true;
        h.onGoal = w;
      }
    }, 200);
    requestAnimationFrame(tick);
  });
  const t0 = Date.now();
  let shot = 0;
  while (Date.now() - t0 < 600000) {
    const s = await t.state();
    if (s.chapter === 11) break;
    if (process.env.PERIOD1 && s.beat === 'bomb') break;
    if (s.card) await t.eval(() => window.__TLM__.skipCard());
    else if (s.dialogue) await t.eval(() => window.__TLM__.advance(0));
    if ((Date.now() - t0) / 30000 > shot) {
      shot++;
      await t.shot(`hockey-${s.beat}`);
      t.log(Math.round((Date.now() - t0) / 1000) + 's', s.beat, s.objective, JSON.stringify(await t.eval(() => window.__hbot)), 'scarn goals', await t.eval(() => window.__TLM__.save.get().stats.goals));
    }
    await t.wait(300);
  }
  const st = await t.eval(() => ({ stats: window.__TLM__.save.get().stats, ach: window.__TLM__.save.get().achievements, flags: window.__TLM__.save.get().flags }));
  t.log('goals', JSON.stringify(await t.eval(() => window.__goals)));
  t.log('result', JSON.stringify({ goals: st.stats.goals, checks: st.stats.checks, steals: st.stats.steals, ach: st.ach, supershot: st.flags.supershot_q, takes: st.flags.takes_10, chapter: (await t.state()).chapter }));
  if (!process.env.PERIOD1 && (await t.state()).chapter !== 11) throw new Error('hockey chapter did not finish');
}
