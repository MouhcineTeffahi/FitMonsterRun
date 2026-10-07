import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getSpace, SPACES, type SpaceDef } from '../data/spaces';
import { colors, radii } from '../data/theme';
import { useProgressStore } from '../store/progressStore';
import { DumbbellMark } from './DumbbellMark';
import { display } from './fonts';
import { SpacePreview } from './SpacePreview';

/** One-card place picker. Arrows change the view and select unlocked worlds. */
export function SpacePicker() {
  const selected = useProgressStore((s) => s.selectedSpace);
  const unlocked = useProgressStore((s) => s.unlockedSpaces);
  const totalCoins = useProgressStore((s) => s.totalCoins);
  const chooseSpace = useProgressStore((s) => s.chooseSpace);
  const [denied, setDenied] = useState<string | null>(null);
  const [index, setIndex] = useState(() => Math.max(0, SPACES.findIndex((s) => s.id === selected)));
  const space = SPACES[index] ?? SPACES[0];
  const open = unlocked.includes(space.id);
  const active = space.id === selected;
  const current = getSpace(selected);
  const deniedSpace = denied ? getSpace(denied as SpaceDef['id']) : null;
  const need = deniedSpace ? Math.max(0, deniedSpace.cost - totalCoins) : 0;

  const show = (i: number) => {
    const next = (i + SPACES.length) % SPACES.length;
    setIndex(next);
    setDenied(null);
    const dest = SPACES[next];
    if (unlocked.includes(dest.id)) chooseSpace(dest.id);
  };

  const onPick = () => {
    setDenied(chooseSpace(space.id) ? null : space.id);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>CHOISIS TON LIEU</Text>
      <Text style={styles.caption}>
        {deniedSpace
          ? `ENCORE ${need} HALTÈRES POUR DÉBLOQUER`
          : active
            ? `${current.emoji}  ${current.name}`
            : `APPUIE POUR DÉBLOQUER · ${space.cost}`}
      </Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => show(index - 1)}
          style={styles.arrow}
          accessibilityRole="button"
          accessibilityLabel="Lieu précédent"
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Pressable
          onPress={onPick}
          style={[styles.card, active && styles.active]}
          accessibilityRole="button"
          accessibilityLabel={
            open ? `Lieu ${space.name}` : `Débloquer ${space.name} pour ${space.cost} haltères`
          }
        >
          <SpacePreview id={space.id} />
          <View style={styles.cardShine} pointerEvents="none" />
          {!open ? <View style={styles.dim} /> : null}
          <View style={styles.body}>
            <Text style={styles.emoji}>{space.emoji}</Text>
            <View style={styles.copy}>
              <Text style={styles.name} numberOfLines={1}>{space.name}</Text>
              <Text style={styles.tagline} numberOfLines={1}>{space.tagline}</Text>
            </View>
          </View>
          {active ? (
            <View style={styles.selectedChip}>
              <Text style={styles.selectedText}>CHOISI</Text>
            </View>
          ) : null}
          {open ? null : (
            <View style={styles.lock}>
              <DumbbellMark size={16} />
              <Text style={styles.cost}>{space.cost}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => show(index + 1)}
          style={styles.arrow}
          accessibilityRole="button"
          accessibilityLabel="Lieu suivant"
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.dots}>
        {SPACES.map((s, i) => (
          <View
            key={s.id}
            style={[
              styles.dot,
              i === index && styles.dotOn,
              unlocked.includes(s.id) ? null : styles.dotLock,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
    width: '100%',
    zIndex: 8,
  },
  heading: {
    ...display,
    color: colors.yellowBright,
    fontSize: 13,
    letterSpacing: 1.4,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  caption: {
    ...display,
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  arrow: {
    width: 40,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: 'rgba(10,16,32,0.9)',
    borderWidth: 2,
    borderColor: colors.yellowBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    ...display,
    color: colors.white,
    fontSize: 32,
    marginTop: -6,
  },
  card: {
    flex: 1,
    height: 172,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    borderBottomWidth: 5,
    borderBottomColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: '#1A2040',
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  active: {
    borderColor: colors.yellowBright,
    borderWidth: 3,
    borderBottomWidth: 5,
    borderBottomColor: '#B86E00',
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,12,28,0.38)',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    zIndex: 1,
  },
  emoji: {
    fontSize: 42,
    lineHeight: 48,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 6,
  },
  copy: {
    flex: 1,
    gap: 2,
    paddingBottom: 2,
  },
  name: {
    ...display,
    color: colors.white,
    fontSize: 20,
    textShadowColor: '#000',
    textShadowRadius: 4,
  },
  tagline: {
    ...display,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 16,
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  selectedChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.yellow,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: '#FFF6B0',
  },
  selectedText: {
    ...display,
    color: colors.black,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  lock: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10,16,32,0.88)',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  cost: {
    ...display,
    color: colors.yellowBright,
    fontSize: 13,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotOn: {
    width: 16,
    backgroundColor: colors.yellowBright,
  },
  dotLock: {
    opacity: 0.45,
  },
});
