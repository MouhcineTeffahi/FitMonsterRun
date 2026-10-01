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
};

const TOASTS: Record<PickupEvent, { text: string; color: string }> = {
  coin: { text: '+1', color: colors.yellow },
  healthy: { text: 'SAIN ! +ÉNERGIE', color: colors.green },
  protein: { text: 'PROTÉINE ! 💪', color: '#42A5F5' },
  hit: { text: 'MALBOUFFE !', color: colors.red },
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
  const controls = useRef<RunControls>({ lane: 1, jumpQueued: false, paused: false });
  const endedRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toastScale = useSharedValue(1);
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
        }),
    [jump, moveLane],
  );

  const tap = useMemo(() => Gesture.Tap().runOnJS(true).onEnd(jump), [jump]);
  const gesture = useMemo(() => Gesture.Exclusive(swipe, tap), [swipe, tap]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') moveLane(-1);
      else if (e.key === 'ArrowRight' || e.key === 'd') moveLane(1);
      else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') jump();
      else if (e.key === 'Escape' || e.key === 'p') setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump, moveLane]);

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
      if (event === 'coin') return;
      setToast(event);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 1000);
      toastScale.value = 0.6;
      toastScale.value = withSequence(
        withTiming(1.2, { duration: 120 }),
        withTiming(1, { duration: 140 }),
      );
      if (event === 'hit') {
        flash.value = withSequence(
          withTiming(0.45, { duration: 60 }),
          withTiming(0, { duration: 260 }),
        );
      }
    },
    [flash, toastScale],
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

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ scale: toastScale.value }],
  }));
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
          />
        </View>
      </GestureDetector>

      <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />

      {toast ? (
        <Animated.View style={[styles.toast, toastStyle]} pointerEvents="none">
          <Text style={[styles.toastText, { color: TOASTS[toast].color }]}>
            {TOASTS[toast].text}
          </Text>
        </Animated.View>
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
          Glisse gauche/droite : changer de voie · Glisse en haut ou tape : sauter
        </Text>
      </View>

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
    fontSize: 26,
    fontWeight: '900',
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
