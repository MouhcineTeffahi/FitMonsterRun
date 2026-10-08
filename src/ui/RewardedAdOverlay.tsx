import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { setRewardedOverlayListener } from '../ads/rewarded';
import { colors, radii } from '../data/theme';
import { display } from './fonts';

/** Full-screen "watching ad…" mock used on web (and as native fallback). */
export function RewardedAdOverlayHost() {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState('Pub…');

  useEffect(() => {
    setRewardedOverlayListener((on, text) => {
      setVisible(on);
      if (text) setLabel(text);
    });
    return () => setRewardedOverlayListener(null);
  }, []);

  if (!visible) return null;
  return (
    <View style={styles.root} pointerEvents="auto">
      <View style={styles.card}>
        <ActivityIndicator color={colors.yellow} size="large" />
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.sub}>Récompense dans un instant…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,16,32,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.yellow,
    paddingHorizontal: 28,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
    minWidth: 240,
  },
  title: {
    ...display,
    color: colors.yellow,
    fontSize: 22,
    textAlign: 'center',
  },
  sub: {
    ...display,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
});
