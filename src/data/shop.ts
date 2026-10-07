import type { SkinDef } from './skins';

/** Accessories and stat upgrades bought with dumbbells. */

export type AccessoryId = 'none' | 'bandeau' | 'gants' | 'cape';

export type AccessoryDef = {
  id: AccessoryId;
  name: string;
  price: number;
  /** Short shop blurb (French). */
  blurb: string;
};

export const ACCESSORIES: AccessoryDef[] = [
  { id: 'none', name: 'Rien', price: 0, blurb: 'Look de base' },
  { id: 'bandeau', name: 'Bandeau', price: 250, blurb: 'Style street' },
  { id: 'gants', name: 'Gants or', price: 400, blurb: 'Poignets qui brillent' },
  { id: 'cape', name: 'Cape', price: 800, blurb: 'Héros de la salle' },
];

export const DEFAULT_ACCESSORY: AccessoryId = 'none';
export const DEFAULT_UNLOCKED_ACCESSORIES: AccessoryId[] = ['none'];

export function isAccessoryId(value: unknown): value is AccessoryId {
  return ACCESSORIES.some((a) => a.id === value);
}

export function getAccessory(id: AccessoryId): AccessoryDef {
  return ACCESSORIES.find((a) => a.id === id) ?? ACCESSORIES[0];
}

export type StatId = 'force' | 'endurance' | 'vitesse' | 'aimant';

export type StatDef = {
  id: StatId;
  name: string;
  icon: string;
  blurb: string;
};

export const STATS: StatDef[] = [
  { id: 'force', name: 'Force', icon: '💪', blurb: 'Moins de dégâts aux chocs' },
  { id: 'endurance', name: 'Endurance', icon: '❤️', blurb: 'L’énergie baisse plus lentement' },
  { id: 'vitesse', name: 'Vitesse', icon: '⚡', blurb: 'Un poil plus rapide' },
  { id: 'aimant', name: 'Aimant', icon: '🧲', blurb: 'Attire haltères et bonus' },
];

export const STAT_MAX = 5;
export const STAT_COSTS = [0, 200, 450, 900, 1600] as const;

export type Upgrades = Record<StatId, number>;

export const DEFAULT_UPGRADES: Upgrades = {
  force: 1,
  endurance: 1,
  vitesse: 1,
  aimant: 1,
};

export function clampStat(n: number): number {
  return Math.max(1, Math.min(STAT_MAX, Math.floor(n) || 1));
}

export function parseUpgrades(raw: unknown): Upgrades {
  const o = raw && typeof raw === 'object' ? (raw as Partial<Upgrades>) : {};
  return {
    force: clampStat(Number(o.force)),
    endurance: clampStat(Number(o.endurance)),
    vitesse: clampStat(Number(o.vitesse)),
    aimant: clampStat(Number(o.aimant)),
  };
}

export function nextStatCost(level: number): number | null {
  if (level >= STAT_MAX) return null;
  return STAT_COSTS[level] ?? null;
}

/** Cosmetic tweaks on the existing outfit (no extra skinned meshes). */
export function withAccessory(skin: SkinDef, id: AccessoryId): SkinDef {
  if (id === 'none') return skin;
  const outfit = { ...skin.outfit };
  if (id === 'bandeau') {
    outfit.harness = '#FF4D6A';
    outfit.piping = '#FF4D6A';
    outfit.emblem = '#FF4D6A';
  } else if (id === 'gants') {
    outfit.wrist = '#FFD54F';
    outfit.hand = '#FFD54F';
  } else if (id === 'cape') {
    outfit.cape = outfit.cape ?? '#C62828';
  }
  return { ...skin, outfit };
}
