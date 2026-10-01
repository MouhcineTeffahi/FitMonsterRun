import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  DEFAULT_SKIN,
  DEFAULT_UNLOCKED,
  type SkinId,
} from '../data/skins';
import { MAX_ENERGY } from '../data/theme';

const STORAGE_KEY = '@fit_monster_run/progress_v1';

type PersistedSlice = {
  totalCoins: number;
  selectedSkin: SkinId;
  unlockedSkins: SkinId[];
  bestScore: number;
  soundEnabled: boolean;
};

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
  };
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  totalCoins: 0,
  selectedSkin: DEFAULT_SKIN,
  unlockedSkins: [...DEFAULT_UNLOCKED],
  bestScore: 0,
  lastScore: 0,
  soundEnabled: true,
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
}));
