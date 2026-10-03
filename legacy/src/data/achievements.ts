export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  hidden?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'midnight', title: 'THREAT LEVEL: MIDNIGHT', desc: 'Finish the movie.' },
  { id: 'intentional', title: 'TOTALLY INTENTIONAL', desc: 'Get knocked down three times. It was choreography.' },
  { id: 'disguise', title: 'MASTER OF DISGUISE', desc: 'Get past the coach in full disguise.' },
  { id: 'hockey', title: 'HUMAN HOCKEY MACHINE', desc: 'Score 3 goals at the All-Star Game.' },
  { id: 'confidence', title: 'CONFIDENCE RESTORED', desc: 'Do the Scarn.' },
  { id: 'worlds_best', title: "WORLD'S BEST SECRET AGENT", desc: 'Earn an S+++ Scarn Rating.' },
  { id: 'best_of_three', title: 'BEST FOUR OUT OF SEVEN', desc: 'Lose the coin flip. Flip again anyway. It\'s in the Constitution.' },
  { id: 'poser', title: 'DUNDIE-WORTHY', desc: 'Strike 15 dramatic poses.' },
  { id: 'beets', title: 'BEARS. BEETS. BATTLESTAR.', desc: 'Find all 5 hidden beets.', hidden: true },
  { id: 'twss', title: "THAT'S WHAT SHE SAID", desc: 'Find the one place Scarn could not resist.', hidden: true },
  { id: 'ghost', title: 'HE WAS ALWAYS WITH US', desc: 'Receive the wisdom of Cherokee Jack. Twice.' },
  { id: 'hostage3', title: 'INTEGRAL TO THE STORY', desc: 'Sit through the most expensive shot in the movie. All four angles.', hidden: true },
];
