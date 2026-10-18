// Hash of the physics crate's sources, stamped next to the committed WASM build so a test can
// tell when the build is stale (src/physics/wasm.test.ts).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CRATE = join(ROOT, 'crates/tlm-physics');
export const OUT = join(ROOT, 'src/physics/wasm');

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
}

export function crateHash() {
  const h = createHash('sha256');
  const list = [join(CRATE, 'Cargo.toml'), join(CRATE, 'Cargo.lock'), ...files(join(CRATE, 'src')).filter((f) => f.endsWith('.rs') && !f.endsWith('tests.rs'))].sort();
  for (const f of list) {
    h.update(relative(CRATE, f));
    h.update(readFileSync(f));
  }
  return h.digest('hex').slice(0, 16);
}
