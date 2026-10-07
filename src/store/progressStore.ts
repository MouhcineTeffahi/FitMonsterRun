import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  DEFAULT_SKIN,
  DEFAULT_UNLOCKED,
  type SkinId,
} from '../data/skins';
import {
  DEFAULT_PLAYER_COLORS,
  parsePlayerColors,
  type ColorSlot,
  type PlayerColors,
} from '../data/playerColors';
import { MAX_ENERGY } from '../data/theme';
import { DAILY_CHALLENGES, todayKey, type ChallengeStat } from '../data/challenges';
import { DEFAULT_SPACE, SPACES, getSpace, isSpaceId, type SpaceId } from '../data/spaces';
import {
  DEFAULT_ACCESSORY,
  DEFAULT_UNLOCKED_ACCESSORIES,
  STAT_MAX,
  getAccessory,
  isAccessoryId,
  nextStatCost,
  parseUpgrades,
  type AccessoryId,
  type StatId,
  type Upgrades,
} from '../data/shop';
import {
  ACHIEVEMENTS,
  CHEST_EVERY,
  LOGIN_REWARDS,
  parseBoard,
  parseGhost,
  parseLogin,
  rollChestCoins,
  tickLogin,
  weekKey,
  type BoardSlice,
  type GhostSample,
  type LoginState,
} from '../data/retention';

const STORAGE_KEY = '@fit_monster_run/progress_v1';
const SAVE_VERSION = 2;
/** Tester bankroll so every place can be opened. */
const TEST_COINS = 99_999;
const ALL_SPACES: SpaceId[] = SPACES.map((s) => s.id);

type PersistedSlice = {
  v: number;
  totalCoins: number;
  selectedSkin: SkinId;
  unlockedSkins: SkinId[];
  bestScore: number;
  soundEnabled: boolean;
  /** DÉFIS progress; reset when the local date changes. */
  daily: DailyState;
  /** Personal best runs, highest first (CLASSEMENT). */
  topScores: number[];
  selectedSpace: SpaceId;
  unlockedSpaces: SpaceId[];
  /** Player paint channels over the selected skin. */
  playerColors: PlayerColors;
  login: LoginState;
  upgrades: Upgrades;
  selectedAccessory: AccessoryId;
  unlockedAccessories: AccessoryId[];
  runsSinceChest: number;
  pendingChest: boolean;
  tutorialDone: boolean;
  achievements: string[];
  dailyBoard: BoardSlice;
  weeklyBoard: BoardSlice;
  ghost: GhostSample[] | null;
};

export type DailyState = {
  date: string;
  progress: Partial<Record<ChallengeStat, number>>;
  claimed: string[];
};

/** End-of-run counters credited to the daily challenges. */
export type RunRecord = Record<ChallengeStat, number> & {
  score: number;
  bestCombo?: number;
  ghost?: GhostSample[] | null;
};

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
    lastChestReward: number;
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
    /** Selects the space, buying it first if needed; false if unaffordable. */
    chooseSpace: (id: SpaceId) => boolean;
    setPlayerColor: (slot: ColorSlot, hex: string) => void;
    resetPlayerColors: () => void;
    claimLogin: () => number;
    buyAccessory: (id: AccessoryId) => boolean;
    selectAccessory: (id: AccessoryId) => void;
    upgradeStat: (id: StatId) => boolean;
    openChest: () => number;
    completeTutorial: () => void;
    unlockAchievement: (id: string) => void;
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
    v: SAVE_VERSION,
    totalCoins: state.totalCoins,
    selectedSkin: state.selectedSkin,
    unlockedSkins: state.unlockedSkins,
    bestScore: state.bestScore,
    soundEnabled: state.soundEnabled,
    daily: state.daily,
    topScores: state.topScores,
    selectedSpace: state.selectedSpace,
    unlockedSpaces: state.unlockedSpaces,
    playerColors: state.playerColors,
    login: state.login,
    upgrades: state.upgrades,
    selectedAccessory: state.selectedAccessory,
    unlockedAccessories: state.unlockedAccessories,
    runsSinceChest: state.runsSinceChest,
    pendingChest: state.pendingChest,
    tutorialDone: state.tutorialDone,
    achievements: state.achievements,
    dailyBoard: state.dailyBoard,
    weeklyBoard: state.weeklyBoard,
    ghost: state.ghost,
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

