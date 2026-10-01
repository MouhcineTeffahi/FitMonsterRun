import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import type { SkinDef } from '../data/skins';
import { colors } from '../data/theme';

type Props = {
  skin: SkinDef;
  size?: number;
};

/** Placeholder fitness-monster silhouette tinted by selected skin. */
export function MonsterPreview({ skin, size = 160 }: Props) {
  const w = size;
  const h = size * 1.15;
  return (
    <View style={[styles.wrap, { width: w, height: h }]}>
      <Svg width={w} height={h} viewBox="0 0 120 140">
        <Ellipse cx="60" cy="128" rx="34" ry="8" fill="#00000055" />
        <Rect x="38" y="70" width="44" height="42" rx="10" fill={skin.primary} />
        <Rect x="44" y="78" width="32" height="18" rx="4" fill={skin.secondary} />
        <Circle cx="60" cy="48" r="28" fill={skin.primary} />
        <Ellipse cx="48" cy="46" rx="6" ry="8" fill={colors.white} />
        <Ellipse cx="72" cy="46" rx="6" ry="8" fill={colors.white} />
        <Circle cx="49" cy="48" r="3" fill={colors.black} />
        <Circle cx="73" cy="48" r="3" fill={colors.black} />
        <Path
          d="M48 60 Q60 70 72 60"
          stroke={skin.secondary}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <Rect x="22" y="74" width="16" height="28" rx="8" fill={skin.accent} />
        <Rect x="82" y="74" width="16" height="28" rx="8" fill={skin.accent} />
        <Rect x="42" y="108" width="14" height="18" rx="6" fill={skin.secondary} />
        <Rect x="64" y="108" width="14" height="18" rx="6" fill={skin.secondary} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
