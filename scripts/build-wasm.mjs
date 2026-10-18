// Build crates/tlm-physics (rapier3d) to WebAssembly and emit the JS bindings into
// src/physics/wasm/. The output is committed so deploys don't need a Rust toolchain.
//
//   npm run wasm          needs: rustup target add wasm32-unknown-unknown
//                                cargo install wasm-bindgen-cli --version 0.2.129
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { crateHash, CRATE, OUT } from './wasm-hash.mjs';

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

run('cargo', ['build', '--release', '--target', 'wasm32-unknown-unknown'], CRATE);
mkdirSync(OUT, { recursive: true });
const wasm = join(CRATE, 'target/wasm32-unknown-unknown/release/tlm_physics.wasm');
run('wasm-bindgen', ['--target', 'web', '--out-dir', OUT, '--out-name', 'tlm_physics', wasm], CRATE);
writeFileSync(join(OUT, 'SOURCE_HASH'), crateHash() + '\n');
const size = statSync(join(OUT, 'tlm_physics_bg.wasm')).size;
console.log(`tlm_physics_bg.wasm: ${(size / 1024).toFixed(0)} KiB · source hash written`);
