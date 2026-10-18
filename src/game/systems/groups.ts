import { interactionGroups } from '../../physics/groups';

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
  /** Tools that trigger sensors without colliding with anything (the mop head). */
  TOOL: 9,
} as const;

export const G = {
  env: interactionGroups(L.ENV, [L.PLAYER, L.ENEMY, L.PROP, L.RAGDOLL]),
  player: interactionGroups(L.PLAYER, [L.ENV, L.ENEMY, L.PROP, L.SENSOR, L.BARRIER]),
  enemy: interactionGroups(L.ENEMY, [L.ENV, L.PLAYER, L.ENEMY, L.PROP, L.BARRIER]),
  /** Props also touch sensors (a puck through a gate). */
  prop: interactionGroups(L.PROP, [L.ENV, L.PLAYER, L.ENEMY, L.PROP, L.RAGDOLL, L.SENSOR]),
  /** A knocked-down goon tumbles into props. Rapier needs both sides to agree, and the
   *  player's filter omits RAGDOLL, so Scarn never trips over one but shots still land. */
  ragdoll: interactionGroups(L.RAGDOLL, [L.ENV, L.PROP, L.RAGDOLL, L.PLAYER]),
  /** Trigger volumes: the player, props and tools set them off. */
  sensor: interactionGroups(L.SENSOR, [L.PLAYER, L.PROP, L.TOOL]),
  tool: interactionGroups(L.TOOL, [L.SENSOR]),
  /** What the player's bullets can hit. */
  playerShot: interactionGroups(L.PLAYER, [L.ENV, L.ENEMY, L.PROP, L.RAGDOLL]),
  /** Enemy projectiles (rapier shape casts in Rust): walls and props stop them, the player's
   *  capsule takes them. */
  enemyShot: interactionGroups(L.ENEMY, [L.ENV, L.PROP, L.PLAYER]),
  /** A goon's line of sight: only solid set pieces block it. */
  enemySight: interactionGroups(L.ENEMY, [L.ENV, L.PROP]),
  /** Character-controller sweep filters. */
  kccPlayer: interactionGroups(L.PLAYER, [L.ENV, L.ENEMY, L.PROP, L.BARRIER]),
  kccEnemy: interactionGroups(L.ENEMY, [L.ENV, L.PLAYER, L.ENEMY, L.PROP, L.BARRIER]),
  barrier: interactionGroups(L.BARRIER, [L.PLAYER, L.ENEMY]),
  /** The camera's spring arm: solid set pieces only. */
  camera: interactionGroups(L.PLAYER, [L.ENV]),
};
