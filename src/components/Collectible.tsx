import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';

import type { GameEntity } from '../data/types';
import { colors } from '../data/theme';
import { depthScale, laneToX } from '../utils/lanes';

type Props = {
  entity: GameEntity;
  playfieldWidth: number;
  playfieldHeight: number;
  onCollectDone?: (id: number) => void;
};

function EntityShape({
  entity,
  size,
}: {
  entity: GameEntity;
  size: number;
}) {
  if (entity.kind === 'coin') {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Circle cx="20" cy="20" r="16" fill={colors.coin} />
        <Circle cx="20" cy="20" r="11" fill="#E6A000" />
        <SvgText
          x="20"
          y="25"
          fill={colors.black}
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
        >
          ★
        </SvgText>
      </Svg>
    );
  }
  if (entity.kind === 'healthy') {
    const fill =
      entity.variant === 'whey'
        ? '#42A5F5'
        : entity.variant === 'chicken'
          ? '#FFB74D'
          : colors.healthy;
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Rect x="5" y="5" width="30" height="30" rx="8" fill={fill} />
      </Svg>
    );
  }
  // Junk = big obstacle blocks (train / barrier feel)
  const fill =
    entity.variant === 'donut'
      ? '#F48FB1'
      : entity.variant === 'fries'
        ? '#EF4444'
        : '#8D6E63';
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 48 60">
      <Rect x="4" y="8" width="40" height="48" rx="6" fill={fill} />
      <Rect x="10" y="16" width="28" height="8" rx="2" fill="#00000055" />
      <Rect x="10" y="30" width="28" height="8" rx="2" fill="#00000044" />
    </Svg>
  );
}

export function Collectible({
  entity,
  playfieldWidth,
  playfieldHeight,
  onCollectDone,
}: Props) {
  const scaleAnim = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!entity.collected) {
      scaleAnim.value = 1;
      opacity.value = 1;
      return;
    }
    scaleAnim.value = withSequence(
      withTiming(1.4, { duration: 80 }),
      withTiming(0.15, { duration: 140 }),
    );
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished && onCollectDone) {
        runOnJS(onCollectDone)(entity.id);
      }
    });
  }, [entity.collected, entity.id, onCollectDone, opacity, scaleAnim]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  if (!entity.active && !entity.collected) return null;

  const depth = Math.max(0, Math.min(1.05, entity.y));
  const scale = depthScale(depth);
  const base = entity.kind === 'junk' ? 56 : 40;
  const size = base * scale;
  const x = laneToX(entity.lane, playfieldWidth, depth);
  const y = depth * playfieldHeight;

  return (
    <View
      style={[
        styles.wrap,
        {
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size * (entity.kind === 'junk' ? 1.25 : 1),
          zIndex: Math.floor(depth * 100),
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View style={animStyle}>
        <EntityShape entity={entity} size={size} />
      </Animated.View>
    </View>
  );
}

export const Obstacle = Collectible;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
