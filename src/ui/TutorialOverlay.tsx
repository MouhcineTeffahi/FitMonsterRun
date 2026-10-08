import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii } from '../data/theme';
import { display } from './fonts';

const STEPS = [
  {
    key: 'swipe',
    title: 'COULOIRS',
    text: 'Glisse ← → pour changer de voie',
    hint: '3 couloirs · évite les camions',
    icon: '← →',
  },
  {
    key: 'jump',
    title: 'SAUT',
    text: 'Glisse ↑ ou tape pour sauter',
    hint: 'Passe au-dessus des obstacles',
    icon: '↑',
  },
  {
    key: 'slide',
    title: 'GLISSÉE',
    text: 'Glisse ↓ pour te baisser',
    hint: 'Passe sous les panneaux',
    icon: '↓',
  },
  {
    key: 'slap',
    title: 'CLAC !',
    text: 'Heurte les canapés pour les réveiller',
    hint: '+pièces et potes jogging',
    icon: '👋',
  },
] as const;

const STEP_MS = 6500;

type Props = {
  onDone: () => void;
  /** Called when the player taps PLAY on the last step (or after skip). */
  onPlay?: () => void;
};

/** First-run ~30s tutorial: swipe / jump / slide / slap, then PLAY. */
export function TutorialOverlay({ onDone, onPlay }: Props) {
  const [i, setI] = useState(0);
  const last = i >= STEPS.length - 1;
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 520, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [bob]);

  useEffect(() => {
    if (last) return;
    const id = setTimeout(() => setI((n) => Math.min(n + 1, STEPS.length - 1)), STEP_MS);
    return () => clearTimeout(id);
  }, [i, last]);

  const finish = useCallback(
    (play: boolean) => {
      onDone();
      if (play) onPlay?.();
    },
    [onDone, onPlay],
  );

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value * -10 }, { scale: 1 + bob.value * 0.06 }],
  }));

  const step = STEPS[i];

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.kicker}>TUTORIEL · {i + 1}/{STEPS.length}</Text>
        <Animated.Text style={[styles.icon, iconStyle]}>{step.icon}</Animated.Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.text}>{step.text}</Text>
        <Text style={styles.hint}>{step.hint}</Text>

        <View style={styles.dots}>
          {STEPS.map((s, idx) => (
            <View key={s.key} style={[styles.dot, idx === i && styles.dotOn, idx < i && styles.dotDone]} />
          ))}
        </View>

        {last ? (
          <Pressable style={styles.play} onPress={() => finish(true)} accessibilityRole="button">
            <Text style={styles.playText}>JOUER</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.next}
            onPress={() => setI((n) => Math.min(n + 1, STEPS.length - 1))}
            accessibilityRole="button"
          >
            <Text style={styles.nextText}>SUIVANT</Text>
          </Pressable>
        )}

        <Pressable style={styles.skip} onPress={() => finish(false)} accessibilityRole="button">
          <Text style={styles.skipText}>PASSER</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,12,24,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 40,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(16,24,44,0.96)',
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.yellow,
    paddingHorizontal: 22,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 8,
  },
  kicker: {
    ...display,
    color: colors.yellow,
    fontSize: 12,
    letterSpacing: 1,
  },
  icon: {
    ...display,
    color: colors.white,
    fontSize: 48,
    marginVertical: 6,
  },
  title: {
    ...display,
    color: colors.yellow,
    fontSize: 26,
  },
  text: {
    ...display,
    color: colors.white,
    fontSize: 18,
    textAlign: 'center',
  },
  hint: {
    ...display,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  dotOn: {
    backgroundColor: colors.yellow,
    width: 22,
  },
  dotDone: {
    backgroundColor: colors.green,
  },
  play: {
    marginTop: 8,
    backgroundColor: colors.yellow,
    borderBottomWidth: 4,
    borderBottomColor: '#B86E00',
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 36,
    minWidth: 200,
    alignItems: 'center',
  },
  playText: {
    ...display,
    color: colors.black,
    fontSize: 24,
  },
  next: {
    marginTop: 8,
    backgroundColor: colors.panelElevated,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minWidth: 180,
    alignItems: 'center',
  },
  nextText: {
    ...display,
    color: colors.white,
    fontSize: 18,
  },
  skip: {
    paddingVertical: 8,
  },
  skipText: {
    ...display,
    color: colors.muted,
    fontSize: 14,
  },
});
