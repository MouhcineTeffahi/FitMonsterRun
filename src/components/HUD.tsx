import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../data/theme';
import { MAX_ENERGY } from '../data/theme';

type Props = {
  score: number;
  coins: number;
  distance: number;
  energy: number;
  multiplier?: number;
  paused: boolean;
  onPause: () => void;
};

/** Subway Surfers–style HUD: pause TL, score/multiplier/coins TR, energy bar. */
export function HUD({
  score,
  coins,
  distance,
  energy,
  multiplier = 1,
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
          <Text style={styles.pauseText}>{paused ? '▶' : '❚❚'}</Text>
        </Pressable>

        <View style={styles.rightCol}>
          <View style={styles.scoreRow}>
            <View style={styles.multiplier}>
              <Text style={styles.multiplierText}>x{multiplier}</Text>
            </View>
            <Text style={styles.scoreText}>
              {String(Math.floor(score)).padStart(5, '0')}
            </Text>
          </View>
          <View style={styles.coinRow}>
            <View style={styles.coinIcon}>
              <Text style={styles.coinStar}>★</Text>
            </View>
            <Text style={styles.coinText}>{coins}</Text>
          </View>
          <Text style={styles.distanceText}>{Math.floor(distance)} m</Text>
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
                backgroundColor: energyPct > 0.35 ? colors.green : colors.red,
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
    paddingTop: 16,
    paddingHorizontal: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  pauseBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pauseText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multiplier: {
    backgroundColor: colors.yellow,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 36,
    alignItems: 'center',
  },
  multiplierText: {
    color: colors.black,
    fontWeight: '900',
    fontSize: 13,
  },
  scoreText: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coinIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinStar: {
    color: colors.black,
    fontSize: 11,
    fontWeight: '900',
  },
  coinText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  distanceText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '800',
  },
  energyWrap: {
    position: 'absolute',
    start: 14,
    bottom: 110,
    alignItems: 'center',
    gap: 6,
  },
  energyLabel: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  energyTrack: {
    width: 14,
    height: 120,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'flex-end',
  },
  energyFill: {
    width: '100%',
    borderRadius: 8,
  },
});
