import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  DEFAULT_SKIN,
  DEFAULT_UNLOCKED,
  type SkinId,
} from '../data/skins';
import { MAX_ENERGY } from '../data/theme';
import { DAILY_CHALLENGES, todayKey, type ChallengeStat } from '../data/challenges';

const STORAGE_KEY = '@fit_monster_run/progress_v1';

type PersistedSlice = {
  totalCoins: number;
  selectedSkin: SkinId;
  unlockedSkins: SkinId[];
  bestScore: number;
  soundEnabled: boolean;
  /** DÉFIS progress; reset when the local date changes. */
  daily: DailyState;
  /** Personal best runs, highest first (CLASSEMENT). */
  topScores: number[];
};

export type DailyState = {
  date: string;
  progress: Partial<Record<ChallengeStat, number>>;
  claimed: string[];
};

/** End-of-run counters credited to the daily challenges. */
export type RunRecord = Record<ChallengeStat, number> & { score: number };

function freshDaily(): DailyState {
  return { date: todayKey(), progress: {}, claimed: [] };
}

function currentDaily(daily: DailyState): DailyState {
  return daily.date === todayKey() ? daily : freshDaily();
}

type RunSlice = {
  currentEnergy: number;
  currentScore: number;
  currentDistance: number;
  lastScore: number;
};

type ProgressState = PersistedSlice &
  RunSlice & {
    hydrated: boolean;
    addCoins: (amount: number) => void;
    spendCoins: (amount: number) => boolean;
    unlockSkin: (skinId: SkinId) => boolean;
    selectSkin: (skinId: SkinId) => void;
    setBestScore: (score: number) => void;
    resetRun: () => void;
    saveProgress: () => Promise<void>;
    loadProgress: () => Promise<void>;
    toggleSound: () => void;
    applyRunTick: (patch: Partial<Pick<RunSlice, 'currentScore' | 'currentDistance' | 'currentEnergy'>>) => void;
    finishRun: () => void;
    recordRun: (run: RunRecord) => void;
    claimChallenge: (id: string) => boolean;
  };

function isSkinId(value: unknown): value is SkinId {
  return (
    value === 'classic' ||
    value === 'street' ||
    value === 'beast' ||
    value === 'champion'
  );
}

function persistedPayload(state: PersistedSlice): PersistedSlice {
  return {
    totalCoins: state.totalCoins,
    selectedSkin: state.selectedSkin,
    unlockedSkins: state.unlockedSkins,
    bestScore: state.bestScore,
    soundEnabled: state.soundEnabled,
    daily: state.daily,
    topScores: state.topScores,
  };
}

