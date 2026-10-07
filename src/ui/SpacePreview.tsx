import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

import type { SpaceId } from '../data/spaces';
import { ENV } from '../game/world/biomes';

const W = 280;
const H = 160;
const HZ = 78;

type Props = { id: SpaceId };

function gid(id: SpaceId, name: string) {
  return `${name}-${id}`;
}

function Sky({ id, top, mid, horizon }: { id: SpaceId; top: string; mid: string; horizon: string }) {
  const g = gid(id, 'sky');
  return (
    <>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="0.55" stopColor={mid} />
          <Stop offset="1" stopColor={horizon} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={HZ + 8} fill={`url(#${g})`} />
    </>
  );
}

function Road({ id, asphalt = '#4A4F68' }: { id: SpaceId; asphalt?: string }) {
  const g = gid(id, 'road');
  return (
    <>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={asphalt} />
          <Stop offset="1" stopColor="#2C3144" />
        </LinearGradient>
      </Defs>
      <Polygon points={`118,${HZ} 162,${HZ} ${W},${H} 0,${H}`} fill={`url(#${g})`} />
      {[0, 1, 2, 3].map((i) => {
        const t0 = 0.08 + i * 0.22;
        const t1 = t0 + 0.1;
        const y0 = HZ + (H - HZ) * t0;
        const y1 = HZ + (H - HZ) * t1;
        const w0 = 2 + t0 * 8;
        const w1 = 2 + t1 * 8;
        return (
          <Polygon
            key={i}
            points={`${140 - w0},${y0} ${140 + w0},${y0} ${140 + w1},${y1} ${140 - w1},${y1}`}
            fill="#F4F1E6"
            opacity={0.9}
          />
        );
      })}
    </>
  );
}

function Building({
  x, y, w, h, fill, win = '#1D3557', lit = false,
}: { x: number; y: number; w: number; h: number; fill: string; win?: string; lit?: boolean }) {
  const cells: { x: number; y: number }[] = [];
  for (let wy = y + 8; wy < y + h - 10; wy += 10) {
    for (let wx = x + 5; wx < x + w - 8; wx += 9) cells.push({ x: wx, y: wy });
  }
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} fill={fill} />
      <Rect x={x} y={y} width={w} height={4} fill="#FFFFFF" opacity={0.28} />
      {cells.map((c, i) => (
        <Rect key={i} x={c.x} y={c.y} width={5} height={6} fill={win} opacity={lit ? 0.95 : 0.5} />
      ))}
    </G>
  );
}

