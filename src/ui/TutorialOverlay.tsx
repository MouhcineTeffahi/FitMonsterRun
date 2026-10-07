import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../data/theme';
import { display } from './fonts';

const STEPS = [
  { t: 0, text: '← →  Change de couloir' },
  { t: 3300, text: '↑  Saute les obstacles' },
  { t: 6600, text: '↓  Glisse sous les panneaux' },
];

type Props = {
  onDone: () => void;
};

/** First-run 10s tutorial. */
export function TutorialOverlay({ onDone }: Props) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const ids = [
      setTimeout(() => setI(1), STEPS[1].t),
      setTimeout(() => setI(2), STEPS[2].t),
      setTimeout(onDone, 10000),
    ];
    return () => ids.forEach(clearTimeout);
  }, [onDone]);
  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.card}>
        <Text style={styles.kicker}>TUTORIEL</Text>
        <Text style={styles.text}>{STEPS[i].text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 120,
  },
  card: {
    backgroundColor: 'rgba(10,16,32,0.86)',
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.yellow,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  kicker: {
    ...display,
    color: colors.yellow,
    fontSize: 12,
  },
  text: {
    ...display,
    color: colors.white,
    fontSize: 18,
  },
});
