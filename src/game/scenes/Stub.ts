import { ChapterScene, type Beat } from '../systems/ChapterScene';

/** Temporary placeholder used while chapters are being built. */
export function makeStub(n: number) {
  return class extends ChapterScene {
    readonly chapter = n;
    constructor() {
      super(`Ch${String(n).padStart(2, '0')}`);
    }
    beats(): Beat[] {
      return [{ id: 'stub', run: () => this.wait(500) }];
    }
  };
}
