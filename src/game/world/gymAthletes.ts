import * as THREE from 'three';

export const SPORTS = ['press', 'squat', 'rope', 'run', 'stretch', 'kick'] as const;
export type Sport = (typeof SPORTS)[number];

const SHIRTS = ['#E8434F', '#2F6BFF', '#FFB02E', '#1EC8A5', '#B46BFF', '#FFFFFF'];
const SKIN = ['#E8A070', '#C47A48', '#F0C090', '#8D5A3B'];

const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const cyl = (r: number, h: number) => new THREE.CylinderGeometry(r, r, h, 8);

type Limb = { pivot: THREE.Group; mesh: THREE.Mesh };

export type GymAthlete = {
  root: THREE.Group;
  sport: Sport;
  zOff: number;
  pose: (t: number) => void;
  setSport: (sport: Sport) => void;
};

function mat(color: string) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
}

function limb(parent: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, y: number, drop: number): Limb {
  const pivot = new THREE.Group();
  pivot.position.y = y;
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.y = drop;
  mesh.castShadow = true;
  pivot.add(mesh);
  parent.add(pivot);
  return { pivot, mesh };
}

/** Sidewalk athlete with swinging limbs. `pose(t)` plays their sport. */
export function makeGymAthlete(seed: number): GymAthlete {
  const shirt = SHIRTS[seed % SHIRTS.length];
  const skin = SKIN[seed % SKIN.length];
  const shorts = seed % 2 ? '#2A2A32' : '#1A1C24';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = new THREE.Mesh(box(0.36, 0.46, 0.22), mat(shirt));
  torso.position.y = 1.05;
  torso.castShadow = true;
  body.add(torso);
  const hips = new THREE.Mesh(box(0.38, 0.26, 0.24), mat(shorts));
  hips.position.y = 0.7;
  hips.castShadow = true;
  body.add(hips);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mat(skin));
  head.position.y = 1.42;
  head.castShadow = true;
  body.add(head);

  const skinM = mat(skin);
  const armL = limb(body, box(0.11, 0.4, 0.11), skinM, 1.22, -0.22);
  const armR = limb(body, box(0.11, 0.4, 0.11), skinM, 1.22, -0.22);
  armL.pivot.position.x = -0.24;
  armR.pivot.position.x = 0.24;

  const pants = mat(shorts);
  const legL = limb(root, box(0.13, 0.48, 0.13), pants, 0.58, -0.24);
  const legR = limb(root, box(0.13, 0.48, 0.13), pants, 0.58, -0.24);
  legL.pivot.position.x = -0.1;
  legR.pivot.position.x = 0.1;

  const shoeM = mat('#F4F6FA');
  const shoe = (leg: Limb, x: number) => {
    const s = new THREE.Mesh(box(0.16, 0.08, 0.24), shoeM);
    s.position.set(x, -0.5, 0.04);
    s.castShadow = true;
    leg.pivot.add(s);
  };
  shoe(legL, 0);
  shoe(legR, 0);

  const weightM = mat('#3B3F58');
  const wL = new THREE.Mesh(cyl(0.08, 0.2), weightM);
  wL.rotation.z = Math.PI / 2;
  wL.position.set(0, -0.44, 0);
  armL.pivot.add(wL);
  const wR = wL.clone();
  armR.pivot.add(wR);

  let sport: Sport = 'press';
  const setSport = (next: Sport) => {
    sport = next;
    wL.visible = next === 'press' || next === 'squat';
    wR.visible = next === 'press' || next === 'squat';
  };
  setSport('press');

  const reset = () => {
    body.position.y = 0;
    body.rotation.set(0, 0, 0);
    armL.pivot.rotation.set(0, 0, 0);
    armR.pivot.rotation.set(0, 0, 0);
    legL.pivot.rotation.set(0, 0, 0);
    legR.pivot.rotation.set(0, 0, 0);
  };

  const pose = (t: number) => {
    reset();
    const p = t * 6 + seed;
    if (sport === 'press') {
      const a = 0.5 + 0.5 * Math.sin(p * 1.4);
      armL.pivot.rotation.x = -0.3 - a * 1.5;
      armR.pivot.rotation.x = -0.3 - a * 1.5;
      body.position.y = a * 0.04;
    } else if (sport === 'squat') {
      const a = 0.5 + 0.5 * Math.sin(p);
      body.position.y = -a * 0.28;
      legL.pivot.rotation.x = a * 0.85;
      legR.pivot.rotation.x = a * 0.85;
      armL.pivot.rotation.x = -0.5 - a * 0.3;
      armR.pivot.rotation.x = -0.5 - a * 0.3;
    } else if (sport === 'rope') {
      const hop = Math.max(0, Math.sin(p * 2.2));
      body.position.y = hop * 0.2;
      armL.pivot.rotation.z = 1.15;
      armR.pivot.rotation.z = -1.15;
      armL.pivot.rotation.x = p * 2.2;
      armR.pivot.rotation.x = p * 2.2;
    } else if (sport === 'run') {
      const s = Math.sin(p * 1.8);
      legL.pivot.rotation.x = s * 0.75;
      legR.pivot.rotation.x = -s * 0.75;
      armL.pivot.rotation.x = -s * 0.7;
      armR.pivot.rotation.x = s * 0.7;
      body.position.y = Math.abs(s) * 0.05;
    } else if (sport === 'stretch') {
      const a = Math.sin(p * 0.45);
      body.rotation.z = a * 0.35;
      armL.pivot.rotation.z = 1.4 + a * 0.2;
      armR.pivot.rotation.z = -0.25;
      armL.pivot.rotation.x = -0.2;
    } else {
      const k = Math.max(0, Math.sin(p * 0.9));
      legR.pivot.rotation.x = k * 1.35;
      armL.pivot.rotation.z = 0.6;
      armR.pivot.rotation.z = -0.4;
      armL.pivot.rotation.x = -k * 0.4;
      body.rotation.z = -k * 0.12;
    }
  };

  return {
    root,
    get sport() {
      return sport;
    },
    zOff: 0,
    pose,
    setSport,
  };
}
