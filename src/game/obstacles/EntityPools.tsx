import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { colors } from '../../data/theme';
import { modelUrl, normalizedClone, type ModelKey } from '../../utils/models';
import {
  LOW_RAMP_LENGTH,
  OVERHEAD_BOTTOM,
  OVERHEAD_TOP,
  PLATFORM_HEIGHT,
  PLATFORM_LENGTH,
  POOL_SIZES,
  RAMP_LENGTH,
  TRUCK_HEIGHT,
  TRUCKS,
  WALKWAY_LENGTH,
  type Slot,
  type TruckVariant,
  type Variant3D,
} from '../sim/patterns';
import { hide, instanced, paint, propMaterial, put } from '../world/kit';
import { coinGeometry, coinMaterial, glowTexture, halo, makeGlowy, waterBottle } from './items';
import { TRUCK_COLORS, truckGeometry } from './trucks';

const FOOD_MODELS: Partial<Record<Variant3D, { key: ModelKey; size: number }>> = {
  burger: { key: 'burger', size: 1.5 },
  donut: { key: 'donut', size: 1.4 },
  fries: { key: 'fries', size: 1.3 },
  soda: { key: 'soda', size: 1.3 },
  broccoli: { key: 'broccoli', size: 1.3 },
  chicken: { key: 'chicken', size: 1.4 },
  apple: { key: 'apple', size: 1.1 },
  whey: { key: 'protein', size: 1.5 },
};

const JUNK_VARIANTS = new Set<Variant3D>(['burger', 'donut', 'fries', 'soda']);
const TRUCK_VARIANTS: TruckVariant[] = ['container', 'boxTruck', 'van'];
const isTruck = (v: Variant3D): v is TruckVariant => v in TRUCKS;

/**
 * Render pools for every obstacle/pickup variant. Trucks and coins are
 * InstancedMeshes (one draw call per variant); the rest are pooled groups.
 * `show`/`hide` are the only per-frame entry points and never allocate.
 */
export class ObstaclePools {
  readonly group = new THREE.Group();
  private readonly groups: Partial<Record<Variant3D, THREE.Group[]>> = {};
  private readonly trucks = {} as Record<TruckVariant, THREE.InstancedMesh>;
  private readonly truckSeed = {} as Record<TruckVariant, Float32Array>;
  private readonly headGlow: THREE.InstancedMesh;
  private readonly coins: THREE.InstancedMesh;

  constructor(foods: Partial<Record<Variant3D, THREE.Object3D>>) {
    const truckMat = propMaterial({ roughness: 0.42, metalness: 0.08 });
    for (const v of TRUCK_VARIANTS) {
      this.trucks[v] = instanced(truckGeometry(v), truckMat, POOL_SIZES[v], { cast: true, receive: true, colored: true });
      this.truckSeed[v] = new Float32Array(POOL_SIZES[v]).fill(-1);
      this.group.add(this.trucks[v]);
    }
    this.headGlow = instanced(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#FFF2C4', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      POOL_SIZES.boxTruck * 2,
    );
    this.group.add(this.headGlow);

    this.coins = instanced(coinGeometry(), coinMaterial(), POOL_SIZES.coin, { cast: false });
    this.group.add(this.coins);

    const build = (v: Variant3D, make: () => THREE.Object3D) => {
      this.groups[v] = Array.from({ length: POOL_SIZES[v] }, () => {
        const g = new THREE.Group();
        g.add(make());
        g.visible = false;
        this.group.add(g);
        return g;
      });
    };
    build('ramp', () => ramp(TRUCK_HEIGHT, RAMP_LENGTH));
    build('rampLow', () => ramp(PLATFORM_HEIGHT, LOW_RAMP_LENGTH));
    build('overhead', overhead);
    build('platform', hoverPlatform);
    build('walkway', walkway);
    build('water', () => healthyPickup(waterBottle(), '#4FC3FF'));
    (Object.keys(FOOD_MODELS) as Variant3D[]).forEach((v) => {
      const def = FOOD_MODELS[v]!;
      const junk = JUNK_VARIANTS.has(v);
      build(v, () => {
        const food = normalizedClone(foods[v]!, { maxSize: def.size, anchor: junk ? 'base' : 'center', shadows: junk });
        makeGlowy(food, junk ? 0.18 : 0.28);
        return junk ? junkBarrier(food) : healthyPickup(food, v === 'whey' ? '#42A5F5' : colors.green);
      });
    });
  }

