import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getSkin } from '../data/skins';
import { colors, radii, spacing } from '../data/theme';
import { useProgressStore } from '../store/progressStore';
import { ui } from '../utils/styles';
import { MonsterPreview } from '../components/MonsterPreview';

type Props = {
  onPlay: () => void;
  onShop: () => void;
};

export function HomeScreen({ onPlay, onShop }: Props) {
  const bestScore = useProgressStore((s) => s.bestScore);
  const totalCoins = useProgressStore((s) => s.totalCoins);
  const selectedSkin = useProgressStore((s) => s.selectedSkin);
  const skin = getSkin(selectedSkin);

  return (
    <SafeAreaView style={ui.screen}>
      <View style={styles.content}>
        <Text style={styles.brand}>FIT MONSTER</Text>
        <Text style={styles.brandRun}>RUN</Text>

        <View style={styles.heroCard}>
          <MonsterPreview skin={skin} size={180} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>MEILLEUR SCORE</Text>
            <Text style={styles.statValue}>{bestScore}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>PIÈCES</Text>
            <Text style={[styles.statValue, { color: colors.yellow }]}>
              {totalCoins}
            </Text>
          </View>
        </View>

        <Pressable style={ui.primaryBtn} onPress={onPlay}>
          <Text style={ui.primaryBtnText}>Jouer</Text>
        </Pressable>

        <Pressable style={[ui.secondaryBtn, styles.shopBtn]} onPress={onShop}>
          <Text style={ui.secondaryBtnText}>Boutique</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  brand: {
    color: colors.yellow,
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
  },
  brandRun: {
    color: colors.white,
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: -8,
    letterSpacing: 4,
  },
  heroCard: {
    alignSelf: 'center',
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#2A2A33',
    marginVertical: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.black,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#2A2A33',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  statValue: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
  },
  shopBtn: {
    marginTop: 4,
  },
});
