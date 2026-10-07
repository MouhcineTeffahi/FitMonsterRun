import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, MAX_ENERGY, radii } from '../data/theme';
import { COMBO_WINDOW, levelGoalFor, POWER_CHARGE, POWER_TIME, type RunStats } from '../game/sim/runSim';
import { BuffRings } from './BuffRings';
import { DumbbellMark } from './DumbbellMark';
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
  /** Name of the world under the runner. */
  space?: string | null;
};

/**
 * In-run HUD (mockup layout): pause + multiplier top-left, coins/distance pills
 * top-right, vertical ÉNERGIE bar on the left, mission box at the bottom that
 * turns into the MODE POWER ! timer while power mode runs.
 */
export function HUD({ stats, mission, paused, onPause, space }: Props) {
  const energyPct = Math.max(0, Math.min(1, stats.energy / MAX_ENERGY));
  const powered = stats.power > 0;
  const mult = stats.multiplier * (powered ? 2 : 1);
  const energyColor = energyPct > 0.5 ? colors.green : energyPct > 0.25 ? colors.yellow : colors.red;
  const low = energyPct <= 0.25 && stats.energy > 0;
  const levelStart = levelGoalFor(stats.level - 1);
  const levelSpan = Math.max(1, stats.levelGoal - levelStart);
  const levelPct = Math.max(0, Math.min(1, (stats.distance - levelStart) / levelSpan));
  const levelLeft = Math.max(0, Math.ceil(stats.levelGoal - stats.distance));
  const levelClose = levelPct >= 0.82;
  const pulse = useSharedValue(1);
  const comboPop = useSharedValue(1);
  const coinPop = useSharedValue(1);
  const levelPulse = useSharedValue(1);
  const lastCoins = useRef(stats.coins);

  useEffect(() => {
    if (!low) {
      pulse.value = withTiming(1, { duration: 90 });
      return;
    }
    pulse.value = withRepeat(
      withSequence(withTiming(0.28, { duration: 140 }), withTiming(1, { duration: 140 })),
      -1,
      false,
    );
  }, [low, pulse]);

  useEffect(() => {
    if (stats.combo < 2) {
      comboPop.value = 1;
      return;
    }
    comboPop.value = withSequence(
      withTiming(1.28, { duration: 70 }),
      withSpring(1, { damping: 8, stiffness: 240 }),
    );
  }, [stats.combo, comboPop]);

  useEffect(() => {
    if (stats.coins > lastCoins.current) {
      coinPop.value = withSequence(withTiming(1.16, { duration: 70 }), withTiming(1, { duration: 160 }));
    }
    lastCoins.current = stats.coins;
  }, [stats.coins, coinPop]);

  useEffect(() => {
    if (!levelClose) {
      levelPulse.value = withTiming(1, { duration: 120 });
      return;
    }
    levelPulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 220 }), withTiming(0.55, { duration: 220 })),
      -1,
      false,
    );
  }, [levelClose, levelPulse]);

  const energyStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.92 + pulse.value * 0.08 }],
  }));
  const comboStyle = useAnimatedStyle(() => ({ transform: [{ scale: comboPop.value }] }));
  const coinStyle = useAnimatedStyle(() => ({ transform: [{ scale: coinPop.value }] }));
  const levelFillStyle = useAnimatedStyle(() => ({ opacity: 0.72 + levelPulse.value * 0.28 }));

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
          {stats.comboMult >= 2 ? (
            <Animated.View style={[styles.comboBadge, stats.comboMult >= 5 && styles.comboHot, comboStyle]}>
              <Text style={styles.comboText}>COMBO x{stats.comboMult}</Text>
              <View style={styles.comboTrack}>
                <View style={[styles.comboFill, { width: `${Math.max(6, (stats.comboT / COMBO_WINDOW) * 100)}%` }]} />
              </View>
            </Animated.View>
          ) : null}
          <BuffRings power={stats.power} magnet={stats.magnet} shield={stats.shield} boost={stats.boost} />
        </View>

        <View style={styles.rightCol} pointerEvents="none">
          <Animated.View style={[styles.pill, coinStyle]}>
            <Text style={styles.pillText}>{stats.coins}</Text>
            <DumbbellMark size={28} />
          </Animated.View>
          <View style={[styles.pill, styles.pillSmall]}>
            <Text style={styles.distText}>{Math.floor(stats.distance)} m</Text>
          </View>
          <Text style={styles.score}>{String(Math.floor(stats.score)).padStart(6, '0')}</Text>
        </View>
      </View>

      <View style={styles.levelRow} pointerEvents="none">
        <Text style={styles.levelName}>LV. {stats.level}</Text>
        <View style={styles.levelTrack}>
          <Animated.View
            style={[
              styles.levelFill,
              {
                width: `${levelPct * 100}%`,
                backgroundColor: levelClose ? colors.green : powered ? colors.power : colors.yellow,
              },
              levelFillStyle,
            ]}
          />
        </View>
        <Text style={[styles.levelLeft, levelClose && styles.levelLeftHot]}>
          {levelClose
            ? 'BIENTÔT'
            : levelLeft >= 1000
              ? `${(levelLeft / 1000).toFixed(1)} km`
              : `${levelLeft} m`}
        </Text>
      </View>
      {space ? (
        <View style={styles.spaceChip} pointerEvents="none">
          <Text style={styles.spaceText}>{space}</Text>
        </View>
      ) : null}

      <Animated.View style={[styles.energyWrap, energyStyle]} pointerEvents="none">
        <View style={[styles.energyTrack, low && styles.energyTrackLow]}>
          <View
            style={[
              styles.energyFill,
              { height: `${energyPct * 100}%`, backgroundColor: energyColor },
            ]}
          />
          <View style={styles.energyShine} />
        </View>
        <Text style={[styles.energyLabel, low && styles.energyLabelLow]}>{low ? 'FAIBLE !' : 'ÉNERGIE'}</Text>
      </Animated.View>

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
  comboBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.yellow,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: '#FFF6B0',
  },
  comboHot: {
    backgroundColor: colors.power,
    borderColor: '#FFFFFF',
  },
  comboText: {
    ...display,
    color: colors.black,
    fontSize: 14,
  },
  comboTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.28)',
    overflow: 'hidden',
    marginTop: 2,
  },
  comboFill: {
    height: '100%',
    backgroundColor: colors.black,
    borderRadius: 2,
  },
  levelRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spaceChip: {
    alignSelf: 'center',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(10,16,32,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  spaceText: {
    ...display,
    color: colors.yellowBright,
    fontSize: 12,
  },
  levelName: {
    ...display,
    color: colors.white,
    fontSize: 13,
    width: 52,
  },
  levelTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(10,16,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    backgroundColor: colors.yellow,
    borderRadius: 5,
  },
  levelLeft: {
    ...display,
    color: colors.white,
    fontSize: 12,
    width: 58,
    textAlign: 'right',
  },
  levelLeftHot: {
    color: colors.green,
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
    top: 178,
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
  energyTrackLow: {
    borderColor: colors.red,
    borderWidth: 3,
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
  energyLabelLow: {
    color: colors.red,
    fontSize: 13,
  },
  bottom: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 40,
    alignItems: 'center',
  },
});
