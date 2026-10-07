import * as Haptics from 'expo-haptics';

/** Safe haptics: expo-haptics, then Web Vibration. Never throws. */

type Kind = 'light' | 'medium' | 'heavy' | 'success' | 'error';

export function haptic(kind: Kind = 'light') {
  try {
    if (kind === 'success') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (kind === 'error') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const style =
      kind === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : kind === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
    void Haptics.impactAsync(style);
    return;
  } catch {
    // Fall through to the web vibrator.
  }
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    nav?.vibrate?.(kind === 'heavy' || kind === 'error' ? 28 : 12);
  } catch {
    // No haptic hardware, or the page is not allowed to vibrate.
  }
}
