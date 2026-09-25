import type { ChapterScene } from './ChapterScene';
import type { Combat } from './Combat';
import type { Scarn } from '../entities/Scarn';
import { Goon } from '../entities/Goon';
import { Director } from '../Director';
import { save, setFlag } from '../../state/save';
import { qa } from './qa';
import { music } from '../../audio/music';

export interface GoonSpec {
  x: number;
  y: number;
  enterTo?: { x: number; y: number };
  hp?: number;
  skin?: string;
  burst?: number;
  aggression?: number;
}

export interface WaveSpec {
  goons: GoonSpec[];
  delay?: number;
  onStart?: () => void;
}

/** "CUT! TAKE 2" then restart from the checkpoint. */
export function wireRetake(scene: ChapterScene, scarn: Scarn): void {
  scarn.onDown = () => {
    void (async () => {
      try {
        await scene.wait(1100);
      } catch {
        return;
      }
      const key = `takes_${scene.chapter}`;
      const take = ((save.get().flags[key] as number | undefined) ?? 1) + 1;
      setFlag(key, take);
      music.stinger('fail');
      await Director.overlay?.clapper(take);
      Director.restartCheckpoint();
    })();
  };
}

/** Spawn waves of henchmen; resolves when every wave is cleared. */
export async function runEncounter(scene: ChapterScene, scarn: Scarn, combat: Combat, waves: WaveSpec[]): Promise<void> {
  wireRetake(scene, scarn);
  const god = () => {
    if (qa.god) {
      scarn.hp = scarn.maxHp;
      scarn.invuln = 1;
    }
  };
  scene.updaters.add(god);
  for (const w of waves) {
    if (w.delay) await scene.wait(w.delay);
    w.onStart?.();
    const goons = w.goons.map((g) => new Goon(scene, combat, scarn, g.x, g.y, g));
    if (qa.skipFights) {
      await scene.wait(300);
      goons.forEach((g) => g.damage(99, 1, 0));
    }
    await scene.waitUntil(() => goons.every((g) => !g.alive));
  }
  scene.updaters.delete(god);
  combat.clearBullets();
}
