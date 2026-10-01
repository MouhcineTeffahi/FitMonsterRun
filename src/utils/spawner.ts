import type { EntityKind, EntityVariant, GameEntity, Lane } from '../data/types';
import { MAX_ENTITIES } from '../data/theme';

let nextId = 1;

const HEALTHY: EntityVariant[] = ['broccoli', 'chicken', 'whey'];
const JUNK: EntityVariant[] = ['burger', 'donut', 'fries'];

function pickVariant(kind: EntityKind): EntityVariant {
  if (kind === 'coin') return 'coin';
  if (kind === 'healthy') {
    return HEALTHY[Math.floor(Math.random() * HEALTHY.length)];
  }
  return JUNK[Math.floor(Math.random() * JUNK.length)];
}

function randomLane(): Lane {
  return Math.floor(Math.random() * 3) as Lane;
}

export function createEntityPool(size = MAX_ENTITIES): GameEntity[] {
  return Array.from({ length: size }, () => ({
    id: nextId++,
    kind: 'coin' as EntityKind,
    variant: 'coin' as EntityVariant,
    lane: 1 as Lane,
    y: -0.2,
    active: false,
    collected: false,
  }));
}

function activate(
  slot: GameEntity,
  kind: EntityKind,
  lane: Lane,
  y: number,
): void {
  slot.kind = kind;
  slot.variant = pickVariant(kind);
  slot.lane = lane;
  slot.y = y;
  slot.active = true;
  slot.collected = false;
}

/** Spawn pattern: coin trail, single pickup, or junk obstacle (Subway-style). */
export function spawnEntity(pool: GameEntity[]): boolean {
  const free = pool.filter((e) => !e.active);
  if (free.length === 0) return false;

  const roll = Math.random();
  const lane = randomLane();

  // Coin trail down one lane (like Subway Surfers).
  if (roll < 0.42 && free.length >= 3) {
    const count = Math.min(4, free.length);
    for (let i = 0; i < count; i++) {
      activate(free[i], 'coin', lane, -0.08 - i * 0.09);
    }
    return true;
  }

  if (roll < 0.68) {
    activate(free[0], 'healthy', lane, -0.1 - Math.random() * 0.08);
    return true;
  }

  activate(free[0], 'junk', lane, -0.1 - Math.random() * 0.08);
  // Occasionally block a second lane with junk (forces a dodge).
  if (free.length > 1 && Math.random() < 0.35) {
    const other = ((lane + 1 + Math.floor(Math.random() * 2)) % 3) as Lane;
    activate(free[1], 'junk', other, -0.18);
  }
  return true;
}

export function recycleEntity(entity: GameEntity): void {
  entity.active = false;
  entity.collected = false;
  entity.y = -0.2;
}
