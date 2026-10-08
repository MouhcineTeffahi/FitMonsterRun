import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { DAILY_CHALLENGES, todayKey } from '../data/challenges';
import { paintedSkin } from '../data/playerColors';
import { withAccessory } from '../data/shop';
import { getSkin } from '../data/skins';
import { colors, radii, spacing } from '../data/theme';
import { nextUnlockTeaser } from '../data/unlockTeasers';
import { playMusic } from '../game/audio/music';
import { playSfx } from '../game/audio/sfx';
import { MonsterShowcase } from '../game/player/MonsterShowcase';
import { useProgressStore } from '../store/progressStore';
import { ChestModal } from '../ui/ChestModal';
import { DumbbellMark } from '../ui/DumbbellMark';
import { display } from '../ui/fonts';
import { LoginStreak } from '../ui/LoginStreak';
import { Logo } from '../ui/Logo';
import { MenuBackdrop } from '../ui/MenuBackdrop';
import { SpacePicker } from '../ui/SpacePicker';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { UnlockTeaserCard } from '../ui/UnlockTeaserCard';
import { ui } from '../utils/styles';

type Props = {
  onPlay: () => void;
  onShop: () => void;
  onCustomize: () => void;
  onChallenges: () => void;
  onLeaderboard: () => void;
};

export function HomeScreen({ onPlay, onShop, onCustomize, onChallenges, onLeaderboard }: Props) {
  const bestScore = useProgressStore((s) => s.bestScore);
  const totalCoins = useProgressStore((s) => s.totalCoins);
  const selectedSkin = useProgressStore((s) => s.selectedSkin);
  const playerColors = useProgressStore((s) => s.playerColors);
  const soundEnabled = useProgressStore((s) => s.soundEnabled);
  const toggleSound = useProgressStore((s) => s.toggleSound);
  const daily = useProgressStore((s) => s.daily);
  const login = useProgressStore((s) => s.login);
  const claimLogin = useProgressStore((s) => s.claimLogin);
  const pendingChest = useProgressStore((s) => s.pendingChest);
  const openChest = useProgressStore((s) => s.openChest);
  const selectedAccessory = useProgressStore((s) => s.selectedAccessory);
  const unlockedSkins = useProgressStore((s) => s.unlockedSkins);
  const unlockedSpaces = useProgressStore((s) => s.unlockedSpaces);
  const tutorialDone = useProgressStore((s) => s.tutorialDone);
  const completeTutorial = useProgressStore((s) => s.completeTutorial);
  const [chestReward, setChestReward] = useState(0);
  const [showTutorial, setShowTutorial] = useState(!tutorialDone);
  const skin = useMemo(
    () => withAccessory(paintedSkin(getSkin(selectedSkin), playerColors), selectedAccessory),
    [selectedSkin, playerColors, selectedAccessory],
  );
  const teaser = useMemo(
    () => nextUnlockTeaser(totalCoins, unlockedSkins, unlockedSpaces),
    [totalCoins, unlockedSkins, unlockedSpaces],
  );

  const today = daily.date === todayKey() ? daily : null;
  const claimable = today
    ? DAILY_CHALLENGES.filter(
        (c) => !today.claimed.includes(c.id) && (today.progress[c.stat] ?? 0) >= c.target,
      ).length
    : 0;

  useEffect(() => {
    if (pendingChest) setChestReward(openChest());
  }, [pendingChest, openChest]);

  useEffect(() => {
    if (soundEnabled) playMusic('menu');
  }, [soundEnabled]);

  const pulse = useSharedValue(1);
  const playPulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.08, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    playPulse.value = withRepeat(
      withTiming(1.035, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse, playPulse]);
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.35 + (pulse.value - 1) * 2,
  }));
  const playStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playPulse.value }],
  }));

  return (
    <View style={ui.screen}>
      <MenuBackdrop />
      <Animated.View
        style={[styles.heroGlow, glowStyle, { backgroundColor: playerColors.body }]}
        pointerEvents="none"
      />
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
            accessibilityLabel={soundEnabled ? 'Couper le son' : 'Activer le son'}
          >
            <Text style={styles.iconText}>{soundEnabled ? '🔊' : '🔇'}</Text>
          </Pressable>
        </View>

        <View style={styles.brand}>
          <Logo width={270} />
          <Text style={styles.tagline}>
            COURS. MANGE CLEAN.{'\n'}DEVIENS LA MEILLEURE{'\n'}VERSION DE TOI !
          </Text>
        </View>

        <View style={styles.flex} />

          <View style={styles.menu}>
            <Text style={styles.best}>MEILLEUR SCORE : {bestScore}</Text>
            <LoginStreak
              login={login}
              onClaim={() => {
                const n = claimLogin();
                if (n > 0) playSfx('level');
              }}
            />
            {teaser ? <UnlockTeaserCard teaser={teaser} compact /> : null}
            <SpacePicker />
          </View>

        <View style={styles.actions}>
          <Animated.View style={[playStyle, styles.playWrap]}>
            <Pressable style={[ui.primaryBtn, styles.playBtn]} onPress={onPlay} accessibilityRole="button">
              <Text style={[ui.primaryBtnText, styles.playText]}>JOUER</Text>
            </Pressable>
          </Animated.View>
          <View style={styles.row}>
            <MenuButton label="BOUTIQUE" onPress={onShop} />
            <MenuButton label="COULEURS" onPress={onCustomize} />
          </View>
          <View style={styles.row}>
            <MenuButton label="DÉFIS" onPress={onChallenges} badge={claimable} />
            <MenuButton label="🏆  CLASSEMENT" onPress={onLeaderboard} />
          </View>
        </View>
      </SafeAreaView>
      {chestReward > 0 ? <ChestModal reward={chestReward} onClose={() => setChestReward(0)} /> : null}
      {showTutorial ? (
        <TutorialOverlay
          onDone={() => {
            setShowTutorial(false);
            completeTutorial();
          }}
          onPlay={onPlay}
        />
      ) : null}
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
  heroGlow: {
    position: 'absolute',
    right: '-8%',
    top: '10%',
    width: '56%',
    height: '34%',
    borderRadius: 999,
  },
  hero: {
    position: 'absolute',
    right: '-18%',
    top: '2%',
    width: '78%',
    height: '46%',
    pointerEvents: 'none',
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
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    zIndex: 8,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    zIndex: 6,
    backgroundColor: 'transparent',
  },
  best: {
    ...display,
    color: colors.white,
    textAlign: 'center',
    fontSize: 15,
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  playWrap: {
    alignSelf: 'stretch',
  },
  playBtn: {
    minHeight: 56,
  },
  playText: {
    fontSize: 28,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  menuBtn: {
    flex: 1,
    minHeight: 46,
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
