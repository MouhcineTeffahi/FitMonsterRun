import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../data/theme';
import { useProgressStore } from '../store/progressStore';
import { display } from '../ui/fonts';
import { ui } from '../utils/styles';

type Props = {
  runCoins: number;
  onRestart: () => void;
  onHome: () => void;
};

export function GameOverScreen({ runCoins, onRestart, onHome }: Props) {
  const lastScore = useProgressStore((s) => s.lastScore);
  const bestScore = useProgressStore((s) => s.bestScore);
  const totalCoins = useProgressStore((s) => s.totalCoins);

  return (
    <SafeAreaView style={ui.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>PARTIE TERMINÉE</Text>

        <View style={styles.panel}>
          <Stat label="SCORE" value={String(lastScore)} />
          <Stat label="PIÈCES GAGNÉES" value={`+${runCoins}`} accent />
          <Stat label="MEILLEUR SCORE" value={String(bestScore)} />
          <Stat label="TOTAL PIÈCES" value={String(totalCoins)} accent />
        </View>

        <Pressable style={ui.primaryBtn} onPress={onRestart}>
          <Text style={ui.primaryBtnText}>REJOUER</Text>
        </Pressable>
        <Pressable style={ui.secondaryBtn} onPress={onHome}>
          <Text style={ui.secondaryBtnText}>ACCUEIL</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: colors.yellow }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  title: {
    ...display,
    color: colors.yellow,
    fontSize: 40,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  statLabel: {
    ...display,
    color: colors.muted,
    fontSize: 15,
    flexShrink: 1,
  },
  statValue: {
    ...display,
    color: colors.white,
    fontSize: 26,
  },
});
