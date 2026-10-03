// Scene list and per-scene data, kept free of three/r3f imports so the title screen can
// read it without pulling the 3D chunk into the initial load.

export interface SceneNote {
  id: string;
  label: string;
}

export interface SceneInfo {
  id: string;
  /** Scene number in the movie. */
  num: number;
  title: string;
  /** One line for the title screen and the "next up" card. */
  teaser: string;
  notes: readonly SceneNote[];
  /** Par time for the review card, seconds. */
  par: number;
  music: string;
  /** What PRINT IT plays before the end card. */
  ending: 'titleSlam' | 'missionCard' | 'none';
  /** Combat scene: shows COOL, goons and the crosshair. */
  combat: boolean;
}

export const SCENES: SceneInfo[] = [
  {
    id: 'ch01-aisle-five',
    num: 1,
    title: 'Cleanup on Aisle Five',
    teaser: 'An ordinary grocery run. Nothing is ordinary for Michael Scarn.',
    notes: [
      { id: 'pyramid', label: 'Knock over the FOOD pyramid' },
      { id: 'setpiece', label: 'Flatten a goon with a set piece' },
      { id: 'pose-combo', label: 'Pose over two fresh goons' },
    ],
    par: 75,
    music: 'action',
    ending: 'titleSlam',
    combat: true,
  },
  {
    id: 'ch02-one-last-mission',
    num: 2,
    title: 'One Last Mission',
    teaser: 'Scarn is retired. Samuel wakes him. The President needs to see him.',
    notes: [
      { id: 'manor-tour', label: 'Inspect everything in Scarn Manor' },
      { id: 'beet', label: "Find Samuel's bathtub beet" },
      { id: 'rebel', label: 'Sit in the chair backwards. Like a cool teacher.' },
    ],
    par: 150,
    music: 'manor',
    ending: 'missionCard',
    combat: false,
  },
  {
    id: 'ch03-cherokee-jack',
    num: 3,
    title: 'Cherokee Jack',
    teaser: 'Three days to learn hockey from the only man who ever understood the puck.',
    notes: [
      { id: 'spotless', label: 'Mop the ice spotless' },
      { id: 'snocker', label: 'Every target, and not one shot at Jack' },
      { id: 'ninjat', label: 'Dodge every single throw' },
    ],
    par: 240,
    music: 'montage',
    ending: 'none',
    combat: false,
  },
];

export const sceneIndex = (id: string) => SCENES.findIndex((s) => s.id === id);

/** Next up after the last playable scene (shown on its end card). */
export const COMING_NEXT = { num: 4, title: 'The Tryout', teaser: 'One amateur makes the All-Star Game every year. It will be Scarn.' };
