import { useLoader } from '@react-three/fiber/native';
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

const R = {
  SKIN: 0, HEAD: 1, TORSO: 2, ARM: 3, HAND: 4, SHORTS: 5, LEGGINGS: 6, CALF: 7,
  SHOE: 8, SOLE: 9, WRIST: 10, PIPING: 11, EMBLEM: 12, HARNESS: 13, EYES: 14, SOCK: 15,
} as const;

function smooth01(t: number) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/** 1 between b..c, fading in a..b and out c..d. */
function band(y: number, a: number, b: number, c: number, d: number) {
  return smooth01((y - a) / (b - a)) * (1 - smooth01((y - c) / (d - c)));
}

/**
 * Inflate along bind normals so the mesh stays solid. Thin outfit shells
 * (harness / piping) are left alone — stretching those made gold spikes.
 */
const fatOut = { x: 0, y: 0, z: 0 };

function fatAmount(region: number, y: number, z: number) {
  if (
    region === R.SHOE ||
    region === R.SOLE ||
    region === R.HARNESS ||
    region === R.PIPING ||
    region === R.EMBLEM ||
    region === R.EYES ||
    region === R.WRIST ||
    region === R.HAND
  ) {
    return 0;
  }
  if (region === R.TORSO) {
    const gut = band(y, 0.92, 1.02, 1.22, 1.4) * smooth01((z + 0.06) / 0.2);
    return 0.06 + 0.12 * gut;
  }
  if (region === R.SHORTS) return 0.09;
  if (region === R.LEGGINGS) return 0.08;
  if (region === R.CALF || region === R.SOCK) return 0.055;
  if (region === R.ARM) return 0.06;
  if (region === R.HEAD) return 0.03;
  if (region === R.SKIN) return 0.04;
  return 0;
}

function fatPoint(
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
  region: number,
  fat: number,
) {
  fatOut.x = x;
  fatOut.y = y;
  fatOut.z = z;
  if (fat < 0.001) return fatOut;
  const amount = fatAmount(region, y, z) * fat;
  fatOut.x += nx * amount;
  fatOut.y += ny * amount * 0.35;
  fatOut.z += nz * amount;
  if (region === R.TORSO) {
    const dx = x / 0.28;
    const dy = (y - 1.06) / 0.22;
    const front = smooth01((z + 0.04) / 0.2);
    const gut = Math.exp(-(dx * dx + dy * dy)) * front;
    fatOut.z += fat * 0.22 * gut;
    fatOut.y -= fat * 0.05 * gut;
  }
  const dx = fatOut.x - x;
  const dy = fatOut.y - y;
  const dz = fatOut.z - z;
  const len = Math.hypot(dx, dy, dz);
  if (len > 0.22) {
    const k = 0.22 / len;
    fatOut.x = x + dx * k;
    fatOut.y = y + dy * k;
    fatOut.z = z + dz * k;
  }
  return fatOut;
}

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
  /** 0 none, 1 hand slap, 2 foot kick. */
  attack?: 0 | 1 | 2;
  /** 1 uses the right limbs, -1 the left. */
  attackSide?: 1 | -1;
  /** Seconds since the slap or kick started. */
  attackT?: number;
  /** 0 lean, 1 stuffed. Omitted on menus. */
  bulk?: number;
  /** Riding a bicycle. */
  onBike?: boolean;
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
  const aura = new THREE.SkinnedMesh(body.geometry.clone(), mat);
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

const slapElbow = new THREE.Vector3();
const slapHand = new THREE.Vector3();

/** Model-space targets for the "thinking" menu pose (hand on chin, arm crossed). */
const POSE = {
  chinElbow: new THREE.Vector3(0.27, 1.12, 0.17),
  chinHand: new THREE.Vector3(0.04, 1.55, 0.15),
  crossElbow: new THREE.Vector3(-0.24, 1.07, 0.1),
  crossHand: new THREE.Vector3(0.27, 1.1, 0.2),
};

/** Lifts the model by the shoe sole thickness so it never sinks into the road. */
const SOLE_LIFT = 0.012;

type RunState = 'run' | 'air' | 'slide' | 'dead' | 'celebrate' | 'bike';

