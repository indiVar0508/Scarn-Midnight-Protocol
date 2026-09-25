import Phaser from 'phaser';
import { SPECS, R, drawCharacter, type HeadFrame, type PartCanvas, type CharSpec } from '../art/characters';
import { propOrigin, ensureProp, hasProp } from '../art/props';

/**
 * Cut-out ("paper doll") character rig. One rig style animates every
 * character: bones are nested Containers, poses are joint-angle sets that the
 * rig eases toward every frame, and cycles (walk/run/skate/dance) are procedural.
 */

export interface Pose {
  lean: number; // torso, + = forward
  head: number; // + = nod forward
  aF: number; // front shoulder, + = swing forward
  eF: number; // front elbow bend, + = forward
  aB: number;
  eB: number;
  lF: number; // front hip, + = forward
  kF: number; // knee bend, + = back
  lB: number;
  kB: number;
  y: number; // body offset (crouch +)
  rot: number; // whole-body rotation (for falls), degrees
}

export const BASE_POSE: Pose = { lean: 0, head: 0, aF: 6, eF: 14, aB: -6, eB: 10, lF: 0, kF: 0, lB: 0, kB: 0, y: 0, rot: 0 };

export const POSES: Record<string, Partial<Pose>> = {
  stand: {},
  heroic: { lean: -4, head: -4, aF: -12, eF: 70, aB: -18, eB: 60, lF: 8, lB: -8 },
  fingerguns: { lean: -6, head: -6, aF: 92, eF: 0, aB: 70, eB: 25, lF: 14, kF: 6, lB: -10, kB: 8 },
  pointForward: { aF: 90, eF: 0, head: -3 },
  aim: { aF: 90, eF: 0, aB: 70, eB: 30, lean: -2, lF: 10, lB: -8 },
  victory: { aF: 170, eF: 0, aB: 160, eB: 10, head: -12, lean: -6, lF: 6, lB: -6 },
  oneArmUp: { aF: 165, eF: 5, aB: -10, eB: 20, head: -10, lean: -4 },
  hurt: { lean: -16, head: -18, aF: 40, eF: 30, aB: 50, eB: 40, lF: 10, kF: 10, lB: -14, kB: 20, y: 4 },
  kneel: { lean: 8, head: 8, aF: 30, eF: 60, aB: -10, eB: 30, lF: 80, kF: -80, lB: -20, kB: 110, y: 22 },
  kneelSad: { lean: 26, head: 24, aF: 10, eF: 20, aB: 0, eB: 10, lF: 80, kF: -80, lB: -20, kB: 110, y: 22 },
  sit: { lean: -4, aF: 30, eF: 50, aB: 20, eB: 40, lF: 90, kF: 90, lB: 86, kB: 92, y: 30 },
  sitSlump: { lean: 12, head: 16, aF: 20, eF: 30, aB: 14, eB: 30, lF: 90, kF: 90, lB: 86, kB: 92, y: 32 },
  lieBack: { rot: -90, y: 0, aF: 20, eF: 10, aB: 30, eB: 10, lF: 4, lB: -4, head: -10 },
  lieFront: { rot: 90, y: 0, aF: 160, eF: 10, aB: 170, eB: 10, head: 0 },
  crouch: { lean: 20, head: -10, aF: 40, eF: 50, aB: 30, eB: 50, lF: 40, kF: 60, lB: -10, kB: 60, y: 14 },
  sneak: { lean: 24, head: -14, aF: 60, eF: 70, aB: 40, eB: 70, y: 12 },
  shrug: { aF: 30, eF: 90, aB: 30, eB: 90, head: 6 },
  handsHips: { aF: -20, eF: 80, aB: -24, eB: 80, lF: 8, lB: -8 },
  thinking: { aF: 40, eF: 140, head: 8, aB: 10, eB: 60 },
  facepalm: { aF: 60, eF: 150, head: 16, lean: 6 },
  sing: { aF: 40, eF: 100, aB: 60, eB: 20, head: -10, lean: -4 },
  wave: { aF: 150, eF: 40 },
  salute: { aF: 110, eF: 150, head: -4 },
  point: { aF: 95, eF: 0, aB: -10, eB: 20 },
  cower: { lean: 14, head: 14, aF: 120, eF: 140, aB: 110, eB: 140, lF: 20, kF: 30, lB: -10, kB: 30, y: 8 },
  tied: { aF: -30, eF: 10, aB: -40, eB: 10, head: 10, lean: 4 },
  phone: { aF: 50, eF: 150, head: -4 },
  shoot: { aF: 90, eF: 0, aB: 70, eB: 30, lean: -4 },
  dramaticTurn: { lean: -8, head: -14, aF: 20, eF: 90, aB: -30, eB: 20, lF: 10, lB: -12 },
  // Do The Scarn moves
  danceLeft: { lean: -10, head: -10, aF: -60, eF: 20, aB: 120, eB: 30, lF: -20, kF: 10, lB: 20, kB: 10, y: 2 },
  danceRight: { lean: 6, head: 4, aF: 95, eF: 0, aB: -20, eB: 90, lF: 24, kF: 0, lB: -10, kB: 16 },
  danceUp: { lean: -8, head: -14, aF: 175, eF: 0, aB: 175, eB: 0, lF: 4, lB: -4, y: -4 },
  danceDown: { lean: 18, head: 10, aF: 30, eF: 110, aB: 30, eB: 110, lF: 40, kF: 70, lB: 30, kB: 70, y: 22 },
  danceScarn: { lean: -10, head: -10, aF: 95, eF: 0, aB: 80, eB: 10, lF: 30, kF: 30, lB: -30, kB: 20, y: 6 },
  skate: { lean: 24, head: -18, aF: 40, eF: 30, aB: -20, eB: 20, lF: 20, kF: 40, lB: -10, kB: 40, y: 10 },
  slapWind: { lean: 12, head: -10, aF: 170, eF: 20, aB: 150, eB: 20, lF: 20, kF: 30, lB: -20, kB: 30, y: 8 },
  slapHit: { lean: 30, head: -6, aF: 60, eF: 0, aB: 40, eB: 0, lF: 30, kF: 40, lB: -30, kB: 20, y: 10 },
  mop: { lean: 14, aF: 60, eF: 30, aB: 50, eB: 50, lF: 12, kF: 20, lB: -10, kB: 10, y: 4 },
};

