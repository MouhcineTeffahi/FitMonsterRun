import { todayKey } from './challenges';

/** 7-day login cycle. Day 7 is the jackpot. */
export const LOGIN_REWARDS = [50, 75, 100, 125, 150, 200, 500] as const;

export type LoginState = {
  lastDate: string;
  streak: number;
  /** 1..7 in the current cycle. */
  cycleDay: number;
  /** Last claimed cycle day this visit-cycle; 0 = nothing claimed yet. */
  claimedDay: number;
};

export function freshLogin(): LoginState {
  return { lastDate: '', streak: 0, cycleDay: 1, claimedDay: 0 };
}

function yesterdayKey(d = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}

/** Advance the login cycle to today without claiming. */
export function tickLogin(login: LoginState, now = new Date()): LoginState {
  const today = todayKey(now);
  if (login.lastDate === today) return login;
  const consecutive = login.lastDate !== '' && login.lastDate === yesterdayKey(now);
  if (!consecutive) {
    return { lastDate: today, streak: 1, cycleDay: 1, claimedDay: 0 };
  }
  const cycleDay = login.cycleDay >= 7 ? 1 : login.cycleDay + 1;
  return {
    lastDate: today,
    streak: login.streak + 1,
    cycleDay,
    claimedDay: cycleDay === 1 ? 0 : login.claimedDay,
  };
}

export function parseLogin(raw: unknown): LoginState {
  if (!raw || typeof raw !== 'object') return tickLogin(freshLogin());
  const o = raw as Partial<LoginState>;
  return tickLogin({
    lastDate: typeof o.lastDate === 'string' ? o.lastDate : '',
    streak: Math.max(0, Math.floor(Number(o.streak) || 0)),
    cycleDay: Math.max(1, Math.min(7, Math.floor(Number(o.cycleDay) || 1))),
    claimedDay: Math.max(0, Math.min(7, Math.floor(Number(o.claimedDay) || 0))),
  });
}

export const CHEST_EVERY = 3;
export const CHEST_MIN = 60;
export const CHEST_MAX = 180;

export function rollChestCoins(): number {
  return CHEST_MIN + Math.floor(Math.random() * (CHEST_MAX - CHEST_MIN + 1));
}

export type AchievementDef = {
  id: string;
  label: string;
  icon: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-run', label: 'Première session', icon: '🏁' },
  { id: 'combo-5', label: 'Combo x5', icon: '🔥' },
  { id: 'km-1', label: '1 km en une run', icon: '🏃' },
  { id: 'score-5k', label: '5 000 points', icon: '⭐' },
  { id: 'streak-3', label: 'Série de 3 jours', icon: '🔥' },
];

export type BoardSlice = { key: string; scores: number[] };

export function weekKey(d = new Date()): string {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const day = (t.getDay() + 6) % 7;
  t.setDate(t.getDate() - day);
  return todayKey(t);
}

export function parseBoard(raw: unknown, key: string): BoardSlice {
  if (!raw || typeof raw !== 'object') return { key, scores: [] };
  const o = raw as Partial<BoardSlice>;
  if (o.key !== key) return { key, scores: [] };
  const scores = Array.isArray(o.scores)
    ? o.scores.map(Number).filter(Number.isFinite).sort((a, b) => b - a).slice(0, 5)
    : [];
  return { key, scores };
}

export type GhostSample = { d: number; lane: number; y: number };

export function parseGhost(raw: unknown): GhostSample[] | null {
  if (!Array.isArray(raw) || raw.length < 4) return null;
  const out: GhostSample[] = [];
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue;
    const o = s as Partial<GhostSample>;
    if (!Number.isFinite(Number(o.d))) continue;
    out.push({
      d: Number(o.d),
      lane: Math.max(0, Math.min(2, Math.floor(Number(o.lane) || 1))),
      y: Math.max(0, Number(o.y) || 0),
    });
    if (out.length >= 220) break;
  }
  return out.length >= 4 ? out : null;
}
