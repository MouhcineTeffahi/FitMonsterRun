import * as THREE from 'three';

import { mergeParts, type Part } from './kit';

/** Low-poly street props, each merged into one vertex-coloured geometry. */

const cyl = (rt: number, rb: number, h: number, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const ico = (r: number, d = 0) => new THREE.IcosahedronGeometry(r, d);
const LAMP_GLOW: [number, number, number] = [3.2, 2.8, 1.9];

export function treeGeometry() {
  return mergeParts([
    { geo: cyl(0.14, 0.2, 1.8, 7), color: '#8D5A3B', at: { y: 0.9 } },
    { geo: ico(1.05, 1), color: '#4CC45A', at: { y: 2.35 }, tint: 1 },
    { geo: ico(0.7, 1), color: '#6CD86A', at: { x: 0.45, y: 2.9, z: 0.2 }, tint: 1 },
    { geo: ico(0.6, 1), color: '#3DB04F', at: { x: -0.4, y: 2.0, z: -0.3 }, tint: 1 },
  ]);
}

export function palmGeometry() {
  const parts: Part[] = [];
  // Gently curved trunk from stacked, offset segments.
  for (let i = 0; i < 6; i++) {
    const y = 0.35 + i * 0.68;
    parts.push({
      geo: cyl(0.13 - i * 0.008, 0.16 - i * 0.008, 0.72, 7),
      color: i % 2 ? '#C79A5B' : '#B3864A',
      at: { x: i * i * 0.012, y, rz: -i * 0.035 },
    });
  }
  const top = { x: 0.3, y: 4.25 };
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    parts.push({
      geo: box(0.36, 0.05, 1.9),
      color: k % 2 ? '#35B85A' : '#2A9E4C',
      at: {
        x: top.x + Math.sin(a) * 0.8,
        y: top.y - 0.3,
        z: Math.cos(a) * 0.8,
        ry: a,
        rx: 0.55,
      },
      tint: 1,
    });
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    parts.push({ geo: ico(0.13), color: '#6B4A2B', at: { x: top.x + Math.sin(a) * 0.16, y: top.y - 0.15, z: Math.cos(a) * 0.16 } });
  }
  return mergeParts(parts);
}

/** Street lamp; arm points toward -X (flip with a negative X scale on the right side). */
export function lampGeometry() {
  return mergeParts([
    { geo: cyl(0.07, 0.1, 4.6, 6), color: '#3B3F58', at: { y: 2.3 } },
    { geo: box(1.1, 0.09, 0.12), color: '#3B3F58', at: { x: -0.5, y: 4.55 } },
    { geo: box(0.5, 0.16, 0.32), color: '#3B3F58', at: { x: -0.95, y: 4.5 } },
    { geo: box(0.42, 0.06, 0.26), color: LAMP_GLOW, at: { x: -0.95, y: 4.41 } },
    { geo: cyl(0.16, 0.2, 0.3, 6), color: '#2B2E42', at: { y: 0.15 } },
  ]);
}

export function benchGeometry() {
  const wood = '#E0893A';
  return mergeParts([
    { geo: box(0.5, 0.07, 1.6), color: wood, at: { y: 0.45 } },
    { geo: box(0.07, 0.4, 1.6), color: wood, at: { x: 0.24, y: 0.72, rz: -0.12 } },
    { geo: box(0.45, 0.45, 0.07), color: '#2F3247', at: { y: 0.22, z: 0.7 } },
    { geo: box(0.45, 0.45, 0.07), color: '#2F3247', at: { y: 0.22, z: -0.7 } },
  ]);
}

export function binGeometry() {
  return mergeParts([
    { geo: cyl(0.28, 0.24, 0.8, 10), color: '#2FBF71', at: { y: 0.4 }, tint: 1 },
    { geo: cyl(0.31, 0.31, 0.08, 10), color: '#1E8E52', at: { y: 0.83 }, tint: 1 },
  ]);
}