export type AnimName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sneak'
  | 'skate'
  | 'pose'
  | 'down'
  | 'bob'
  | 'still';

const LEG = { hipY: -67, thigh: 30 };
const ARM = { upper: 26 };
export const RIG_SCALE = 0.82;

function ensureTex(scene: Phaser.Scene, key: string, p: PartCanvas): void {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, p.canvas);
}

/** Generate (once per game) all textures for a character spec. */
export function ensureCharacter(scene: Phaser.Scene, id: string, spec?: CharSpec): void {
  const k = `c_${id}_torso`;
  if (scene.textures.exists(k)) return;
  const s = spec ?? SPECS[id];
  if (!s) throw new Error(`Unknown character ${id}`);
  const parts = drawCharacter(s);
  for (const [f, p] of Object.entries(parts.heads)) ensureTex(scene, `c_${id}_head_${f}`, p);
  ensureTex(scene, `c_${id}_torso`, parts.torso);
  if (parts.cape) ensureTex(scene, `c_${id}_cape`, parts.cape);
  ensureTex(scene, `c_${id}_uarmF`, parts.uarmF);
  ensureTex(scene, `c_${id}_uarmB`, parts.uarmB);
  ensureTex(scene, `c_${id}_farmF`, parts.farmF);
  ensureTex(scene, `c_${id}_farmB`, parts.farmB);
  ensureTex(scene, `c_${id}_thighF`, parts.thighF);
  ensureTex(scene, `c_${id}_thighB`, parts.thighB);
  ensureTex(scene, `c_${id}_shinF`, parts.shinF);
  ensureTex(scene, `c_${id}_shinB`, parts.shinB);
  pivots.set(id, parts);
}

const pivots = new Map<string, ReturnType<typeof drawCharacter>>();

const D2R = Math.PI / 180;

