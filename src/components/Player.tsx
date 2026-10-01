import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import type { SkinDef } from '../data/skins';
import { colors } from '../data/theme';

type Props = {
  skin: SkinDef;
  x: SharedValue<number>;
  shakeX: SharedValue<number>;
  jumpY: SharedValue<number>;
  size?: number;
};

/** Behind-the-back runner silhouette (Subway Surfers camera feel). */
export function Player({ skin, x, shakeX, jumpY, size = 88 }: Props) {
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 160, easing: Easing.linear }),
        withTiming(0, { duration: 160, easing: Easing.linear }),
      ),
      -1,
      false,
    );
  }, [bob]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value + shakeX.value - size / 2 },
      { translateY: bob.value + jumpY.value },
    ],
  }));

  return (
    <Animated.View
      style={[styles.player, { width: size, height: size * 1.2 }, style]}
    >
      <Svg width={size} height={size * 1.2} viewBox="0 0 100 120">
        <Ellipse cx="50" cy="112" rx="22" ry="6" fill="#00000066" />
        {/* Legs running */}
        <Rect x="34" y="78" width="12" height="28" rx="5" fill={skin.secondary} />
        <Rect x="54" y="78" width="12" height="28" rx="5" fill={skin.secondary} />
        {/* Body from behind */}
        <Rect x="30" y="42" width="40" height="42" rx="12" fill={skin.primary} />
        <Rect x="38" y="50" width="24" height="16" rx="4" fill={skin.secondary} />
        {/* Arms */}
        <Rect x="16" y="48" width="14" height="30" rx="7" fill={skin.accent} />
        <Rect x="70" y="48" width="14" height="30" rx="7" fill={skin.accent} />
        {/* Head from behind */}
        <Circle cx="50" cy="28" r="18" fill={skin.primary} />
        <Path
          d="M34 24 Q50 10 66 24"
          stroke={skin.accent}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        {/* Yellow fitness glow stripe */}
        <Rect x="46" y="44" width="8" height="34" rx="3" fill={colors.yellow} opacity={0.85} />
      </Svg>
      <View style={styles.dust} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  player: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  dust: {
    position: 'absolute',
    bottom: 4,
    width: 40,
    height: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF22',
  },
});
