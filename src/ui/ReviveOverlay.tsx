import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../data/theme';
import { REVIVE_COST } from '../game/sim/runSim';
import { display } from './fonts';

type Props = {
  coins: number;
  onContinue: () => void;
  onGiveUp: () => void;
};

/** One continue per run: 50 dumbbells, then 2s of invulnerability. */
export function ReviveOverlay({ coins, onContinue, onGiveUp }: Props) {
  const can = coins >= REVIVE_COST;
  return (
    <View style={styles.root}>
      <Text style={styles.title}>ENCORE UN EFFORT !</Text>
      <Text style={styles.sub}>Une relance · 2 s d’invulnérabilité</Text>
      <Pressable
        style={[styles.btn, !can && styles.disabled]}
        onPress={onContinue}
        disabled={!can}
        accessibilityRole="button"
      >
        <Text style={styles.btnDark}>CONTINUER · {REVIVE_COST} 💪</Text>
      </Pressable>
      {!can ? <Text style={styles.need}>Pas assez d’haltères</Text> : null}
      <Pressable style={styles.ghost} onPress={onGiveUp} accessibilityRole="button">
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
    minWidth: 240,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  btnDark: {
    ...display,
    color: colors.black,
    fontSize: 18,
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
