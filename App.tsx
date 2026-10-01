import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import type { ScreenId } from './src/data/types';
import { colors } from './src/data/theme';
import { GameOverScreen } from './src/screens/GameOverScreen';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ShopScreen } from './src/screens/ShopScreen';
import { useProgressStore } from './src/store/progressStore';

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [runCoins, setRunCoins] = useState(0);
  const hydrated = useProgressStore((s) => s.hydrated);
  const loadProgress = useProgressStore((s) => s.loadProgress);
  const resetRun = useProgressStore((s) => s.resetRun);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  if (!hydrated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.yellow} size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      {screen === 'home' ? (
        <HomeScreen
          onPlay={() => {
            resetRun();
            setRunCoins(0);
            setScreen('game');
          }}
          onShop={() => setScreen('shop')}
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
        <GameOverScreen
          runCoins={runCoins}
          onRestart={() => {
            resetRun();
            setRunCoins(0);
            setScreen('game');
          }}
          onHome={() => setScreen('home')}
        />
      ) : null}
      {screen === 'shop' ? (
        <ShopScreen onBack={() => setScreen('home')} />
      ) : null}
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
