export const LANE_X = [-2.2, 0, 2.2] as const;
export type LaneIndex = 0 | 1 | 2;

export const SPAWN_Z = -100;
export const DESPAWN_Z = 14;
export const PLAYER_Z = 0;
export const GRAVITY = -34;
/** Peak ≈ 2.9 units: a well-timed jump clears a train roof. */
export const JUMP_VELOCITY = 14;

export const CAR_LENGTH = 3.4;
export const TRAIN_CARS = 3;
export const TRAIN_LENGTH = CAR_LENGTH * TRAIN_CARS;
export const TRAIN_HEIGHT = 2.5;
/** How far below the roof the runner can be and still land on it. */
export const ROOF_TOLERANCE = 0.55;
export const RAMP_LENGTH = 5;
export const BARRIER_HEIGHT = 1.15;

/** Raised walkways / moving platforms. */
export const PLATFORM_HEIGHT = 1.4;
export const PLATFORM_LENGTH = 8;
export const WALKWAY_LENGTH = 11;
export const LOW_RAMP_LENGTH = 3.6;
/** Lateral travel of a moving platform (one lane). */
export const PLATFORM_SWAY = LANE_X[1] - LANE_X[0];

/** Overhead sign gantry: slide under the board, it is too tall to jump. */
export const OVERHEAD_BOTTOM = 1.1;
export const OVERHEAD_TOP = 3.1;

export type Kind3D = 'train' | 'platform' | 'ramp' | 'barrier' | 'overhead' | 'coin' | 'healthy';

export type JunkVariant = 'burger' | 'donut' | 'fries' | 'soda';
export type HealthyVariant = 'broccoli' | 'chicken' | 'apple' | 'whey';
export type Variant3D =
  | 'train'
  | 'platform'
  | 'walkway'
  | 'ramp'
  | 'rampLow'
  | 'overhead'
  | 'coin'
  | JunkVariant
  | HealthyVariant;

export const JUNK: readonly JunkVariant[] = ['burger', 'donut', 'fries', 'soda'];
export const HEALTHY: readonly HealthyVariant[] = ['broccoli', 'chicken', 'apple'];

export const POOL_SIZES: Record<Variant3D, number> = {
  train: 7,
  platform: 3,
  walkway: 3,
  ramp: 4,
  rampLow: 3,
  overhead: 4,
  coin: 44,
  burger: 3,
  donut: 3,
  fries: 3,
  soda: 3,
  broccoli: 3,
  chicken: 3,
  apple: 3,
  whey: 4,
};

export const SLOT_COUNT = 72;

/** Solid blocks you can stand on: height, length along Z, damage when run into. */
export const BODIES: Partial<Record<Variant3D, { height: number; length: number; damage: number }>> = {
  train: { height: TRAIN_HEIGHT, length: TRAIN_LENGTH, damage: 34 },
  platform: { height: PLATFORM_HEIGHT, length: PLATFORM_LENGTH, damage: 20 },
  walkway: { height: PLATFORM_HEIGHT, length: WALKWAY_LENGTH, damage: 20 },
};

export const RAMPS: Partial<Record<Variant3D, { height: number; length: number }>> = {
  ramp: { height: TRAIN_HEIGHT, length: RAMP_LENGTH },
  rampLow: { height: PLATFORM_HEIGHT, length: LOW_RAMP_LENGTH },
};

export type Slot = {
  active: boolean;
  kind: Kind3D;
  variant: Variant3D;
  lane: LaneIndex;
  /** World X (lane centre, or swaying for moving platforms). */
  x: number;
  z: number;
  y: number;
  /** Moving platforms: -1/1 sway direction toward the neighbour lane, 0 = static. */
  sway: number;
  /** Sway phase (radians). */
  phase: number;
  /** Seconds since pickup; -1 when not popping. */
  popT: number;
  /** Already damaged the player; ignore further contact. */
  hit: boolean;
  /** Index into the variant's render pool; -1 when unbound. */
  inst: number;
};

export function createSlots(count = SLOT_COUNT): Slot[] {
  return Array.from({ length: count }, () => ({
    active: false,
    kind: 'coin' as Kind3D,
    variant: 'coin' as Variant3D,
    lane: 1 as LaneIndex,
    x: LANE_X[1],
    z: SPAWN_Z,
    y: 0,
    sway: 0,
    phase: 0,
    popT: -1,
    hit: false,
    inst: -1,
  }));
}

function place(
  slots: Slot[],
  kind: Kind3D,
  variant: Variant3D,
  lane: LaneIndex,
  z: number,
  y: number,
  sway = 0,
): Slot | null {
  const slot = slots.find((s) => !s.active && s.inst < 0);
  if (!slot) return null;
  slot.active = true;
  slot.kind = kind;
  slot.variant = variant;
  slot.lane = lane;
  slot.x = LANE_X[lane];
  slot.z = z;
  slot.y = y;
  slot.sway = sway;
  slot.phase = 0;
  slot.popT = -1;
  slot.hit = false;
  return slot;
}

const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

function randomLane(): LaneIndex {
  return Math.floor(Math.random() * 3) as LaneIndex;
}

function otherLanes(lane: LaneIndex): [LaneIndex, LaneIndex] {
  const rest = ([0, 1, 2] as LaneIndex[]).filter((l) => l !== lane);
  return Math.random() < 0.5 ? [rest[0], rest[1]] : [rest[1], rest[0]];
}

