export type FxTier = 'off' | 'low' | 'medium' | 'high';

/**
 * The graphics tier for a WebGL renderer string: software rasterizers (SwiftShader, llvmpipe:
 * headless browsers, GPU-blocklisted machines) get `low`; integrated GPUs (Intel, phone GPUs,
 * Apple's base chips, AMD APUs) `medium`; discrete GPUs `high`.
 */
export function tierFor(renderer: string): FxTier {
  if (/swiftshader|llvmpipe|software/i.test(renderer)) return 'low';
  if (/apple m\d+ (pro|max|ultra)/i.test(renderer)) return 'high';
  // An Intel UHD laptop at 1080p: 10 fps and a 10 s shader-compile freeze on `high`.
  if (/intel|mali|adreno|powervr|apple|radeon\(tm\) graphics|vega \d+ graphics/i.test(renderer)) return 'medium';
  return 'high';
}

let tier: FxTier | null = null;

/**
 * The graphics tier, decided once per page: `?fx=off|low|medium|high` wins, else the GPU decides
 * (`tierFor`). It's read from a throwaway context with the game canvas's GPU preference, because
 * the canvas's pixel ratio depends on it and must be set when the canvas is created.
 */
export function fxTier(): FxTier {
  if (tier) return tier;
  const forced = new URLSearchParams(location.search).get('fx');
  tier = forced === 'off' || forced === 'low' || forced === 'medium' || forced === 'high' ? forced : tierFor(rendererName());
  return tier;
}

function rendererName(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2', { powerPreference: 'high-performance' }) ?? canvas.getContext('webgl');
    if (!ctx) return 'software';
    const info = ctx.getExtension('WEBGL_debug_renderer_info');
    const name = String(info ? ctx.getParameter(info.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER));
    ctx.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return 'software';
  }
}

/**
 * The canvas pixel-ratio range per tier: integrated GPUs don't render HiDPI screens at full
 * density. It goes to the Canvas's own `dpr` prop: R3F resets the ratio to the prop (default
 * `[1, 2]`) every time the Canvas re-renders, so setting it from inside doesn't stick.
 */
const DPR_CAP: Record<FxTier, number> = { off: 1, low: 1, medium: 1.25, high: 1.5 };
export const dprFor = (t: FxTier): [number, number] => [1, DPR_CAP[t]];

/** Whether `<Post>` draws the scene through the effect composer (into a render target). */
export function postActive(): boolean {
  const t = fxTier();
  return t === 'high' || t === 'medium';
}

/** The page's graphics tier (see `fxTier`). */
export function useFxTier(): FxTier {
  return fxTier();
}
