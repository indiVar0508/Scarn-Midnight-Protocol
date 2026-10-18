import { describe, expect, it } from 'vitest';
import { tierFor } from './tier';

describe('tierFor', () => {
  it.each([
    ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', 'low'],
    ['llvmpipe (LLVM 17.0.6, 256 bits)', 'low'],
    ['ANGLE (Intel, Mesa Intel(R) Graphics (RPL-P), OpenGL ES 3.2)', 'medium'],
    ['ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)', 'medium'],
    ['ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', 'medium'],
    ['ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Max, Unspecified Version)', 'high'],
    ['ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)', 'medium'],
    ['ANGLE (AMD, AMD Radeon RX 7800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)', 'high'],
    ['ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)', 'high'],
    ['Mali-G78', 'medium'],
    ['Adreno (TM) 740', 'medium'],
  ])('%s → %s', (renderer, tier) => {
    expect(tierFor(renderer)).toBe(tier);
  });
});
