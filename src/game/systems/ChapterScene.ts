import Phaser from 'phaser';
import { Director, isCancel } from '../Director';
import { ui, showDialogue, showCard, caption, setObjective, setHint, Cancelled, type DialogueStyle } from '../../state/ui';
import { settings, shakeScale } from '../../state/settings';
import { setCheckpoint, addStat, save, unlockAchievement } from '../../state/save';
import { CAST, type SpeakerId } from '../../data/cast';
import type { Line, Choice } from '../../data/script/lines';
import { chapterById } from '../../data/chapters';
import { voice } from '../../audio/voice';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { audio } from '../../audio/engine';
import { Rig } from '../entities/Rig';
import { portraitFor } from '../art/portraits';
import { registerCanvas, addProp } from '../art/props';
import { input } from './Input';
import { World } from './World';
import type { Actor } from '../entities/Actor';

export interface Beat {
  id: string;
  run: () => Promise<void>;
}

export interface Interactable {
  x: number;
  y: number;
  r: number;
  label: string;
  enabled: boolean;
  once?: boolean;
  onUse: () => void | Promise<void>;
}

/**
 * Base class for every chapter. A chapter is a list of beats (checkpoints);
 * each beat is linear async code. Everything awaited here is cancelled when
 * the scene shuts down, so restarting/quitting never leaves orphaned scripts.
 */
export abstract class ChapterScene extends Phaser.Scene {
  abstract readonly chapter: number;
  abort!: AbortController;
  world!: World;
  actors: Actor[] = [];
  interactables: Interactable[] = [];
  speakers = new Map<string, Rig>();
  updaters = new Set<(dt: number) => void>();
  player: Actor | null = null;
  busy = false; // a script owns the controls
  hitstopMs = 0;
  protected startBeat: string | null = null;
  private interactCooldown = 0;
  private bgImages: Phaser.GameObjects.Image[] = [];
  cm: Phaser.Filters.ColorMatrix | null = null;

  constructor(key: string) {
    super({ key });
  }

  init(data: { beat?: string | null }): void {
    this.startBeat = data?.beat ?? null;
  }

  abstract beats(): Beat[];

  create(): void {
    this.abort = new AbortController();
    this.actors = [];
    this.interactables = [];
    this.speakers.clear();
    this.updaters.clear();
    this.player = null;
    this.busy = false;
    this.hitstopMs = 0;
    this.bgImages = [];
    this.cm = null;
    this.setName = null;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.cameras.main.setBackgroundColor('#000000');
    void this.runFrom(this.startBeat);
  }

  private teardown(): void {
    this.abort.abort();
    voice.stop();
    setHint(null);
    this.updaters.clear();
    this.tweens.killAll();
    this.time.removeAllEvents();
    audio.muffle(0);
  }

  get signal(): AbortSignal {
    return this.abort.signal;
  }

  private async runFrom(beatId: string | null): Promise<void> {
    const list = this.beats();
    let i = beatId ? list.findIndex((b) => b.id === beatId) : 0;
    if (i < 0) i = 0;
    const info = chapterById(this.chapter);
    try {
      if (i === 0) {
        await this.chapterIntro(info.id, info.title);
      } else {
        Director.overlay?.showOsd(`▶ PLAY  CH.${String(info.id).padStart(2, '0')}`);
      }
      for (; i < list.length; i++) {
        const b = list[i];
        if (i > 0 || beatId) setCheckpoint(this.chapter, b.id);
        this.resetBeatState();
        await b.run();
        if (this.signal.aborted) return;
      }
      Director.chapterComplete(this.chapter);
    } catch (e) {
      if (isCancel(e)) return;
      console.error(e);
      throw e;
    }
  }

  /** Per-beat UI reset (the set itself survives unless useSet() switches it). */
  resetBeatState(): void {
    this.busy = false;
    ui.set({ hint: null });
    setObjective(null);
  }

  setName: string | null = null;

  /** Build a location once; switching to a different set clears the stage. */
  useSet(name: string, build: () => void): boolean {
    if (this.setName === name) return false;
    this.clearSet();
    this.setName = name;
    build();
    return true;
  }

  clearSet(): void {
    this.children.removeAll(true);
    this.actors = [];
    this.interactables = [];
    this.speakers.clear();
    this.updaters.clear();
    this.player = null;
    this.busy = false;
    this.tweens.killAll();
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.removeBounds();
    if (this.webgl) {
      this.cameras.main.filters.internal.clear();
      this.cameras.main.filters.external.clear();
    }
    this.cm = null;
    this.setName = null;
    ui.set({ hud: null, hint: null, touchLayout: 'none' });
    Director.overlay?.letterbox(false, 1);
  }

