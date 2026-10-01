import { useLoader } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

import type { Outfit, SkinDef } from '../../data/skins';
import { modelUrl } from '../../utils/models';

/** Region ids baked by scripts/build-character.mjs (`_REGION` attribute). */
const REGION_KEYS: (keyof Outfit)[] = [
  'skin', 'head', 'torso', 'arm', 'hand', 'shorts', 'leggings', 'calf',
  'shoe', 'sole', 'wrist', 'piping', 'emblem', 'harness', 'eyes',
];

export type MonsterMode = 'run' | 'pose';

export type FitMonster = {
  /** Feet at y=0, facing +Z, `height` tall. */
  object: THREE.Group;
  /** Advances animation; `airborne`/`runRate`/`sliding` only matter in run mode. */
  update: (dt: number, airborne?: boolean, runRate?: number, sliding?: boolean) => void;
  dispose: () => void;
};

function paint(mesh: THREE.SkinnedMesh, outfit: Outfit) {
  const region = mesh.geometry.getAttribute('_region');
  if (!region) return;
  mesh.geometry = mesh.geometry.clone();
  const colors = new Float32Array(region.count * 3);
  const palette = REGION_KEYS.map((k) => new THREE.Color(outfit[k] as string));
  for (let i = 0; i < region.count; i++) {
    const c = palette[Math.round(region.getX(i))] ?? palette[0];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function makeCape(color: string) {
  const geo = new THREE.PlaneGeometry(0.46, 0.95, 4, 10);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (0.475 - y) / 0.95;
    pos.setX(i, x * (0.75 + 0.5 * t));
    pos.setZ(i, -Math.abs(x) * 0.25 - t * 0.06);
  }
  geo.translate(0, -0.475, 0);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide });
  const cape = new THREE.Mesh(geo, mat);
  cape.castShadow = true;
  return cape;
}

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const q1 = new THREE.Quaternion();
const q2 = new THREE.Quaternion();

/** Rotates `bone` so its child points at `target` (world space). */
function aim(bone: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3) {
  bone.getWorldPosition(v1);
  child.getWorldPosition(v2);
  const from = v2.sub(v1).normalize();
  const to = v3.copy(target).sub(v1).normalize();
  q1.setFromUnitVectors(from, to);
  bone.getWorldQuaternion(q2);
  q2.premultiply(q1);
  if (bone.parent) {
    bone.parent.getWorldQuaternion(q1);
    q2.premultiply(q1.invert());
  }
  bone.quaternion.copy(q2);
  bone.updateMatrixWorld(true);
}

/** Model-space targets for the "thinking" menu pose (hand on chin, arm crossed). */
const POSE = {
  chinElbow: new THREE.Vector3(0.27, 1.12, 0.17),
  chinHand: new THREE.Vector3(0.04, 1.55, 0.15),
  crossElbow: new THREE.Vector3(-0.24, 1.07, 0.1),
  crossHand: new THREE.Vector3(0.27, 1.1, 0.2),
};

export function useFitMonster(skin: SkinDef, mode: MonsterMode, height: number): FitMonster {
  const [gltf, anims] = useLoader(GLTFLoader, [modelUrl('fitMonster'), modelUrl('fitMonsterAnims')]) as GLTF[];

  const monster = useMemo<FitMonster>(() => {
    const outfit = skin.outfit;
    const model = cloneSkinned(gltf.scene) as THREE.Group;
    const bones: Record<string, THREE.Object3D> = {};
    const materials: THREE.Material[] = [];
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) bones[o.name] = o;
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      const src = mesh.material as THREE.MeshStandardMaterial;
      if (src.name === 'FM_Eyes') {
        mesh.material = new THREE.MeshBasicMaterial({ color: outfit.eyes, toneMapped: false });
      } else {
        paint(mesh, outfit);
        mesh.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          normalMap: src.normalMap,
          normalScale: new THREE.Vector2(0.8, 0.8),
          roughness: outfit.roughness,
          metalness: outfit.metalness,
        });
      }
      materials.push(mesh.material as THREE.Material);
    });

    let cape: THREE.Mesh | null = null;
    if (outfit.cape && bones.spine_03) {
      cape = makeCape(outfit.cape);
      const pivot = new THREE.Group();
      pivot.position.set(0, 1.5, -0.14);
      pivot.add(cape);
      model.add(pivot);
      model.updateMatrixWorld(true);
      bones.spine_03.attach(pivot);
      materials.push(cape.material as THREE.Material);
    }

    const s = height / 1.81;
    model.scale.setScalar(s);
    const object = new THREE.Group();
    object.add(model);

    const mixer = new THREE.AnimationMixer(model);
    const clip = (name: string) => anims.animations.find((a) => a.name === name);
    const action = (name: string) => {
      const c = clip(name);
      return c ? mixer.clipAction(c) : null;
    };
    const run = action('Sprint_Loop');
    const air = action('Jump_Loop');
    const idle = action('Idle_Loop');
    (mode === 'run' ? run : idle)?.play();

    const slide = action('Roll');
    if (slide) {
      slide.setLoop(THREE.LoopOnce, 1);
      slide.clampWhenFinished = true;
    }
    let state: 'run' | 'air' | 'slide' = 'run';
    let t = 0;
    const target = new THREE.Vector3();
    const toWorld = (p: THREE.Vector3) => model.localToWorld(target.copy(p));
    const actions = { run, air, slide };

    const update = (dt: number, airborne = false, runRate = 1, sliding = false) => {
      t += dt;
      if (mode === 'run') {
        const next = sliding ? 'slide' : airborne ? 'air' : 'run';
        if (next !== state) {
          const from = actions[state];
          const to = actions[next];
          state = next;
          if (to) {
            to.reset().fadeIn(next === 'slide' ? 0.06 : 0.12).play();
            if (next === 'slide') to.setEffectiveTimeScale(1.95);
          }
          from?.fadeOut(0.1);
        }
        run?.setEffectiveTimeScale(0.85 * runRate);
      }
      mixer.update(dt);
      if (mode === 'pose') {
        object.updateMatrixWorld(true);
        const b = bones;
        if (b.upperarm_l && b.lowerarm_l && b.hand_l) {
          aim(b.upperarm_l, b.lowerarm_l, toWorld(POSE.chinElbow));
          aim(b.lowerarm_l, b.hand_l, toWorld(POSE.chinHand));
        }
        if (b.upperarm_r && b.lowerarm_r && b.hand_r) {
          aim(b.upperarm_r, b.lowerarm_r, toWorld(POSE.crossElbow));
          aim(b.lowerarm_r, b.hand_r, toWorld(POSE.crossHand));
        }
      }
      if (cape) cape.rotation.x = mode === 'run' ? 0.5 + Math.sin(t * 9) * 0.08 : 0.08 + Math.sin(t * 1.5) * 0.03;
    };

    return {
      object,
      update,
      dispose: () => {
        mixer.stopAllAction();
        materials.forEach((m) => m.dispose());
      },
    };
  }, [gltf, anims, skin, mode, height]);

  useEffect(() => () => monster.dispose(), [monster]);
  return monster;
}
