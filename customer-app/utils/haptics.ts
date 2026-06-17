import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light tap feedback — micro-interaction without blocking (Design Monks: micro-interactions). */
export function impactLight(): void {
  if (Platform.OS === 'web') return;
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* simulator / unsupported */
  }
}

export function notificationSuccess(): void {
  if (Platform.OS === 'web') return;
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* noop */
  }
}
