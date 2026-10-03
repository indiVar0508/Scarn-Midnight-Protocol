import { Canvas } from '@react-three/fiber';
import { CastFigure } from './actors/CastFigure';
import { CAST_LOOKS, type CastId } from './actors/cast';

/** Debug view (`?lineup`): every cast member in a row, for tuning looks. `?lineup=scarn` for one. */
export default function Lineup({ only }: { only?: string }) {
  const style = (new URLSearchParams(location.search).get('style') ?? undefined) as 'stylized' | 'realistic' | 'anime' | undefined;
  const ids = (Object.keys(CAST_LOOKS) as CastId[]).filter((id) => !only || id === only);
  const span = ids.length > 1 ? 1.1 : 0;
  const cam: [number, number, number] = ids.length > 1 ? [0, 1.4, 10.5] : [0, 1.5, 2.6];
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows camera={{ position: cam, fov: 35 }} onCreated={({ camera }) => camera.lookAt(0, ids.length > 1 ? 1 : 1.35, 0)}>
        <color attach="background" args={['#2a2622']} />
        <hemisphereLight args={['#fff4e0', '#403830', 0.8]} />
        <directionalLight position={[3, 6, 5]} intensity={2} castShadow />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 10]} />
          <meshStandardMaterial color="#77736b" />
        </mesh>
        {ids.map((id, i) => (
          <group key={id} position={[(i - (ids.length - 1) / 2) * span, 0, 0]}>
            <CastFigure who={id} detail="high" style={style} />
          </group>
        ))}
      </Canvas>
      <div style={{ position: 'fixed', bottom: 8, left: 0, right: 0, textAlign: 'center', color: '#eee', fontFamily: 'sans-serif' }}>{ids.join(' · ')}</div>
    </div>
  );
}
