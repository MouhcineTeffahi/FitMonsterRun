import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../data/theme';
import { REVIVE_COST } from '../game/sim/runSim';
import { display } from './fonts';

type Props = {
  coins: number;
  /** Remaining ad-funded continues this run. */
  adContinuesLeft: number;
  onContinueAd: () => Promise<void> | void;
  onContinueCoins: () => void;
  onGiveUp: () => void;
};

/** Continue via rewarded ad (limited/run) and/or coin spend. */
export function ReviveOverlay({
  coins,
  adContinuesLeft,
  onContinueAd,
  onContinueCoins,
  onGiveUp,
}: Props) {
  const [busy, setBusy] = useState(false);
  const canCoins = coins >= REVIVE_COST;
  const canAd = adContinuesLeft > 0;

  const watchAd = async () => {
    if (!canAd || busy) return;
    setBusy(true);
    try {
      await onContinueAd();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>ENCORE UN EFFORT !</Text>
      <Text style={styles.sub}>Continue la course · 2 s d’invulnérabilité</Text>

      {canAd ? (
        <Pressable
          style={[styles.btn, styles.adBtn, busy && styles.disabled]}
          onPress={() => void watchAd()}
          disabled={busy}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <Text style={styles.btnDark}>▶ CONTINUER (PUB) · {adContinuesLeft} restant{adContinuesLeft > 1 ? 's' : ''}</Text>
          )}
        </Pressable>
      ) : null}

      <Pressable
        style={[styles.btn, !canCoins && styles.disabled]}
        onPress={onContinueCoins}
        disabled={!canCoins || busy}
        accessibilityRole="button"
      >
        <Text style={styles.btnDark}>CONTINUER · {REVIVE_COST} 💪</Text>
      </Pressable>
      {!canCoins ? <Text style={styles.need}>Pas assez d’haltères</Text> : null}

      <Pressable style={styles.ghost} onPress={onGiveUp} disabled={busy} accessibilityRole="button">
        <Text style={styles.ghostText}>ABANDONNER</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10,16,32,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 28,
  },
  title: {
    ...display,
    color: colors.yellow,
    fontSize: 28,
    textAlign: 'center',
  },
  sub: {
    ...display,
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  btn: {
    backgroundColor: colors.yellow,
    borderBottomWidth: 4,
    borderBottomColor: '#B86E00',
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 22,
    minWidth: 260,
    alignItems: 'center',
  },
  adBtn: {
    backgroundColor: '#7CFF6B',
    borderBottomColor: '#2E7D32',
  },
  disabled: {
    opacity: 0.45,
  },
  btnDark: {
    ...display,
    color: colors.black,
    fontSize: 16,
    textAlign: 'center',
  },
  need: {
    ...display,
    color: colors.red,
    fontSize: 13,
  },
  ghost: {
    paddingVertical: 10,
  },
  ghostText: {
    ...display,
    color: colors.white,
    fontSize: 16,
    opacity: 0.8,
  },
});
