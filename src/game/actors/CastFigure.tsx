import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Shape, SphereGeometry, TorusGeometry } from 'three';
import { Person, type PersonDrive } from '../../runek/Person';
import { CAST_LOOKS, type CastId } from './cast';
import { useFxTier } from '../systems/tier';

/** A necktie blade hanging from the knot (local origin), pointing down. */
function tieShape() {
  const s = new Shape();
  s.moveTo(-0.012, 0);
  s.lineTo(0.012, 0);
  s.lineTo(0.03, -0.15);
  s.lineTo(0, -0.172);
  s.lineTo(-0.03, -0.15);
  s.closePath();
  return s;
}

export const newDrive = (): PersonDrive => ({ speed: 0, aim: 0, aimPitch: 0, pose: 0, recoil: 0, dazed: false });

/**
 * A cast member: runek `Person` (procedural skinned human) dressed from `CAST_LOOKS`, driven
 * by gameplay through `drive`, with the rigid extras Person doesn't model (tie, pistol,
 * sunglasses) parented to its bones once the skeleton exists.
 */
export function CastFigure({
  who,
  drive,
  detail = 'auto',
  style,
  unarmed,
  pose,
}: {
  who: CastId;
  drive?: MutableRefObject<PersonDrive>;
  detail?: 'auto' | 'high' | 'low';
  style?: 'stylized' | 'realistic' | 'anime';
  unarmed?: boolean;
  /** Override the look's pose (e.g. 'sit' in the car). */
  pose?: 'stand' | 'sit' | 'lean' | 'work' | 'wave';
}) {
  const look = CAST_LOOKS[who] as (typeof CAST_LOOKS)[CastId] & { tie?: string; shades?: boolean; gun?: 'pistol' | 'gold'; headband?: string; mask?: string };
  const own = useRef<PersonDrive>(newDrive());
  const d = drive ?? own;
  const { tie, shades, gun, headband, mask, ...person } = look;

  // Attach extras when the bones appear (Person fills them in an effect after its first render).
  const attached = useRef<Group[]>([]);
  useFrame(() => {
    const bones = d.current.bones;
    if (!bones || attached.current.length) return;
    const add = (parent: Group | import('three').Bone, mesh: Mesh, x: number, y: number, z: number) => {
      const g = new Group();
      g.position.set(x, y, z);
      g.add(mesh);
      parent.add(g);
      attached.current.push(g);
    };
    if (tie) {
      // Knot at the collar, then a tapered blade down the jacket's V to the button. Placed from
      // the neck joint (bones are unrotated in bind pose, so its position is chest-local).
      const ny = bones.neck.position.y;
      const silk = new MeshStandardMaterial({ color: tie, roughness: 0.38, metalness: 0.05 });
      const knot = new Mesh(new CylinderGeometry(0.017, 0.012, 0.03, 8), silk);
      knot.scale.set(1, 1, 0.55);
      add(bones.chest, knot, 0, ny - 0.035, 0.098);
      const blade = new Mesh(new ExtrudeGeometry(tieShape(), { depth: 0.004, bevelEnabled: false }), silk);
      blade.castShadow = true;
      const g = new Group();
      g.rotation.x = -0.32;
      g.add(blade);
      add(bones.chest, g as unknown as Mesh, 0, ny - 0.045, 0.1);
      const button = new Mesh(new CylinderGeometry(0.009, 0.009, 0.004, 12), new MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.3 }));
      button.rotation.x = Math.PI / 2;
      add(bones.chest, button, 0, ny - 0.245, 0.13);
    }
    if (gun && !unarmed) {
      const gold = gun === 'gold';
      const mat = new MeshStandardMaterial({ color: gold ? '#e8b923' : '#2a2a2c', metalness: gold ? 0.9 : 0.6, roughness: gold ? 0.25 : 0.4 });
      const body = new Mesh(new BoxGeometry(0.035, 0.2, 0.06), mat);
      body.castShadow = true;
      add(bones['hand.R'], body, 0, -0.11, 0.025);
      const grip = new Mesh(new BoxGeometry(0.03, 0.05, 0.1), mat);
      add(bones['hand.R'], grip, 0, -0.04, -0.01);
    }
    if (headband && d.current.eyes) {
      const [x, y, z] = d.current.eyes;
      const band = new Mesh(new TorusGeometry(0.112, 0.014, 8, 28), new MeshStandardMaterial({ color: headband, roughness: 0.9 }));
      band.rotation.x = Math.PI / 2;
      band.scale.set(1, 1.18, 1);
      add(bones.head, band, x, y + 0.045, z - 0.085);
    }
    if (mask && d.current.eyes) {
      // A knit ski mask: a matte shell over the whole head, nose included, with a mouth slot.
      // Sized from the eyes like the headband (the head's centre sits behind and just above them).
      const [x, y, z] = d.current.eyes;
      const knit = new Mesh(new SphereGeometry(1, 28, 20), new MeshStandardMaterial({ color: mask, roughness: 0.95 }));
      knit.scale.set(0.13, 0.172, 0.152);
      knit.castShadow = true;
      add(bones.head, knit, x, y - 0.008, z - 0.09);
      const mouth = new Mesh(new SphereGeometry(1, 12, 8), new MeshStandardMaterial({ color: '#160f0d', roughness: 0.9 }));
      mouth.scale.set(0.03, 0.011, 0.012);
      add(bones.head, mouth, x, y - 0.095, z + 0.036);
    }
    if (shades && d.current.eyes) {
      const [x, y, z] = d.current.eyes;
      const m = new Mesh(new BoxGeometry(0.15, 0.04, 0.02), new MeshStandardMaterial({ color: '#050506', metalness: 0.7, roughness: 0.1 }));
      add(bones.head, m, x, y, z + (mask ? 0.072 : 0.025)); // over the mask's knit, if there is one
    }
  });
  useEffect(
    () => () => {
      for (const g of attached.current) {
        g.removeFromParent();
        g.traverse((o) => {
          if (o instanceof Mesh) {
            o.geometry.dispose();
            (o.material as MeshStandardMaterial).dispose();
          }
        });
      }
      attached.current = [];
    },
    [],
  );

  // Software rendering (the low tier) can't afford detailed figures: a scene full of them ran at
  // ~1 fps under SwiftShader. It keeps everyone at the coarse build.
  const shown = useFxTier() === 'low' ? 'low' : detail;
  return <Person {...person} pose={pose ?? (person as { pose?: 'stand' }).pose} style={style ?? person.style} physics={false} collider={false} drive={d} detail={shown} lookAt={!drive} />;
}
