import { useFrame } from '@react-three/fiber/native';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { biomeAt, setBiomeOrder, type Biome } from './biomes';
import { CityLots } from './CityLots';
import { checkerTexture } from './kit';
import { Road } from './Road';
import { createSky } from './Sky';

export type { Biome } from './biomes';

export type WorldAudit = { scrolls: number; dzSum: number; moved: number[] };

export type WorldHandle = {
  /** Moves all scenery toward the camera by dz; call exactly once per frame. */
  scroll: (dz: number) => void;
  /** Biome under the runner. */
  currentBiome: () => Biome;
  /** Places the level finish arch at world z, or hides it (null). */
  setFinish: (z: number | null) => void;
  sky: ReturnType<typeof createSky>['uniforms'];
  windowGlow: { value: number };
  /** Dev check: every scroller must have moved exactly the summed dz. */
  audit: () => WorldAudit;
};

function finishArch() {
  const g = new THREE.Group();
  const checker = checkerTexture(8);
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(9.6, 1.3),
    new THREE.MeshBasicMaterial({ map: checker, side: THREE.DoubleSide }),
  );
  checker.wrapS = checker.wrapT = THREE.RepeatWrapping;
  checker.repeat.set(4, 0.65);
  banner.position.set(0, 6.4, 0);
  g.add(banner);
  const postMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.4 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 7.1, 10), postMat);
    post.position.set(side * 4.8, 3.55, 0);
    post.castShadow = true;
    g.add(post);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: '#FFC400', toneMapped: false }));
    flag.position.set(side * 4.8, 7.3, 0);
    g.add(flag);
  }
  const lineTex = checkerTexture(8);
  lineTex.wrapS = lineTex.wrapT = THREE.RepeatWrapping;
  lineTex.repeat.set(6, 1);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.4), new THREE.MeshStandardMaterial({ map: lineTex, roughness: 0.7 }));
  line.rotation.x = -Math.PI / 2;
  line.position.y = 0.015;
  line.receiveShadow = true;
  g.add(line);
  g.visible = false;
  return g;
}

type WorldProps = { biomes: readonly Biome[] };

export const World = forwardRef<WorldHandle, WorldProps>(function World({ biomes }, ref) {
  const parts = useMemo(() => {
    setBiomeOrder(biomes);
    const road = new Road();
    const lots = new CityLots();
    const sky = createSky();
    const arch = finishArch();
    return { road, lots, sky, arch };
  }, [biomes]);
  const state = useRef({ distance: 0, scrolls: 0, dzSum: 0 });

  useEffect(() => () => {
    parts.sky.mesh.geometry.dispose();
  }, [parts]);

  useFrame(({ camera, clock }) => {
    parts.sky.mesh.position.copy(camera.position);
    parts.lots.tick(clock.elapsedTime);
  });

  useImperativeHandle(
    ref,
    () => ({
      scroll(dz) {
        const s = state.current;
        s.scrolls += 1;
        s.dzSum += dz;
        s.distance += dz;
        parts.lots.distance = s.distance;
        parts.lots.scroll(dz);
        parts.road.scroll(dz);
      },
      currentBiome() {
        return biomeAt(state.current.distance);
      },
      setFinish(z) {
        parts.arch.visible = z !== null;
        if (z !== null) parts.arch.position.z = z;
      },
      sky: parts.sky.uniforms,
      windowGlow: parts.lots.windowGlow,
      audit() {
        const s = state.current;
        return { scrolls: s.scrolls, dzSum: s.dzSum, moved: [parts.lots.scroller.moved, parts.road.dashes.moved] };
      },
    }),
    [parts],
  );

  return (
    <group>
      <primitive object={parts.sky.mesh} />
      <primitive object={parts.road.group} />
      <primitive object={parts.lots.group} />
      <primitive object={parts.arch} />
    </group>
  );
});
