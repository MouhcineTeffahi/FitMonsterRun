import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { UnlockTeaser } from '../data/unlockTeasers';
import { colors, radii, spacing } from '../data/theme';
import { display } from './fonts';

type Props = {
  teaser: UnlockTeaser;
  compact?: boolean;
};

/** Progress teaser toward the next locked skin or space. */
export function UnlockTeaserCard({ teaser, compact }: Props) {
  const almost = teaser.remaining === 0;
  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.row}>
        <Text style={styles.kind}>{teaser.kind === 'skin' ? 'SKIN' : 'LIEU'}</Text>
        <Text style={styles.cost}>{teaser.cost} 💪</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {almost ? `DÉBLOQUE ${teaser.name.toUpperCase()} !` : `SUIVANT : ${teaser.name.toUpperCase()}`}
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            almost && styles.fillReady,
            { width: `${Math.max(6, teaser.progress * 100)}%` },
          ]}
        />
      </View>
      <Text style={styles.hint}>
        {almost
          ? teaser.kind === 'space'
            ? 'Appuie sur le lieu pour débloquer'
            : 'Tu peux l’acheter en boutique'
          : `Encore ${teaser.remaining} haltères`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(20,29,51,0.92)',
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  compact: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kind: {
    ...display,
    color: colors.yellow,
    fontSize: 11,
    letterSpacing: 1,
  },
  cost: {
    ...display,
    color: colors.muted,
    fontSize: 12,
  },
  name: {
    ...display,
    color: colors.white,
    fontSize: 16,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
    marginTop: 2,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.yellow,
    borderRadius: 4,
  },
  fillReady: {
    backgroundColor: colors.yellowBright,
  },
  hint: {
    ...display,
    color: colors.muted,
    fontSize: 11,
  },
});
