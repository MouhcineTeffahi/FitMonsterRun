import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { dotTexture } from '../world/kit';

/** Procedural gold matcap: warm body, hot specular and a bright rim. */
function goldMatcap(size = 64) {
  const data = new Uint8Array(size * size * 4);
  const L = new THREE.Vector3(-0.45, 0.6, 0.66).normalize();
  const H = L.clone().add(new THREE.Vector3(0, 0, 1)).normalize();
  const n = new THREE.Vector3();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / (size - 1)) * 2 - 1;
      const ny = (y / (size - 1)) * 2 - 1;
      const r2 = Math.min(1, nx * nx + ny * ny);
      n.set(nx, ny, Math.sqrt(1 - r2));
      const diff = 0.32 + 0.68 * Math.max(0, n.dot(L));
      const spec = Math.max(0, n.dot(H)) ** 48;
      const rim = (1 - n.z) ** 2.2 * 0.55;
      const r = Math.min(1, 1.0 * diff + spec * 1.2 + rim * 1.0);
      const g = Math.min(1, 0.74 * diff + spec * 1.1 + rim * 0.85);
      const b = Math.min(1, 0.12 * diff + spec * 0.9 + rim * 0.4);
      data.set([r * 255, g * 255, b * 255, 255].map(Math.round), (y * size + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Gold dumbbell lying on its side, spun in place as the run's collectible. */
export function coinGeometry() {
  const bar = new THREE.CylinderGeometry(0.055, 0.055, 0.62, 10);
  const plate = new THREE.CylinderGeometry(0.24, 0.24, 0.07, 18);
  const collar = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12);
  const spin = (geo: THREE.BufferGeometry, x: number) => {
    geo.rotateZ(Math.PI / 2);
    geo.translate(x, 0, 0);
    return geo.toNonIndexed();
  };
  const merged = mergeGeometries(
    [
      spin(bar, 0),
      spin(plate.clone(), -0.32),
      spin(plate.clone(), 0.32),
      spin(collar.clone(), -0.22),
      spin(collar, 0.22),
    ],
    false,
  )!;
  return merged;
}

export function coinMaterial() {
  return new THREE.MeshMatcapMaterial({ matcap: goldMatcap() });
}

let sharedDot: THREE.DataTexture | null = null;
export function glowTexture() {
  sharedDot ??= dotTexture(32);
  return sharedDot;
}

/** Soft additive halo so pickups read from far away. */
export function halo(color: string, size: number, opacity = 0.75) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  s.scale.setScalar(size);
  return s;
}

/** Wide whey tub: black jar, gold rim, red band — gym powder, not a bottle. */
export function proteinShaker(): THREE.Group {
  const g = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: '#14161C', roughness: 0.45 });
  const gold = new THREE.MeshStandardMaterial({
    color: '#D4A017',
    roughness: 0.28,
    metalness: 0.55,
    emissive: '#6A4A00',
    emissiveIntensity: 0.2,
  });
  const cream = new THREE.MeshStandardMaterial({ color: '#F2EDE4', roughness: 0.4 });
  const red = new THREE.MeshStandardMaterial({
    color: '#C62828',
    roughness: 0.4,
    emissive: '#5A1010',
    emissiveIntensity: 0.15,
  });

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.castShadow = true;
    g.add(m);
    return m;
  };

  // Wide squat tub body.
  add(new THREE.CylinderGeometry(0.32, 0.3, 0.55, 28), black, 0.28);
  // Gold band under the lid.
  add(new THREE.CylinderGeometry(0.325, 0.325, 0.08, 28), gold, 0.58);
  // Red nutrition band near the bottom.
  add(new THREE.CylinderGeometry(0.322, 0.305, 0.12, 28), red, 0.14);
  // Cream title block on the front.
  const title = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.04), cream);
  title.position.set(0, 0.36, 0.3);
  title.castShadow = true;
  g.add(title);
  // Small gold logo mark above the title.
  const logo = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.03), gold);
  logo.position.set(-0.1, 0.48, 0.31);
  g.add(logo);
  // Flat screw-top lid.
  add(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 28), black, 0.68);
  add(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 28), black, 0.74);

  g.scale.setScalar(1.35);
  return g;
}

