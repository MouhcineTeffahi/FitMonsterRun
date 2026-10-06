export const LANE_X = [-2.2, 0, 2.2] as const;
export type LaneIndex = 0 | 1 | 2;

export const SPAWN_Z = -100;
export const DESPAWN_Z = 14;
export const PLAYER_Z = 0;
export const GRAVITY = -34;
/** Peak ≈ 2.9 units: a well-timed jump clears a truck roof. */
export const JUMP_VELOCITY = 14;

/** How far below a roof the runner can be and still land on it. */
export const ROOF_TOLERANCE = 0.55;
export const RAMP_LENGTH = 5;
export const BARRIER_HEIGHT = 1.15;

/** Trucks: the visual meshes in obstacles/trucks.ts are built from these same numbers. */
export const TRUCK_WIDTH = 1.9;
export const TRUCK_HEIGHT = 2.5;
export const TRUCKS = {
  container: { length: 10.2, height: TRUCK_HEIGHT, damage: 34 },
  boxTruck: { length: 7, height: TRUCK_HEIGHT, damage: 30 },
  van: { length: 4.6, height: 1.5, damage: 20 },
} as const;
export type TruckVariant = keyof typeof TRUCKS;
/** Extra closing speed of oncoming trucks (units/s, toward the runner). */
export const ONCOMING_SPEED = 9;
/** Couch-potato pedestrians walk toward the runner, slower than traffic. */
export const WALK_SPEED = 3.6;

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

export type Kind3D = 'truck' | 'platform' | 'ramp' | 'barrier' | 'overhead' | 'coin' | 'healthy' | 'slap';

export type JunkVariant = 'burger' | 'donut' | 'fries' | 'soda';
export type HealthyVariant = 'broccoli' | 'chicken' | 'apple' | 'whey' | 'water';
export type Variant3D =
  | TruckVariant
  | 'platform'
  | 'walkway'
  | 'ramp'
  | 'rampLow'
  | 'overhead'
  | 'coin'
  | 'slacker'
  | JunkVariant
  | HealthyVariant;

export const JUNK: readonly JunkVariant[] = ['burger', 'donut', 'fries', 'soda'];
export const HEALTHY: readonly HealthyVariant[] = ['broccoli', 'chicken', 'apple', 'water'];

export const POOL_SIZES: Record<Variant3D, number> = {
  container: 6,
  boxTruck: 5,
  van: 5,
  platform: 3,
  walkway: 3,
  ramp: 5,
  rampLow: 3,
  overhead: 4,
  coin: 48,
  burger: 3,
  donut: 3,
  fries: 3,
  soda: 3,
  broccoli: 3,
  chicken: 3,
  apple: 3,
  whey: 4,
  water: 3,
  slacker: 8,
};

export const SLOT_COUNT = 84;

/** Solid blocks you can stand on: height, length along Z, damage when run into. */
export const BODIES: Partial<Record<Variant3D, { height: number; length: number; damage: number }>> = {
  ...TRUCKS,
  platform: { height: PLATFORM_HEIGHT, length: PLATFORM_LENGTH, damage: 20 },
  walkway: { height: PLATFORM_HEIGHT, length: WALKWAY_LENGTH, damage: 20 },
};

export const RAMPS: Partial<Record<Variant3D, { height: number; length: number }>> = {
  ramp: { height: TRUCK_HEIGHT, length: RAMP_LENGTH },
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
  /** Extra speed toward the runner (oncoming trucks); 0 = parked. */
  vz: number;
  /** Moving platforms: -1/1 sway direction toward the neighbour lane, 0 = static. */
  sway: number;
  /** Sway phase (radians). */
  phase: number;
  /** Per-slot random for colour/spin variety. */
  seed: number;
  /** Seconds since pickup; -1 when not popping. */
  popT: number;
  /** Upward speed while a slapped pedestrian is flying. */
  flyY: number;
  /** Slapped pedestrian converted to cardio: hops on the sidewalk instead of flying. */
  dance: boolean;
  /** Seconds since a flying pedestrian last bounced off the road (squash). */
  bounceT: number;
  /** Road bounces left for a flying pedestrian. */
  bounces: number;
  /** Already damaged the player; ignore further contact. */
  hit: boolean;
  /** Near-miss coin already paid for this obstacle. */
  nearMissed: boolean;
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
    vz: 0,
    sway: 0,
    phase: 0,
    seed: 0,
    popT: -1,
    flyY: 0,
    dance: false,
    bounceT: 99,
    bounces: 0,
    hit: false,
    nearMissed: false,
    inst: -1,
  }));
}

