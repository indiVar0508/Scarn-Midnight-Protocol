export default async function (t) {
  await t.open();
  await t.start(1);
  await t.wait(4000);
  const info = await t.eval(() => {
    const g = window.__TLM__.Director.game;
    return g.scene.scenes.map((s) => ({ key: s.scene.key, status: s.sys.settings.status, visible: s.sys.settings.visible, kids: s.children.list.length, camAlpha: s.cameras?.main?.alpha, fade: s.cameras?.main?.fadeEffect?.isRunning }));
  });
  t.log(JSON.stringify(info, null, 0));
  await t.shot('x');
}
