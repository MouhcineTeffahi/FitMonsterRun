import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Collectible } from '../components/Collectible';
import { HUD } from '../components/HUD';
import { Player } from '../components/Player';
import { Track } from '../components/Track';
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
import { aabbOverlap, depthScale, laneToX, shiftLane } from '../utils/lanes';
import { createEntityPool, recycleEntity, spawnEntity } from '../utils/spawner';

type Props = {
  onGameOver: (runCoins: number) => void;
};

/** Player sits near bottom — Subway Surfers camera. */
const PLAYER_Y_RATIO = 0.84;

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
    multiplier: 1,
  });
  const [entities, setEntities] = useState<GameEntity[]>(() => createEntityPool());
  const [trackSpeed, setTrackSpeed] = useState(BASE_SCROLL_SPEED);

  const laneRef = useRef<Lane>(1);
  const poolRef = useRef<GameEntity[]>(entities);
  const speedRef = useRef(BASE_SCROLL_SPEED);
  const spawnAccRef = useRef(0);
  const speedAccRef = useRef(0);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const distanceRef = useRef(0);
  const energyRef = useRef(MAX_ENERGY);
  const multiplierRef = useRef(1);
  const jumpingRef = useRef(false);
  const endedRef = useRef(false);
  const lastTsRef = useRef<number | null>(null);
  const hudAccRef = useRef(0);

  const playerX = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const jumpY = useSharedValue(0);

  useEffect(() => {
    resetRun();
    poolRef.current = createEntityPool();
    setEntities(poolRef.current.map((e) => ({ ...e })));
    laneRef.current = 1;
    speedRef.current = BASE_SCROLL_SPEED;
    setTrackSpeed(BASE_SCROLL_SPEED);
    spawnAccRef.current = 0;
    speedAccRef.current = 0;
    scoreRef.current = 0;
    coinsRef.current = 0;
    distanceRef.current = 0;
    energyRef.current = MAX_ENERGY;
    multiplierRef.current = 1;
    jumpingRef.current = false;
    endedRef.current = false;
    jumpY.value = 0;
    setHud({
      score: 0,
      coins: 0,
      distance: 0,
      energy: MAX_ENERGY,
      multiplier: 1,
    });
  }, [jumpY, resetRun]);

  useEffect(() => {
    if (size.w <= 0) return;
    playerX.value = withTiming(laneToX(laneRef.current, size.w, 1), {
      duration: 110,
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
      playerX.value = withTiming(laneToX(laneRef.current, size.w, 1), {
        duration: 100,
      });
    },
    [paused, playerX, size.w],
  );

  const doJump = useCallback(() => {
    if (paused || endedRef.current || jumpingRef.current) return;
    jumpingRef.current = true;
    jumpY.value = withSequence(
      withTiming(-78, { duration: 220 }),
      withTiming(0, { duration: 260 }),
    );
    setTimeout(() => {
      jumpingRef.current = false;
    }, 480);
  }, [jumpY, paused]);

  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .onEnd((e) => {
          const ax = Math.abs(e.translationX);
          const ay = Math.abs(e.translationY);
          if (ax > ay && ax > 24) {
            if (e.translationX > 0) moveLane(1);
            else moveLane(-1);
          } else if (ay > 28 && e.translationY < 0) {
            doJump();
          }
        }),
    [doJump, moveLane],
  );

  const onCollectDone = useCallback((id: number) => {
    const ent = poolRef.current.find((e) => e.id === id);
    if (!ent) return;
    recycleEntity(ent);
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

      spawnAccRef.current += dt * 1000;
      speedAccRef.current += dt * 1000;
      hudAccRef.current += dt * 1000;

      if (speedAccRef.current >= SPEED_INTERVAL_MS) {
        speedAccRef.current = 0;
        speedRef.current += SPEED_STEP;
        multiplierRef.current = Math.min(
          5,
          1 + Math.floor((speedRef.current - BASE_SCROLL_SPEED) / SPEED_STEP),
        );
        setTrackSpeed(speedRef.current);
      }

      const spawnEvery = Math.max(420, SPAWN_INTERVAL_MS - (multiplierRef.current - 1) * 60);
      while (spawnAccRef.current >= spawnEvery) {
        spawnAccRef.current -= spawnEvery;
        spawnEntity(poolRef.current);
      }

      const dy = (speedRef.current / size.h) * dt;
      distanceRef.current += speedRef.current * dt * 0.1;
      scoreRef.current += speedRef.current * dt * 0.045 * multiplierRef.current;

      const playerY = PLAYER_Y_RATIO * size.h;
      const px = laneToX(laneRef.current, size.w, 1);
      const airborne = jumpingRef.current;

      for (const ent of poolRef.current) {
        if (!ent.active || ent.collected) continue;
        ent.y += dy;
        if (ent.y > 1.12) {
          recycleEntity(ent);
          continue;
        }

        const depth = Math.max(0, Math.min(1, ent.y));
        // Only collide near the player band (Subway hit window).
        if (depth < 0.72 || depth > 0.95) continue;

        const ey = depth * size.h;
        const ex = laneToX(ent.lane, size.w, depth);
        const s = depthScale(depth);
        const eh = ENTITY_HITBOX * (ent.kind === 'junk' ? 1.35 : 1) * s;
        const ew = ENTITY_HITBOX * s;

        if (
          !aabbOverlap(
            px,
            playerY,
            PLAYER_HITBOX,
            PLAYER_HITBOX * 0.9,
            ex,
            ey,
            ew,
            eh,
          )
        ) {
          continue;
        }

        if (ent.kind === 'healthy') {
          ent.collected = true;
          ent.active = false;
          scoreRef.current += 25 * multiplierRef.current;
          energyRef.current = Math.min(MAX_ENERGY, energyRef.current + 10);
        } else if (ent.kind === 'coin') {
          ent.collected = true;
          ent.active = false;
          coinsRef.current += 1;
          scoreRef.current += 10 * multiplierRef.current;
        } else {
          // Jump clears low junk obstacles.
          if (airborne) continue;
          recycleEntity(ent);
          energyRef.current = Math.max(0, energyRef.current - 24);
          shakeX.value = withSequence(
            withTiming(-12, { duration: 35 }),
            withTiming(12, { duration: 35 }),
            withTiming(-7, { duration: 35 }),
            withTiming(0, { duration: 35 }),
          );
          if (energyRef.current <= 0) endGame();
        }
      }

      setEntities(poolRef.current.map((e) => ({ ...e })));

      if (hudAccRef.current >= 80) {
        hudAccRef.current = 0;
        setHud({
          score: scoreRef.current,
          coins: coinsRef.current,
          distance: distanceRef.current,
          energy: energyRef.current,
          multiplier: multiplierRef.current,
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

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Track
        width={size.w}
        height={size.h}
        speed={trackSpeed}
        paused={paused || endedRef.current}
      />

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
            <Player
              skin={skin}
              x={playerX}
              shakeX={shakeX}
              jumpY={jumpY}
              size={92}
            />
          ) : null}
        </View>
      </GestureDetector>

      <View style={styles.hint} pointerEvents="none">
        <Text style={styles.hintText}>← → changer de voie · ↑ sauter</Text>
      </View>

      <HUD
        score={hud.score}
        coins={hud.coins}
        distance={hud.distance}
        energy={hud.energy}
        multiplier={hud.multiplier}
        paused={paused}
        onPause={() => setPaused((p) => !p)}
      />

      {paused && !endedRef.current ? (
        <View style={styles.pauseOverlay}>
          <Text style={styles.pauseTitle}>Pause</Text>
          <Pressable style={styles.pauseBtn} onPress={() => setPaused(false)}>
            <Text style={styles.pauseBtnTextDark}>Reprendre</Text>
          </Pressable>
          <Pressable style={[styles.pauseBtn, styles.quitBtn]} onPress={endGame}>
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
  playfield: {
    flex: 1,
  },
  hint: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.35)',
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
