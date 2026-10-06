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
  { id: 'daily-proteins', label: 'Collect 30 proteins', stat: 'proteins', target: 30, reward: 200, icon: '🥦' },
  { id: 'daily-junk', label: 'Dodge 5 junk foods', stat: 'junkDodged', target: 5, reward: 150, icon: '🍔' },
  { id: 'daily-distance', label: 'Run 1500 meters', stat: 'distance', target: 1500, reward: 200, icon: '🏃' },
];

/** Missions shown in the run's bottom box, one at a time, in order (then loop). */
export const MISSIONS: ChallengeDef[] = [
  { id: 'm-proteins', label: 'COLLECT 20 PROTEINS', stat: 'proteins', target: 20, reward: 100, icon: '🍗' },
  { id: 'm-coins', label: 'GRAB 50 DUMBBELLS', stat: 'coins', target: 50, reward: 80, icon: '🏋️' },
  { id: 'm-roofs', label: 'LAND ON 5 TRUCKS', stat: 'roofs', target: 5, reward: 120, icon: '🚚' },
  { id: 'm-junk', label: 'DODGE 5 JUNK FOODS', stat: 'junkDodged', target: 5, reward: 100, icon: '🍟' },
  { id: 'm-distance', label: 'RUN 1000 M', stat: 'distance', target: 1000, reward: 150, icon: '🏁' },
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