interface Limb {
  root: Phaser.GameObjects.Container;
  upper: Phaser.GameObjects.Image;
  joint: Phaser.GameObjects.Container;
  lower: Phaser.GameObjects.Image;
}

export class Rig extends Phaser.GameObjects.Container {
  readonly charId: string;
  readonly spec: CharSpec;
  bodyC: Phaser.GameObjects.Container;
  torsoC: Phaser.GameObjects.Container;
  torso: Phaser.GameObjects.Image;
  neck: Phaser.GameObjects.Container;
  head: Phaser.GameObjects.Image;
  cape: Phaser.GameObjects.Image | null = null;
  armF: Limb;
  armB: Limb;
  legF: Limb;
  legB: Limb;
  hand: Phaser.GameObjects.Container;
  handItem: Phaser.GameObjects.Image | null = null;
  shadow: Phaser.GameObjects.Ellipse;

  pose: Pose = { ...BASE_POSE };
  target: Pose = { ...BASE_POSE };
  anim: AnimName = 'idle';
  poseName = 'stand';
  facing: 1 | -1 = 1;
  baseScale: number;
  phase = 0;
  moveSpeed = 0; // px/s used to drive cycles
  stiffness = 16;
  talking = false;
  frozen = false;
  expression: HeadFrame = 'idle';
  aimAngle: number | null = null; // world radians
  flair: Array<Partial<Pose>> = [];
  private flairTimer = 3000 + Math.random() * 3000;
  private flairPose: Partial<Pose> | null = null;
  private flairLeft = 0;
  private blinkTimer = 2000 + Math.random() * 3000;
  private blinkLeft = 0;
  private talkTimer = 0;
  private talkOpen = false;
  private kickAmt = 0;
  private hurtLeft = 0;
  private poseOverride: { pose: Partial<Pose>; left: number } | null = null;
  bob = 0; // extra vertical bob (dance)
  spin = 0; // degrees, rotates the whole body around its centre (dodge rolls, puck hits)
  ghost = false;

  constructor(scene: Phaser.Scene, x: number, y: number, charId: string, opts: { scale?: number; facing?: 1 | -1 } = {}) {
    super(scene, x, y);
    this.charId = charId;
    ensureCharacter(scene, charId);
    this.spec = SPECS[charId];
    const parts = pivots.get(charId)!;
    this.baseScale = (opts.scale ?? 1) * (this.spec.scale ?? 1) * RIG_SCALE;
    const T = (k: string) => `c_${charId}_${k}`;
    const img = (key: string, p: PartCanvas) => {
      const im = new Phaser.GameObjects.Image(scene, 0, 0, key);
      im.setOrigin(p.ox / (p.canvas.width / R), p.oy / (p.canvas.height / R));
      im.setScale(1 / R);
      return im;
    };
    const mkLimb = (upperKey: string, lowerKey: string, up: PartCanvas, low: PartCanvas, jointY: number): Limb => {
      const root = new Phaser.GameObjects.Container(scene, 0, 0);
      const upper = img(upperKey, up);
      const joint = new Phaser.GameObjects.Container(scene, 0, jointY);
      const lower = img(lowerKey, low);
      joint.add(lower);
      root.add([upper, joint]);
      return { root, upper, joint, lower };
    };

    this.shadow = new Phaser.GameObjects.Ellipse(scene, 0, 0, 70, 16, 0x000000, 0.28);
    this.add(this.shadow);

    this.bodyC = new Phaser.GameObjects.Container(scene, 0, 0);
    this.add(this.bodyC);

    const bulk = this.spec.bulk ?? 1;
    const skirt = this.spec.outfit === 'gown';
    this.legB = mkLimb(T('thighB'), T('shinB'), parts.thighB, parts.shinB, LEG.thigh);
    this.legB.root.setPosition(-6, LEG.hipY);
    this.legF = mkLimb(T('thighF'), T('shinF'), parts.thighF, parts.shinF, LEG.thigh);
    this.legF.root.setPosition(5, LEG.hipY);

    this.torsoC = new Phaser.GameObjects.Container(scene, 0, LEG.hipY);
    this.torso = img(T('torso'), parts.torso);
    this.armB = mkLimb(T('uarmB'), T('farmB'), parts.uarmB, parts.farmB, ARM.upper);
    this.armB.root.setPosition(-12 * bulk, -50);
    this.armF = mkLimb(T('uarmF'), T('farmF'), parts.uarmF, parts.farmF, ARM.upper);
    this.armF.root.setPosition(10 * bulk, -50);
    this.neck = new Phaser.GameObjects.Container(scene, 2, -56);
    this.head = img(T('head_idle'), parts.heads.idle);
    this.neck.add(this.head);
    this.hand = new Phaser.GameObjects.Container(scene, 0, 28);
    this.armF.joint.add(this.hand);

    if (parts.cape) {
      this.cape = img(T('cape'), parts.cape);
      this.cape.setPosition(-4, -54);
      this.torsoC.add(this.cape);
    }
    this.torsoC.add([this.armB.root, this.torso, this.neck, this.armF.root]);
    if (skirt) this.bodyC.add([this.legB.root, this.legF.root, this.torsoC]);
    else this.bodyC.add([this.legB.root, this.legF.root, this.torsoC]);

    this.setScale(this.baseScale);
    this.setFacing(opts.facing ?? 1);
    scene.add.existing(this);
    this.applyPose();
  }

