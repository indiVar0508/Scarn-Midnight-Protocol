// One shared queue for figure builds: coarse builds before detailed ones, nearest first. Builds run
// on a small pool of workers when the page can start them, so they cost the render loop nothing and
// several run at once; otherwise in short tasks between frames (never more than a few
// milliseconds at once, so input and rendering stay smooth). Finished builds are cached by spec,
// so identical figures (and a figure that walks out of detail range and back) never build twice.
import { type BuiltFigure, buildFigure, type Lod } from './build'
import type { FigureReply, FigureRequest } from './figure.worker'
import type { FigureSpec } from './spec'

/** Longest stretch of main-thread build work before yielding back to the page, in milliseconds. */
const BUDGET = 6
/** Finished builds kept for reuse (a full-detail one is ~10 MB of arrays). */
const KEEP: Record<Lod, number> = { near: 4, far: 48 }

type Listener = (built: BuiltFigure) => void

interface Job {
  key: string
  lod: Lod
  spec: FigureSpec
  /** The main-thread build, once started. */
  gen: Generator<void, BuiltFigure> | null
  /** Out on a worker. */
  running: boolean
  listeners: Map<Listener, () => number>
}

const cache: Record<Lod, Map<string, BuiltFigure>> = { near: new Map(), far: new Map() }
const jobs = new Map<string, Job>()
let ticking = false
let idle: { lod?: Lod; resolve: () => void }[] = []

const pending = (lod?: Lod) => {
  for (const job of jobs.values()) if (!lod || job.lod === lod) return true
  return false
}

/**
 * Resolves once no figure is waiting to be built (now, if none is). With `lod`, only builds of
 * that level count: `'far'` means every figure on screen has a body.
 */
export function whenFiguresIdle(lod?: Lod): Promise<void> {
  if (!pending(lod)) return Promise.resolve()
  return new Promise((resolve) => idle.push({ lod, resolve }))
}

function settle() {
  if (idle.length === 0) return
  const still = []
  for (const w of idle) {
    if (pending(w.lod)) still.push(w)
    else w.resolve()
  }
  idle = still
}

export function figureKey(spec: FigureSpec) {
  return JSON.stringify(spec)
}

/** A finished build, if there is one (refreshing its place in the cache). */
export function peekFigure(key: string, lod: Lod): BuiltFigure | null {
  const hit = cache[lod].get(key)
  if (!hit) return null
  cache[lod].delete(key)
  cache[lod].set(key, hit)
  return hit
}

/**
 * Ask for a build. `onReady` fires once it's done (synchronously when cached); `distance` is read
 * whenever the queue picks its next job. Returns a cancel: a build nobody waits for is dropped
 * (one already out on a worker finishes into the cache).
 */
export function requestFigure(
  spec: FigureSpec,
  key: string,
  lod: Lod,
  distance: () => number,
  onReady: Listener,
): () => void {
  const hit = peekFigure(key, lod)
  if (hit) {
    onReady(hit)
    return () => {}
  }
  const id = `${lod}:${key}`
  let job = jobs.get(id)
  if (!job) {
    job = { key, lod, spec, gen: null, running: false, listeners: new Map() }
    jobs.set(id, job)
  }
  job.listeners.set(onReady, distance)
  schedule()
  const mine = job
  return () => {
    mine.listeners.delete(onReady)
    if (mine.listeners.size === 0 && !mine.running && jobs.get(id) === mine) jobs.delete(id)
    settle()
  }
}

/** Coarse builds before detailed ones, then nearest first (compared in that order, so a figure
 *  no frame has measured yet, infinitely far, still sorts by level). */
function priority(job: Job): [number, number] {
  let d = Number.POSITIVE_INFINITY
  for (const read of job.listeners.values()) d = Math.min(d, read())
  return [job.lod === 'far' ? 0 : 1, d]
}

const before = (a: [number, number], b: [number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])

