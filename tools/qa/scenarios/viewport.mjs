// Responsive check: run with VP=WxH. Captures the menu and an in-game frame, and reports
// canvas size, stage size and whether the page can scroll.
export default async function (t) {
  const vp = process.env.VP || '1280x720';
  await t.open();
  await t.wait(1200);
  await t.shot(`${vp}-menu`);
  await t.page.getByRole('button', { name: 'CHAPTER SELECT' }).click();
  await t.wait(600);
  await t.shot(`${vp}-chapters`);
  await t.key('Escape');
  await t.wait(400);
  await t.settings({ screeningMode: false });
  await t.start(1);
  await t.skipTalk(20000, (s) => s.beat && s.beat !== 'start' && !s.card && !s.dialogue);
  await t.wait(800);
  await t.shot(`${vp}-game`);
  const m = await t.eval(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return {
      canvas: [Math.round(r.width), Math.round(r.height)],
      aspect: +(r.width / r.height).toFixed(3),
      inside: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      scrollable: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  t.log(vp, JSON.stringify(m));
  if (Math.abs(m.aspect - 16 / 9) > 0.01) throw new Error(`canvas distorted: ${m.aspect}`);
  if (!m.inside) throw new Error('canvas overflows the viewport');
  if (m.scrollable) throw new Error('page scrolls');
}
