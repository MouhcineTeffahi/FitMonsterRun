import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, MAX_ENERGY, radii } from '../data/theme';
import { POWER_CHARGE, POWER_TIME, type RunStats } from '../game/sim/runSim';
import { display } from './fonts';
import { MissionBox } from './MissionBox';

export type MissionView = {
  label: string;
  progress: number;
  target: number;
  icon: string;
};

type Props = {
  stats: RunStats;
  mission: MissionView | null;
  paused: boolean;
  onPause: () => void;
};

/**
 * In-run HUD (mockup layout): pause + multiplier top-left, coins/distance pills
 * top-right, vertical ÉNERGIE bar on the left, mission box at the bottom that
 * turns into the MODE POWER ! timer while power mode runs.
 */
export function HUD({ stats, mission, paused, onPause }: Props) {
  const energyPct = Math.max(0, Math.min(1, stats.energy / MAX_ENERGY));
  const powered = stats.power > 0;
  const mult = stats.multiplier * (powered ? 2 : 1);
  const energyColor = energyPct > 0.5 ? colors.green : energyPct > 0.25 ? colors.yellow : colors.red;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.topRow} pointerEvents="box-none">
        <View style={styles.leftCol} pointerEvents="box-none">
          <View style={styles.row} pointerEvents="box-none">
            <Pressable
              onPress={onPause}
              style={styles.pauseBtn}
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Reprendre' : 'Pause'}
            >
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </Pressable>
            <View style={[styles.multBadge, powered && styles.multPowered]}>
              <Text style={[styles.multText, powered && { color: colors.black }]}>x{mult}</Text>
            </View>
          </View>
          <View style={styles.pips} pointerEvents="none">
            {Array.from({ length: POWER_CHARGE }, (_, i) => (
              <View
                key={i}
                style={[styles.pip, (powered || i < stats.powerCharge) && styles.pipOn]}
              />
            ))}
          </View>
        </View>

        <View style={styles.rightCol} pointerEvents="none">
          <View style={styles.pill}>
            <Text style={styles.pillText}>{stats.coins}</Text>
            <View style={styles.coin}>
              <View style={styles.coinInner} />
            </View>
          </View>
          <View style={[styles.pill, styles.pillSmall]}>
            <Text style={styles.distText}>{Math.floor(stats.distance)} m</Text>
          </View>
          <Text style={styles.score}>{String(Math.floor(stats.score)).padStart(6, '0')}</Text>
        </View>
      </View>

      <View style={styles.energyWrap} pointerEvents="none">
        <View style={styles.energyTrack}>
          <View
            style={[
              styles.energyFill,
              { height: `${energyPct * 100}%`, backgroundColor: energyColor },
            ]}
          />
          <View style={styles.energyShine} />
        </View>
        <Text style={styles.energyLabel}>ÉNERGIE</Text>
      </View>

      <View style={styles.bottom} pointerEvents="none">
        {powered ? (
          <MissionBox
            label="MODE POWER !"
            fill={stats.power / POWER_TIME}
            icon="⚡"
            accent={colors.power}
            power
          />
        ) : mission ? (
          <MissionBox
            label={mission.label}
            fill={mission.progress / mission.target}
            counter={`${Math.min(mission.progress, mission.target)}/${mission.target}`}
            icon={mission.icon}
          />
        ) : null}
      </View>
    </View>
  );
}

const panel = {
  backgroundColor: 'rgba(10,16,32,0.82)',
  borderWidth: 2,
  borderColor: 'rgba(255,255,255,0.16)',
} as const;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    paddingTop: 14,
    paddingHorizontal: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  leftCol: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pauseBtn: {
    ...panel,
    width: 46,
    height: 46,
    borderRadius: radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  pauseBar: {
    width: 5,
    height: 17,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  multBadge: {
    ...panel,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    height: 38,
    justifyContent: 'center',
  },
  multPowered: {
    backgroundColor: colors.power,
    borderColor: '#FFF6B0',
  },
  multText: {
    ...display,
    color: '#7CFF6B',
    fontSize: 20,
  },
  pips: {
    flexDirection: 'row',
    gap: 4,
    paddingLeft: 2,
  },
  pip: {
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pipOn: {
    backgroundColor: colors.power,
    borderColor: '#FFF6B0',
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  pill: {
    ...panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.pill,
    paddingLeft: 14,
    paddingRight: 5,
    height: 40,
    minWidth: 104,
    justifyContent: 'flex-end',
  },
  pillSmall: {
    height: 32,
    minWidth: 84,
    paddingRight: 12,
  },
  pillText: {
    ...display,
    color: colors.white,
    fontSize: 22,
  },
  coin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFC21A',
    borderWidth: 2,
    borderColor: '#FFE88A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#D88A00',
  },
  distText: {
    ...display,
    color: colors.white,
    fontSize: 17,
  },
  score: {
    ...display,
    color: colors.white,
    fontSize: 16,
    opacity: 0.9,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    letterSpacing: 1,
  },
  energyWrap: {
    position: 'absolute',
    left: 14,
    top: 150,
    alignItems: 'center',
    gap: 4,
  },
  energyTrack: {
    width: 22,
    height: 150,
    borderRadius: 11,
    backgroundColor: 'rgba(10,16,32,0.82)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  energyFill: {
    width: '100%',
    borderRadius: 9,
  },
  energyShine: {
    position: 'absolute',
    left: 3,
    top: 4,
    bottom: 4,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  energyLabel: {
    ...display,
    color: colors.white,
    fontSize: 11,
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  bottom: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 40,
    alignItems: 'center',
  },
});