/** The most urgent job not out on a worker. */
function next(): [string, Job] | null {
  let best: [string, Job] | null = null
  let bestP: [number, number] = [0, 0]
  for (const entry of jobs) {
    if (entry[1].running) continue
    const p = priority(entry[1])
    if (best === null || before(p, bestP)) {
      bestP = p
      best = entry
    }
  }
  return best
}

function finishJob(id: string, job: Job, done: BuiltFigure) {
  if (jobs.get(id) === job) jobs.delete(id)
  const store = cache[job.lod]
  store.set(job.key, done)
  while (store.size > KEEP[job.lod]) {
    const oldest = store.keys().next().value
    if (oldest === undefined) break
    store.delete(oldest)
  }
  for (const listener of job.listeners.keys()) listener(done)
}

// ---- workers ---------------------------------------------------------------------------------

interface Slot {
  worker: Worker
  job: [string, Job] | null
  request: number
}

/** `undefined` until first needed; `null` when workers aren't available (or failed to start). */
let pool: Slot[] | null | undefined
let requests = 0

function workers(): Slot[] | null {
  if (pool !== undefined) return pool
  pool = null
  if (typeof Worker !== 'function' || typeof window === 'undefined') return pool
  const n = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 2))
  try {
    const slots: Slot[] = []
    for (let i = 0; i < n; i++) {
      const worker = new Worker(new URL('./figure.worker.ts', import.meta.url), { type: 'module' })
      const slot: Slot = { worker, job: null, request: -1 }
      worker.onmessage = (e: MessageEvent<FigureReply>) => reply(slot, e.data)
      worker.onerror = (e) => {
        e.preventDefault()
        abandonWorkers()
      }
      slots.push(slot)
    }
    pool = slots
  } catch {
    pool = null
  }
  return pool
}

/** A worker that can't load (a strict CSP, an old browser): build on the main thread instead. */
function abandonWorkers() {
  if (!pool) return
  for (const slot of pool) {
    slot.worker.terminate()
    if (slot.job) slot.job[1].running = false
  }
  pool = null
  console.warn('[runek] figure workers unavailable; building on the main thread')
  schedule()
}

function dispatch(slots: Slot[]) {
  for (const slot of slots) {
    if (slot.job) continue
    const entry = next()
    if (!entry) return
    entry[1].running = true
    slot.job = entry
    slot.request = requests++
    const msg: FigureRequest = { id: slot.request, spec: entry[1].spec, lod: entry[1].lod }
    slot.worker.postMessage(msg)
  }
}

function reply(slot: Slot, msg: FigureReply) {
  if (msg.id !== slot.request || !slot.job) return
  const [id, job] = slot.job
  slot.job = null
  job.running = false
  if ('error' in msg) {
    if (jobs.get(id) === job) jobs.delete(id)
    console.error('[runek] figure build failed:', msg.error)
  } else finishJob(id, job, msg.built)
  schedule()
  settle()
}

// ---- main thread -----------------------------------------------------------------------------

// A message-channel task runs as soon as the page is idle, without setTimeout's clamping.
let channel: MessageChannel | null = null
function schedule() {
  const slots = workers()
  if (slots) {
    dispatch(slots)
    return
  }
  if (ticking || jobs.size === 0) return
  ticking = true
  if (typeof MessageChannel === 'function') {
    if (!channel) {
      channel = new MessageChannel()
      channel.port1.onmessage = tick
    }
    channel.port2.postMessage(null)
  } else setTimeout(tick, 0)
}

function tick() {
  ticking = false
  if (pool) return // workers took over
  const deadline = performance.now() + BUDGET
  while (jobs.size > 0 && performance.now() < deadline) {
    const best = next()
    if (!best) break
    const [id, job] = best
    job.gen ??= buildFigure(job.spec, job.lod)
    let done: BuiltFigure | null = null
    while (performance.now() < deadline) {
      const r = job.gen.next()
      if (r.done) {
        done = r.value
        break
      }
    }
    if (!done) break
    finishJob(id, job, done)
  }
  schedule()
  settle()
}