function parseDaily(raw: unknown): DailyState {
  if (!raw || typeof raw !== 'object') return freshDaily();
  const d = raw as Partial<DailyState>;
  if (typeof d.date !== 'string') return freshDaily();
  const progress: DailyState['progress'] = {};
  if (d.progress && typeof d.progress === 'object') {
    for (const [k, v] of Object.entries(d.progress)) {
      if (Number.isFinite(Number(v))) progress[k as ChallengeStat] = Number(v);
    }
  }
  const claimed = Array.isArray(d.claimed) ? d.claimed.filter((c) => typeof c === 'string') : [];
  return currentDaily({ date: d.date, progress, claimed });
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  totalCoins: 0,
  selectedSkin: DEFAULT_SKIN,
  unlockedSkins: [...DEFAULT_UNLOCKED],
  bestScore: 0,
  lastScore: 0,
  soundEnabled: true,
  daily: freshDaily(),
  topScores: [],
  currentEnergy: MAX_ENERGY,
  currentScore: 0,
  currentDistance: 0,
  hydrated: false,

  addCoins: (amount) => {
    if (amount <= 0) return;
    set((s) => ({ totalCoins: s.totalCoins + Math.floor(amount) }));
    void get().saveProgress();
  },

  spendCoins: (amount) => {
    const cost = Math.floor(amount);
    const { totalCoins } = get();
    if (cost <= 0 || totalCoins < cost) return false;
    set({ totalCoins: totalCoins - cost });
    void get().saveProgress();
    return true;
  },

  unlockSkin: (skinId) => {
    const { unlockedSkins } = get();
    if (unlockedSkins.includes(skinId)) return true;
    set({ unlockedSkins: [...unlockedSkins, skinId] });
    void get().saveProgress();
    return true;
  },

  selectSkin: (skinId) => {
    const { unlockedSkins } = get();
    if (!unlockedSkins.includes(skinId)) return;
    set({ selectedSkin: skinId });
    void get().saveProgress();
  },

  setBestScore: (score) => {
    const next = Math.max(0, Math.floor(score));
    if (next <= get().bestScore) return;
    set({ bestScore: next });
    void get().saveProgress();
  },

  resetRun: () => {
    set({
      currentEnergy: MAX_ENERGY,
      currentScore: 0,
      currentDistance: 0,
      lastScore: 0,
    });
  },

  saveProgress: async () => {
    try {
      const payload = persistedPayload(get());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Persistence failures should not crash gameplay.
    }
  },

  loadProgress: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({ hydrated: true });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PersistedSlice>;
      const unlocked = Array.isArray(parsed.unlockedSkins)
        ? parsed.unlockedSkins.filter(isSkinId)
        : [...DEFAULT_UNLOCKED];
      const selected = isSkinId(parsed.selectedSkin)
        ? parsed.selectedSkin
        : DEFAULT_SKIN;
      set({
        totalCoins: Math.max(0, Math.floor(Number(parsed.totalCoins) || 0)),
        selectedSkin: unlocked.includes(selected) ? selected : DEFAULT_SKIN,
        unlockedSkins: unlocked.includes(DEFAULT_SKIN)
          ? unlocked
          : [DEFAULT_SKIN, ...unlocked],
        bestScore: Math.max(0, Math.floor(Number(parsed.bestScore) || 0)),
        soundEnabled: parsed.soundEnabled !== false,
        daily: parseDaily(parsed.daily),
        topScores: Array.isArray(parsed.topScores)
          ? parsed.topScores.map(Number).filter(Number.isFinite).slice(0, 5)
          : [],
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  toggleSound: () => {
    set((s) => ({ soundEnabled: !s.soundEnabled }));
    void get().saveProgress();
  },

  applyRunTick: (patch) => {
    set((s) => ({
      currentScore:
        patch.currentScore !== undefined
          ? Math.max(0, patch.currentScore)
          : s.currentScore,
      currentDistance:
        patch.currentDistance !== undefined
          ? Math.max(0, patch.currentDistance)
          : s.currentDistance,
      currentEnergy:
        patch.currentEnergy !== undefined
          ? Math.max(0, Math.min(MAX_ENERGY, patch.currentEnergy))
          : s.currentEnergy,
    }));
  },

  finishRun: () => {
    const { currentScore, bestScore } = get();
    const lastScore = Math.floor(currentScore);
    set({ lastScore });
    if (lastScore > bestScore) {
      set({ bestScore: lastScore });
      void get().saveProgress();
    }
  },

  recordRun: (run) => {
    const daily = currentDaily(get().daily);
    const progress = { ...daily.progress };
    for (const c of DAILY_CHALLENGES) {
      progress[c.stat] = (progress[c.stat] ?? 0) + Math.floor(run[c.stat]);
    }
    const score = Math.floor(run.score);
    const topScores = score > 0
      ? [...get().topScores, score].sort((a, b) => b - a).slice(0, 5)
      : get().topScores;
    set({ daily: { ...daily, progress }, topScores });
    void get().saveProgress();
  },

  claimChallenge: (id) => {
    const daily = currentDaily(get().daily);
    const def = DAILY_CHALLENGES.find((c) => c.id === id);
    if (!def || daily.claimed.includes(id)) return false;
    if ((daily.progress[def.stat] ?? 0) < def.target) return false;
    set((s) => ({
      daily: { ...daily, claimed: [...daily.claimed, id] },
      totalCoins: s.totalCoins + def.reward,
    }));
    void get().saveProgress();
    return true;
  },
}));
