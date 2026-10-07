import { MAX_ENERGY, SPEED_INTERVAL_MS } from '../../data/theme';
import { DEFAULT_UPGRADES, type Upgrades } from '../../data/shop';
import {
  BARRIER_HEIGHT,
  BODIES,
  choosePattern,
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
  TRUCK_HEIGHT,
  type LaneIndex,
  type PatternId,
  type Slot,
} from './patterns';

export type RunStats = {
  score: number;
  coins: number;
  distance: number;
  energy: number;
  proteins: number;
  multiplier: number;
  speed: number;
  /** Seconds of power mode left (0 = off). */
  power: number;
  /** Protein cartons collected toward the next power mode. */
  powerCharge: number;
  level: number;
  /** Distance at which the current level ends. */
  levelGoal: number;
  /** Truck roofs / platforms landed on. */
  roofs: number;
  /** Junk food barriers cleared by jumping or smashed in power mode. */
  junkDodged: number;
  /** Pickups in a row. Resets on a hit or after a short gap. */
  combo: number;
  bestCombo: number;
  /** Close calls rewarded this run. */
  nearMisses: number;
  /** 0 = lean good body, 1 = stuffed from junk food. */
  bulk: number;
  /** Seconds left on the pickup combo window. */
  comboT: number;
  /** Combo score tier: 1, 2, 3 or 5. */
  comboMult: number;
  /** Whey magnet seconds left. */
  magnet: number;
  /** Creatine gold-shield seconds left. */
  shield: number;
  /** Pre-workout x2-score seconds left. */
  boost: number;
};

/** Gameplay feedback; some drive toasts, the rest drive VFX/camera/audio. */
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
  | 'speedup'
  | 'power'
  | 'smash'
  | 'slap'
  | 'kick'
  /** A slapped pedestrian starts doing cardio on the sidewalk. */
  | 'convert'
  | 'space'
  /** Hit flavour, emitted right after 'hit': junk food vs. trucks/signs. */
  | 'burp'
  | 'bonk'
  | 'level'
  | 'combo'
  | 'nearMiss'
  | 'lowEnergy'
  | 'death'
  | 'bike'
  | 'gymZone'
  | 'creatine'
  | 'prework'
  | 'magnet';

export type RunInput = {
  lane: number;
  jumpQueued: boolean;
  slideQueued: boolean;
};

export type RunState = {
  x: number;
  /** Lateral velocity of the eased lane change. */
  vx: number;
  y: number;
  vy: number;
  airborne: boolean;
  onRoof: boolean;
  /** Height of whatever is under the runner (road, roof, platform). */
  ground: number;
  /** Seconds of slide left; > 0 while sliding. */
  slideT: number;
  /** Slide requested mid-air: starts on landing. */
  slideOnLand: boolean;
  speed: number;
  speedTimer: number;
  gap: number;
  nextPattern: PatternId;
  invuln: number;
  shake: number;
  /** Seconds since the last hit (drives the stumble animation). */
  hitT: number;
  dead: boolean;
  /** Seconds left before the pickup combo expires. */
  comboT: number;
  /** 0 none, 1 hand slap, 2 foot kick. */
  attack: 0 | 1 | 2;
  /** 1 = target is on the runner's right. */
  attackSide: 1 | -1;
  /** Seconds since the current slap or kick started. */
  attackT: number;
  /** True after the low-energy warning until energy recovers. */
  warnedLow: boolean;
  /** Riding a street bicycle. */
  onBike: boolean;
  magnetT: number;
  speedBoostT: number;
  shieldT: number;
  boostT: number;
  slowT: number;
  mods: Upgrades;
  stats: RunStats;
};

