import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { FONT } from './fonts';

type Props = {
  width?: number;
  style?: StyleProp<ViewStyle>;
};

const LINES: { text: string; y: number; size: number; x: number }[] = [
  { text: 'FIT', y: 62, size: 64, x: 18 },
  { text: 'MONSTER', y: 128, size: 66, x: 10 },
  { text: 'RUN', y: 196, size: 72, x: 30 },
];

/**
 * Original "FIT MONSTER RUN" wordmark: slanted, gold gradient fill over a thick
 * dark outline (two passes, because paint-order isn't supported on native).
 */
export function Logo({ width = 300, style }: Props) {
  const height = width * (220 / 320);
  return (
    <View style={[{ width, height }, style]} pointerEvents="none">
      <Svg width={width} height={height} viewBox="0 0 320 220">
        <Defs>
          <LinearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF4A8" />
            <Stop offset="0.45" stopColor="#FFD21F" />
            <Stop offset="1" stopColor="#FF9500" />
          </LinearGradient>
          <LinearGradient id="bolt" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFF4A8" />
            <Stop offset="1" stopColor="#FFB300" />
          </LinearGradient>
        </Defs>
        <G transform="skewX(-8) translate(18 0)">
          {LINES.map((l) => (
            <SvgText
              key={`o-${l.text}`}
              x={l.x}
              y={l.y + 5}
              fontSize={l.size}
              fontFamily={FONT}
              fill="#000"
              stroke="#000"
              strokeWidth={14}
              strokeLinejoin="round"
            >
              {l.text}
            </SvgText>
          ))}
          {LINES.map((l) => (
            <SvgText
              key={`s-${l.text}`}
              x={l.x}
              y={l.y}
              fontSize={l.size}
              fontFamily={FONT}
              fill="#1A1A1A"
              stroke="#1A1A1A"
              strokeWidth={10}
              strokeLinejoin="round"
            >
              {l.text}
            </SvgText>
          ))}
          {LINES.map((l) => (
            <SvgText key={`f-${l.text}`} x={l.x} y={l.y} fontSize={l.size} fontFamily={FONT} fill="url(#gold)">
              {l.text}
            </SvgText>
          ))}
          <Path
            d="M222 142 L196 186 L214 186 L204 214 L238 168 L219 168 L232 142 Z"
            fill="url(#bolt)"
            stroke="#1A1A1A"
            strokeWidth={5}
            strokeLinejoin="round"
          />
        </G>
      </Svg>
    </View>
  );
}
