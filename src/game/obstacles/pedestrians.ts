import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { Slot } from '../sim/patterns';

/** Kenney Mini Characters are ~0.8 tall chibis; scaled to read next to the 1.9 hero. */
const HEIGHT = 1.62;
const CLIPS = ['walk', 'sprint', 'fall', 'emote-yes'] as const;
type ClipName = (typeof CLIPS)[number];
type Mood = 'walk' | 'fly' | 'cheer' | 'jog';
const MOOD_CLIP: Record<Mood, ClipName> = { walk: 'walk', fly: 'fall', cheer: 'emote-yes', jog: 'sprint' };

type Character = {
  object: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Record<ClipName, THREE.AnimationAction>;
};

/**
 * One pooled pedestrian: two different characters share the slot and the
 * slot's seed picks which one shows, so a small pool still shows all 12 looks.
 * Only the visible character's mixer is advanced.
 */
export class PedestrianRig {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly chars: Character[];
  private current: Character | null = null;
  private mood: Mood | null = null;
  private seed = -1;
  private lastT = -1;

  constructor(gltf: GLTF, sceneA: number, sceneB: number) {
    this.root.add(this.body);
    this.chars = [sceneA, sceneB].map((i) => buildCharacter(gltf, i % gltf.scenes.length));
    for (const c of this.chars) {
      c.object.visible = false;
      this.body.add(c.object);
    }
  }

  /** Called every frame while the slot is visible (the pool positions the parent); `t` is scene time. */
  update(slot: Slot, t: number) {
    if (slot.seed !== this.seed) this.respawn(slot, t);
    const c = this.current!;
    const dt = this.lastT < 0 ? 0 : Math.min(0.05, Math.max(0, t - this.lastT));
    this.lastT = t;

    const g = this.root;
    const b = this.body;
    if (slot.popT < 0) {
      this.play('walk');
      g.rotation.set(0, 0, 0);
      b.scale.set(this.widthFor(slot), 1, 1);
    } else if (slot.dance) {
      // Converted: a happy hop, then jogs alongside the runner, facing forward.
      this.play(slot.popT < 0.55 ? 'cheer' : 'jog');
      const turn = Math.min(1, slot.popT / 0.5);
      g.rotation.set(0, Math.PI * turn + (slot.popT < 0.5 ? slot.popT * 12 : 0), 0);
      b.scale.set(this.widthFor(slot), 1, 1);
    } else {
      this.play('fly');
      const spin = slot.seed > 0.5 ? 1 : -1;
      const air = slot.popT;
      g.rotation.set(-air * 7, air * 4 * spin, spin * air * 5);
      // Squash on each road bounce, stretch while flying.
      const squash = slot.bounceT < 0.25 ? 1 - 0.35 * Math.sin((slot.bounceT / 0.25) * Math.PI) : 1 + Math.min(0.12, Math.abs(slot.flyY) * 0.008);
      b.scale.set(this.widthFor(slot) * (2 - squash), squash, 2 - squash);
    }
    c.mixer.update(dt);
  }

  private respawn(slot: Slot, t: number) {
    this.seed = slot.seed;
    const next = this.chars[slot.seed < 0.5 ? 0 : 1];
    if (this.current && this.current !== next) {
      this.current.object.visible = false;
      this.current.mixer.stopAllAction();
    }
    this.current = next;
    next.object.visible = true;
    this.mood = null;
    this.lastT = t;
    // Different starting stride so a crowd doesn't walk in lockstep.
    next.mixer.setTime(slot.seed * 3);
  }

  /** Gentle per-spawn build variety (slim to stocky), never a stretched mesh. */
  private widthFor(slot: Slot) {
    return 0.94 + ((slot.seed * 13.7) % 1) * 0.22;
  }

  private play(mood: Mood) {
    if (mood === this.mood) return;
    const a = this.current!.actions;
    const first = this.mood === null;
    this.mood = mood;
    const to = a[MOOD_CLIP[mood]];
    to.reset().setEffectiveWeight(1).play();
    to.timeScale = mood === 'walk' ? 1.35 : mood === 'jog' ? 1.6 : 1;
    for (const name of CLIPS) {
      const other = a[name];
      if (other === to) continue;
      if (first) other.stop();
      else other.fadeOut(0.12);
    }
    if (!first) to.fadeIn(0.12);
  }
}

function buildCharacter(gltf: GLTF, index: number): Character {
  const object = cloneSkinned(gltf.scenes[index]);
  // GLTFLoader suffixes repeated node names (leg-left_3...); the shared clips
  // target the first character's names, so strip the suffix to retarget.
  object.traverse((o) => {
    o.name = o.name.replace(/_\d+$/, '');
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.roughness = 0.6;
      mat.metalness = 0;
    }
  });
  const box = new THREE.Box3().setFromObject(object);
  object.scale.setScalar(HEIGHT / Math.max(0.01, box.max.y - box.min.y));
  const mixer = new THREE.AnimationMixer(object);
  const actions = {} as Record<ClipName, THREE.AnimationAction>;
  for (const name of CLIPS) {
    const clip = THREE.AnimationClip.findByName(gltf.animations, name);
    if (!clip) throw new Error(`pedestrians.glb is missing clip "${name}"`);
    actions[name] = mixer.clipAction(clip);
  }
  return { object, mixer, actions };
}
