import { describe, expect, it } from 'vitest';
import { Color } from 'three';
import { CAST_LOOKS, GOONS, goonLook } from './cast';

// User, 2026-10-19: "lets not keep bad characters looking only black lets have mix colors". The
// henchmen were one look: near-black skin standing in for a ski mask, and a black suit.
describe("Goldenface's henchmen", () => {
  const looks = GOONS.map((id) => CAST_LOOKS[id]);
  const luminance = (hex: string) => {
    const c = new Color(hex); // linear
    return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  };

  it('come in a mix of skin tones, mask colors and suits', () => {
    expect(looks.length).toBeGreaterThanOrEqual(4);
    const jacket = (l: (typeof looks)[number]) => l.clothes.find((g) => g.type === 'blazer')?.color;
    for (const trait of [(l: (typeof looks)[number]) => l.skinTone, (l: (typeof looks)[number]) => l.mask, jacket]) {
      expect(new Set(looks.map(trait)).size).toBe(looks.length);
    }
  });

  it('wear the mask over skin, instead of black skin standing in for one', () => {
    for (const l of looks) {
      expect(l.mask).toMatch(/^#[0-9a-f]{6}$/i);
      expect(luminance(l.skinTone)).toBeGreaterThan(0.03); // the old '#151518' was 0.007
    }
  });

  it('still read as one gang: gold tie and sunglasses on every one', () => {
    expect(new Set(looks.map((l) => l.tie)).size).toBe(1);
    expect(looks.every((l) => l.shades)).toBe(true);
  });

  it('each goon wears one of the looks, picked by its seed, so a wave is mixed', () => {
    expect(new Set([1, 8, 15].map(goonLook)).size).toBe(3); // Scene 1's first wave
    expect(new Set(Array.from({ length: 40 }, (_, s) => goonLook(s)))).toEqual(new Set(GOONS));
  });
});
