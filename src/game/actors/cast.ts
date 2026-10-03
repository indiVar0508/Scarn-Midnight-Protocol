import type { PersonProps } from '../../runek/Person';

/**
 * The cast as runek `Person` looks. Each one reads by silhouette, wardrobe and hair: the
 * costume Michael put his coworker in, over that coworker's own signature look (v1 Character
 * Bible). These are stylized costume designs of fictional characters, never actor likenesses.
 */
export type CastLook = Omit<PersonProps, 'position' | 'rotation' | 'drive' | 'physics' | 'collider'> & {
  /** Rigid extras the game parents to bones: a tie, a gun, sunglasses. */
  tie?: string;
  shades?: boolean;
  gun?: 'pistol' | 'gold';
  /** A sweatband around the head (Cherokee Jack). */
  headband?: string;
};

const suit = (jacket: string, shirt: string, trousers = jacket) =>
  [
    { type: 'shirt', color: shirt, sleeves: 'long', neck: 'collar', length: 0.6 },
    { type: 'trousers', color: trousers, length: 1 },
    { type: 'belt', color: '#1a1410' },
    { type: 'coat', color: jacket, sleeves: 'long', neck: 'v', length: 0.32 },
    { type: 'shoes', color: '#0c0c0c' },
  ] as NonNullable<PersonProps['clothes']>;

