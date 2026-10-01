import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';

import type { SkinDef } from '../../data/skins';
import { useFitMonster } from './fitMonster';

export type PlayerHandle = {
  group: THREE.Group | null;
  update: (dt: number, airborne: boolean, runRate: number, sliding: boolean) => void;
};

type Props = { skin: SkinDef };

const RUNNER_HEIGHT = 2.1;

export const Player = forwardRef<PlayerHandle, Props>(function Player({ skin }, ref) {
  const monster = useFitMonster(skin, 'run', RUNNER_HEIGHT);
  const group = useRef<THREE.Group>(null);

  useImperativeHandle(
    ref,
    () => ({
      get group() {
        return group.current;
      },
      update(dt, airborne, runRate, sliding) {
        monster.update(dt, airborne, runRate, sliding);
      },
    }),
    [monster],
  );

  return (
    <group ref={group}>
      {/* The character faces +Z; the runner heads away from the camera (-Z). */}
      <primitive object={monster.object} rotation={[0, Math.PI, 0]} />
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} />
      </mesh>
    </group>
  );
});
