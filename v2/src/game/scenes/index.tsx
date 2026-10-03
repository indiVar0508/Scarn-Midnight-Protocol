import type { ReactElement } from 'react';
import type { WorldPalette } from '@runek/core';
import { AisleFive } from './AisleFive';
import { OneLastMission } from './OneLastMission';
import { CherokeeJack } from './CherokeeJack';
import { WAREHOUSE } from '../Stage';

/** The 3D side of each scene in `registry.data.ts`. */
export const SCENE_VIEWS: Record<string, { view: () => ReactElement; palette?: Partial<WorldPalette> }> = {
  'ch01-aisle-five': { view: () => <AisleFive />, palette: WAREHOUSE },
  'ch02-one-last-mission': { view: () => <OneLastMission /> },
  'ch03-cherokee-jack': { view: () => <CherokeeJack /> },
};