export const BASE_SPEED = 18;
const SPEED_STEP = 3;
const MAX_SPEED = 36;
const ENERGY_DRAIN_PER_S = 1.4;
const HIT_INVULN_S = 0.9;
const ROOF_BONUS = 40;
/** Critically damped lane spring (rad/s): eases in and out with no overshoot. */
const LANE_OMEGA = 15;
/** Any jump this close to the top of a block when meeting its front climbs onto it. */
const CLIMB_ASSIST = 1.3;
export const SLIDE_TIME = 0.75;
const FAST_FALL_VY = -26;
const STAND_HEIGHT = 1.9;
const SLIDE_HEIGHT = 0.85;
/** Player half-width + block half-width for lateral overlap. */
const BODY_REACH = 1.05;
const SMALL_REACH = 0.95;
export const POWER_TIME = 8;
export const POWER_CHARGE = 3;
/** Coins paid for every slapped or kicked pedestrian. */
export const SLAP_COINS = 2;
/** Coins for reaching a new biome during a run. */
export const SPACE_BONUS = 25;
const DANCE_CHANCE = 0.35;
const DANCE_HOP = 7;
/** Sidewalk line converted pedestrians jog along. */
const DANCE_X = 3.7;
/** Fraction of the run speed a converted jogging buddy keeps up with. */
const BUDDY_PACE = 0.86;
export const LEVEL_BONUS_COINS = 250;
/** Pickup chain stays alive this long between collects. */
export const COMBO_WINDOW = 1.8;
export const REVIVE_COST = 50;
export const REVIVE_INVULN_S = 2;
export const MAGNET_TIME = 8;
export const SHIELD_TIME = 5;
export const BOOST_TIME = 10;
const GYM_ZONE_EVERY = 500;
const LOW_ENERGY = 25;
/** No energy drain until the runner is past the opening stretch. */
const GRACE_DISTANCE = 80;
/** Metres in level 1. Old value was 500 — runs were clearing in ~30s. */
const LEVEL_BASE = 1200;
/** Extra metres stacked onto each later level's span so the road keeps growing. */
const LEVEL_GROWTH = 180;
const BIKE_BONUS = 8;

/**
 * Cumulative distance at which `level` ends.
 * Level 1 is 1200 m (2.4× the old 500). Later spans grow faster:
 * 2760, 4680, 6960… so a long run has a real ladder of checkpoints.
 */
export function levelGoalFor(level: number): number {
  if (level <= 0) return 0;
  const L = level;
  return (LEVEL_BASE * L * (L + 1)) / 2 + (LEVEL_GROWTH * L * (L + 1) * (L - 1)) / 3;
}

