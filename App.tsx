import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import type { ScreenId } from './src/data/types';
import { colors } from './src/data/theme';
import { preloadSfx, setSfxEnabled } from './src/game/audio/sfx';
import { ChallengesScreen } from './src/screens/ChallengesScreen';
import { GameOverScreen } from './src/screens/GameOverScreen';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { ShopScreen } from './src/screens/ShopScreen';
import { useProgressStore } from './src/store/progressStore';
import { useAppFonts } from './src/ui/fonts';

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [runCoins, setRunCoins] = useState(0);
  const hydrated = useProgressStore((s) => s.hydrated);
  const loadProgress = useProgressStore((s) => s.loadProgress);
  const resetRun = useProgressStore((s) => s.resetRun);
  const soundEnabled = useProgressStore((s) => s.soundEnabled);
  const fontsReady = useAppFonts();

  useEffect(() => {
    void loadProgress();
    preloadSfx();
  }, [loadProgress]);

  useEffect(() => {
    setSfxEnabled(soundEnabled);
  }, [soundEnabled]);

  if (!hydrated || !fontsReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.yellow} size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  const startRun = () => {
    resetRun();
    setRunCoins(0);
    setScreen('game');
  };
  const home = () => setScreen('home');

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      {screen === 'home' ? (
        <HomeScreen
          onPlay={startRun}
          onShop={() => setScreen('shop')}
          onChallenges={() => setScreen('challenges')}
          onLeaderboard={() => setScreen('leaderboard')}
        />
      ) : null}
      {screen === 'game' ? (
        <GameScreen
          onGameOver={(coins) => {
            setRunCoins(coins);
            setScreen('gameOver');
          }}
        />
      ) : null}
      {screen === 'gameOver' ? (
        <GameOverScreen runCoins={runCoins} onRestart={startRun} onHome={home} />
      ) : null}
      {screen === 'shop' ? <ShopScreen onBack={home} /> : null}
      {screen === 'challenges' ? <ChallengesScreen onBack={home} /> : null}
      {screen === 'leaderboard' ? <LeaderboardScreen onBack={home} /> : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
