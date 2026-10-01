import React, { useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MonsterPreview } from '../components/MonsterPreview';
import { SKINS, type SkinId } from '../data/skins';
import { colors, radii, spacing } from '../data/theme';
import { useProgressStore } from '../store/progressStore';
import { ui } from '../utils/styles';

type Props = {
  onBack: () => void;
};

export function ShopScreen({ onBack }: Props) {
  const totalCoins = useProgressStore((s) => s.totalCoins);
  const unlockedSkins = useProgressStore((s) => s.unlockedSkins);
  const selectedSkin = useProgressStore((s) => s.selectedSkin);
  const spendCoins = useProgressStore((s) => s.spendCoins);
  const unlockSkin = useProgressStore((s) => s.unlockSkin);
  const selectSkin = useProgressStore((s) => s.selectSkin);

  const cards = useMemo(() => SKINS, []);

  const onBuy = (id: SkinId, price: number) => {
    if (unlockedSkins.includes(id)) return;
    if (!spendCoins(price)) return;
    unlockSkin(id);
    selectSkin(id);
  };

  return (
    <SafeAreaView style={ui.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Boutique</Text>
        <View style={styles.coinsPill}>
          <Text style={styles.coinDot}>●</Text>
          <Text style={styles.coinsText}>{totalCoins}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {cards.map((skin) => {
          const unlocked = unlockedSkins.includes(skin.id);
          const selected = selectedSkin === skin.id;
          const canAfford = totalCoins >= skin.price;

          return (
            <View
              key={skin.id}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={styles.previewBox}>
                <MonsterPreview skin={skin} size={96} />
              </View>
              <View style={styles.meta}>
                <Text style={styles.skinName}>{skin.name}</Text>
                <Text style={styles.price}>
                  {skin.price === 0 ? 'Gratuit' : `${skin.price} pièces`}
                </Text>
                <Text style={styles.state}>
                  {unlocked ? 'Débloqué' : 'Verrouillé'}
                </Text>

                {unlocked ? (
                  <Pressable
                    style={[
                      selected ? ui.primaryBtn : ui.secondaryBtn,
                      styles.action,
                    ]}
                    onPress={() => selectSkin(skin.id)}
                  >
                    <Text
                      style={
                        selected ? ui.primaryBtnText : ui.secondaryBtnText
                      }
                    >
                      {selected ? 'Sélectionné' : 'Sélectionner'}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[
                      ui.primaryBtn,
                      styles.action,
                      !canAfford && styles.disabled,
                    ]}
                    disabled={!canAfford}
                    onPress={() => onBuy(skin.id, skin.price)}
                  >
                    <Text style={ui.primaryBtnText}>
                      {canAfford ? 'Acheter' : 'Pas assez'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
  },
  title: {
    flex: 1,
    color: colors.yellow,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  coinsPill: {
    backgroundColor: colors.black,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinDot: { color: colors.yellow, fontSize: 12 },
  coinsText: { color: colors.white, fontWeight: '900' },
  list: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#2A2A33',
  },
  cardSelected: {
    borderColor: colors.yellow,
    borderWidth: 2,
  },
  previewBox: {
    backgroundColor: colors.black,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  skinName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  price: {
    color: colors.yellow,
    fontSize: 14,
    fontWeight: '800',
  },
  state: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  action: {
    minHeight: 44,
    paddingVertical: 10,
  },
  disabled: {
    opacity: 0.45,
  },
});