/** Farthest (most negative) z reached by the pattern being spawned. */
let patternTail = SPAWN_Z;

function place(
  slots: Slot[],
  kind: Kind3D,
  variant: Variant3D,
  lane: LaneIndex,
  z: number,
  y: number,
  sway = 0,
  vz = 0,
): Slot | null {
  let slot: Slot | null = null;
  for (const s of slots) {
    if (!s.active && s.inst < 0) {
      slot = s;
      break;
    }
  }
  if (!slot) return null;
  slot.active = true;
  slot.kind = kind;
  slot.variant = variant;
  slot.lane = lane;
  slot.x = LANE_X[lane];
  slot.z = z;
  slot.y = y;
  slot.vz = vz;
  slot.sway = sway;
  slot.phase = 0;
  slot.seed = Math.random();
  slot.popT = -1;
  slot.flyY = 0;
  slot.dance = false;
  slot.bounceT = 99;
  slot.bounces = 0;
  slot.hit = false;
  slot.nearMissed = false;
  const body = BODIES[variant];
  patternTail = Math.min(patternTail, z - (body ? body.length / 2 : 0));
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

const bigTruck = (): TruckVariant => (Math.random() < 0.55 ? 'container' : 'boxTruck');

/** Parked truck, rear toward the runner; `frontZ` is the end nearest the player. */
function truck(slots: Slot[], lane: LaneIndex, frontZ: number, variant: TruckVariant, withRamp: boolean, roofCoins: boolean) {
  const t = TRUCKS[variant];
  place(slots, 'truck', variant, lane, frontZ - t.length / 2, 0);
  if (withRamp && t.height >= TRUCK_HEIGHT) {
    place(slots, 'ramp', 'ramp', lane, frontZ + RAMP_LENGTH / 2, 0);
  }
  if (roofCoins) {
    coinRow(slots, lane, frontZ - 0.8, Math.max(2, Math.floor(t.length / 2.1)), t.height + 0.9);
  }
}

/** Raised walkway reached by a low ramp, coins along the top. */
function walkway(slots: Slot[], lane: LaneIndex, frontZ: number) {
  place(slots, 'ramp', 'rampLow', lane, frontZ + LOW_RAMP_LENGTH / 2, 0);
  place(slots, 'platform', 'walkway', lane, frontZ - WALKWAY_LENGTH / 2, 0);
  coinRow(slots, lane, frontZ - 1, 5, PLATFORM_HEIGHT + 0.9);
}

export type PatternId =
  | 'truck'
  | 'barrierArc'
  | 'overheads'
  | 'twoTrucks'
  | 'truckWall'
  | 'walkway'
  | 'movingPlatform'
  | 'mixed'
  | 'wheyBarriers'
  | 'vans'
  | 'oncoming'
  | 'slackers'
  | 'coinSnake'
  | 'conga';

const WEIGHTS: [PatternId, number][] = [
  ['truck', 14],
  ['barrierArc', 10],
  ['overheads', 10],
  ['twoTrucks', 10],
  ['truckWall', 9],
  ['walkway', 9],
  ['movingPlatform', 8],
  ['mixed', 9],
  ['wheyBarriers', 7],
  ['vans', 8],
  ['oncoming', 8],
  ['slackers', 22],
  ['coinSnake', 6],
  ['conga', 6],
];

/** Walls, doubles, and oncoming trucks wait until the runner has some speed. */
const LATE_PATTERNS: ReadonlySet<PatternId> = new Set(['truckWall', 'twoTrucks', 'oncoming']);

export function choosePattern(distance = Infinity): PatternId {
  const pool = distance < 420 ? WEIGHTS.filter(([id]) => !LATE_PATTERNS.has(id)) : WEIGHTS;
  let sum = 0;
  for (const [, w] of pool) sum += w;
  let r = Math.random() * sum;
  for (const [id, w] of pool) {
    r -= w;
    if (r < 0) return id;
  }
  return 'truck';
}

/** Patterns whose obstacles move toward the runner faster than the road. */
export const ONCOMING_PATTERNS: ReadonlySet<PatternId> = new Set(['oncoming']);

/**
 * Spawns one obstacle/pickup pattern at the horizon and returns its depth
 * (how far it extends behind SPAWN_Z). Every pattern leaves a way through: a
 * free lane, a ramp onto the roofs, a jump, or a slide.
 */
export function spawnPattern(slots: Slot[], id: PatternId): number {
  patternTail = SPAWN_Z;
  const lane = randomLane();
  const [a, b] = otherLanes(lane);
  const z = SPAWN_Z;

  switch (id) {
    case 'truck': {
      const ramp = Math.random() < 0.65;
      truck(slots, lane, z, bigTruck(), ramp, ramp);
      coinRow(slots, a, z, 5);
      if (Math.random() < 0.6) place(slots, 'healthy', pick(HEALTHY), b, z - 4, 0.9);
      if (Math.random() < 0.7) place(slots, 'slap', 'slacker', b, z - 10, 0, 0, WALK_SPEED);
      break;
    }
    case 'barrierArc': {
      place(slots, 'barrier', pick(JUNK), lane, z, 0);
      for (let i = 0; i < 5; i++) {
        const arc = Math.sin((i / 4) * Math.PI) * 1.9;
        place(slots, 'coin', 'coin', lane, z + 4.2 - i * 2.1, 0.9 + arc);
      }
      if (Math.random() < 0.5) place(slots, 'healthy', pick(HEALTHY), a, z - 2, 0.9);
      if (Math.random() < 0.65) place(slots, 'slap', 'slacker', b, z - 9, 0, 0, WALK_SPEED);
      break;
    }
    case 'overheads': {
      // Slide under (coins sit low), or take the free lane.
      place(slots, 'overhead', 'overhead', lane, z, 0);
      place(slots, 'overhead', 'overhead', a, z, 0);
      coinRow(slots, lane, z + 4, 4, 0.45);
      place(slots, 'healthy', pick(HEALTHY), b, z, 0.9);
      break;
    }
    case 'twoTrucks': {
      truck(slots, a, z, 'container', true, true);
      truck(slots, b, z - 3, 'boxTruck', false, false);
      place(slots, 'healthy', pick(HEALTHY), lane, z - 3, 0.9);
      coinRow(slots, lane, z - 6, 3);
      break;
    }
    case 'truckWall': {
      // Every lane blocked: the ramp lane is the way up (or a timed jump).
      truck(slots, lane, z, 'container', true, true);
      truck(slots, a, z - 1.5, bigTruck(), false, false);
      truck(slots, b, z - 1.5, bigTruck(), false, false);
      place(slots, 'healthy', 'whey', lane, z - TRUCKS.container.length + 1, TRUCK_HEIGHT + 1);
      break;
    }
    case 'walkway': {
      walkway(slots, lane, z);
      place(slots, 'barrier', pick(JUNK), a, z - 3, 0);
      place(slots, 'overhead', 'overhead', b, z - 6, 0);
      place(slots, 'healthy', 'whey', lane, z - WALKWAY_LENGTH + 1.5, PLATFORM_HEIGHT + 1);
      break;
    }
    case 'movingPlatform': {
      // Sways into the neighbour lane; hop on for the bonus.
      const edge = (lane === 1 ? (Math.random() < 0.5 ? 0 : 2) : lane) as LaneIndex;
      place(slots, 'platform', 'platform', edge, z, 0, edge === 0 ? 1 : -1);
      const free = (edge === 0 ? 2 : 0) as LaneIndex;
      coinRow(slots, free, z + 2, 5);
      place(slots, 'healthy', pick(HEALTHY), 1, z - 8, 0.9);
      break;
    }
    case 'mixed': {
      place(slots, 'healthy', pick(HEALTHY), lane, z, 0.9);
      place(slots, 'barrier', pick(JUNK), a, z - 2, 0);
      place(slots, 'overhead', 'overhead', b, z - 2, 0);
      coinRow(slots, b, z + 3, 3, 0.45);
      place(slots, 'slap', 'slacker', a, z - 8, 0, 0, WALK_SPEED);
      break;
    }
    case 'wheyBarriers': {
      place(slots, 'healthy', 'whey', lane, z, 0.9);
      place(slots, 'barrier', pick(JUNK), a, z, 0);
      place(slots, 'barrier', pick(JUNK), b, z, 0);
      break;
    }
    case 'vans': {
      // Low vans: jump over or land on them.
      truck(slots, lane, z, 'van', false, false);
      for (let i = 0; i < 5; i++) {
        const arc = Math.sin((i / 4) * Math.PI) * 1.4;
        place(slots, 'coin', 'coin', lane, z + 3 - i * 2.1, TRUCKS.van.height + 0.6 + arc);
      }
      if (Math.random() < 0.6) truck(slots, a, z - 6, 'van', false, false);
      place(slots, 'healthy', pick(HEALTHY), b, z - 3, 0.9);
      break;
    }
    case 'slackers': {
      // Couch potatoes in two lanes. The third lane is clear if you skip them.
      place(slots, 'slap', 'slacker', lane, z, 0, 0, WALK_SPEED);
      place(slots, 'slap', 'slacker', a, z - 5, 0, 0, WALK_SPEED);
      coinRow(slots, b, z + 1, 4);
      if (Math.random() < 0.55) place(slots, 'healthy', pick(HEALTHY), b, z - 7, 0.9);
      break;
    }
    case 'coinSnake': {
      // Breather: a coin trail weaving across all three lanes, with a whey at the end.
      const weave: LaneIndex[] = [1, 1, 2, 2, 2, 1, 0, 0, 0, 1, 2, 2, 2, 1];
      weave.forEach((l, i) => place(slots, 'coin', 'coin', l, z - i * 2.1, 0.9));
      place(slots, 'healthy', 'whey', randomLane(), z - 31, 0.9);
      break;
    }
    case 'conga': {
      // Couch-potato conga line: slap them all in a row for a combo.
      for (let i = 0; i < 3; i++) place(slots, 'slap', 'slacker', lane, z - i * 3.2, 0, 0, WALK_SPEED);
      coinRow(slots, lane, z + 4, 3);
      place(slots, 'barrier', pick(JUNK), a, z - 3, 0);
      if (Math.random() < 0.6) place(slots, 'healthy', pick(HEALTHY), b, z - 4, 0.9);
      break;
    }
    case 'oncoming': {
      // Headlights on, cab toward the runner; the other two lanes stay open.
      const len = TRUCKS.boxTruck.length;
      place(slots, 'truck', 'boxTruck', lane, z - len / 2, 0, 0, ONCOMING_SPEED);
      coinRow(slots, a, z, 6);
      if (Math.random() < 0.7) place(slots, 'healthy', pick(HEALTHY), b, z - 5, 0.9);
      break;
    }
  }
  return SPAWN_Z - patternTail;
}

/** Time to react to a new pattern plus a two-lane change (s). */
const REACTION_S = 0.35;
const TWO_LANE_SHIFT_S = 0.36;
/** Ramps and coin arcs can sit this far in front of SPAWN_Z. */
const LEAD_IN = 5;

/**
 * Distance until the next pattern spawns. Leaves enough clear road after the
 * previous pattern's tail to react and cross two lanes at the current speed,
 * and keeps oncoming trucks from catching up with the previous pattern before
 * it has passed the runner.
 */
export function nextGap(prevDepth: number, next: PatternId, speed: number): number {
  let gap = prevDepth + LEAD_IN + speed * (REACTION_S + TWO_LANE_SHIFT_S) + 3 + Math.random() * 7;
  if (ONCOMING_PATTERNS.has(next)) {
    const catchUp = (-SPAWN_Z * ONCOMING_SPEED) / (speed + ONCOMING_SPEED);
    gap = Math.max(gap, prevDepth + catchUp + 4);
  }
  return gap;
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