/** Water bottle (no CC0 model in the kit): clear blue body, white cap and label. */
export function waterBottle(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.62, 16),
    new THREE.MeshStandardMaterial({ color: '#5EC8FF', roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.85, emissive: '#1C7FD0', emissiveIntensity: 0.35 }),
  );
  const shoulder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.2, 0.16, 16),
    body.material,
  );
  shoulder.position.y = 0.39;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 12), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.4 }));
  cap.position.y = 0.52;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.2, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6, emissive: '#FFFFFF', emissiveIntensity: 0.15 }));
  label.position.y = -0.02;
  g.add(body, shoulder, cap, label);
  g.scale.setScalar(1.2);
  return g;
}

/** Keeps food textures crisp: no soft mip blur, and a little anisotropy. */
export function sharpenFood(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const src of mats) {
      const mat = src as THREE.MeshStandardMaterial;
      if (!mat) continue;
      for (const key of ['map', 'emissiveMap', 'normalMap'] as const) {
        const tex = mat[key];
        if (!tex) continue;
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
      }
    }
  });
}

/** A light lift so food reads in fog, without the bloom smear of a strong glow. */
export function makeGlowy(root: THREE.Object3D, amount: number) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.material as THREE.MeshStandardMaterial;
    const mat = src.clone();
    if (mat.color) {
      mat.emissive = mat.color.clone();
      mat.emissiveIntensity = amount;
    }
    mat.roughness = Math.min(mat.roughness ?? 0.6, 0.45);
    mesh.material = mat;
  });
}

const SKIN = new THREE.MeshStandardMaterial({ color: '#F6C9A4', roughness: 0.48 });
const HAIR = new THREE.MeshStandardMaterial({ color: '#2A211C', roughness: 0.6 });
const PANTS = new THREE.MeshStandardMaterial({ color: '#2C3548', roughness: 0.55 });
const SOLE = new THREE.MeshStandardMaterial({ color: '#F7F7F7', roughness: 0.4 });
const EYE_WHITE = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.25 });
const PUPIL = new THREE.MeshStandardMaterial({ color: '#1A1A1A', roughness: 0.3 });
const LIP = new THREE.MeshStandardMaterial({ color: '#C46B64', roughness: 0.45 });
const CUP = new THREE.MeshStandardMaterial({ color: '#F4F1EA', roughness: 0.4 });
const STRAW = new THREE.MeshStandardMaterial({ color: '#FF4D6A', roughness: 0.35 });

const GEO = {
  head: new THREE.SphereGeometry(0.22, 18, 14),
  hair: new THREE.SphereGeometry(0.2, 16, 12),
  ear: new THREE.SphereGeometry(0.045, 8, 6),
  eye: new THREE.SphereGeometry(0.045, 10, 8),
  pupil: new THREE.SphereGeometry(0.022, 8, 6),
  brow: new THREE.BoxGeometry(0.07, 0.018, 0.02),
  smile: new THREE.TorusGeometry(0.045, 0.012, 6, 10, Math.PI),
  torso: new THREE.CapsuleGeometry(0.28, 0.34, 6, 12),
  belly: new THREE.SphereGeometry(0.2, 12, 10),
  pocket: new THREE.BoxGeometry(0.22, 0.1, 0.04),
  sleeve: new THREE.CapsuleGeometry(0.07, 0.22, 4, 8),
  hand: new THREE.SphereGeometry(0.07, 10, 8),
  thigh: new THREE.CapsuleGeometry(0.09, 0.16, 4, 8),
  shoe: new THREE.BoxGeometry(0.16, 0.08, 0.28),
  sole: new THREE.BoxGeometry(0.17, 0.03, 0.3),
  stripe: new THREE.BoxGeometry(0.04, 0.02, 0.22),
  cup: new THREE.CylinderGeometry(0.07, 0.055, 0.16, 10),
  lid: new THREE.CylinderGeometry(0.075, 0.075, 0.03, 10),
  straw: new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6),
};

