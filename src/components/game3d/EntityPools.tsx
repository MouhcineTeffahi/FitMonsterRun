import { useLoader } from '@react-three/fiber';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { colors } from '../../data/theme';
import { modelUrl, normalizedClone, type ModelKey } from '../../utils/models';
import {
  CAR_LENGTH,
  POOL_SIZES,
  RAMP_LENGTH,
  TRAIN_HEIGHT,
  type Variant3D,
} from '../../utils/runner3d';

export type PoolRefs = Record<Variant3D, (THREE.Group | null)[]>;

export function createPoolRefs(): PoolRefs {
  const refs = {} as PoolRefs;
  (Object.keys(POOL_SIZES) as Variant3D[]).forEach((v) => {
    refs[v] = [];
  });
  return refs;
}

const FOOD_MODELS: Partial<Record<Variant3D, { key: ModelKey; size: number }>> = {
  burger: { key: 'burger', size: 1.2 },
  donut: { key: 'donut', size: 1.1 },
  fries: { key: 'fries', size: 1.0 },
  soda: { key: 'soda', size: 1.0 },
  broccoli: { key: 'broccoli', size: 1.0 },
  chicken: { key: 'chicken', size: 1.1 },
  apple: { key: 'apple', size: 0.85 },
  whey: { key: 'protein', size: 1.15 },
};

const JUNK_VARIANTS = new Set<Variant3D>(['burger', 'donut', 'fries', 'soda']);

type Props = { refs: PoolRefs };

export function EntityPools({ refs }: Props) {
  const foodKeys = Object.values(FOOD_MODELS).map((m) => m!.key);
  const [front, middle, back, ...foods] = useLoader(GLTFLoader, [
    modelUrl('trainFront'),
    modelUrl('trainMiddle'),
    modelUrl('trainBack'),
    ...foodKeys.map(modelUrl),
  ]);

  const foodScenes = useMemo(() => {
    const map: Partial<Record<Variant3D, THREE.Object3D>> = {};
    (Object.keys(FOOD_MODELS) as Variant3D[]).forEach((v, i) => {
      map[v] = foods[i].scene;
    });
    return map;
  }, [foods]);

  const trains = useMemo(
    () =>
      Array.from({ length: POOL_SIZES.train }, () => {
        const g = new THREE.Group();
        // Car nearest the player (+Z) first; cab faces the runner.
        const cars: [THREE.Object3D, number, number][] = [
          [front.scene, CAR_LENGTH, Math.PI],
          [middle.scene, 0, 0],
          [back.scene, -CAR_LENGTH, Math.PI],
        ];
        cars.forEach(([scene, z, rotY]) => {
          const car = normalizedClone(scene, { length: CAR_LENGTH * 0.97, shadows: true });
          car.rotation.y = rotY;
          car.position.z = z;
          g.add(car);
        });
        return g;
      }),
    [front, middle, back],
  );

  const foodInstances = useMemo(() => {
    const out: Partial<Record<Variant3D, THREE.Group[]>> = {};
    (Object.keys(FOOD_MODELS) as Variant3D[]).forEach((v) => {
      const def = FOOD_MODELS[v]!;
      const junk = JUNK_VARIANTS.has(v);
      out[v] = Array.from({ length: POOL_SIZES[v] }, () =>
        normalizedClone(foodScenes[v]!, {
          maxSize: def.size,
          anchor: junk ? 'base' : 'center',
          shadows: junk,
        }),
      );
    });
    return out;
  }, [foodScenes]);

  const bind = (variant: Variant3D, i: number) => (g: THREE.Group | null) => {
    refs[variant][i] = g;
  };

  return (
    <>
      {trains.map((obj, i) => (
        <group key={`train-${i}`} ref={bind('train', i)} visible={false}>
          <primitive object={obj} />
        </group>
      ))}

      {Array.from({ length: POOL_SIZES.ramp }).map((_, i) => (
        <group key={`ramp-${i}`} ref={bind('ramp', i)} visible={false}>
          <Ramp />
        </group>
      ))}

      {Array.from({ length: POOL_SIZES.coin }).map((_, i) => (
        <group key={`coin-${i}`} ref={bind('coin', i)} visible={false}>
          <Coin />
        </group>
      ))}

      {(Object.keys(FOOD_MODELS) as Variant3D[]).map((v) =>
        foodInstances[v]!.map((obj, i) => (
          <group key={`${v}-${i}`} ref={bind(v, i)} visible={false}>
            {JUNK_VARIANTS.has(v) ? (
              <JunkBarrier food={obj} />
            ) : (
              <HealthyPickup food={obj} protein={v === 'whey'} />
            )}
          </group>
        )),
      )}
    </>
  );
}

function Coin() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.12, 24]} />
        <meshStandardMaterial
          color={colors.yellow}
          emissive="#8A5A00"
          emissiveIntensity={0.6}
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.14, 5]} />
        <meshStandardMaterial color="#FFE082" emissive="#8A5A00" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

const STRIPE_RED = new THREE.Color('#E53935');
const STRIPE_WHITE = new THREE.Color('#FAFAFA');

/** Subway-style low barrier with the junk food sitting on top; jump over it. */
function JunkBarrier({ food }: { food: THREE.Group }) {
  return (
    <group>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 0.3, 0]} castShadow>
          <boxGeometry args={[0.12, 0.6, 0.12]} />
          <meshStandardMaterial color="#9E9E9E" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
        <mesh key={x} position={[x, 0.55, 0]} castShadow>
          <boxGeometry args={[0.4, 0.28, 0.1]} />
          <meshStandardMaterial color={i % 2 ? STRIPE_WHITE : STRIPE_RED} />
        </mesh>
      ))}
      <primitive object={food} position={[0, 0.69, 0]} />
    </group>
  );
}

function HealthyPickup({ food, protein }: { food: THREE.Group; protein: boolean }) {
  return (
    <group>
      <primitive object={food} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.75, 0]}>
        <ringGeometry args={[0.45, 0.6, 24]} />
        <meshBasicMaterial
          color={protein ? '#42A5F5' : colors.green}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

const RAMP_ANGLE = Math.atan2(TRAIN_HEIGHT, RAMP_LENGTH);
const RAMP_SLOPE = Math.hypot(TRAIN_HEIGHT, RAMP_LENGTH);

/** High end at -Z (touching the train front), low end toward the runner. */
function Ramp() {
  return (
    <group>
      <group position={[0, TRAIN_HEIGHT / 2, 0]} rotation={[RAMP_ANGLE, 0, 0]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[1.9, 0.14, RAMP_SLOPE]} />
          <meshStandardMaterial color="#37474F" metalness={0.4} roughness={0.6} />
        </mesh>
        {[-1.6, -0.6, 0.4, 1.4].map((z) => (
          <mesh key={z} position={[0, 0.08, z]}>
            <boxGeometry args={[1.6, 0.02, 0.35]} />
            <meshStandardMaterial color={colors.yellow} emissive="#5A3E00" />
          </mesh>
        ))}
      </group>
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, TRAIN_HEIGHT / 4, -RAMP_LENGTH / 4]} castShadow>
          <boxGeometry args={[0.1, TRAIN_HEIGHT / 2, RAMP_LENGTH / 2]} />
          <meshStandardMaterial color="#263238" />
        </mesh>
      ))}
    </group>
  );
}
