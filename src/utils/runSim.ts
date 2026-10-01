import { MAX_ENERGY, SPEED_INTERVAL_MS } from '../data/theme';
import {
  BARRIER_HEIGHT,
  BODIES,
  DESPAWN_Z,
  GRAVITY,
  JUMP_VELOCITY,
  LANE_X,
  nearestLane,
  nextGap,
  OVERHEAD_BOTTOM,
  OVERHEAD_TOP,
  PLATFORM_SWAY,
  PLAYER_Z,
  RAMPS,
  ROOF_TOLERANCE,
  spawnPattern,
  TRAIN_HEIGHT,
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
  speed: number;
};

/** Gameplay feedback; the first five drive toasts, the rest drive VFX/camera. */
export type RunEvent =
  | 'coin'
  | 'healthy'
  | 'protein'
  | 'hit'
  | 'roof'
  | 'platform'
  | 'jump'
  | 'land'
  | 'slide'
  | 'speedup';

export type RunInput = {
  lane: number;
  jumpQueued: boolean;
  slideQueued: boolean;
};

export type RunState = {
  x: number;
  y: number;
  vy: number;
  airborne: boolean;
  onRoof: boolean;
  /** Seconds of slide left; > 0 while sliding. */
  slideT: number;
  /** Slide requested mid-air: starts on landing. */
  slideOnLand: boolean;
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
/** Any jump this close to the top of a block when meeting its front climbs onto it. */
const CLIMB_ASSIST = 1.3;
export const SLIDE_TIME = 0.75;
const FAST_FALL_VY = -26;
const STAND_HEIGHT = 1.9;
const SLIDE_HEIGHT = 0.85;
/** Player half-width + block half-width for lateral overlap. */
const BODY_REACH = 1.05;
const SMALL_REACH = 0.95;

export function createRunState(): RunState {
  return {
    x: LANE_X[1],
    y: 0,
    vy: 0,
    airborne: false,
    onRoof: false,
    slideT: 0,
    slideOnLand: false,
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
      speed: BASE_SPEED,
    },
  };
}

const overlaps = (s: RunState, slot: Slot, reach: number) => Math.abs(s.x - slot.x) < reach;

