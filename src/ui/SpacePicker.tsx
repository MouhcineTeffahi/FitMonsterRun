import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSpace, SPACES, type SpaceDef } from '../data/spaces';
import { colors, radii } from '../data/theme';
import { useProgressStore } from '../store/progressStore';
import { DumbbellMark } from './DumbbellMark';
import { display } from './fonts';

/** Horizontal row of run worlds; locked ones are bought with coins on tap. */
export function SpacePicker() {
  const selected = useProgressStore((s) => s.selectedSpace);
  const unlocked = useProgressStore((s) => s.unlockedSpaces);
  const totalCoins = useProgressStore((s) => s.totalCoins);
  const chooseSpace = useProgressStore((s) => s.chooseSpace);
  const [denied, setDenied] = useState<string | null>(null);
  const current = getSpace(selected);

  const onPick = (space: SpaceDef) => {
    setDenied(chooseSpace(space.id) ? null : space.id);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.caption}>
        {denied
          ? `IL TE FAUT ${getSpace(denied as SpaceDef['id']).cost - totalCoins} PIÈCES DE PLUS`
          : `${current.emoji} ${current.name} · ${current.tagline}`}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {SPACES.map((space) => {
          const open = unlocked.includes(space.id);
          const active = space.id === selected;
          return (
            <Pressable
              key={space.id}
              onPress={() => onPick(space)}
              style={[styles.card, { backgroundColor: space.colors[0] }, active && styles.active]}
              accessibilityRole="button"
              accessibilityLabel={open ? `Monde ${space.name}` : `Débloquer ${space.name} pour ${space.cost} pièces`}
            >
              <View style={[styles.band, { backgroundColor: space.colors[1] }]} />
              <Text style={styles.emoji}>{space.emoji}</Text>
              <Text style={styles.name} numberOfLines={2}>{space.name}</Text>
              {open ? null : (
                <View style={styles.lock}>
                  <DumbbellMark size={14} />
                  <Text style={styles.cost}>{space.cost}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
  },
  caption: {
    ...display,
    color: colors.white,
    fontSize: 13,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  row: {
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  card: {
    width: 84,
    height: 84,
    borderRadius: radii.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.45)',
  },
  active: {
    borderColor: colors.yellowBright,
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    opacity: 0.85,
  },
  emoji: {
    fontSize: 26,
  },
  name: {
    ...display,
    color: colors.white,
    fontSize: 11,
    lineHeight: 12,
    textAlign: 'center',
    paddingHorizontal: 4,
    textShadowColor: '#000',
    textShadowRadius: 2,
  },
  lock: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(10,16,32,0.85)',
    borderRadius: radii.pill,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  cost: {
    ...display,
    color: colors.yellowBright,
    fontSize: 10,
  },
});