  /** Positions the slot's bound instance; `t` is elapsed time (for spin/bob). */
  show(slot: Slot, t: number) {
    const v = slot.variant;
    const i = slot.inst;
    const pop = slot.popT >= 0 ? Math.max(0.05, 1 - slot.popT * 3.4) : 1;
    if (isTruck(v)) {
      const mesh = this.trucks[v];
      const oncoming = slot.vz > 0;
      put(mesh, i, slot.x, 0, slot.z, 1, 1, 1, oncoming ? Math.PI : 0);
      if (this.truckSeed[v][i] !== slot.seed) {
        this.truckSeed[v][i] = slot.seed;
        paint(mesh, i, TRUCK_COLORS[Math.floor(slot.seed * TRUCK_COLORS.length)]);
      }
      if (v === 'boxTruck') {
        if (oncoming) {
          // Headlight glow so the oncoming truck is visible early.
          const z = slot.z + TRUCKS.boxTruck.length / 2 + 0.15;
          const pulse = 1.5 + Math.sin(t * 12) * 0.15;
          put(this.headGlow, i * 2, slot.x - 0.66, 0.84, z, pulse);
          put(this.headGlow, i * 2 + 1, slot.x + 0.66, 0.84, z, pulse);
        } else {
          hide(this.headGlow, i * 2);
          hide(this.headGlow, i * 2 + 1);
        }
      }
      return;
    }
    if (v === 'coin') {
      const bob = slot.popT >= 0 ? 0 : Math.sin(t * 3 + slot.seed * 6.28) * 0.1;
      put(this.coins, i, slot.x, slot.y + bob, slot.z, pop, pop, pop, t * 4 + slot.seed * 6.28);
      return;
    }
    const g = this.groups[v]?.[i];
    if (!g) return;
    g.visible = true;
    g.position.set(slot.x, slot.y, slot.z);
    g.scale.setScalar(pop);
    if (slot.kind === 'healthy') {
      g.rotation.y = t * 1.6 + slot.seed * 6.28;
      g.position.y += Math.sin(t * 2.6 + slot.seed * 6.28) * 0.12;
    } else if (slot.sway) {
      g.position.y = Math.sin(slot.phase * 2) * 0.05;
    }
  }

  hide(variant: Variant3D, i: number) {
    if (isTruck(variant)) {
      hide(this.trucks[variant], i);
      if (variant === 'boxTruck') {
        hide(this.headGlow, i * 2);
        hide(this.headGlow, i * 2 + 1);
      }
    } else if (variant === 'coin') {
      hide(this.coins, i);
    } else {
      const g = this.groups[variant]?.[i];
      if (g) g.visible = false;
    }
  }
}

export function useObstaclePools(): ObstaclePools {
  const foodKeys = Object.values(FOOD_MODELS).map((m) => m!.key);
  const foods = useLoader(GLTFLoader, foodKeys.map(modelUrl));
  return useMemo(() => {
    const map: Partial<Record<Variant3D, THREE.Object3D>> = {};
    (Object.keys(FOOD_MODELS) as Variant3D[]).forEach((v, i) => {
      map[v] = foods[i].scene;
    });
    return new ObstaclePools(map);
  }, [foods]);
}

// ------------------------------------------------------------------ pieces

const std = (color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
const glow = (color: THREE.ColorRepresentation, extra: THREE.MeshBasicMaterialParameters = {}) =>
  new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

/** Low barrier with the junk food sitting on top; jump over it. */
function junkBarrier(food: THREE.Object3D) {
  const g = new THREE.Group();
  const post = std('#B0B6C8', { metalness: 0.5, roughness: 0.35 });
  for (const x of [-0.8, 0.8]) g.add(mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), post, x, 0.35, 0));
  const red = std('#FF2E4D');
  const white = std('#FFFFFF');
  [-0.6, -0.2, 0.2, 0.6].forEach((x, i) => g.add(mesh(new THREE.BoxGeometry(0.4, 0.3, 0.12), i % 2 ? white : red, x, 0.6, 0)));
  food.position.set(0, 0.76, 0);
  g.add(food);
  const h = halo('#FF4D4D', 2.2, 0.55);
  h.position.set(0, 1.35, -0.3);
  g.add(h);
  return g;
}

