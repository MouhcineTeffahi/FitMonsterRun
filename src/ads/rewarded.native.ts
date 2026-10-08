import { Platform } from 'react-native';

import { ADMOB_REWARDED_UNIT_IDS } from './config';
import type { RewardedKind, RewardedResult } from './types';

export type { RewardedKind, RewardedResult };

type Listener = (visible: boolean, label: string) => void;

let overlayListener: Listener | null = null;
let initialized = false;

export function setRewardedOverlayListener(listener: Listener | null) {
  overlayListener = listener;
}

function unitId(): string {
  return Platform.OS === 'ios' ? ADMOB_REWARDED_UNIT_IDS.ios : ADMOB_REWARDED_UNIT_IDS.android;
}

async function ensureInit(): Promise<boolean> {
  if (initialized) return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ads = require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');
    await ads.default().initialize();
    initialized = true;
    return true;
  } catch {
    return false;
  }
}

function mockFallback(label: string): Promise<RewardedResult> {
  return new Promise((resolve) => {
    overlayListener?.(true, label);
    setTimeout(() => {
      overlayListener?.(false, '');
      resolve('rewarded');
    }, 1600);
  });
}

export async function showRewardedAd(kind: RewardedKind = 'continue'): Promise<RewardedResult> {
  const label = kind === 'coins' ? 'Pub… +100 haltères' : 'Pub… Continuer';
  const ok = await ensureInit();
  if (!ok) return mockFallback(label);

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ads = require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');
    const { RewardedAd, RewardedAdEventType, AdEventType } = ads;
    const rewarded = RewardedAd.createForAdRequest(unitId(), {
      requestNonPersonalizedAdsOnly: true,
    });

    return await new Promise<RewardedResult>((resolve) => {
      let earned = false;
      let settled = false;
      const finish = (result: RewardedResult) => {
        if (settled) return;
        settled = true;
        unsubLoaded();
        unsubEarned();
        unsubClosed();
        unsubError();
        resolve(result);
      };
      const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        void rewarded.show();
      });
      const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        finish(earned ? 'rewarded' : 'dismissed');
      });
      const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, () => {
        finish('failed');
      });
      rewarded.load();
      setTimeout(() => finish(earned ? 'rewarded' : 'failed'), 25000);
    });
  } catch {
    return mockFallback(label);
  }
}

export function adsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
