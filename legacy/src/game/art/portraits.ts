import { SPECS, drawPortrait } from './characters';

const cache = new Map<string, string>();

/** Dialogue portrait data URL for a rig id (rendered once, then cached). */
export function portraitFor(id: string | null, color: string): string | null {
  if (!id) return null;
  const key = `${id}|${color}`;
  let url = cache.get(key);
  if (!url) {
    const spec = SPECS[id];
    if (!spec) return null;
    url = drawPortrait(spec, color);
    cache.set(key, url);
  }
  return url;
}