export function useFitMonster(skin: SkinDef, mode: MonsterMode, height: number): FitMonster {
  const [gltf, anims] = useLoader(GLTFLoader, [modelUrl('fitMonster'), modelUrl('fitMonsterAnims')]) as GLTF[];

  const monster = useMemo<FitMonster>(() => {
    const outfit = skin.outfit;
    const model = cloneSkinned(gltf.scene) as THREE.Group;
    const bones: Record<string, THREE.Object3D> = {};
    const materials: THREE.Material[] = [];
    const skinned: THREE.SkinnedMesh[] = [];
    const bodyMats: THREE.MeshStandardMaterial[] = [];
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
        const mat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          normalMap: src.normalMap,
          // Muscle relief fades as the runner gets a gut.
          normalScale: new THREE.Vector2(0.6, 0.6),
          roughness: outfit.roughness,
          metalness: outfit.metalness,
        });
        mesh.material = mat;
        bodyMats.push(mat);
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

    const fatMeshes = skinned.map((mesh) => {
      const geo = mesh.geometry;
      const srcPos = geo.getAttribute('position');
      const srcNrm = geo.getAttribute('normal');
      const region = geo.getAttribute('_region') ?? geo.getAttribute('_REGION');
      const base = new Float32Array(srcPos.count * 3);
      const normals = new Float32Array(srcPos.count * 3);
      for (let i = 0; i < srcPos.count; i++) {
        base[i * 3] = srcPos.getX(i);
        base[i * 3 + 1] = srcPos.getY(i);
        base[i * 3 + 2] = srcPos.getZ(i);
        if (srcNrm) {
          normals[i * 3] = srcNrm.getX(i);
          normals[i * 3 + 1] = srcNrm.getY(i);
          normals[i * 3 + 2] = srcNrm.getZ(i);
        }
      }
      // Quantized GLB positions cannot be written back; a float copy stays intact.
      const live = new THREE.BufferAttribute(base.slice(), 3);
      live.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', live);
      return { mesh, base, live, normals, region };
    });

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
    // Idle is a standing rest pose — a better sit base than Crouch_Fwd (that clip
    // dumped him on his back behind the bike). Limbs are posed with IK after mix.
    const bike = idle;
    const actions: Record<RunState, THREE.AnimationAction | null> = { run, air, slide, dead, celebrate, bike };

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
    let shownBulk = 0;
    let appliedBulk = -1;
    let fatWait = 0;
    const target = new THREE.Vector3();
    const toWorld = (p: THREE.Vector3) => model.localToWorld(target.copy(p));

    const update = (dt: number, f?: MonsterFrame) => {
      t += dt;
      if (mode === 'run' && f) {
        const next: RunState = f.dead
          ? 'dead'
          : f.celebrate
            ? 'celebrate'
            : f.onBike
              ? 'bike'
              : f.sliding
                ? 'slide'
                : f.airborne
                  ? 'air'
                  : 'run';
        if (next !== state) {
          const from = actions[state];
          const to = actions[next];
          state = next;
          if (to) {
            to.reset().fadeIn(next === 'slide' ? 0.06 : next === 'dead' ? 0.08 : 0.12).play();
            if (next === 'slide') to.setEffectiveTimeScale(1.95);
            if (next === 'dead') to.setEffectiveTimeScale(1.25);
            if (next === 'bike') to.setEffectiveTimeScale(0.15);
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
        bike?.setEffectiveTimeScale(0.15);
        // Same sit pose on the ground and in a hop — extra pitch folded him over the bars.
        model.rotation.x = f.onBike ? 0.16 : 0;
        model.position.y = (SOLE_LIFT + (f.onBike ? 0.06 : 0)) * s;
        object.rotation.x = 0;
      }
      mixer.update(dt);
      if (mode === 'run') {
        const targetBulk = Math.max(0, Math.min(1, f?.bulk ?? 0));
        shownBulk += (targetBulk - shownBulk) * Math.min(1, dt * 1.6);
        fatWait += dt;
        // Rewrite the mesh a few times a second, not every bite — that froze the run.
        const fatReady = fatWait >= 0.14 || Math.abs(shownBulk - appliedBulk) > 0.12;
        if (fatReady && Math.abs(shownBulk - appliedBulk) > 0.02) {
          fatWait = 0;
          appliedBulk = shownBulk;
          const muscle = 0.6 * (1 - shownBulk);
          for (const mat of bodyMats) mat.normalScale.set(muscle, muscle);
          for (const { live, base, normals, region } of fatMeshes) {
            const arr = live.array as Float32Array;
            for (let i = 0; i < live.count; i++) {
              const o = i * 3;
              const r = region ? Math.round(region.getX(i)) : -1;
              if (r < 0) {
                arr[o] = base[o];
                arr[o + 1] = base[o + 1];
                arr[o + 2] = base[o + 2];
                continue;
              }
              const p = fatPoint(
                base[o],
                base[o + 1],
                base[o + 2],
                normals[o],
                normals[o + 1],
                normals[o + 2],
                r,
                shownBulk,
              );
              arr[o] = p.x;
              arr[o + 1] = p.y;
              arr[o + 2] = p.z;
            }
            live.needsUpdate = true;
          }
        }
      }
      if (mode === 'run' && f?.onBike) {
        object.updateMatrixWorld(true);
        const b = bones;
        const pedal = t * 9;
        const spine = b.spine_02 ?? b.spine_01;
        const chest = b.spine_03 ?? b.spine_02;
        if (spine && chest) {
          aim(spine, chest, toWorld(slapElbow.set(0, 1.42, 0.22)));
        }
        for (const side of ['l', 'r'] as const) {
          const sx = side === 'r' ? -1 : 1;
          const phase = pedal + (side === 'r' ? Math.PI : 0);
          const thigh = b[`thigh_${side}`];
          const shin = b[`calf_${side}`] ?? b[`shin_${side}`];
          const foot = b[`foot_${side}`];
          if (thigh && shin) {
            aim(thigh, shin, toWorld(slapElbow.set(sx * 0.13, 0.58 + Math.sin(phase) * 0.1, 0.2 + Math.cos(phase) * 0.06)));
            if (foot) aim(shin, foot, toWorld(slapHand.set(sx * 0.12, 0.34 + Math.sin(phase) * 0.14, 0.08 + Math.cos(phase) * 0.1)));
          }
          const upper = b[`upperarm_${side}`];
          const lower = b[`lowerarm_${side}`];
          const hand = b[`hand_${side}`];
          if (upper && lower) {
            aim(upper, lower, toWorld(slapElbow.set(sx * 0.22, 1.12, 0.32)));
            if (hand) aim(lower, hand, toWorld(slapHand.set(sx * 0.3, 1.08, 0.52)));
          }
        }
      } else if (mode === 'run' && f?.attack && (f.attackT ?? 99) < 0.34) {
        object.updateMatrixWorld(true);
        const swing = Math.sin(Math.min(1, (f.attackT ?? 0) / 0.28) * Math.PI);
        const side = f.attackSide === 1 ? 'r' : 'l';
        const sx = side === 'r' ? -1 : 1;
        const b = bones;
        if (f.attack === 1 && b[`upperarm_${side}`] && b[`lowerarm_${side}`]) {
          aim(b[`upperarm_${side}`], b[`lowerarm_${side}`], toWorld(slapElbow.set(sx * 0.32, 1.22, 0.12 + swing * 0.5)));
          if (b[`hand_${side}`]) {
            aim(b[`lowerarm_${side}`], b[`hand_${side}`], toWorld(slapHand.set(sx * 0.06, 1.28 + swing * 0.12, 0.25 + swing * 1.05)));
          }
        } else if (f.attack === 2 && b[`thigh_${side}`]) {
          const shin = b[`calf_${side}`] ?? b[`shin_${side}`];
          if (shin) {
            aim(b[`thigh_${side}`], shin, toWorld(slapElbow.set(sx * 0.16, 0.78 - swing * 0.2, 0.12 + swing * 0.6)));
            const foot = b[`foot_${side}`];
            if (foot) aim(shin, foot, toWorld(slapHand.set(sx * 0.14, 0.42 - swing * 0.28, 0.18 + swing * 1.15)));
          }
        }
      }
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
