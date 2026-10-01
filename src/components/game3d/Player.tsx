import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import type * as THREE from 'three';

import type { SkinDef } from '../../data/skins';
import { colors } from '../../data/theme';

export type PlayerHandle = {
  group: THREE.Group | null;
  /** Advances the run cycle; airborne tucks the legs. */
  animate: (phase: number, airborne: boolean) => void;
};

type Props = { skin: SkinDef };

export const Player = forwardRef<PlayerHandle, Props>(function Player(
  { skin },
  ref,
) {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);

  useImperativeHandle(ref, () => ({
    get group() {
      return group.current;
    },
    animate(phase, airborne) {
      const swing = airborne ? 0 : Math.sin(phase) * 0.9;
      if (legL.current) legL.current.rotation.x = airborne ? -0.9 : swing;
      if (legR.current) legR.current.rotation.x = airborne ? -0.5 : -swing;
      if (armL.current) armL.current.rotation.x = airborne ? -2.4 : -swing * 0.8;
      if (armR.current) armR.current.rotation.x = airborne ? -2.4 : swing * 0.8;
      if (torso.current) {
        torso.current.position.y = airborne ? 0 : Math.abs(Math.cos(phase)) * 0.08;
      }
    },
  }));

  return (
    <group ref={group}>
      <group ref={torso}>
        <group ref={legL} position={[-0.22, 0.9, 0]}>
          <mesh position={[0, -0.42, 0]}>
            <boxGeometry args={[0.28, 0.85, 0.3]} />
            <meshStandardMaterial color={skin.secondary} />
          </mesh>
          <mesh position={[0, -0.88, 0.06]}>
            <boxGeometry args={[0.3, 0.16, 0.42]} />
            <meshStandardMaterial color={colors.white} />
          </mesh>
        </group>
        <group ref={legR} position={[0.22, 0.9, 0]}>
          <mesh position={[0, -0.42, 0]}>
            <boxGeometry args={[0.28, 0.85, 0.3]} />
            <meshStandardMaterial color={skin.secondary} />
          </mesh>
          <mesh position={[0, -0.88, 0.06]}>
            <boxGeometry args={[0.3, 0.16, 0.42]} />
            <meshStandardMaterial color={colors.white} />
          </mesh>
        </group>

        <mesh position={[0, 1.35, 0]}>
          <boxGeometry args={[0.9, 0.95, 0.5]} />
          <meshStandardMaterial color={skin.primary} />
        </mesh>
        <mesh position={[0, 1.4, 0.26]}>
          <boxGeometry args={[0.16, 0.8, 0.04]} />
          <meshStandardMaterial color={colors.yellow} />
        </mesh>

        <group ref={armL} position={[-0.6, 1.7, 0]}>
          <mesh position={[0, -0.38, 0]}>
            <boxGeometry args={[0.26, 0.8, 0.26]} />
            <meshStandardMaterial color={skin.accent} />
          </mesh>
        </group>
        <group ref={armR} position={[0.6, 1.7, 0]}>
          <mesh position={[0, -0.38, 0]}>
            <boxGeometry args={[0.26, 0.8, 0.26]} />
            <meshStandardMaterial color={skin.accent} />
          </mesh>
        </group>

        <mesh position={[0, 2.12, 0]}>
          <sphereGeometry args={[0.38, 16, 12]} />
          <meshStandardMaterial color={skin.primary} />
        </mesh>
        <mesh position={[0, 2.22, 0]}>
          <torusGeometry args={[0.38, 0.06, 8, 20]} />
          <meshStandardMaterial color={skin.secondary} />
        </mesh>
      </group>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
    </group>
  );
});