/** Ground height under the runner from blocks/ramps, before damage checks. */
function supportHeight(slots: Slot[], s: RunState): number {
  let ground = 0;
  for (const slot of slots) {
    if (!slot.active || slot.popT >= 0) continue;
    const ramp = RAMPS[slot.variant];
    if (slot.kind === 'ramp' && ramp) {
      if (!overlaps(s, slot, SMALL_REACH)) continue;
      const near = slot.z + ramp.length / 2;
      const far = slot.z - ramp.length / 2;
      if (PLAYER_Z < far - 0.4 || PLAYER_Z > near) continue;
      const t = Math.min(1, Math.max(0, (near - PLAYER_Z) / ramp.length));
      const h = ramp.height * t;
      if (s.y >= h - 1.0) ground = Math.max(ground, h);
      continue;
    }
    const body = BODIES[slot.variant];
    if (!body || !overlaps(s, slot, BODY_REACH)) continue;
    if (Math.abs(slot.z - PLAYER_Z) > body.length / 2 + 0.3) continue;
    if (s.y >= body.height - ROOF_TOLERANCE) ground = Math.max(ground, body.height);
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
    emit('speedup');
  }
  st.speed = s.speed;
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
    if (slot.sway) {
      slot.phase += dt * 1.7;
      slot.x = LANE_X[slot.lane] + slot.sway * PLATFORM_SWAY * (0.5 - 0.5 * Math.cos(slot.phase));
    }
    if (slot.popT >= 0) {
      slot.popT += dt;
      slot.y += dt * 5;
      if (slot.popT > 0.28) slot.active = false;
      continue;
    }
    const body = BODIES[slot.variant];
    const tail = body ? slot.z - body.length / 2 : slot.z;
    if (tail > DESPAWN_Z) slot.active = false;
  }

  const ground = supportHeight(slots, s);
  const grounded = s.y <= ground + 0.05;

  if (input.jumpQueued) {
    input.jumpQueued = false;
    if (grounded) {
      s.vy = JUMP_VELOCITY;
      s.slideT = 0;
      s.slideOnLand = false;
      emit('jump');
    }
  }
  if (input.slideQueued) {
    input.slideQueued = false;
    if (grounded) {
      if (s.slideT <= 0) emit('slide');
      s.slideT = SLIDE_TIME;
    } else {
      s.vy = Math.min(s.vy, FAST_FALL_VY);
      s.slideOnLand = true;
    }
  }
  s.slideT = Math.max(0, s.slideT - dt);

  const wasAirborne = s.airborne;
  // Falling over a block: drop onto it quickly so short blocks are still landable at speed.
  s.vy += GRAVITY * (s.vy < 0 && ground >= 1 ? 2.6 : 1) * dt;
  s.y += s.vy * dt;
  if (s.y <= ground) {
    s.y = ground;
    if (s.vy < 0) s.vy = 0;
  }
  s.airborne = s.y > ground + 0.05;
  if (wasAirborne && !s.airborne) {
    emit('land');
    if (s.slideOnLand) {
      s.slideOnLand = false;
      s.slideT = SLIDE_TIME;
      emit('slide');
    }
  }

  const standingOn = !s.airborne && s.vy <= 0 && ground >= 1 ? ground : 0;
  const onRoof = standingOn > 0;
  if (onRoof && !s.onRoof) {
    st.score += ROOF_BONUS * st.multiplier;
    emit(standingOn >= TRAIN_HEIGHT - 0.01 ? 'roof' : 'platform');
  }
  s.onRoof = onRoof;

  s.invuln = Math.max(0, s.invuln - dt);
  const height = s.slideT > 0 ? SLIDE_HEIGHT : STAND_HEIGHT;
  const lane = nearestLane(s.x);
  const aligned = Math.abs(s.x - LANE_X[lane]) < 0.95;

  for (const slot of slots) {
    if (!slot.active || slot.popT >= 0) continue;
    const dzp = slot.z - PLAYER_Z;
    const body = BODIES[slot.variant];
    if (body) {
      if (slot.hit || Math.abs(dzp) > body.length / 2 + 0.3 || !overlaps(s, slot, BODY_REACH)) continue;
      if (s.y >= body.height - ROOF_TOLERANCE) continue;
      if (s.y >= body.height - CLIMB_ASSIST) {
        s.y = body.height;
        s.vy = 0;
        s.airborne = false;
        if (!s.onRoof) {
          s.onRoof = true;
          st.score += ROOF_BONUS * st.multiplier;
          emit(slot.kind === 'train' ? 'roof' : 'platform');
        }
        continue;
      }
      if (s.invuln > 0) continue;
      slot.hit = true;
      st.energy -= body.damage;
      s.invuln = HIT_INVULN_S;
      s.shake = 0.5;
      emit('hit');
    } else if (slot.kind === 'barrier') {
      if (Math.abs(dzp) > 0.8 || !overlaps(s, slot, SMALL_REACH)) continue;
      if (s.y >= BARRIER_HEIGHT || s.invuln > 0) continue;
      st.energy -= 20;
      s.invuln = HIT_INVULN_S;
      s.shake = 0.4;
      slot.active = false;
      emit('hit');
    } else if (slot.kind === 'overhead') {
      if (slot.hit || Math.abs(dzp) > 0.6 || !overlaps(s, slot, SMALL_REACH)) continue;
      const top = s.y + height;
      if (top <= OVERHEAD_BOTTOM || s.y >= OVERHEAD_TOP || s.invuln > 0) continue;
      slot.hit = true;
      st.energy -= 25;
      s.invuln = HIT_INVULN_S;
      s.shake = 0.5;
      emit('hit');
    } else if ((slot.kind === 'coin' || slot.kind === 'healthy') && aligned && slot.lane === lane) {
      if (Math.abs(dzp) > 0.85) continue;
      const reachY = s.slideT > 0 ? s.y + 0.4 : s.y + 1.1;
      if (Math.abs(reachY - slot.y) > 1.3) continue;
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

  s.shake = Math.max(0, s.shake - dt);
  st.distance += dz;
  st.score += dz * 0.5 * st.multiplier;
  st.energy = Math.max(0, st.energy - ENERGY_DRAIN_PER_S * dt);
  return spawned;
}
