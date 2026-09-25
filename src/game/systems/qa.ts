/**
 * QA switches used by the automated playthrough (window.__TLM__). They are
 * inert unless a tester flips them from the console.
 */
export const qa = {
  /** Minigames resolve themselves with a good score. */
  autoWin: false,
  /** Player can't lose health. */
  god: false,
  /** Combat encounters instantly defeat all enemies. */
  skipFights: false,
};