export function comboTier(combo: number): 1 | 2 | 3 | 5 {
  if (combo >= 8) return 5;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

export function createRunState(mods: Upgrades = DEFAULT_UPGRADES): RunState {
  return {
    x: LANE_X[1],
    vx: 0,
    y: 0,
    vy: 0,
    airborne: false,
    onRoof: false,
    ground: 0,
    slideT: 0,
    slideOnLand: false,
    speed: BASE_SPEED,
    speedTimer: 0,
    gap: 6,
    nextPattern: 'bikes',
    invuln: 0,
    shake: 0,
    hitT: 99,
    dead: false,
    comboT: 0,
    attack: 0,
    attackSide: 1,
    attackT: 99,
    warnedLow: false,
    onBike: false,
    magnetT: 0,
    speedBoostT: 0,
    shieldT: 0,
    boostT: 0,
    slowT: 0,
    mods: { ...mods },
    stats: {
      score: 0,
      coins: 0,
      distance: 0,
      energy: MAX_ENERGY,
      proteins: 0,
      multiplier: 1,
      speed: BASE_SPEED,
      power: 0,
      powerCharge: 0,
      level: 1,
      levelGoal: levelGoalFor(1),
      roofs: 0,
      junkDodged: 0,
      combo: 0,
      bestCombo: 0,
      nearMisses: 0,
      bulk: 0,
      comboT: 0,
      comboMult: 1,
      magnet: 0,
      shield: 0,
      boost: 0,
    },
  };
}

/** One continue: restore energy, 2s invulnerability. */
export function reviveRun(s: RunState) {
  s.dead = false;
  s.stats.energy = Math.max(55, s.stats.energy);
  s.invuln = REVIVE_INVULN_S;
  s.hitT = 99;
  s.shake = 0.12;
}

function bumpCombo(s: RunState, emit: (e: RunEvent) => void) {
  const st = s.stats;
  st.combo += 1;
  s.comboT = COMBO_WINDOW;
  st.comboMult = comboTier(st.combo);
  if (st.combo > st.bestCombo) st.bestCombo = st.combo;
  if (st.combo === 3 || (st.combo >= 5 && st.combo % 5 === 0)) {
    // Milestone juice: first pop at 3, then every 5. Coins scale with the chain.
    const bonus = Math.min(12, 2 + Math.floor(st.combo / 5));
    st.coins += bonus;
    st.score += bonus * 8 * st.multiplier;
    emit('combo');
  }
}

/** Extra score once a chain is rolling. */
function comboBonus(combo: number): number {
  return combo >= 3 ? combo : 0;
}

/** Coins paid for a stylish near miss. */
export const NEAR_MISS_COINS = 3;
const NEAR_MISS_LATERAL = 2.85;
const NEAR_MISS_SCORE = 35;

function tryNearMiss(s: RunState, slot: Slot, emit: (e: RunEvent) => void) {
  if (slot.nearMissed || slot.hit || s.dead || s.invuln > 0) return;
  const lateral = Math.abs(s.x - slot.x);
  if (lateral < 0.85 || lateral > NEAR_MISS_LATERAL) return;
  slot.nearMissed = true;
  const st = s.stats;
  st.nearMisses += 1;
  st.coins += NEAR_MISS_COINS;
  bumpCombo(s, emit);
  st.score += (NEAR_MISS_SCORE + comboBonus(st.combo)) * st.multiplier * (st.power > 0 ? 2 : 1);
  s.shake = Math.max(s.shake, 0.18);
  emit('nearMiss');
}

const overlaps = (s: RunState, slot: Slot, reach: number) => Math.abs(s.x - slot.x) < reach;

/** Ground height under the runner from blocks/ramps, before damage checks. */
/** Set by supportHeight: the support is a truck/platform top, not a ramp slope. */
let supportIsBody = false;

function supportHeight(slots: Slot[], s: RunState): number {
  let ground = 0;
  supportIsBody = false;
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
      if (s.y >= h - 1.0 && h > ground) {
        ground = h;
        supportIsBody = false;
      }
      continue;
    }
    const body = BODIES[slot.variant];
    if (!body || !overlaps(s, slot, BODY_REACH)) continue;
    if (Math.abs(slot.z - PLAYER_Z) > body.length / 2 + 0.3) continue;
    if (s.y >= body.height - ROOF_TOLERANCE && body.height >= ground) {
      ground = body.height;
      supportIsBody = true;
    }
  }
  return ground;
}

function dropBike(s: RunState, slots: Slot[]) {
  if (!s.onBike) return;
  s.onBike = false;
  for (const slot of slots) {
    if (slot.kind === 'bike' && slot.hit && slot.active) slot.active = false;
  }
}

function hurt(s: RunState, damage: number, shake: number, emit: (e: RunEvent) => void, flavour: 'burp' | 'bonk', slots?: Slot[]) {
  if (slots) dropBike(s, slots);
  const resist = 1 - 0.07 * (s.mods.force - 1);
  s.stats.energy -= damage * resist;
  s.stats.combo = 0;
  s.comboT = 0;
  s.stats.comboMult = 1;
  s.invuln = HIT_INVULN_S;
  s.shake = shake;
  s.hitT = 0;
  if (flavour === 'burp') s.slowT = Math.max(s.slowT, 1.5);
  emit('hit');
  emit(flavour);
}

/**
 * Advances one frame of the run. Returns true when a new pattern was spawned
 * (callers bind render instances to the new slots). Does nothing once dead.
 */