function parseSpaces(parsed: Partial<PersistedSlice>): Pick<PersistedSlice, 'selectedSpace' | 'unlockedSpaces'> {
  const stored = Array.isArray(parsed.unlockedSpaces) ? parsed.unlockedSpaces.filter(isSpaceId) : [];
  const unlockedSpaces = [...new Set([...ALL_SPACES, ...stored])];
  const selectedSpace = isSpaceId(parsed.selectedSpace) && unlockedSpaces.includes(parsed.selectedSpace) ? parsed.selectedSpace : DEFAULT_SPACE;
  return { selectedSpace, unlockedSpaces };
}

function parseAccessories(parsed: Partial<PersistedSlice>): Pick<PersistedSlice, 'selectedAccessory' | 'unlockedAccessories'> {
  const stored = Array.isArray(parsed.unlockedAccessories)
    ? parsed.unlockedAccessories.filter(isAccessoryId)
    : [...DEFAULT_UNLOCKED_ACCESSORIES];
  const unlockedAccessories = stored.includes(DEFAULT_ACCESSORY)
    ? stored
    : [DEFAULT_ACCESSORY, ...stored];
  const selectedAccessory =
    isAccessoryId(parsed.selectedAccessory) && unlockedAccessories.includes(parsed.selectedAccessory)
      ? parsed.selectedAccessory
      : DEFAULT_ACCESSORY;
  return { selectedAccessory, unlockedAccessories };
}

function migrate(raw: unknown): PersistedSlice {
  const parsed = (raw && typeof raw === 'object' ? raw : {}) as Partial<PersistedSlice>;
  const unlocked = Array.isArray(parsed.unlockedSkins)
    ? parsed.unlockedSkins.filter(isSkinId)
    : [...DEFAULT_UNLOCKED];
  const selected = isSkinId(parsed.selectedSkin) ? parsed.selectedSkin : DEFAULT_SKIN;
  const achievements = Array.isArray(parsed.achievements)
    ? parsed.achievements.filter((id) => typeof id === 'string')
    : [];
  return {
    v: SAVE_VERSION,
    totalCoins: Math.max(TEST_COINS, Math.floor(Number(parsed.totalCoins) || 0)),
    selectedSkin: unlocked.includes(selected) ? selected : DEFAULT_SKIN,
    unlockedSkins: unlocked.includes(DEFAULT_SKIN) ? unlocked : [DEFAULT_SKIN, ...unlocked],
    bestScore: Math.max(0, Math.floor(Number(parsed.bestScore) || 0)),
    soundEnabled: parsed.soundEnabled !== false,
    daily: parseDaily(parsed.daily),
    topScores: Array.isArray(parsed.topScores)
      ? parsed.topScores.map(Number).filter(Number.isFinite).slice(0, 5)
      : [],
    ...parseSpaces(parsed),
    playerColors: parsePlayerColors(parsed.playerColors),
    login: parseLogin(parsed.login),
    upgrades: parseUpgrades(parsed.upgrades),
    ...parseAccessories(parsed),
    runsSinceChest: Math.max(0, Math.floor(Number(parsed.runsSinceChest) || 0)),
    pendingChest: parsed.pendingChest === true,
    tutorialDone: parsed.tutorialDone === true,
    achievements,
    dailyBoard: parseBoard(parsed.dailyBoard, todayKey()),
    weeklyBoard: parseBoard(parsed.weeklyBoard, weekKey()),
    ghost: parseGhost(parsed.ghost),
  };
}

const defaults: PersistedSlice = migrate({});

