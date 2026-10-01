import { Canvas, useFrame, useThree } from '@react-three/fiber';
import React, { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import * as THREE from 'three';

import type { SkinDef } from '../../data/skins';
import { createSlots, LANE_X, PLAYER_Z, POOL_SIZES, type Slot, type Variant3D } from '../../utils/runner3d';
import {
  BASE_SPEED,
  createRunState,
  stepRun,
  type RunEvent,
  type RunStats,
} from '../../utils/runSim';
import { createPoolRefs, EntityPools } from './EntityPools';
import { Player, type PlayerHandle } from './Player';
import { Vfx, type BurstKind, type VfxHandle } from './Vfx';
import { World, type Biome, type WorldHandle } from './World';

export type { RunStats };
export type PickupEvent = RunEvent;

export type RunControls = {
  lane: number;
  jumpQueued: boolean;
  slideQueued: boolean;
  paused: boolean;
};

type Props = {
  skin: SkinDef;
  controls: React.MutableRefObject<RunControls>;
  onStats: (stats: RunStats) => void;
  onEvent: (event: PickupEvent) => void;
  onGameOver: (stats: RunStats) => void;
  onReady?: () => void;
};

type Env = {
  sky: string;
  fog: string;
  near: number;
  far: number;
  hemi: number;
  sun: number;
  neon: number;
};

const ENV: Record<Biome, Env> = {
  street: { sky: '#8FD3F4', fog: '#BFE6FA', near: 40, far: 110, hemi: 0.9, sun: 1.6, neon: 0 },
  yard: { sky: '#F7B987', fog: '#F2C29A', near: 34, far: 105, hemi: 0.8, sun: 1.4, neon: 0 },
  tunnel: { sky: '#07060D', fog: '#110D20', near: 18, far: 78, hemi: 0.35, sun: 0.25, neon: 9 },
  elevated: { sky: '#79C3F5', fog: '#D3ECFF', near: 55, far: 150, hemi: 1.0, sun: 1.8, neon: 0 },
};

const BURST_FOR: Partial<Record<RunEvent, BurstKind>> = {
  coin: 'coin',
  healthy: 'healthy',
  protein: 'protein',
  hit: 'hit',
  roof: 'roof',
  platform: 'roof',
  jump: 'spark',
  land: 'spark',
  slide: 'dust',
};

const BASE_FOV = 62;

export function RunnerScene(props: Props) {
  return (
    <Canvas
      style={StyleSheet.absoluteFill}
      shadows
      camera={{ position: [0, 4.6, 7.8], fov: BASE_FOV, near: 0.1, far: 220 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[ENV.street.sky]} />
      <fog attach="fog" args={[ENV.street.fog, ENV.street.near, ENV.street.far]} />
      <Suspense fallback={null}>
        <Game {...props} />
      </Suspense>
    </Canvas>
  );
}

function Game({ skin, controls, onStats, onEvent, onGameOver, onReady }: Props) {
  const { camera, scene } = useThree();
  const player = useRef<PlayerHandle>(null);
  const world = useRef<WorldHandle>(null);
  const vfx = useRef<VfxHandle>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const neon = useRef<THREE.PointLight>(null);
  const pools = useMemo(createPoolRefs, []);
  const used = useMemo(() => {
    const u = {} as Record<Variant3D, boolean[]>;
    (Object.keys(POOL_SIZES) as Variant3D[]).forEach((v) => {
      u[v] = new Array(POOL_SIZES[v]).fill(false);
    });
    return u;
  }, []);
  const slots = useRef<Slot[]>(createSlots());
  const run = useRef(createRunState());
  const ended = useRef(false);
  const statsTimer = useRef(0);
  const fovPunch = useRef(0);
  const envColors = useMemo(
    () => ({ sky: new THREE.Color(), fog: new THREE.Color(), tmp: new THREE.Color() }),
    [],
  );

  useEffect(() => {
    onReady?.();
    if (__DEV__) (globalThis as { __fitMonsterDebug?: unknown }).__fitMonsterDebug = { run, slots, controls };
  }, [onReady, controls]);

  const emit = useCallback(
    (event: RunEvent) => {
      const s = run.current;
      const burst = BURST_FOR[event];
      if (burst) vfx.current?.burst(burst, s.x, s.y + (event === 'coin' ? 1.1 : 0.15), PLAYER_Z - 0.2);
      if (event === 'speedup') fovPunch.current = 10;
      if (event === 'hit') s.shake = Math.max(s.shake, 0.55);
      onEvent(event);
    },
    [onEvent],
  );

  const bindInstances = () => {
    for (const slot of slots.current) {
      if (!slot.active || slot.inst >= 0) continue;
      const free = used[slot.variant].indexOf(false);
      if (free < 0) {
        slot.active = false;
        continue;
      }
      used[slot.variant][free] = true;
      slot.inst = free;
    }
  };

  const release = (slot: Slot) => {
    if (slot.inst < 0) return;
    used[slot.variant][slot.inst] = false;
    const g = pools[slot.variant][slot.inst];
    if (g) g.visible = false;
    slot.inst = -1;
  };

  useFrame((_, rawDt) => {
    const c = controls.current;
    if (ended.current || c.paused) return;
    const dt = Math.min(rawDt, 0.05);
    const s = run.current;
    const prevDistance = s.stats.distance;

    if (stepRun(s, slots.current, c, dt, emit)) bindInstances();
    world.current?.scroll(s.stats.distance - prevDistance);

    const sliding = s.slideT > 0;
    const p = player.current;
    if (p?.group) {
      p.group.position.set(s.x, s.y, PLAYER_Z);
      p.group.rotation.z = (s.x - LANE_X[c.lane as 0 | 1 | 2]) * 0.12;
      p.update(dt, s.airborne, s.speed / BASE_SPEED, sliding);
    }

    for (const slot of slots.current) {
      if (!slot.active) {
        release(slot);
        continue;
      }
      if (slot.inst < 0) continue;
      const g = pools[slot.variant][slot.inst];
      if (!g) continue;
      g.visible = true;
      g.position.set(slot.x, slot.y, slot.z);
      g.scale.setScalar(slot.popT >= 0 ? Math.max(0.05, 1 - slot.popT * 3.4) : 1);
      if (slot.kind === 'coin') g.rotation.y += dt * 5;
      else if (slot.kind === 'healthy') g.rotation.y += dt * 2;
      else if (slot.sway) g.position.y = Math.sin(slot.phase * 2) * 0.05;
    }

    const biome = world.current?.currentBiome() ?? 'street';
    const env = ENV[biome];
    const k = Math.min(1, dt * 1.8);
    const bg = scene.background as THREE.Color;
    bg.lerp(envColors.tmp.set(env.sky), k);
    const fog = scene.fog as THREE.Fog;
    fog.color.lerp(envColors.tmp.set(env.fog), k);
    fog.near += (env.near - fog.near) * k;
    fog.far += (env.far - fog.far) * k;
    if (hemi.current) hemi.current.intensity += (env.hemi - hemi.current.intensity) * k;
    if (sun.current) sun.current.intensity += (env.sun - sun.current.intensity) * k;
    if (neon.current) {
      neon.current.intensity += (env.neon - neon.current.intensity) * k;
      neon.current.position.set(s.x, s.y + 3.2, -3);
    }

    vfx.current?.update({
      dt,
      x: s.x,
      y: s.y,
      speed: s.speed,
      grounded: !s.airborne,
      sliding,
      tunnel: biome === 'tunnel',
    });

    // Camera: behind and above, slight look-ahead, lane lean, slide crouch, hit shake, FOV punch.
    const shake = s.shake * 1.8;
    const shakeX = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    const shakeY = shake > 0 ? (Math.random() - 0.5) * shake * 0.7 : 0;
    const follow = Math.min(1, dt * 6);
    camera.position.x += (s.x * 0.55 - camera.position.x) * follow + shakeX;
    const camY = 4.6 + s.y * 0.75 - (sliding ? 0.6 : 0);
    camera.position.y += (camY - camera.position.y) * Math.min(1, dt * 8) + shakeY;
    camera.position.z = 7.8;
    const ahead = 10 + (s.speed - BASE_SPEED) * 0.2;
    camera.lookAt(s.x * 0.4, 1.4 + s.y * 0.7, -ahead);
    camera.rotateZ((LANE_X[c.lane as 0 | 1 | 2] - s.x) * 0.035);
    fovPunch.current = Math.max(0, fovPunch.current - dt * 14);
    const persp = camera as THREE.PerspectiveCamera;
    const fov = BASE_FOV + (s.speed - BASE_SPEED) * 0.35 + fovPunch.current;
    if (Math.abs(persp.fov - fov) > 0.01) {
      persp.fov = fov;
      persp.updateProjectionMatrix();
    }

    if (s.stats.energy <= 0) {
      ended.current = true;
      onStats({ ...s.stats });
      onGameOver({ ...s.stats });
      return;
    }

    statsTimer.current += dt;
    if (statsTimer.current >= 0.1) {
      statsTimer.current = 0;
      onStats({ ...s.stats });
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#DDF2FF', '#4A4458', ENV.street.hemi]} />
      <directionalLight
        ref={sun}
        position={[8, 16, 6]}
        intensity={ENV.street.sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={50}
      />
      <pointLight ref={neon} color="#FF2E88" intensity={0} distance={14} decay={1.5} />
      <World ref={world} />
      <Player ref={player} skin={skin} />
      <EntityPools refs={pools} />
      <Vfx ref={vfx} />
    </>
  );
}
