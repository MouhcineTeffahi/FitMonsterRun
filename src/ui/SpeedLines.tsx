import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BASE_SPEED } from '../game/sim/runSim';

const LINES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.12 : -0.08);
  return {
    angle,
    radius: 0.44 + (i % 3) * 0.04,
    length: 50 + ((i * 37) % 60),
    phase: (i * 0.37) % 1,
  };
});

type Props = { speed: number; combo?: number; powered?: boolean };

/** Comic speed streaks around the screen edge; stronger as the run speeds up. */
export function SpeedLines({ speed, combo = 0, powered = false }: Props) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 420, easing: Easing.linear }), -1, false);
  }, [t]);

  const speedIntensity = Math.min(1, Math.max(0, (speed - BASE_SPEED * 0.95) / (BASE_SPEED * 0.9)));
  const comboBoost = Math.min(0.35, Math.max(0, (combo - 3) * 0.04));
  const intensity = Math.min(1, speedIntensity + comboBoost + (powered ? 0.22 : 0));
  if (intensity <= 0.02) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {LINES.map((line, i) => (
        <Line key={i} t={t} intensity={intensity} {...line} />
      ))}
    </View>
  );
}

type LineProps = (typeof LINES)[number] & { t: SharedValue<number>; intensity: number };

function Line({ t, intensity, angle, radius, length, phase }: LineProps) {
  const style = useAnimatedStyle(() => {
    const p = (t.value + phase) % 1;
    const d = p * 46;
    return {
      opacity: (1 - p) * 0.55 * intensity,
      transform: [
        { translateX: Math.cos(angle) * d },
        { translateY: Math.sin(angle) * d },
        { rotate: `${angle}rad` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.line,
        {
          left: `${50 + Math.cos(angle) * radius * 100}%`,
          top: `${50 + Math.sin(angle) * radius * 100}%`,
          width: length,
          marginLeft: -length / 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});