  async chapterIntro(num: number, title: string): Promise<void> {
    Director.overlay?.showOsd(`▶ PLAY  CH.${String(num).padStart(2, '0')}`);
    sfx('vhs');
    await this.card({ kind: 'chapter', num, title, sub: chapterById(num).blurb }, 2600);
  }

  // ------------------------------------------------------------------ timing
  wait(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.signal.aborted) return reject(new Cancelled());
      const ev = this.time.delayedCall(ms, () => {
        this.signal.removeEventListener('abort', onAbort);
        resolve();
      });
      const onAbort = () => {
        ev.remove(false);
        reject(new Cancelled());
      };
      this.signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  /** Resolve when pred() is true (checked every frame). */
  waitUntil(pred: () => boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.signal.aborted) return reject(new Cancelled());
      if (pred()) return resolve();
      const fn = () => {
        if (pred()) {
          this.updaters.delete(fn);
          this.signal.removeEventListener('abort', onAbort);
          resolve();
        }
      };
      const onAbort = () => {
        this.updaters.delete(fn);
        reject(new Cancelled());
      };
      this.updaters.add(fn);
      this.signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  /**
   * Run fn every frame until it calls done(). The standard shape of every
   * minigame loop; cancelled automatically with the scene.
   */
  frameLoop(fn: (dt: number, done: () => void) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.signal.aborted) return reject(new Cancelled());
      let finished = false;
      const onAbort = () => {
        this.updaters.delete(tick);
        reject(new Cancelled());
      };
      const done = () => {
        if (finished) return;
        finished = true;
        this.updaters.delete(tick);
        this.signal.removeEventListener('abort', onAbort);
        resolve();
      };
      const tick = (dt: number) => {
        if (!finished) fn(dt, done);
      };
      this.signal.addEventListener('abort', onAbort, { once: true });
      this.updaters.add(tick);
    });
  }

  tweenP(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.signal.aborted) return reject(new Cancelled());
      const onAbort = () => reject(new Cancelled());
      this.signal.addEventListener('abort', onAbort, { once: true });
      this.tweens.add({
        ...cfg,
        onComplete: (...args: unknown[]) => {
          this.signal.removeEventListener('abort', onAbort);
          (cfg.onComplete as ((...a: unknown[]) => void) | undefined)?.(...args);
          resolve();
        },
      });
    });
  }

  guard(): void {
    if (this.signal.aborted) throw new Cancelled();
  }

  // ------------------------------------------------------------------ dialogue
  speaker(id: string, rig: Rig): Rig {
    this.speakers.set(id, rig);
    return rig;
  }

  private rigFor(who: SpeakerId): Rig | undefined {
    return this.speakers.get(who) ?? this.speakers.get(who.split('_')[0]);
  }

  async say(line: Line, opts: { auto?: boolean; rig?: Rig } = {}): Promise<void> {
    this.guard();
    const c = CAST[line.who];
    const rig = opts.rig ?? this.rigFor(line.who);
    const style: DialogueStyle = line.style ?? (c.fx === 'radio' ? 'radio' : c.fx === 'tv' ? 'tv' : c.fx === 'ghost' ? 'ghost' : line.who === 'narrator' ? 'narrator' : 'normal');
    if (rig) rig.talking = true;
    const dur = voice.duration(line.id);
    const voicePromise = line.silent ? Promise.resolve() : voice.play(line.id);
    const auto = opts.auto || settings.get().autoAdvance;
    const autoMs = auto ? Math.max(dur + 450, 900 + line.text.length * 38) : null;
    voicePromise.then(() => {
      if (rig && !this.signal.aborted) rig.talking = false;
    });
    try {
      await showDialogue(
        { speaker: line.who, name: c.name, color: c.color, portrait: portraitFor(c.portrait, c.color), text: line.text, style, choices: null, autoMs },
        this.signal,
      );
    } finally {
      if (rig) rig.talking = false;
      voice.stop();
      input.endFrame();
      this.interactCooldown = 200;
    }
  }

  async sayAll(lines: Line[]): Promise<void> {
    for (const l of lines) await this.say(l);
  }

  /** Non-blocking line: voice + caption, no dialogue box. */
  bark(line: Line): void {
    const rig = this.rigFor(line.who);
    if (rig) {
      rig.talking = true;
      this.time.delayedCall(Math.max(800, voice.duration(line.id)), () => (rig.talking = false));
    }
    if (!line.silent) void voice.play(line.id);
    if (settings.get().subtitles) caption(`${CAST[line.who].name}: ${line.text}`, Math.max(2200, voice.duration(line.id) + 800));
  }

  /** Present choices; Scarn (or the given speaker) then says the picked line. */
  async choose(prompt: Line | null, choices: Choice[]): Promise<number> {
    this.guard();
    const who = prompt?.who ?? 'scarn';
    const c = CAST[who];
    const rig = prompt ? this.rigFor(prompt.who) : undefined;
    if (prompt && !prompt.silent) {
      if (rig) rig.talking = true;
      void voice.play(prompt.id).then(() => rig && (rig.talking = false));
    }
    let idx: number;
    try {
      idx = await showDialogue(
        {
          speaker: who,
          name: prompt ? c.name : 'MICHAEL SCARN',
          color: prompt ? c.color : CAST.scarn.color,
          portrait: portraitFor(prompt ? c.portrait : 'scarn', prompt ? c.color : CAST.scarn.color),
          text: prompt?.text ?? '(What does Scarn say?)',
          style: 'normal',
          choices: choices.map((ch) => ch.label),
          autoMs: null,
        },
        this.signal,
      );
    } finally {
      if (rig) rig.talking = false;
      voice.stop();
      input.endFrame();
    }
    sfx('ui_select');
    await this.say(choices[idx].line);
    return idx;
  }

  /** Fire-and-forget: scene-shutdown cancellation is expected and ignored, real errors are logged. */
  detach(p: Promise<unknown>): void {
    p.catch((e: unknown) => {
      if (!(e instanceof Cancelled)) console.error(e);
    });
  }

  card(c: Parameters<typeof showCard>[0], ms = 2400): Promise<void> {
    return showCard(c, ms, this.signal);
  }

  async missionCard(title: string, sub?: string): Promise<void> {
    sfx('stamp');
    music.stinger('dun');
    await this.card({ kind: 'mission', title, sub }, 3000);
  }

  objective(text: string | null): void {
    setObjective(text);
  }

  // ------------------------------------------------------------------ camera & fx
  shake(ms = 200, intensity = 0.008): void {
    const k = shakeScale();
    if (k <= 0) return;
    this.cameras.main.shake(ms, intensity * k);
  }

  flash(color = 0xffffff, ms = 200, alpha = 0.8): void {
    Director.overlay?.flash(color, ms, alpha);
  }

  letterbox(on: boolean): void {
    ui.set({ letterbox: on });
    Director.overlay?.letterbox(on);
  }

  lensFlare(x?: number, y?: number): void {
    Director.overlay?.lensFlare(x, y);
  }

  hitstop(ms: number): void {
    this.hitstopMs = Math.max(this.hitstopMs, ms);
  }

  panTo(x: number, y: number, ms = 800, ease = 'Sine.easeInOut'): Promise<void> {
    this.cameras.main.stopFollow();
    return new Promise((resolve) => {
      this.cameras.main.pan(x, y, ms, ease, false, (_c: Phaser.Cameras.Scene2D.Camera, p: number) => {
        if (p >= 1) resolve();
      });
    });
  }

  zoomTo(z: number, ms = 600, ease = 'Sine.easeInOut'): Promise<void> {
    return new Promise((resolve) => {
      this.cameras.main.zoomTo(z, ms, ease, false, (_c: Phaser.Cameras.Scene2D.Camera, p: number) => {
        if (p >= 1) resolve();
      });
    });
  }

  /** Michael's signature awkward zoom: fast punch-in, hold, drift. */
  async crashZoom(x: number, y: number, z = 1.6): Promise<void> {
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(x, y);
    await this.zoomTo(z, 160, 'Cubic.easeOut');
    sfx('whoosh');
  }

  /** Camera filters are WebGL-only; in Canvas mode these effects are skipped. */
  get webgl(): boolean {
    return this.renderer.type === Phaser.WEBGL;
  }

  colorMatrix(): Phaser.Filters.ColorMatrix | null {
    if (!this.webgl) return null;
    if (!this.cm) this.cm = this.cameras.main.filters.internal.addColorMatrix();
    return this.cm;
  }

  grayscale(on: boolean): void {
    const cm = this.colorMatrix();
    if (!cm) return;
    cm.colorMatrix.reset();
    if (on) cm.colorMatrix.grayscale(1);
  }

  sepia(on: boolean): void {
    const cm = this.colorMatrix();
    if (!cm) return;
    cm.colorMatrix.reset();
    if (on) cm.colorMatrix.sepia();
  }

  /** Soft-focus memory effect (bokeh). Returns a remover. */
  softFocus(): () => void {
    if (!this.webgl) return () => undefined;
    const f = this.cameras.main.filters.internal.addBokeh(0.6, 2, 0.3);
    return () => this.cameras.main.filters.internal.remove(f);
  }

  /** Dramatic freeze frame with an optional stamped caption. */
  async freezeFrame(label?: string, ms = 1600): Promise<void> {
    sfx('freeze');
    this.flash(0xffffff, 180, 0.6);
    const rigs = this.children.list.filter((o): o is Rig => o instanceof Rig);
    rigs.forEach((r) => (r.frozen = true));
    this.tweens.pauseAll();
    const cm = this.colorMatrix();
    cm?.colorMatrix.reset();
    cm?.colorMatrix.saturate(-0.6);
    cm?.colorMatrix.contrast(0.2, true);
    if (label) this.detach(this.card({ kind: 'stamp', title: label }, ms));
    await this.wait(ms);
    cm?.colorMatrix.reset();
    this.tweens.resumeAll();
    rigs.forEach((r) => (r.frozen = false));
  }

  // ------------------------------------------------------------------ building sets
  background(key: string, paint: () => HTMLCanvasElement, x = 0, y = 0, scrollFactor = 1): Phaser.GameObjects.Image {
    if (!this.textures.exists(key)) registerCanvas(this, key, paint());
    const im = this.add.image(x, y, key).setOrigin(0).setDepth(-10000).setScrollFactor(scrollFactor);
    this.bgImages.push(im);
    return im;
  }

  prop(key: string, x: number, y: number, scale = 1): Phaser.GameObjects.Image {
    return addProp(this, key, x, y, scale);
  }

  rig(id: string, x: number, y: number, facing: 1 | -1 = 1, scale = 1): Rig {
    const r = new Rig(this, x, y, id, { facing, scale });
    r.setDepth(y);
    return r;
  }

  interact(i: Omit<Interactable, 'enabled'> & { enabled?: boolean }): Interactable {
    const it: Interactable = { enabled: true, ...i };
    this.interactables.push(it);
    return it;
  }

  // ------------------------------------------------------------------ loop
  update(_time: number, delta: number): void {
    if (ui.get().paused) return;
    if (this.hitstopMs > 0) {
      this.hitstopMs -= delta;
      return;
    }
    const dt = Math.min(delta, 50) / 1000;
    this.interactCooldown -= delta;
    for (const a of this.actors) if (a.alive || a.updatesWhenDead) a.update(dt);
    for (const fn of Array.from(this.updaters)) {
      try {
        fn(dt);
      } catch (e) {
        // One broken per-frame callback must never freeze the whole chapter.
        this.updaters.delete(fn);
        console.error('updater removed after error', e);
      }
    }
    for (const a of this.actors) a.sync();
    this.updateInteract();
  }

  private updateInteract(): void {
    const p = this.player;
    if (!p || this.busy || ui.get().dialogue) {
      setHint(null);
      return;
    }
    let best: Interactable | null = null;
    let bd = Infinity;
    for (const it of this.interactables) {
      if (!it.enabled) continue;
      const d = Math.hypot(it.x - p.x, (it.y - p.y) * 1.6);
      if (d < it.r && d < bd) {
        best = it;
        bd = d;
      }
    }
    const mode = ui.get().inputMode;
    const key = mode === 'pad' ? 'Ⓐ' : mode === 'touch' ? '✋' : 'E';
    setHint(best ? `[${key}] ${best.label}` : null);
    if (best && this.interactCooldown <= 0 && input.consume('interact')) {
      this.interactCooldown = 300;
      const it = best;
      if (it.once) it.enabled = false;
      sfx('ui_select');
      const r = it.onUse();
      if (r instanceof Promise) {
        this.busy = true;
        r.catch((e) => {
          if (!isCancel(e)) console.error(e);
        }).finally(() => {
          this.busy = false;
        });
      }
    }
  }

  // ------------------------------------------------------------------ misc
  stat(key: Parameters<typeof addStat>[0], n = 1): void {
    addStat(key, n);
  }

  achieve(id: string): void {
    unlockAchievement(id);
  }

  takeNumber(): number {
    return (save.get().flags[`takes_${this.chapter}`] as number | undefined) ?? 1;
  }
}
