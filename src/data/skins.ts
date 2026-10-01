export type SkinId = 'classic' | 'street' | 'beast' | 'champion';

export type SkinDef = {
  id: SkinId;
  name: string;
  price: number;
  primary: string;
  secondary: string;
  accent: string;
};

export const SKINS: SkinDef[] = [
  {
    id: 'classic',
    name: 'Classic Yellow',
    price: 0,
    primary: '#FCB202',
    secondary: '#101014',
    accent: '#FFD54F',
  },
  {
    id: 'street',
    name: 'Street Mode',
    price: 500,
    primary: '#2B2B2B',
    secondary: '#FCB202',
    accent: '#9E9E9E',
  },
  {
    id: 'beast',
    name: 'Beast Mode',
    price: 1000,
    primary: '#101014',
    secondary: '#FCB202',
    accent: '#FF9800',
  },
  {
    id: 'champion',
    name: 'Champion Mode',
    price: 1500,
    primary: '#D4AF37',
    secondary: '#101014',
    accent: '#FFF59D',
  },
];

export const DEFAULT_SKIN: SkinId = 'classic';
export const DEFAULT_UNLOCKED: SkinId[] = ['classic'];

export function getSkin(id: SkinId): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
