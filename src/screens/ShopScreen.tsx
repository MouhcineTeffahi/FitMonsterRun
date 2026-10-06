import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSkin, SKINS, type SkinId } from '../data/skins';
import { colors, radii, spacing } from '../data/theme';
import { MonsterShowcase } from '../game/player/MonsterShowcase';
import { useProgressStore } from '../store/progressStore';
import { DumbbellMark } from '../ui/DumbbellMark';
import { display } from '../ui/fonts';
import { MonsterPreview } from '../ui/MonsterPreview';
import { ScreenHeader } from '../ui/ScreenHeader';
import { ui } from '../utils/styles';

type Props = {
  onBack: () => void;
};

/** BOUTIQUE / SKINS: live 3D preview on top, 2×2 grid of skin cards below. */
export function ShopScreen({ onBack }: Props) {
  const totalCoins = useProgressStore((s) => s.totalCoins);
  const unlockedSkins = useProgressStore((s) => s.unlockedSkins);
  const selectedSkin = useProgressStore((s) => s.selectedSkin);
  const spendCoins = useProgressStore((s) => s.spendCoins);
  const unlockSkin = useProgressStore((s) => s.unlockSkin);
  const selectSkin = useProgressStore((s) => s.selectSkin);

  const [previewId, setPreviewId] = useState<SkinId>(selectedSkin);
  const preview = getSkin(previewId);
  const unlocked = unlockedSkins.includes(previewId);
  const selected = selectedSkin === previewId;
  const canAfford = totalCoins >= preview.price;

  const onAction = () => {
    if (selected) return;
    if (unlocked) {
      selectSkin(previewId);
      return;
    }
    if (!spendCoins(preview.price)) return;
    unlockSkin(previewId);
    selectSkin(previewId);
  };

  const actionLabel = selected
    ? 'SELECTED ✓'
    : unlocked
      ? 'SELECT'
      : canAfford
        ? `BUY · ${preview.price}`
        : `NEED ${preview.price - totalCoins} MORE`;

  return (
    <SafeAreaView style={ui.screen}>
      <ScreenHeader title="SHOP / SKINS" onBack={onBack} coins={totalCoins} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.stage}>
          <View style={styles.stageGlow} />
          <MonsterShowcase skin={preview} style={styles.showcase} />
          <Text style={styles.stageName}>{preview.name.toUpperCase()}</Text>
        </View>

        <Pressable
          style={[
            selected ? ui.secondaryBtn : ui.primaryBtn,
            styles.action,
            !selected && !unlocked && !canAfford && styles.disabled,
          ]}
          disabled={selected || (!unlocked && !canAfford)}
          onPress={onAction}
          accessibilityRole="button"
        >
          <Text style={selected ? ui.secondaryBtnText : ui.primaryBtnText}>{actionLabel}</Text>
        </Pressable>

        <View style={styles.grid}>
          {SKINS.map((skin) => {
            const owned = unlockedSkins.includes(skin.id);
            const isSelected = selectedSkin === skin.id;
            return (
              <Pressable
                key={skin.id}
                onPress={() => setPreviewId(skin.id)}
                style={[
                  styles.card,
                  previewId === skin.id && styles.cardPreviewed,
                  isSelected && styles.cardSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={skin.name}
              >
                <View style={styles.cardArt}>
                  <MonsterPreview skin={skin} size={118} />
                </View>
                <Text style={styles.cardName} numberOfLines={1}>
                  {skin.name.replace(' Mode', '').replace(' Yellow', '').toUpperCase()}
                </Text>
                {isSelected ? (
                  <View style={styles.check}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                ) : owned ? (
                  <Text style={styles.owned}>OWNED</Text>
                ) : (
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{skin.price}</Text>
                    <DumbbellMark size={16} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  stage: {
    height: 250,
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stageGlow: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    top: '18%',
    bottom: '6%',
    borderRadius: 999,
    backgroundColor: 'rgba(252,178,2,0.12)',
  },
  showcase: {
    ...StyleSheet.absoluteFill,
  },
  stageName: {
    ...display,
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.sm,
    color: colors.yellow,
    fontSize: 20,
  },
  action: {
    minHeight: 52,
  },
  disabled: {
    opacity: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  card: {
    width: '48.5%',
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 4,
  },
  cardPreviewed: {
    borderColor: '#6B7DB0',
    backgroundColor: colors.panelElevated,
  },
  cardSelected: {
    borderColor: colors.yellow,
  },
  cardArt: {
    height: 124,
    justifyContent: 'center',
  },
  cardName: {
    ...display,
    color: colors.white,
    fontSize: 17,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  price: {
    ...display,
    color: colors.yellow,
    fontSize: 17,
  },
  owned: {
    ...display,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 22,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 14,
  },
});
