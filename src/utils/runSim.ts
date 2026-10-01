import { MAX_ENERGY, SPEED_INTERVAL_MS } from '../data/theme';
import {
  BARRIER_HEIGHT,
  DESPAWN_Z,
  GRAVITY,
  JUMP_VELOCITY,
  LANE_X,
  nearestLane,
  nextGap,
  PLAYER_Z,
  RAMP_LENGTH,
  ROOF_TOLERANCE,
  spawnPattern,
  TRAIN_HEIGHT,
  TRAIN_LENGTH,
  type LaneIndex,
  type Slot,
} from './runner3d';

export type RunStats = {
  score: number;
  coins: number;
  distance: number;
  energy: number;
  proteins: number;
  multiplier: number;
};

export type RunEvent = 'coin' | 'healthy' | 'protein' | 'hit' | 'roof';

export type RunInput = {
  lane: number;
  jumpQueued: boolean;
};

export type RunState = {
  x: number;
  y: number;
  vy: number;
  airborne: boolean;
  onRoof: boolean;
  speed: number;
  speedTimer: number;
  gap: number;
  invuln: number;
  shake: number;
  stats: RunStats;
};

export const BASE_SPEED = 18;
const SPEED_STEP = 3;
const MAX_SPEED = 36;
const ENERGY_DRAIN_PER_S = 1.4;
const HIT_INVULN_S = 0.9;
const ROOF_BONUS = 40;
const LANE_SNAP = 14;
/** Any jump this close to roof height when meeting a train front climbs onto it. */
const CLIMB_ASSIST = 1.3;

export function createRunState(): RunState {
  return {
    x: LANE_X[1],
    y: 0,
    vy: 0,
    airborne: false,
    onRoof: false,
    speed: BASE_SPEED,
    speedTimer: 0,
    gap: 8,
    invuln: 0,
    shake: 0,
    stats: {
      score: 0,
      coins: 0,
      distance: 0,
      energy: MAX_ENERGY,
      proteins: 0,
      multiplier: 1,
    },
  };
}

/** Ground height under the runner from trains/ramps in `lane`, before damage checks. */
function supportHeight(slots: Slot[], lane: LaneIndex, y: number): number {
  let ground = 0;
  for (const slot of slots) {
    if (!slot.active || slot.popT >= 0 || slot.lane !== lane) continue;
    if (slot.kind === 'ramp') {
      const near = slot.z + RAMP_LENGTH / 2;
      const far = slot.z - RAMP_LENGTH / 2;
      if (PLAYER_Z < far - 0.4 || PLAYER_Z > near) continue;
      const t = Math.min(1, Math.max(0, (near - PLAYER_Z) / RAMP_LENGTH));
      const h = TRAIN_HEIGHT * t;
      if (y >= h - 1.0) ground = Math.max(ground, h);
    } else if (slot.kind === 'train') {
      if (Math.abs(slot.z - PLAYER_Z) > TRAIN_LENGTH / 2 + 0.3) continue;
      if (y >= TRAIN_HEIGHT - ROOF_TOLERANCE) ground = Math.max(ground, TRAIN_HEIGHT);
    }
  }
  return ground;
}

/**
 * Advances one frame of the run. Returns true when a new pattern was spawned
 * (callers bind render instances to the new slots).
 */
