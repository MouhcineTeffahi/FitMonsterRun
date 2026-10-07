import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DAILY_CHALLENGES, timeToReset, todayKey } from '../data/challenges';
import { ACHIEVEMENTS } from '../data/retention';
import { playSfx } from '../game/audio/sfx';
import { colors, radii, spacing } from '../data/theme';
import { useProgressStore, type DailyState } from '../store/progressStore';
import { DumbbellMark } from '../ui/DumbbellMark';
import { display } from '../ui/fonts';
import { ScreenHeader } from '../ui/ScreenHeader';

type Props = {
  onBack: () => void;
};

/** DÉFIS QUOTIDIENS: three offline daily goals fed by finished runs. */
export function ChallengesScreen({ onBack }: Props) {
  const daily = useProgressStore((s) => s.daily);
  const totalCoins = useProgressStore((s) => s.totalCoins);
  const claimChallenge = useProgressStore((s) => s.claimChallenge);
  const achievements = useProgressStore((s) => s.achievements);
  const [countdown, setCountdown] = useState(timeToReset());

  useEffect(() => {
    const id = setInterval(() => setCountdown(timeToReset()), 1000);
    return () => clearInterval(id);
  }, []);

  const today: DailyState = daily.date === todayKey() ? daily : { date: todayKey(), progress: {}, claimed: [] };

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="DÉFIS DU JOUR" onBack={onBack} coins={totalCoins} />
      <ScrollView contentContainerStyle={styles.list}>
        {DAILY_CHALLENGES.map((c) => {
          const value = Math.floor(today.progress[c.stat] ?? 0);
          const done = value >= c.target;
          const claimed = today.claimed.includes(c.id);
          const pct = `${Math.min(100, (value / c.target) * 100)}%` as const;
          return (
            <View key={c.id} style={[styles.card, done && !claimed && styles.cardReady]}>
              <View style={styles.iconWrap}>
                <Text style={styles.icon}>{c.icon}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.label}>{c.label}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: pct }]} />
                  <Text style={styles.counter}>
                    {Math.min(value, c.target)}/{c.target}
                  </Text>
                </View>
              </View>
              {claimed ? (
                <View style={styles.claimed}>
                  <Text style={styles.claimedText}>✓</Text>
                </View>
              ) : done ? (
                <Pressable style={styles.claimBtn} onPress={() => { if (claimChallenge(c.id)) playSfx('coin'); }} accessibilityRole="button">
                  <Text style={styles.claimText}>+{c.reward}</Text>
                </Pressable>
              ) : (
                <View style={styles.reward}>
                  <DumbbellMark size={16} />
                  <Text style={styles.rewardText}>{c.reward}</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.resetBox}>
          <Text style={styles.resetLabel}>NOUVEAUX DÉFIS DANS</Text>
          <Text style={styles.resetTime}>{countdown}</Text>
        </View>

        <Text style={styles.resetLabel}>PROFIL · SUCCÈS</Text>
        {ACHIEVEMENTS.map((a) => {
          const got = achievements.includes(a.id);
          return (
            <View key={a.id} style={[styles.card, got && styles.cardReady]}>
              <Text style={styles.icon}>{a.icon}</Text>
              <Text style={[styles.label, { flex: 1 }]}>{a.label}</Text>
              <Text style={styles.rewardText}>{got ? '✓' : '…'}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  cardReady: {
    borderColor: colors.green,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.panelElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 26,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  label: {
    ...display,
    color: colors.white,
    fontSize: 17,
  },
  track: {
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 9,
    backgroundColor: colors.green,
  },
  counter: {
    ...display,
    color: colors.white,
    fontSize: 12,
    textAlign: 'center',
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
    justifyContent: 'flex-end',
  },
  rewardText: {
    ...display,
    color: colors.white,
    fontSize: 16,
  },
  claimBtn: {
    backgroundColor: colors.yellow,
    borderBottomWidth: 3,
    borderBottomColor: '#B86E00',
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  claimText: {
    ...display,
    color: colors.black,
    fontSize: 16,
  },
  claimed: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
  },
  claimedText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 18,
  },
  resetBox: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  resetLabel: {
    ...display,
    color: colors.yellow,
    fontSize: 14,
  },
  resetTime: {
    ...display,
    color: colors.white,
    fontSize: 30,
    letterSpacing: 1,
  },
});
