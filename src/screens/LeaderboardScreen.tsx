import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RIVALS } from '../data/challenges';
import { colors, radii, spacing } from '../data/theme';
import { useProgressStore } from '../store/progressStore';
import { display } from '../ui/fonts';
import { ScreenHeader } from '../ui/ScreenHeader';

type Props = {
  onBack: () => void;
};

const COLLAPSED = 5;
const MEDALS = ['#FFD54F', '#CFD8DC', '#E0A06A'];

/** CLASSEMENT: offline board of fixed rivals plus the player's best score ("Toi"). */
export function LeaderboardScreen({ onBack }: Props) {
  const bestScore = useProgressStore((s) => s.bestScore);
  const topScores = useProgressStore((s) => s.topScores);
  const dailyBoard = useProgressStore((s) => s.dailyBoard);
  const weeklyBoard = useProgressStore((s) => s.weeklyBoard);
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<'all' | 'day' | 'week'>('all');

  const myScore = period === 'day' ? (dailyBoard.scores[0] ?? 0) : period === 'week' ? (weeklyBoard.scores[0] ?? 0) : bestScore;
  const rows = useMemo(
    () =>
      [...RIVALS.map((r) => ({ ...r, me: false })), { name: 'Toi', score: myScore, me: true }].sort(
        (a, b) => b.score - a.score,
      ),
    [myScore],
  );
  const myRank = rows.findIndex((r) => r.me);
  const visible = expanded
    ? rows
    : rows.filter((_, i) => i < COLLAPSED || i === myRank).slice(0, COLLAPSED + 1);

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="CLASSEMENT" onBack={onBack} />
      <View style={styles.periods}>
        {(['all', 'day', 'week'] as const).map((p) => (
          <Pressable key={p} style={[styles.period, period === p && styles.periodOn]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodText, period === p && styles.periodTextOn]}>
              {p === 'all' ? 'GÉNÉRAL' : p === 'day' ? 'JOUR' : 'SEMAINE'}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {visible.map((r) => {
          const rank = rows.indexOf(r);
          return (
            <View key={r.name} style={[styles.row, r.me && styles.rowMe]}>
              <Text style={[styles.rank, r.me && styles.dark]}>{rank + 1}</Text>
              <View style={[styles.avatar, { backgroundColor: r.me ? colors.black : colors.yellow }]}>
                <Text style={[styles.avatarText, r.me && { color: colors.yellow }]}>{r.name[0]}</Text>
              </View>
              <Text style={[styles.name, r.me && styles.dark]} numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={[styles.score, r.me && styles.dark]}>{r.score}</Text>
              <Text style={[styles.cup, { opacity: rank < 3 ? 1 : 0 }]}>
                {rank < 3 ? '🏆' : ''}
              </Text>
              {rank < 3 ? <View style={[styles.medal, { backgroundColor: MEDALS[rank] }]} /> : null}
            </View>
          );
        })}

        <Pressable style={styles.moreBtn} onPress={() => setExpanded((e) => !e)} accessibilityRole="button">
          <Text style={styles.moreText}>{expanded ? 'VOIR MOINS' : 'VOIR PLUS'}</Text>
        </Pressable>

        {topScores.length > 0 ? (
          <View style={styles.mine}>
            <Text style={styles.mineTitle}>TES MEILLEURES RUNS</Text>
            {topScores.map((s, i) => (
              <View key={`${s}-${i}`} style={styles.mineRow}>
                <Text style={styles.mineRank}>#{i + 1}</Text>
                <Text style={styles.mineScore}>{s}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  periods: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  period: {
    flex: 1,
    minHeight: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodOn: {
    backgroundColor: colors.yellow,
    borderColor: '#FFE88A',
  },
  periodText: {
    ...display,
    color: colors.white,
    fontSize: 13,
  },
  periodTextOn: {
    color: colors.black,
  },
  list: {
    padding: spacing.md,
    gap: spacing.xs,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.panel,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 54,
  },
  rowMe: {
    backgroundColor: colors.yellow,
    borderColor: '#FFE88A',
  },
  rank: {
    ...display,
    color: colors.white,
    fontSize: 20,
    width: 26,
    textAlign: 'center',
  },
  dark: {
    color: colors.black,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...display,
    color: colors.black,
    fontSize: 18,
  },
  name: {
    ...display,
    flex: 1,
    color: colors.white,
    fontSize: 18,
  },
  score: {
    ...display,
    color: colors.white,
    fontSize: 18,
  },
  cup: {
    width: 24,
    fontSize: 18,
    textAlign: 'center',
  },
  medal: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 4,
    borderRadius: 2,
  },
  moreBtn: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    backgroundColor: colors.yellow,
    borderBottomWidth: 4,
    borderBottomColor: '#B86E00',
    borderRadius: radii.sm,
    paddingHorizontal: 36,
    paddingVertical: 10,
  },
  moreText: {
    ...display,
    color: colors.black,
    fontSize: 18,
  },
  mine: {
    marginTop: spacing.lg,
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  mineTitle: {
    ...display,
    color: colors.yellow,
    fontSize: 15,
    marginBottom: 4,
  },
  mineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mineRank: {
    ...display,
    color: colors.muted,
    fontSize: 16,
  },
  mineScore: {
    ...display,
    color: colors.white,
    fontSize: 16,
  },
});
