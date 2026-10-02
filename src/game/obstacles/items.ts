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

/** Coin facing +Z: thick rim with a raised 5-point boss on both faces. */
export function coinGeometry() {
  const rim = new THREE.CylinderGeometry(0.44, 0.44, 0.11, 28);
  const boss = new THREE.CylinderGeometry(0.27, 0.27, 0.15, 5);
  const merged = mergeGeometries([rim.toNonIndexed(), boss.toNonIndexed()], false)!;
  merged.rotateX(Math.PI / 2);
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

/** Brightens a loaded food model: emissive copy of its own colour. */
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
    mat.roughness = Math.min(mat.roughness ?? 0.6, 0.55);
    mesh.material = mat;
  });
}
