import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { colors, radii } from '../data/theme';
import { playSfx } from '../game/audio/sfx';
import { display } from './fonts';

type Props = {
  reward: number;
  onClose: () => void;
};

/** Run-reward chest: pop animation then grant coins. */
export function ChestModal({ reward, onClose }: Props) {
  const scale = useSharedValue(0.4);
  useEffect(() => {
    playSfx('level');
    scale.value = withSequence(withSpring(1.12, { damping: 8, stiffness: 180 }), withTiming(1, { duration: 160 }));
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.root}>
      <Animated.View style={[styles.card, style]}>
        <Text style={styles.box}>🧰</Text>
        <Text style={styles.title}>COFFRE OUVERT !</Text>
        <Text style={styles.reward}>+{reward} 💪</Text>
        <Pressable style={styles.btn} onPress={onClose} accessibilityRole="button">
          <Text style={styles.btnText}>GÉNIAL</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10,16,32,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  card: {
    width: '84%',
    maxWidth: 340,
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.yellow,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  box: {
    fontSize: 56,
  },
  title: {
    ...display,
    color: colors.yellow,
    fontSize: 24,
  },
  reward: {
    ...display,
    color: colors.white,
    fontSize: 32,
  },
  btn: {
    marginTop: 8,
    backgroundColor: colors.yellow,
    borderBottomWidth: 4,
    borderBottomColor: '#B86E00',
    borderRadius: radii.md,
    paddingVertical: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnText: {
    ...display,
    color: colors.black,
    fontSize: 20,
  },
});
