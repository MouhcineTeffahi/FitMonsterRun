import { useLoader } from '@react-three/fiber';
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { colors } from '../../data/theme';
import { modelUrl, normalizedClone, type ModelKey } from '../../utils/models';
import { LANE_X } from '../../utils/runner3d';

const TILE_LENGTH = 5;
const TILE_COUNT = 24;
const TRACK_SPAN = TILE_LENGTH * TILE_COUNT;
const BUILDINGS_PER_SIDE = 12;
const BUILDING_GAP = 10;
const BUILDING_SPAN = BUILDINGS_PER_SIDE * BUILDING_GAP;
const BUILDING_KEYS: ModelKey[] = [
  'buildingA',
  'skyscraperA',
  'buildingC',
  'buildingG',
  'skyscraperC',
];

export type WorldHandle = { scroll: (dz: number) => void };

export const World = forwardRef<WorldHandle>(function World(_, ref) {
  const [track, ...buildingGltfs] = useLoader(GLTFLoader, [
    modelUrl('track'),
    ...BUILDING_KEYS.map(modelUrl),
  ]);
  const tiles = useRef<(THREE.Object3D | null)[]>([]);
  const buildings = useRef<(THREE.Object3D | null)[]>([]);

  const tileObjects = useMemo(
    () =>
      Array.from({ length: TILE_COUNT * LANE_X.length }, (_, i) => {
        const tile = normalizedClone(track.scene, { length: TILE_LENGTH });
        tile.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).receiveShadow = true;
        });
        tile.scale.x = 1.9;
        tile.position.set(
          LANE_X[i % LANE_X.length],
          0.01,
          -Math.floor(i / LANE_X.length) * TILE_LENGTH + TILE_LENGTH,
        );
        return tile;
      }),
    [track],
  );

  const buildingObjects = useMemo(
    () =>
      Array.from({ length: BUILDINGS_PER_SIDE * 2 }, (_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const row = Math.floor(i / 2);
        const gltf = buildingGltfs[(row + (side > 0 ? 2 : 0)) % buildingGltfs.length];
        const b = normalizedClone(gltf.scene, { maxSize: 8 + ((i * 7) % 4) });
        const box = new THREE.Box3().setFromObject(b);
        const width = box.getSize(new THREE.Vector3()).x;
        b.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        b.position.set(side * (6.6 + width / 2), 0, -row * BUILDING_GAP + 6);
        return b;
      }),
    [buildingGltfs],
  );

  useImperativeHandle(ref, () => ({
    scroll(dz) {
      for (const t of tiles.current) {
        if (!t) continue;
        t.position.z += dz;
        if (t.position.z > TILE_LENGTH * 2) t.position.z -= TRACK_SPAN;
      }
      for (const b of buildings.current) {
        if (!b) continue;
        b.position.z += dz;
        if (b.position.z > 16) b.position.z -= BUILDING_SPAN;
      }
    },
  }));

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -50]} receiveShadow>
        <planeGeometry args={[80, 150]} />
        <meshStandardMaterial color="#6D6A75" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[side * 5.3, 0, -50]} receiveShadow>
            <planeGeometry args={[2.4, 150]} />
            <meshStandardMaterial color="#9A96A3" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[side * 4.05, 0.005, -50]}>
            <planeGeometry args={[0.18, 150]} />
            <meshStandardMaterial color={colors.yellow} emissive="#5A3E00" />
          </mesh>
        </group>
      ))}

      {tileObjects.map((obj, i) => (
        <primitive
          key={`tile-${i}`}
          object={obj}
          ref={(o: THREE.Object3D | null) => {
            tiles.current[i] = o;
          }}
        />
      ))}

      {buildingObjects.map((obj, i) => (
        <primitive
          key={`b-${i}`}
          object={obj}
          ref={(o: THREE.Object3D | null) => {
            buildings.current[i] = o;
          }}
        />
      ))}
    </group>
  );
});
