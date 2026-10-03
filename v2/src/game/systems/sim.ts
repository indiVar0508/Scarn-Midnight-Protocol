import { Vector3 } from 'three';
import type { RapierRigidBody } from '@react-three/rapier';

/** Fixed physics/gameplay step (matches <Physics timeStep>). */
export const STEP = 1 / 60;

/** Something the player can walk up to and use (E). */
export interface Interactable {
  id: string;
  pos: Vector3;
  radius: number;
  label: string;
  enabled: boolean;
  onUse: () => void;
}

/** A scripted camera shot that overrides the follow camera (null = gameplay camera). */
export interface Shot {
  pos: Vector3;
  look: Vector3;
}

/** What a bullet tells the thing it hit. */
export interface Hit {
  point: Vector3;
  dir: Vector3;
  damage: number;
}

/**
 * Mutable per-take simulation registry shared by actors and systems. Not
 * React state: read and written inside frame callbacks only. `reset()` on
 * every take so a retake starts clean.
 */
export const sim = {
  player: {
    pos: new Vector3(),
    /** Where the player is aiming, on the gun-height plane. */
    aim: new Vector3(0, 1.2, 1),
    iframes: 0,
    alive: true,
    body: null as RapierRigidBody | null,
    /** Seconds since the last pose, for "pose after a knockdown" scoring. */
    lastPose: -99,
  },
  /** Collider handle → hit handler (goons, breakables). */
  hittables: new Map<number, (hit: Hit) => void>(),
  /** Third-person camera: yaw (0 looks toward -Z), pitch (positive looks down). */
  cam: { yaw: 0, pitch: 0.18, aiming: false },
  /** Usable things in reach, by id; `focus` is the one the prompt shows. */
  interactables: new Map<string, Interactable>(),
  focus: null as Interactable | null,
  /** A script owns the controls (conversation, minigame): Scarn stands still. */
  busy: false,
  shot: null as Shot | null,
  /** Overrides damage from enemy projectiles (training throws). Arg: player was invulnerable. */
  onPlayerHit: null as ((dodged: boolean) => void) | null,
  /** The crosshair is over something that can be shot (goon). */
  aimOnTarget: false,
  /** Camera trauma 0..1 (shake = trauma²), scaled by settings in the camera. */
  trauma: 0,
  /** Seconds of hitstop remaining (time scale ~0 while > 0). */
  hitstop: 0,
  /** Time of the most recent knockdown, for pose combos. */
  lastKnockdown: -99,
  /** Times of every knockdown this take (Director's Notes count them). */
  knockdowns: [] as number[],
  time: 0,
};

export function resetSim(): void {
  sim.player.pos.set(0, 0, 0);
  sim.player.aim.set(0, 1.2, 1);
  sim.player.iframes = 0;
  sim.player.alive = true;
  sim.player.body = null;
  sim.player.lastPose = -99;
  sim.hittables.clear();
  sim.cam.yaw = 0;
  sim.cam.pitch = 0.18;
  sim.cam.aiming = false;
  sim.aimOnTarget = false;
  sim.interactables.clear();
  sim.focus = null;
  sim.busy = false;
  sim.shot = null;
  sim.trauma = 0;
  sim.hitstop = 0;
  sim.lastKnockdown = -99;
  sim.knockdowns = [];
  sim.time = 0;
}

export function addTrauma(t: number): void {
  sim.trauma = Math.min(1, sim.trauma + t);
}

/** Ground-plane forward and right for the camera yaw (forward is where the camera looks). */
export function camBasis(yaw: number): { fx: number; fz: number; rx: number; rz: number } {
  return { fx: -Math.sin(yaw), fz: -Math.cos(yaw), rx: Math.cos(yaw), rz: -Math.sin(yaw) };
}
