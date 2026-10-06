import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { DAILY_CHALLENGES, todayKey } from '../data/challenges';
import { getSkin } from '../data/skins';
import { colors, radii, spacing } from '../data/theme';
import { MonsterShowcase } from '../game/player/MonsterShowcase';
import { useProgressStore } from '../store/progressStore';
import { DumbbellMark } from '../ui/DumbbellMark';
import { display } from '../ui/fonts';
import { Logo } from '../ui/Logo';
import { MenuBackdrop } from '../ui/MenuBackdrop';
import { ui } from '../utils/styles';

type Props = {
  onPlay: () => void;
  onShop: () => void;
  onChallenges: () => void;
  onLeaderboard: () => void;
};

export function HomeScreen({ onPlay, onShop, onChallenges, onLeaderboard }: Props) {
  const bestScore = useProgressStore((s) => s.bestScore);
  const totalCoins = useProgressStore((s) => s.totalCoins);
  const selectedSkin = useProgressStore((s) => s.selectedSkin);
  const soundEnabled = useProgressStore((s) => s.soundEnabled);
  const toggleSound = useProgressStore((s) => s.toggleSound);
  const daily = useProgressStore((s) => s.daily);
  const skin = getSkin(selectedSkin);

  const today = daily.date === todayKey() ? daily : null;
  const claimable = today
    ? DAILY_CHALLENGES.filter(
        (c) => !today.claimed.includes(c.id) && (today.progress[c.stat] ?? 0) >= c.target,
      ).length
    : 0;

  return (
    <View style={ui.screen}>
      <MenuBackdrop />
      <MonsterShowcase skin={skin} mode="hero" floor={false} style={styles.hero} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <DumbbellMark size={22} />
            <Text style={styles.pillText}>{totalCoins}</Text>
          </View>
          <Pressable
            style={styles.iconBtn}
            onPress={toggleSound}
            accessibilityRole="button"
            accessibilityLabel={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            <Text style={styles.iconText}>{soundEnabled ? '🔊' : '🔇'}</Text>
          </Pressable>
        </View>

        <View style={styles.brand}>
          <Logo width={270} />
          <Text style={styles.tagline}>
            RUN. EAT CLEAN.{'\n'}BECOME THE BEST{'\n'}VERSION OF YOU!
          </Text>
        </View>

        <View style={styles.flex} />

        <View style={styles.menu}>
          <Text style={styles.best}>BEST SCORE: {bestScore}</Text>
          <Pressable style={[ui.primaryBtn, styles.playBtn]} onPress={onPlay} accessibilityRole="button">
            <Text style={[ui.primaryBtnText, styles.playText]}>PLAY</Text>
          </Pressable>
          <View style={styles.row}>
            <MenuButton label="SHOP" onPress={onShop} />
            <MenuButton label="CHALLENGES" onPress={onChallenges} badge={claimable} />
          </View>
          <MenuButton label="🏆  LEADERBOARD" onPress={onLeaderboard} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function MenuButton({ label, onPress, badge = 0 }: { label: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable style={styles.menuBtn} onPress={onPress} accessibilityRole="button">
      <Text style={styles.menuText}>{label}</Text>
      {badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>!</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  hero: {
    position: 'absolute',
    right: '-14%',
    top: '12%',
    width: '90%',
    height: '68%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10,16,32,0.8)',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  pillText: {
    ...display,
    color: colors.white,
    fontSize: 18,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(10,16,32,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  iconText: {
    fontSize: 18,
  },
  brand: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
  tagline: {
    ...display,
    color: colors.white,
    fontSize: 14,
    lineHeight: 18,
    marginTop: -4,
    marginLeft: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  menu: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  best: {
    ...display,
    color: colors.white,
    textAlign: 'center',
    fontSize: 15,
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  playBtn: {
    minHeight: 64,
  },
  playText: {
    fontSize: 30,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  menuBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: radii.md,
    backgroundColor: 'rgba(20,29,51,0.94)',
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderBottomColor: '#070B16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    ...display,
    color: colors.white,
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...display,
    color: colors.white,
    fontSize: 14,
  },
});
