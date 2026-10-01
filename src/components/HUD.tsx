import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../data/theme';
import { MAX_ENERGY } from '../data/theme';

type Props = {
  score: number;
  coins: number;
  distance: number;
  energy: number;
  paused: boolean;
  onPause: () => void;
};

export function HUD({
  score,
  coins,
  distance,
  energy,
  paused,
  onPause,
}: Props) {
  const energyPct = Math.max(0, Math.min(1, energy / MAX_ENERGY));

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.topRow}>
        <Pressable
          onPress={onPause}
          style={styles.pauseBtn}
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Reprendre' : 'Pause'}
        >
          <Text style={styles.pauseText}>{paused ? '▶' : 'Ⅱ'}</Text>
        </Pressable>

        <View style={styles.statPill}>
          <Text style={styles.statLabel}>SCORE</Text>
          <Text style={styles.statValue}>{Math.floor(score)}</Text>
        </View>

        <View style={styles.rightCol}>
          <View style={styles.statPill}>
            <Text style={styles.coinDot}>●</Text>
            <Text style={styles.statValue}>{coins}</Text>
          </View>
          <View style={[styles.statPill, styles.distancePill]}>
            <Text style={styles.statValue}>{Math.floor(distance)} m</Text>
          </View>
        </View>
      </View>

      <View style={styles.energyWrap}>
        <Text style={styles.energyLabel}>ÉNERGIE</Text>
        <View style={styles.energyTrack}>
          <View
            style={[
              styles.energyFill,
              {
                height: `${energyPct * 100}%`,
                backgroundColor:
                  energyPct > 0.35 ? colors.green : colors.red,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    paddingTop: 18,
    paddingHorizontal: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  pauseBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#33333D',
  },
  pauseText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statPill: {
    backgroundColor: colors.black,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2A2A33',
  },
  distancePill: {
    backgroundColor: colors.panel,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  statValue: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  coinDot: {
    color: colors.yellow,
    fontSize: 12,
  },
  energyWrap: {
    position: 'absolute',
    start: 14,
    bottom: 120,
    alignItems: 'center',
    gap: 6,
  },
  energyLabel: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  energyTrack: {
    width: 14,
    height: 120,
    borderRadius: 8,
    backgroundColor: colors.black,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#33333D',
    justifyContent: 'flex-end',
  },
  energyFill: {
    width: '100%',
    borderRadius: 8,
  },
});
