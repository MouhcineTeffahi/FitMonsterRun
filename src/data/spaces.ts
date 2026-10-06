import { BIOMES, type Biome } from '../game/world/biomes';

export type SpaceId = 'tour' | 'downtown' | 'beach' | 'night' | 'sunset' | 'gym' | 'desert';

export type SpaceDef = {
  id: SpaceId;
  name: string;
  tagline: string;
  emoji: string;
  /** Biome rotation for a run in this space. */
  biomes: readonly Biome[];
  /** Coins to unlock; 0 = free. */
  cost: number;
  /** Card gradient (top, bottom) for the space picker. */
  colors: [string, string];
};

export const SPACES: readonly SpaceDef[] = [
  { id: 'tour', name: 'WORLD TOUR', tagline: 'Tous les mondes, en rotation', emoji: '🌍', biomes: BIOMES, cost: 0, colors: ['#6C4BFF', '#FF4FA3'] },
  { id: 'downtown', name: 'DOWNTOWN', tagline: 'Camions, ponts et néons', emoji: '🏙️', biomes: ['city', 'bridge', 'tunnel'], cost: 0, colors: ['#1E9BFF', '#FFB49C'] },
  { id: 'beach', name: 'PLAGE SOLEIL', tagline: 'Palmiers et bord de mer', emoji: '🌴', biomes: ['beach', 'city'], cost: 300, colors: ['#11C5FF', '#FFD27A'] },
  { id: 'night', name: 'TUNNEL NUIT', tagline: 'La ville ne dort jamais', emoji: '🌙', biomes: ['night', 'tunnel'], cost: 600, colors: ['#1A1F5C', '#B46BFF'] },
  { id: 'sunset', name: 'PONT SUNSET', tagline: 'Course au coucher du soleil', emoji: '🌅', biomes: ['sunset', 'beach'], cost: 900, colors: ['#3A2A8C', '#FFB255'] },
  { id: 'gym', name: 'GYM DISTRICT', tagline: 'Haltères géants partout', emoji: '🏋️', biomes: ['gym', 'city'], cost: 1200, colors: ['#E8434F', '#3B3F58'] },
  { id: 'desert', name: 'ROUTE DU DÉSERT', tagline: 'Cactus, rochers et chaleur', emoji: '🌵', biomes: ['desert', 'sunset'], cost: 1500, colors: ['#FF9A3D', '#F4D3A0'] },
];

export const DEFAULT_SPACE: SpaceId = 'tour';
export const FREE_SPACES: SpaceId[] = SPACES.filter((s) => s.cost === 0).map((s) => s.id);

export function getSpace(id: SpaceId): SpaceDef {
  return SPACES.find((s) => s.id === id) ?? SPACES[0];
}

export function isSpaceId(value: unknown): value is SpaceId {
  return SPACES.some((s) => s.id === value);
}
