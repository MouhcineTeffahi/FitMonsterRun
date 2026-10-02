import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../data/theme';
import { display } from './fonts';

type Props = {
  title: string;
  onBack: () => void;
  coins?: number;
};

/** Shared top bar for menu sub-screens: back button, title, optional coin pill. */
export function ScreenHeader({ title, onBack, coins }: Props) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Retour">
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {coins !== undefined ? (
        <View style={styles.pill}>
          <Text style={styles.pillText}>{coins}</Text>
          <View style={styles.coin} />
        </View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.panelElevated,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    ...display,
    color: colors.white,
    fontSize: 30,
    lineHeight: 34,
  },
  title: {
    ...display,
    flex: 1,
    color: colors.white,
    fontSize: 24,
    textAlign: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.navy,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    paddingLeft: 12,
    paddingRight: 6,
    height: 38,
  },
  pillText: {
    ...display,
    color: colors.white,
    fontSize: 17,
  },
  coin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFC21A',
    borderWidth: 2,
    borderColor: '#FFE88A',
  },
  spacer: {
    width: 44,
  },
});
