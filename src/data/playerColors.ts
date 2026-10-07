import type { Outfit, SkinDef } from './skins';

/** Four player-facing paint channels for the Fit Monster. */
export type ColorSlot = 'body' | 'shorts' | 'accents' | 'eyes';

export type PlayerColors = Record<ColorSlot, string>;

export const COLOR_SLOTS: { id: ColorSlot; label: string }[] = [
  { id: 'body', label: 'CORPS' },
  { id: 'shorts', label: 'SHORT' },
  { id: 'accents', label: 'ACCENTS' },
  { id: 'eyes', label: 'YEUX' },
];

/** Classic yellow Fit Monster defaults (matches the character sheets). */
export const DEFAULT_PLAYER_COLORS: PlayerColors = {
  body: '#FFC20E',
  shorts: '#141416',
  accents: '#FFFFFF',
  eyes: '#FFFFFF',
};

export const BODY_SWATCHES = [
  '#FFC20E',
  '#FCB202',
  '#FF8A1F',
  '#FF5A5A',
  '#FF4D9A',
  '#8B5CF6',
  '#2F7BFF',
  '#14C8B4',
  '#4CAF50',
  '#4A4C54',
  '#8A8A94',
  '#F4F4F8',
  '#1B1B21',
  '#F0A630',
] as const;

export const SHORTS_SWATCHES = [
  '#141416',
  '#0C0C0E',
  '#2E2E35',
  '#7A1010',
  '#1A3A6B',
  '#0E4D3A',
  '#4A148C',
  '#4A4C54',
  '#8A8A94',
  '#FCB202',
  '#F4F4F8',
  '#6B3E26',
] as const;

export const ACCENT_SWATCHES = [
  '#FFFFFF',
  '#FCB202',
  '#FFD54F',
  '#FFF6D5',
  '#42A5F5',
  '#FF4D6A',
  '#14C8B4',
  '#9E9E9E',
  '#4A4C54',
  '#8A8A94',
  '#141416',
  '#FF9800',
] as const;

export const EYE_SWATCHES = [
  '#FFFFFF',
  '#FFF6D5',
  '#FFB300',
  '#42A5F5',
  '#7CFF6B',
  '#FF4D6A',
  '#E0E7FF',
  '#141416',
] as const;

export const SWATCHES: Record<ColorSlot, readonly string[]> = {
  body: BODY_SWATCHES,
  shorts: SHORTS_SWATCHES,
  accents: ACCENT_SWATCHES,
  eyes: EYE_SWATCHES,
};

const HEX = /^#([0-9a-fA-F]{6})$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

export function parsePlayerColors(raw: unknown): PlayerColors {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PLAYER_COLORS };
  const c = raw as Partial<PlayerColors>;
  return {
    body: isHexColor(c.body) ? c.body : DEFAULT_PLAYER_COLORS.body,
    shorts: isHexColor(c.shorts) ? c.shorts : DEFAULT_PLAYER_COLORS.shorts,
    accents: isHexColor(c.accents) ? c.accents : DEFAULT_PLAYER_COLORS.accents,
    eyes: isHexColor(c.eyes) ? c.eyes : DEFAULT_PLAYER_COLORS.eyes,
  };
}

/**
 * Paints the four custom channels onto a skin outfit.
 * Keeps skin-specific roughness / metalness / cape.
 */
export function applyPlayerColors(base: Outfit, colors: PlayerColors): Outfit {
  const bodyClothes = base.torso.toLowerCase() === base.skin.toLowerCase();
  return {
    ...base,
    skin: colors.body,
    head: colors.body,
    hand: colors.body,
    calf: bodyClothes || base.calf.toLowerCase() === base.skin.toLowerCase() ? colors.body : colors.shorts,
    torso: bodyClothes ? colors.body : base.torso,
    arm: bodyClothes ? colors.body : base.arm,
    shorts: colors.shorts,
    leggings: colors.shorts,
    wrist: colors.accents,
    piping: colors.accents,
    emblem: colors.body,
    harness: colors.body,
    sock: colors.accents,
    sole: colors.accents,
    shoe: colors.shorts,
    eyes: colors.eyes,
  };
}

/** Skin def with the player's painted colours applied for preview / in-run use. */
export function paintedSkin(skin: SkinDef, colors: PlayerColors): SkinDef {
  return {
    ...skin,
    primary: colors.body,
    secondary: colors.shorts,
    accent: colors.accents,
    outfit: applyPlayerColors(skin.outfit, colors),
  };
}
