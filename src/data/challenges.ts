/** Daily challenges (DÉFIS) and in-run missions. Progress counters come from RunStats. */

export type ChallengeStat = 'proteins' | 'junkDodged' | 'distance' | 'coins' | 'roofs';

export type ChallengeDef = {
  id: string;
  label: string;
  stat: ChallengeStat;
  target: number;
  reward: number;
  icon: string;
};

export const DAILY_CHALLENGES: ChallengeDef[] = [
  { id: 'daily-proteins', label: 'Collecte 30 protéines', stat: 'proteins', target: 30, reward: 200, icon: '🥦' },
  { id: 'daily-junk', label: 'Évite 5 malbouffes', stat: 'junkDodged', target: 5, reward: 150, icon: '🍔' },
  { id: 'daily-distance', label: 'Cours 1500 mètres', stat: 'distance', target: 1500, reward: 200, icon: '🏃' },
];

/** Missions shown in the run's bottom box, one at a time, in order (then loop). */
export const MISSIONS: ChallengeDef[] = [
  { id: 'm-proteins', label: 'COLLECTE 20 PROTÉINES', stat: 'proteins', target: 20, reward: 100, icon: '🍗' },
  { id: 'm-coins', label: 'RAMASSE 50 PIÈCES', stat: 'coins', target: 50, reward: 80, icon: '🪙' },
  { id: 'm-roofs', label: 'MONTE SUR 5 CAMIONS', stat: 'roofs', target: 5, reward: 120, icon: '🚚' },
  { id: 'm-junk', label: 'ÉVITE 5 MALBOUFFES', stat: 'junkDodged', target: 5, reward: 100, icon: '🍟' },
  { id: 'm-distance', label: 'COURS 1000 M', stat: 'distance', target: 1000, reward: 150, icon: '🏁' },
];

/** Local rivals for the offline leaderboard (CLASSEMENT). */
export const RIVALS = [
  { name: 'FitBeast', score: 12500 },
  { name: 'IronGamer', score: 9800 },
  { name: 'NoPainNoGain', score: 7600 },
  { name: 'StrongMan', score: 4300 },
  { name: 'CardioQueen', score: 2600 },
  { name: 'MuscleMax', score: 1200 },
];

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Time until local midnight, as HH:MM:SS. */
export function timeToReset(now = new Date()): string {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}
