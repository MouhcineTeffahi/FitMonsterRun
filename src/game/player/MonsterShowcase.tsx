import { Canvas, useFrame, useThree } from '@react-three/fiber';
import React, { Suspense, useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import * as THREE from 'three';

import type { SkinDef } from '../../data/skins';
import { useFitMonster, type MonsterMode } from './fitMonster';

type Props = {
  skin: SkinDef;
  style?: StyleProp<ViewStyle>;
  /** `pose` = thinking idle (shop), `hero` = dynamic mid-sprint (home). */
  mode?: Exclude<MonsterMode, 'run'>;
  /** Draw the small floor disc under the feet. */
  floor?: boolean;
};

const HEIGHT = 1.9;

function Monster({ skin, mode }: { skin: SkinDef; mode: Exclude<MonsterMode, 'run'> }) {
  const monster = useFitMonster(skin, mode, HEIGHT);
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(0, HEIGHT * 0.5, 0);
  }, [camera]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    monster.update(Math.min(dt, 0.05));
    if (mode === 'hero') {
      monster.object.rotation.y = -0.55 + Math.sin(t * 0.6) * 0.08;
      monster.object.position.y = 0.06 + Math.sin(t * 2.2) * 0.03;
    } else {
      monster.object.rotation.y = -0.25 + Math.sin(t * 0.5) * 0.3;
    }
  });

  return <primitive object={monster.object} />;
}

/** Live 3D preview of the Fit Monster (transparent canvas over any background). */
export function MonsterShowcase({ skin, style, mode = 'pose', floor = true }: Props) {
  return (
    <View style={style} pointerEvents="none">
      <Canvas
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}
        shadows
        camera={{ position: mode === 'hero' ? [0, HEIGHT * 0.55, 5.6] : [0, HEIGHT * 0.52, 4.0], fov: 30 }}
        dpr={[1, 2]}
        gl={{ alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <ambientLight intensity={0.5} />
        <hemisphereLight args={['#DFF4FF', '#E8C9A0', 0.9]} />
        <directionalLight position={[2.5, 4, 3]} intensity={2.6} color="#FFF1D6" castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={1.4} color="#FCB202" />
        <Suspense fallback={null}>
          <Monster skin={skin} mode={mode} />
        </Suspense>
        {floor ? (
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[0.9, 32]} />
            <meshStandardMaterial color="#1C1C22" transparent opacity={0.6} />
          </mesh>
        ) : null}
      </Canvas>
    </View>
  );
}
