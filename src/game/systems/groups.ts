import { interactionGroups } from '@react-three/rapier';

/** Collision layers (TECH.md §4). Membership → which layers it collides with. */
export const L = {
  ENV: 0,
  PLAYER: 1,
  ENEMY: 2,
  PROP: 3,
  SENSOR: 6,
  RAGDOLL: 7,
  /** Invisible set boundaries (the fourth wall): stop characters, never rays or the camera. */
  BARRIER: 8,
} as const;

export const G = {
  env: interactionGroups(L.ENV, [L.PLAYER, L.ENEMY, L.PROP, L.RAGDOLL]),
  player: interactionGroups(L.PLAYER, [L.ENV, L.ENEMY, L.PROP, L.SENSOR, L.BARRIER]),
  enemy: interactionGroups(L.ENEMY, [L.ENV, L.PLAYER, L.ENEMY, L.PROP, L.BARRIER]),
  prop: interactionGroups(L.PROP, [L.ENV, L.PLAYER, L.ENEMY, L.PROP, L.RAGDOLL]),
  /** A knocked-down goon tumbles into props. Rapier needs both sides to agree, and the
   *  player's filter omits RAGDOLL, so Scarn never trips over one but shots still land. */
  ragdoll: interactionGroups(L.RAGDOLL, [L.ENV, L.PROP, L.RAGDOLL, L.PLAYER]),
  sensor: interactionGroups(L.SENSOR, [L.PLAYER]),
  /** What the player's bullets can hit. */
  playerShot: interactionGroups(L.PLAYER, [L.ENV, L.ENEMY, L.PROP, L.RAGDOLL]),
  /** What blocks enemy bullets (they hit the player by distance check). */
  enemyShot: interactionGroups(L.ENEMY, [L.ENV, L.PROP]),
  /** Character-controller sweep filters. */
  kccPlayer: interactionGroups(L.PLAYER, [L.ENV, L.ENEMY, L.PROP, L.BARRIER]),
  kccEnemy: interactionGroups(L.ENEMY, [L.ENV, L.PLAYER, L.ENEMY, L.PROP, L.BARRIER]),
  barrier: interactionGroups(L.BARRIER, [L.PLAYER, L.ENEMY]),
  /** The camera's spring arm: solid set pieces only. */
  camera: interactionGroups(L.PLAYER, [L.ENV]),
};
