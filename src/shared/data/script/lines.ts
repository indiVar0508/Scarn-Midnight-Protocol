import type { SpeakerId } from '../cast.ts';

export type LineStyle = 'normal' | 'radio' | 'narrator' | 'ghost' | 'tv' | 'thought';

export interface Line {
  id: string;
  who: SpeakerId;
  text: string;
  style?: LineStyle;
  /** Text read by the TTS if it should differ (pronunciation). */
  speak?: string;
  /** Do not voice this line. */
  silent?: boolean;
}

export type LineSpec = [SpeakerId, string] | [SpeakerId, string, Partial<Omit<Line, 'id' | 'who' | 'text'>>];

/** Build a keyed line table. Ids become `${prefix}_${key}` (voice file names). */
export function lines<K extends string>(prefix: string, table: Record<K, LineSpec>): Record<K, Line> {
  const out = {} as Record<K, Line>;
  for (const key of Object.keys(table) as K[]) {
    const [who, text, extra] = table[key];
    out[key] = { id: `${prefix}_${key}`, who, text, ...(extra ?? {}) };
  }
  return out;
}

/** A choice: player-facing label plus the line Scarn says when picked. */
export interface Choice {
  label: string;
  line: Line;
}
