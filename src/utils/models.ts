import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import * as THREE from 'three';

const MODULES = {
  fitMonster: require('../assets/models/fit-monster.glb'),
  fitMonsterAnims: require('../assets/models/fit-monster-anims.glb'),
  burger: require('../assets/models/burger.glb'),
  donut: require('../assets/models/donut.glb'),
  fries: require('../assets/models/fries.glb'),
  soda: require('../assets/models/soda.glb'),
  broccoli: require('../assets/models/broccoli.glb'),
  chicken: require('../assets/models/chicken.glb'),
  banana: require('../assets/models/banana.glb'),
  apple: require('../assets/models/apple.glb'),
  protein: require('../assets/models/protein.glb'),
  /** Free Poly Pizza protein tub (Zsky, CC-BY). */
  proteinTub: require('../assets/models/protein-tub.glb'),
  /** Kenney Mini Characters (CC0), packed by scripts/build-pedestrians.mjs. */
  pedestrians: require('../assets/models/pedestrians.glb'),
} as const;

export type ModelKey = keyof typeof MODULES;

/**
 * Web needs a fetchable URL; on native, R3F's loader polyfill resolves the
 * Metro asset module itself, so the module id is passed through.
 */
export function modelUrl(key: ModelKey): string {
  const mod = MODULES[key];
  return Platform.OS === 'web' ? Asset.fromModule(mod).uri : (mod as string);
}

type NormalizeOptions = {
  /** Scale so the model's Z extent equals this length. */
  length?: number;
  /** Scale so the largest dimension equals this size. */
  maxSize?: number;
  /** Scale so the model's height equals this. */
  height?: number;
  anchor?: 'base' | 'center';
  shadows?: boolean;
};

/** Clones a loaded scene, scales it, and centres it on X/Z with Y at base or centre. */
export function normalizedClone(
  source: THREE.Object3D,
  { length, maxSize, height, anchor = 'base', shadows = false }: NormalizeOptions,
): THREE.Group {
  const obj = source.clone(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  let s = 1;
  if (length) s = length / size.z;
  else if (height) s = height / size.y;
  else if (maxSize) s = maxSize / Math.max(size.x, size.y, size.z);

  obj.scale.multiplyScalar(s);
  const yOffset = anchor === 'base' ? -box.min.y * s : -center.y * s;
  obj.position.set(-center.x * s, yOffset, -center.z * s);

  if (shadows) {
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  const wrapper = new THREE.Group();
  wrapper.add(obj);
  return wrapper;
}
