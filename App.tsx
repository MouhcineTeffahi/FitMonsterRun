import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import type { RunSummary, ScreenId } from './src/data/types';
import { colors } from './src/data/theme';
import { setMusicEnabled } from './src/game/audio/music';
import { preloadSfx, setSfxEnabled } from './src/game/audio/sfx';
import { ChallengesScreen } from './src/screens/ChallengesScreen';
import { CustomizeScreen } from './src/screens/CustomizeScreen';
import { GameOverScreen } from './src/screens/GameOverScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { ShopScreen } from './src/screens/ShopScreen';
import { useProgressStore } from './src/store/progressStore';
import { useAppFonts } from './src/ui/fonts';
import { RewardedAdOverlayHost } from './src/ui/RewardedAdOverlay';

// Lazy: GameScreen pulls @react-three/fiber — keep it out of the initial require graph.
type GameScreenComponent = React.ComponentType<{
  onGameOver: (summary: RunSummary) => void;
}>;

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [customizeBack, setCustomizeBack] = useState<ScreenId>('home');
  const [summary, setSummary] = useState<RunSummary>({
    coins: 0,
    distance: 0,
    level: 1,
    bestCombo: 0,
    record: false,
  });
  const [GameScreen, setGameScreen] = useState<GameScreenComponent | null>(null);
  const [gameLoadError, setGameLoadError] = useState<string | null>(null);
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
    setMusicEnabled(soundEnabled);
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
    setSummary({ coins: 0, distance: 0, level: 1, bestCombo: 0, record: false });
    setGameLoadError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./src/screens/GameScreen') as {
        GameScreen?: GameScreenComponent;
        default?: GameScreenComponent;
      };
      const Loaded = mod?.GameScreen ?? mod?.default;
      if (typeof Loaded !== 'function') {
        throw new Error('GameScreen did not load');
      }
      setGameScreen(() => Loaded);
      setScreen('game');
    } catch (e) {
      setGameLoadError(e instanceof Error ? e.message : String(e));
      setScreen('home');
    }
  };
  const home = () => setScreen('home');
  const openCustomize = (from: 'home' | 'shop') => {
    setCustomizeBack(from);
    setScreen('customize');
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      {screen === 'home' ? (
        <HomeScreen
          onPlay={startRun}
          onShop={() => setScreen('shop')}
          onCustomize={() => openCustomize('home')}
          onChallenges={() => setScreen('challenges')}
          onLeaderboard={() => setScreen('leaderboard')}
        />
      ) : null}
      {screen === 'game' && GameScreen ? (
        <GameScreen
          onGameOver={(next) => {
            setSummary(next);
            setScreen('gameOver');
          }}
        />
      ) : null}
      {screen === 'gameOver' ? (
        <GameOverScreen summary={summary} onRestart={startRun} onHome={home} />
      ) : null}
      {screen === 'shop' ? (
        <ShopScreen onBack={home} onCustomize={() => openCustomize('shop')} />
      ) : null}
      {screen === 'customize' ? (
        <CustomizeScreen onBack={() => setScreen(customizeBack)} />
      ) : null}
      {screen === 'challenges' ? <ChallengesScreen onBack={home} /> : null}
      {screen === 'leaderboard' ? <LeaderboardScreen onBack={home} /> : null}
      {gameLoadError ? (
        <View style={styles.errorBanner} pointerEvents="none">
          <Text style={styles.errorText}>{gameLoadError}</Text>
        </View>
      ) : null}
      <RewardedAdOverlayHost />
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
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: '#1a1020',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
  },
});
