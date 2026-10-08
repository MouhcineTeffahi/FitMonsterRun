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

function teaser(
  kind: 'skin' | 'space',
  id: string,
  name: string,
  cost: number,
  totalCoins: number,
): UnlockTeaser {
  const remaining = Math.max(0, cost - totalCoins);
  return {
    kind,
    id,
    name,
    cost,
    owned: false,
    progress: Math.min(1, totalCoins / Math.max(1, cost)),
    remaining,
  };
}

/** Next cheapest locked skin or space — always tease progress on Home / Game Over. */
export function nextUnlockTeaser(
  totalCoins: number,
  unlockedSkins: SkinId[],
  unlockedSpaces: SpaceId[],
): UnlockTeaser | null {
  const candidates: UnlockTeaser[] = [];
  for (const skin of SKINS) {
    if (skin.price > 0 && !unlockedSkins.includes(skin.id)) {
      candidates.push(teaser('skin', skin.id, skin.name, skin.price, totalCoins));
    }
  }
  for (const space of SPACES) {
    if (space.cost > 0 && !unlockedSpaces.includes(space.id)) {
      candidates.push(teaser('space', space.id, space.name, space.cost, totalCoins));
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.cost - b.cost || a.remaining - b.remaining);
  return candidates[0];
}
