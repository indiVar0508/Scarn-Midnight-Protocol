// Builds figures off the main thread: the same generator the scheduler runs in slices, run to
// completion here, with the finished arrays transferred (not copied) back.
import { type BuiltFigure, buildFigure, type Lod } from './build'
import { finish } from './sdf'
import type { FigureSpec } from './spec'

export interface FigureRequest {
  id: number
  spec: FigureSpec
  lod: Lod
}

export type FigureReply = { id: number; built: BuiltFigure } | { id: number; error: string }

self.onmessage = (e: MessageEvent<FigureRequest>) => {
  const { id, spec, lod } = e.data
  try {
    const built = finish(buildFigure(spec, lod))
    // A Set: arrays that are views of one buffer must list it once.
    const transfer = new Set<ArrayBufferLike>()
    for (const p of built.parts)
      for (const a of [p.positions, p.normals, p.indices, p.colors, p.skinIndex, p.skinWeight])
        transfer.add(a.buffer)
    self.postMessage({ id, built } satisfies FigureReply, { transfer: [...transfer] as Transferable[] })
  } catch (err) {
    self.postMessage({ id, error: String(err) } satisfies FigureReply)
  }
}
