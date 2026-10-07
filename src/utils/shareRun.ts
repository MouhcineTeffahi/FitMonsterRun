import { Share } from 'react-native';

function clipboardWrite(text: string): Promise<boolean> {
  try {
    const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (clip?.writeText) return clip.writeText(text).then(() => true).catch(() => false);
  } catch {
    // Clipboard can be blocked without a user gesture.
  }
  return Promise.resolve(false);
}

/** Web Share API, then RN Share, then clipboard. Never throws. */
export async function shareRun(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav && typeof nav.share === 'function') {
      await nav.share({ title: 'FitMonsterRun', text });
      return 'shared';
    }
  } catch {
    // User cancelled or the browser refused — try the next fallback.
  }
  try {
    const result = await Share.share({ message: text });
    if (result.action !== Share.dismissedAction) return 'shared';
  } catch {
    // Native share sheet unavailable (common on web).
  }
  return (await clipboardWrite(text)) ? 'copied' : 'failed';
}

export function runShareText(score: number, distance: number, bestCombo: number): string {
  return `FitMonsterRun — ${score} pts · ${distance} m · combo x${bestCombo} 💪 Viens courir !`;
}
