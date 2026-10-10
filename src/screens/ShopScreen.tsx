import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { paintedSkin } from '../data/playerColors';
import {
  ACCESSORIES,
  STATS,
  nextStatCost,
  withAccessory,
} from '../data/shop';
import { getSkin, SKINS, type SkinId } from '../data/skins';
import { playSfx } from '../game/audio/sfx';
import { colors, radii, spacing } from '../data/theme';
import { useProgressStore } from '../store/progressStore';
import { DumbbellMark } from '../ui/DumbbellMark';
import { display } from '../ui/fonts';
import { MonsterPreview } from '../ui/MonsterPreview';
import { ScreenHeader } from '../ui/ScreenHeader';
import { ui } from '../utils/styles';

type Props = {
  onBack: () => void;
  onCustomize: () => void;
};

/** BOUTIQUE / SKINS: live 3D preview on top, 2×2 grid of skin cards below. */
export function ShopScreen({ onBack, onCustomize }: Props) {
  const totalCoins = useProgressStore((s) => s.totalCoins);
  const unlockedSkins = useProgressStore((s) => s.unlockedSkins);
  const selectedSkin = useProgressStore((s) => s.selectedSkin);
  const playerColors = useProgressStore((s) => s.playerColors);
  const spendCoins = useProgressStore((s) => s.spendCoins);
  const unlockSkin = useProgressStore((s) => s.unlockSkin);
  const selectSkin = useProgressStore((s) => s.selectSkin);

  const selectedAccessory = useProgressStore((s) => s.selectedAccessory);
  const unlockedAccessories = useProgressStore((s) => s.unlockedAccessories);
  const buyAccessory = useProgressStore((s) => s.buyAccessory);
  const selectAccessory = useProgressStore((s) => s.selectAccessory);
  const upgrades = useProgressStore((s) => s.upgrades);
  const upgradeStat = useProgressStore((s) => s.upgradeStat);
  const [tab, setTab] = useState<'skins' | 'gear' | 'stats'>('skins');
  const [previewId, setPreviewId] = useState<SkinId>(selectedSkin);
  const preview = useMemo(
    () => withAccessory(paintedSkin(getSkin(previewId), playerColors), selectedAccessory),
    [previewId, playerColors, selectedAccessory],
  );
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
    playSfx('coin');
  };

  const actionLabel = selected
    ? 'ÉQUIPÉ ✓'
    : unlocked
      ? 'ÉQUIPER'
      : canAfford
        ? `ACHETER · ${preview.price}`
        : `ENCORE ${preview.price - totalCoins}`;

  return (
    <SafeAreaView style={ui.screen}>
      <ScreenHeader title="BOUTIQUE" onBack={onBack} coins={totalCoins} />
      <View style={styles.tabs}>
        {(['skins', 'gear', 'stats'] as const).map((id) => (
          <Pressable key={id} style={[styles.tab, tab === id && styles.tabOn]} onPress={() => setTab(id)}>
            <Text style={[styles.tabText, tab === id && styles.tabTextOn]}>
              {id === 'skins' ? 'SKINS' : id === 'gear' ? 'ACCESSOIRES' : 'STATS'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'skins' ? (
        <>
        <View style={styles.stage}>
          <View style={[styles.stageGlow, { backgroundColor: `${playerColors.body}22` }]} />
          <View style={styles.showcase}>
            <MonsterPreview skin={preview} size={180} />
          </View>
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

        <Pressable style={styles.paintBtn} onPress={onCustomize} accessibilityRole="button">
          <Text style={styles.paintText}>🎨  COULEURS</Text>
        </Pressable>

        <View style={styles.grid}>
          {SKINS.map((skin) => {
            const painted = paintedSkin(skin, playerColors);
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
                  <MonsterPreview skin={painted} size={118} />
                </View>
                <Text style={styles.cardName} numberOfLines={1}>
                  {skin.name.toUpperCase()}
                </Text>
                {isSelected ? (
                  <View style={styles.check}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                ) : owned ? (
                  <Text style={styles.owned}>ACQUIS</Text>
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
        </>
        ) : null}

        {tab === 'gear' ? (
          <View style={styles.list}>
            {ACCESSORIES.map((a) => {
              const owned = unlockedAccessories.includes(a.id);
              const on = selectedAccessory === a.id;
              return (
                <Pressable
                  key={a.id}
                  style={[styles.rowCard, on && styles.cardSelected]}
                  onPress={() => {
                    if (owned) selectAccessory(a.id);
                    else if (buyAccessory(a.id)) playSfx('coin');
                  }}
                >
                  <View style={styles.rowCopy}>
                    <Text style={styles.cardName}>{a.name.toUpperCase()}</Text>
                    <Text style={styles.blurb}>{a.blurb}</Text>
                  </View>
                  <Text style={styles.price}>
                    {on ? 'ÉQUIPÉ' : owned ? 'ÉQUIPER' : a.price === 0 ? 'GRATUIT' : String(a.price)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {tab === 'stats' ? (
          <View style={styles.list}>
            {STATS.map((st) => {
              const lvl = upgrades[st.id];
              const cost = nextStatCost(lvl);
              return (
                <View key={st.id} style={styles.rowCard}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.cardName}>
                      {st.icon}  {st.name.toUpperCase()} · {lvl}/{5}
                    </Text>
                    <Text style={styles.blurb}>{st.blurb}</Text>
                  </View>
                  {cost === null ? (
                    <Text style={styles.owned}>MAX</Text>
                  ) : (
                    <Pressable
                      style={styles.upBtn}
                      onPress={() => {
                        if (upgradeStat(st.id)) playSfx('power');
                      }}
                    >
                      <Text style={styles.upText}>{cost}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: {
    backgroundColor: colors.yellow,
    borderColor: '#FFE88A',
  },
  tabText: {
    ...display,
    color: colors.white,
    fontSize: 12,
  },
  tabTextOn: {
    color: colors.black,
  },
  list: {
    gap: spacing.sm,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  blurb: {
    ...display,
    color: colors.muted,
    fontSize: 12,
  },
  upBtn: {
    backgroundColor: colors.yellow,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  upText: {
    ...display,
    color: colors.black,
    fontSize: 16,
  },
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
  paintBtn: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.panelElevated,
    borderWidth: 2,
    borderColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paintText: {
    ...display,
    color: colors.yellow,
    fontSize: 16,
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
