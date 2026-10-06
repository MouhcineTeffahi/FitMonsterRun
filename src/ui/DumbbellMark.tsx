import React from 'react';
import { StyleSheet, View } from 'react-native';

/** Flat gold dumbbell used everywhere the old coin icon appeared. */
export function DumbbellMark({ size = 22 }: { size?: number }) {
  const plateW = Math.max(4, size * 0.22);
  const plateH = size * 0.72;
  const barH = Math.max(3, size * 0.16);
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.bar,
          { width: size * 0.62, height: barH, borderRadius: barH / 2, marginTop: -barH / 2 },
        ]}
      />
      <View style={[styles.plate, { width: plateW, height: plateH, left: 0, borderRadius: plateW / 2 }]} />
      <View style={[styles.plate, { width: plateW, height: plateH, right: 0, borderRadius: plateW / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    top: '50%',
    backgroundColor: '#E6A40A',
  },
  plate: {
    position: 'absolute',
    top: '14%',
    backgroundColor: '#FFC21A',
    borderWidth: 1.5,
    borderColor: '#FFE88A',
  },
});
