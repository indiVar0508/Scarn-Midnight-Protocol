// Materials shared by every figure. Colors are baked into vertex colors, so one material per
// surface kind serves the whole crowd, and the kinds share shader programs (see `withDetail`).
import {
  BufferAttribute,
  Color,
  MeshPhysicalMaterial,
  type MeshPhysicalMaterialParameters,
  ShaderChunk,
  SphereGeometry,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from 'three'
import { linear } from './build'
import type { MaterialKind } from './spec'

// ── Surface detail (TLM addition) ──────────────────────────────────────────────────────────────
// Vertex colors give each part its color; this adds what a fabric or skin looks like up close:
// weave, twill, ribs, pebbling, strands and pores as a procedural bump, plus fibre-scale color
// and roughness variation. Everything is a solid texture over the bind-pose position (so it rides
// the skin as the figure animates; no UVs needed) and fades out once a period shrinks below a
// pixel, so distant figures don't shimmer. Units: one world unit = one meter.

const DETAIL_COMMON = /* glsl */ `
varying vec3 vRkPos;
float rkHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float rkNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(rkHash(i), rkHash(i + vec3(1, 0, 0)), f.x), mix(rkHash(i + vec3(0, 1, 0)), rkHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(rkHash(i + vec3(0, 0, 1)), rkHash(i + vec3(1, 0, 1)), f.x), mix(rkHash(i + vec3(0, 1, 1)), rkHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
// 1 while a pattern of 'cycles' per meter is resolved on screen, falling to 0 as it aliases.
float rkFade(float cycles) {
  return 1.0 - smoothstep(0.08, 0.3, length(fwidth(vRkPos)) * cycles);
}
float rkWave(float x) { return sin(6.2831853 * x); }
// Bump mapping from a height field via screen-space derivatives (no tangents needed).
vec3 rkBump(vec3 N, float h) {
  vec3 dpdx = dFdx(-vViewPosition);
  vec3 dpdy = dFdy(-vViewPosition);
  vec3 r1 = cross(dpdy, N);
  vec3 r2 = cross(N, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * N - grad);
}
`

/** Per kind: height (meters), albedo multiplier, roughness offset. `p` is the bind-pose position. */
const DETAIL: Record<MaterialKind, string> = {
  // Suiting wool and shirting cotton: a fine diagonal twill, a heathered fibre, soft drape folds.
  cloth: /* glsl */ `
    float twill = rkWave(150.0 * (0.7 * p.x + 0.7 * p.y + 0.5 * p.z)) * rkFade(150.0);
    float folds = rkNoise(p * vec3(16.0, 5.0, 16.0));
    rkH = 0.00008 * twill + 0.0022 * folds;
    rkA = (0.95 + 0.1 * rkNoise(p * 420.0) * rkFade(420.0)) * (0.97 + 0.06 * rkNoise(p * 22.0));
    rkR = 0.06 * (rkNoise(p * 60.0) - 0.5);
  `,
  // Knitwear: vertical ribs crossed by stitch rows, fuzzy fibre.
  knit: /* glsl */ `
    float ribs = abs(rkWave(55.0 * (p.x + 0.6 * p.z))) * rkFade(110.0);
    float rows = rkWave(140.0 * p.y + 0.5 * rkWave(55.0 * (p.x + 0.6 * p.z))) * rkFade(140.0);
    rkH = 0.0004 * ribs + 0.00015 * rows + 0.0015 * rkNoise(p * vec3(12.0, 4.0, 12.0));
    rkA = 0.9 + 0.2 * rkNoise(p * 300.0) * rkFade(300.0);
    rkR = 0.04 * (rkNoise(p * 90.0) - 0.5);
  `,
  // Denim: a steep right-hand twill, lighter vertical slubs, a little wear on the high points.
  denim: /* glsl */ `
    float twill = rkWave(260.0 * (p.y - 0.8 * p.x - 0.5 * p.z)) * rkFade(260.0);
    float slub = rkNoise(p * vec3(140.0, 9.0, 140.0));
    rkH = 0.0001 * twill + 0.0018 * rkNoise(p * vec3(14.0, 5.0, 14.0));
    rkA = (0.86 + 0.28 * slub * rkFade(140.0)) * (0.95 + 0.1 * rkNoise(p * 18.0));
    rkR = 0.05 * (slub - 0.5);
  `,
  // Leather: pebble grain and a few creases; the grain varies the sheen.
  leather: /* glsl */ `
    float grain = rkNoise(p * 380.0) * rkFade(380.0);
    rkH = 0.00012 * grain + 0.0008 * rkNoise(p * vec3(45.0, 9.0, 45.0));
    rkA = 0.94 + 0.12 * rkNoise(p * 120.0);
    rkR = 0.18 * (grain - 0.5);
  `,
  // Hair: strands with a slow wave, clumped, lighter and darker strands, glossier along clumps.
  hair: /* glsl */ `
    float warp = 5.0 * rkNoise(p * 28.0);
    float strands = rkWave(300.0 * (0.8 * p.x + 0.6 * p.z) + warp) * rkFade(300.0);
    float clumps = rkWave(70.0 * (0.8 * p.x + 0.6 * p.z) + 0.6 * warp);
    rkH = 0.00005 * strands + 0.0004 * clumps;
    rkA = 0.78 + 0.34 * rkNoise(p * vec3(260.0, 40.0, 260.0)) * rkFade(260.0);
    rkR = -0.08 * clumps;
  `,
  // Skin: pores, faint mottling, and a slightly uneven sheen.
  skin: /* glsl */ `
    float pores = rkNoise(p * 900.0) * rkFade(900.0);
    rkH = -0.00004 * pores + 0.00025 * rkNoise(p * 70.0);
    rkA = 0.965 + 0.07 * rkNoise(p * 28.0);
    rkR = 0.12 * (rkNoise(p * 160.0) - 0.5);
  `,
}

// Every kind's detail is in one shader and the `rkKind` uniform picks it, so the kinds that share
// lighting features share one program: skin, cloth, knit, denim and hair (all sheen) compile once,
// leather (clearcoat) once more. One program per kind cost ~0.5 s of loading each on an Intel
// laptop GPU (TECH gotcha 33). three reuses a program for every material with the same cache key,
// so the shader text must not depend on the kind: per-kind values are uniforms.
const KINDS = Object.keys(DETAIL) as MaterialKind[]
const DETAIL_ALL = KINDS.map((k, i) => `if (rkKind == ${i}) {${DETAIL[k]}}`).join(' else ')

const SKIN_DIFFUSE =
  'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );'
/** Skin's light wrap (see `skin`); zero is plain Lambert. */
const NO_WRAP = new Vector3(0, 0, 0)
const SKIN_WRAP = new Vector3(0.45, 0.2, 0.12)

/** Patch a physical material's shaders with the surface detail for `kind`. */
function withDetail(shader: WebGLProgramParametersWithUniforms, kind: MaterialKind, wrap = NO_WRAP) {
  shader.uniforms.rkKind = { value: KINDS.indexOf(kind) }
  shader.uniforms.rkWrap = { value: wrap }
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vRkPos;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRkPos = position;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nuniform int rkKind;\nuniform vec3 rkWrap;\n${DETAIL_COMMON}`)
    .replace(
      'void main() {',
      `void main() {\n  float rkH = 0.0; float rkA = 1.0; float rkR = 0.0;\n  { vec3 p = vRkPos;\n${DETAIL_ALL}\n  }`,
    )
    .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= rkA;')
    .replace(
      '#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\n  roughnessFactor = clamp(roughnessFactor + rkR, 0.04, 1.0);',
    )
    .replace(
      '#include <normal_fragment_maps>',
      '#include <normal_fragment_maps>\n  normal = rkBump(normal, rkH);',
    )
  // The wrapped diffuse term (`skin`); with a zero wrap it is the stock term exactly, sheen's
  // energy compensation included (three scales `irradiance` by it just above this line). If a
  // three.js release renames the patched line, every kind falls back to plain physical shading.
  const chunk = ShaderChunk.lights_physical_pars_fragment
  if (!chunk.includes(SKIN_DIFFUSE)) return
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <lights_physical_pars_fragment>',
    chunk.replace(
      SKIN_DIFFUSE,
      `vec3 wrapNL = clamp( ( vec3( dot( geometryNormal, directLight.direction ) ) + rkWrap ) / ( 1.0 + rkWrap ), 0.0, 1.0 );
         #ifdef USE_SHEEN
           wrapNL *= sheenEnergyComp;
         #endif
         reflectedLight.directDiffuse += wrapNL * directLight.color * BRDF_Lambert( material.diffuseContribution );`,
    ),
  )
}

/** A shared figure material for one kind, with its surface detail. */
function detailed(kind: MaterialKind, params: MeshPhysicalMaterialParameters) {
  const m = new MeshPhysicalMaterial({ vertexColors: true, ...params })
  m.customProgramCacheKey = () => 'runek-person'
  m.onBeforeCompile = (shader) => withDetail(shader, kind)
  return m
}

/**
 * Skin: sheen for the fine fuzz, and a red-shifted wrap on the direct diffuse term as a cheap
 * stand-in for subsurface scattering (light bleeds past the terminator, warmer as it goes).
 */
function skin() {
  const m = new MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.55,
    specularIntensity: 0.4,
    sheen: 0.35,
    sheenColor: new Color('#ff9a7a'),
    sheenRoughness: 0.55,
  })
  m.customProgramCacheKey = () => 'runek-person'
  m.onBeforeCompile = (shader) => withDetail(shader, 'skin', SKIN_WRAP)
  return m
}

const SPECS: Record<Exclude<MaterialKind, 'skin'>, MeshPhysicalMaterialParameters> = {
  cloth: { roughness: 0.88, sheen: 0.6, sheenColor: new Color('#ffffff'), sheenRoughness: 0.8 },
  knit: { roughness: 0.95, sheen: 0.9, sheenColor: new Color('#ffffff'), sheenRoughness: 0.6 },
  denim: { roughness: 0.82, sheen: 0.45, sheenColor: new Color('#b8c6d6'), sheenRoughness: 0.7 },
  leather: { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 },
  hair: { roughness: 0.5, sheen: 0.6, sheenColor: new Color('#ffffff'), sheenRoughness: 0.32 },
}

let shared: Record<MaterialKind | 'eye', MeshPhysicalMaterial> | null = null

export function personMaterials() {
  if (!shared) {
    shared = {
      skin: skin(),
      cloth: detailed('cloth', SPECS.cloth),
      knit: detailed('knit', SPECS.knit),
      denim: detailed('denim', SPECS.denim),
      leather: detailed('leather', SPECS.leather),
      hair: detailed('hair', SPECS.hair),
      eye: new MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.25,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
      }),
    }
  }
  return shared
}

/** An eyeball looking down +z: pupil, a streaked iris, a dark limbal ring, warm sclera. */
export function eyeGeometry(radius: number, iris: string, detail: number) {
  const g = new SphereGeometry(radius, detail, Math.round(detail * 0.66))
  g.rotateX(Math.PI / 2)
  const p = g.attributes.position
  const col = new Float32Array(p.count * 3)
  const ir = linear(iris)
  const sclera = linear('#efe9e2')
  const vein = linear('#e3c0b8')
  for (let i = 0; i < p.count; i++) {
    const ang = Math.acos(Math.max(-1, Math.min(1, p.getZ(i) / radius)))
    const around = Math.atan2(p.getY(i), p.getX(i))
    let c: [number, number, number]
    if (ang < 0.2) c = [0.002, 0.002, 0.002]
    else if (ang < 0.56) {
      const k =
        (0.75 + 0.25 * Math.sin(around * 37) * Math.sin(around * 11 + 1)) *
        (0.65 + (ang - 0.2) * 1.1)
      c = [ir[0] * k, ir[1] * k, ir[2] * k]
    } else if (ang < 0.62) c = [0.01, 0.008, 0.007]
    else {
      const t = Math.min(1, (ang - 0.62) / 1.2) * 0.6
      c = [
        sclera[0] + (vein[0] - sclera[0]) * t,
        sclera[1] + (vein[1] - sclera[1]) * t,
        sclera[2] + (vein[2] - sclera[2]) * t,
      ]
    }
    col.set(c, i * 3)
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  return g
}

/** The upper lid for blinking: a hemispherical cap just outside the eyeball, in skin. */
export function lidGeometry(radius: number, skinHex: string) {
  const g = new SphereGeometry(radius, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2)
  const c = linear(skinHex)
  const col = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < col.length; i += 3) col.set([c[0] * 0.85, c[1] * 0.8, c[2] * 0.8], i)
  g.setAttribute('color', new BufferAttribute(col, 3))
  return g
}
