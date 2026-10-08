import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { REWARD_COINS } from '../ads/config';
import { showRewardedAd } from '../ads/rewarded';
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
  const addCoins = useProgressStore((s) => s.addCoins);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [adBusy, setAdBusy] = useState(false);
  const [coinsClaimed, setCoinsClaimed] = useState(false);
  const teaser = useMemo(
    () => nextUnlockTeaser(totalCoins, unlockedSkins, unlockedSpaces),
    [totalCoins, unlockedSkins, unlockedSpaces],
  );

  const onShare = async () => {
    playSfx('coin');
    const result = await shareRun(runShareText(lastScore, summary.distance, summary.bestCombo));
    setShareNote(result === 'copied' ? 'Copié !' : result === 'shared' ? 'Partagé !' : 'Partage indisponible');
  };

  const onWatchCoins = async () => {
    if (adBusy || coinsClaimed) return;
    setAdBusy(true);
    try {
      const result = await showRewardedAd('coins');
      if (result === 'rewarded') {
        addCoins(REWARD_COINS);
        setCoinsClaimed(true);
        playSfx('level');
      }
    } finally {
      setAdBusy(false);
    }
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

        <Pressable
          style={[styles.rewardBtn, (adBusy || coinsClaimed) && styles.rewardDisabled]}
          onPress={() => void onWatchCoins()}
          disabled={adBusy || coinsClaimed}
          accessibilityRole="button"
        >
          {adBusy ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <Text style={styles.rewardText}>
              {coinsClaimed ? `+${REWARD_COINS} RÉCUPÉRÉS` : `▶ +${REWARD_COINS} HALTÈRES (PUB)`}
            </Text>
          )}
        </Pressable>

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
  rewardBtn: {
    backgroundColor: '#7CFF6B',
    borderBottomWidth: 4,
    borderBottomColor: '#2E7D32',
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  rewardDisabled: {
    opacity: 0.55,
  },
  rewardText: {
    ...display,
    color: colors.black,
    fontSize: 18,
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