  setFacing(f: 1 | -1): this {
    this.facing = f;
    this.scaleX = Math.abs(this.scaleX || this.baseScale) * f;
    return this;
  }

  face(x: number): this {
    if (Math.abs(x - this.x) > 2) this.setFacing(x < this.x ? -1 : 1);
    return this;
  }

  setAnim(a: AnimName, pose = 'stand'): this {
    this.anim = a;
    this.poseName = pose;
    return this;
  }

  /** Hold a named pose (anim 'pose'). */
  strike(pose: string): this {
    return this.setAnim('pose', pose);
  }

  /** Briefly override the pose (e.g. a gesture) then return to the anim. */
  gesture(pose: string | Partial<Pose>, ms = 600): this {
    this.poseOverride = { pose: typeof pose === 'string' ? POSES[pose] ?? {} : pose, left: ms };
    return this;
  }

  setExpression(e: HeadFrame): this {
    this.expression = e;
    return this;
  }

  hold(key: string | null, ox = 0, oy = 0, rot = 0): this {
    this.handItem?.destroy();
    this.handItem = null;
    if (key) {
      if (hasProp(key)) ensureProp(this.scene, key);
      const im = new Phaser.GameObjects.Image(this.scene, ox, oy, key);
      im.setRotation(rot);
      const meta = propOrigin(key);
      if (meta) im.setOrigin(meta[0], meta[1]);
      im.setScale(1 / R);
      this.hand.add(im);
      this.handItem = im;
    }
    return this;
  }

  /** Recoil impulse (shooting). */
  kick(amount = 1): void {
    this.kickAmt = Math.min(1.5, this.kickAmt + amount);
  }

  hurt(ms = 350): void {
    this.hurtLeft = ms;
    this.flash(0xff5050, 120);
  }

  flash(color = 0xffffff, ms = 90): void {
    const imgs = this.images();
    imgs.forEach((im) => im.setTint(color).setTintMode(Phaser.TintModes.FILL));
    this.scene.time.delayedCall(ms, () => {
      if (!this.active) return;
      imgs.forEach((im) => {
        im.clearTint();
        im.setTintMode(Phaser.TintModes.MULTIPLY);
      });
      if (this.ghost) this.setGhost(true);
    });
  }

  tint(color: number | null): void {
    this.images().forEach((im) => (color === null ? im.clearTint() : im.setTint(color)));
  }

