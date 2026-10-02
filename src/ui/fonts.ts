import { useFonts } from 'expo-font';
import type { TextStyle } from 'react-native';

/** Lilita One (Google Fonts, SIL OFL — see src/assets/fonts/OFL.txt), loaded at startup by App.tsx. */
export const FONT = 'LilitaOne_400Regular';

/** Spread into text styles; the face is already heavy, so no synthetic bold. */
export const display: TextStyle = { fontFamily: FONT, fontWeight: 'normal' };

// Vendored rather than imported from @expo-google-fonts: static hosts such as
// Vercel drop exported assets whose path contains node_modules.
const FONT_FILE = require('../assets/fonts/LilitaOne-Regular.ttf');

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({ [FONT]: FONT_FILE });
  // A font failure must not block the game: fall back to the system font.
  return loaded || !!error;
}
