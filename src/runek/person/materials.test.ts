import { ShaderChunk, ShaderLib, type MeshPhysicalMaterial, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three'
import { describe, expect, it } from 'vitest'
import { personMaterials } from './materials'

// three compiles one program per cache key and hands it to every material with that key, so
// figure materials that share a key must also produce the same shader text (per-kind values go in
// uniforms). One program per kind cost ~0.5 s of loading each on an Intel laptop GPU.
const patched = (m: MeshPhysicalMaterial) => {
  const shader = { vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader, uniforms: {} } as unknown as WebGLProgramParametersWithUniforms
  m.onBeforeCompile(shader, {} as WebGLRenderer)
  return shader
}

describe('figure materials', () => {
  const all = personMaterials()
  const sheened = (['skin', 'cloth', 'knit', 'denim', 'hair'] as const).map((k) => all[k])

  it('the kinds with the same lighting features share one program', () => {
    const keys = new Set(sheened.map((m) => m.customProgramCacheKey()))
    expect(keys.size).toBe(1)
    // Same features, so three's own part of the key matches too.
    expect(new Set(sheened.map((m) => `${m.sheen > 0}|${m.clearcoat > 0}|${m.vertexColors}`)).size).toBe(1)
    const texts = new Set(sheened.map((m) => { const s = patched(m); return s.vertexShader + s.fragmentShader; }))
    expect(texts.size).toBe(1)
  })

  it('each kind still draws its own pattern, and only skin wraps the light', () => {
    const uniforms = sheened.map((m) => patched(m).uniforms as Record<string, { value: unknown }>)
    expect(new Set(uniforms.map((u) => u.rkKind.value)).size).toBe(sheened.length)
    const wraps = uniforms.map((u) => (u.rkWrap.value as { length(): number }).length())
    expect(wraps[0]).toBeGreaterThan(0)
    expect(wraps.slice(1)).toEqual([0, 0, 0, 0])
  })

  it('patches every hook it relies on (a three.js upgrade that renames one fails here)', () => {
    const s = patched(all.cloth)
    for (const hook of ['diffuseColor.rgb *= rkA', 'roughnessFactor + rkR', 'rkBump(normal, rkH)', 'rkWrap ) / ( 1.0 + rkWrap )']) expect(s.fragmentShader).toContain(hook)
    // The wrapped diffuse replaces three's `irradiance * BRDF_Lambert`, so it must carry whatever
    // three scaled `irradiance` by (sheen energy compensation), or zero wrap would not be stock.
    expect(ShaderLib.physical.fragmentShader + ShaderChunk.lights_physical_pars_fragment).toContain('irradiance *= sheenEnergyComp')
    expect(s.fragmentShader).toContain('wrapNL *= sheenEnergyComp')
    expect(s.vertexShader).toContain('vRkPos = position')
  })
})
