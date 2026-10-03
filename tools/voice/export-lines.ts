/**
 * Collect every voiced line from src/shared/data/script/*.ts into tools/voice/lines.json.
 * Run with: npm run voice:export   (Node >= 22 type stripping)
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CAST } from '../../src/shared/data/cast.ts';

interface Line {
  id: string;
  who: keyof typeof CAST;
  text: string;
  speak?: string;
  silent?: boolean;
}

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '../../src/shared/data/script');
const out: { id: string; text: string; voice: string; speed: number; fx: string; pitch: number; eq: string }[] = [];

for (const f of readdirSync(dir).sort()) {
  if (!/^(ch\d\d|misc)\.ts$/.test(f)) continue;
  const mod = (await import(pathToFileURL(join(dir, f)).href)) as Record<string, Record<string, Line>>;
  for (const table of Object.values(mod)) {
    if (!table || typeof table !== 'object') continue;
    for (const line of Object.values(table)) {
      if (!line || typeof line !== 'object' || !('id' in line) || line.silent) continue;
      const c = CAST[line.who];
      if (!c) throw new Error(`Unknown speaker ${String(line.who)} in ${line.id}`);
      const m = c as { pitch?: number; eq?: string };
      out.push({ id: line.id, text: line.speak ?? line.text, voice: c.voice, speed: c.speed, fx: c.fx, pitch: m.pitch ?? 0, eq: m.eq ?? '' });
    }
  }
}

const ids = new Set<string>();
for (const l of out) {
  if (ids.has(l.id)) throw new Error(`Duplicate line id ${l.id}`);
  ids.add(l.id);
}
writeFileSync(join(here, 'lines.json'), JSON.stringify(out, null, 1));
console.log(`exported ${out.length} lines`);
