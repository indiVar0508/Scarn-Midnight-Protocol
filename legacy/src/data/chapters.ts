export interface ChapterInfo {
  id: number;
  key: string; // Phaser scene key
  title: string;
  mission: string;
  blurb: string;
  music: string;
}

export const CHAPTERS: ChapterInfo[] = [
  {
    id: 1,
    key: 'Ch01',
    title: 'Cleanup on Aisle Five',
    mission: 'MISSION: BUY HAIR GEL. SURVIVE.',
    blurb: 'An ordinary grocery run. Nothing is ordinary for Michael Scarn.',
    music: 'action',
  },
  {
    id: 2,
    key: 'Ch02',
    title: 'One Last Mission',
    mission: 'MISSION: SAVE THE NHL ALL-STAR GAME',
    blurb: 'Scarn is retired. The President of the United States is on the laptop.',
    music: 'manor',
  },
  {
    id: 3,
    key: 'Ch03',
    title: 'Cherokee Jack',
    mission: 'MISSION: BECOME GOOD AT HOCKEY',
    blurb: 'Three days to learn hockey from the only man who ever understood the puck.',
    music: 'montage',
  },
  {
    id: 4,
    key: 'Ch04',
    title: 'The Tryout',
    mission: 'MISSION: QUALIFY. BY ANY (NICE) MEANS.',
    blurb: 'One amateur makes the All-Star Game every year. It will be Scarn.',
    music: 'tryout',
  },
  {
    id: 5,
    key: 'Ch05',
    title: 'The Funky Cat',
    mission: 'MISSION: FIND JASMINE WINDSONG',
    blurb: 'The hippest jazz club in town. The truth is in there. Possibly backwards.',
    music: 'jazz',
  },
  {
    id: 6,
    key: 'Ch06',
    title: 'Under the Stadium',
    mission: 'MISSION: SAVE THE HOSTAGES',
    blurb: 'Tunnels, guards, cameras, and a man with a golden face.',
    music: 'stealth',
  },
  {
    id: 7,
    key: 'Ch07',
    title: 'The Hospital',
    mission: 'MISSION: SIT UP',
    blurb: 'Every medical indicator says stay in bed. Scarn does not read medical indicators.',
    music: 'hospital',
  },
  {
    id: 8,
    key: 'Ch08',
    title: 'The Betrayal',
    mission: 'MISSION: WARN THE PRESIDENT',
    blurb: 'The Oval Office. Or a conference room with a flag in it.',
    music: 'suspense',
  },
  {
    id: 9,
    key: 'Ch09',
    title: 'Do the Scarn',
    mission: 'MISSION: DO THE SCARN',
    blurb: "Billy's bar. One jukebox. One song. One chance to remember who you are.",
    music: 'scarn',
  },
  {
    id: 10,
    key: 'Ch10',
    title: 'NHL All-Star Game',
    mission: 'MISSION: SAVE THE NHL ALL-STAR GAME',
    blurb: 'The bomb is in the puck. The puck is in play. Scarn is on defense. And offense.',
    music: 'arena',
  },
  {
    id: 11,
    key: 'Ch11',
    title: 'Scarn Manor',
    mission: 'MISSION: RELAX (DENIED)',
    blurb: 'Home again. For now.',
    music: 'manor',
  },
];

export function chapterById(id: number): ChapterInfo {
  return CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, id - 1))];
}
