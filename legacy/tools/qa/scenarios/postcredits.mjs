// Credits roll -> post-credits scene -> stats, the way the finale reaches it.
export default async function (t) {
  const until = async (fn, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await t.eval(fn)) return true;
      await t.wait(250);
    }
    return false;
  };
  await t.open();
  await t.eval(() => window.__TLM__.ui.set({ screen: 'credits', creditsNext: 'stats' }));
  await t.wait(2500);
  await t.shot('roll');
  await t.key('Enter');
  const post = await until(() => !!document.querySelector('.postcredits .pc-line'), 8000);
  await t.wait(800);
  await t.shot('post');
  const noon = await until(() => !!document.querySelector('.pc-noon'), 90000);
  await t.wait(600);
  await t.shot('noon');
  const stats = await until(() => window.__TLM__.state().screen === 'stats', 60000);
  t.log('post', post, 'noon', noon, 'stats', stats);
  if (!post || !noon || !stats) throw new Error('post-credits did not play through');
}
