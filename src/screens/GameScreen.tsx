import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { HUD } from '../components/HUD';
import {
  RunnerScene,
  type PickupEvent,
  type RunControls,
  type RunStats,
} from '../components/game3d/RunnerScene';
import { getSkin } from '../data/skins';
import { colors, MAX_ENERGY } from '../data/theme';
import { useProgressStore } from '../store/progressStore';
import { clampLane } from '../utils/runner3d';
import { BASE_SPEED } from '../utils/runSim';
import { SpeedLines } from '../components/SpeedLines';

type Props = {
  onGameOver: (runCoins: number) => void;
};

const INITIAL_STATS: RunStats = {
  score: 0,
  coins: 0,
  distance: 0,
  energy: MAX_ENERGY,
  proteins: 0,
  multiplier: 1,
  speed: BASE_SPEED,
};

const TOASTS: Partial<Record<PickupEvent, { text: string; color: string }>> = {
  healthy: { text: 'SAIN ! +ÉNERGIE', color: colors.green },
  protein: { text: 'PROTÉINE ! 💪', color: '#42A5F5' },
  hit: { text: 'MALBOUFFE !', color: colors.red },
  roof: { text: 'SUR LE TRAIN !', color: colors.yellow },
  platform: { text: 'PLATEFORME !', color: '#00E5FF' },
};

export function GameScreen({ onGameOver }: Props) {
  const selectedSkin = useProgressStore((s) => s.selectedSkin);
  const applyRunTick = useProgressStore((s) => s.applyRunTick);
  const finishRun = useProgressStore((s) => s.finishRun);
  const addCoins = useProgressStore((s) => s.addCoins);
  const resetRun = useProgressStore((s) => s.resetRun);
  const skin = useMemo(() => getSkin(selectedSkin), [selectedSkin]);

  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState<RunStats>(INITIAL_STATS);
  const [toast, setToast] = useState<PickupEvent | null>(null);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const controls = useRef<RunControls>({ lane: 1, jumpQueued: false, slideQueued: false, paused: false });
  const endedRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useSharedValue(0);

  useEffect(() => {
    resetRun();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [resetRun]);

  useEffect(() => {
    controls.current.paused = paused;
  }, [paused]);

  const moveLane = useCallback((dir: -1 | 1) => {
    const c = controls.current;
    if (c.paused || endedRef.current) return;
    c.lane = clampLane(c.lane + dir);
  }, []);

  const jump = useCallback(() => {
    const c = controls.current;
    if (c.paused || endedRef.current) return;
    c.jumpQueued = true;
  }, []);

  const slide = useCallback(() => {
    const c = controls.current;
    if (c.paused || endedRef.current) return;
    c.slideQueued = true;
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
      else if (e.key === 'Escape' || e.key === 'p') setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump, moveLane, slide]);

  const onStats = useCallback(
    (next: RunStats) => {
      setStats(next);
      applyRunTick({
        currentScore: next.score,
        currentDistance: next.distance,
        currentEnergy: next.energy,
      });
    },
    [applyRunTick],
  );

  const onEvent = useCallback(
    (event: PickupEvent) => {
      if (event === 'hit') {
        flash.value = withSequence(
          withTiming(0.45, { duration: 60 }),
          withTiming(0, { duration: 260 }),
        );
      }
      if (!TOASTS[event]) return;
      setToast(event);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 1400);
    },
    [flash],
  );

  const handleGameOver = useCallback(
    (final: RunStats) => {
      if (endedRef.current) return;
      endedRef.current = true;
      applyRunTick({
        currentScore: final.score,
        currentDistance: final.distance,
        currentEnergy: 0,
      });
      finishRun();
      if (final.coins > 0) addCoins(final.coins);
      onGameOver(final.coins);
    },
    [addCoins, applyRunTick, finishRun, onGameOver],
  );

  const quit = useCallback(() => {
    controls.current.paused = true;
    handleGameOver(stats);
  }, [handleGameOver, stats]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <View style={styles.stage} collapsable={false}>
          <RunnerScene
            skin={skin}
            controls={controls}
            onStats={onStats}
            onEvent={onEvent}
            onGameOver={handleGameOver}
            onReady={onReady}
          />
        </View>
      </GestureDetector>

      <SpeedLines speed={stats.speed} />
      <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />

      {toast && TOASTS[toast] ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={[styles.toastText, { color: TOASTS[toast]!.color }]}>
            {TOASTS[toast]!.text}
          </Text>
        </View>
      ) : null}

      <HUD
        score={stats.score}
        coins={stats.coins}
        distance={stats.distance}
        energy={stats.energy}
        proteins={stats.proteins}
        multiplier={stats.multiplier}
        paused={paused}
        onPause={() => setPaused((p) => !p)}
      />

      <View style={styles.hint} pointerEvents="none">
        <Text style={styles.hintText}>
          Gauche/droite : voie · Haut : sauter · Bas : glisser · Monte sur les trains !
        </Text>
      </View>

      {!ready ? (
        <View style={styles.loading} pointerEvents="none">
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      ) : null}

      {paused ? (
        <View style={styles.pauseOverlay}>
          <Text style={styles.pauseTitle}>Pause</Text>
          <Pressable style={styles.pauseBtn} onPress={() => setPaused(false)}>
            <Text style={styles.pauseBtnTextDark}>Reprendre</Text>
          </Pressable>
          <Pressable style={[styles.pauseBtn, styles.quitBtn]} onPress={quit}>
            <Text style={styles.pauseBtnText}>Quitter</Text>
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
    color: colors.yellow,
    fontSize: 22,
    fontWeight: '900',
  },
  flash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.red,
  },
  toast: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toastText: {
    fontSize: 30,
    fontWeight: '900',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  hint: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000CC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 28,
  },
  pauseTitle: {
    color: colors.yellow,
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 8,
  },
  pauseBtn: {
    backgroundColor: colors.yellow,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 200,
    alignItems: 'center',
  },
  quitBtn: {
    backgroundColor: colors.panelElevated,
    borderWidth: 1,
    borderColor: '#33333D',
  },
  pauseBtnText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 16,
  },
  pauseBtnTextDark: {
    color: colors.black,
    fontWeight: '900',
    fontSize: 16,
  },
});
