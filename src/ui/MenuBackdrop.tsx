import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

const W = 400;
const H = 800;
const HORIZON = 430;
const FACADES = ['#FF8A65', '#4DD0E1', '#FFD54F', '#BA68C8', '#81C784', '#F06292', '#90CAF9'];

/** Deterministic pseudo-random so the backdrop is identical on every render. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function Palm({ x, y, s, flip = 1 }: { x: number; y: number; s: number; flip?: number }) {
  const fronds = [-150, -115, -75, -35, 0, 30];
  return (
    <G transform={`translate(${x} ${y}) scale(${s * flip} ${s})`}>
      <Path d="M0 0 C 6 -40, 2 -80, 14 -120" stroke="#6D4C2F" strokeWidth={7} fill="none" strokeLinecap="round" />
      {fronds.map((a) => (
        <Path
          key={a}
          d="M0 0 C 20 -14, 40 -10, 58 6 C 40 -2, 20 -2, 0 0 Z"
          fill="#2E9E4F"
          transform={`translate(14 -120) rotate(${a})`}
        />
      ))}
    </G>
  );
}

/**
 * Original sunny beach + city boardwalk illustration behind the home hero
 * (SVG, scales to any screen with "slice").
 */
export function MenuBackdrop() {
  const city = useMemo(() => {
    const r = rng(7);
    const out: { x: number; w: number; h: number; c: string; wins: { x: number; y: number }[] }[] = [];
    let x = 150;
    while (x < W + 20) {
      const w = 34 + r() * 40;
      const h = 90 + r() * 170;
      const wins: { x: number; y: number }[] = [];
      for (let wy = HORIZON - h + 12; wy < HORIZON - 14; wy += 16) {
        for (let wx = x + 6; wx < x + w - 10; wx += 12) wins.push({ x: wx, y: wy });
      }
      out.push({ x, w, h, c: FACADES[Math.floor(r() * FACADES.length)], wins });
      x += w + 2;
    }
    return out;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1FB8F2" />
            <Stop offset="0.6" stopColor="#8ED8FF" />
            <Stop offset="1" stopColor="#FFD9B0" />
          </LinearGradient>
          <LinearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1EA7D8" />
            <Stop offset="1" stopColor="#5FE0E8" />
          </LinearGradient>
          <LinearGradient id="road" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#5A5F7A" />
            <Stop offset="1" stopColor="#3E425A" />
          </LinearGradient>
          <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0D1426" stopOpacity="0" />
            <Stop offset="1" stopColor="#0D1426" stopOpacity="0.92" />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={W} height={HORIZON} fill="url(#sky)" />
        <Circle cx={80} cy={150} r={46} fill="#FFF3C4" opacity={0.95} />
        <Circle cx={80} cy={150} r={70} fill="#FFF3C4" opacity={0.25} />
        <Path d="M220 110 q20 -24 46 -8 q22 -14 40 6 q22 2 18 20 h-112 q-10 -14 8 -18 Z" fill="#FFFFFF" opacity={0.9} />
        <Path d="M20 230 q14 -16 32 -6 q16 -10 28 4 q16 2 12 14 h-80 q-6 -10 8 -12 Z" fill="#FFFFFF" opacity={0.75} />

        <Rect x={0} y={HORIZON - 40} width={170} height={40} fill="url(#sea)" />
        {city.map((b, i) => (
          <G key={i}>
            <Rect x={b.x} y={HORIZON - b.h} width={b.w} height={b.h} fill={b.c} />
            <Rect x={b.x} y={HORIZON - b.h} width={b.w} height={6} fill="#FFFFFF" opacity={0.35} />
            {b.wins.map((w, j) => (
              <Rect key={j} x={w.x} y={w.y} width={6} height={8} fill="#1D3557" opacity={0.55} />
            ))}
          </G>
        ))}

        <Polygon points={`0,${HORIZON} 170,${HORIZON} 130,${H} 0,${H}`} fill="#F5D9A0" />
        <Polygon points={`0,${HORIZON} 60,${HORIZON} 0,${HORIZON + 90}`} fill="#4FD3E0" opacity={0.7} />
        <Polygon points={`170,${HORIZON} 250,${HORIZON} 330,${H} 130,${H}`} fill="#E85D75" />
        <Polygon points={`250,${HORIZON} ${W},${HORIZON} ${W},${H} 330,${H}`} fill="url(#road)" />
        {[0, 1, 2, 3, 4].map((i) => {
          const t0 = i / 5 + 0.04;
          const t1 = t0 + 0.09;
          const y0 = HORIZON + (H - HORIZON) * t0 * t0;
          const y1 = HORIZON + (H - HORIZON) * t1 * t1;
          const x0 = 280 + 70 * t0 * t0;
          const x1 = 280 + 70 * t1 * t1;
          return (
            <Polygon
              key={i}
              points={`${x0 - 1 - 3 * t0},${y0} ${x0 + 1 + 3 * t0},${y0} ${x1 + 1 + 3 * t1},${y1} ${x1 - 1 - 3 * t1},${y1}`}
              fill="#FFFFFF"
              opacity={0.85}
            />
          );
        })}

        <Palm x={30} y={HORIZON + 30} s={1.15} />
        <Palm x={120} y={HORIZON + 6} s={0.8} flip={-1} />
        <Palm x={200} y={HORIZON + 4} s={0.7} />
        <Palm x={360} y={HORIZON + 60} s={1.3} flip={-1} />

        <Rect x={0} y={H * 0.55} width={W} height={H * 0.45} fill="url(#shade)" />
      </Svg>
    </View>
  );
}