export type WalkRig = {
  body: THREE.Group;
  legs?: [THREE.Group, THREE.Group];
  arms?: [THREE.Group, THREE.Group];
};

/**
 * Street pedestrian in a hoodie and sneakers. Legs and arms are pivots so the
 * pool can cycle a walk. Contact is a hand slap or a foot kick.
 */
export function slackerFigure(shirt = '#E23B3B'): THREE.Group {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.42 });
  const trim = cloth.clone();
  trim.color.multiplyScalar(0.72);
  const part = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
    sx = 1,
    sy = 1,
    sz = 1,
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  const body = new THREE.Group();
  body.rotation.x = 0.1;
  g.add(body);

  const torso = part(body, GEO.torso, cloth, 0, 0.98, 0.04);
  torso.scale.set(1.55, 1.08, 1.35);
  const belly = part(body, GEO.belly, trim, 0, 0.82, 0.34);
  belly.scale.set(1.7, 1.15, 1.25);
  part(body, GEO.pocket, trim, 0, 0.74, 0.48);
  part(body, GEO.head, SKIN, 0, 1.58, 0.08, 0, 0, 0, 1.15, 1.05, 1);
  const hair = part(body, GEO.hair, HAIR, 0, 1.72, 0);
  hair.scale.set(1.15, 0.62, 0.95);
  part(body, GEO.ear, SKIN, -0.24, 1.56, 0.06);
  part(body, GEO.ear, SKIN, 0.24, 1.56, 0.06);
  part(body, GEO.eye, EYE_WHITE, -0.08, 1.6, 0.28);
  part(body, GEO.eye, EYE_WHITE, 0.08, 1.6, 0.28);
  part(body, GEO.pupil, PUPIL, -0.08, 1.595, 0.31);
  part(body, GEO.pupil, PUPIL, 0.08, 1.595, 0.31);
  part(body, GEO.brow, HAIR, -0.08, 1.66, 0.26, 0, 0, 0.3);
  part(body, GEO.brow, HAIR, 0.08, 1.66, 0.26, 0, 0, -0.3);
  part(body, GEO.smile, LIP, 0, 1.48, 0.28, 0, 0, Math.PI);
  part(body, GEO.belly, SKIN, 0, 1.4, 0.22, 0, 0, 0, 0.7, 0.35, 0.55);

  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.52, 1.22, 0.06);
    part(pivot, GEO.sleeve, cloth, 0, -0.18, 0, 0, 0, 0, 1.35, 1, 1.2);
    part(pivot, GEO.hand, SKIN, 0, -0.38, 0.02, 0, 0, 0, 1.2, 1, 1.15);
    body.add(pivot);
    return pivot;
  }) as [THREE.Group, THREE.Group];

  part(arms[1], GEO.cup, CUP, 0.02, -0.48, 0.08);
  part(arms[1], GEO.lid, SOLE, 0.02, -0.39, 0.08);
  part(arms[1], GEO.straw, STRAW, 0.04, -0.3, 0.1, 0, 0, 0.4);

  const legs = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.22, 0.58, 0.04);
    part(pivot, GEO.thigh, PANTS, 0, -0.16, 0, 0, 0, 0, 1.45, 1, 1.25);
    part(pivot, GEO.shoe, cloth, 0, -0.34, 0.06);
    part(pivot, GEO.sole, SOLE, 0, -0.39, 0.07);
    part(pivot, GEO.stripe, SOLE, 0, -0.33, 0.16);
    g.add(pivot);
    return pivot;
  }) as [THREE.Group, THREE.Group];

  g.userData.walk = { body, legs, arms } satisfies WalkRig;
  return g;
}
