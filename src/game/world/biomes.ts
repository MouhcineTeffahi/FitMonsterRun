export const BIOMES = ['city', 'beach', 'tunnel', 'bridge'] as const;
export type Biome = (typeof BIOMES)[number];

/** Distance covered by each biome before the next one starts. */
export const BIOME_LEN = 270;

const ALIASES: Record<string, Biome> = { street: 'city', yard: 'beach', elevated: 'bridge' };

/** Web QA: `?biome=tunnel` starts the run just before that biome. */
const START_OFFSET = (() => {
  const search = typeof window !== 'undefined' ? window.location?.search : undefined;
  const raw = search ? new URLSearchParams(search).get('biome') : null;
  const wanted = raw ? (ALIASES[raw] ?? raw) : null;
  const i = BIOMES.indexOf(wanted as Biome);
  return i > 0 ? i * BIOME_LEN - 20 : 0;
})();

/** Biome at a given run distance (distance grows ahead of the runner). */
export function biomeAt(distance: number): Biome {
  const k = Math.floor(Math.max(0, distance + START_OFFSET) / BIOME_LEN);
  return BIOMES[k % BIOMES.length];
}

export type Env = {
  skyTop: string;
  skyMid: string;
  horizon: string;
  fog: string;
  near: number;
  far: number;
  hemi: number;
  sun: number;
  neon: number;
  /** Emissive strength of lit building windows. */
  windows: number;
};

/** Fog ends before FOG_LIMIT so recycled scenery always appears fully fogged. */
export const FOG_LIMIT = 135;

export const ENV: Record<Biome, Env> = {
  city: {
    skyTop: '#1E9BFF', skyMid: '#74CCFF', horizon: '#FFD9B8', fog: '#F3DCC8',
    near: 45, far: FOG_LIMIT, hemi: 1.0, sun: 2.4, neon: 0, windows: 0.35,
  },
  beach: {
    skyTop: '#119DFF', skyMid: '#7ADFFF', horizon: '#FFCFA0', fog: '#F6D6BA',
    near: 50, far: FOG_LIMIT, hemi: 1.05, sun: 2.6, neon: 0, windows: 0.25,
  },
  tunnel: {
    skyTop: '#0D0A1C', skyMid: '#141026', horizon: '#1B1532', fog: '#1B1532',
    near: 18, far: 90, hemi: 0.55, sun: 0.35, neon: 10, windows: 0.8,
  },
  bridge: {
    skyTop: '#2C9CFF', skyMid: '#93D6FF', horizon: '#FFE0C4', fog: '#EDDCCF',
    near: 60, far: FOG_LIMIT, hemi: 1.05, sun: 2.5, neon: 0, windows: 0.45,
  },
};

/** Pastel + saturated facades. */
export const FACADES = ['#FF7F6B', '#5FD3B0', '#FFD45C', '#6EC6FF', '#B79CFF', '#FFA36B', '#FF8FB8', '#41C9C9'];
export const BEACH_FACADES = ['#FFFFFF', '#7FE0D0', '#FFC9A8', '#FFE680', '#9FD8FF', '#FFB0C8'];
export const AWNINGS = ['#FF4F6D', '#1EC8A5', '#FFB02E', '#5B7BFF', '#FFFFFF'];
export const SIGNS = ['#FF3D7F', '#00D9FF', '#FFC400', '#7CFF4F', '#B46BFF'];
