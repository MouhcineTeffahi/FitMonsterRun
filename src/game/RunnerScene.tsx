import { Canvas, useFrame, useThree } from '@react-three/fiber';
import React, { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import * as THREE from 'three';

import type { SkinDef } from '../data/skins';
import { playEventSfx } from './audio/sfx';
import { PostFx } from './fx/PostFx';
import { resetQuality, trackFrame } from './fx/quality';
import { Vfx, type BurstKind, type VfxHandle } from './fx/Vfx';
import { useObstaclePools } from './obstacles/EntityPools';
import { Player, type PlayerFrame, type PlayerHandle } from './player/Player';
import { createSlots, LANE_X, PLAYER_Z, POOL_SIZES, type Slot, type Variant3D } from './sim/patterns';
import { BASE_SPEED, createRunState, levelGoalFor, stepRun, type RunEvent, type RunStats } from './sim/runSim';
import { ENV, FOG_LIMIT } from './world/biomes';
import { World, type WorldHandle } from './world/World';

export type { RunStats };
export type PickupEvent = RunEvent;

export type RunControls = {
  lane: number;
  jumpQueued: boolean;
  slideQueued: boolean;
  paused: boolean;
  /** Level-complete overlay: sim paused, hero dances. */
  celebrate: boolean;
};

type Props = {
  skin: SkinDef;
  controls: React.MutableRefObject<RunControls>;
  onStats: (stats: RunStats) => void;
  onEvent: (event: PickupEvent) => void;
  onGameOver: (stats: RunStats) => void;
  onReady?: () => void;
  /** False when post-processing is bypassed (show a 2D vignette instead). */
  onPostFx?: (active: boolean) => void;
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
  smash: 'smash',
  slap: 'smash',
  kick: 'smash',
  power: 'power',
  level: 'confetti',
};

const BASE_FOV = 62;
/** Seconds the death animation plays before the Game Over screen. */
const DEATH_DELAY = 1.0;
const ARCH_VISIBLE = FOG_LIMIT + 10;
const ARCH_BEHIND = 16;
const ARCH_LEAD = 7;

export function RunnerScene(props: Props) {
  return (
    <Canvas
      style={StyleSheet.absoluteFill}
      shadows
      camera={{ position: [0, 4.6, 7.8], fov: BASE_FOV, near: 0.1, far: 400 }}
      dpr={[1, 2]}
      gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, antialias: true }}
    >
      <color attach="background" args={[ENV.city.horizon]} />
      <fog attach="fog" args={[ENV.city.fog, ENV.city.near, ENV.city.far]} />
      <Suspense fallback={null}>
        <Game {...props} />
      </Suspense>
    </Canvas>
  );
}

