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
  'shoe', 'sole', 'wrist', 'piping', 'emblem', 'harness', 'eyes', 'sock',
];

/** `run`: gameplay state machine. `pose`: "thinking" idle. `hero`: frozen mid-sprint for the menu. */
export type MonsterMode = 'run' | 'pose' | 'hero';

/** Per-frame gameplay inputs (reuse one object; nothing here allocates). */
export type MonsterFrame = {
  airborne: boolean;
  runRate: number;
  sliding: boolean;
  /** Seconds since the last hit; a drop back to ~0 plays the stumble. */
  hitT: number;
  dead: boolean;
  celebrate: boolean;
};

export type FitMonster = {
  /** Feet at y=0, facing +Z, `height` tall. */
  object: THREE.Group;
  /** Additive glow shell skinned to the same skeleton (power mode); run mode only. */
  aura: THREE.SkinnedMesh | null;
  update: (dt: number, frame?: MonsterFrame) => void;
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

/** Back-faced additive shell pushed out along the bind-pose normal before skinning. */
function makeAura(body: THREE.SkinnedMesh) {
  const width = { value: 0.035 };
  const mat = new THREE.MeshBasicMaterial({
    color: '#FFD23F',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
    toneMapped: false,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAuraWidth = width;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uAuraWidth;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * uAuraWidth;');
  };
  mat.customProgramCacheKey = () => 'fm-aura';
  const aura = new THREE.SkinnedMesh(body.geometry, mat);
  aura.bind(body.skeleton, body.bindMatrix);
  aura.position.copy(body.position);
  aura.quaternion.copy(body.quaternion);
  aura.scale.copy(body.scale);
  aura.frustumCulled = false;
  aura.renderOrder = 2;
  aura.visible = false;
  body.parent?.add(aura);
  return aura;
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

/** Lifts the model by the shoe sole thickness so it never sinks into the road. */
const SOLE_LIFT = 0.012;

type RunState = 'run' | 'air' | 'slide' | 'dead' | 'celebrate';

export function useFitMonster(skin: SkinDef, mode: MonsterMode, height: number): FitMonster {
  const [gltf, anims] = useLoader(GLTFLoader, [modelUrl('fitMonster'), modelUrl('fitMonsterAnims')]) as GLTF[];

  const monster = useMemo<FitMonster>(() => {
    const outfit = skin.outfit;
    const model = cloneSkinned(gltf.scene) as THREE.Group;
    const bones: Record<string, THREE.Object3D> = {};
    const materials: THREE.Material[] = [];
    const skinned: THREE.SkinnedMesh[] = [];
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
          // Softer muscle relief reads cleaner on small phone screens.
          normalScale: new THREE.Vector2(0.6, 0.6),
          roughness: outfit.roughness,
          metalness: outfit.metalness,
        });
        if (mesh.isSkinnedMesh) skinned.push(mesh);
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

    const aura = mode === 'run' && skinned[0] ? makeAura(skinned[0]) : null;
    if (aura) materials.push(aura.material as THREE.Material);

    const s = height / 1.81;
    model.scale.setScalar(s);
    model.position.y = SOLE_LIFT * s;
    const object = new THREE.Group();
    object.add(model);

    const mixer = new THREE.AnimationMixer(model);
    const action = (name: string) => {
      const c = anims.animations.find((a) => a.name === name);
      return c ? mixer.clipAction(c) : null;
    };
    const once = (a: THREE.AnimationAction | null) => {
      if (a) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      return a;
    };
    const run = action('Sprint_Loop');
    const air = action('Jump_Loop');
    const idle = action('Idle_Loop');
    const slide = once(action('Roll'));
    const dead = once(action('Death01'));
    const hit = once(action('Hit_Chest'));
    const celebrate = action('Dance_Loop');
    const actions: Record<RunState, THREE.AnimationAction | null> = { run, air, slide, dead, celebrate };

    if (mode === 'run') run?.play();
    else if (mode === 'pose') idle?.play();
    else if (run) {
      // Frozen mid-stride: a dynamic hero pose for the menu.
      run.play();
      run.paused = true;
      run.time = run.getClip().duration * 0.3;
    }

    let state: RunState = 'run';
    let t = 0;
    let lastHitT = 99;
    let hitLeft = 0;
    const target = new THREE.Vector3();
    const toWorld = (p: THREE.Vector3) => model.localToWorld(target.copy(p));

    const update = (dt: number, f?: MonsterFrame) => {
      t += dt;
      if (mode === 'run' && f) {
        const next: RunState = f.dead ? 'dead' : f.celebrate ? 'celebrate' : f.sliding ? 'slide' : f.airborne ? 'air' : 'run';
        if (next !== state) {
          const from = actions[state];
          const to = actions[next];
          state = next;
          if (to) {
            to.reset().fadeIn(next === 'slide' ? 0.06 : next === 'dead' ? 0.08 : 0.12).play();
            if (next === 'slide') to.setEffectiveTimeScale(1.95);
            if (next === 'dead') to.setEffectiveTimeScale(1.25);
          }
          from?.fadeOut(0.1);
          if (next === 'dead') hit?.fadeOut(0.05);
        }
        // Stumble: blend the hit reaction over whatever is playing for a moment.
        if (hit && f.hitT < lastHitT && !f.dead) {
          hit.reset().setEffectiveWeight(0.85).fadeIn(0.05).play();
          hit.setEffectiveTimeScale(1.6);
          hitLeft = 0.35;
        }
        lastHitT = f.hitT;
        if (hitLeft > 0) {
          hitLeft -= dt;
          if (hitLeft <= 0) hit?.fadeOut(0.18);
        }
        run?.setEffectiveTimeScale(0.85 * f.runRate);
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
      if (cape) {
        cape.rotation.x = mode === 'pose' ? 0.08 + Math.sin(t * 1.5) * 0.03 : 0.5 + Math.sin(t * 9) * 0.08;
      }
    };

    return {
      object,
      aura,
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
