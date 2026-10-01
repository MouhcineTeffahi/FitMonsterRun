import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Rect } from 'react-native-svg';

import type { GameEntity } from '../data/types';
import { colors } from '../data/theme';
import { laneToX } from '../utils/lanes';

type Props = {
  entity: GameEntity;
  playfieldWidth: number;
  playfieldHeight: number;
  onCollectDone?: (id: number) => void;
};

function EntityShape({ entity }: { entity: GameEntity }) {
  if (entity.kind === 'coin') {
    return (
      <Svg width={36} height={36} viewBox="0 0 36 36">
        <Circle cx="18" cy="18" r="14" fill={colors.coin} />
        <Circle cx="18" cy="18" r="9" fill="#E6A000" />
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
      <Svg width={40} height={40} viewBox="0 0 40 40">
        <Rect x="6" y="6" width="28" height="28" rx="8" fill={fill} />
      </Svg>
    );
  }
  const fill =
    entity.variant === 'donut'
      ? '#F48FB1'
      : entity.variant === 'fries'
        ? '#EF4444'
        : '#A1887F';
  return (
    <Svg width={42} height={42} viewBox="0 0 42 42">
      <Circle cx="21" cy="21" r="16" fill={fill} />
    </Svg>
  );
}

export function Collectible({
  entity,
  playfieldWidth,
  playfieldHeight,
  onCollectDone,
}: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!entity.collected) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    scale.value = withSequence(
      withTiming(1.35, { duration: 90 }),
      withTiming(0.2, { duration: 140 }),
    );
    opacity.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished && onCollectDone) {
        runOnJS(onCollectDone)(entity.id);
      }
    });
  }, [entity.collected, entity.id, onCollectDone, opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!entity.active && !entity.collected) return null;

  const x = laneToX(entity.lane, playfieldWidth);
  const y = entity.y * playfieldHeight;

  return (
    <View
      style={[styles.wrap, { left: x - 20, top: y - 20 }]}
      pointerEvents="none"
    >
      <Animated.View style={animStyle}>
        <EntityShape entity={entity} />
      </Animated.View>
    </View>
  );
}

export const Obstacle = Collectible;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
