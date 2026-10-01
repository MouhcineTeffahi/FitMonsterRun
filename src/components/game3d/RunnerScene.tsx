import { Canvas, useFrame, useThree } from '@react-three/fiber';
import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

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
import { World, type WorldHandle } from './World';

export type { RunStats };
export type PickupEvent = RunEvent;

export type RunControls = {
  lane: number;
  jumpQueued: boolean;
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

export function RunnerScene(props: Props) {
  return (
    <Canvas
      style={StyleSheet.absoluteFill}
      shadows
      camera={{ position: [0, 4.6, 7.8], fov: 62, near: 0.1, far: 160 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#8FD3F4']} />
      <fog attach="fog" args={['#BFE6FA', 40, 110]} />
      <hemisphereLight args={['#DDF2FF', '#4A4458', 0.9]} />
      <directionalLight
        position={[8, 16, 6]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={50}
      />
      <Suspense fallback={null}>
        <Game {...props} />
      </Suspense>
    </Canvas>
  );
}

function Game({ skin, controls, onStats, onEvent, onGameOver, onReady }: Props) {
  const { camera } = useThree();
  const player = useRef<PlayerHandle>(null);
  const world = useRef<WorldHandle>(null);
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

  useEffect(() => {
    onReady?.();  }, [onReady]);

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

    if (stepRun(s, slots.current, c, dt, onEvent)) bindInstances();
    world.current?.scroll(s.stats.distance - prevDistance);

    const p = player.current;
    if (p?.group) {
      p.group.position.set(s.x, s.y, PLAYER_Z);
      p.group.rotation.z = (s.x - LANE_X[c.lane as 0 | 1 | 2]) * 0.12;
      p.update(dt, s.airborne, s.speed / BASE_SPEED);
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
      g.position.set(LANE_X[slot.lane], slot.y, slot.z);
      g.scale.setScalar(slot.popT >= 0 ? Math.max(0.05, 1 - slot.popT * 3.4) : 1);
      if (slot.kind === 'coin') g.rotation.y += dt * 5;
      else if (slot.kind === 'healthy') g.rotation.y += dt * 2;
    }

    const shake = s.shake;
    const shakeX = shake > 0 ? (Math.random() - 0.5) * shake * 1.4 : 0;
    const shakeY = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    camera.position.x += (s.x * 0.55 - camera.position.x) * Math.min(1, dt * 6) + shakeX;
    const camY = 4.6 + s.y * 0.75;
    camera.position.y += (camY - camera.position.y) * Math.min(1, dt * 8) + shakeY;
    camera.lookAt(s.x * 0.4, 1.4 + s.y * 0.7, -10);

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
      <World ref={world} />
      <Player ref={player} skin={skin} />
      <EntityPools refs={pools} />
    </>
  );
}
