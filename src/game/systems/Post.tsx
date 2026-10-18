import type { ReactElement } from 'react';
import { Bloom, EffectComposer, N8AO, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { HalfFloatType } from 'three';
import { settings } from '@shared/state/settings';
import { postActive, useFxTier } from './tier';

/**
 * The film look: ambient occlusion (contact shadows under shelves, carts and feet), bloom on the
 * HDR emitters (tubes, skylights, EXIT signs, the freezer), ACES filmic tone mapping, a vignette and a
 * little grain (scaled by the `filmEffects` setting). `medium` drops the ambient occlusion pass
 * and samples fewer pixels for antialiasing.
 */
export function Post() {
  const tier = useFxTier();
  const grain = settings.get().filmEffects;
  // Software rasterizers can't afford full-screen passes (5 → 3 fps in the lake scene); they keep
  // the renderer's own ACES tone mapping.
  if (!postActive()) return null;
  const effects: ReactElement[] = [];
  if (tier === 'high') effects.push(<N8AO key="ao" halfRes aoRadius={1.1} distanceFalloff={0.7} intensity={2.4} quality="performance" />);
  effects.push(<Bloom key="bloom" mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={0.75} />);
  effects.push(<ToneMapping key="tone" mode={ToneMappingMode.ACES_FILMIC} />);
  effects.push(<Vignette key="vignette" offset={0.28} darkness={0.55} />);
  if (grain > 0) effects.push(<Noise key="grain" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.1 * grain} />);
  return (
    <EffectComposer multisampling={tier === 'high' ? 4 : 2} frameBufferType={HalfFloatType}>
      {effects}
    </EffectComposer>
  );
}
