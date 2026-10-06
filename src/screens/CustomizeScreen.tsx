import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  COLOR_SLOTS,
  DEFAULT_PLAYER_COLORS,
  SWATCHES,
  paintedSkin,
  type ColorSlot,
} from '../data/playerColors';
import { getSkin } from '../data/skins';
import { colors, radii, spacing } from '../data/theme';
import { MonsterShowcase } from '../game/player/MonsterShowcase';
import { useProgressStore } from '../store/progressStore';
import { display } from '../ui/fonts';
import { ScreenHeader } from '../ui/ScreenHeader';
import { ui } from '../utils/styles';

type Props = {
  onBack: () => void;
};

/** Live paint booth: body / shorts / accents / eyes with a rotating 3D preview. */
export function CustomizeScreen({ onBack }: Props) {
  const selectedSkin = useProgressStore((s) => s.selectedSkin);
  const playerColors = useProgressStore((s) => s.playerColors);
  const totalCoins = useProgressStore((s) => s.totalCoins);
  const setPlayerColor = useProgressStore((s) => s.setPlayerColor);
  const resetPlayerColors = useProgressStore((s) => s.resetPlayerColors);
  const [slot, setSlot] = useState<ColorSlot>('body');

  const preview = useMemo(
    () => paintedSkin(getSkin(selectedSkin), playerColors),
    [selectedSkin, playerColors],
  );

  const dirty =
    playerColors.body !== DEFAULT_PLAYER_COLORS.body ||
    playerColors.shorts !== DEFAULT_PLAYER_COLORS.shorts ||
    playerColors.accents !== DEFAULT_PLAYER_COLORS.accents ||
    playerColors.eyes !== DEFAULT_PLAYER_COLORS.eyes;

  return (
    <SafeAreaView style={ui.screen}>
      <ScreenHeader title="CUSTOMIZE" onBack={onBack} coins={totalCoins} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.stage}>
          <View style={[styles.stageGlow, { backgroundColor: `${playerColors.body}33` }]} />
          <MonsterShowcase skin={preview} style={styles.showcase} />
          <Text style={styles.stageHint}>TAP A SWATCH · LIVE PREVIEW</Text>
        </View>

        <View style={styles.slots}>
          {COLOR_SLOTS.map((s) => {
            const active = slot === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSlot(s.id)}
                style={[styles.slotBtn, active && styles.slotActive]}
                accessibilityRole="button"
                accessibilityLabel={s.label}
              >
                <View style={[styles.slotDot, { backgroundColor: playerColors[s.id] }]} />
                <Text style={[styles.slotLabel, active && styles.slotLabelOn]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>{COLOR_SLOTS.find((s) => s.id === slot)?.label} COLOR</Text>
        <View style={styles.swatches}>
          {SWATCHES[slot].map((hex) => {
            const selected = playerColors[slot].toLowerCase() === hex.toLowerCase();
            return (
              <Pressable
                key={`${slot}-${hex}`}
                onPress={() => setPlayerColor(slot, hex)}
                style={[styles.swatch, selected && styles.swatchOn]}
                accessibilityRole="button"
                accessibilityLabel={`Color ${hex}`}
              >
                <View style={[styles.swatchFill, { backgroundColor: hex }]} />
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[ui.secondaryBtn, !dirty && styles.disabled]}
          disabled={!dirty}
          onPress={resetPlayerColors}
          accessibilityRole="button"
        >
          <Text style={ui.secondaryBtnText}>RESET TO CLASSIC</Text>
        </Pressable>
        <Pressable style={ui.primaryBtn} onPress={onBack} accessibilityRole="button">
          <Text style={ui.primaryBtnText}>DONE</Text>
        </Pressable>
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
    height: 280,
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stageGlow: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    top: '12%',
    bottom: '4%',
    borderRadius: 999,
  },
  showcase: {
    ...StyleSheet.absoluteFill,
  },
  stageHint: {
    ...display,
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.sm,
    color: colors.muted,
    fontSize: 12,
  },
  slots: {
    flexDirection: 'row',
    gap: 8,
  },
  slotBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  slotActive: {
    borderColor: colors.yellow,
    backgroundColor: colors.panelElevated,
  },
  slotDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  slotLabel: {
    ...display,
    color: colors.muted,
    fontSize: 11,
  },
  slotLabelOn: {
    color: colors.yellow,
  },
  section: {
    ...display,
    color: colors.white,
    fontSize: 16,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchOn: {
    borderColor: colors.yellow,
    borderWidth: 3,
  },
  swatchFill: {
    ...StyleSheet.absoluteFill,
  },
  check: {
    ...display,
    color: colors.black,
    fontSize: 18,
    textShadowColor: '#fff',
    textShadowRadius: 4,
  },
  disabled: {
    opacity: 0.45,
  },
});
