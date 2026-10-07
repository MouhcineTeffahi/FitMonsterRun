import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii } from '../data/theme';
import { DumbbellMark } from './DumbbellMark';
import { display } from './fonts';

type Props = {
  level: number;
  score: number;
  bonus: number;
  onNext: () => void;
};

/**
 * NIVEAU TERMINÉ ! card. Sits in the lower half so the celebrating runner under
 * the checkered arch stays visible in the 3D view above it.
 */
export function LevelComplete({ level, score, bonus, onNext }: Props) {
  const pop = useSharedValue(0);
  const card = useSharedValue(0);

  useEffect(() => {
    pop.value = withSpring(1, { damping: 9, stiffness: 160 });
    card.value = withDelay(220, withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.6)) }));
  }, [card, pop]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.5),
    transform: [{ scale: 0.4 + pop.value * 0.6 }, { rotate: '-4deg' }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [{ translateY: (1 - card.value) * 60 }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.titleWrap, titleStyle]}>
        <Text style={styles.titleShadow}>NIVEAU TERMINÉ !</Text>
        <Text style={styles.title}>NIVEAU TERMINÉ !</Text>
      </Animated.View>
      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.levelText}>NIVEAU {level} RÉUSSI</Text>
        <Text style={styles.keepGoing}>Continue — le prochain tronçon est plus long</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>SCORE</Text>
            <Text style={styles.statValue}>{Math.floor(score)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>BONUS</Text>
            <View style={styles.bonusRow}>
              <DumbbellMark size={22} />
              <Text style={styles.statValue}>+{bonus}</Text>
            </View>
          </View>
        </View>
        <Pressable style={styles.nextBtn} onPress={onNext} accessibilityRole="button">
          <Text style={styles.nextText}>SUIVANT</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 56,
    gap: 14,
  },
  titleWrap: {
    alignItems: 'center',
  },
  title: {
    ...display,
    color: colors.yellowBright,
    fontSize: 40,
    textShadowColor: '#7A3B00',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  titleShadow: {
    ...display,
    position: 'absolute',
    color: '#111',
    fontSize: 40,
    top: 5,
    left: 3,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(10,16,32,0.92)',
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 18,
    gap: 14,
    alignItems: 'center',
  },
  levelText: {
    ...display,
    color: colors.yellowBright,
    fontSize: 16,
    letterSpacing: 1,
  },
  keepGoing: {
    ...display,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    width: 2,
    height: 40,
    backgroundColor: colors.border,
  },
  statLabel: {
    ...display,
    color: colors.muted,
    fontSize: 13,
  },
  statValue: {
    ...display,
    color: colors.white,
    fontSize: 30,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextBtn: {
    backgroundColor: colors.yellow,
    borderBottomWidth: 4,
    borderBottomColor: '#B86E00',
    borderRadius: radii.md,
    paddingVertical: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  nextText: {
    ...display,
    color: colors.black,
    fontSize: 24,
  },
});
