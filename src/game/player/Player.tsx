import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import * as THREE from 'three';

import type { SkinDef } from '../../data/skins';
import { glowTexture } from '../obstacles/items';
import { PLAYER_Z } from '../sim/patterns';
import { useFitMonster, type MonsterFrame } from './fitMonster';

/** Everything the player view needs from the sim each frame (one reused object). */
export type PlayerFrame = MonsterFrame & {
  x: number;
  y: number;
  vx: number;
  ground: number;
  /** Seconds of power mode left. */
  power: number;
  /** 0 lean, 1 fat from junk food. */
  bulk: number;
  onBike: boolean;
  /** Road scrolled this frame (moves the trail with the world). */
  dz: number;
  shield: number;
  level: number;
};

export type PlayerHandle = {
  update: (dt: number, f: PlayerFrame) => void;
};

type Props = { skin: SkinDef };

const RUNNER_HEIGHT = 2.1;
const TRAIL_POINTS = 26;

/** Ribbon trail: a pooled vertex buffer, shifted every frame (no allocations). */
function makeTrail() {
  const pos = new Float32Array(TRAIL_POINTS * 2 * 3);
  const col = new Float32Array(TRAIL_POINTS * 2 * 3);
  const idx: number[] = [];
  for (let k = 0; k < TRAIL_POINTS - 1; k++) {
    const a = k * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  mesh.frustumCulled = false;
  const hx = new Float32Array(TRAIL_POINTS);
  const hy = new Float32Array(TRAIL_POINTS);
  const hz = new Float32Array(TRAIL_POINTS);
  return { mesh, pos, col, hx, hy, hz, on: false };
}

export const Player = forwardRef<PlayerHandle, Props>(function Player({ skin }, ref) {
  const monster = useFitMonster(skin, 'run', RUNNER_HEIGHT);

  const view = useMemo(() => {
    const root = new THREE.Group();
    // The character faces +Z; the runner heads away from the camera (-Z).
    monster.object.rotation.y = Math.PI;
    root.add(monster.object);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 24),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.32, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture(), color: '#FFC400', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    glow.scale.set(3.4, 4.2, 1);
    // Behind the body: the runner occludes the centre and the halo reads as a rim.
    glow.position.set(0, 1.1, -0.5);
    root.add(glow);
    const trail = makeTrail();
    return { root, shadow, glow, trail };
  }, [monster]);

  useImperativeHandle(
    ref,
    () => ({
      update(dt, f) {
        const { root, shadow, glow, trail } = view;
        root.position.set(f.x, f.y, PLAYER_Z);
        // Lean into lane changes from the eased lateral velocity.
        root.rotation.z = Math.max(-0.24, Math.min(0.24, -f.vx * 0.028));
        monster.update(dt, f);

        const lift = Math.max(0, f.y - f.ground);
        shadow.position.set(f.x, f.ground + 0.03, PLAYER_Z);
        shadow.scale.setScalar((1 + f.bulk * 0.45) / (1 + lift * 0.35));
        (shadow.material as THREE.MeshBasicMaterial).opacity = 0.32 / (1 + lift * 0.5);

        // Power mode / creatine shield / high-level aura.
        const powered = f.power > 0 && !f.dead;
        const shielded = f.shield > 0 && !f.dead;
        const leveled = f.level >= 4 && !f.dead;
        const fadeOut = Math.min(1, (powered ? f.power : f.shield) / 0.8) || (leveled ? 0.55 : 0);
        const pulse = 0.55 + Math.sin(performance.now() * 0.012) * 0.2;
        const grow = 1 + Math.min(0.1, Math.max(0, f.level - 1) * 0.025);
        root.scale.setScalar(grow);
        if (monster.aura) {
          monster.aura.visible = powered || shielded || leveled;
          const auraMat = monster.aura.material as THREE.MeshBasicMaterial;
          auraMat.color.set(shielded ? '#FFE082' : powered ? '#FFD23F' : '#7CFF6B');
          auraMat.opacity = (powered || shielded ? 0.8 : 0.35) * pulse * Math.max(fadeOut, leveled ? 0.4 : 0);
        }
        (glow.material as THREE.SpriteMaterial).opacity = powered || shielded ? 0.22 * pulse * fadeOut : leveled ? 0.1 : 0;
        (glow.material as THREE.SpriteMaterial).color.set(shielded ? '#FFE082' : '#FFC400');

        const { hx, hy, hz, pos, col } = trail;
        if (powered && !trail.on) {
          for (let k = 0; k < TRAIL_POINTS; k++) {
            hx[k] = f.x;
            hy[k] = f.y + 1.1;
            hz[k] = PLAYER_Z + 0.3;
          }
        }
        trail.on = powered;
        trail.mesh.visible = powered;
        if (powered) {
          for (let k = TRAIL_POINTS - 1; k > 0; k--) {
            hx[k] = hx[k - 1];
            hy[k] = hy[k - 1];
            hz[k] = hz[k - 1] + f.dz;
          }
          hx[0] = f.x;
          hy[0] = f.y + 1.1;
          hz[0] = PLAYER_Z + 0.3;
          for (let k = 0; k < TRAIL_POINTS; k++) {
            const fade = (1 - k / TRAIL_POINTS) * fadeOut;
            const half = 0.6 * (1 - k / TRAIL_POINTS) + 0.08;
            const o = k * 6;
            pos[o] = hx[k];
            pos[o + 1] = hy[k] + half;
            pos[o + 2] = hz[k];
            pos[o + 3] = hx[k];
            pos[o + 4] = hy[k] - half;
            pos[o + 5] = hz[k];
            const r = 1.0 * fade;
            const g = 0.78 * fade;
            const b = 0.15 * fade;
            col[o] = r; col[o + 1] = g; col[o + 2] = b;
            col[o + 3] = r; col[o + 4] = g; col[o + 5] = b;
          }
          trail.mesh.geometry.attributes.position.needsUpdate = true;
          trail.mesh.geometry.attributes.color.needsUpdate = true;
        }
      },
    }),
    [monster, view],
  );

  return (
    <>
      <primitive object={view.root} />
      <primitive object={view.shadow} />
      <primitive object={view.trail.mesh} />
    </>
  );
});