export const CAST_LOOKS = {
  /** Michael Scott as Agent Michael Scarn: the tux-cut black suit, skinny tie, the hair. */
  scarn: {
    seed: 11,
    style: 'stylized',
    gender: 'masculine',
    height: 1.76,
    build: 'average',
    skinTone: '#e8c0a0',
    hair: { style: 'swept', color: '#3a281c' },
    face: { brows: { weight: 1.2 }, nose: 'straight', eyes: { color: '#4a3a28' } },
    clothes: suit('#16171d', '#f4f2ec'),
    tie: '#0e0e10',
    gun: 'pistol',
  },
  /** Goldenface's henchmen: black suits, gold ties, ski masks, sunglasses. Committed extras. */
  goon: {
    seed: 21,
    style: 'stylized',
    gender: 'masculine',
    height: 1.8,
    build: 'stocky',
    skinTone: '#151518',
    hair: { style: 'bald', color: '#151518' },
    face: { brows: { color: '#151518' }, eyes: { color: '#151518', size: 0.9 } },
    clothes: suit('#121214', '#1e1e22'),
    tie: '#d4a017',
    shades: true,
    gun: 'pistol',
  },
  /** The cashier who steals Scarn's line, in the Dunder Mifflin warehouse vest. */
  cashier: {
    seed: 31,
    style: 'stylized',
    gender: 'feminine',
    height: 1.64,
    skinTone: '#b07a55',
    hair: { style: 'ponytail', color: '#24160e' },
    clothes: [
      { type: 'shirt', color: '#f2efe6', sleeves: 'short', neck: 'collar' },
      { type: 'trousers', color: '#2f3640' },
      { type: 'vest', color: '#e0662c' },
      { type: 'shoes', color: '#222' },
    ],
  },
  /** Jim as Goldenface: tall, slim, gold face, black suit over a black turtleneck. */
  goldenface: {
    seed: 41,
    style: 'stylized',
    gender: 'masculine',
    height: 1.91,
    build: 'slim',
    skinTone: '#d9aa2e',
    hair: { style: 'swept', color: '#5e4128' },
    clothes: [
      { type: 'sweater', color: '#0d0d0f', sleeves: 'long', neck: 'crew' },
      { type: 'trousers', color: '#0d0d0f' },
      { type: 'coat', color: '#0d0d0f', sleeves: 'long', neck: 'v', length: 0.32 },
      { type: 'shoes', color: '#0a0a0a' },
    ],
    gun: 'gold',
  },
  /** Dwight as Samuel L. Chang: butler tailcoat, white gloves (sort of), glasses, very upright. */
  samuel: {
    seed: 51,
    style: 'stylized',
    gender: 'masculine',
    height: 1.83,
    build: 'average',
    skinTone: '#ecc7a8',
    hair: { style: 'short', color: '#6a4a2c' },
    accessories: ['glasses'],
    clothes: [
      { type: 'shirt', color: '#f6f4ee', sleeves: 'long', neck: 'collar' },
      { type: 'trousers', color: '#121212' },
      { type: 'coat', color: '#121212', sleeves: 'long', neck: 'v', length: 0.55 },
      { type: 'shoes', color: '#0a0a0a' },
    ],
    tie: '#121212',
  },
  /** Darryl as President Jackson: tall, broad, navy suit, red tie, extremely chill. */
  president: {
    seed: 111,
    style: 'stylized',
    gender: 'masculine',
    height: 1.9,
    build: 'stocky',
    skinTone: '#6a4330',
    hair: { style: 'cropped', color: '#1a1410' },
    facialHair: 'moustache',
    clothes: suit('#1f2d4f', '#f4f2ec'),
    tie: '#b3202a',
  },
  /** Creed as Cherokee Jack: long grey hair, headband, faded vintage jersey, mystic energy. */
  jack: {
    seed: 121,
    style: 'stylized',
    gender: 'masculine',
    age: 'elder',
    height: 1.76,
    build: 'average',
    skinTone: '#e2b896',
    hair: { style: 'long', color: '#b9b6ae' },
    facialHair: 'beard',
    face: { brows: { weight: 1.4, color: '#9a968e' }, nose: 'broad' },
    clothes: [
      { type: 'sweater', color: '#a8473b', sleeves: 'long', neck: 'crew' },
      { type: 'jeans', color: '#4b5b74' },
      { type: 'boots', color: '#3b2a1e' },
    ],
    headband: '#e8e2cf',
  },
  // ---- The Dunder Mifflin crew behind the camera (out of costume, between takes) ----
  /** Pam on boom duty: auburn hair, pink cardigan, the receptionist's skirt. */
  pam: {
    seed: 61,
    style: 'stylized',
    gender: 'feminine',
    height: 1.66,
    build: 'slim',
    skinTone: '#efcfb5',
    hair: { style: 'ponytail', color: '#8a4a2a' },
    clothes: [
      { type: 'shirt', color: '#f4efe6', sleeves: 'long', neck: 'collar' },
      { type: 'skirt', color: '#3b3f4a', length: 0.75 },
      { type: 'sweater', color: '#d98ea0', sleeves: 'long', neck: 'v' },
      { type: 'shoes', color: '#3a2a22' },
    ],
  },
  /** Kevin holding the camera, in a blue shirt that has seen chili. */
  kevin: {
    seed: 71,
    style: 'stylized',
    gender: 'masculine',
    height: 1.8,
    build: 'stocky',
    skinTone: '#ebc4a5',
    hair: { style: 'bald', color: '#5a4030' },
    facialHair: 'stubble',
    clothes: [
      { type: 'shirt', color: '#8fb0d6', sleeves: 'long', neck: 'collar' },
      { type: 'trousers', color: '#4a4a52' },
      { type: 'shoes', color: '#2a2018' },
    ],
  },
  /** Stanley, seated, doing the crossword. Glasses, moustache, sweater vest. */
  stanley: {
    seed: 81,
    style: 'stylized',
    gender: 'masculine',
    height: 1.82,
    build: 'stocky',
    skinTone: '#6e4632',
    hair: { style: 'cropped', color: '#2b2b2b' },
    facialHair: 'moustache',
    accessories: ['glasses'],
    clothes: [
      { type: 'shirt', color: '#e9e4d6', sleeves: 'long', neck: 'collar' },
      { type: 'trousers', color: '#3c3a36' },
      { type: 'sweater', color: '#6b5a44', sleeves: 'long', neck: 'v' },
      { type: 'shoes', color: '#1e1814' },
    ],
    pose: 'sit',
  },
  /** Angela, arms very much crossed: blonde bun, cardigan buttoned to the top. */
  angela: {
    seed: 91,
    style: 'stylized',
    gender: 'feminine',
    height: 1.52,
    build: 'slim',
    skinTone: '#f1d2bb',
    hair: { style: 'bun', color: '#d8bc78' },
    clothes: [
      { type: 'shirt', color: '#f6f2ea', sleeves: 'long', neck: 'collar' },
      { type: 'skirt', color: '#4a3b52', length: 0.85 },
      { type: 'sweater', color: '#6e5a86', sleeves: 'long', neck: 'crew' },
      { type: 'shoes', color: '#2a1e1a' },
    ],
  },
  /** Oscar, seated, quietly judging the script. */
  oscar: {
    seed: 101,
    style: 'stylized',
    gender: 'masculine',
    height: 1.72,
    build: 'average',
    skinTone: '#c49270',
    hair: { style: 'short', color: '#1c1410' },
    clothes: [
      { type: 'shirt', color: '#d9e2ea', sleeves: 'long', neck: 'collar' },
      { type: 'trousers', color: '#2e3138' },
      { type: 'sweater', color: '#3a4d6b', sleeves: 'long', neck: 'v' },
      { type: 'shoes', color: '#1a1410' },
    ],
    pose: 'sit',
  },
} satisfies Record<string, CastLook>;

export type CastId = keyof typeof CAST_LOOKS;
