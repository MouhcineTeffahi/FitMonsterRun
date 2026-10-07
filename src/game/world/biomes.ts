export const BIOMES = [
  'city', 'beach', 'gym', 'tunnel', 'bridge', 'night', 'sunset', 'desert',
  'mountain', 'docks', 'park', 'snow',
] as const;
export type Biome = (typeof BIOMES)[number];

/** Distance covered by each biome before the next one starts. */
export const BIOME_LEN = 520;

/** Shown in the HUD and in the toast when the runner enters a biome. */
export const BIOME_NAME: Record<Biome, string> = {
  city: 'CENTRE-VILLE 🏙️',
  beach: 'PLAGE 🌴',
  tunnel: 'NÉON TUNNEL 🌀',
  bridge: 'TOIT 🌉',
  night: 'NÉON 🌙',
  sunset: 'PONT COUCHER 🌅',
  gym: 'GYM PLAGE 🏋️',
  desert: 'DÉSERT 🌵',
  mountain: 'MONTAGNE ⛰️',
  docks: 'DOCKS ⚓',
  park: 'PARC 🌳',
  snow: 'NEIGE ❄️',
};

const ALIASES: Record<string, Biome> = {
  street: 'city',
  yard: 'beach',
  elevated: 'bridge',
  alpine: 'mountain',
  harbor: 'docks',
  campus: 'park',
  ice: 'snow',
};

/** Web QA: `?biome=desert` starts the run in that biome. */
const QA_BIOME = (() => {
  const search = typeof window !== 'undefined' ? window.location?.search : undefined;
  const raw = search ? new URLSearchParams(search).get('biome') : null;
  const wanted = raw ? (ALIASES[raw] ?? raw) : null;
  return BIOMES.includes(wanted as Biome) ? (wanted as Biome) : null;
})();

let order: readonly Biome[] = BIOMES;

/** Biome rotation for the next run; must be set before the World mounts. */
export function setBiomeOrder(next: readonly Biome[]) {
  const base = next.length ? next : BIOMES;
  order = QA_BIOME ? [QA_BIOME, ...base.filter((b) => b !== QA_BIOME)] : base;
}
setBiomeOrder(BIOMES);

/** Biome at a given run distance (distance grows ahead of the runner). */
export function biomeAt(distance: number): Biome {
  const k = Math.floor(Math.max(0, distance) / BIOME_LEN);
  return order[k % order.length];
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
  night: {
    skyTop: '#060B2E', skyMid: '#1A1F5C', horizon: '#5B3A8C', fog: '#2A2457',
    near: 30, far: 110, hemi: 0.6, sun: 0.5, neon: 6, windows: 1.6,
  },
  sunset: {
    skyTop: '#3A2A8C', skyMid: '#E0567A', horizon: '#FFB255', fog: '#F29A6B',
    near: 40, far: FOG_LIMIT, hemi: 0.9, sun: 1.6, neon: 0, windows: 0.9,
  },
  gym: {
    skyTop: '#1E7BFF', skyMid: '#8CCBFF', horizon: '#FFE3C2', fog: '#F1E2D2',
    near: 45, far: FOG_LIMIT, hemi: 1.0, sun: 2.4, neon: 0, windows: 0.4,
  },
  desert: {
    skyTop: '#2B8CFF', skyMid: '#9AD8FF', horizon: '#FFE0A3', fog: '#F4D3A0',
    near: 55, far: FOG_LIMIT, hemi: 1.1, sun: 2.8, neon: 0, windows: 0.2,
  },
  mountain: {
    skyTop: '#3A6EA5', skyMid: '#8BB4D9', horizon: '#D4E4C8', fog: '#C5D4C8',
    near: 40, far: FOG_LIMIT, hemi: 0.95, sun: 2.0, neon: 0, windows: 0.3,
  },
  docks: {
    skyTop: '#24344C', skyMid: '#4A5A70', horizon: '#C47A4A', fog: '#3E4A5C',
    near: 35, far: 120, hemi: 0.7, sun: 1.2, neon: 2, windows: 0.75,
  },
  park: {
    skyTop: '#3BA8FF', skyMid: '#8ED4FF', horizon: '#C8E8A8', fog: '#D4E8C4',
    near: 50, far: FOG_LIMIT, hemi: 1.1, sun: 2.5, neon: 0, windows: 0.25,
  },
  snow: {
    skyTop: '#7EB6D9', skyMid: '#D2E8F5', horizon: '#F4F8FC', fog: '#E2EEF6',
    near: 35, far: 115, hemi: 1.15, sun: 1.8, neon: 0, windows: 0.55,
  },
};

/** Pastel + saturated facades. */
export const FACADES = ['#FF7F6B', '#5FD3B0', '#FFD45C', '#6EC6FF', '#B79CFF', '#FFA36B', '#FF8FB8', '#41C9C9'];
export const BEACH_FACADES = ['#FFFFFF', '#7FE0D0', '#FFC9A8', '#FFE680', '#9FD8FF', '#FFB0C8'];
export const AWNINGS = ['#FF4F6D', '#1EC8A5', '#FFB02E', '#5B7BFF', '#FFFFFF'];
export const GYM_FACADES = ['#E8434F', '#3B3F58', '#F4F6FA', '#FFB02E', '#2F6BFF', '#9AA3B5'];
export const DESERT_ROCKS = ['#D9824B', '#E59A5C', '#C9683A', '#F0B27A'];
export const MOUNTAIN_ROCKS = ['#6B7280', '#8B7355', '#4A5568', '#9CA3AF', '#5C6B4A'];
export const DOCK_FACADES = ['#3D4A5C', '#C45C26', '#2B3A4A', '#8A9AAB', '#E8B84A'];
export const PARK_FACADES = ['#F4F0E6', '#C9E4C5', '#E8C9A0', '#8BB8D8', '#E07070'];
export const SNOW_FACADES = ['#F7FAFD', '#D5E3F0', '#E8EEF5', '#9BB8D4', '#C9D6E8'];
export const SIGNS = ['#FF3D7F', '#00D9FF', '#FFC400', '#7CFF4F', '#B46BFF'];
