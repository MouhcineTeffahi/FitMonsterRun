import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import * as THREE from 'three';

import { glowTexture } from '../obstacles/items';
import { quality } from './quality';

const MAX_PARTICLES = 280;

export type BurstKind = 'spark' | 'coin' | 'healthy' | 'protein' | 'hit' | 'roof' | 'dust' | 'smash' | 'power' | 'confetti';

export type VfxFrame = {
  dt: number;
  x: number;
  y: number;
  speed: number;
  grounded: boolean;
  sliding: boolean;
  tunnel: boolean;
  powered: boolean;
};

export type VfxHandle = {
  burst: (kind: BurstKind, x: number, y: number, z: number) => void;
  update: (f: VfxFrame) => void;
};

type Burst = { count: number; color: [number, number, number][]; speed: number; up: number; life: number; gravity: number };

const BURSTS: Record<BurstKind, Burst> = {
  spark: { count: 14, color: [[1, 0.62, 0.12]], speed: 4.5, up: 3, life: 0.45, gravity: -16 },
  // Coin sparkle: hot white/gold glints that hang in the air.
  coin: { count: 12, color: [[1.6, 1.3, 0.4], [1.8, 1.8, 1.5]], speed: 2.4, up: 2.2, life: 0.55, gravity: -2 },
  healthy: { count: 18, color: [[0.35, 1.3, 0.45]], speed: 3, up: 3, life: 0.6, gravity: -5 },
  protein: { count: 20, color: [[0.4, 0.8, 1.5]], speed: 3.4, up: 3.4, life: 0.65, gravity: -5 },
  hit: { count: 22, color: [[1.4, 0.25, 0.25]], speed: 5.5, up: 3, life: 0.5, gravity: -12 },
  roof: { count: 20, color: [[1.3, 1.0, 0.15]], speed: 5, up: 1.2, life: 0.5, gravity: -3 },
  dust: { count: 12, color: [[0.6, 0.55, 0.5]], speed: 2, up: 1.2, life: 0.55, gravity: -1 },
  smash: { count: 26, color: [[1.6, 1.1, 0.2], [1.4, 0.35, 0.3]], speed: 6, up: 4, life: 0.55, gravity: -14 },
  power: { count: 40, color: [[1.8, 1.4, 0.3], [1.8, 1.8, 1.2]], speed: 6, up: 3, life: 0.8, gravity: -2 },
  confetti: { count: 60, color: [[1.6, 0.3, 0.6], [0.3, 1.4, 1.6], [1.6, 1.3, 0.2], [0.5, 1.5, 0.4]], speed: 7, up: 7, life: 1.3, gravity: -9 },
};

