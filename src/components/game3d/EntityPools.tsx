import { useLoader } from '@react-three/fiber';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { colors } from '../../data/theme';
import { modelUrl, normalizedClone, type ModelKey } from '../../utils/models';
import {
  CAR_LENGTH,
  LOW_RAMP_LENGTH,
  OVERHEAD_BOTTOM,
  OVERHEAD_TOP,
  PLATFORM_HEIGHT,
  PLATFORM_LENGTH,
  POOL_SIZES,
  RAMP_LENGTH,
  TRAIN_HEIGHT,
  WALKWAY_LENGTH,
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
          <Ramp height={TRAIN_HEIGHT} length={RAMP_LENGTH} />
        </group>
      ))}

      {Array.from({ length: POOL_SIZES.rampLow }).map((_, i) => (
        <group key={`rampLow-${i}`} ref={bind('rampLow', i)} visible={false}>
          <Ramp height={PLATFORM_HEIGHT} length={LOW_RAMP_LENGTH} />
        </group>
      ))}

      {Array.from({ length: POOL_SIZES.overhead }).map((_, i) => (
        <group key={`overhead-${i}`} ref={bind('overhead', i)} visible={false}>
          <Overhead />
        </group>
      ))}

      {Array.from({ length: POOL_SIZES.platform }).map((_, i) => (
        <group key={`platform-${i}`} ref={bind('platform', i)} visible={false}>
          <HoverPlatform />
        </group>
      ))}

      {Array.from({ length: POOL_SIZES.walkway }).map((_, i) => (
        <group key={`walkway-${i}`} ref={bind('walkway', i)} visible={false}>
          <Walkway />
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

/** High end at -Z (touching the block front), low end toward the runner. */
function Ramp({ height, length }: { height: number; length: number }) {
  const angle = Math.atan2(height, length);
  const slope = Math.hypot(height, length);
  const stripes = Math.max(2, Math.round(slope / 1.2));
  return (
    <group>
      <group position={[0, height / 2, 0]} rotation={[angle, 0, 0]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[1.9, 0.14, slope]} />
          <meshStandardMaterial color="#37474F" metalness={0.4} roughness={0.6} />
        </mesh>
        {Array.from({ length: stripes }, (_, i) => -slope / 2 + (i + 0.5) * (slope / stripes)).map((z) => (
          <mesh key={z} position={[0, 0.08, z]}>
            <boxGeometry args={[1.6, 0.02, 0.35]} />
            <meshStandardMaterial color={colors.yellow} emissive="#5A3E00" />
          </mesh>
        ))}
      </group>
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, height / 4, -length / 4]} castShadow>
          <boxGeometry args={[0.1, height / 2, length / 2]} />
          <meshStandardMaterial color="#263238" />
        </mesh>
      ))}
    </group>
  );
}

const BEAM_HEIGHT = OVERHEAD_TOP - 1.85;

/** Sign gantry with a glowing energy beam above: slide under the board. */
function Overhead() {
  return (
    <group>
      {[-1.02, 1.02].map((x) => (
        <mesh key={x} position={[x, OVERHEAD_TOP / 2, 0]} castShadow>
          <boxGeometry args={[0.16, OVERHEAD_TOP, 0.16]} />
          <meshStandardMaterial color="#2E2E38" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, (OVERHEAD_BOTTOM + 1.85) / 2, 0]} castShadow>
        <boxGeometry args={[2.0, 1.85 - OVERHEAD_BOTTOM, 0.14]} />
        <meshStandardMaterial color="#FCB202" emissive="#5A3E00" roughness={0.5} />
      </mesh>
      {[-0.6, 0, 0.6].map((x) => (
        <mesh key={x} position={[x, (OVERHEAD_BOTTOM + 1.85) / 2, 0.08]} rotation={[0, 0, 0.7]}>
          <boxGeometry args={[0.18, 0.9, 0.02]} />
          <meshBasicMaterial color="#141416" />
        </mesh>
      ))}
      <mesh position={[0, 1.85 + BEAM_HEIGHT / 2, 0]}>
        <planeGeometry args={[1.9, BEAM_HEIGHT]} />
        <meshBasicMaterial color="#FF3D6E" transparent opacity={0.35} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {[1.95, 2.4, 2.85].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[1.9, 0.04, 0.04]} />
          <meshBasicMaterial color="#FF7A9C" toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, OVERHEAD_TOP, 0]}>
        <boxGeometry args={[2.2, 0.14, 0.18]} />
        <meshStandardMaterial color="#2E2E38" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Hovering cargo platform that sways between lanes. */
function HoverPlatform() {
  return (
    <group>
      <mesh position={[0, PLATFORM_HEIGHT - 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.4, PLATFORM_LENGTH]} />
        <meshStandardMaterial color="#5E35B1" metalness={0.3} roughness={0.45} />
      </mesh>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, PLATFORM_HEIGHT - 0.02, 0]}>
          <boxGeometry args={[0.1, 0.06, PLATFORM_LENGTH]} />
          <meshBasicMaterial color="#FCB202" toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, PLATFORM_HEIGHT - 0.2, PLATFORM_LENGTH / 2 + 0.01]}>
        <planeGeometry args={[1.9, 0.4]} />
        <meshBasicMaterial color="#00E5FF" toneMapped={false} />
      </mesh>
      {[-PLATFORM_LENGTH / 3, PLATFORM_LENGTH / 3].map((z) => (
        <mesh key={z} position={[0, (PLATFORM_HEIGHT - 0.4) / 2, z]}>
          <cylinderGeometry args={[0.18, 0.32, PLATFORM_HEIGHT - 0.4, 10]} />
          <meshStandardMaterial color="#212121" emissive="#00B8D4" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Static raised walkway, reached by a low ramp. */
function Walkway() {
  return (
    <group>
      <mesh position={[0, PLATFORM_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, PLATFORM_HEIGHT, WALKWAY_LENGTH]} />
        <meshStandardMaterial color="#78909C" roughness={0.8} />
      </mesh>
      <mesh position={[0, PLATFORM_HEIGHT + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.7, WALKWAY_LENGTH]} />
        <meshStandardMaterial color="#B0BEC5" roughness={0.7} />
      </mesh>
      {[-0.92, 0.92].map((x) => (
        <mesh key={x} position={[x, PLATFORM_HEIGHT + 0.02, 0]}>
          <boxGeometry args={[0.08, 0.04, WALKWAY_LENGTH]} />
          <meshStandardMaterial color={colors.yellow} emissive="#5A3E00" />
        </mesh>
      ))}
      <mesh position={[0, PLATFORM_HEIGHT * 0.5, WALKWAY_LENGTH / 2 + 0.01]}>
        <planeGeometry args={[1.9, PLATFORM_HEIGHT]} />
        <meshStandardMaterial color="#455A64" />
      </mesh>
    </group>
  );
}
