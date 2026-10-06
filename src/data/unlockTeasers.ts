import { SKINS, type SkinId } from './skins';
import { SPACES, type SpaceId } from './spaces';

export type UnlockTeaser = {
  kind: 'skin' | 'space';
  id: string;
  name: string;
  cost: number;
  owned: boolean;
  /** 0..1 progress toward affordability. */
  progress: number;
  remaining: number;
};

/** Next locked reward to tease on Home / Game Over (skin first, then space). */
export function nextUnlockTeaser(
  totalCoins: number,
  unlockedSkins: SkinId[],
  unlockedSpaces: SpaceId[],
): UnlockTeaser | null {
  const skin = SKINS.find((s) => s.price > 0 && !unlockedSkins.includes(s.id));
  if (skin) {
    const remaining = Math.max(0, skin.price - totalCoins);
    return {
      kind: 'skin',
      id: skin.id,
      name: skin.name,
      cost: skin.price,
      owned: false,
      progress: Math.min(1, totalCoins / skin.price),
      remaining,
    };
  }
  const space = SPACES.find((s) => s.cost > 0 && !unlockedSpaces.includes(s.id));
  if (space) {
    const remaining = Math.max(0, space.cost - totalCoins);
    return {
      kind: 'space',
      id: space.id,
      name: space.name,
      cost: space.cost,
      owned: false,
      progress: Math.min(1, totalCoins / Math.max(1, space.cost)),
      remaining,
    };
  }
  return null;
}
