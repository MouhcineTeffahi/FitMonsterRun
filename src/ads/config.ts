/**
 * AdMob IDs for Fit Monster Run.
 *
 * Test App / unit IDs below are Google's official demo values — safe for
 * development and CI. Before a store release, replace with real AdMob IDs
 * from https://admob.google.com (see handoff / store-readiness).
 */

/** Google sample App IDs (plugin in app.json). */
export const ADMOB_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
} as const;

/**
 * Official Google rewarded test unit IDs.
 * Production placeholders — swap for real units before submit:
 *   android: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'
 *   ios:     'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'
 */
export const ADMOB_REWARDED_UNIT_IDS = {
  android: 'ca-app-pub-3940256099942544/5224354917',
  ios: 'ca-app-pub-3940256099942544/1712485313',
} as const;

/** Coins granted by the Game Over "+coins" rewarded ad. */
export const REWARD_COINS = 100;

/** Max ad-funded continues allowed in a single run. */
export const MAX_AD_CONTINUES = 2;
