import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, TorusGeometry } from 'three';
import { Person, type PersonDrive } from '../../runek/Person';
import { CAST_LOOKS, type CastId } from './cast';

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
  const look = CAST_LOOKS[who] as (typeof CAST_LOOKS)[CastId] & { tie?: string; shades?: boolean; gun?: 'pistol' | 'gold'; headband?: string };
  const own = useRef<PersonDrive>(newDrive());
  const d = drive ?? own;
  const { tie, shades, gun, headband, ...person } = look;

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
      const m = new Mesh(new BoxGeometry(0.045, 0.24, 0.012), new MeshStandardMaterial({ color: tie, roughness: 0.5 }));
      add(bones.chest, m, 0, 0.0, 0.118);
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
    if (shades && d.current.eyes) {
      const [x, y, z] = d.current.eyes;
      const m = new Mesh(new BoxGeometry(0.15, 0.04, 0.02), new MeshStandardMaterial({ color: '#050506', metalness: 0.7, roughness: 0.1 }));
      add(bones.head, m, x, y, z + 0.025);
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

  return <Person {...person} pose={pose ?? (person as { pose?: 'stand' }).pose} style={style ?? person.style} physics={false} collider={false} drive={d} detail={detail} lookAt={!drive} />;
}