function Game({ skin, controls, onStats, onEvent, onGameOver, onReady, onPostFx }: Props) {
  const { camera, scene, gl } = useThree();
  const player = useRef<PlayerHandle>(null);
  const world = useRef<WorldHandle>(null);
  const vfx = useRef<VfxHandle>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const neon = useRef<THREE.PointLight>(null);
  const pools = useObstaclePools();
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
  const deathT = useRef(0);
  const statsTimer = useRef(0);
  const fovPunch = useRef(0);
  const clock = useRef(0);
  const auditFrames = useRef(0);
  const scratch = useMemo(
    () => ({ color: new THREE.Color(), look: new THREE.Vector3() }),
    [],
  );
  const frame = useMemo<PlayerFrame>(
    () => ({ airborne: false, runRate: 1, sliding: false, hitT: 99, dead: false, celebrate: false, attack: 0 as const, attackSide: 1 as const, attackT: 99, x: 0, y: 0, vx: 0, ground: 0, power: 0, dz: 0 }),
    [],
  );

  useEffect(() => {
    resetQuality();
    onReady?.();
    if (__DEV__) {
      (globalThis as { __fitMonsterDebug?: unknown }).__fitMonsterDebug = {
        run,
        slots,
        controls,
        /** Draw calls / triangles of the last rendered frame. */
        renderInfo: () => {
          // PostFx renders several passes; measure the scene pass on its own.
          const auto = gl.info.autoReset;
          gl.info.autoReset = false;
          gl.info.reset();
          gl.render(scene, camera);
          const info = { ...gl.info.render, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures };
          gl.info.autoReset = auto;
          return info;
        },
        /** Every frame must scroll the world exactly once, by exactly the sim's dz. */
        audit: () => ({ frames: auditFrames.current, ...world.current?.audit() }),
      };
    }
  }, [onReady, controls, gl, scene, camera]);

  const emit = useCallback(
    (event: RunEvent) => {
      const s = run.current;
      const burst = BURST_FOR[event];
      if (burst) vfx.current?.burst(burst, s.x, s.y + (event === 'coin' ? 1.1 : event === 'level' ? 2.5 : 0.15), PLAYER_Z - 0.2);
      if (event === 'speedup' || event === 'power') fovPunch.current = 10;
      if (event === 'hit') s.shake = Math.max(s.shake, 0.55);
      playEventSfx(event);
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
    pools.hide(slot.variant, slot.inst);
    slot.inst = -1;
  };

  useFrame((_, rawDt) => {
    const c = controls.current;
    const dt = Math.min(rawDt, 0.05);
    const s = run.current;
    trackFrame(dt);

    if (ended.current) return;
    if (c.paused) {
      // Paused (or level overlay): keep the hero animating, freeze the world.
      if (c.celebrate) {
        frame.celebrate = true;
        frame.dz = 0;
        player.current?.update(dt, frame);
      }
      return;
    }
    frame.celebrate = false;
    clock.current += dt;

    const prevDistance = s.stats.distance;
    if (stepRun(s, slots.current, c, dt, emit)) bindInstances();
    const dz = s.stats.distance - prevDistance;
    world.current?.scroll(dz);
    auditFrames.current += 1;

    const sliding = s.slideT > 0;
    frame.airborne = s.airborne;
    frame.runRate = s.speed / BASE_SPEED;
    frame.sliding = sliding;
    frame.hitT = s.hitT;
    frame.dead = s.dead;
    frame.x = s.x;
    frame.y = s.y;
    frame.vx = s.vx;
    frame.ground = s.ground;
    frame.power = s.stats.power;
    frame.attack = s.attack;
    frame.attackSide = s.attackSide;
    frame.attackT = s.attackT;
    frame.dz = dz;
    player.current?.update(dt, frame);

    const t = clock.current;
    for (const slot of slots.current) {
      if (!slot.active) {
        release(slot);
        continue;
      }
      if (slot.inst >= 0) pools.show(slot, t);
    }

    const wh = world.current;
    if (wh) {
      // The arch stands ARCH_LEAD past the goal so the celebration (sim paused
      // at the goal) is framed by it ahead of the runner, as in the mockup. The
      // sim bumps levelGoal on crossing, so the previous goal drives it after.
      const toGoal = s.stats.levelGoal - s.stats.distance;
      const pastPrev = s.stats.level > 1 ? s.stats.distance - levelGoalFor(s.stats.level - 1) : Infinity;
      wh.setFinish(
        toGoal + ARCH_LEAD < ARCH_VISIBLE
          ? PLAYER_Z - toGoal - ARCH_LEAD
          : pastPrev < ARCH_LEAD + ARCH_BEHIND
            ? PLAYER_Z - ARCH_LEAD + pastPrev
            : null,
      );

      const env = ENV[wh.currentBiome()];
      const k = Math.min(1, dt * 1.8);
      const sky = wh.sky;
      sky.uTop.value.lerp(scratch.color.set(env.skyTop), k);
      sky.uMid.value.lerp(scratch.color.set(env.skyMid), k);
      sky.uHorizon.value.lerp(scratch.color.set(env.horizon), k);
      sky.uSun.value += ((env.sun > 1 ? 1 : 0) - sky.uSun.value) * k;
      (scene.background as THREE.Color).lerp(scratch.color.set(env.horizon), k);
      const fog = scene.fog as THREE.Fog;
      fog.color.lerp(scratch.color.set(env.fog), k);
      fog.near += (env.near - fog.near) * k;
      fog.far += (env.far - fog.far) * k;
      wh.windowGlow.value += (env.windows - wh.windowGlow.value) * k;
      if (hemi.current) hemi.current.intensity += (env.hemi - hemi.current.intensity) * k;
      if (sun.current) {
        sun.current.intensity += (env.sun - sun.current.intensity) * k;
        // Shadow camera follows the runner so shadows stay sharp near him.
        sun.current.position.set(s.x + 6, 14, 5);
        sun.current.target.position.set(s.x, 0, -4);
        sun.current.target.updateMatrixWorld();
      }
      if (neon.current) {
        neon.current.intensity += (env.neon - neon.current.intensity) * k;
        neon.current.position.set(s.x, s.y + 3.2, -3);
      }
      vfx.current?.update({
        dt,
        x: s.x,
        y: s.y,
        speed: s.dead ? 0 : s.speed,
        grounded: !s.airborne && !s.dead,
        sliding,
        tunnel: env.neon > 0,
        powered: s.stats.power > 0,
      });
    }

    // Camera: lerped follow behind/above, look-ahead, soft lane lean, slide
    // crouch, hit shake and a speed-driven FOV with a punch on speed-ups.
    const shake = s.shake * 1.6;
    const shakeX = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    const shakeY = shake > 0 ? (Math.random() - 0.5) * shake * 0.7 : 0;
    camera.position.x += (s.x * 0.55 - camera.position.x) * Math.min(1, dt * 5) + shakeX;
    const camY = 4.5 + s.y * 0.75 - (sliding ? 0.55 : 0);
    camera.position.y += (camY - camera.position.y) * Math.min(1, dt * 6) + shakeY;
    camera.position.z += ((s.dead ? 9.5 : 7.8) - camera.position.z) * Math.min(1, dt * 3);
    const ahead = 10 + (s.speed - BASE_SPEED) * 0.2;
    scratch.look.set(s.x * 0.4, 1.4 + s.y * 0.7, -ahead);
    camera.lookAt(scratch.look);
    camera.rotateZ((LANE_X[c.lane as 0 | 1 | 2] - s.x) * 0.025);
    fovPunch.current = Math.max(0, fovPunch.current - dt * 14);
    const persp = camera as THREE.PerspectiveCamera;
    const fov = BASE_FOV + (s.speed - BASE_SPEED) * 0.35 + fovPunch.current + (s.stats.power > 0 ? 4 : 0);
    if (Math.abs(persp.fov - fov) > 0.01) {
      persp.fov += (fov - persp.fov) * Math.min(1, dt * 6);
      persp.updateProjectionMatrix();
    }

    if (__DEV__ && auditFrames.current % 120 === 0 && wh) {
      const a = wh.audit();
      const drift = Math.max(...a.moved.map((m) => Math.abs(m - a.dzSum)));
      if (a.scrolls !== auditFrames.current || drift > 1e-3) {
        console.warn('[world audit] scenery moved more than once per frame', a, auditFrames.current);
      }
    }

    if (s.dead) {
      deathT.current += dt;
      if (deathT.current >= DEATH_DELAY) {
        ended.current = true;
        onStats({ ...s.stats });
        onGameOver({ ...s.stats });
      }
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
      <hemisphereLight ref={hemi} args={['#CDEBFF', '#F1C9A0', ENV.city.hemi]} />
      <directionalLight
        ref={sun}
        color="#FFF0D4"
        position={[6, 14, 5]}
        intensity={ENV.city.sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={16}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={45}
      />
      <pointLight ref={neon} color="#FF2E88" intensity={0} distance={14} decay={1.5} />
      <World ref={world} />
      <Player ref={player} skin={skin} />
      <primitive object={pools.group} />
      <Vfx ref={vfx} />
      <PostFx onActive={onPostFx} />
    </>
  );
}
