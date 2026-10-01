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

function randomKind(): EntityKind {
  const roll = Math.random();
  if (roll < 0.38) return 'healthy';
  if (roll < 0.62) return 'coin';
  return 'junk';
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

/** Activate an inactive pooled entity near the top. Returns false if pool full. */
export function spawnEntity(pool: GameEntity[]): boolean {
  const slot = pool.find((e) => !e.active);
  if (!slot) return false;
  const kind = randomKind();
  slot.kind = kind;
  slot.variant = pickVariant(kind);
  slot.lane = randomLane();
  slot.y = -0.08 - Math.random() * 0.12;
  slot.active = true;
  slot.collected = false;
  return true;
}

export function recycleEntity(entity: GameEntity): void {
  entity.active = false;
  entity.collected = false;
  entity.y = -0.2;
}
