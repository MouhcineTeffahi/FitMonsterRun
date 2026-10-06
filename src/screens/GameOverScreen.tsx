import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../data/theme';
import type { RunSummary } from '../data/types';
import { useProgressStore } from '../store/progressStore';
import { display } from '../ui/fonts';
import { ui } from '../utils/styles';

type Props = {
  summary: RunSummary;
  onRestart: () => void;
  onHome: () => void;
};

export function GameOverScreen({ summary, onRestart, onHome }: Props) {
  const lastScore = useProgressStore((s) => s.lastScore);
  const bestScore = useProgressStore((s) => s.bestScore);
  const totalCoins = useProgressStore((s) => s.totalCoins);

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} bounces={false}>
        <Text style={styles.title}>RUN OVER</Text>
        {summary.record ? <Text style={styles.record}>NEW RECORD!</Text> : null}

        <View style={styles.panel}>
          <Stat label="SCORE" value={String(lastScore)} />
          <Stat label="DISTANCE" value={`${summary.distance} m`} />
          <Stat label="LEVEL" value={String(summary.level)} />
          <Stat label="BEST COMBO" value={`x${summary.bestCombo}`} />
          <Stat label="DUMBBELLS" value={`+${summary.coins}`} accent />
          <Stat label="BEST SCORE" value={String(bestScore)} />
          <Stat label="TOTAL DUMBBELLS" value={String(totalCoins)} accent />
        </View>

        <Pressable style={ui.primaryBtn} onPress={onRestart}>
          <Text style={ui.primaryBtnText}>PLAY AGAIN</Text>
        </Pressable>
        <Pressable style={ui.secondaryBtn} onPress={onHome}>
          <Text style={ui.secondaryBtnText}>HOME</Text>
        </Pressable>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  title: {
    ...display,
    color: colors.yellow,
    fontSize: 36,
    textAlign: 'center',
  },
  record: {
    ...display,
    color: colors.black,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: colors.yellow,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.sm,
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
    fontSize: 22,
  },
});
