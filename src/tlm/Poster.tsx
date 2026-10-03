import { useEffect, useMemo } from 'react';
import { useWorld, type Vec3 } from '@runek/core';
import { labelTexture, type LabelFont } from './labels';

export type PosterFont = LabelFont;

export interface PosterLine {
  text: string;
  /** Relative size (1 = default). */
  size?: number;
  color?: string;
  font?: PosterFont;
}

export interface PosterProps {
  position?: Vec3;
  rotation?: Vec3;
  /** `[width, height]` in units. */
  size?: [number, number];
  lines?: PosterLine[];
  background?: string;
  /** Default text colour. */
  color?: string;
  font?: PosterFont;
  /** A border inset, as a fraction of the shorter side (0 = none). */
  border?: number;
  borderColor?: string;
  /** Slight hand-hung tilt, radians. */
  tilt?: number;
  /** Paper-thin board behind the print. */
  board?: boolean;
}

/** A printed sign, flyer or banner on a thin board (art from `labelTexture`). */
export function Poster({
  position = [0, 1.5, 0],
  rotation = [0, 0, 0],
  size = [0.6, 0.8],
  lines = [{ text: 'NOTICE' }],
  background = '#f4f1e8',
  color = '#1b1b1b',
  font = 'bebas',
  border = 0,
  borderColor,
  tilt = 0,
  board = true,
}: PosterProps) {
  const { unit } = useWorld();
  const [w, h] = [size[0] * unit, size[1] * unit];
  const key = JSON.stringify([size, lines, background, color, font, border, borderColor]);

  const texture = useMemo(
    () => labelTexture({ lines, background, color, font, border, borderColor }, size[0] / size[1], 768),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group position={position} rotation={rotation}>
      <group rotation={[0, 0, tilt]}>
        {board && (
          <mesh position={[0, 0, -0.006 * unit]}>
            <boxGeometry args={[w * 1.02, h * 1.02, 0.01 * unit]} />
            <meshStandardMaterial color="#d9d3c4" />
          </mesh>
        )}
        <mesh>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial map={texture} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}
