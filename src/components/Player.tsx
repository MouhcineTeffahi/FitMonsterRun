import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import type { SkinDef } from '../data/skins';
import { MonsterPreview } from './MonsterPreview';

type Props = {
  skin: SkinDef;
  x: SharedValue<number>;
  shakeX: SharedValue<number>;
  size?: number;
};

export function Player({ skin, x, shakeX, size = 72 }: Props) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value + shakeX.value - size / 2 },
      { translateY: 0 },
    ],
  }));

  return (
    <Animated.View style={[styles.player, { width: size, height: size * 1.15 }, style]}>
      <MonsterPreview skin={skin} size={size} />
      <View style={styles.shadow} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  player: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    alignItems: 'center',
  },
  shadow: {
    position: 'absolute',
    bottom: 2,
    width: 36,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#00000055',
  },
});
