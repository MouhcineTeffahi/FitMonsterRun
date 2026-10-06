export type ScreenId = 'home' | 'game' | 'gameOver' | 'shop' | 'challenges' | 'leaderboard';

/** What the game-over screen shows for the run that just ended. */
export type RunSummary = {
  coins: number;
  distance: number;
  level: number;
  bestCombo: number;
  record: boolean;
};