  setGhost(on: boolean): void {
    this.ghost = on;
    this.images().forEach((im) => {
      im.setAlpha(on ? 0.55 : 1);
      im.setBlendMode(on ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    });
    this.shadow.setVisible(!on);
  }

  images(): Phaser.GameObjects.Image[] {
    const out: Phaser.GameObjects.Image[] = [];
    const walk = (c: Phaser.GameObjects.Container) => {
      c.list.forEach((o) => {
        if (o instanceof Phaser.GameObjects.Container) walk(o);
        else if (o instanceof Phaser.GameObjects.Image) out.push(o);
      });
    };
    walk(this.bodyC);
    return out;
  }

  /** World position of the front hand (for muzzle flashes / held props). */
  handWorld(): Phaser.Math.Vector2 {
    const m = this.hand.getWorldTransformMatrix();
    return new Phaser.Math.Vector2(m.tx, m.ty);
  }

  headWorld(): Phaser.Math.Vector2 {
    const m = this.neck.getWorldTransformMatrix();
    return new Phaser.Math.Vector2(m.tx, m.ty - 30 * this.baseScale);
  }

  preUpdate(_time: number, delta: number): void {
    if (this.frozen) return;
    this.tick(delta);
  }

  tick(delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    const t = { ...BASE_POSE };
    const assign = (p?: Partial<Pose>) => {
      if (p) Object.assign(t, p);
    };

    switch (this.anim) {
      case 'idle': {
        this.phase += dt * 2.2;
        assign(POSES[this.poseName]);
        t.lean += Math.sin(this.phase) * 1.2;
        t.aF += Math.sin(this.phase + 0.6) * 2;
        t.aB -= Math.sin(this.phase + 0.6) * 2;
        t.y += Math.sin(this.phase * 2) * 0.6;
        // Unnecessarily cool idle flair.
        if (this.flair.length && !this.talking) {
          if (this.flairLeft > 0) {
            this.flairLeft -= delta;
            assign(this.flairPose ?? undefined);
          } else {
            this.flairTimer -= delta;
            if (this.flairTimer <= 0) {
              this.flairPose = this.flair[Math.floor(Math.random() * this.flair.length)];
              this.flairLeft = 900 + Math.random() * 600;
              this.flairTimer = 4000 + Math.random() * 5000;
            }
          }
        }
        if (this.talking) {
          t.aF += Math.sin(this.phase * 2.3) * 14 + 10;
          t.eF += Math.sin(this.phase * 1.7) * 20 + 20;
          t.head += Math.sin(this.phase * 3.1) * 3;
        }
        break;
      }
      case 'walk':
      case 'run':
      case 'sneak': {
        const run = this.anim === 'run';
        const sneak = this.anim === 'sneak';
        const sp = Math.max(40, this.moveSpeed);
        this.phase += dt * sp * (run ? 0.055 : sneak ? 0.07 : 0.075);
        const s = Math.sin(this.phase);
        const c = Math.cos(this.phase);
        const amp = run ? 38 : sneak ? 22 : 26;
        assign(sneak ? POSES.sneak : undefined);
        t.lF = s * amp;
        t.lB = -s * amp;
        t.kF = Math.max(0, -c) * (run ? 70 : 40) + 4;
        t.kB = Math.max(0, c) * (run ? 70 : 40) + 4;
        if (!sneak) {
          t.aF = -s * (run ? 50 : 24) + 6;
          t.aB = s * (run ? 50 : 24) - 6;
          t.eF = run ? 80 : 20;
          t.eB = run ? 80 : 20;
          t.lean = run ? 12 : 2;
        }
        t.y += -Math.abs(Math.sin(this.phase)) * (run ? 5 : 2.5) + (sneak ? 12 : 0);
        if (this.poseName !== 'stand') assign(POSES[this.poseName]);
        break;
      }
      case 'skate': {
        const sp = Math.max(0, this.moveSpeed);
        this.phase += dt * (2 + sp * 0.012);
        assign(POSES.skate);
        const s = Math.sin(this.phase);
        const pushAmt = Math.min(1, sp / 250);
        t.lB = -10 - Math.max(0, s) * 40 * pushAmt;
        t.kB = 40 - Math.max(0, s) * 30 * pushAmt;
        t.lF = 20 + Math.max(0, -s) * 10 * pushAmt;
        t.aB = -20 - s * 30 * pushAmt;
        if (this.poseName !== 'stand') assign(POSES[this.poseName]);
        break;
      }
      case 'pose':
        assign(POSES[this.poseName]);
        this.phase += dt * 2;
        t.lean += Math.sin(this.phase) * 0.8;
        break;
      case 'bob':
        assign(POSES[this.poseName]);
        break;
      case 'down':
        assign(POSES.lieBack);
        break;
      case 'still':
        assign(POSES[this.poseName]);
        break;
    }

    if (this.poseOverride) {
      this.poseOverride.left -= delta;
      assign(this.poseOverride.pose);
      if (this.poseOverride.left <= 0) this.poseOverride = null;
    }

    if (this.aimAngle !== null) {
      // Convert world aim into a shoulder angle in rig space.
      let a = this.aimAngle;
      if (this.facing < 0) a = Math.PI - a;
      const deg = Phaser.Math.RadToDeg(a); // 0 = forward, +down
      t.aF = 90 - deg - t.lean;
      t.eF = 0;
      t.aB = Math.max(t.aB, 50);
      t.eB = 40;
    }

    if (this.kickAmt > 0) {
      t.aF += this.kickAmt * 16;
      t.eF += this.kickAmt * 10;
      t.lean -= this.kickAmt * 4;
      this.kickAmt = Math.max(0, this.kickAmt - dt * 8);
    }
    if (this.hurtLeft > 0) {
      this.hurtLeft -= delta;
      assign(POSES.hurt);
    }
    t.y += this.bob;
    this.target = t;

    // ease toward target
    const k = 1 - Math.exp(-dt * this.stiffness);
    const p = this.pose;
    (Object.keys(t) as (keyof Pose)[]).forEach((key) => {
      p[key] += (t[key] - p[key]) * k;
    });

    // head frames
    let frame: HeadFrame = this.expression;
    if (this.hurtLeft > 0) frame = 'hurt';
    this.blinkTimer -= delta;
    if (this.blinkTimer <= 0) {
      this.blinkLeft = 120;
      this.blinkTimer = 2200 + Math.random() * 3500;
    }
    if (this.talking) {
      this.talkTimer -= delta;
      if (this.talkTimer <= 0) {
        this.talkOpen = !this.talkOpen;
        this.talkTimer = 70 + Math.random() * 90;
      }
      if (this.talkOpen && frame === 'idle') frame = 'talk';
    }
    if (this.blinkLeft > 0) {
      this.blinkLeft -= delta;
      if (frame === 'idle' || frame === 'talk') frame = 'blink';
    }
    const key = `c_${this.charId}_head_${frame}`;
    if (this.head.texture.key !== key) this.head.setTexture(key);

    this.applyPose();
  }

  applyPose(): void {
    const p = this.pose;
    this.bodyC.y = p.y;
    this.bodyC.x = 0;
    this.bodyC.rotation = p.rot * D2R;
    if (p.rot !== 0) this.bodyC.y = p.y - Math.abs(Math.sin(p.rot * D2R)) * 18;
    if (this.spin !== 0) {
      const h = 80;
      const th = this.spin * D2R;
      this.bodyC.rotation += th;
      this.bodyC.x = -h * Math.sin(th);
      this.bodyC.y += -h + h * Math.cos(th);
    }
    this.torsoC.rotation = p.lean * D2R;
    this.neck.rotation = p.head * D2R;
    this.armF.root.rotation = -p.aF * D2R;
    this.armF.joint.rotation = -p.eF * D2R;
    this.armB.root.rotation = -p.aB * D2R;
    this.armB.joint.rotation = -p.eB * D2R;
    this.legF.root.rotation = -p.lF * D2R;
    this.legF.joint.rotation = p.kF * D2R;
    this.legB.root.rotation = -p.lB * D2R;
    this.legB.joint.rotation = p.kB * D2R;
    if (this.cape) this.cape.rotation = (-p.lean * 0.6 + Math.min(30, this.moveSpeed * 0.08)) * D2R;
    this.shadow.setScale(p.rot !== 0 ? 1.8 : 1, 1);
  }

  /** Snap immediately to the current target (no easing). */
  snap(): void {
    this.tick(16);
    Object.assign(this.pose, this.target);
    this.applyPose();
  }
}
