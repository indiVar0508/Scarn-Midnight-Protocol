import { ui } from '../../state/ui';

type Ctl = 'move' | 'aim' | 'fire' | 'dodge' | 'pose' | 'interact' | 'action' | 'gadget' | 'mash' | 'shoot' | 'pass' | 'check';

const KBM: Record<Ctl, string> = {
  move: 'WASD / ARROWS',
  aim: 'the MOUSE',
  fire: 'LEFT CLICK (or J)',
  dodge: 'SPACE',
  pose: 'F',
  interact: 'E',
  action: 'SPACE',
  gadget: 'Q',
  mash: 'SPACE',
  shoot: 'LEFT CLICK / J (hold to charge)',
  pass: 'E',
  check: 'SPACE',
};
const PAD: Record<Ctl, string> = {
  move: 'LEFT STICK',
  aim: 'RIGHT STICK',
  fire: 'RT',
  dodge: 'B',
  pose: 'Y',
  interact: 'A',
  action: 'A',
  gadget: 'LB',
  mash: 'A',
  shoot: 'RT (hold to charge)',
  pass: 'A',
  check: 'B',
};
const TOUCH: Record<Ctl, string> = {
  move: 'the STICK',
  aim: 'auto-aim',
  fire: 'FIRE',
  dodge: 'ROLL',
  pose: 'POSE',
  interact: 'USE',
  action: 'A',
  gadget: 'GADGET',
  mash: 'A',
  shoot: 'SHOOT (hold)',
  pass: 'PASS',
  check: 'CHECK',
};

/** Control name for the current input device, for tutorial text. */
export function ctl(c: Ctl): string {
  const m = ui.get().inputMode;
  return (m === 'pad' ? PAD : m === 'touch' ? TOUCH : KBM)[c];
}
