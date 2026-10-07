import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LOGIN_REWARDS, type LoginState } from '../data/retention';
import { colors, radii, spacing } from '../data/theme';
import { display } from './fonts';

type Props = {
  login: LoginState;
  onClaim: () => void;
};

/** 7-day login cycle with a flame streak. */
export function LoginStreak({ login, onClaim }: Props) {
  const claimed = login.claimedDay === login.cycleDay;
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.flame}>🔥</Text>
        <Text style={styles.title}>SÉRIE · {login.streak} j</Text>
      </View>
      <View style={styles.days}>
        {LOGIN_REWARDS.map((reward, i) => {
          const day = i + 1;
          const done = day < login.cycleDay || (claimed && day === login.cycleDay);
          const today = day === login.cycleDay;
          return (
            <View key={day} style={[styles.day, today && styles.dayToday, done && styles.dayDone]}>
              <Text style={[styles.dayN, today && styles.dayNOn]}>{day === 7 ? '🎁' : day}</Text>
              <Text style={styles.dayR}>{reward}</Text>
            </View>
          );
        })}
      </View>
      <Pressable
        style={[styles.claim, claimed && styles.claimed]}
        onPress={onClaim}
        disabled={claimed}
        accessibilityRole="button"
      >
        <Text style={[styles.claimText, claimed && styles.claimedText]}>
          {claimed ? 'DÉJÀ RÉCUPÉRÉ' : `JOUR ${login.cycleDay} · +${LOGIN_REWARDS[login.cycleDay - 1]}`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(20,29,51,0.94)',
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flame: {
    fontSize: 18,
  },
  title: {
    ...display,
    color: colors.yellow,
    fontSize: 14,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.panelElevated,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayToday: {
    borderColor: colors.yellow,
  },
  dayDone: {
    backgroundColor: '#2E7D32',
  },
  dayN: {
    ...display,
    color: colors.white,
    fontSize: 12,
  },
  dayNOn: {
    color: colors.yellow,
  },
  dayR: {
    ...display,
    color: colors.white,
    fontSize: 9,
    opacity: 0.8,
  },
  claim: {
    backgroundColor: colors.yellow,
    borderRadius: radii.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  claimed: {
    backgroundColor: colors.panelElevated,
  },
  claimText: {
    ...display,
    color: colors.black,
    fontSize: 13,
  },
  claimedText: {
    color: colors.white,
  },
});
