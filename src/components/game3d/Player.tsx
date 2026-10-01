import { useLoader } from '@react-three/fiber';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { SkinDef } from '../../data/skins';
import { modelUrl } from '../../utils/models';

export type PlayerHandle = {
  group: THREE.Group | null;
  update: (dt: number, airborne: boolean, runRate: number) => void;
};

type Props = { skin: SkinDef };

const RUNNER_HEIGHT = 2.1;

export const Player = forwardRef<PlayerHandle, Props>(function Player({ skin }, ref) {
  const gltf = useLoader(GLTFLoader, modelUrl('runner'));
  const group = useRef<THREE.Group>(null);
  const wasAirborne = useRef(false);

  const { model, mixer, run, jump } = useMemo(() => {
    const root = gltf.scene;
    const box = new THREE.Box3().setFromObject(root);
    const scale = RUNNER_HEIGHT / box.getSize(new THREE.Vector3()).y;
    root.scale.multiplyScalar(scale);
    root.position.y = -box.min.y * scale;
    // The model faces the camera by default; turn it to run away from it.
    root.rotation.y = Math.PI;
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });

    const m = new THREE.AnimationMixer(root);
    const clip = (name: string) => gltf.animations.find((a) => a.name === name);
    const runClip = clip('Running');
    const jumpClip = clip('Jump') ?? clip('WalkJump');
    const runAction = runClip ? m.clipAction(runClip) : null;
    const jumpAction = jumpClip ? m.clipAction(jumpClip) : null;
    if (jumpAction) {
      jumpAction.setLoop(THREE.LoopOnce, 1);
      jumpAction.clampWhenFinished = true;
    }
    runAction?.play();
    return { model: root, mixer: m, run: runAction, jump: jumpAction };
  }, [gltf]);

  useEffect(() => {
    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        const std = mat as THREE.MeshStandardMaterial;
        if (std.name === 'Main' && std.color) std.color.set(skin.primary);
        if (std.name === 'Grey' && std.color) std.color.set(skin.accent);
      });
    });
  }, [model, skin]);

  useEffect(() => () => {
    mixer.stopAllAction();
  }, [mixer]);

  useImperativeHandle(ref, () => ({
    get group() {
      return group.current;
    },
    update(dt, airborne, runRate) {
      if (airborne !== wasAirborne.current) {
        wasAirborne.current = airborne;
        if (airborne && jump) {
          jump.reset().setEffectiveTimeScale(1.4).fadeIn(0.08).play();
          run?.fadeOut(0.08);
        } else if (!airborne && run) {
          run.reset().fadeIn(0.12).play();
          jump?.fadeOut(0.12);
        }
      }
      run?.setEffectiveTimeScale(runRate);
      mixer.update(dt);
    },
  }));

  return (
    <group ref={group}>
      <primitive object={model} />
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} />
      </mesh>
    </group>
  );
});
