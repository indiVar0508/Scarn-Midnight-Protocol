export default async function (t) {
  await t.open();
  await t.start(1);
  await t.wait(3000);
  const info = await t.eval(() => {
    const g = window.__TLM__.Director.game;
    const sc = g.scene.getScene('Ch01');
    sc.add.rectangle(640, 360, 300, 300, 0xff0000).setScrollFactor(0).setDepth(99999);
    const canvases = [...document.querySelectorAll('canvas')].map((c) => ({ w: c.width, h: c.height, parent: c.parentElement?.id, vis: getComputedStyle(c).display }));
    return { type: g.renderer.type, canvases, loopFrame: g.loop.frame };
  });
  await t.wait(1000);
  t.log(JSON.stringify(info));
  t.log(await t.eval(() => window.__TLM__.Director.game.loop.frame));
  await t.shot('red');
}
