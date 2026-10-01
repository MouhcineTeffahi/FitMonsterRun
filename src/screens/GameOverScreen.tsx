import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../data/theme';
import { useProgressStore } from '../store/progressStore';
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
        <Text style={styles.title}>Partie terminée</Text>

        <View style={styles.panel}>
          <Stat label="SCORE" value={String(lastScore)} />
          <Stat label="PIÈCES GAGNÉES" value={`+${runCoins}`} accent />
          <Stat label="MEILLEUR SCORE" value={String(bestScore)} />
          <Stat label="TOTAL PIÈCES" value={String(totalCoins)} accent />
        </View>

        <Pressable style={ui.primaryBtn} onPress={onRestart}>
          <Text style={ui.primaryBtnText}>Rejouer</Text>
        </Pressable>
        <Pressable style={ui.secondaryBtn} onPress={onHome}>
          <Text style={ui.secondaryBtnText}>Accueil</Text>
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
  },
  title: {
    color: colors.yellow,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#2A2A33',
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
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  statValue: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
  },
});
