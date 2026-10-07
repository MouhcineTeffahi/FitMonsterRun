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

/** 5×7 caps used for the PROTEIN carton label. */
const LABEL_FONT: Record<string, string[]> = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
};

/** Bright label map so PROTEIN stays readable in run lighting. */
function labelTexture(text: string) {
  const W = 256;
  const H = 96;
  const data = new Uint8Array(W * H * 4);
  const put = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  };
  const fill = (x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) put(x, y, r, g, b);
    }
  };
  fill(0, 0, W, H, 21, 101, 192);
  fill(0, 0, W, 10, 255, 213, 79);
  fill(0, H - 10, W, 10, 255, 213, 79);
  const letters = text.split('');
  const px = 6;
  const gap = 5;
  const glyphW = 5 * px;
  const wordW = letters.length * glyphW + (letters.length - 1) * gap;
  let ox = Math.floor((W - wordW) / 2);
  const oy = Math.floor((H - 7 * px) / 2);
  for (const ch of letters) {
    const rows = LABEL_FONT[ch];
    if (rows) {
      rows.forEach((row, gy) => {
        for (let gx = 0; gx < row.length; gx++) {
          if (row[gx] !== '1') continue;
          fill(ox + gx * px, oy + (6 - gy) * px, px, px, 255, 255, 255);
        }
      });
    }
    ox += glyphW + gap;
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const cartonLabels: Partial<Record<string, THREE.DataTexture>> = {};

function gymCarton(label: string, body: string, band: string, trim: string): THREE.Group {
  const g = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({
    color: body,
    roughness: 0.38,
    emissive: body,
    emissiveIntensity: 0.22,
  });
  const stripe = new THREE.MeshStandardMaterial({
    color: band,
    roughness: 0.32,
    emissive: band,
    emissiveIntensity: 0.28,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: trim,
    roughness: 0.3,
    metalness: 0.35,
    emissive: trim,
    emissiveIntensity: 0.22,
  });
  const ink = new THREE.MeshBasicMaterial({
    map: (cartonLabels[label] ??= labelTexture(label)),
    toneMapped: false,
  });

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number, x = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  add(new THREE.BoxGeometry(0.78, 0.72, 0.5), cream, 0.4);
  add(new THREE.BoxGeometry(0.82, 0.14, 0.54), stripe, 0.83);
  add(new THREE.BoxGeometry(0.7, 0.04, 0.52), gold, 0.91);
  add(new THREE.BoxGeometry(0.8, 0.1, 0.52), gold, 0.08);
  for (const side of [1, -1] as const) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.28), ink);
    face.position.set(0, 0.42, side * 0.26);
    if (side < 0) face.rotation.y = Math.PI;
    g.add(face);
    const flank = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.28), ink);
    flank.position.set(side * 0.4, 0.42, 0);
    flank.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(flank);
  }

  g.scale.setScalar(1.28);
  return g;
}

/** Cream whey carton with a PROTEIN label — gym powder, not a black blob. */
export function proteinBox(): THREE.Group {
  return gymCarton('PROTEIN', '#F7F1E6', '#1565C0', '#F0C94A');
}

export function creatineBox(): THREE.Group {
  return gymCarton('CREA', '#FFF4C4', '#C9A227', '#FFE082');
}

export function preworkBox(): THREE.Group {
  return gymCarton('PRE', '#3A1020', '#FF3D6E', '#FF8AAA');
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

export type BikeRig = { wheels: [THREE.Group, THREE.Group]; crank: THREE.Group };

/** Street bicycle. Built wide enough to read from behind the runner. */
export function streetBike(): THREE.Group {
  const root = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: '#E23B3B', metalness: 0.38, roughness: 0.32 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#D0D6DE', metalness: 0.82, roughness: 0.22 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#1A1A1E', roughness: 0.72 });
  const leather = new THREE.MeshStandardMaterial({ color: '#3A2A1C', roughness: 0.58 });

  const add = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  const makeWheel = (z: number) => {
    const g = new THREE.Group();
    g.position.set(0, 0.4, z);
    add(g, new THREE.TorusGeometry(0.4, 0.07, 8, 18), rubber, 0, 0, 0, 0, Math.PI / 2, 0);
    add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10), chrome, 0, 0, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const sp = add(g, new THREE.BoxGeometry(0.03, 0.72, 0.02), chrome, 0, 0, 0);
      sp.rotation.x = (i / 8) * Math.PI;
    }
    root.add(g);
    return g;
  };

  const rear = makeWheel(0.52);
  const front = makeWheel(-0.58);
  // Twin tubes so the frame has width from the camera. Saddle sits under the
  // rider (z≈0.1); bars are in front (negative Z, down the road).
  for (const x of [-0.05, 0.05]) {
    add(root, new THREE.CylinderGeometry(0.038, 0.038, 0.9, 8), paint, x, 0.72, -0.04, Math.PI / 2.4, 0, 0);
    add(root, new THREE.CylinderGeometry(0.032, 0.032, 0.72, 8), paint, x, 0.92, 0.02, Math.PI / 2, 0, 0);
    add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.62, 8), paint, x, 0.68, 0.28, -0.55, 0, 0);
    add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8), chrome, x, 0.7, -0.32, 0.42, 0, 0);
  }
  add(root, new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), chrome, 0, 0.88, 0.12, 0, 0, 0);
  add(root, new THREE.BoxGeometry(0.24, 0.08, 0.32), leather, 0, 1.04, 0.1);
  add(root, new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), chrome, 0, 1.08, -0.5, 0.18, 0, 0);
  add(root, new THREE.CylinderGeometry(0.032, 0.032, 0.88, 8), chrome, 0, 1.14, -0.54, 0, 0, Math.PI / 2);
  add(root, new THREE.CylinderGeometry(0.045, 0.045, 0.16, 8), rubber, 0.4, 1.14, -0.54, 0, 0, Math.PI / 2);
  add(root, new THREE.CylinderGeometry(0.045, 0.045, 0.16, 8), rubber, -0.4, 1.14, -0.54, 0, 0, Math.PI / 2);

  const crank = new THREE.Group();
  crank.position.set(0, 0.38, 0);
  add(crank, new THREE.BoxGeometry(0.22, 0.05, 0.05), chrome, 0, 0, 0);
  add(crank, new THREE.BoxGeometry(0.05, 0.32, 0.05), chrome, 0.1, 0.12, 0);
  add(crank, new THREE.BoxGeometry(0.05, 0.32, 0.05), chrome, -0.1, -0.12, 0);
  add(crank, new THREE.BoxGeometry(0.12, 0.04, 0.06), leather, 0.12, 0.28, 0);
  add(crank, new THREE.BoxGeometry(0.12, 0.04, 0.06), leather, -0.12, -0.28, 0);
  root.add(crank);

  root.userData.bike = { wheels: [rear, front], crank } satisfies BikeRig;
  return root;
}
