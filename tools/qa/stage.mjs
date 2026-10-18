// Each take opens behind a loading card ("Lighting the set…") while its shaders compile and its
// characters build, with the world paused (TECH §9, gotcha 28). Scripts that drive a take wait it out.
// The first wait is short: on a fast GPU the card may already be gone, or not up yet after a retake.
export async function stageShown(page, timeout = 300000) {
  await page.waitForSelector('.stage-loading', { timeout: 5000 }).catch(() => {});
  await page.waitForSelector('.stage-loading', { state: 'detached', timeout });
}
