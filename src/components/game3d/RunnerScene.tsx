import { Canvas, useFrame, useThree } from '@react-three/fiber';
import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import type * as THREE from 'three';

import type { SkinDef } from '../../data/skins';
import { MAX_ENERGY, SPEED_INTERVAL_MS } from '../../data/theme';
import {
  BARRIER_HEIGHT,
  createSlots,
  DESPAWN_Z,
  GRAVITY,
  JUMP_VELOCITY,
  LANE_X,
  nearestLane,
  nextGap,
  PLAYER_Z,
  spawnPattern,
  TRAIN_HEIGHT,
  TRAIN_LENGTH,
  type Slot,
} from '../../utils/runner3d';
import { Player, type PlayerHandle } from './Player';
import { SlotModels } from './SlotModels';
import { World, type WorldHandle } from './World';

export type RunControls = {
  lane: number;
  jumpQueued: boolean;
  paused: boolean;
};

export type RunStats = {
  score: number;
  coins: number;
  distance: number;
  energy: number;
  proteins: number;
  multiplier: number;
};

export type PickupEvent = 'coin' | 'healthy' | 'protein' | 'hit';

type Props = {
  skin: SkinDef;
  controls: React.MutableRefObject<RunControls>;
  onStats: (stats: RunStats) => void;
  onEvent: (event: PickupEvent) => void;
  onGameOver: (stats: RunStats) => void;
};

const BASE_SPEED = 18;
const SPEED_STEP = 3;
const MAX_SPEED = 36;
const ENERGY_DRAIN_PER_S = 1.4;
const HIT_INVULN_S = 0.9;

