/** Per-run statistics shown on the end screen. */
export interface RunStats {
  startedAt: number;
  playMs: number;
  shotsFired: number;
  shotsHit: number;
  enemiesDefeated: number;
  dramaticPoses: number;
  goals: number;
  checks: number;
  steals: number;
  trainingScore: number; // 0..100 average
  danceAccuracy: number; // 0..100
  danceMaxCombo: number;
  deaths: number;
  coinFlips: number;
  beetsFound: number;
}

export function freshStats(): RunStats {
  return {
    startedAt: Date.now(),
    playMs: 0,
    shotsFired: 0,
    shotsHit: 0,
    enemiesDefeated: 0,
    dramaticPoses: 0,
    goals: 0,
    checks: 0,
    steals: 0,
    trainingScore: 0,
    danceAccuracy: 0,
    danceMaxCombo: 0,
    deaths: 0,
    coinFlips: 0,
    beetsFound: 0,
  };
}

export function accuracy(s: RunStats): number {
  return s.shotsFired === 0 ? 100 : Math.round((s.shotsHit / s.shotsFired) * 100);
}

export interface Rating {
  grade: string;
  title: string;
  comment: string;
}

/**
 * Michael designed the rating system. Nobody receives less than an A.
 * Deterministic: the same stats always produce the same rating.
 */
export function scarnRating(s: RunStats): Rating {
  const acc = accuracy(s);
  const score =
    acc * 0.25 +
    s.danceAccuracy * 0.25 +
    s.trainingScore * 0.2 +
    Math.min(100, s.goals * 20 + s.checks * 5 + s.steals * 5) * 0.15 +
    Math.min(100, s.enemiesDefeated * 3) * 0.1 +
    Math.min(100, s.dramaticPoses * 10) * 0.05;

  if (score >= 85)
    return {
      grade: 'S+++',
      title: "WORLD'S BEST SECRET AGENT",
      comment: 'Flawless. Michael has already had the mug printed.',
    };
  if (score >= 70)
    return {
      grade: 'S',
      title: 'THREAT LEVEL: MIDNIGHT',
      comment: 'Exceptional. The President (the other one) would be proud.',
    };
  if (score >= 55)
    return {
      grade: 'A++',
      title: 'HUMAN HOCKEY MACHINE',
      comment: 'Better than every agent in the business, including the ones who exist.',
    };
  if (score >= 40)
    return {
      grade: 'A+',
      title: 'MILD-MANNERED LEGEND',
      comment: 'A+ on a curve Michael invented this morning. It is a very good curve.',
    };
  return {
    grade: 'A',
    title: 'TOTALLY INTENTIONAL',
    comment: 'Every miss was a feint. Every fall was choreography. Michael says so.',
  };
}

export function confidenceLevel(s: RunStats): string {
  if (s.dramaticPoses >= 20) return 'BEYOND MIDNIGHT';
  if (s.dramaticPoses >= 8) return 'MIDNIGHT';
  if (s.dramaticPoses >= 3) return '11:59 PM';
  return 'MIDNIGHT (ROUNDED UP)';
}

export function formatTime(ms: number): string {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
