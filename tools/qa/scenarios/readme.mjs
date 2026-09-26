// Captures the README screenshots that need specific moments.
export default async function (t) {
  await t.open();
  await t.settings({ screeningMode: false });
  const skipUntil = async (pred, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const s = await t.state();
      if (await pred(s)) return true;
      if (s.card) await t.eval(() => window.__TLM__.skipCard());
      else if (s.dialogue && !(s.dialogue.who || '').includes('NARRATOR')) await t.eval(() => window.__TLM__.advance(0));
      await t.wait(250);
    }
    return false;
  };
  // newspaper montage (second paper, narration fully typed)
  await t.start(1, 'history');
  await skipUntil(async (s) => !!s.dialogue && (s.dialogue.text || '').length > 0 && (await t.eval(() => window.__TLM__.Director.game.textures.exists('news_1'))), 30000);
  await t.wait(2600);
  await t.shot('newspaper');
  // Goldenface mid-pattern
  await t.qa({ god: true });
  await t.start(6, 'lair');
  await skipUntil((s) => !!s.hud && !s.dialogue && !s.card, 40000);
  await t.wait(5200);
  await t.shot('goldenface');
  // the whole bar doing the Scarn
  await t.qa({ god: false, autoWin: true });
  await t.start(9, 'dance');
  await skipUntil(async () => await t.eval(() => window.__TLM__.ui.get().touchLayout === 'rhythm'), 40000);
  await t.wait(62000);
  await t.shot('dance');
  // hockey
  await t.qa({ autoWin: false });
  await t.start(10);
  await skipUntil((s) => (s.objective || '').includes('GOALS'), 40000);
  await t.wait(6000);
  await t.shot('hockey');
}
