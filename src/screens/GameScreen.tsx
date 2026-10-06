import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { MISSIONS, type ChallengeStat } from '../data/challenges';
import { paintedSkin } from '../data/playerColors';
import { getSkin } from '../data/skins';
import { getSpace } from '../data/spaces';
import { colors, MAX_ENERGY } from '../data/theme';
import type { RunSummary } from '../data/types';
import {
  RunnerScene,
  type PickupEvent,
  type RunControls,
  type RunStats,
} from '../game/RunnerScene';
import { clampLane } from '../game/sim/patterns';
import { BASE_SPEED, LEVEL_BONUS_COINS, NEAR_MISS_COINS, SLAP_COINS, SPACE_BONUS, levelGoalFor } from '../game/sim/runSim';
import { BIOME_NAME, setBiomeOrder, type Biome } from '../game/world/biomes';
import { useProgressStore } from '../store/progressStore';
import { display } from '../ui/fonts';
import { HUD, type MissionView } from '../ui/HUD';
import { LevelComplete } from '../ui/LevelComplete';
import { SpeedLines } from '../ui/SpeedLines';
import { Vignette } from '../ui/Vignette';

type Props = {
  /** Coins plus the stats shown on the game-over screen. */
  onGameOver: (summary: RunSummary) => void;
};

type IntroStep = 3 | 2 | 1 | 'go' | null;

const INITIAL_STATS: RunStats = {
  score: 0,
  coins: 0,
  distance: 0,
  energy: MAX_ENERGY,
  proteins: 0,
  multiplier: 1,
  speed: BASE_SPEED,
  power: 0,
  powerCharge: 0,
  level: 1,
  levelGoal: levelGoalFor(1),
  roofs: 0,
  junkDodged: 0,
  combo: 0,
  bestCombo: 0,
  nearMisses: 0,
};

type Toast = { text: string; color: string };

const TOASTS: Partial<Record<PickupEvent, Toast>> = {
  healthy: { text: 'HEALTHY! +ENERGY', color: colors.green },
  protein: { text: 'PROTEIN! 💪', color: colors.protein },
  roof: { text: 'ON THE TRUCK!', color: colors.yellow },
  platform: { text: 'PLATFORM!', color: '#00E5FF' },
  smash: { text: 'SMASH!', color: '#FF7A45' },
  lowEnergy: { text: 'LOW ENERGY!', color: colors.red },
};

/** Events with several silly lines; one is picked at random each time. */
const FUNNY: Partial<Record<PickupEvent, { lines: string[]; color: string }>> = {
  slap: { lines: [`PAF! GO TRAIN! +${SLAP_COINS}🪙`, `WAKE UP & LIFT! +${SLAP_COINS}🪙`, `NO MORE COUCH! +${SLAP_COINS}🪙`], color: '#FF8A3D' },
  kick: { lines: [`YEET! 🦵 +${SLAP_COINS}🪙`, `LEG DAY! +${SLAP_COINS}🪙`, `CARDIO TIME! +${SLAP_COINS}🪙`], color: '#FF8A3D' },
  convert: { lines: ['CONVERTED! JOGGING BUDDY 🏃', 'NEW GYM BRO! 🏃', 'HE LIKES CARDIO NOW! 🏃'], color: colors.green },
  burp: { lines: ['BURP! 🤢', 'CHEAT DAY?!', 'SO MUCH GREASE!'], color: colors.red },
  bonk: { lines: ['BONK! 💫', 'OUCH, MY GAINS!', 'WHO PUT THAT THERE?!'], color: colors.red },
  power: { lines: ['POWER MODE! ⚡', 'BEAST MODE! 🦍', 'GAINS UNLOCKED! 💪'], color: colors.power },
  nearMiss: {
    lines: [
      `CLOSE CALL! +${NEAR_MISS_COINS}🪙`,
      `TOO CLOSE! +${NEAR_MISS_COINS}🪙`,
      `NINJA DODGE! +${NEAR_MISS_COINS}🪙`,
    ],
    color: '#7CFF6B',
  },
};

