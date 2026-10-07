import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { BOOST_TIME, MAGNET_TIME, POWER_TIME, SHIELD_TIME } from '../game/sim/runSim';
import { display } from './fonts';

type Ring = { icon: string; t: number; max: number; color: string };

function RingIcon({ icon, t, max, color }: Ring) {
  const size = 44;
  const r = 16;
  const c = 2 * Math.PI * r;
  const fill = Math.max(0, Math.min(1, t / max));
  return (
    <View style={styles.item}>
      <Svg width={size} height={size}>
        <Circle cx={22} cy={22} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={4} fill="none" />
        <Circle
          cx={22}
          cy={22}
          r={r}
          stroke={color}
          strokeWidth={4}
          fill="none"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - fill)}
          strokeLinecap="round"
          transform="rotate(-90 22 22)"
        />
      </Svg>
      <Text style={styles.icon}>{icon}</Text>
    </View>
  );
}

type Props = {
  power: number;
  magnet: number;
  shield: number;
  boost: number;
};

/** HUD countdown rings for active gym buffs. */
export function BuffRings({ power, magnet, shield, boost }: Props) {
  const rings: Ring[] = [];
  if (power > 0) rings.push({ icon: '⚡', t: power, max: POWER_TIME, color: '#FFE34D' });
  if (magnet > 0) rings.push({ icon: '🧲', t: magnet, max: MAGNET_TIME, color: '#42A5F5' });
  if (shield > 0) rings.push({ icon: '🛡️', t: shield, max: SHIELD_TIME, color: '#FFE082' });
  if (boost > 0) rings.push({ icon: '🔥', t: boost, max: BOOST_TIME, color: '#FF3D6E' });
  if (!rings.length) return null;
  return (
    <View style={styles.row} pointerEvents="none">
      {rings.map((r) => (
        <RingIcon key={r.icon} {...r} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  item: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    ...display,
    position: 'absolute',
    fontSize: 16,
  },
});
