import Phaser from 'phaser';
import { ui, clearDialogue, Cancelled } from '../state/ui';
import { save, setCheckpoint, completeChapter, addStat, unlockAchievement, flushSave } from '../state/save';
import { settings } from '../state/settings';
import { CHAPTERS, chapterById } from '../data/chapters';
import { audio } from '../audio/engine';
import { music } from '../audio/music';
import { voice } from '../audio/voice';
import { input } from './systems/Input';
import type { OverlayScene } from './scenes/OverlayScene';

/**
 * Global flow controller: owns the Phaser.Game, starts/stops chapter scenes,
 * handles pause, checkpoints, the screening intermissions and the ending.
 */
class DirectorImpl {
  game: Phaser.Game | null = null;
  currentKey: string | null = null;
  private scenesReady: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;

  get overlay(): OverlayScene | null {
    return (this.game?.scene.getScene('Overlay') as OverlayScene) ?? null;
  }

  private booting: Promise<void> | null = null;

  /** Idempotent: React StrictMode mounts effects twice in development. */
  boot(parent: HTMLElement): Promise<void> {
    if (!this.booting) this.booting = this.doBoot(parent);
    return this.booting;
  }

  private async doBoot(parent: HTMLElement): Promise<void> {
    this.scenesReady = new Promise((r) => (this.readyResolve = r));
    await loadFonts();
    const { createGame } = await import('./createGame');
    this.game = createGame(parent, () => this.readyResolve?.());
    input.attach();
    this.game.events.on(Phaser.Core.Events.PRE_STEP, () => input.pollGamepad());
    this.game.events.on(Phaser.Core.Events.POST_STEP, () => input.endFrame());
    await this.scenesReady;
    const canvas = this.game.canvas;
    input.setCanvas(canvas);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && ui.get().screen === 'game' && !ui.get().paused) this.pause();
    });
    window.setInterval(() => {
      const s = ui.get();
      if (s.screen === 'game' && !s.paused && !document.hidden) addStat('playMs', 1000);
    }, 1000);
  }

  whenReady(): Promise<void> {
    return this.scenesReady ?? Promise.resolve();
  }

  private stopChapters(): void {
    const g = this.game;
    if (!g) return;
    voice.stop();
    clearDialogue();
    for (const s of g.scene.getScenes(false)) {
      const k = s.scene.key;
      if (k.startsWith('Ch') || k === 'Screening' || k === 'Attract') {
        if (s.scene.isActive() || s.scene.isPaused() || s.scene.isSleeping()) g.scene.stop(k);
      }
    }
    this.currentKey = null;
    ui.set({ objective: null, hint: null, hud: null, card: null, caption: null, touchLayout: 'none', letterbox: false });
    this.overlay?.letterbox(false, 1);
    this.overlay?.blackout(false);
  }

  async startChapter(n: number, beat: string | null = null): Promise<void> {
    await this.whenReady();
    audio.resume();
    const g = this.game!;
    this.stopChapters();
    const info = chapterById(n);
    ui.set({ screen: 'game', inGame: true, paused: false, chapterTitle: info.title });
    if (!beat) setCheckpoint(n, 'start');
    this.currentKey = info.key;
    g.scene.start(info.key, { beat });
    g.scene.bringToTop('Overlay');
  }

  continueGame(): void {
    const s = save.get();
    void this.startChapter(s.chapter, s.beat && s.beat !== 'start' ? s.beat : null);
  }

  /** Called by a chapter scene when it finishes. */
  chapterComplete(n: number): void {
    completeChapter(n);
    if (n >= CHAPTERS.length) {
      unlockAchievement('midnight');
      flushSave();
      this.stopChapters();
      music.play('spy', { fade: 1 });
      ui.set({ screen: 'credits', inGame: false, paused: false, settingsReturn: 'menu', creditsNext: 'stats' });
      return;
    }
    if (settings.get().screeningMode) {
      this.stopChapters();
      this.currentKey = 'Screening';
      this.game!.scene.start('Screening', { next: n + 1, after: n });
      this.game!.scene.bringToTop('Overlay');
    } else {
      void this.startChapter(n + 1);
    }
  }

  restartCheckpoint(): void {
    const s = save.get();
    this.resume();
    void this.startChapter(s.chapter, s.beat && s.beat !== 'start' ? s.beat : null);
  }

  quitToMenu(): void {
    this.resume();
    this.stopChapters();
    ui.set({ screen: 'menu', inGame: false, paused: false, chapterTitle: null });
    this.game?.scene.start('Attract');
    this.game?.scene.bringToTop('Overlay');
    music.play('spy', { fade: 0.8 });
  }

  pause(): void {
    if (!this.game || ui.get().paused) return;
    ui.set({ paused: true });
    const k = this.currentKey;
    if (k && this.game.scene.isActive(k)) this.game.scene.pause(k);
    if (audio.ctx && audio.ctx.state === 'running') void audio.ctx.suspend();
    input.clear();
  }

  resume(): void {
    if (!ui.get().paused) return;
    ui.set({ paused: false });
    const k = this.currentKey;
    if (k && this.game?.scene.isPaused(k)) this.game.scene.resume(k);
    if (audio.ctx && audio.ctx.state === 'suspended') void audio.ctx.resume();
    input.clear();
  }

  togglePause(): void {
    if (ui.get().paused) this.resume();
    else this.pause();
  }
}

export const Director = new DirectorImpl();

/** Procedural art paints text into canvases, so web fonts must be ready first. */
async function loadFonts(): Promise<void> {
  if (!document.fonts) return;
  const faces = ['40px "Bebas Neue"', '40px "Permanent Marker"', '40px "Playfair Display"', '40px "Special Elite"', '40px "VT323"', '700 40px "Barlow Condensed"'];
  const all = Promise.all(faces.map((f) => document.fonts.load(f).catch(() => undefined)));
  await Promise.race([all, new Promise((r) => setTimeout(r, 2500))]);
}

/** Swallow expected cancellation from aborted chapter scripts. */
export function isCancel(e: unknown): boolean {
  return e instanceof Cancelled || (e instanceof Error && e.name === 'Cancelled');
}
