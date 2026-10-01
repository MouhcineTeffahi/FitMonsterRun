import React from 'react';

import { colors } from '../../data/theme';
import { TRAIN_HEIGHT, TRAIN_LENGTH } from '../../utils/runner3d';

/** Every variant is mounted once per pooled slot; visibility is toggled by name. */
export function SlotModels() {
  return (
    <>
      <group name="train" visible={false}>
        <mesh position={[0, TRAIN_HEIGHT / 2 + 0.15, 0]}>
          <boxGeometry args={[1.9, TRAIN_HEIGHT, TRAIN_LENGTH]} />
          <meshStandardMaterial color="#C62828" />
        </mesh>
        <mesh position={[0, TRAIN_HEIGHT * 0.62, TRAIN_LENGTH / 2 + 0.01]}>
          <boxGeometry args={[1.5, 0.8, 0.02]} />
          <meshStandardMaterial color="#90CAF9" emissive="#1E3A5F" />
        </mesh>
        <mesh position={[0, TRAIN_HEIGHT * 0.25, TRAIN_LENGTH / 2 + 0.01]}>
          <boxGeometry args={[1.9, 0.18, 0.02]} />
          <meshStandardMaterial color={colors.yellow} />
        </mesh>
        <mesh position={[0, TRAIN_HEIGHT + 0.18, 0]}>
          <boxGeometry args={[1.7, 0.08, TRAIN_LENGTH - 0.4]} />
          <meshStandardMaterial color="#8E1B1B" />
        </mesh>
      </group>

      <group name="burger" visible={false}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.3, 20]} />
          <meshStandardMaterial color="#E0A050" />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 0.18, 20]} />
          <meshStandardMaterial color="#5D3A1A" />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 0.06, 20]} />
          <meshStandardMaterial color="#7CB342" />
        </mesh>
        <mesh position={[0, 0.75, 0]}>
          <sphereGeometry args={[0.72, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#E0A050" />
        </mesh>
      </group>

      <group name="donut" visible={false}>
        <mesh position={[0, 0.7, 0]}>
          <torusGeometry args={[0.5, 0.25, 12, 24]} />
          <meshStandardMaterial color="#F48FB1" />
        </mesh>
      </group>

      <group name="fries" visible={false}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.9, 0.8, 0.6]} />
          <meshStandardMaterial color="#E53935" />
        </mesh>
        {[-0.3, -0.1, 0.1, 0.3].map((x) => (
          <mesh key={x} position={[x, 0.95, 0]}>
            <boxGeometry args={[0.1, 0.5, 0.1]} />
            <meshStandardMaterial color="#FFD54F" />
          </mesh>
        ))}
      </group>

      <group name="coin" visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.1, 20]} />
          <meshStandardMaterial
            color={colors.yellow}
            emissive="#7A5200"
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      </group>

      <group name="broccoli" visible={false}>
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 0.5, 8]} />
          <meshStandardMaterial color="#9CCC65" />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.3, 12, 10]} />
          <meshStandardMaterial color={colors.green} />
        </mesh>
        <mesh position={[-0.22, 0.02, 0]}>
          <sphereGeometry args={[0.2, 10, 8]} />
          <meshStandardMaterial color="#388E3C" />
        </mesh>
        <mesh position={[0.22, 0.02, 0]}>
          <sphereGeometry args={[0.2, 10, 8]} />
          <meshStandardMaterial color="#388E3C" />
        </mesh>
      </group>

      <group name="chicken" visible={false}>
        <mesh rotation={[0, 0, 0.6]}>
          <capsuleGeometry args={[0.24, 0.4, 6, 12]} />
          <meshStandardMaterial color="#C77D3A" />
        </mesh>
        <mesh position={[0.3, -0.32, 0]} rotation={[0, 0, 0.6]}>
          <cylinderGeometry args={[0.05, 0.05, 0.3, 6]} />
          <meshStandardMaterial color="#FFF8E1" />
        </mesh>
      </group>

      <group name="whey" visible={false}>
        <mesh>
          <cylinderGeometry args={[0.36, 0.36, 0.75, 18]} />
          <meshStandardMaterial color="#1E88E5" />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.1, 18]} />
          <meshStandardMaterial color={colors.white} />
        </mesh>
        <mesh position={[0, 0, 0.37]}>
          <boxGeometry args={[0.4, 0.3, 0.02]} />
          <meshStandardMaterial color={colors.yellow} />
        </mesh>
      </group>
    </>
  );
}