function healthyPickup(food: THREE.Object3D, color: string) {
  const g = new THREE.Group();
  g.add(food);
  const h = halo(color, 2.1, 0.7);
  h.position.z = -0.25;
  g.add(h);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.68, 28),
    glow(color, { transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.8;
  g.add(ring);
  return g;
}

/** Truck loading ramp: high end at -Z (touching the truck rear), low end toward the runner. */
function ramp(height: number, length: number) {
  const g = new THREE.Group();
  const angle = Math.atan2(height, length);
  const slope = Math.hypot(height, length);
  const plate = new THREE.Group();
  plate.position.set(0, height / 2, 0);
  plate.rotation.x = angle;
  plate.add(mesh(new THREE.BoxGeometry(1.8, 0.12, slope), std('#B7BDCF', { metalness: 0.65, roughness: 0.35 })));
  const n = Math.max(3, Math.round(slope / 0.6));
  const ribMat = std('#8E95AA', { metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i < n; i++) {
    plate.add(mesh(new THREE.BoxGeometry(1.7, 0.04, 0.08), ribMat, 0, 0.07, -slope / 2 + (i + 0.5) * (slope / n), false));
  }
  const stripe = std(colors.yellow, { emissive: '#7A5200' });
  for (const x of [-0.86, 0.86]) plate.add(mesh(new THREE.BoxGeometry(0.1, 0.05, slope), stripe, x, 0.08, 0, false));
  g.add(plate);
  const side = std('#4B5068');
  for (const x of [-0.92, 0.92]) g.add(mesh(new THREE.BoxGeometry(0.08, height / 2, length / 2), side, x, height / 4, -length / 4));
  return g;
}

const BEAM_HEIGHT = OVERHEAD_TOP - 1.85;

/** Sign gantry with a glowing energy beam above: slide under the board. */
function overhead() {
  const g = new THREE.Group();
  const frame = std('#3D4466', { metalness: 0.5, roughness: 0.35 });
  for (const x of [-1.02, 1.02]) g.add(mesh(new THREE.BoxGeometry(0.16, OVERHEAD_TOP, 0.16), frame, x, OVERHEAD_TOP / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(2.0, 1.85 - OVERHEAD_BOTTOM, 0.14), std('#FFC21A', { emissive: '#6A4500' }), 0, (OVERHEAD_BOTTOM + 1.85) / 2, 0));
  const ink = new THREE.MeshBasicMaterial({ color: '#141416' });
  for (const x of [-0.6, 0, 0.6]) {
    const m = mesh(new THREE.BoxGeometry(0.18, 0.9, 0.02), ink, x, (OVERHEAD_BOTTOM + 1.85) / 2, 0.08, false);
    m.rotation.z = 0.7;
    g.add(m);
  }
  g.add(mesh(new THREE.PlaneGeometry(1.9, BEAM_HEIGHT), glow('#FF3D6E', { transparent: true, opacity: 0.35, side: THREE.DoubleSide }), 0, 1.85 + BEAM_HEIGHT / 2, 0, false));
  for (const y of [1.95, 2.4, 2.85]) g.add(mesh(new THREE.BoxGeometry(1.9, 0.05, 0.05), glow('#FF8AAA'), 0, y, 0, false));
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.14, 0.18), frame, 0, OVERHEAD_TOP, 0));
  return g;
}

/** Hovering cargo platform that sways between lanes. */
function hoverPlatform() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.9, 0.4, PLATFORM_LENGTH), std('#8B5CF6', { metalness: 0.2, roughness: 0.4 }), 0, PLATFORM_HEIGHT - 0.2, 0));
  for (const x of [-0.9, 0.9]) g.add(mesh(new THREE.BoxGeometry(0.1, 0.06, PLATFORM_LENGTH), glow('#FFD23F'), x, PLATFORM_HEIGHT - 0.02, 0, false));
  g.add(mesh(new THREE.PlaneGeometry(1.9, 0.4), glow('#00E5FF'), 0, PLATFORM_HEIGHT - 0.2, PLATFORM_LENGTH / 2 + 0.01, false));
  const leg = std('#2A2D40', { emissive: '#00B8D4', emissiveIntensity: 0.6 });
  for (const z of [-PLATFORM_LENGTH / 3, PLATFORM_LENGTH / 3]) {
    g.add(mesh(new THREE.CylinderGeometry(0.18, 0.32, PLATFORM_HEIGHT - 0.4, 10), leg, 0, (PLATFORM_HEIGHT - 0.4) / 2, z));
  }
  return g;
}

/** Static raised walkway (a flatbed trailer), reached by a low ramp. */
function walkway() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.9, PLATFORM_HEIGHT - 0.5, WALKWAY_LENGTH), std('#14C8B4', { roughness: 0.5 }), 0, 0.5 + (PLATFORM_HEIGHT - 0.5) / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(1.9, 0.08, WALKWAY_LENGTH), std('#E9ECF5', { roughness: 0.6 }), 0, PLATFORM_HEIGHT - 0.04, 0));
  for (const x of [-0.92, 0.92]) g.add(mesh(new THREE.BoxGeometry(0.08, 0.05, WALKWAY_LENGTH), std(colors.yellow, { emissive: '#7A5200' }), x, PLATFORM_HEIGHT + 0.01, 0, false));
  const wheel = std('#1C1D24');
  for (const z of [-WALKWAY_LENGTH / 2 + 1.2, -WALKWAY_LENGTH / 2 + 2.3, WALKWAY_LENGTH / 2 - 1.5]) {
    for (const x of [-0.85, 0.85]) {
      const w = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 14), wheel, x, 0.38, z);
      w.rotation.z = Math.PI / 2;
      g.add(w);
    }
  }
  g.add(mesh(new THREE.BoxGeometry(1.7, 0.3, WALKWAY_LENGTH - 0.6), std('#2B2D3A'), 0, 0.55, 0));
  return g;
}
