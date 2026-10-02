import { LilitaOne_400Regular, useFonts } from '@expo-google-fonts/lilita-one';
import type { TextStyle } from 'react-native';

/** Bold rounded display font (Google Fonts, OFL), loaded at startup by App.tsx. */
export const FONT = 'LilitaOne_400Regular';

/** Spread into text styles; the face is already heavy, so no synthetic bold. */
export const display: TextStyle = { fontFamily: FONT, fontWeight: 'normal' };

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({ [FONT]: LilitaOne_400Regular });
  // A font failure must not block the game: fall back to the system font.
  return loaded || !!error;
}
