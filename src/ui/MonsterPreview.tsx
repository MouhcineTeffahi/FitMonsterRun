import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { SkinDef } from '../data/skins';

type Props = {
  skin: SkinDef;
  size?: number;
};

/** Flat 2D Fit Monster (front view) coloured like the 3D outfit of `skin`. */
export function MonsterPreview({ skin, size = 160 }: Props) {
  const o = skin.outfit;
  const w = size * 0.6;
  const h = size;
  return (
    <View style={[styles.wrap, { width: w, height: h }]}>
      <Svg width={w} height={h} viewBox="0 0 120 200">
        <Ellipse cx="60" cy="194" rx="34" ry="5" fill="#00000066" />
        {o.cape ? <Path d="M36 44 L84 44 L96 150 L24 150 Z" fill={o.cape} /> : null}

        {/* legs: calves + leggings */}
        <Path d="M42 124 Q38 150 42 182 L54 182 Q58 150 58 124 Z" fill={o.calf} />
        <Path d="M62 124 Q62 150 66 182 L78 182 Q82 150 78 124 Z" fill={o.calf} />
        <Path d="M40 118 Q36 136 42 150 L57 150 Q60 136 59 118 Z" fill={o.leggings} />
        <Path d="M61 118 Q60 136 63 150 L78 150 Q84 136 80 118 Z" fill={o.leggings} />
        <Rect x="41" y="174" width="15" height="8" rx="2" fill={o.sock} />
        <Rect x="64" y="174" width="15" height="8" rx="2" fill={o.sock} />
        {/* sneakers */}
        <Path d="M38 182 L56 182 Q60 188 58 192 L36 192 Q34 186 38 182 Z" fill={o.shoe} />
        <Path d="M64 182 L82 182 Q86 186 84 192 L62 192 Q60 188 64 182 Z" fill={o.shoe} />
        <Rect x="35" y="190" width="24" height="3" rx="1.5" fill={o.sole} />
        <Rect x="61" y="190" width="24" height="3" rx="1.5" fill={o.sole} />

        {/* arms */}
        <Path d="M30 46 Q18 54 20 76 Q20 92 24 104 L32 104 Q34 88 34 76 Q38 60 40 50 Z" fill={o.arm} />
        <Path d="M90 46 Q102 54 100 76 Q100 92 96 104 L88 104 Q86 88 86 76 Q82 60 80 50 Z" fill={o.arm} />
        <Rect x="22" y="98" width="11" height="6" rx="2" fill={o.wrist} />
        <Rect x="87" y="98" width="11" height="6" rx="2" fill={o.wrist} />
        <Ellipse cx="27" cy="110" rx="5.5" ry="7" fill={o.hand} />
        <Ellipse cx="93" cy="110" rx="5.5" ry="7" fill={o.hand} />

        {/* torso */}
        <Path d="M52 36 L68 36 L70 42 Q88 42 92 52 Q90 70 80 82 Q78 92 76 98 L44 98 Q42 92 40 82 Q30 70 28 52 Q32 42 50 42 Z" fill={o.torso} />

        {/* shorts */}
        <Path d="M42 96 L78 96 L82 124 L62 126 L60 112 L58 126 L38 124 Z" fill={o.shorts} />
        <G stroke={o.piping} strokeWidth="1.6" fill="none">
          <Path d="M38 123 L58 125 M62 125 L82 123 M40 100 L38 123 M80 100 L82 123" />
        </G>

        {/* masked head */}
        <Rect x="53" y="28" width="14" height="12" rx="4" fill={o.head} />
        <Ellipse cx="60" cy="20" rx="13" ry="16" fill={o.head} />
        <Path d="M49 20 Q53 15 58 19 Q54 23 49 20 Z" fill={o.eyes} />
        <Path d="M71 20 Q67 15 62 19 Q66 23 71 20 Z" fill={o.eyes} />
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