export const useProgressStore = create<ProgressState>((set, get) => ({
  ...defaults,
  lastScore: 0,
  currentEnergy: MAX_ENERGY,
  currentScore: 0,
  currentDistance: 0,
  hydrated: false,
  lastChestReward: 0,

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
        set({ ...migrate({}), hydrated: true });
        void get().saveProgress();
        return;
      }
      set({ ...migrate(JSON.parse(raw)), hydrated: true });
      void get().saveProgress();
    } catch {
      set({ hydrated: true });
    }
  },

  setPlayerColor: (slot, hex) => {
    const next = hex.trim().toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(next)) return;
    set((s) => ({ playerColors: { ...s.playerColors, [slot]: next } }));
    void get().saveProgress();
  },

  resetPlayerColors: () => {
    set({ playerColors: { ...DEFAULT_PLAYER_COLORS } });
    void get().saveProgress();
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
    const dayKey = todayKey();
    const wk = weekKey();
    const dailyBoard = parseBoard(get().dailyBoard, dayKey);
    const weeklyBoard = parseBoard(get().weeklyBoard, wk);
    if (score > 0) {
      dailyBoard.scores = [...dailyBoard.scores, score].sort((a, b) => b - a).slice(0, 5);
      weeklyBoard.scores = [...weeklyBoard.scores, score].sort((a, b) => b - a).slice(0, 5);
    }
    const runsSinceChest = get().runsSinceChest + 1;
    const pendingChest = get().pendingChest || runsSinceChest >= CHEST_EVERY;
    const achievements = [...get().achievements];
    const earn = (id: string) => {
      if (!achievements.includes(id) && ACHIEVEMENTS.some((a) => a.id === id)) achievements.push(id);
    };
    earn('first-run');
    if ((run.bestCombo ?? 0) >= 5) earn('combo-5');
    if (run.distance >= 1000) earn('km-1');
    if (score >= 5000) earn('score-5k');
    if (get().login.streak >= 3) earn('streak-3');
    const ghost =
      score >= get().bestScore && run.ghost && run.ghost.length >= 4 ? run.ghost : get().ghost;
    set({
      daily: { ...daily, progress },
      topScores,
      dailyBoard,
      weeklyBoard,
      runsSinceChest: pendingChest ? 0 : runsSinceChest,
      pendingChest,
      achievements,
      ghost,
    });
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

  chooseSpace: (id) => {
    const { unlockedSpaces, totalCoins } = get();
    if (!unlockedSpaces.includes(id)) {
      const cost = getSpace(id).cost;
      if (totalCoins < cost) return false;
      set({ totalCoins: totalCoins - cost, unlockedSpaces: [...unlockedSpaces, id] });
    }
    set({ selectedSpace: id });
    void get().saveProgress();
    return true;
  },

  claimLogin: () => {
    const login = tickLogin(get().login);
    if (login.claimedDay === login.cycleDay) return 0;
    const reward = LOGIN_REWARDS[login.cycleDay - 1] ?? LOGIN_REWARDS[0];
    set((s) => ({
      login: { ...login, claimedDay: login.cycleDay },
      totalCoins: s.totalCoins + reward,
    }));
    void get().saveProgress();
    return reward;
  },

  buyAccessory: (id) => {
    const { unlockedAccessories, totalCoins } = get();
    if (unlockedAccessories.includes(id)) return true;
    const cost = getAccessory(id).price;
    if (totalCoins < cost) return false;
    set({
      totalCoins: totalCoins - cost,
      unlockedAccessories: [...unlockedAccessories, id],
      selectedAccessory: id,
    });
    void get().saveProgress();
    return true;
  },

  selectAccessory: (id) => {
    if (!get().unlockedAccessories.includes(id)) return;
    set({ selectedAccessory: id });
    void get().saveProgress();
  },

  upgradeStat: (id) => {
    const level = get().upgrades[id];
    const cost = nextStatCost(level);
    if (cost === null || level >= STAT_MAX) return false;
    if (get().totalCoins < cost) return false;
    set((s) => ({
      totalCoins: s.totalCoins - cost,
      upgrades: { ...s.upgrades, [id]: level + 1 },
    }));
    void get().saveProgress();
    return true;
  },

  openChest: () => {
    if (!get().pendingChest) return 0;
    const reward = rollChestCoins();
    set((s) => ({
      pendingChest: false,
      runsSinceChest: 0,
      totalCoins: s.totalCoins + reward,
      lastChestReward: reward,
    }));
    void get().saveProgress();
    return reward;
  },

  completeTutorial: () => {
    if (get().tutorialDone) return;
    set({ tutorialDone: true });
    void get().saveProgress();
  },

  unlockAchievement: (id) => {
    if (get().achievements.includes(id)) return;
    if (!ACHIEVEMENTS.some((a) => a.id === id)) return;
    set((s) => ({ achievements: [...s.achievements, id] }));
    void get().saveProgress();
  },
}));