/** Pooled additive point particles; all work happens in `update` (called from useFrame). */
export const Vfx = forwardRef<VfxHandle>(function Vfx(_, ref) {
  const sys = useMemo(() => {
    const pos = new Float32Array(MAX_PARTICLES * 3).fill(-999);
    const col = new Float32Array(MAX_PARTICLES * 3);
    const vel = new Float32Array(MAX_PARTICLES * 3);
    const base = new Float32Array(MAX_PARTICLES * 3);
    const life = new Float32Array(MAX_PARTICLES);
    const maxLife = new Float32Array(MAX_PARTICLES).fill(1);
    const grav = new Float32Array(MAX_PARTICLES);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -20), 200);
    const mat = new THREE.PointsMaterial({
      size: 0.34,
      map: glowTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      toneMapped: false,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return { pos, col, vel, base, life, maxLife, grav, geo, points, cursor: 0, dust: 0, streak: 0, aura: 0 };
  }, []);

  useImperativeHandle(ref, () => {
    const spawn = (
      x: number, y: number, z: number,
      vx: number, vy: number, vz: number,
      c: [number, number, number], lifeS: number, g: number,
    ) => {
      const i = sys.cursor;
      sys.cursor = (sys.cursor + 1) % MAX_PARTICLES;
      const o = i * 3;
      sys.pos[o] = x; sys.pos[o + 1] = y; sys.pos[o + 2] = z;
      sys.vel[o] = vx; sys.vel[o + 1] = vy; sys.vel[o + 2] = vz;
      sys.base[o] = c[0]; sys.base[o + 1] = c[1]; sys.base[o + 2] = c[2];
      sys.life[i] = lifeS;
      sys.maxLife[i] = lifeS;
      sys.grav[i] = g;
    };

    return {
      burst(kind, x, y, z) {
        const b = BURSTS[kind];
        const n = Math.max(3, Math.round(b.count * quality.particles));
        for (let k = 0; k < n; k++) {
          const a = Math.random() * Math.PI * 2;
          const r = b.speed * (0.4 + Math.random() * 0.6);
          const c = b.color[k % b.color.length];
          spawn(x, y, z, Math.cos(a) * r, b.up * (0.3 + Math.random()), Math.sin(a) * r, c, b.life * (0.6 + Math.random() * 0.6), b.gravity);
        }
      },
      update({ dt, x, y, speed, grounded, sliding, tunnel, powered }) {
        const q = quality.particles;
        if (grounded && q > 0.5) {
          sys.dust += dt * (sliding ? 70 : 18);
          while (sys.dust >= 1) {
            sys.dust -= 1;
            const spark = sliding && Math.random() < 0.6;
            spawn(
              x + (Math.random() - 0.5) * 0.5, y + 0.05, 0.2,
              (Math.random() - 0.5) * 1.2, 0.4 + Math.random() * (spark ? 2.5 : 1), speed * 0.55,
              spark ? [1, 0.6, 0.15] : [0.45, 0.42, 0.4], spark ? 0.3 : 0.5, spark ? -10 : -0.5,
            );
          }
        }

        if (powered) {
          // Power mode: golden embers rising off the body and streaming back.
          // Spawned around the silhouette, not over it, so the runner stays readable.
          sys.aura += dt * 40 * q;
          while (sys.aura >= 1) {
            sys.aura -= 1;
            const side = Math.random() < 0.5 ? -1 : 1;
            spawn(
              x + side * (0.45 + Math.random() * 0.4), y + 0.3 + Math.random() * 1.8, -0.2,
              side * Math.random() * 0.6, 1 + Math.random() * 1.5, speed * 0.3,
              Math.random() < 0.5 ? [1.4, 1.0, 0.2] : [1.3, 1.2, 0.7], 0.4, 0,
            );
          }
        }

        sys.streak += dt * ((speed - 16) * 2.2 + (tunnel ? 26 : 0)) * q;
        while (sys.streak >= 1) {
          sys.streak -= 1;
          const side = Math.random() < 0.5 ? -1 : 1;
          const c: [number, number, number] = tunnel
            ? Math.random() < 0.5 ? [0, 0.8, 1] : [1, 0.2, 0.55]
            : [0.8, 0.85, 0.95];
          spawn(
            side * (3 + Math.random() * 2.5), 0.6 + Math.random() * 4.5, -40 - Math.random() * 20,
            0, 0, speed * 2.4, c, 1.1, 0,
          );
        }

        const { pos, vel, col, base, life, maxLife, grav } = sys;
        for (let i = 0; i < MAX_PARTICLES; i++) {
          if (life[i] <= 0) continue;
          life[i] -= dt;
          const o = i * 3;
          if (life[i] <= 0) {
            pos[o + 1] = -999;
            col[o] = col[o + 1] = col[o + 2] = 0;
            continue;
          }
          vel[o + 1] += grav[i] * dt;
          pos[o] += vel[o] * dt;
          pos[o + 1] += vel[o + 1] * dt;
          pos[o + 2] += vel[o + 2] * dt;
          const f = life[i] / maxLife[i];
          col[o] = base[o] * f;
          col[o + 1] = base[o + 1] * f;
          col[o + 2] = base[o + 2] * f;
        }
        sys.geo.attributes.position.needsUpdate = true;
        sys.geo.attributes.color.needsUpdate = true;
      },
    };
  }, [sys]);

  return <primitive object={sys.points} />;
});
