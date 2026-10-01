import { Canvas, useFrame, useThree } from '@react-three/fiber';
import React, { Suspense, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { SkinDef } from '../../data/skins';
import { useFitMonster } from './fitMonster';

type Props = {
  skin: SkinDef;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 1.9;

function Monster({ skin }: { skin: SkinDef }) {
  const monster = useFitMonster(skin, 'pose', HEIGHT);
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(0, HEIGHT * 0.5, 0);
  }, [camera]);

  useFrame((state, dt) => {
    monster.update(Math.min(dt, 0.05));
    monster.object.rotation.y = -0.25 + Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
  });

  return <primitive object={monster.object} />;
}

/** Live 3D preview of the Fit Monster in its menu "thinking" pose. */
export function MonsterShowcase({ skin, style }: Props) {
  return (
    <View style={style}>
      <Canvas
        style={StyleSheet.absoluteFill}
        shadows
        camera={{ position: [0, HEIGHT * 0.52, 4.0], fov: 30 }}
        dpr={[1, 2]}
        gl={{ alpha: true }}
      >
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#FFF6DA', '#2A2433', 0.7]} />
        <directionalLight position={[2.5, 4, 3]} intensity={2.1} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.9} color="#FCB202" />
        <Suspense fallback={null}>
          <Monster skin={skin} />
        </Suspense>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.9, 32]} />
          <meshStandardMaterial color="#1C1C22" />
        </mesh>
      </Canvas>
    </View>
  );
}
