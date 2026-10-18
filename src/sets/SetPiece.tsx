import { GroundContext, useGroundIndex, WorldNodes, type WorldData } from '@runek/core';
import { SET_REGISTRY } from './registry';

/**
 * A set as runek world data: runek's ground index (anchors, `useGround`) and runek's
 * `WorldNodes` render it through the set registry, inside the scene's runek `<World>`.
 */
export function SetPiece({ data }: { data: WorldData }) {
  const ground = useGroundIndex(data, SET_REGISTRY);
  return (
    <GroundContext.Provider value={ground}>
      <WorldNodes nodes={data.nodes} registry={SET_REGISTRY} ground={ground} />
    </GroundContext.Provider>
  );
}