function coinRow(slots: Slot[], lane: LaneIndex, z: number, count: number, y = 0.9) {
  for (let i = 0; i < count; i++) {
    place(slots, 'coin', 'coin', lane, z - i * 2.1, y);
  }
}

/** `frontZ` is the end nearest the player; the train extends away from it. */
function train(slots: Slot[], lane: LaneIndex, frontZ: number, withRamp: boolean, roofCoins: boolean) {
  place(slots, 'train', 'train', lane, frontZ - TRAIN_LENGTH / 2, 0);
  if (withRamp) {
    place(slots, 'ramp', 'ramp', lane, frontZ + RAMP_LENGTH / 2, 0);
  }
  if (roofCoins) {
    coinRow(slots, lane, frontZ - 0.8, 5, TRAIN_HEIGHT + 0.9);
  }
}

/** Raised walkway reached by a low ramp, coins along the top. */
function walkway(slots: Slot[], lane: LaneIndex, frontZ: number) {
  place(slots, 'ramp', 'rampLow', lane, frontZ + LOW_RAMP_LENGTH / 2, 0);
  place(slots, 'platform', 'walkway', lane, frontZ - WALKWAY_LENGTH / 2, 0);
  coinRow(slots, lane, frontZ - 1, 5, PLATFORM_HEIGHT + 0.9);
}

/**
 * Spawns one obstacle/pickup pattern at the horizon. Every pattern leaves a
 * way through: a free lane, a ramp onto the roofs, a jump, or a slide.
 */
export function spawnPattern(slots: Slot[]): void {
  const roll = Math.random();
  const lane = randomLane();
  const [a, b] = otherLanes(lane);
  const z = SPAWN_Z;

  if (roll < 0.16) {
    const ramp = Math.random() < 0.65;
    train(slots, lane, z, ramp, ramp);
    coinRow(slots, a, z, 5);
    if (Math.random() < 0.6) place(slots, 'healthy', pick(HEALTHY), b, z - 4, 0.9);
  } else if (roll < 0.28) {
    place(slots, 'barrier', pick(JUNK), lane, z, 0);
    for (let i = 0; i < 5; i++) {
      const arc = Math.sin((i / 4) * Math.PI) * 1.9;
      place(slots, 'coin', 'coin', lane, z + 4.2 - i * 2.1, 0.9 + arc);
    }
    if (Math.random() < 0.5) place(slots, 'healthy', pick(HEALTHY), a, z - 2, 0.9);
  } else if (roll < 0.4) {
    // Overhead gantries: slide under (coins sit low), or take the free lane.
    place(slots, 'overhead', 'overhead', lane, z, 0);
    place(slots, 'overhead', 'overhead', a, z, 0);
    coinRow(slots, lane, z + 4, 4, 0.45);
    place(slots, 'healthy', pick(HEALTHY), b, z, 0.9);
  } else if (roll < 0.5) {
    train(slots, a, z, true, true);
    train(slots, b, z - 3, false, false);
    place(slots, 'healthy', pick(HEALTHY), lane, z - 3, 0.9);
    coinRow(slots, lane, z - 6, 3);
  } else if (roll < 0.6) {
    // Wall of trains: get on the roofs via the ramp (or a timed jump).
    train(slots, lane, z, true, true);
    train(slots, a, z - 1.5, false, false);
    train(slots, b, z - 1.5, false, false);
    place(slots, 'healthy', 'whey', lane, z - TRAIN_LENGTH + 1, TRAIN_HEIGHT + 1);
  } else if (roll < 0.7) {
    // Walkway with a junk barrier and an overhead gantry beside it.
    walkway(slots, lane, z);
    place(slots, 'barrier', pick(JUNK), a, z - 3, 0);
    place(slots, 'overhead', 'overhead', b, z - 6, 0);
    place(slots, 'healthy', 'whey', lane, z - WALKWAY_LENGTH + 1.5, PLATFORM_HEIGHT + 1);
  } else if (roll < 0.8) {
    // Moving platform sways into a neighbour lane; hop on for the bonus.
    const edge = lane === 1 ? (Math.random() < 0.5 ? 0 : 2) : lane;
    const sway = edge === 0 ? 1 : -1;
    place(slots, 'platform', 'platform', edge as LaneIndex, z, 0, sway);
    const free = (edge === 0 ? 2 : 0) as LaneIndex;
    coinRow(slots, free, z + 2, 5);
    place(slots, 'healthy', pick(HEALTHY), 1, z - 8, 0.9);
  } else if (roll < 0.9) {
    place(slots, 'healthy', pick(HEALTHY), lane, z, 0.9);
    place(slots, 'barrier', pick(JUNK), a, z - 2, 0);
    place(slots, 'overhead', 'overhead', b, z - 2, 0);
    coinRow(slots, b, z + 3, 3, 0.45);
  } else {
    place(slots, 'healthy', 'whey', lane, z, 0.9);
    place(slots, 'barrier', pick(JUNK), a, z, 0);
    place(slots, 'barrier', pick(JUNK), b, z, 0);
  }
}

export function nextGap(): number {
  return 20 + Math.random() * 8;
}

export function nearestLane(x: number): LaneIndex {
  let best: LaneIndex = 0;
  for (const l of [1, 2] as LaneIndex[]) {
    if (Math.abs(LANE_X[l] - x) < Math.abs(LANE_X[best] - x)) best = l;
  }
  return best;
}

export function clampLane(lane: number): LaneIndex {
  return Math.max(0, Math.min(2, lane)) as LaneIndex;
}
