/**
 * Fit Monster Run visual theme — dark charcoal + yellow fitness UI.
 * Import from here for all screens/components.
 */
export const colors = {
  background: '#0D1426',
  yellow: '#FCB202',
  yellowBright: '#FFD54F',
  black: '#000000',
  white: '#FFFFFF',
  green: '#4CAF50',
  red: '#EF4444',
  panel: '#141D33',
  panelElevated: '#1D2844',
  muted: '#9A9A9A',
  road: '#2A2A32',
  laneLine: '#E8E8E8',
  skyTop: '#3BA3D9',
  skyBottom: '#7EC8E8',
  coin: '#FCB202',
  healthy: '#4CAF50',
  junk: '#EF4444',
  shadow: '#000000',
  navy: '#0A1020',
  border: '#2B3A5E',
  protein: '#42A5F5',
  power: '#FFE34D',
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const MAX_ENERGY = 100;
export const SPEED_INTERVAL_MS = 26_000;
