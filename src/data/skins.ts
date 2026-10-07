export type SkinId = 'classic' | 'street' | 'beast' | 'champion';

/** Colours for each outfit region baked into the Fit Monster model. */
export type Outfit = {
  skin: string;
  head: string;
  torso: string;
  arm: string;
  hand: string;
  shorts: string;
  leggings: string;
  calf: string;
  shoe: string;
  sole: string;
  wrist: string;
  piping: string;
  emblem: string;
  harness: string;
  eyes: string;
  sock: string;
  roughness: number;
  metalness: number;
  cape?: string;
};

export type SkinDef = {
  id: SkinId;
  name: string;
  price: number;
  primary: string;
  secondary: string;
  accent: string;
  outfit: Outfit;
};

const YELLOW = '#FFC20E';
const INK = '#141416';
const WHITE = '#FFFFFF';

export const SKINS: SkinDef[] = [
  {
    id: 'classic',
    name: 'Classique',
    price: 0,
    primary: '#FCB202',
    secondary: '#101014',
    accent: '#FFFFFF',
    outfit: {
      skin: YELLOW,
      head: YELLOW,
      torso: YELLOW,
      arm: YELLOW,
      hand: YELLOW,
      shorts: INK,
      leggings: INK,
      calf: YELLOW,
      shoe: INK,
      sole: WHITE,
      wrist: WHITE,
      piping: WHITE,
      emblem: YELLOW,
      harness: YELLOW,
      eyes: WHITE,
      sock: '#FFD84A',
      roughness: 0.42,
      metalness: 0,
    },
  },
  {
    id: 'street',
    name: 'Street',
    price: 500,
    primary: '#2B2B2B',
    secondary: '#FCB202',
    accent: '#9E9E9E',
    outfit: {
      skin: YELLOW,
      head: YELLOW,
      torso: '#232329',
      arm: '#232329',
      hand: YELLOW,
      shorts: '#2E2E35',
      leggings: '#2E2E35',
      calf: '#2E2E35',
      shoe: '#F2F2F2',
      sole: '#FCB202',
      wrist: '#FCB202',
      piping: '#FCB202',
      emblem: '#FCB202',
      harness: '#34343C',
      eyes: WHITE,
      sock: '#F2F2F2',
      roughness: 0.7,
      metalness: 0,
    },
  },
  {
    id: 'beast',
    name: 'Beast',
    price: 1000,
    primary: '#101014',
    secondary: '#FCB202',
    accent: '#FF9800',
    outfit: {
      skin: '#1B1B21',
      head: '#1B1B21',
      torso: '#1B1B21',
      arm: '#1B1B21',
      hand: '#1B1B21',
      shorts: '#0C0C0E',
      leggings: '#0C0C0E',
      calf: '#1B1B21',
      shoe: '#FCB202',
      sole: '#0C0C0E',
      wrist: '#FCB202',
      piping: '#FCB202',
      emblem: '#FCB202',
      harness: '#FCB202',
      eyes: '#FFB300',
      sock: '#FCB202',
      roughness: 0.3,
      metalness: 0.25,
    },
  },
  {
    id: 'champion',
    name: 'Champion',
    price: 1500,
    primary: '#D4AF37',
    secondary: '#101014',
    accent: '#FFF59D',
    outfit: {
      skin: '#F0A630',
      head: '#F0A630',
      torso: '#F0A630',
      arm: '#F0A630',
      hand: '#F0A630',
      shorts: '#7A1010',
      leggings: '#2A0C0C',
      calf: '#F0A630',
      shoe: '#FFD54F',
      sole: WHITE,
      wrist: '#FFD54F',
      piping: '#FFD54F',
      emblem: '#FFF6D5',
      harness: '#FFD54F',
      eyes: WHITE,
      sock: WHITE,
      roughness: 0.32,
      metalness: 0.3,
      cape: '#C62828',
    },
  },
];

export const DEFAULT_SKIN: SkinId = 'classic';
export const DEFAULT_UNLOCKED: SkinId[] = ['classic'];

export function getSkin(id: SkinId): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
