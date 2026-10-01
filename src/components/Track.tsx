import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Polygon, Rect } from 'react-native-svg';

import { colors } from '../data/theme';

type Props = {
  width: number;
  height: number;
  speed: number;
  paused?: boolean;
};

/**
 * Perspective gym-track / road with scrolling dashes — Subway Surfers vibe,
 * Fit Monster palette.
 */
export function Track({ width, height, speed, paused }: Props) {
  const scroll = useSharedValue(0);

  useEffect(() => {
    if (paused || width <= 0) return;
    scroll.value = 0;
    scroll.value = withRepeat(
      withTiming(1, {
        duration: Math.max(280, 900 - speed * 0.6),
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [paused, scroll, speed, width]);

  const dashStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scroll.value * 90 }],
  }));

  if (width <= 0 || height <= 0) return null;

  const horizonY = height * 0.14;
  const topW = width * 0.16;
  const bottomW = width * 0.96;
  const cx = width / 2;

  const roadPoints = [
    `${cx - topW / 2},${horizonY}`,
    `${cx + topW / 2},${horizonY}`,
    `${cx + bottomW / 2},${height}`,
    `${cx - bottomW / 2},${height}`,
  ].join(' ');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* City / sky backdrop */}
      <View style={[styles.sky, { height: horizonY + 40 }]} />
      <View style={[styles.horizonGlow, { top: horizonY - 10 }]} />

      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Polygon points={roadPoints} fill={colors.road} />
        {/* Side curbs */}
        <Polygon
          points={`${cx - topW / 2 - 8},${horizonY} ${cx - topW / 2},${horizonY} ${cx - bottomW / 2},${height} ${cx - bottomW / 2 - 28},${height}`}
          fill="#1A1A20"
        />
        <Polygon
          points={`${cx + topW / 2},${horizonY} ${cx + topW / 2 + 8},${horizonY} ${cx + bottomW / 2 + 28},${height} ${cx + bottomW / 2},${height}`}
          fill="#1A1A20"
        />
      </Svg>

      {/* Scrolling dashed lane markers */}
      <Animated.View style={[styles.dashLayer, dashStyle]}>
        {Array.from({ length: 14 }).map((_, i) => {
          const t = (i + 1) / 15;
          const y = horizonY + t * (height - horizonY);
          const scale = 0.2 + t * 0.8;
          const gap = width * 0.12 * scale;
          return (
            <React.Fragment key={i}>
              <View
                style={[
                  styles.dash,
                  {
                    top: y,
                    left: cx - gap - 2 * scale,
                    width: 4 * scale,
                    height: 18 * scale,
                    opacity: 0.35 + t * 0.45,
                  },
                ]}
              />
              <View
                style={[
                  styles.dash,
                  {
                    top: y,
                    left: cx + gap - 2 * scale,
                    width: 4 * scale,
                    height: 18 * scale,
                    opacity: 0.35 + t * 0.45,
                  },
                ]}
              />
            </React.Fragment>
          );
        })}
      </Animated.View>

      {/* Side “buildings” / gym blocks for depth */}
      <View style={[styles.sideLeft, { top: horizonY + 20 }]}>
        <RectPlaceholder />
      </View>
      <View style={[styles.sideRight, { top: horizonY + 40 }]}>
        <RectPlaceholder tall />
      </View>
    </View>
  );
}

function RectPlaceholder({ tall }: { tall?: boolean }) {
  return (
    <Svg width={56} height={tall ? 120 : 80} viewBox="0 0 56 120">
      <Rect
        x="4"
        y={tall ? 0 : 40}
        width="48"
        height={tall ? 120 : 80}
        rx="4"
        fill="#0C0C10"
        opacity={0.55}
      />
      <Rect
        x="14"
        y={tall ? 20 : 55}
        width="10"
        height="10"
        fill={colors.yellow}
        opacity={0.35}
      />
      <Rect
        x="32"
        y={tall ? 40 : 70}
        width="10"
        height="10"
        fill={colors.yellow}
        opacity={0.25}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  sky: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: '#2F6FAE',
  },
  horizonGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: '#6BB7E0',
    opacity: 0.85,
  },
  dashLayer: {
    ...StyleSheet.absoluteFill,
  },
  dash: {
    position: 'absolute',
    backgroundColor: colors.yellow,
    borderRadius: 2,
  },
  sideLeft: {
    position: 'absolute',
    left: 4,
  },
  sideRight: {
    position: 'absolute',
    right: 4,
  },
});
