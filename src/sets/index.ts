import { parseWorld, type WorldData } from '@runek/core';
import aisleFive from './aisle-five.world.json?raw';
import scarnManor from './scarn-manor.world.json?raw';
import ovalOffice from './oval-office.world.json?raw';
import drive from './drive.world.json?raw';
import lake from './lake.world.json?raw';

/** The sets, validated by runek's `parseWorld` (version, node list, meta). */
export const SETS = {
  aisleFive: parseWorld(aisleFive),
  scarnManor: parseWorld(scarnManor),
  ovalOffice: parseWorld(ovalOffice),
  drive: parseWorld(drive),
  lake: parseWorld(lake),
} satisfies Record<string, WorldData>;
