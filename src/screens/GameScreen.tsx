import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Collectible } from '../components/Collectible';
import { HUD } from '../components/HUD';
import { Player } from '../components/Player';
import { getSkin } from '../data/skins';
import {
  BASE_SCROLL_SPEED,
  colors,
  ENTITY_HITBOX,
  MAX_ENERGY,
  PLAYER_HITBOX,
  SPAWN_INTERVAL_MS,
  SPEED_INTERVAL_MS,
  SPEED_STEP,
} from '../data/theme';
import type { GameEntity, Lane } from '../data/types';
import { useProgressStore } from '../store/progressStore';
import { aabbOverlap, laneToX, shiftLane } from '../utils/lanes';
import { createEntityPool, recycleEntity, spawnEntity } from '../utils/spawner';

type Props = {
  onGameOver: (runCoins: number) => void;
};

const PLAYER_Y_RATIO = 0.82;

export function GameScreen({ onGameOver }: Props) {
  const selectedSkin = useProgressStore((s) => s.selectedSkin);
  const applyRunTick = useProgressStore((s) => s.applyRunTick);
  const finishRun = useProgressStore((s) => s.finishRun);
  const addCoins = useProgressStore((s) => s.addCoins);
  const resetRun = useProgressStore((s) => s.resetRun);
  const skin = useMemo(() => getSkin(selectedSkin), [selectedSkin]);

  const [paused, setPaused] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hud, setHud] = useState({
    score: 0,
    coins: 0,
    distance: 0,
    energy: MAX_ENERGY,
  });
  const [entities, setEntities] = useState<GameEntity[]>(() => createEntityPool());

  const laneRef = useRef<Lane>(1);
  const poolRef = useRef<GameEntity[]>(entities);
  const speedRef = useRef(BASE_SCROLL_SPEED);
  const runMsRef = useRef(0);
  const spawnAccRef = useRef(0);
  const speedAccRef = useRef(0);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const distanceRef = useRef(0);
  const energyRef = useRef(MAX_ENERGY);
  const endedRef = useRef(false);
  const lastTsRef = useRef<number | null>(null);
  const hudAccRef = useRef(0);

  const playerX = useSharedValue(0);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    resetRun();
    poolRef.current = createEntityPool();
    setEntities([...poolRef.current]);
    laneRef.current = 1;
    speedRef.current = BASE_SCROLL_SPEED;
    runMsRef.current = 0;
    spawnAccRef.current = 0;
    speedAccRef.current = 0;
    scoreRef.current = 0;
    coinsRef.current = 0;
    distanceRef.current = 0;
    energyRef.current = MAX_ENERGY;
    endedRef.current = false;
    setHud({ score: 0, coins: 0, distance: 0, energy: MAX_ENERGY });
  }, [resetRun]);

  useEffect(() => {
    if (size.w <= 0) return;
    playerX.value = withTiming(laneToX(laneRef.current, size.w), {
      duration: 140,
    });
  }, [playerX, size.w]);

  const endGame = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    applyRunTick({
      currentScore: scoreRef.current,
      currentDistance: distanceRef.current,
      currentEnergy: energyRef.current,
    });
    finishRun();
    if (coinsRef.current > 0) addCoins(coinsRef.current);
    onGameOver(coinsRef.current);
  }, [addCoins, applyRunTick, finishRun, onGameOver]);

  const moveLane = useCallback(
    (dir: -1 | 1) => {
      if (paused || endedRef.current || size.w <= 0) return;
      laneRef.current = shiftLane(laneRef.current, dir);
      playerX.value = withTiming(laneToX(laneRef.current, size.w), {
        duration: 120,
      });
    },
    [paused, playerX, size.w],
  );

  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-40, 40])
        .onEnd((e) => {
          if (e.translationX > 28) {
            moveLane(1);
          } else if (e.translationX < -28) {
            moveLane(-1);
          }
        }),
    [moveLane],
  );

  const onCollectDone = useCallback((id: number) => {
    const ent = poolRef.current.find((e) => e.id === id);
    if (!ent) return;
    recycleEntity(ent);
    setEntities([...poolRef.current]);
  }, []);

  useEffect(() => {
    let frame = 0;
    const tick = (ts: number) => {
      frame = requestAnimationFrame(tick);
      if (paused || endedRef.current || size.h <= 0) {
        lastTsRef.current = ts;
        return;
      }
      const last = lastTsRef.current ?? ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      lastTsRef.current = ts;
      if (dt <= 0) return;

      runMsRef.current += dt * 1000;
      spawnAccRef.current += dt * 1000;
      speedAccRef.current += dt * 1000;
      hudAccRef.current += dt * 1000;

      if (speedAccRef.current >= SPEED_INTERVAL_MS) {
        speedAccRef.current = 0;
        speedRef.current += SPEED_STEP;
      }

      while (spawnAccRef.current >= SPAWN_INTERVAL_MS) {
        spawnAccRef.current -= SPAWN_INTERVAL_MS;
        spawnEntity(poolRef.current);
      }

      const dy = (speedRef.current / size.h) * dt;
      distanceRef.current += speedRef.current * dt * 0.08;

      const playerY = PLAYER_Y_RATIO * size.h;
      const px = laneToX(laneRef.current, size.w);

      let dirty = false;
      for (const ent of poolRef.current) {
        if (!ent.active || ent.collected) continue;
        ent.y += dy;
        if (ent.y > 1.15) {
          recycleEntity(ent);
          dirty = true;
          continue;
        }

        const ey = ent.y * size.h;
        const ex = laneToX(ent.lane, size.w);
        if (
          aabbOverlap(
            px,
            playerY,
            PLAYER_HITBOX,
            PLAYER_HITBOX,
            ex,
            ey,
            ENTITY_HITBOX,
            ENTITY_HITBOX,
          )
        ) {
          if (ent.kind === 'healthy') {
            ent.collected = true;
            ent.active = false;
            scoreRef.current += 25;
            energyRef.current = Math.min(MAX_ENERGY, energyRef.current + 8);
            dirty = true;
          } else if (ent.kind === 'coin') {
            ent.collected = true;
            ent.active = false;
            coinsRef.current += 1;
            scoreRef.current += 10;
            dirty = true;
          } else {
            recycleEntity(ent);
            dirty = true;
            energyRef.current = Math.max(0, energyRef.current - 22);
            shakeX.value = withSequence(
              withTiming(-10, { duration: 40 }),
              withTiming(10, { duration: 40 }),
              withTiming(-6, { duration: 40 }),
              withTiming(0, { duration: 40 }),
            );
            if (energyRef.current <= 0) {
              endGame();
            }
          }
        }
      }

      // Publish pooled positions each frame (capped entity count keeps this cheap).
      setEntities(poolRef.current.map((e) => ({ ...e })));

      if (hudAccRef.current >= 100) {
        hudAccRef.current = 0;
        setHud({
          score: scoreRef.current,
          coins: coinsRef.current,
          distance: distanceRef.current,
          energy: energyRef.current,
        });
        applyRunTick({
          currentScore: scoreRef.current,
          currentDistance: distanceRef.current,
          currentEnergy: energyRef.current,
        });
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [applyRunTick, endGame, paused, shakeX, size.h, size.w]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const roadStyle = useAnimatedStyle(() => ({ opacity: 1 }));

  return (
    <View style={styles.root} onLayout={onLayout}>
      <View style={styles.sky} />
      <Animated.View style={[styles.road, roadStyle]}>
        <View style={[styles.laneLine, { left: '33%' }]} />
        <View style={[styles.laneLine, { left: '66%' }]} />
      </Animated.View>

      <GestureDetector gesture={swipe}>
        <View style={styles.playfield}>
          {entities.map((ent) =>
            ent.active || ent.collected ? (
              <Collectible
                key={ent.id}
                entity={ent}
                playfieldWidth={size.w || 1}
                playfieldHeight={size.h || 1}
                onCollectDone={onCollectDone}
              />
            ) : null,
          )}
          {size.w > 0 ? (
            <Player skin={skin} x={playerX} shakeX={shakeX} size={74} />
          ) : null}
        </View>
      </GestureDetector>

      <HUD
        score={hud.score}
        coins={hud.coins}
        distance={hud.distance}
        energy={hud.energy}
        paused={paused}
        onPause={() => setPaused((p) => !p)}
      />

      {paused && !endedRef.current ? (
        <View style={styles.pauseOverlay}>
          <Text style={styles.pauseTitle}>Pause</Text>
          <Pressable style={styles.pauseBtn} onPress={() => setPaused(false)}>
            <Text style={styles.pauseBtnText}>Reprendre</Text>
          </Pressable>
          <Pressable
            style={[styles.pauseBtn, styles.quitBtn]}
            onPress={endGame}
          >
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
  sky: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.skyTop,
  },
  road: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '12%',
    bottom: 0,
    backgroundColor: colors.road,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  laneLine: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    width: 3,
    marginLeft: -1.5,
    backgroundColor: colors.laneLine,
    opacity: 0.55,
  },
  playfield: {
    flex: 1,
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
});
