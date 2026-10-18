import { DEFAULT_PALETTE } from '@runek/core'
import { describe, expect, it } from 'vitest'
import { figureKey, requestFigure, whenFiguresIdle } from './scheduler'
import { resolveFigure, type TraitInput } from './spec'

const spec = (seed: number) =>
  resolveFigure({ seed, style: 'stylized', kind: 'villager', age: 'adult' } as TraitInput, DEFAULT_PALETTE, 1).spec
/** No frame has measured these figures yet (the world is paused while a take loads). */
const unmeasured = () => Number.POSITIVE_INFINITY

// Node has no Worker: these run the scheduler's main-thread path, which shares its queue order.
describe('figure scheduler', () => {
  it('builds coarse figures before detailed ones even when nothing has a distance yet', async () => {
    const a = spec(1001)
    const b = spec(1002)
    const order: string[] = []
    requestFigure(a, figureKey(a), 'near', unmeasured, () => order.push('near'))
    requestFigure(b, figureKey(b), 'far', unmeasured, () => order.push('far'))
    await whenFiguresIdle()
    expect(order).toEqual(['far', 'near'])
  }, 60000)

  it("whenFiguresIdle('far') resolves once every coarse build is in, before the detailed ones", async () => {
    const a = spec(1003)
    const b = spec(1004)
    let near = false
    let far = false
    requestFigure(a, figureKey(a), 'near', unmeasured, () => (near = true))
    requestFigure(b, figureKey(b), 'far', unmeasured, () => (far = true))
    await whenFiguresIdle('far')
    expect(far).toBe(true)
    expect(near).toBe(false)
    await whenFiguresIdle()
    expect(near).toBe(true)
  }, 60000)

  it('resolves at once with nothing queued', async () => {
    await expect(whenFiguresIdle()).resolves.toBeUndefined()
  })
})
