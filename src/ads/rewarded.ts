/**
 * Web / default rewarded-ad entry. Metro resolves `rewarded.native.ts` on
 * iOS/Android so this file never loads the native AdMob module on Expo web.
 */

import type { RewardedKind, RewardedResult } from './types';

export type { RewardedKind, RewardedResult };

type Listener = (visible: boolean, label: string) => void;

let overlayListener: Listener | null = null;

/** UI hooks the mock "Watching ad…" overlay here (web only). */
export function setRewardedOverlayListener(listener: Listener | null) {
  overlayListener = listener;
}

function mockRewarded(label: string): Promise<RewardedResult> {
  return new Promise((resolve) => {
    overlayListener?.(true, label);
    setTimeout(() => {
      overlayListener?.(false, '');
      resolve('rewarded');
    }, 1600);
  });
}

/** Show a rewarded unit. Always resolves; never throws into gameplay. */
export async function showRewardedAd(kind: RewardedKind = 'continue'): Promise<RewardedResult> {
  const label = kind === 'coins' ? 'Pub… +100 haltères' : 'Pub… Continuer';
  return mockRewarded(label);
}

export function adsSupported(): boolean {
  return true;
}

/** Web QA hook so Playwright / demos can open the mock ad overlay. */
if (typeof globalThis !== 'undefined') {
  (globalThis as { __fitMonsterShowAd?: (kind?: RewardedKind) => Promise<RewardedResult> }).__fitMonsterShowAd =
    showRewardedAd;
}