export function bushGeometry() {
  return mergeParts([
    { geo: ico(0.55, 1), color: '#46C35A', at: { y: 0.42, s: [1.2, 0.85, 1] }, tint: 1 },
    { geo: ico(0.42, 1), color: '#5ED46C', at: { x: 0.35, y: 0.38, z: 0.25 }, tint: 1 },
    { geo: ico(0.38, 1), color: '#36AE4E', at: { x: -0.3, y: 0.34, z: -0.25 }, tint: 1 },
  ]);
}

export function potGeometry() {
  const flowers: Part[] = [];
  const palette = ['#FF5C8A', '#FFD23F', '#FF8A3D', '#B98CFF'];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    flowers.push({ geo: ico(0.09), color: palette[k % palette.length], at: { x: Math.sin(a) * 0.22, y: 0.98, z: Math.cos(a) * 0.22 } });
  }
  return mergeParts([
    { geo: cyl(0.36, 0.26, 0.55, 10), color: '#E0703E', at: { y: 0.28 }, tint: 1 },
    { geo: cyl(0.38, 0.38, 0.08, 10), color: '#C95A2C', at: { y: 0.56 }, tint: 1 },
    { geo: ico(0.34, 1), color: '#3DB04F', at: { y: 0.78 } },
    ...flowers,
  ]);
}

export function umbrellaGeometry() {
  const canopy = new THREE.ConeGeometry(1.3, 0.55, 10, 1, true).toNonIndexed();
  const n = canopy.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  const a = new THREE.Color('#FF4F6D');
  const b = new THREE.Color('#FFFFFF');
  for (let t = 0; t < n / 3; t++) {
    const c = t % 2 ? a : b;
    for (let v = 0; v < 3; v++) col.set([c.r, c.g, c.b], (t * 3 + v) * 3);
  }
  const parts = mergeParts([
    { geo: cyl(0.04, 0.04, 2.3, 5), color: '#F5F5F5', at: { y: 1.15 } },
    { geo: box(0.9, 0.12, 1.6), color: '#FFE3A8', at: { x: 0.9, y: 0.06 } },
  ]);
  canopy.translate(0, 2.3, 0);
  canopy.setAttribute('color', new THREE.BufferAttribute(col, 3));
  canopy.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n), 1));
  canopy.deleteAttribute('uv');
  const merged = mergeGeometryPair(parts, canopy);
  return merged;
}

function mergeGeometryPair(a: THREE.BufferGeometry, b: THREE.BufferGeometry) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color', 'aTint']) {
    const A = a.getAttribute(name);
    const B = b.getAttribute(name);
    const arr = new Float32Array(A.array.length + B.array.length);
    arr.set(A.array as Float32Array, 0);
    arr.set(B.array as Float32Array, A.array.length);
    out.setAttribute(name, new THREE.BufferAttribute(arr, A.itemSize));
  }
  return out;
}

export function tankGeometry() {
  return mergeParts([
    { geo: cyl(0.6, 0.6, 1.1, 10), color: '#8FA3B8', at: { y: 1.25 } },
    { geo: new THREE.ConeGeometry(0.66, 0.35, 10), color: '#6F8297', at: { y: 1.98 } },
    { geo: box(0.08, 0.7, 0.08), color: '#4A5568', at: { x: 0.4, y: 0.35, z: 0.4 } },
    { geo: box(0.08, 0.7, 0.08), color: '#4A5568', at: { x: -0.4, y: 0.35, z: 0.4 } },
    { geo: box(0.08, 0.7, 0.08), color: '#4A5568', at: { x: 0.4, y: 0.35, z: -0.4 } },
    { geo: box(0.08, 0.7, 0.08), color: '#4A5568', at: { x: -0.4, y: 0.35, z: -0.4 } },
  ]);
}

/** Billboard frame + pole; the glowing panel is a separate instanced quad. */
export function billboardFrameGeometry() {
  return mergeParts([
    { geo: box(0.22, 4.4, 0.22), color: '#3B3F58', at: { y: 2.2 } },
    { geo: box(3.7, 2.3, 0.14), color: '#FFFFFF', at: { y: 5.1, z: -0.05 } },
    { geo: box(3.0, 0.08, 0.5), color: '#3B3F58', at: { y: 3.9, z: 0.15 } },
  ]);
}
