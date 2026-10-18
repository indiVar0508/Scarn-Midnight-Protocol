import type { ComponentRegistry, Vec3 } from '@runek/core';
import { Wall } from '../runek/Wall';
import { Door } from '../runek/Door';
import { Counter } from '../runek/Counter';
import { Crate } from '../runek/Crate';
import { Chair } from '../runek/Chair';
import { Table } from '../runek/Table';
import { Rug } from '../runek/Rug';
import { Lamp } from '../runek/Lamp';
import { Flag } from '../runek/Flag';
import { Desk } from '../runek/Desk';
import { Monitor } from '../runek/Monitor';
import { OfficeChair } from '../runek/OfficeChair';
import { CoffeeMachine } from '../runek/CoffeeMachine';
import { Whiteboard } from '../runek/Whiteboard';
import { Plant } from '../runek/Plant';
import { Clock } from '../runek/Clock';
import { SetFloor } from '../tlm/SetFloor';
import { Poster } from '../tlm/Poster';
import { Barrier, Disc, Hanging, Mug, Slab } from '../tlm/SetDressing';
import { Baler, BoomMic, CameraTripod, CubicleWall, DirectorChair, Forklift, OfficeDesk } from '../tlm/OfficeProps';
import { Armchair, BeetTub, Couch, Trophy, TvFireplace } from '../tlm/HomeProps';
import { Backdrop, CardboardCar, DeskFan, Roomba, Van } from '../tlm/LakeProps';
import { Bollard, DropCeiling, DustMotes, EndCap, ExitSign, FluorescentRow, FreezerCase, LightShafts, PalletRack, Rafters, Register, RollDoor, ShoppingCart, WallSkin } from '../tlm/WarehouseProps';
import { CastFigure } from '../game/actors/CastFigure';
import type { CastId } from '../game/actors/cast';

/** A cast member standing (or sitting) on a mark: CastFigure has no transform of its own. */
export function Cast({ position, rotation, ...look }: { position?: Vec3; rotation?: Vec3; who: CastId; pose?: 'stand' | 'sit' | 'lean' | 'work' | 'wave'; unarmed?: boolean }) {
  return (
    <group position={position} rotation={rotation}>
      <CastFigure {...look} />
    </group>
  );
}
Cast.groundSitting = true;

/**
 * Every component a set file (`src/sets/*.world.json`) may place, by runek node `type`. Static
 * `surface`/`groundSitting` on the components feed runek's ground index and `checkWorld`.
 */
export const SET_REGISTRY: ComponentRegistry = {
  // runek
  Wall,
  Door,
  Counter,
  Crate,
  Chair,
  Table,
  Rug,
  Lamp,
  Flag,
  Desk,
  Monitor,
  OfficeChair,
  CoffeeMachine,
  Whiteboard,
  Plant,
  Clock,
  // stage and dressing
  SetFloor,
  Poster,
  Hanging,
  Mug,
  Slab,
  Disc,
  Barrier,
  // the warehouse building, the shop, the air
  Rafters,
  FluorescentRow,
  WallSkin,
  PalletRack,
  RollDoor,
  Bollard,
  ExitSign,
  ShoppingCart,
  EndCap,
  FreezerCase,
  Register,
  DropCeiling,
  DustMotes,
  LightShafts,
  // Dunder Mifflin
  Forklift,
  Baler,
  OfficeDesk,
  DirectorChair,
  CameraTripod,
  BoomMic,
  CubicleWall,
  // Scarn Manor
  Couch,
  Armchair,
  TvFireplace,
  Trophy,
  BeetTub,
  // the lake
  Backdrop,
  Van,
  DeskFan,
  Roomba,
  CardboardCar,
  // people
  Cast,
};
