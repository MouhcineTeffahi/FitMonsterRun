import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../data/theme';
import type { RunSummary } from '../data/types';
import { nextUnlockTeaser } from '../data/unlockTeasers';
import { playSfx } from '../game/audio/sfx';
import { useProgressStore } from '../store/progressStore';
import { display } from '../ui/fonts';
import { UnlockTeaserCard } from '../ui/UnlockTeaserCard';
import { runShareText, shareRun } from '../utils/shareRun';
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
  const unlockedSkins = useProgressStore((s) => s.unlockedSkins);
  const unlockedSpaces = useProgressStore((s) => s.unlockedSpaces);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const teaser = useMemo(
    () => nextUnlockTeaser(totalCoins, unlockedSkins, unlockedSpaces),
    [totalCoins, unlockedSkins, unlockedSpaces],
  );

  const onShare = async () => {
    playSfx('coin');
    const result = await shareRun(runShareText(lastScore, summary.distance, summary.bestCombo));
    setShareNote(result === 'copied' ? 'Copié !' : result === 'shared' ? 'Partagé !' : 'Partage indisponible');
  };

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} bounces={false}>
        <Text style={styles.title}>COURSE TERMINÉE</Text>
        {summary.record ? <Text style={styles.record}>NOUVEAU RECORD !</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardKicker}>CARTE DE RUN</Text>
          <Text style={styles.cardScore}>{lastScore} pts</Text>
          <Text style={styles.cardMeta}>
            {summary.distance} m · Niv. {summary.level} · Combo x{summary.bestCombo}
          </Text>
        </View>

        <View style={styles.panel}>
          <Stat label="SCORE" value={String(lastScore)} />
          <Stat label="DISTANCE" value={`${summary.distance} m`} />
          <Stat label="NIVEAU" value={String(summary.level)} />
          <Stat label="MEILLEUR COMBO" value={`x${summary.bestCombo}`} />
          <Stat label="HALTÈRES" value={`+${summary.coins}`} accent />
          <Stat label="MEILLEUR SCORE" value={String(bestScore)} />
          <Stat label="TOTAL HALTÈRES" value={String(totalCoins)} accent />
        </View>

        {teaser ? <UnlockTeaserCard teaser={teaser} /> : null}

        <Pressable style={ui.primaryBtn} onPress={onRestart}>
          <Text style={ui.primaryBtnText}>REJOUER</Text>
        </Pressable>
        <Pressable style={ui.secondaryBtn} onPress={onShare}>
          <Text style={ui.secondaryBtnText}>PARTAGER</Text>
        </Pressable>
        {shareNote ? <Text style={styles.shareNote}>{shareNote}</Text> : null}
        <Pressable style={ui.secondaryBtn} onPress={onHome}>
          <Text style={ui.secondaryBtnText}>ACCUEIL</Text>
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
  card: {
    backgroundColor: colors.yellow,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  cardKicker: {
    ...display,
    color: colors.black,
    fontSize: 12,
    opacity: 0.7,
  },
  cardScore: {
    ...display,
    color: colors.black,
    fontSize: 36,
  },
  cardMeta: {
    ...display,
    color: colors.black,
    fontSize: 14,
  },
  shareNote: {
    ...display,
    color: colors.green,
    fontSize: 14,
    textAlign: 'center',
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
