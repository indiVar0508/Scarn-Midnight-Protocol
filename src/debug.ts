import { Director } from './game/Director';
import { qa } from './game/systems/qa';
import { ui, advanceDialogue, skipCard } from './state/ui';
import { save, unlockAll, newGame } from './state/save';
import { settings } from './state/settings';
import { autoSolve, tape } from './state/tape';
import { input } from './game/systems/Input';
import { music } from './audio/music';
import { audio } from './audio/engine';
import { buildChart, SPB } from './game/minigames/chart';

/**
 * Test hooks for the automated playthrough (tools/qa/run.mjs) and for
 * humans poking at the console. Nothing here runs unless called.
 */
export function installDebug(): void {
  const api = {
    Director,
    qa,
    ui,
    save,
    settings,
    tape,
    input,
    /** Rhythm-bot support: the chart, the song clock and the latency the judge applies. */
    rhythm: {
      chart: buildChart,
      spb: SPB,
      songTime: () => music.songTime(),
      latency: () => (audio.ctx?.outputLatency || audio.ctx?.baseLatency || 0) + settings.get().rhythmOffsetMs / 1000,
    },
    start(ch: number, beat: string | null = null) {
      newGame(ch);
      return Director.startChapter(ch, beat);
    },
    state() {
      const s = ui.get();
      const g = Director.game;
      const active = g ? g.scene.getScenes(true).map((x) => x.scene.key) : [];
      return {
        screen: s.screen,
        paused: s.paused,
        dialogue: s.dialogue ? { who: s.dialogue.name, text: s.dialogue.text, choices: s.dialogue.choices } : null,
        card: s.card?.title ?? null,
        objective: s.objective,
        hint: s.hint,
        hud: s.hud,
        chapter: save.get().chapter,
        beat: save.get().beat,
        scenes: active,
        tape: tape.get().open,
        busy: !!(g?.scene.getScenes(true).find((x) => x.scene.key.startsWith('Ch')) as unknown as { busy?: boolean } | undefined)?.busy,
        fps: g ? Math.round(g.loop.actualFps) : 0,
      };
    },
    advance(choice = 0) {
      advanceDialogue(choice);
    },
    skipCard,
    solveTape: autoSolve,
    unlockAll,
    scene() {
      const g = Director.game;
      return g?.scene.getScenes(true).find((x) => x.scene.key.startsWith('Ch')) as unknown as {
        player: { x: number; y: number; place: (x: number, y: number) => void } | null;
        actors: { team: string; alive: boolean; x: number; y: number }[];
      } | undefined;
    },
    player() {
      const p = api.scene()?.player;
      return p ? { x: Math.round(p.x), y: Math.round(p.y) } : null;
    },
    teleport(x: number, y: number) {
      api.scene()?.player?.place(x, y);
    },
    enemies() {
      return (api.scene()?.actors ?? []).filter((a) => a.team === 'enemy' && a.alive).map((a) => ({ x: Math.round(a.x), y: Math.round(a.y) }));
    },
    press(action: Parameters<typeof input.setVirtual>[0], ms = 80) {
      input.setVirtual(action, true);
      window.setTimeout(() => input.setVirtual(action, false), ms);
    },
  };
  (window as unknown as { __TLM__: typeof api }).__TLM__ = api;
}
