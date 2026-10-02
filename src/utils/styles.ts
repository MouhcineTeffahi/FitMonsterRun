import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../data/theme';
import { display } from '../ui/fonts';

export const cardShadow: ViewStyle = {
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
};

export const ui = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...display,
    color: colors.yellow,
    fontSize: 34,
    letterSpacing: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  } as TextStyle,
  subtitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  } as TextStyle,
  muted: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    ...cardShadow,
  },
  primaryBtn: {
    backgroundColor: colors.yellow,
    borderBottomWidth: 4,
    borderBottomColor: '#B86E00',
    borderRadius: radii.md,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    ...cardShadow,
  },
  primaryBtnText: {
    ...display,
    color: colors.black,
    fontSize: 22,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
  secondaryBtn: {
    backgroundColor: colors.panelElevated,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderWidth: 2,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    ...display,
    color: colors.white,
    fontSize: 17,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pill: {
    backgroundColor: colors.black,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