function toastFor(event: PickupEvent): Toast | undefined {
  const funny = FUNNY[event];
  if (funny) return { text: funny.lines[Math.floor(Math.random() * funny.lines.length)], color: funny.color };
  return TOASTS[event];
}

const HINT_TIME_MS = 7000;

function statValue(stats: RunStats, stat: ChallengeStat): number {
  return Math.floor(stats[stat]);
}

export function GameScreen({ onGameOver }: Props) {
  const selectedSkin = useProgressStore((s) => s.selectedSkin);
  const playerColors = useProgressStore((s) => s.playerColors);
  const applyRunTick = useProgressStore((s) => s.applyRunTick);
  const finishRun = useProgressStore((s) => s.finishRun);
  const addCoins = useProgressStore((s) => s.addCoins);
  const resetRun = useProgressStore((s) => s.resetRun);
  const recordRun = useProgressStore((s) => s.recordRun);
  const skin = useMemo(
    () => paintedSkin(getSkin(selectedSkin), playerColors),
    [selectedSkin, playerColors],
  );

  const selectedSpace = useProgressStore((s) => s.selectedSpace);
  // The world reads the rotation while mounting, so set it before the first render of the scene.
  useState(() => setBiomeOrder(getSpace(selectedSpace).biomes));
  const [biome, setBiome] = useState<Biome | null>(null);
  const firstBiome = useRef(true);
  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState<RunStats>(INITIAL_STATS);
  const [toast, setToast] = useState<Toast | null>(null);
  const [ready, setReady] = useState(false);
  const [postFx, setPostFx] = useState(true);
  const [hint, setHint] = useState(true);
  const [intro, setIntro] = useState<IntroStep>(null);
  const [levelDone, setLevelDone] = useState<{ level: number; score: number } | null>(null);
  const [missionIdx, setMissionIdx] = useState(0);
  const missionBase = useRef(0);
  const missionIdxRef = useRef(0);
  const bonusCoins = useRef(0);
  const statsRef = useRef<RunStats>(INITIAL_STATS);
  const levelsDone = useRef(0);

  const onReady = useCallback(() => setReady(true), []);
  const controls = useRef<RunControls>({
    lane: 1,
    jumpQueued: false,
    slideQueued: false,
    paused: true,
    celebrate: false,
  });
  const endedRef = useRef(false);
  const introStarted = useRef(false);
  const userPaused = useRef(false);
  const introOn = useRef(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useSharedValue(0);
  const flashColor = useSharedValue(0);

  useEffect(() => {
    resetRun();
    const hintTimer = setTimeout(() => setHint(false), HINT_TIME_MS);
    return () => {
      clearTimeout(hintTimer);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [resetRun]);

  useEffect(() => {
    if (!ready || introStarted.current) return;
    introStarted.current = true;
    setIntro(3);
  }, [ready]);

  useEffect(() => {
    if (intro === null) return;
    const ms = intro === 'go' ? 480 : 650;
    const id = setTimeout(() => {
      setIntro((cur) => {
        if (cur === 3) return 2;
        if (cur === 2) return 1;
        if (cur === 1) return 'go';
        return null;
      });
    }, ms);
    return () => clearTimeout(id);
  }, [intro]);

  const counting = !ready || intro !== null || !introStarted.current;
  userPaused.current = paused;
  introOn.current = counting;

  useEffect(() => {
    controls.current.paused = paused || levelDone !== null || counting;
    controls.current.celebrate = levelDone !== null;
  }, [paused, levelDone, counting]);

  const showToast = useCallback((next: Toast, ms = 1400) => {
    setToast(next);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  const blocked = () => userPaused.current || controls.current.celebrate || endedRef.current;

  const moveLane = useCallback((dir: -1 | 1) => {
    if (blocked()) return;
    controls.current.lane = clampLane(controls.current.lane + dir);
  }, []);

  const jump = useCallback(() => {
    if (blocked()) return;
    controls.current.jumpQueued = true;
  }, []);

  const slide = useCallback(() => {
    if (blocked()) return;
    controls.current.slideQueued = true;
  }, []);

  const togglePause = useCallback(() => {
    if (introOn.current || controls.current.celebrate || endedRef.current) return;
    setPaused((p) => !p);
  }, []);

  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(18)
        .onEnd((e) => {
          const ax = Math.abs(e.translationX);
          const ay = Math.abs(e.translationY);
          if (ax > ay) moveLane(e.translationX > 0 ? 1 : -1);
          else if (e.translationY < 0) jump();
          else slide();
        }),
    [jump, moveLane, slide],
  );

  const tap = useMemo(() => Gesture.Tap().runOnJS(true).onEnd(jump), [jump]);
  const gesture = useMemo(() => Gesture.Exclusive(swipe, tap), [swipe, tap]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') moveLane(-1);
      else if (e.key === 'ArrowRight' || e.key === 'd') moveLane(1);
      else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') jump();
      else if (e.key === 'ArrowDown' || e.key === 's') slide();
      else if (e.key === 'Escape' || e.key === 'p') togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump, moveLane, slide, togglePause]);

  /** Advances the bottom-box mission; rewards are banked and paid at game over. */
  const checkMission = useCallback(
    (next: RunStats) => {
      const def = MISSIONS[missionIdxRef.current % MISSIONS.length];
      if (statValue(next, def.stat) - missionBase.current < def.target) return;
      bonusCoins.current += def.reward;
      showToast({ text: `MISSION COMPLETE! +${def.reward}`, color: colors.green }, 1800);
      missionIdxRef.current += 1;
      const following = MISSIONS[missionIdxRef.current % MISSIONS.length];
      missionBase.current = statValue(next, following.stat);
      setMissionIdx(missionIdxRef.current);
    },
    [showToast],
  );

  const onStats = useCallback(
    (next: RunStats) => {
      statsRef.current = next;
      setStats(next);
      checkMission(next);
      applyRunTick({
        currentScore: next.score,
        currentDistance: next.distance,
        currentEnergy: next.energy,
      });
    },
    [applyRunTick, checkMission],
  );

  const onEvent = useCallback(
    (event: PickupEvent) => {
      if (event === 'level') {
        // Freeze the sim this very frame; the effect above keeps it in sync.
        controls.current.paused = true;
        controls.current.celebrate = true;
        levelsDone.current += 1;
        bonusCoins.current += LEVEL_BONUS_COINS;
        setToast(null);
        setLevelDone({ level: levelsDone.current, score: statsRef.current.score });
        return;
      }
      if (event === 'combo') {
        showToast({ text: `COMBO x${statsRef.current.combo} !`, color: colors.yellowBright });
        flashColor.value = 1;
        flash.value = withSequence(
          withTiming(0.28, { duration: 50 }),
          withTiming(0, { duration: 280 }),
        );
        return;
      }
      if (event === 'nearMiss') {
        flashColor.value = 1;
        flash.value = withSequence(
          withTiming(0.18, { duration: 40 }),
          withTiming(0, { duration: 220 }),
        );
      }
      if (event === 'hit' || event === 'power') {
        flashColor.value = event === 'hit' ? 0 : 1;
        flash.value = withSequence(
          withTiming(event === 'hit' ? 0.45 : 0.35, { duration: 60 }),
          withTiming(0, { duration: 320 }),
        );
      }
      const t = toastFor(event);
      if (t) showToast(t);
    },
    [flash, flashColor, showToast],
  );

  const onBiome = useCallback(
    (next: Biome) => {
      setBiome(next);
      if (firstBiome.current) {
        firstBiome.current = false;
        return;
      }
      showToast({ text: `${BIOME_NAME[next]}  +${SPACE_BONUS}🪙`, color: colors.yellowBright }, 1800);
    },
    [showToast],
  );

  const nextLevel = useCallback(() => setLevelDone(null), []);

  const handleGameOver = useCallback(
    (final: RunStats) => {
      if (endedRef.current) return;
      endedRef.current = true;
      applyRunTick({
        currentScore: final.score,
        currentDistance: final.distance,
        currentEnergy: final.energy,
      });
      const previousBest = useProgressStore.getState().bestScore;
      const record = Math.floor(final.score) > previousBest;
      finishRun();
      recordRun({
        score: final.score,
        proteins: final.proteins,
        junkDodged: final.junkDodged,
        distance: final.distance,
        coins: final.coins,
        roofs: final.roofs,
      });
      const earned = final.coins + bonusCoins.current;
      if (earned > 0) addCoins(earned);
      onGameOver({
        coins: earned,
        distance: Math.floor(final.distance),
        level: final.level,
        bestCombo: final.bestCombo,
        record,
      });
    },
    [addCoins, applyRunTick, finishRun, onGameOver, recordRun],
  );

  const quit = useCallback(() => {
    controls.current.paused = true;
    handleGameOver(statsRef.current);
  }, [handleGameOver]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
    backgroundColor: flashColor.value > 0.5 ? colors.power : colors.red,
  }));

  const missionDef = MISSIONS[missionIdx % MISSIONS.length];
  const mission: MissionView = {
    label: missionDef.label,
    progress: Math.max(0, statValue(stats, missionDef.stat) - missionBase.current),
    target: missionDef.target,
    icon: missionDef.icon,
  };

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <View style={styles.stage} collapsable={false}>
          <RunnerScene
            skin={skin}
            controls={controls}
            onStats={onStats}
            onEvent={onEvent}
            onBiome={onBiome}
            onGameOver={handleGameOver}
            onReady={onReady}
            onPostFx={setPostFx}
          />
        </View>
      </GestureDetector>

      {!postFx ? <Vignette /> : null}
      <SpeedLines speed={stats.speed} combo={stats.combo} />
      <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />

      {toast && !levelDone ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={[styles.toastText, { color: toast.color }]}>{toast.text}</Text>
        </View>
      ) : null}

      {levelDone ? null : (
        <HUD stats={stats} mission={mission} paused={paused} onPause={togglePause} space={biome ? BIOME_NAME[biome] : null} />
      )}

      {intro !== null ? (
        <View style={styles.intro} pointerEvents="none">
          <Text style={styles.introText}>{intro === 'go' ? 'GO!' : intro}</Text>
        </View>
      ) : null}

      {hint && ready && !levelDone && intro === null ? (
        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintText}>
            Slap couch potatoes: +{SLAP_COINS} coins! · Slide to kick
          </Text>
        </View>
      ) : null}

      {levelDone ? (
        <LevelComplete
          level={levelDone.level}
          score={levelDone.score}
          bonus={LEVEL_BONUS_COINS}
          onNext={nextLevel}
        />
      ) : null}

      {!ready ? (
        <View style={styles.loading} pointerEvents="none">
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : null}

      {paused ? (
        <View style={styles.pauseOverlay}>
          <Text style={styles.pauseTitle}>PAUSE</Text>
          <Pressable style={styles.pauseBtn} onPress={() => setPaused(false)}>
            <Text style={styles.pauseBtnTextDark}>RESUME</Text>
          </Pressable>
          <Pressable style={[styles.pauseBtn, styles.quitBtn]} onPress={quit}>
            <Text style={styles.pauseBtnText}>QUIT</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stage: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...display,
    color: colors.yellow,
    fontSize: 26,
  },
  flash: {
    ...StyleSheet.absoluteFill,
  },
  toast: {
    position: 'absolute',
    top: '26%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toastText: {
    ...display,
    fontSize: 30,
    backgroundColor: 'rgba(10,16,32,0.78)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  intro: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: {
    ...display,
    color: colors.yellow,
    fontSize: 72,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 0,
  },
  hint: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10,16,32,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 28,
  },
  pauseTitle: {
    ...display,
    color: colors.yellow,
    fontSize: 44,
    marginBottom: 8,
  },
  pauseBtn: {
    backgroundColor: colors.yellow,
    borderBottomWidth: 4,
    borderBottomColor: '#B86E00',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 220,
    alignItems: 'center',
  },
  quitBtn: {
    backgroundColor: colors.panelElevated,
    borderBottomColor: '#0A1020',
    borderWidth: 2,
    borderColor: colors.border,
  },
  pauseBtnText: {
    ...display,
    color: colors.white,
    fontSize: 20,
  },
  pauseBtnTextDark: {
    ...display,
    color: colors.black,
    fontSize: 20,
  },
});