function Palm({ x, y, s = 1, flip = 1 }: { x: number; y: number; s?: number; flip?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s * flip} ${s})`}>
      <Path d="M0 0 C 3 -22, 1 -44, 8 -64" stroke="#6D4C2F" strokeWidth={4} fill="none" strokeLinecap="round" />
      {[-140, -90, -40, 10, 50].map((a) => (
        <Path
          key={a}
          d="M0 0 C 10 -8, 22 -6, 32 4 C 22 -1, 10 -1, 0 0 Z"
          fill="#2E9E4F"
          transform={`translate(8 -64) rotate(${a})`}
        />
      ))}
    </G>
  );
}

function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Rect x={-3} y={-8} width={6} height={12} fill="#5A3A22" />
      <Polygon points="0,-48 -16,-18 16,-18" fill="#2F6B3A" />
      <Polygon points="0,-36 -14,-12 14,-12" fill="#3A8648" />
      <Polygon points="0,-24 -12,-4 12,-4" fill="#4A9A56" />
    </G>
  );
}

function Cactus({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Rect x={-5} y={-36} width={10} height={36} rx={5} fill="#2F9A5A" />
      <Rect x={-18} y={-28} width={8} height={16} rx={4} fill="#2F9A5A" />
      <Rect x={-18} y={-28} width={16} height={7} rx={3} fill="#2F9A5A" />
      <Rect x={7} y={-22} width={7} height={12} rx={3} fill="#2F9A5A" />
    </G>
  );
}

function Scene({ id }: Props) {
  switch (id) {
    case 'tour':
      return (
        <>
          <Sky id={id} top="#6C4BFF" mid="#74CCFF" horizon="#FFB49C" />
          <Circle cx={48} cy={28} r={16} fill="#FFF3C4" />
          <Building x={8} y={28} w={28} h={50} fill="#FF7F6B" />
          <Building x={38} y={18} w={24} h={60} fill="#6EC6FF" />
          <Building x={218} y={22} w={26} h={56} fill="#B79CFF" />
          <Building x={246} y={36} w={28} h={42} fill="#FFD45C" />
          <Palm x={78} y={HZ} s={0.7} />
          <Pine x={200} y={HZ} s={0.85} />
          <Polygon points={`0,${HZ} 118,${HZ} 0,${H}`} fill="#F5D9A0" />
          <Polygon points={`162,${HZ} ${W},${HZ} ${W},${H}`} fill="#E85D75" />
          <Road id={id} />
        </>
      );
    case 'downtown': {
      const e = ENV.city;
      return (
        <>
          <Sky id={id} top={e.skyTop} mid={e.skyMid} horizon={e.horizon} />
          <Circle cx={52} cy={26} r={14} fill="#FFF3C4" />
          <Building x={6} y={22} w={32} h={56} fill="#FF7F6B" />
          <Building x={40} y={10} w={26} h={68} fill="#5FD3B0" />
          <Building x={68} y={30} w={22} h={48} fill="#FFD45C" />
          <Building x={188} y={16} w={28} h={62} fill="#6EC6FF" />
          <Building x={218} y={8} w={24} h={70} fill="#B79CFF" />
          <Building x={244} y={28} w={30} h={50} fill="#FFA36B" />
          <Road id={id} />
        </>
      );
    }
    case 'beach': {
      const e = ENV.beach;
      return (
        <>
          <Sky id={id} top={e.skyTop} mid={e.skyMid} horizon={e.horizon} />
          <Circle cx={210} cy={24} r={16} fill="#FFF3C4" />
          <Rect x={0} y={HZ - 18} width={110} height={18} fill="#1EA7D8" />
          <Rect x={0} y={HZ - 10} width={110} height={10} fill="#5FE0E8" />
          <Building x={200} y={36} w={26} h={42} fill="#FFFFFF" />
          <Building x={228} y={28} w={24} h={50} fill="#7FE0D0" />
          <Building x={254} y={40} w={22} h={38} fill="#FFC9A8" />
          <Polygon points={`0,${HZ} 118,${HZ} 0,${H}`} fill="#F5D9A0" />
          <Palm x={28} y={HZ + 18} s={0.95} />
          <Palm x={72} y={HZ + 8} s={0.72} flip={-1} />
          <Palm x={250} y={HZ + 22} s={0.85} />
          <Road id={id} />
        </>
      );
    }
    case 'night': {
      const e = ENV.night;
      return (
        <>
          <Sky id={id} top={e.skyTop} mid={e.skyMid} horizon={e.horizon} />
          <Circle cx={40} cy={22} r={8} fill="#F4F0C8" />
          <Circle cx={90} cy={16} r={1.5} fill="#FFF" />
          <Circle cx={130} cy={28} r={1.2} fill="#FFF" />
          <Circle cx={200} cy={18} r={1.4} fill="#FFF" />
          <Building x={8} y={20} w={30} h={58} fill="#1A1F5C" win="#FFC400" lit />
          <Building x={40} y={8} w={26} h={70} fill="#141026" win="#00D9FF" lit />
          <Building x={68} y={28} w={22} h={50} fill="#2A2457" win="#FF3D7F" lit />
          <Building x={192} y={12} w={28} h={66} fill="#1A1F5C" win="#B46BFF" lit />
          <Building x={222} y={24} w={24} h={54} fill="#141026" win="#7CFF4F" lit />
          <Building x={248} y={6} w={26} h={72} fill="#2A2457" win="#00D9FF" lit />
          <Rect x={44} y={30} width={18} height={6} fill="#FF3D7F" />
          <Rect x={226} y={36} width={16} height={5} fill="#00D9FF" />
          <Road id={id} asphalt="#1C1830" />
        </>
      );
    }
    case 'mountain': {
      const e = ENV.mountain;
      return (
        <>
          <Sky id={id} top={e.skyTop} mid={e.skyMid} horizon={e.horizon} />
          <Polygon points="0,78 40,22 78,78" fill="#6B7280" />
          <Polygon points="50,78 110,8 168,78" fill="#4A5568" />
          <Polygon points="150,78 210,28 280,78" fill="#8B7355" />
          <Polygon points="96,28 110,8 122,28" fill="#E8EEF4" />
          <Pine x={24} y={HZ} s={0.9} />
          <Pine x={52} y={HZ + 4} s={0.7} />
          <Pine x={228} y={HZ} s={0.85} />
          <Pine x={256} y={HZ + 6} s={0.65} />
          <Rect x={0} y={HZ - 4} width={W} height={5} fill="#9CA3AF" />
          <Road id={id} asphalt="#5A6270" />
        </>
      );
    }
    case 'park': {
      const e = ENV.park;
      return (
        <>
          <Sky id={id} top={e.skyTop} mid={e.skyMid} horizon={e.horizon} />
          <Circle cx={46} cy={24} r={14} fill="#FFF3C4" />
          <Rect x={0} y={HZ - 16} width={W} height={16} fill="#7BC86A" />
          <Building x={18} y={42} w={48} h={36} fill="#F4F0E6" />
          <Building x={214} y={40} w={50} h={38} fill="#C9E4C5" />
          <Circle cx={44} cy={HZ - 10} r={16} fill="#2F9A4A" />
          <Circle cx={70} cy={HZ - 6} r={12} fill="#3A8648" />
          <Circle cx={230} cy={HZ - 12} r={18} fill="#2F9A4A" />
          <Circle cx={258} cy={HZ - 4} r={11} fill="#4A9A56" />
          <Rect x={0} y={HZ} width={118} height={H - HZ} fill="#8ED46A" />
          <Rect x={162} y={HZ} width={118} height={H - HZ} fill="#8ED46A" />
          <Road id={id} />
        </>
      );
    }
    case 'sunset': {
      const e = ENV.sunset;
      return (
        <>
          <Sky id={id} top={e.skyTop} mid={e.skyMid} horizon={e.horizon} />
          <Circle cx={140} cy={42} r={22} fill="#FFB255" />
          <Circle cx={140} cy={42} r={34} fill="#FFB255" opacity={0.28} />
          <Rect x={0} y={HZ - 8} width={W} height={8} fill="#C47A4A" />
          <Rect x={24} y={36} width={8} height={HZ - 36} fill="#3A2A8C" />
          <Rect x={248} y={36} width={8} height={HZ - 36} fill="#3A2A8C" />
          <Rect x={24} y={42} width={232} height={7} fill="#5B3A8C" />
          <Rect x={24} y={58} width={232} height={5} fill="#5B3A8C" />
          <Road id={id} asphalt="#4A3A58" />
        </>
      );
    }
    case 'docks': {
      const e = ENV.docks;
      return (
        <>
          <Sky id={id} top={e.skyTop} mid={e.skyMid} horizon={e.horizon} />
          <Rect x={0} y={HZ - 16} width={100} height={16} fill="#2A6A88" />
          <Building x={12} y={34} w={40} h={44} fill="#3D4A5C" win="#E8B84A" lit />
          <Building x={54} y={22} w={28} h={56} fill="#2B3A4A" win="#C45C26" lit />
          <Rect x={210} y={18} width={8} height={60} fill="#8A9AAB" />
          <Rect x={198} y={18} width={50} height={7} fill="#C45C26" />
          <Rect x={232} y={24} width={5} height={28} fill="#E8B84A" />
          <Building x={236} y={40} w={36} h={38} fill="#C45C26" win="#E8B84A" lit />
          <Polygon points={`0,${HZ} 118,${HZ} 0,${H}`} fill="#2A6A88" />
          <Road id={id} asphalt="#3E4A5C" />
        </>
      );
    }
    case 'gym': {
      const e = ENV.gym;
      return (
        <>
          <Sky id={id} top={e.skyTop} mid={e.skyMid} horizon={e.horizon} />
          <Circle cx={50} cy={24} r={14} fill="#FFF3C4" />
          <Rect x={0} y={HZ} width={118} height={H - HZ} fill="#2E3348" />
          <Rect x={70} y={HZ - 6} width={28} height={8} fill="#3B3F58" />
          <Rect x={78} y={HZ - 18} width={4} height={16} fill="#9AA3B5" />
          <Rect x={96} y={HZ - 18} width={4} height={16} fill="#9AA3B5" />
          <Rect x={74} y={HZ - 22} width={30} height={3} fill="#D7DCE6" />
          <Circle cx={78} cy={HZ - 22} r={5} fill="#E8434F" />
          <Circle cx={100} cy={HZ - 22} r={5} fill="#E8434F" />
          <Circle cx={88} cy={HZ - 4} r={6} fill="#E8A070" />
          <Rect x={84} y={HZ - 14} width={8} height={10} fill="#E8434F" />
          <Circle cx={58} cy={HZ + 2} r={5} fill="#C47A48" />
          <Rect x={54} y={HZ - 8} width={8} height={10} fill="#FFB02E" />
          <Polygon points={`162,${HZ} ${W},${HZ} ${W},${H}`} fill="#1EA7D8" />
          <Rect x={162} y={HZ} width={28} height={H - HZ} fill="#FFE2B3" />
          <Palm x={196} y={HZ + 16} s={0.72} />
          <Palm x={248} y={HZ + 22} s={0.9} />
          <Road id={id} asphalt="#3A3F52" />
        </>
      );
    }
    case 'desert': {
      const e = ENV.desert;
      return (
        <>
          <Sky id={id} top={e.skyTop} mid={e.skyMid} horizon={e.horizon} />
          <Circle cx={210} cy={22} r={18} fill="#FFE0A3" />
          <Polygon points="8,78 40,40 72,78" fill="#D9824B" />
          <Polygon points="200,78 248,28 280,78" fill="#C9683A" />
          <Polygon points="40,78 86,52 120,78" fill="#E59A5C" />
          <Cactus x={32} y={HZ} />
          <Cactus x={70} y={HZ + 6} />
          <Cactus x={246} y={HZ} />
          <Polygon points={`0,${HZ} 118,${HZ} 0,${H}`} fill="#F0B27A" />
          <Polygon points={`162,${HZ} ${W},${HZ} ${W},${H}`} fill="#E59A5C" />
          <Road id={id} asphalt="#C9A06A" />
        </>
      );
    }
    case 'snow': {
      const e = ENV.snow;
      return (
        <>
          <Sky id={id} top={e.skyTop} mid={e.skyMid} horizon={e.horizon} />
          <Circle cx={40} cy={20} r={11} fill="#F4F8FC" opacity={0.9} />
          {[[70, 18], [120, 28], [175, 14], [230, 22], [90, 40], [200, 36]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={1.6} fill="#FFFFFF" />
          ))}
          <Building x={12} y={28} w={30} h={50} fill="#F4F7FB" win="#7BA3C9" />
          <Rect x={10} y={24} width={34} height={6} fill="#FFFFFF" />
          <Building x={44} y={16} w={24} h={62} fill="#C5D4E8" win="#7BA3C9" />
          <Rect x={42} y={12} width={28} height={6} fill="#FFFFFF" />
          <Building x={210} y={20} w={28} h={58} fill="#E8EEF5" win="#9BB8D4" />
          <Rect x={208} y={16} width={32} height={6} fill="#FFFFFF" />
          <Building x={240} y={32} w={30} h={46} fill="#F4F7FB" win="#7BA3C9" />
          <Rect x={238} y={28} width={34} height={6} fill="#FFFFFF" />
          <Pine x={78} y={HZ} s={0.7} />
          <Pine x={200} y={HZ} s={0.8} />
          <Polygon points={`0,${HZ} 118,${HZ} 0,${H}`} fill="#F4F8FC" />
          <Polygon points={`162,${HZ} ${W},${HZ} ${W},${H}`} fill="#FFFFFF" />
          <Circle cx={24} cy={HZ + 10} r={14} fill="#FFFFFF" />
          <Circle cx={52} cy={HZ + 16} r={18} fill="#FFFFFF" />
          <Circle cx={240} cy={HZ + 12} r={16} fill="#FFFFFF" />
          <Road id={id} asphalt="#8AA0B8" />
        </>
      );
    }
    default:
      return <Sky id={id} top="#1E9BFF" mid="#74CCFF" horizon="#FFD9B8" />;
  }
}

/** Illustrated thumbnail of a run destination (sky, road, landmarks). */
export const SpacePreview = memo(function SpacePreview({ id }: Props) {
  return (
    <View style={styles.fill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Scene id={id} />
        <Defs>
          <LinearGradient id={gid(id, 'shade')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0D1426" stopOpacity="0" />
            <Stop offset="0.45" stopColor="#0D1426" stopOpacity="0.15" />
            <Stop offset="1" stopColor="#0D1426" stopOpacity="0.78" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill={`url(#${gid(id, 'shade')})`} />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