export function stepRun(
  s: RunState,
  slots: Slot[],
  input: RunInput,
  dt: number,
  emit: (event: RunEvent) => void,
): boolean {
  const st = s.stats;

  s.speedTimer += dt * 1000;
  if (s.speedTimer >= SPEED_INTERVAL_MS) {
    s.speedTimer = 0;
    s.speed = Math.min(MAX_SPEED, s.speed + SPEED_STEP);
    st.multiplier = Math.min(9, st.multiplier + 1);
  }
  const dz = s.speed * dt;

  const targetX = LANE_X[input.lane as LaneIndex];
  s.x += (targetX - s.x) * Math.min(1, dt * LANE_SNAP);

  let spawned = false;
  s.gap -= dz;
  if (s.gap <= 0) {
    spawnPattern(slots);
    s.gap = nextGap();
    spawned = true;
  }

  for (const slot of slots) {
    if (!slot.active) continue;
    slot.z += dz;
    if (slot.popT >= 0) {
      slot.popT += dt;
      slot.y += dt * 5;
      if (slot.popT > 0.28) slot.active = false;
      continue;
    }
    const tail = slot.kind === 'train' ? slot.z - TRAIN_LENGTH / 2 : slot.z;
    if (tail > DESPAWN_Z) slot.active = false;
  }

  const lane = nearestLane(s.x);
  const aligned = Math.abs(s.x - LANE_X[lane]) < 0.95;
  const ground = aligned ? supportHeight(slots, lane, s.y) : 0;

  if (input.jumpQueued) {
    input.jumpQueued = false;
    if (s.y <= ground + 0.05) s.vy = JUMP_VELOCITY;
  }
  s.vy += GRAVITY * dt;
  s.y += s.vy * dt;
  if (s.y <= ground) {
    s.y = ground;
    if (s.vy < 0) s.vy = 0;
  }
  s.airborne = s.y > ground + 0.05;

  const onRoof = !s.airborne && s.vy <= 0 && ground >= TRAIN_HEIGHT - 0.01;
  if (onRoof && !s.onRoof) {
    st.score += ROOF_BONUS * st.multiplier;
    emit('roof');
  }
  s.onRoof = onRoof;

  s.invuln = Math.max(0, s.invuln - dt);
  if (aligned) {
    for (const slot of slots) {
      if (!slot.active || slot.popT >= 0 || slot.lane !== lane) continue;
      const dzp = slot.z - PLAYER_Z;
      if (slot.kind === 'train') {
        if (slot.hit || Math.abs(dzp) > TRAIN_LENGTH / 2 + 0.3) continue;
        if (s.y >= TRAIN_HEIGHT - ROOF_TOLERANCE) continue;
        if (s.y >= TRAIN_HEIGHT - CLIMB_ASSIST) {
          s.y = TRAIN_HEIGHT;
          s.vy = 0;
          s.airborne = false;
          if (!s.onRoof) {
            s.onRoof = true;
            st.score += ROOF_BONUS * st.multiplier;
            emit('roof');
          }
          continue;
        }
        if (s.invuln > 0) continue;
        slot.hit = true;
        st.energy -= 34;
        s.invuln = HIT_INVULN_S;
        s.shake = 0.4;
        emit('hit');
      } else if (slot.kind === 'barrier') {
        if (Math.abs(dzp) > 0.8 || s.y >= BARRIER_HEIGHT || s.invuln > 0) continue;
        st.energy -= 20;
        s.invuln = HIT_INVULN_S;
        s.shake = 0.3;
        slot.active = false;
        emit('hit');
      } else if (slot.kind === 'coin' || slot.kind === 'healthy') {
        if (Math.abs(dzp) > 0.85 || Math.abs(s.y + 1.1 - slot.y) > 1.3) continue;
        slot.popT = 0;
        if (slot.kind === 'coin') {
          st.coins += 1;
          st.score += 10 * st.multiplier;
          emit('coin');
        } else if (slot.variant === 'whey') {
          st.proteins += 1;
          st.energy = Math.min(MAX_ENERGY, st.energy + 18);
          st.score += 50 * st.multiplier;
          emit('protein');
        } else {
          st.energy = Math.min(MAX_ENERGY, st.energy + 12);
          st.score += 30 * st.multiplier;
          emit('healthy');
        }
      }
    }
  }

  s.shake = Math.max(0, s.shake - dt);
  st.distance += dz;
  st.score += dz * 0.5 * st.multiplier;
  st.energy = Math.max(0, st.energy - ENERGY_DRAIN_PER_S * dt);
  return spawned;
}
