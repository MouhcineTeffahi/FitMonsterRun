export const LANE_X = [-2.2, 0, 2.2] as const;
export type LaneIndex = 0 | 1 | 2;

export const SPAWN_Z = -95;
export const DESPAWN_Z = 10;
export const PLAYER_Z = 0;
export const GRAVITY = -34;
export const JUMP_VELOCITY = 12.5;
export const TRAIN_LENGTH = 10;
export const TRAIN_HEIGHT = 2.6;
export const BARRIER_HEIGHT = 0.95;
export const SLOT_COUNT = 44;

export type Kind3D = 'train' | 'barrier' | 'coin' | 'healthy';

export type Variant3D =
  | 'train'
  | 'burger'
  | 'donut'
  | 'fries'
  | 'coin'
  | 'broccoli'
  | 'chicken'
  | 'whey';

export type Slot = {
  active: boolean;
  kind: Kind3D;
  variant: Variant3D;
  lane: LaneIndex;
  z: number;
  y: number;
  /** Seconds since pickup; -1 when not popping. */
  popT: number;
};

export function createSlots(count = SLOT_COUNT): Slot[] {
  return Array.from({ length: count }, () => ({
    active: false,
    kind: 'coin' as Kind3D,
    variant: 'coin' as Variant3D,
    lane: 1 as LaneIndex,
    z: SPAWN_Z,
    y: 0,
    popT: -1,
  }));
}

function place(
  slots: Slot[],
  kind: Kind3D,
  variant: Variant3D,
  lane: LaneIndex,
  z: number,
  y: number,
): void {
  const slot = slots.find((s) => !s.active);
  if (!slot) return;
  slot.active = true;
  slot.kind = kind;
  slot.variant = variant;
  slot.lane = lane;
  slot.z = z;
  slot.y = y;
  slot.popT = -1;
}

const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

const JUNK: Variant3D[] = ['burger', 'donut', 'fries'];
const HEALTHY: Variant3D[] = ['broccoli', 'chicken', 'whey'];

function randomLane(): LaneIndex {
  return Math.floor(Math.random() * 3) as LaneIndex;
}

function otherLanes(lane: LaneIndex): LaneIndex[] {
  return ([0, 1, 2] as LaneIndex[]).filter((l) => l !== lane);
}

function coinRow(slots: Slot[], lane: LaneIndex, z: number, count: number) {
  for (let i = 0; i < count; i++) {
    place(slots, 'coin', 'coin', lane, z - i * 2.2, 0.9);
  }
}

/**
 * Spawns one obstacle/pickup pattern at the horizon. Every pattern leaves
 * at least one lane passable without jumping.
 */
export function spawnPattern(slots: Slot[]): void {
  const roll = Math.random();
  const lane = randomLane();
  const [a, b] = otherLanes(lane);
  const z = SPAWN_Z;

  if (roll < 0.25) {
    place(slots, 'train', 'train', lane, z - TRAIN_LENGTH / 2, 0);
    coinRow(slots, a, z, 5);
    if (Math.random() < 0.5) place(slots, 'healthy', pick(HEALTHY), b, z - 4, 0.9);
  } else if (roll < 0.47) {
    place(slots, 'barrier', pick(JUNK), lane, z, 0);
    for (let i = 0; i < 5; i++) {
      const arc = Math.sin((i / 4) * Math.PI) * 1.8;
      place(slots, 'coin', 'coin', lane, z + 4.4 - i * 2.2, 0.9 + arc);
    }
  } else if (roll < 0.65) {
    place(slots, 'train', 'train', a, z - TRAIN_LENGTH / 2, 0);
    place(slots, 'train', 'train', b, z - TRAIN_LENGTH / 2 - 3, 0);
    place(slots, 'healthy', pick(HEALTHY), lane, z - 3, 0.9);
    coinRow(slots, lane, z - 6, 3);
  } else if (roll < 0.82) {
    place(slots, 'healthy', pick(HEALTHY), lane, z, 0.9);
    place(slots, 'barrier', pick(JUNK), a, z - 2, 0);
    coinRow(slots, b, z, 4);
  } else {
    place(slots, 'healthy', 'whey', lane, z, 0.9);
    place(slots, 'barrier', pick(JUNK), a, z, 0);
    place(slots, 'barrier', pick(JUNK), b, z, 0);
  }
}

export function nextGap(): number {
  return 16 + Math.random() * 8;
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
