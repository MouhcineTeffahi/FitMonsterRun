import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../data/theme';
import { display } from './fonts';

type Props = {
  label: string;
  /** 0..1 fill of the progress bar. */
  fill: number;
  /** Right-aligned counter inside the bar (e.g. "8/20"); omitted for timers. */
  counter?: string;
  icon: string;
  accent?: string;
  power?: boolean;
};

/** Bottom-of-screen objective panel: current mission, or the MODE POWER ! timer. */
export function MissionBox({ label, fill, counter, icon, accent = colors.green, power }: Props) {
  const pct = `${Math.round(Math.max(0, Math.min(1, fill)) * 100)}%` as const;
  return (
    <View style={[styles.box, power && styles.powerBox]} pointerEvents="none">
      <View style={styles.texts}>
        <Text style={[styles.label, power && { color: colors.power }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: pct, backgroundColor: accent }]} />
          {counter ? <Text style={styles.counter}>{counter}</Text> : null}
        </View>
      </View>
      <Text style={styles.icon}>{icon}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(10,16,32,0.86)',
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
    maxWidth: 380,
  },
  powerBox: {
    borderColor: colors.power,
  },
  texts: {
    flex: 1,
    gap: 6,
  },
  label: {
    ...display,
    color: colors.white,
    fontSize: 17,
    letterSpacing: 0.3,
  },
  track: {
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 9,
  },
  counter: {
    ...display,
    color: colors.white,
    fontSize: 12,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  icon: {
    fontSize: 30,
  },
});