export function stepRun(
  s: RunState,
  slots: Slot[],
  input: RunInput,
  dt: number,
  emit: (event: RunEvent) => void,
): boolean {
  if (s.dead) return false;
  const st = s.stats;
  const prevDistance = st.distance;

  s.speedTimer += dt * 1000;
  if (s.speedTimer >= SPEED_INTERVAL_MS) {
    s.speedTimer = 0;
    s.speed = Math.min(MAX_SPEED, s.speed + SPEED_STEP);
    st.multiplier = Math.min(9, st.multiplier + 1);
    emit('speedup');
  }
  const wheyBoost = s.speedBoostT > 0 ? 4 : 0;
  const slow = s.slowT > 0 ? 0.82 : 1;
  const pace = (s.mods.vitesse - 1) * 0.35;
  st.speed = (s.speed + pace + (s.onBike ? BIKE_BONUS : 0) + wheyBoost) * slow;
  const dz = st.speed * dt;
  const mult = st.multiplier * (st.power > 0 ? 2 : 1) * (s.boostT > 0 ? 2 : 1);

  // Exact critically damped spring toward the lane centre (stable at any dt).
  const targetX = LANE_X[input.lane as LaneIndex];
  const offset = s.x - targetX;
  const decay = Math.exp(-LANE_OMEGA * dt);
  const temp = (s.vx + LANE_OMEGA * offset) * dt;
  s.vx = (s.vx - LANE_OMEGA * temp) * decay;
  s.x = targetX + (offset + temp) * decay;

  let spawned = false;
  s.gap -= dz;
  if (s.gap <= 0) {
    const depth = spawnPattern(slots, s.nextPattern);
    s.nextPattern = choosePattern(st.distance);
    s.gap = nextGap(depth, s.nextPattern, s.speed);
    if (st.distance < 420) s.gap += 8;
    else if (st.distance > 800) s.gap = Math.max(13, s.gap - 5);
    spawned = true;
  }

  const magnetR = (s.magnetT > 0 ? 3.2 : 0) + (s.mods.aimant - 1) * 0.5;
  if (magnetR > 0.15) {
    for (const slot of slots) {
      if (!slot.active || slot.popT >= 0) continue;
      if (slot.kind !== 'coin' && slot.kind !== 'healthy') continue;
      const dzp = slot.z - PLAYER_Z;
      if (dzp < -1.2 || dzp > 9) continue;
      const dx = s.x - slot.x;
      if (Math.hypot(dx, dzp * 0.4) > magnetR) continue;
      // Ease in — a hard snap stacked every banana on him in one frame.
      slot.x += dx * Math.min(1, dt * 3.2);
      slot.z += (PLAYER_Z - slot.z) * Math.min(1, dt * 1.35);
    }
  }

  for (const slot of slots) {
    if (!slot.active) continue;
    if (slot.kind === 'bike' && slot.hit && s.onBike) {
      slot.x = s.x;
      slot.z = PLAYER_Z;
      slot.y = s.y;
      slot.flyY = s.vy;
      continue;
    }
    const prevZ = slot.z;
    slot.z += dz + slot.vz * dt;
    if (slot.sway) {
      slot.phase += dt * 1.7;
      slot.x = LANE_X[slot.lane] + slot.sway * PLATFORM_SWAY * (0.5 - 0.5 * Math.cos(slot.phase));
    }
    if (slot.popT >= 0) {
      slot.popT += dt;
      if (slot.kind === 'slap' && slot.dance) {
        // Celebration hop, then jogs beside the runner on the sidewalk and
        // slowly drops back past the camera.
        if (Math.abs(slot.x) < DANCE_X) slot.x += slot.phase * dt;
        slot.vz = -s.speed * BUDDY_PACE;
        slot.flyY -= 30 * dt;
        slot.y = Math.max(0, slot.y + slot.flyY * dt);
        if (slot.z > DESPAWN_Z || slot.popT > 9) slot.active = false;
      } else if (slot.kind === 'slap') {
        slot.x += slot.phase * dt;
        slot.flyY -= 28 * dt;
        slot.y += slot.flyY * dt;
        slot.bounceT += dt;
        if (slot.y < 0 && slot.flyY < 0 && slot.bounces > 0) {
          // Cartoon bounce off the asphalt.
          slot.y = 0;
          slot.flyY *= -0.5;
          slot.phase *= 0.7;
          slot.bounces -= 1;
          slot.bounceT = 0;
        }
        if (slot.popT > 1.6 || slot.y < -4) slot.active = false;
      } else {
        slot.y += dt * 5;
        if (slot.popT > 0.28) slot.active = false;
      }
      continue;
    }
    // Stylish near-miss: hazard just slipped past in a neighbouring lane.
    if (
      !slot.nearMissed &&
      !slot.hit &&
      prevZ < PLAYER_Z &&
      slot.z >= PLAYER_Z &&
      (slot.kind === 'truck' || slot.kind === 'barrier' || slot.kind === 'overhead' || slot.kind === 'slap')
    ) {
      tryNearMiss(s, slot, emit);
    }
    const body = BODIES[slot.variant];
    const tail = body ? slot.z - body.length / 2 : slot.z;
    if (slot.kind === 'barrier' && !slot.hit && slot.z > PLAYER_Z + 1 && overlaps(s, slot, SMALL_REACH)) {
      slot.hit = true;
      st.junkDodged += 1;
    }
    if (tail > DESPAWN_Z && !(slot.kind === 'bike' && slot.hit && s.onBike)) slot.active = false;
  }

  const ground = supportHeight(slots, s);
  s.ground = ground;
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
    if (s.onBike) dropBike(s, slots);
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
  if (s.onBike) {
    for (const slot of slots) {
      if (slot.kind === 'bike' && slot.hit && slot.active) {
        slot.x = s.x;
        slot.z = PLAYER_Z;
        slot.y = s.y;
        slot.flyY = s.vy;
      }
    }
  }
  if (wasAirborne && !s.airborne) {
    emit('land');
    if (s.slideOnLand) {
      s.slideOnLand = false;
      s.slideT = SLIDE_TIME;
      emit('slide');
    }
  }

  const standingOn = !s.airborne && s.vy <= 0 && supportIsBody ? ground : 0;
  const onRoof = standingOn > 0;
  if (onRoof && !s.onRoof) {
    bumpCombo(s, emit);
    st.score += (ROOF_BONUS + comboBonus(st.combo)) * mult;
    st.roofs += 1;
    emit(standingOn >= TRUCK_HEIGHT - 0.01 ? 'roof' : 'platform');
  }
  s.onRoof = onRoof;

  s.invuln = Math.max(0, s.invuln - dt);
  s.hitT += dt;
  const height = s.slideT > 0 ? SLIDE_HEIGHT : STAND_HEIGHT;
  const lane = nearestLane(s.x);
  const aligned = Math.abs(s.x - LANE_X[lane]) < 0.95;
  const powered = st.power > 0;
  const sucking = s.magnetT > 0;
  let grabs = 0;
  const grabCap = sucking ? 2 : 4;
  let bulkShift = 0;

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
          bumpCombo(s, emit);
          st.score += (ROOF_BONUS + comboBonus(st.combo)) * mult;
          st.roofs += 1;
          emit(body.height >= TRUCK_HEIGHT - 0.01 ? 'roof' : 'platform');
        }
        continue;
      }
      if (s.invuln > 0) continue;
      slot.hit = true;
      hurt(s, body.damage, 0.5, emit, 'bonk', slots);
    } else if (slot.kind === 'barrier') {
      if (Math.abs(dzp) > 0.8 || !overlaps(s, slot, SMALL_REACH)) continue;
      if (s.y >= BARRIER_HEIGHT) continue;
      if (powered) {
        // Power mode: run straight through junk food — still a bite, so the body grows.
        slot.popT = 0;
        slot.hit = true;
        st.junkDodged += 1;
        st.bulk = Math.min(1, st.bulk + 0.16);
        bumpCombo(s, emit);
        st.score += (20 + comboBonus(st.combo)) * mult;
        emit('smash');
        continue;
      }
      if (s.invuln > 0) continue;
      slot.active = false;
      st.bulk = Math.min(1, st.bulk + 0.28);
      hurt(s, 20, 0.4, emit, 'burp', slots);
    } else if (slot.kind === 'overhead') {
      if (slot.hit || Math.abs(dzp) > 0.6 || !overlaps(s, slot, SMALL_REACH)) continue;
      const top = s.y + height;
      if (top <= OVERHEAD_BOTTOM || s.y >= OVERHEAD_TOP || s.invuln > 0) continue;
      slot.hit = true;
      hurt(s, 25, 0.5, emit, 'bonk', slots);
    } else if (slot.kind === 'slap') {
      if (slot.hit || Math.abs(dzp) > 0.75 || !overlaps(s, slot, SMALL_REACH)) continue;
      if (s.y > 1.15) continue;
      slot.popT = 0;
      slot.hit = true;
      const kick = s.slideT > 0 || s.airborne;
      const side = slot.x >= s.x ? 1 : -1;
      // Some slapped couch potatoes get the message and start cardio.
      slot.dance = !kick && (slot.seed * 7.31) % 1 < DANCE_CHANCE;
      if (slot.dance) {
        slot.phase = (slot.x === 0 ? side : Math.sign(slot.x)) * 6;
        slot.vz = 0;
        slot.flyY = DANCE_HOP;
      } else {
        // phase = sideways speed, vz = down the street, flyY = launch.
        slot.phase = side * (kick ? 8 : 14);
        slot.vz = kick ? -52 : -34;
        slot.flyY = kick ? 10 : 18;
        slot.bounces = 2;
        slot.bounceT = 99;
      }
      st.coins += SLAP_COINS;
      s.attack = kick ? 2 : 1;
      s.attackSide = slot.x >= s.x ? 1 : -1;
      s.attackT = 0;
      bumpCombo(s, emit);
      st.score += (45 + comboBonus(st.combo)) * mult;
      emit(kick ? 'kick' : 'slap');
      if (slot.dance) emit('convert');
    } else if (slot.kind === 'bike') {
      if (s.onBike || slot.hit || Math.abs(dzp) > 1.05 || !overlaps(s, slot, SMALL_REACH)) continue;
      if (s.y > 1.35) continue;
      slot.hit = true;
      s.onBike = true;
      s.vy = 0;
      s.airborne = false;
      bumpCombo(s, emit);
      st.score += (60 + comboBonus(st.combo)) * mult;
      emit('bike');
    } else if (slot.kind === 'coin' || slot.kind === 'healthy') {
      const close = Math.abs(slot.x - s.x) < (sucking ? 1.1 : 0.95) && Math.abs(dzp) < (sucking ? 1.15 : 0.85);
      if (sucking) {
        if (!close) continue;
      } else if (!aligned || slot.lane !== lane || Math.abs(dzp) > 0.85) {
        continue;
      }
      const reachY = s.slideT > 0 ? s.y + 0.4 : s.y + 1.1;
      if (Math.abs(reachY - slot.y) > 1.3) continue;
      if (grabs >= grabCap) continue;
      grabs += 1;
      slot.popT = 0;
      if (slot.kind === 'coin') {
        st.coins += 1;
        bumpCombo(s, emit);
        st.score += (10 + comboBonus(st.combo)) * mult;
        emit('coin');
      } else if (slot.variant === 'whey') {
        st.proteins += 1;
        const drop = Math.min(0.32, Math.max(0, 0.14 - bulkShift));
        bulkShift += drop;
        st.bulk = Math.max(0, st.bulk - drop);
        st.energy = Math.min(MAX_ENERGY, st.energy + 18);
        bumpCombo(s, emit);
        st.score += (50 + comboBonus(st.combo)) * mult;
        s.magnetT = MAGNET_TIME;
        s.speedBoostT = MAGNET_TIME;
        st.powerCharge += 1;
        if (st.powerCharge >= POWER_CHARGE) {
          st.powerCharge = 0;
          st.power = POWER_TIME;
          emit('power');
        } else {
          emit('magnet');
        }
      } else if (slot.variant === 'creatine') {
        st.proteins += 1;
        const drop = Math.min(0.18, Math.max(0, 0.14 - bulkShift));
        bulkShift += drop;
        st.bulk = Math.max(0, st.bulk - drop);
        st.energy = Math.min(MAX_ENERGY, st.energy + 10);
        bumpCombo(s, emit);
        st.score += (40 + comboBonus(st.combo)) * mult;
        s.shieldT = SHIELD_TIME;
        s.invuln = Math.max(s.invuln, SHIELD_TIME);
        emit('creatine');
      } else if (slot.variant === 'prework') {
        st.proteins += 1;
        const drop = Math.min(0.12, Math.max(0, 0.14 - bulkShift));
        bulkShift += drop;
        st.bulk = Math.max(0, st.bulk - drop);
        st.energy = Math.min(MAX_ENERGY, st.energy + 8);
        bumpCombo(s, emit);
        st.score += (40 + comboBonus(st.combo)) * mult;
        s.boostT = BOOST_TIME;
        emit('prework');
      } else {
        if (slot.variant === 'chicken') st.proteins += 1;
        const want = slot.variant === 'chicken' ? 0.14 : 0.1;
        const drop = Math.min(want, Math.max(0, 0.14 - bulkShift));
        bulkShift += drop;
        st.bulk = Math.max(0, st.bulk - drop);
        st.energy = Math.min(MAX_ENERGY, st.energy + 12);
        bumpCombo(s, emit);
        st.score += (30 + comboBonus(st.combo)) * mult;
        emit('healthy');
      }
    }
  }

  s.shake = Math.max(0, s.shake - dt);
  s.attackT += dt;
  st.power = Math.max(0, st.power - dt);
  s.magnetT = Math.max(0, s.magnetT - dt);
  s.speedBoostT = Math.max(0, s.speedBoostT - dt);
  s.shieldT = Math.max(0, s.shieldT - dt);
  s.boostT = Math.max(0, s.boostT - dt);
  s.slowT = Math.max(0, s.slowT - dt);
  st.magnet = s.magnetT;
  st.shield = s.shieldT;
  st.boost = s.boostT;
  if (st.combo > 0) {
    s.comboT -= dt;
    if (s.comboT <= 0) {
      st.combo = 0;
      st.comboMult = 1;
    }
  }
  st.comboT = s.comboT;
  st.comboMult = comboTier(st.combo);
  st.distance += dz;
  st.score += dz * 0.5 * st.multiplier * (st.power > 0 ? 2 : 1) * (s.boostT > 0 ? 2 : 1);
  const drain = ENERGY_DRAIN_PER_S * (1 - 0.08 * (s.mods.endurance - 1)) * (s.onBike ? 0.45 : 1);
  if (st.distance > GRACE_DISTANCE) {
    st.energy = Math.max(0, st.energy - drain * dt);
  }
  if (
    Math.floor(prevDistance / GYM_ZONE_EVERY) !== Math.floor(st.distance / GYM_ZONE_EVERY) &&
    st.distance >= GYM_ZONE_EVERY
  ) {
    s.nextPattern = 'gymZone';
    s.gap = Math.min(s.gap, 5);
    emit('gymZone');
  }
  if (st.energy > LOW_ENERGY + 15) s.warnedLow = false;
  if (!s.warnedLow && st.energy > 0 && st.energy <= LOW_ENERGY) {
    s.warnedLow = true;
    emit('lowEnergy');
  }

  if (st.distance >= st.levelGoal) {
    st.level += 1;
    st.levelGoal = levelGoalFor(st.level);
    emit('level');
  }
  if (st.energy <= 0) {
    s.dead = true;
    emit('death');
  }
  return spawned;
}