export function RunnerScene(props: Props) {
  return (
    <Canvas
      style={StyleSheet.absoluteFill}
      camera={{ position: [0, 4.4, 7.5], fov: 62, near: 0.1, far: 140 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#7EC8E8']} />
      <fog attach="fog" args={['#7EC8E8', 35, 100]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 12, 6]} intensity={1.3} />
      <hemisphereLight args={['#BFE6FF', '#3A3A3A', 0.5]} />
      <Game {...props} />
    </Canvas>
  );
}

function Game({ skin, controls, onStats, onEvent, onGameOver }: Props) {
  const { camera } = useThree();
  const player = useRef<PlayerHandle>(null);
  const world = useRef<WorldHandle>(null);
  const slotGroups = useRef<(THREE.Group | null)[]>([]);
  const slots = useRef<Slot[]>(createSlots());

  const sim = useRef({
    x: LANE_X[1] as number,
    y: 0,
    vy: 0,
    phase: 0,
    speed: BASE_SPEED,
    speedTimer: 0,
    gap: 6,
    invuln: 0,
    shake: 0,
    statsTimer: 0,
    ended: false,
    stats: {
      score: 0,
      coins: 0,
      distance: 0,
      energy: MAX_ENERGY,
      proteins: 0,
      multiplier: 1,
    } as RunStats,
  });

  useFrame((_, rawDt) => {
    const s = sim.current;
    const c = controls.current;
    if (s.ended || c.paused) return;
    const dt = Math.min(rawDt, 0.05);
    const st = s.stats;

    s.speedTimer += dt * 1000;
    if (s.speedTimer >= SPEED_INTERVAL_MS) {
      s.speedTimer = 0;
      s.speed = Math.min(MAX_SPEED, s.speed + SPEED_STEP);
      st.multiplier = Math.min(9, st.multiplier + 1);
    }
    const dz = s.speed * dt;

    const targetX = LANE_X[c.lane as 0 | 1 | 2];
    s.x += (targetX - s.x) * Math.min(1, dt * 14);

    const grounded = s.y <= 0.0001;
    if (c.jumpQueued) {
      c.jumpQueued = false;
      if (grounded) s.vy = JUMP_VELOCITY;
    }
    s.vy += GRAVITY * dt;
    s.y = Math.max(0, s.y + s.vy * dt);
    if (s.y === 0 && s.vy < 0) s.vy = 0;

    s.phase += dt * s.speed * 0.55;
    const p = player.current;
    if (p?.group) {
      p.group.position.set(s.x, s.y, PLAYER_Z);
      p.group.rotation.z = (s.x - targetX) * 0.12;
      p.animate(s.phase, s.y > 0.05);
    }

    world.current?.scroll(dz);

    s.gap -= dz;
    if (s.gap <= 0) {
      spawnPattern(slots.current);
      s.gap = nextGap();
    }

    s.invuln = Math.max(0, s.invuln - dt);
    const playerLane = nearestLane(s.x);
    const laneAligned = Math.abs(s.x - LANE_X[playerLane]) < 0.9;

    slots.current.forEach((slot, i) => {
      const g = slotGroups.current[i];
      if (!slot.active) {
        if (g && g.visible) g.visible = false;
        return;
      }
      slot.z += dz;

      if (slot.popT >= 0) {
        slot.popT += dt;
        slot.y += dt * 5;
        if (slot.popT > 0.28) slot.active = false;
      } else if (slot.z > DESPAWN_Z) {
        slot.active = false;
      } else if (slot.lane === playerLane && laneAligned) {
        const halfLen = slot.kind === 'train' ? TRAIN_LENGTH / 2 : 0.45;
        if (Math.abs(slot.z - PLAYER_Z) < halfLen + 0.35) {
          if (slot.kind === 'coin' || slot.kind === 'healthy') {
            if (Math.abs(s.y + 1.1 - slot.y) < 1.3) {
              slot.popT = 0;
              if (slot.kind === 'coin') {
                st.coins += 1;
                st.score += 10 * st.multiplier;
                onEvent('coin');
              } else if (slot.variant === 'whey') {
                st.proteins += 1;
                st.energy = Math.min(MAX_ENERGY, st.energy + 18);
                st.score += 50 * st.multiplier;
                onEvent('protein');
              } else {
                st.energy = Math.min(MAX_ENERGY, st.energy + 12);
                st.score += 30 * st.multiplier;
                onEvent('healthy');
              }
            }
          } else if (s.invuln <= 0) {
            const height = slot.kind === 'train' ? TRAIN_HEIGHT : BARRIER_HEIGHT;
            if (s.y < height) {
              st.energy -= slot.kind === 'train' ? 34 : 20;
              s.invuln = HIT_INVULN_S;
              s.shake = 0.35;
              if (slot.kind === 'barrier') slot.active = false;
              onEvent('hit');
            }
          }
        }
      }

      if (!g) return;
      g.visible = slot.active;
      if (!slot.active) return;
      g.position.set(LANE_X[slot.lane], slot.y, slot.z);
      const popScale = slot.popT >= 0 ? 1 + slot.popT * 3 : 1;
      g.scale.setScalar(popScale);
      if (slot.kind === 'coin') g.rotation.y += dt * 5;
      else if (slot.kind === 'healthy') g.rotation.y += dt * 2;
      else g.rotation.y = 0;
      for (const child of g.children) {
        child.visible = child.name === slot.variant;
      }
    });

    st.distance += dz;
    st.score += dz * 0.5 * st.multiplier;
    st.energy -= ENERGY_DRAIN_PER_S * dt;

    s.shake = Math.max(0, s.shake - dt);
    const shakeX = s.shake > 0 ? (Math.random() - 0.5) * s.shake * 1.4 : 0;
    const shakeY = s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0;
    camera.position.x += (s.x * 0.55 - camera.position.x) * Math.min(1, dt * 6);
    camera.position.x += shakeX;
    camera.position.y = 4.4 + s.y * 0.35 + shakeY;
    camera.lookAt(s.x * 0.4, 1.3 + s.y * 0.2, -10);

    if (st.energy <= 0) {
      st.energy = 0;
      s.ended = true;
      onStats({ ...st });
      onGameOver({ ...st });
      return;
    }

    s.statsTimer += dt;
    if (s.statsTimer >= 0.1) {
      s.statsTimer = 0;
      onStats({ ...st });
    }
  });

  return (
    <>
      <World ref={world} />
      <Player ref={player} skin={skin} />
      {slots.current.map((_, i) => (
        <group
          key={i}
          visible={false}
          ref={(g) => {
            slotGroups.current[i] = g;
          }}
        >
          <SlotModels />
        </group>
      ))}
    </>
  );
}
