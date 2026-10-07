import { BIOMES, type Biome } from '../game/world/biomes';

export type SpaceId =
  | 'tour'
  | 'downtown'
  | 'beach'
  | 'night'
  | 'mountain'
  | 'park'
  | 'sunset'
  | 'docks'
  | 'gym'
  | 'desert'
  | 'snow';

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

/** Stay in the chosen world for a long first stretch, then visit every other place. */
function tourFrom(home: Biome): readonly Biome[] {
  const rest = BIOMES.filter((b) => b !== home);
  // Gym sits next to the beach so training always leads into swimming.
  if (home === 'beach') return [home, home, home, home, 'gym', ...rest.filter((b) => b !== 'gym')];
  if (home === 'gym') return [home, home, home, home, 'beach', ...rest.filter((b) => b !== 'beach')];
  return [home, home, home, home, ...rest];
}

export const SPACES: readonly SpaceDef[] = [
  { id: 'tour', name: 'TOUR DU MONDE', tagline: 'Tous les mondes, à la suite', emoji: '🌍', biomes: BIOMES, cost: 0, colors: ['#6C4BFF', '#FF4FA3'] },
  { id: 'downtown', name: 'CENTRE-VILLE', tagline: 'Camions, ponts et néon', emoji: '🏙️', biomes: tourFrom('city'), cost: 0, colors: ['#1E9BFF', '#FFB49C'] },
  { id: 'beach', name: 'PLAGE', tagline: 'Palmiers, sable et mer', emoji: '🌴', biomes: tourFrom('beach'), cost: 300, colors: ['#11C5FF', '#FFD27A'] },
  { id: 'night', name: 'NÉON', tagline: 'La ville ne dort jamais', emoji: '🌙', biomes: tourFrom('night'), cost: 600, colors: ['#1A1F5C', '#B46BFF'] },
  { id: 'mountain', name: 'MONTAGNE', tagline: 'Pins, sommets et air vif', emoji: '⛰️', biomes: tourFrom('mountain'), cost: 800, colors: ['#3A6EA5', '#6B8F5E'] },
  { id: 'park', name: 'PARC', tagline: 'Pelouses et allées', emoji: '🌳', biomes: tourFrom('park'), cost: 450, colors: ['#4CB85A', '#8ED4FF'] },
  { id: 'sunset', name: 'PONT COUCHER', tagline: 'Course dans le soleil', emoji: '🌅', biomes: tourFrom('sunset'), cost: 900, colors: ['#3A2A8C', '#FFB255'] },
  { id: 'docks', name: 'DOCKS', tagline: 'Grues, caisses et eau', emoji: '⚓', biomes: tourFrom('docks'), cost: 1100, colors: ['#24344C', '#C45C26'] },
  { id: 'gym', name: 'GYM PLAGE', tagline: 'Entraîne-toi, puis la mer', emoji: '🏋️', biomes: tourFrom('gym'), cost: 1200, colors: ['#E8434F', '#3B3F58'] },
  { id: 'desert', name: 'DÉSERT', tagline: 'Cactus, roche et chaleur', emoji: '🌵', biomes: tourFrom('desert'), cost: 1500, colors: ['#FF9A3D', '#F4D3A0'] },
  { id: 'snow', name: 'NEIGE', tagline: 'Rues gelées et poudreuse', emoji: '❄️', biomes: tourFrom('snow'), cost: 1800, colors: ['#7EB6D9', '#F4F8FC'] },
];

export const DEFAULT_SPACE: SpaceId = 'tour';
export const FREE_SPACES: SpaceId[] = SPACES.filter((s) => s.cost === 0).map((s) => s.id);

export function getSpace(id: SpaceId): SpaceDef {
  return SPACES.find((s) => s.id === id) ?? SPACES[0];
}

export function isSpaceId(value: unknown): value is SpaceId {
  return SPACES.some((s) => s.id === value);
}
