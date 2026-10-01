import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import type * as THREE from 'three';

import { colors } from '../../data/theme';
import { LANE_X } from '../../utils/runner3d';

const SLEEPER_COUNT = 34;
const SLEEPER_GAP = 3;
const BUILDING_COUNT = 14;
const BUILDING_GAP = 9;
const WORLD_DEPTH = SLEEPER_COUNT * SLEEPER_GAP;

export type WorldHandle = { scroll: (dz: number) => void };

const BUILDING_COLORS = ['#3B3B46', '#2A2A33', '#4A4A58', '#30303A'];

export const World = forwardRef<WorldHandle>(function World(_, ref) {
  const sleepers = useRef<(THREE.Group | null)[]>([]);
  const buildings = useRef<(THREE.Group | null)[]>([]);

  const buildingDefs = useMemo(
    () =>
      Array.from({ length: BUILDING_COUNT * 2 }, (_, i) => ({
        side: i % 2 === 0 ? -1 : 1,
        h: 4 + ((i * 37) % 7),
        w: 3 + ((i * 13) % 3),
        color: BUILDING_COLORS[i % BUILDING_COLORS.length],
        z: -Math.floor(i / 2) * BUILDING_GAP,
      })),
    [],
  );

  useImperativeHandle(ref, () => ({
    scroll(dz) {
      for (const s of sleepers.current) {
        if (!s) continue;
        s.position.z += dz;
        if (s.position.z > 8) s.position.z -= WORLD_DEPTH;
      }
      const span = BUILDING_COUNT * BUILDING_GAP;
      for (const b of buildings.current) {
        if (!b) continue;
        b.position.z += dz;
        if (b.position.z > 12) b.position.z -= span;
      }
    },
  }));

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -45]}>
        <planeGeometry args={[60, 130]} />
        <meshStandardMaterial color="#5B5B63" />
      </mesh>

      {LANE_X.map((x) => (
        <group key={x}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, -45]}>
            <planeGeometry args={[1.9, 130]} />
            <meshStandardMaterial color="#4E3B2C" />
          </mesh>
          {[-0.55, 0.55].map((o) => (
            <mesh key={o} position={[x + o, 0.08, -45]}>
              <boxGeometry args={[0.1, 0.12, 130]} />
              <meshStandardMaterial color="#B0BEC5" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}

      {Array.from({ length: SLEEPER_COUNT }).map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            sleepers.current[i] = g;
          }}
          position={[0, 0.03, -i * SLEEPER_GAP + 6]}
        >
          {LANE_X.map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <boxGeometry args={[1.7, 0.06, 0.28]} />
              <meshStandardMaterial color="#3E2A1E" />
            </mesh>
          ))}
        </group>
      ))}

      {buildingDefs.map((b, i) => (
        <group
          key={i}
          ref={(g) => {
            buildings.current[i] = g;
          }}
          position={[b.side * (7 + b.w / 2), 0, b.z]}
        >
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, 6]} />
            <meshStandardMaterial color={b.color} />
          </mesh>
          <mesh position={[-b.side * (b.w / 2 + 0.01), b.h * 0.7, 0]}>
            <boxGeometry args={[0.02, 0.5, 5]} />
            <meshStandardMaterial color={colors.yellow} emissive="#5A3E00" />
          </mesh>
        </group>
      ))}
    </group>
  );
});
